import type { Server as HttpServer, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket, type RawData } from 'ws';

import {
	INITIAL_TRANSPORT_EPOCH,
	P2P_CONTROL_MAX_PAYLOAD_BYTES,
	P2P_CONTROL_PROTOCOL_VERSION,
	P2P_CONTROL_WS_PROTOCOL,
	isP2PTransportRole,
	parseP2PControlClientMessage,
	readControlTransportEpoch,
	type P2PControlClientMessage,
	type P2PControlServerMessage,
	type P2PTransportFallbackReason,
} from '../../shared/p2p-wire/control';
import { buildPokerActionTimeGateAck } from '../../shared/p2p-wire/pokerTimeNotary';
import {
	POKER_ENTRY_APPROVAL_TIMEOUT_MS,
	type PokerEntryApprovalState,
} from '../../shared/p2p-wire/pokerEntryApproval';
import {
	isSafePeerId,
	isSafeRoomOrMatchId,
	type P2PTransportRole,
} from '../../shared/p2pAvailability';
import { consumeWindowRateLimit, type RateLimitBucket } from '../services/p2pRateLimit';
import {
	getP2PControlTelemetrySnapshot,
	recordP2PControlConnection,
	recordP2PControlDrop,
	recordP2PControlError,
	recordP2PControlMessage,
	recordP2PTransportFallback,
	recordP2PTransportReady,
	type P2PControlTelemetrySnapshot,
} from '../services/p2pControlTelemetry';
import { getHiveWebSessionUsernameFromCookie } from '../services/hiveWebSession';
import { verifyP2PMatchTicketForRoom, type P2PMatchTicketPayload } from '../services/p2pMatchTicketSigner';
import { isP2PRelayOriginAllowed } from '../services/p2pRelayOrigin';
import { hasP2PControlProtocol, readP2PControlTicketToken } from '../services/p2pControlProtocol';
import { verifyP2PActiveMatchTicket } from '../services/p2pActiveMatchRegistry';
import { decideControlAdmission } from '../services/p2pAdmissionGate';
import { claimControlSlot } from '../services/p2pConnectionRegistry';
import {
	markP2PActiveMatchTerminalFromCheckpoint,
	markP2PRefereePlaneConnected,
	markP2PRefereePlaneDisconnected,
	p2pPhaseCheckpointCoordinator,
	p2pPokerTimeNotary,
} from '../services/p2pReferee';

type ControlMember = {
	readonly connectionId: string;
	readonly peerId: string;
	readonly role: P2PTransportRole;
	readonly ticketNonce: string;
	readonly account?: string;
	readonly ws: WebSocket;
	hello: boolean;
	transportReady: boolean;
	transportKind: Extract<P2PControlClientMessage, { readonly type: 'transport_ready_v1' }>['kind'] | null;
	transportCommitted: boolean;
	transportFallback: boolean;
};

type ControlRoom = {
	members: ControlMember[];
	pendingReplacements: Map<string, ControlMember>;
	transportEpoch: number;
	createdAt: number;
	pokerEntryApproval: PokerEntryApprovalGate | null;
};

type PokerEntryApprovalGate = {
	combatId: string;
	transportEpoch: number;
	status: PokerEntryApprovalState['status'];
	deadlineAtMs: number | null;
	remainingMs: number;
	readyPeerIds: Set<string>;
	timer: ReturnType<typeof setTimeout> | null;
};
const rooms = new Map<string, ControlRoom>();

function createControlRoom(): ControlRoom {
	return {
		members: [],
		pendingReplacements: new Map(),
		transportEpoch: INITIAL_TRANSPORT_EPOCH,
		createdAt: Date.now(),
		pokerEntryApproval: null,
	};
}
const MESSAGE_RATE_LIMIT: RateLimitBucket = new Map();
const REPLACEMENT_RATE_LIMIT: RateLimitBucket = new Map();
const ROOM_MAX_PEERS = 2;
const CONTROL_MESSAGE_LIMIT = 40;
const CONTROL_MESSAGE_WINDOW_MS = 10_000;
export const P2P_CONTROL_REPLACEMENT_LIMIT = 4;
export const P2P_CONTROL_REPLACEMENT_WINDOW_MS = 30_000;

function isAttachedControlMember(room: ControlRoom, member: ControlMember): boolean {
	return room.members.includes(member) || room.pendingReplacements.get(member.peerId) === member;
}

function findPeerControlOwnership(room: ControlRoom, peerId: string): {
	readonly incumbent: ControlMember | null;
	readonly candidate: ControlMember | null;
} {
	return {
		incumbent: room.members.find(member => member.peerId === peerId) ?? null,
		candidate: room.pendingReplacements.get(peerId) ?? null,
	};
}

function replacementRateLimitKey(roomId: string, peerId: string): string {
	return `${roomId}:${peerId}`;
}

function forgetControlRoomRateLimits(roomId: string, room: ControlRoom): void {
	const peerIds = new Set<string>();
	for (const member of room.members) peerIds.add(member.peerId);
	for (const peerId of room.pendingReplacements.keys()) peerIds.add(peerId);
	for (const peerId of peerIds) REPLACEMENT_RATE_LIMIT.delete(replacementRateLimitKey(roomId, peerId));
}

function notifyOpponentPeerLeft(room: ControlRoom, roomId: string, departedPeerId: string): void {
	const opponent = room.members.find(candidate => candidate.hello && candidate.peerId !== departedPeerId);
	if (!opponent) return;
	sendMessage(opponent.ws, {
		type: 'control_peer_left_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
		matchId: roomId, opponentPeerId: departedPeerId,
	});
}

function fenceControlMember(member: ControlMember, roomId: string, departedPeerId: string): void {
	MESSAGE_RATE_LIMIT.delete(member.connectionId);
	sendMessage(member.ws, {
		type: 'control_peer_left_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
		matchId: roomId, opponentPeerId: departedPeerId,
	});
	try { member.ws.close(); } catch { /* already closed */ }
}

function maybeDeleteEmptyControlRoom(roomId: string, room: ControlRoom): void {
	if (room.members.length > 0 || room.pendingReplacements.size > 0) return;
	if (room.pokerEntryApproval?.timer) clearTimeout(room.pokerEntryApproval.timer);
	forgetControlRoomRateLimits(roomId, room);
	rooms.delete(roomId);
	markP2PRefereePlaneDisconnected(roomId, 'control');
}

function broadcastPokerEntryApproval(roomId: string, room: ControlRoom): void {
	const gate = room.pokerEntryApproval;
	if (!gate) return;
	const serverNowMs = Date.now();
	const message: PokerEntryApprovalState = {
		type: 'poker_entry_approval_state_v1',
		protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
		matchId: roomId,
		transportEpoch: gate.transportEpoch,
		combatId: gate.combatId,
		status: gate.status,
		serverNowMs,
		deadlineAtMs: gate.deadlineAtMs,
		remainingMs: gate.deadlineAtMs === null
			? gate.remainingMs
			: Math.max(0, Math.min(POKER_ENTRY_APPROVAL_TIMEOUT_MS, gate.deadlineAtMs - serverNowMs)),
		readyPeerIds: [...gate.readyPeerIds].sort(),
	};
	for (const member of room.members) {
		if (member.hello) sendMessage(member.ws, message);
	}
}

function armPokerEntryApprovalExpiry(roomId: string, room: ControlRoom): void {
	const gate = room.pokerEntryApproval;
	if (!gate || gate.status !== 'pending' || gate.deadlineAtMs === null) return;
	if (gate.timer) clearTimeout(gate.timer);
	gate.timer = setTimeout(() => {
		const currentRoom = rooms.get(roomId);
		const currentGate = currentRoom?.pokerEntryApproval;
		if (!currentRoom || currentGate !== gate || currentGate.status !== 'pending') return;
		if (currentRoom.members.length !== ROOM_MAX_PEERS || currentRoom.members.some(member => !member.hello)) {
			pausePokerEntryApproval(roomId, currentRoom);
			return;
		}
		currentGate.status = 'expired';
		currentGate.deadlineAtMs = null;
		currentGate.remainingMs = 0;
		currentGate.timer = null;
		broadcastPokerEntryApproval(roomId, currentRoom);
	}, Math.max(0, gate.deadlineAtMs - Date.now()));
	gate.timer.unref?.();
}

function pausePokerEntryApproval(roomId: string, room: ControlRoom): void {
	const gate = room.pokerEntryApproval;
	if (!gate || gate.status !== 'pending') return;
	gate.remainingMs = gate.deadlineAtMs === null
		? gate.remainingMs
		: Math.max(0, gate.deadlineAtMs - Date.now());
	gate.deadlineAtMs = null;
	gate.status = 'paused';
	if (gate.timer) clearTimeout(gate.timer);
	gate.timer = null;
	broadcastPokerEntryApproval(roomId, room);
}

function resumePokerEntryApproval(roomId: string, room: ControlRoom): void {
	const gate = room.pokerEntryApproval;
	if (!gate || gate.status !== 'paused') return;
	if (room.members.length !== ROOM_MAX_PEERS || room.members.some(member => !member.hello)) return;
	gate.transportEpoch = room.transportEpoch;
	gate.status = 'pending';
	gate.deadlineAtMs = Date.now() + gate.remainingMs;
	broadcastPokerEntryApproval(roomId, room);
	armPokerEntryApprovalExpiry(roomId, room);
}

function openPokerEntryApproval(roomId: string, room: ControlRoom, combatId: string, timeoutMs: number): void {
	const existing = room.pokerEntryApproval;
	if (existing && existing.combatId === combatId) {
		broadcastPokerEntryApproval(roomId, room);
		return;
	}
	if (existing && (existing.status === 'pending' || existing.status === 'paused')) return;
	if (existing?.timer) clearTimeout(existing.timer);
	room.pokerEntryApproval = {
		combatId,
		transportEpoch: room.transportEpoch,
		status: 'pending',
		deadlineAtMs: Date.now() + timeoutMs,
		remainingMs: timeoutMs,
		readyPeerIds: new Set(),
		timer: null,
	};
	broadcastPokerEntryApproval(roomId, room);
	armPokerEntryApprovalExpiry(roomId, room);
}

function markPokerEntryReady(roomId: string, room: ControlRoom, member: ControlMember, combatId: string): void {
	const gate = room.pokerEntryApproval;
	if (!gate || gate.combatId !== combatId || gate.status !== 'pending') return;
	gate.readyPeerIds.add(member.peerId);
	if (gate.readyPeerIds.size === ROOM_MAX_PEERS) {
		gate.status = 'committed';
		gate.remainingMs = gate.deadlineAtMs === null ? gate.remainingMs : Math.max(0, gate.deadlineAtMs - Date.now());
		gate.deadlineAtMs = null;
		if (gate.timer) clearTimeout(gate.timer);
		gate.timer = null;
	}
	broadcastPokerEntryApproval(roomId, room);
}
export const P2P_CONTROL_KEEPALIVE_INTERVAL_MS = 15_000;

export type P2PControlServerOptions = Readonly<{
	readonly keepaliveIntervalMs?: number;
	readonly pokerEntryApprovalTimeoutMs?: number;
}>;

type UpgradeAccess =
	| { readonly ok: true; readonly ticket: P2PMatchTicketPayload }
	| { readonly ok: false; readonly status: number; readonly reason: string };

function shouldRequireControlSession(): boolean {
	return process.env.NODE_ENV === 'production'
		|| process.env.VITE_NETWORK_STAGE === 'testnet'
		|| process.env.VITE_NETWORK_STAGE === 'mainnet';
}

function shouldRequireActiveMatchTicket(): boolean {
	return shouldRequireControlSession();
}

function isAllowedOrigin(req: IncomingMessage): boolean {
	return isP2PRelayOriginAllowed({
		origin: typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
		host: req.headers.host,
		forwardedHost: req.headers['x-forwarded-host'],
		allowedOrigins: process.env.P2P_CONTROL_ALLOWED_ORIGINS ?? process.env.P2P_RELAY_ALLOWED_ORIGINS,
		trustForwardedHost: process.env.P2P_RELAY_TRUST_FORWARDED_HOST === 'true',
		production: process.env.NODE_ENV === 'production',
	});
}

function rejectUpgrade(socket: { write: (chunk: string) => unknown; destroy: () => unknown }, status: number, reason: string): void {
	try {
		socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
	} catch { /* socket may already be gone */ }
	try { socket.destroy(); } catch { /* already closed */ }
}

function sendMessage(ws: WebSocket, message: P2PControlServerMessage | Record<string, unknown>): boolean {
	if (ws.readyState !== WebSocket.OPEN) return false;
	try {
		ws.send(JSON.stringify(message));
		return true;
	} catch {
		recordP2PControlError('send_failed');
		return false;
	}
}

function sendError(ws: WebSocket, code: 'protocol' | 'match_mismatch' | 'role_required' | 'role_conflict' | 'rate_limited'): void {
	sendMessage(ws, { type: 'control_error_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION, code });
}

function rawDataToText(raw: RawData): string {
	if (typeof raw === 'string') return raw;
	if (Buffer.isBuffer(raw)) return raw.toString('utf8');
	if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
	return Buffer.from(raw).toString('utf8');
}

function isSignalingMessage(message: P2PControlClientMessage): boolean {
	return message.type === 'webrtc_offer_v1'
		|| message.type === 'webrtc_answer_v1'
		|| message.type === 'ice_candidate_v1';
}

function isTransportControlMessage(message: P2PControlClientMessage): boolean {
	return message.type === 'transport_ready_v1' || message.type === 'transport_fallback_v1';
}

function isDeliveryReceiptMessage(message: P2PControlClientMessage): boolean {
	return message.type === 'action_applied_v1';
}

function sendRefereeResult(
	room: ControlRoom,
	sender: ControlMember,
	result: {
		readonly status: 'pending' | 'message';
		readonly recipients?: 'sender' | 'room';
		readonly message?: Record<string, unknown>;
	},
): void {
	if (result.status !== 'message' || !result.message || !result.recipients) return;
	if (result.recipients === 'sender') {
		sendMessage(sender.ws, result.message);
		return;
	}
	for (const member of room.members) {
		if (member.hello) sendMessage(member.ws, result.message);
	}
}

function notifyRoomOpen(roomId: string, room: ControlRoom): void {
	if (room.members.length !== ROOM_MAX_PEERS || room.members.some(member => !member.hello)) return;
	const [first, second] = room.members;
	if (!first || !second || first.role === second.role) {
		for (const member of room.members) sendError(member.ws, 'role_conflict');
		return;
	}
	sendMessage(first.ws, {
		type: 'control_open_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
		matchId: roomId, peerId: first.peerId, opponentPeerId: second.peerId, role: first.role,
		transportEpoch: room.transportEpoch,
	});
	sendMessage(second.ws, {
		type: 'control_open_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
		matchId: roomId, peerId: second.peerId, opponentPeerId: first.peerId, role: second.role,
		transportEpoch: room.transportEpoch,
	});
	resumePokerEntryApproval(roomId, room);
}

function commitTransportIfBilateral(roomId: string, room: ControlRoom): void {
	if (room.members.length !== ROOM_MAX_PEERS || room.members.some(member => !member.hello)) return;
	const [first, second] = room.members;
	if (!first || !second
		|| !first.transportReady
		|| !second.transportReady
		|| first.transportKind === null
		|| first.transportKind !== second.transportKind) return;
	if (first.transportCommitted && second.transportCommitted) return;
	first.transportCommitted = true;
	second.transportCommitted = true;
	const message = {
		type: 'transport_committed_v1' as const,
		protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
		matchId: roomId,
		transportEpoch: room.transportEpoch,
		kind: first.transportKind,
	};
	sendMessage(first.ws, message);
	sendMessage(second.ws, message);
}

function notifyPeerOfTransportFallback(roomId: string, room: ControlRoom, sender: ControlMember, reason: P2PTransportFallbackReason): void {
	const opponent = room.members.find(candidate => candidate !== sender && candidate.hello);
	if (!opponent || opponent.ws.readyState !== WebSocket.OPEN || opponent.transportCommitted) return;
	sendMessage(opponent.ws, {
		type: 'transport_fallback_v1',
		protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
		matchId: roomId,
		transportEpoch: room.transportEpoch,
		reason,
	});
}

function forcePreCommitRelayFallback(roomId: string, room: ControlRoom, member: ControlMember, reason: P2PTransportFallbackReason): void {
	if (member.transportCommitted || member.transportFallback) return;
	member.transportReady = false;
	member.transportKind = null;
	member.transportFallback = true;
	sendMessage(member.ws, {
		type: 'transport_fallback_v1',
		protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
		matchId: roomId,
		transportEpoch: room.transportEpoch,
		reason,
	});
}

function fenceTransportEpoch(room: ControlRoom, message: P2PControlClientMessage): 'ok' | 'stale' | 'future' | 'missing' {
	if (!isSignalingMessage(message)
		&& !isTransportControlMessage(message)
		&& !isDeliveryReceiptMessage(message)
		&& message.type !== 'poker_entry_open_v1'
		&& message.type !== 'poker_entry_ready_v1') return 'ok';
	const epoch = readControlTransportEpoch(message);
	if (epoch === null) return 'missing';
	if (epoch < room.transportEpoch) return 'stale';
	if (epoch > room.transportEpoch) return 'future';
	return 'ok';
}

function beginTransportEpoch(roomId: string, room: ControlRoom, reconnectingPeerId: string, survivingPeer: ControlMember | undefined): void {
	room.transportEpoch += 1;
	if (!survivingPeer) return;
	resetTransportNegotiation(survivingPeer);
	sendMessage(survivingPeer.ws, {
		type: 'transport_reset_v2',
		protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
		matchId: roomId,
		transportEpoch: room.transportEpoch,
		reason: 'peer_reconnected',
		opponentPeerId: reconnectingPeerId,
	});
}

function isSameAuthenticatedSession(member: ControlMember, ticket: P2PMatchTicketPayload): boolean {
	return member.peerId === ticket.peerId
		&& member.role === ticket.role
		&& member.ticketNonce === ticket.nonce
		&& member.account === ticket.account;
}

/**
 * A replacement Control WS starts a new transport negotiation epoch. Keeping
 * the previous commitment on the surviving peer would let a new WebRTC/relay
 * choice get compared against stale state and strand the room after a VPN or
 * network-interface change. Reset both sides before the replacement joins.
 */
function resetTransportNegotiation(member: ControlMember): void {
	member.transportReady = false;
	member.transportKind = null;
	member.transportCommitted = false;
	member.transportFallback = false;
}

function validateUpgrade(req: IncomingMessage, roomId: string, peerId: string): UpgradeAccess {
	const token = readP2PControlTicketToken(req.headers['sec-websocket-protocol']);
	const ticket = verifyP2PMatchTicketForRoom({
		token,
		roomId,
		peerId,
	});
	const requireActiveMatch = shouldRequireActiveMatchTicket()
		&& ticket.ok
		&& ticket.payload.scope === 'matchmaking'
		&& Boolean(token);
	const activeMatchOk = requireActiveMatch && token
		? verifyP2PActiveMatchTicket({ token, roomId, peerId }).ok
		: true;
	const admission = decideControlAdmission({
		protocolPresent: hasP2PControlProtocol(req.headers['sec-websocket-protocol']),
		ticketOk: ticket.ok,
		ticketUnconfigured: !ticket.ok && ticket.reason === 'server_unconfigured',
		ticketHasRole: ticket.ok ? isP2PTransportRole(ticket.payload.role) : false,
		ticketAccount: ticket.ok ? ticket.payload.account ?? null : null,
		ticketScope: ticket.ok ? ticket.payload.scope : null,
		requireActiveMatch,
		activeMatchOk,
		requireSession: shouldRequireControlSession(),
		sessionUsername: getHiveWebSessionUsernameFromCookie(req.headers.cookie) ?? null,
	});
	if (!admission.ok) {
		return { ok: false, status: admission.status, reason: admission.reason };
	}
	if (!ticket.ok) {
		return { ok: false, status: 403, reason: 'Forbidden' };
	}
	return { ok: true, ticket: ticket.payload };
}

export function getP2PControlStats(): P2PControlTelemetrySnapshot {
	let activeConnections = 0;
	for (const room of rooms.values()) activeConnections += room.members.length;
	return getP2PControlTelemetrySnapshot({ activeRooms: rooms.size, activeConnections });
}

export function attachP2PControl(server: HttpServer, options: P2PControlServerOptions = {}): void {
	const wss = new WebSocketServer({
		noServer: true,
		maxPayload: P2P_CONTROL_MAX_PAYLOAD_BYTES,
		handleProtocols: (protocols) => protocols.has(P2P_CONTROL_WS_PROTOCOL) ? P2P_CONTROL_WS_PROTOCOL : false,
	});
	const aliveSockets = new WeakSet<WebSocket>();
	const keepaliveIntervalMs = options.keepaliveIntervalMs ?? P2P_CONTROL_KEEPALIVE_INTERVAL_MS;
	const pokerEntryApprovalTimeoutMs = Math.max(1, Math.min(
		POKER_ENTRY_APPROVAL_TIMEOUT_MS,
		options.pokerEntryApprovalTimeoutMs ?? POKER_ENTRY_APPROVAL_TIMEOUT_MS,
	));
	const ticketBySocket = new WeakMap<WebSocket, P2PMatchTicketPayload>();

	async function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
		const rawUrl = req.url ?? '/';
		if (!rawUrl.startsWith('/ws/control')) return;
		const url = new URL(rawUrl, `http://${req.headers.host ?? 'localhost'}`);
		if (url.pathname !== '/ws/control') return;
		if (!isAllowedOrigin(req)) {
			recordP2PControlError('origin_forbidden');
			rejectUpgrade(socket, 403, 'Forbidden');
			return;
		}
		const roomId = url.searchParams.get('match');
		const peerId = url.searchParams.get('peer');
		if (!roomId || !peerId || !isSafeRoomOrMatchId(roomId) || !isSafePeerId(peerId)) {
			recordP2PControlError('invalid_room_or_peer');
			rejectUpgrade(socket, 400, 'Bad Request');
			return;
		}
		const access = validateUpgrade(req, roomId, peerId);
		if (!access.ok) {
			recordP2PControlError(`upgrade_${access.status}`);
			rejectUpgrade(socket, access.status, access.reason);
			return;
		}
		wss.handleUpgrade(req, socket, head, (ws) => {
			ticketBySocket.set(ws, access.ticket);
			wss.emit('connection', ws, req);
		});
	}

	server.on('upgrade', (req, socket, head) => {
		void handleUpgrade(req, socket, head).catch(() => {
			recordP2PControlError('upgrade_error');
			rejectUpgrade(socket, 500, 'Internal Server Error');
		});
	});

	wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
		aliveSockets.add(ws);
		ws.on('pong', () => { aliveSockets.add(ws); });
		const ticket = ticketBySocket.get(ws);
		const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
		const roomId = url.searchParams.get('match');
		const peerId = url.searchParams.get('peer');
		if (!ticket || !roomId || !peerId || !isP2PTransportRole(ticket.role)) {
			sendError(ws, 'protocol');
			ws.close();
			return;
		}
		let room = rooms.get(roomId);
		if (!room) {
			room = createControlRoom();
			rooms.set(roomId, room);
			markP2PRefereePlaneConnected(roomId, 'control');
		}
		const ownership = findPeerControlOwnership(room, peerId);
		const currentOwner = ownership.incumbent ?? ownership.candidate;
		if (currentOwner && !isSameAuthenticatedSession(currentOwner, ticket)) {
			sendError(ws, 'protocol');
			ws.close();
			return;
		}
		const member: ControlMember = {
			connectionId: randomUUID(),
			peerId,
			role: ticket.role,
			ticketNonce: ticket.nonce,
			...(ticket.account ? { account: ticket.account } : {}),
			ws,
			hello: false,
			transportReady: false,
			transportKind: null,
			transportCommitted: false,
			transportFallback: false,
		};
		const slot = claimControlSlot({
			hasIncumbent: Boolean(ownership.incumbent),
			hasCandidate: Boolean(ownership.candidate),
			roomMemberCount: room.members.length,
			roomMaxPeers: ROOM_MAX_PEERS,
		});
		if (slot.kind === 'reject') {
			sendError(ws, 'protocol');
			ws.close();
			return;
		}
		if (slot.kind === 'candidate') {
			const replacementBudget = consumeWindowRateLimit({
				bucket: REPLACEMENT_RATE_LIMIT,
				key: replacementRateLimitKey(roomId, peerId),
				limit: P2P_CONTROL_REPLACEMENT_LIMIT,
				windowMs: P2P_CONTROL_REPLACEMENT_WINDOW_MS,
			});
			if (!replacementBudget.allowed) {
				recordP2PControlDrop('replacement_rate_limited');
				sendError(ws, 'rate_limited');
				ws.close();
				return;
			}
			const previousCandidate = ownership.candidate;
			room.pendingReplacements.set(peerId, member);
			if (previousCandidate && previousCandidate !== member) {
				MESSAGE_RATE_LIMIT.delete(previousCandidate.connectionId);
				try { previousCandidate.ws.close(); } catch { /* already closed */ }
			}
		} else {
			room.members.push(member);
		}
		recordP2PControlConnection();
		const helloTimeout = setTimeout(() => {
			if (!member.hello && ws.readyState === WebSocket.OPEN) {
				sendError(ws, 'protocol');
				ws.close();
			}
		}, 5_000);

		ws.on('message', (raw: RawData) => {
			const currentRoom = rooms.get(roomId);
			if (!currentRoom || !isAttachedControlMember(currentRoom, member)) return;
			const rate = consumeWindowRateLimit({
				bucket: MESSAGE_RATE_LIMIT,
				key: member.connectionId,
				limit: CONTROL_MESSAGE_LIMIT,
				windowMs: CONTROL_MESSAGE_WINDOW_MS,
			});
			if (!rate.allowed) {
				recordP2PControlDrop('rate_limited');
				sendError(ws, 'rate_limited');
				return;
			}
			let parsed: unknown;
			try { parsed = JSON.parse(rawDataToText(raw)); } catch {
				recordP2PControlDrop('invalid_json');
				sendError(ws, 'protocol');
				ws.close();
				return;
			}
			const message = parseP2PControlClientMessage(parsed);
			if (!message) {
				recordP2PControlDrop('malformed_message');
				sendError(ws, 'protocol');
				ws.close();
				return;
			}
			if (message.type === 'control_hello_v1') {
				if (member.hello || message.matchId !== roomId || message.peerId !== peerId) {
					sendError(ws, 'match_mismatch');
					ws.close();
					return;
				}
				if (currentRoom.pendingReplacements.get(peerId) === member) {
					const { incumbent } = findPeerControlOwnership(currentRoom, peerId);
					if (incumbent && !isSameAuthenticatedSession(incumbent, ticket)) {
						sendError(ws, 'protocol');
						ws.close();
						return;
					}
					const survivingPeer = currentRoom.members.find(candidate => candidate.peerId !== peerId && candidate.hello);
					beginTransportEpoch(roomId, currentRoom, peerId, survivingPeer);
					if (incumbent) {
						const incumbentIndex = currentRoom.members.indexOf(incumbent);
						if (incumbentIndex >= 0) currentRoom.members.splice(incumbentIndex, 1);
						fenceControlMember(incumbent, roomId, peerId);
					}
					currentRoom.pendingReplacements.delete(peerId);
					member.hello = true;
					currentRoom.members.push(member);
					notifyRoomOpen(roomId, currentRoom);
					return;
				}
				member.hello = true;
				notifyRoomOpen(roomId, currentRoom);
				return;
			}
			if (!member.hello) {
				sendError(ws, 'protocol');
				ws.close();
				return;
			}
			if ('matchId' in message && message.matchId !== roomId) {
				recordP2PControlDrop('match_mismatch');
				sendError(ws, 'match_mismatch');
				return;
			}
			const epochFence = fenceTransportEpoch(currentRoom, message);
			if (epochFence === 'stale') {
				recordP2PControlDrop('stale_transport_epoch');
				return;
			}
			if (epochFence === 'future' || epochFence === 'missing') {
				recordP2PControlDrop(epochFence === 'future' ? 'future_transport_epoch' : 'missing_transport_epoch');
				sendError(ws, 'protocol');
				return;
			}
			if (message.type === 'webrtc_offer_v1' && member.role !== 'offerer') {
				recordP2PControlDrop('offer_from_answerer');
				return;
			}
			if (message.type === 'webrtc_answer_v1' && member.role !== 'answerer') {
				recordP2PControlDrop('answer_from_offerer');
				return;
			}
			if (message.type === 'transport_ready_v1') {
				if (member.transportCommitted) return;
				if (member.transportReady) {
					// Retransmission of the exact readiness advertisement is harmless;
					// changing kind on one control session is not a valid transport
					// transition and must not manufacture a second commitment.
					if (member.transportKind === message.kind) commitTransportIfBilateral(roomId, currentRoom);
					return;
				}
				const opponent = currentRoom.members.find(candidate => candidate !== member && candidate.hello);
				if (opponent?.transportReady && opponent.transportKind !== null && opponent.transportKind !== message.kind) {
					// A WebRTC-first/relay-first race is resolved by the relay. The
					// WebRTC member must abandon its unilateral advertisement before
					// either side can become gameplay-connected.
					const webRtcMember = message.kind === 'webrtc'
						? member
						: opponent.transportKind === 'webrtc' ? opponent : null;
					if (webRtcMember) {
						forcePreCommitRelayFallback(roomId, currentRoom, webRtcMember, 'manual');
						if (webRtcMember === member) return;
					}
				}
				// A pre-commit fallback is recoverable: the same authenticated
				// control session may advertise the relay after abandoning a
				// WebRTC attempt.  Only the bilateral commitment is terminal.
				member.transportFallback = false;
				member.transportReady = true;
				member.transportKind = message.kind;
				recordP2PTransportReady(message.kind);
				commitTransportIfBilateral(roomId, currentRoom);
			}
			if (message.type === 'transport_fallback_v1') {
				if (member.transportCommitted || member.transportFallback) return;
				member.transportReady = false;
				member.transportKind = null;
				member.transportFallback = true;
				recordP2PTransportFallback(message.reason);
				notifyPeerOfTransportFallback(roomId, currentRoom, member, message.reason);
			}
			if (message.type === 'poker_action_time_gate_v1') {
				const gate = p2pPokerTimeNotary.gatePokerAction({
					roomId,
					action: message,
					receivedAtMs: Date.now(),
				});
				if (gate.status === 'drop') {
					if (message.decisionId !== undefined && message.seq !== undefined) {
						sendMessage(ws, buildPokerActionTimeGateAck({
							matchId: roomId,
							turnId: message.turnId,
							decisionId: message.decisionId,
							seq: message.seq,
							allowed: false,
							reason: gate.reason,
						}));
					}
					recordP2PControlDrop(`poker_action_${gate.reason}`);
					return;
				}
				const opponent = currentRoom.members.find(candidate => candidate !== member && candidate.hello);
				if (!opponent || opponent.ws.readyState !== WebSocket.OPEN) {
					recordP2PControlDrop('opponent_unavailable');
					return;
				}
				// The sender commits its local reducer only after the ack below. Forward
				// first so an opponent disconnect cannot turn a referee decision into a
				// local-only Poker action.
				if (!sendMessage(opponent.ws, message)) {
					recordP2PControlDrop('opponent_unavailable');
					return;
				}
				if (message.decisionId !== undefined && message.seq !== undefined) {
					sendMessage(ws, buildPokerActionTimeGateAck({
						matchId: roomId,
						turnId: message.turnId,
						decisionId: message.decisionId,
						seq: message.seq,
						allowed: true,
					}));
				}
				recordP2PControlMessage();
				return;
			}
			if (message.type === 'poker_entry_open_v1') {
				if (currentRoom.members.length !== ROOM_MAX_PEERS || currentRoom.members.some(candidate => !candidate.transportCommitted)) {
					recordP2PControlDrop('poker_entry_before_transport_commit');
					return;
				}
				openPokerEntryApproval(roomId, currentRoom, message.combatId, pokerEntryApprovalTimeoutMs);
				recordP2PControlMessage();
				return;
			}
			if (message.type === 'poker_entry_ready_v1') {
				if (currentRoom.members.length !== ROOM_MAX_PEERS || currentRoom.members.some(candidate => !candidate.transportCommitted)) {
					recordP2PControlDrop('poker_entry_before_transport_commit');
					return;
				}
				markPokerEntryReady(roomId, currentRoom, member, message.combatId);
				recordP2PControlMessage();
				return;
			}
			if (message.type === 'phase_checkpoint_propose_v1') {
				const result = p2pPhaseCheckpointCoordinator.submit({
					roomId,
					peerId,
					proposal: message,
				});
				markP2PActiveMatchTerminalFromCheckpoint(roomId, result);
				sendRefereeResult(currentRoom, member, result);
				if (result.status === 'message') recordP2PControlMessage();
				return;
			}
			if (message.type === 'poker_turn_started') {
				const result = p2pPokerTimeNotary.submit({
					roomId,
					peerId,
					proposal: message,
					nowMs: Date.now(),
				});
				sendRefereeResult(currentRoom, member, result);
				if (result.status === 'message') recordP2PControlMessage();
				return;
			}
			if (!isSignalingMessage(message) && !isTransportControlMessage(message) && !isDeliveryReceiptMessage(message)) return;
			const opponent = currentRoom.members.find(candidate => candidate !== member && candidate.hello);
			if (!opponent || opponent.ws.readyState !== WebSocket.OPEN) return;
			sendMessage(opponent.ws, message);
			recordP2PControlMessage();
		});

		const handleDeparture = (): void => {
			clearTimeout(helloTimeout);
			const currentRoom = rooms.get(roomId);
			if (!currentRoom) return;
			if (currentRoom.pendingReplacements.get(peerId) === member) {
				currentRoom.pendingReplacements.delete(peerId);
				MESSAGE_RATE_LIMIT.delete(member.connectionId);
				const incumbentStillExists = currentRoom.members.some(candidate => candidate.peerId === peerId);
				if (!incumbentStillExists) notifyOpponentPeerLeft(currentRoom, roomId, peerId);
				maybeDeleteEmptyControlRoom(roomId, currentRoom);
				return;
			}
			const index = currentRoom.members.indexOf(member);
			if (index < 0) return;
			currentRoom.members.splice(index, 1);
			pausePokerEntryApproval(roomId, currentRoom);
			MESSAGE_RATE_LIMIT.delete(member.connectionId);
			const pendingReplacement = currentRoom.pendingReplacements.get(peerId);
			if (!pendingReplacement) notifyOpponentPeerLeft(currentRoom, roomId, peerId);
			maybeDeleteEmptyControlRoom(roomId, currentRoom);
		};
		ws.on('close', handleDeparture);
		ws.on('error', () => recordP2PControlError('socket_error'));
	});

	// Keep the authenticated referee channel alive through reverse proxies even
	// when both players are thinking and no signaling/checkpoint frame is sent.
	// Browsers answer protocol-level ping frames with pong automatically.
	const keepaliveTimer = setInterval(() => {
		wss.clients.forEach(ws => {
			if (!aliveSockets.has(ws)) {
				recordP2PControlError('keepalive_timeout');
				ws.terminate();
				return;
			}
			aliveSockets.delete(ws);
			try { ws.ping(); } catch { /* socket closed */ }
		});
	}, keepaliveIntervalMs);
	keepaliveTimer.unref?.();
	server.once('close', () => clearInterval(keepaliveTimer));
	wss.once('close', () => clearInterval(keepaliveTimer));
}

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
};
const rooms = new Map<string, ControlRoom>();

function createControlRoom(): ControlRoom {
	return {
		members: [],
		pendingReplacements: new Map(),
		transportEpoch: INITIAL_TRANSPORT_EPOCH,
		createdAt: Date.now(),
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
export const P2P_CONTROL_KEEPALIVE_INTERVAL_MS = 15_000;

export type P2PControlServerOptions = Readonly<{
	readonly keepaliveIntervalMs?: number;
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
	if (!isSignalingMessage(message) && !isTransportControlMessage(message)) return 'ok';
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
	if (!hasP2PControlProtocol(req.headers['sec-websocket-protocol'])) {
		return { ok: false, status: 400, reason: 'Missing control protocol' };
	}
	const token = readP2PControlTicketToken(req.headers['sec-websocket-protocol']);
	const ticket = verifyP2PMatchTicketForRoom({
		token,
		roomId,
		peerId,
	});
	if (!ticket.ok) {
		return { ok: false, status: ticket.reason === 'server_unconfigured' ? 503 : 403, reason: 'Forbidden' };
	}
	if (shouldRequireActiveMatchTicket() && ticket.payload.scope === 'matchmaking' && token) {
		const activeMatch = verifyP2PActiveMatchTicket({ token, roomId, peerId });
		if (!activeMatch.ok) return { ok: false, status: 403, reason: 'Match is not active' };
	}
	if (!isP2PTransportRole(ticket.payload.role)) {
		return { ok: false, status: 403, reason: 'Control role missing' };
	}
	const sessionUsername = getHiveWebSessionUsernameFromCookie(req.headers.cookie);
	if (shouldRequireControlSession() && !sessionUsername) {
		return { ok: false, status: 401, reason: 'Hive session required' };
	}
	// Local matchmaking intentionally allows unsigned/local identities without
	// creating the reusable Hive HTTP session used by shared-network stages.
	// Only bind the ticket account to that cookie when the runtime actually
	// requires the authenticated control session.
	if (shouldRequireControlSession() && ticket.payload.account && sessionUsername !== ticket.payload.account) {
		return { ok: false, status: 403, reason: 'Forbidden' };
	}
	if (shouldRequireControlSession() && !ticket.payload.account) {
		return { ok: false, status: 403, reason: 'Ticket account missing' };
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
		const existingMember = room.members.find(member => member.peerId === peerId);
		if (existingMember && !isSameAuthenticatedSession(existingMember, ticket)) {
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
		if (existingMember) {
			const replacementBudget = consumeWindowRateLimit({
				bucket: REPLACEMENT_RATE_LIMIT,
				key: `${roomId}:${peerId}`,
				limit: P2P_CONTROL_REPLACEMENT_LIMIT,
				windowMs: P2P_CONTROL_REPLACEMENT_WINDOW_MS,
			});
			if (!replacementBudget.allowed) {
				recordP2PControlDrop('replacement_rate_limited');
				sendError(ws, 'rate_limited');
				ws.close();
				return;
			}
			const previousCandidate = room.pendingReplacements.get(peerId);
			if (previousCandidate && previousCandidate !== existingMember) {
				MESSAGE_RATE_LIMIT.delete(previousCandidate.connectionId);
				try { previousCandidate.ws.close(); } catch { /* already closed */ }
			}
			room.pendingReplacements.set(peerId, member);
		} else {
			if (room.members.length >= ROOM_MAX_PEERS) {
				sendError(ws, 'protocol');
				ws.close();
				return;
			}
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
				const incumbent = currentRoom.members.find(candidate => candidate.peerId === peerId && candidate !== member);
				if (incumbent) {
					if (!isSameAuthenticatedSession(incumbent, ticket)) {
						sendError(ws, 'protocol');
						ws.close();
						return;
					}
					const survivingPeer = currentRoom.members.find(candidate => candidate !== incumbent && candidate.hello);
					beginTransportEpoch(roomId, currentRoom, peerId, survivingPeer);
					const incumbentIndex = currentRoom.members.indexOf(incumbent);
					if (incumbentIndex >= 0) currentRoom.members.splice(incumbentIndex, 1);
					MESSAGE_RATE_LIMIT.delete(incumbent.connectionId);
					sendMessage(incumbent.ws, {
						type: 'control_peer_left_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
						matchId: roomId, opponentPeerId: peerId,
					});
					try { incumbent.ws.close(); } catch { /* already closed */ }
					currentRoom.pendingReplacements.delete(peerId);
					member.hello = true;
					currentRoom.members.push(member);
					notifyRoomOpen(roomId, currentRoom);
					return;
				}
				if (currentRoom.pendingReplacements.get(peerId) === member) {
					if (currentRoom.members.length >= ROOM_MAX_PEERS) {
						sendError(ws, 'protocol');
						ws.close();
						return;
					}
					currentRoom.pendingReplacements.delete(peerId);
					currentRoom.members.push(member);
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
			if (!isSignalingMessage(message) && !isTransportControlMessage(message)) return;
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
				return;
			}
			const index = currentRoom.members.indexOf(member);
			if (index < 0) return;
			currentRoom.members.splice(index, 1);
			MESSAGE_RATE_LIMIT.delete(member.connectionId);
			const pendingReplacement = currentRoom.pendingReplacements.get(peerId);
			const opponent = currentRoom.members.find(candidate => candidate.hello);
			if (opponent && !pendingReplacement) {
				sendMessage(opponent.ws, {
					type: 'control_peer_left_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
					matchId: roomId, opponentPeerId: peerId,
				});
			}
			if (currentRoom.members.length === 0 && currentRoom.pendingReplacements.size === 0) {
				rooms.delete(roomId);
				markP2PRefereePlaneDisconnected(roomId, 'control');
			}
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

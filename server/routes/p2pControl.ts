import type { Server as HttpServer, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket, type RawData } from 'ws';

import {
	P2P_CONTROL_MAX_PAYLOAD_BYTES,
	P2P_CONTROL_PROTOCOL_VERSION,
	P2P_CONTROL_WS_PROTOCOL,
	isP2PTransportRole,
	parseP2PControlClientMessage,
	type P2PControlClientMessage,
} from '../../shared/p2p-wire/control';
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

type ControlMember = {
	readonly connectionId: string;
	readonly peerId: string;
	readonly role: P2PTransportRole;
	readonly ws: WebSocket;
	hello: boolean;
	transportReady: boolean;
	transportFallback: boolean;
};

type ControlRoom = ControlMember[];
const rooms = new Map<string, ControlRoom>();
const MESSAGE_RATE_LIMIT: RateLimitBucket = new Map();
const ROOM_MAX_PEERS = 2;
const CONTROL_MESSAGE_LIMIT = 40;
const CONTROL_MESSAGE_WINDOW_MS = 10_000;

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

function sendMessage(ws: WebSocket, message: Record<string, unknown>): void {
	if (ws.readyState !== WebSocket.OPEN) return;
	try { ws.send(JSON.stringify(message)); } catch { recordP2PControlError('send_failed'); }
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

function notifyRoomOpen(roomId: string, room: ControlRoom): void {
	if (room.length !== ROOM_MAX_PEERS || room.some(member => !member.hello)) return;
	const [first, second] = room;
	if (!first || !second || first.role === second.role) {
		for (const member of room) sendError(member.ws, 'role_conflict');
		return;
	}
	sendMessage(first.ws, {
		type: 'control_open_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
		matchId: roomId, peerId: first.peerId, opponentPeerId: second.peerId, role: first.role,
	});
	sendMessage(second.ws, {
		type: 'control_open_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
		matchId: roomId, peerId: second.peerId, opponentPeerId: first.peerId, role: second.role,
	});
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
	if (ticket.payload.account && sessionUsername !== ticket.payload.account) {
		return { ok: false, status: 403, reason: 'Forbidden' };
	}
	if (shouldRequireControlSession() && !ticket.payload.account) {
		return { ok: false, status: 403, reason: 'Ticket account missing' };
	}
	return { ok: true, ticket: ticket.payload };
}

export function getP2PControlStats(): P2PControlTelemetrySnapshot {
	let activeConnections = 0;
	for (const room of rooms.values()) activeConnections += room.length;
	return getP2PControlTelemetrySnapshot({ activeRooms: rooms.size, activeConnections });
}

export function attachP2PControl(server: HttpServer): void {
	const wss = new WebSocketServer({
		noServer: true,
		maxPayload: P2P_CONTROL_MAX_PAYLOAD_BYTES,
		handleProtocols: (protocols) => protocols.has(P2P_CONTROL_WS_PROTOCOL) ? P2P_CONTROL_WS_PROTOCOL : false,
	});
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
			room = [];
			rooms.set(roomId, room);
		}
		if (room.length >= ROOM_MAX_PEERS || room.some(member => member.peerId === peerId)) {
			sendError(ws, 'protocol');
			ws.close();
			return;
		}
		const member: ControlMember = {
			connectionId: randomUUID(),
			peerId,
			role: ticket.role,
			ws,
			hello: false,
			transportReady: false,
			transportFallback: false,
		};
		room.push(member);
		recordP2PControlConnection();
		const helloTimeout = setTimeout(() => {
			if (!member.hello && ws.readyState === WebSocket.OPEN) {
				sendError(ws, 'protocol');
				ws.close();
			}
		}, 5_000);

		ws.on('message', (raw: RawData) => {
			const currentRoom = rooms.get(roomId);
			if (!currentRoom?.includes(member)) return;
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
				member.hello = true;
				notifyRoomOpen(roomId, currentRoom);
				return;
			}
			if (!member.hello) {
				sendError(ws, 'protocol');
				ws.close();
				return;
			}
			if (message.matchId !== roomId) {
				recordP2PControlDrop('match_mismatch');
				sendError(ws, 'match_mismatch');
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
				if (member.transportFallback) return;
				member.transportReady = true;
				recordP2PTransportReady(message.kind);
			}
			if (message.type === 'transport_fallback_v1') {
				if (member.transportReady || member.transportFallback) return;
				member.transportFallback = true;
				recordP2PTransportFallback(message.reason);
			}
			if (!isSignalingMessage(message) && !isTransportControlMessage(message)) return;
			const opponent = currentRoom.find(candidate => candidate !== member && candidate.hello);
			if (!opponent || opponent.ws.readyState !== WebSocket.OPEN) return;
			sendMessage(opponent.ws, message);
			recordP2PControlMessage();
		});

		const handleDeparture = (): void => {
			clearTimeout(helloTimeout);
			const currentRoom = rooms.get(roomId);
			if (!currentRoom) return;
			const index = currentRoom.indexOf(member);
			if (index < 0) return;
			currentRoom.splice(index, 1);
			MESSAGE_RATE_LIMIT.delete(member.connectionId);
			const opponent = currentRoom.find(candidate => candidate.hello);
			if (opponent) {
				sendMessage(opponent.ws, {
					type: 'control_peer_left_v1', protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
					matchId: roomId, opponentPeerId: peerId,
				});
			}
			if (currentRoom.length === 0) rooms.delete(roomId);
		};
		ws.on('close', handleDeparture);
		ws.on('error', () => recordP2PControlError('socket_error'));
	});
}

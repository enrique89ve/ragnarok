/**
 * p2pRelay.ts — WebSocket relay for game-state sync between two peers.
 *
 * Architecture: each match gets a "room" identified by the matchId emitted by
 * matchmaking. Both peers open `ws://<host>/ws/p2p?room=<roomId>&peer=<peerId>`
 * and the server fans out application messages between them. Replaces the
 * WebRTC DataChannel + STUN/TURN/PeerJS broker — same logical contract, but
 * works under broken DNS / NAT / firewall / WSL2 because all traffic is
 * server-mediated.
 *
 * Wire protocol:
 *   Client → server : opaque text frame (JSON-encoded application message,
 *                     same shape that `useWireSync` sends today).
 *   Server → client : same opaque frame fanned out to the *other* peer in
 *                     the room. Reserved control envelopes use type `__sys`
 *                     with an `event` field (`open`/`close`/`error`) so the
 *                     transport can distinguish lifecycle from app payload.
 */

import type { Server as HttpServer, IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { WebSocketServer, WebSocket, type RawData } from 'ws';
import { z } from 'zod';
import {
	tryParsePhaseCheckpointProposal,
	type PhaseCheckpointServerMessage,
} from '../../shared/p2p-wire/phaseCheckpoint';
import {
	tryParsePokerActionTimeGate,
	tryParsePokerTurnClockProposal,
	type PokerTurnNotaryServerMessage,
} from '../../shared/p2p-wire/pokerTimeNotary';
import {
	P2P_MATCH_TICKET_WS_PROTOCOL,
	isSafePeerId,
	isSafeRoomOrMatchId,
} from '../../shared/p2pAvailability';
import {
	getP2PRelayTelemetrySnapshot,
	recordP2PRelayConnection,
	recordP2PRelayDrop,
	recordP2PRelayError,
	recordP2PRelayMessage,
	type P2PRelayErrorReason,
	type P2PRelayTelemetrySnapshot,
} from '../services/p2pTelemetry';
import { verifyP2PMatchTicketForRoom } from '../services/p2pMatchTicketSigner';
import { createP2PPhaseCheckpointCoordinator } from '../services/p2pPhaseCheckpointCoordinator';
import { createP2PPokerTimeNotary } from '../services/p2pPokerTimeNotary';
import {
	isP2PRelayOriginAllowed,
} from '../services/p2pRelayOrigin';
import {
	hasP2PRelayProtocol,
	readP2PRelayTicketToken,
} from '../services/p2pRelayProtocol';
import { verifyP2PActiveMatchTicket } from '../services/p2pActiveMatchRegistry';
import { hasStarterCeremonyClaim } from '../services/starterClaimRegistry';
import { log } from '../static';

type RoomMember = {
	readonly peerId: string;
	readonly ws: WebSocket;
};

const rooms = new Map<string, RoomMember[]>();
const relayAliveSockets = new WeakSet<WebSocket>();
const phaseCheckpointCoordinator = createP2PPhaseCheckpointCoordinator();
const pokerTimeNotary = createP2PPokerTimeNotary();
const emptyCheckpointRoomExpiry = new Map<string, number>();

const ROOM_MAX_PEERS = 2;
const KEEPALIVE_INTERVAL_MS = 15_000;
const CHECKPOINT_RECONNECT_RETENTION_MS = 120_000;
const CHECKPOINT_SWEEP_INTERVAL_MS = 30_000;
const CHECKPOINT_TOKEN_CAPACITY = 8;
const CHECKPOINT_TOKEN_REFILL_MS = 2_000;
// Initial GameState sync is gzip-framed before relay fan-out; keep frames tight.
export const P2P_RELAY_MAX_PAYLOAD_BYTES = 16 * 1024;

/**
 * Whitelist of message `type` values the relay will fan out. Everything else
 * is dropped (with a warn log) before reaching the peer — defense in depth
 * for both directions: a tampered client can't push exotic message types,
 * and the recipient's `useWireSync` switch never receives surprises.
 *
 * Keep in sync with `P2PMessage` in `client/src/game/match/modes/p2p/wireSync/useWireSync.ts`,
 * `GameCommandEnvelope.type` in `client/src/game/hooks/p2pEnvelope.ts`, and
 * `ChessCommandEnvelope.type` in `shared/p2p-wire/chess.ts`.
 */
const RELAY_ALLOWED_MESSAGE_TYPES: ReadonlySet<string> = new Set([
	'init',
	'game_command',
	'chess_command',
	'transition_receipt_v1',
	'gameState',
	'ping',
	'pong',
	'heartbeat',
	'deck_verify',
	'seed_commit',
	'seed_reveal',
	'army_announcement',
	'cards_deck',
	'result_propose',
	'result_countersign',
	'result_reject',
	'version_check',
	'wasm_hash_check',
	'battle_ready_v1',
	'hash_check',
	'poker_hash_check',
	'hash_mismatch',
	'poker_action',
	'poker_turn_started',
	'session_authorize',
	'session_renewal',
	'session_resumed',
	'state_sync_request',
	'action_envelope',
	'spectator_state',
	'phase_checkpoint_propose_v1',
]);

/**
 * Server-only types reserved for the relay's own control envelopes
 * (lifecycle and error notifications). A client sending one is either
 * confused or malicious — drop and log.
 */
const RESERVED_TYPE_PREFIX = '__';

const relayEnvelopeSchema = z.object({
	type: z.string().min(1).max(64),
}).passthrough();

type ValidationOk = { readonly ok: true; readonly type: string };
type ValidationFail = { readonly ok: false; readonly reason: string };
export type P2PRelayFrameValidationResult = ValidationOk | ValidationFail;
type RelayUpgradeAccess =
	| { readonly ok: true }
	| { readonly ok: false; readonly status: number; readonly telemetryReason: P2PRelayErrorReason; readonly reason: string };

export function shouldRequireP2PRelayTicket(input: {
	readonly nodeEnv?: string;
	readonly networkStage?: string;
}): boolean {
	return input.nodeEnv === 'production' || input.networkStage === 'testnet' || input.networkStage === 'mainnet';
}

function isProductionRuntime(): boolean {
	return process.env.NODE_ENV === 'production';
}

function isRelayTicketRequired(): boolean {
	return shouldRequireP2PRelayTicket({
		nodeEnv: process.env.NODE_ENV,
		networkStage: process.env.VITE_NETWORK_STAGE,
	});
}

export async function isP2PRelayTicketStarterClaimAllowed(input: {
	readonly ticketRequired: boolean;
	readonly account?: string;
}): Promise<boolean> {
	if (!input.ticketRequired) return true;
	return hasStarterCeremonyClaim(input.account);
}

function isAllowedOrigin(req: IncomingMessage): boolean {
	return isP2PRelayOriginAllowed({
		origin: typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
		host: req.headers.host,
		forwardedHost: req.headers['x-forwarded-host'],
		allowedOrigins: process.env.P2P_RELAY_ALLOWED_ORIGINS,
		trustForwardedHost: process.env.P2P_RELAY_TRUST_FORWARDED_HOST === 'true',
		production: isProductionRuntime(),
	});
}

function relayErrorForTicketReason(reason: string): P2PRelayErrorReason {
	if (reason === 'missing') return 'missing_ticket';
	if (reason === 'malformed') return 'malformed_ticket';
	if (reason === 'expired') return 'expired_ticket';
	if (reason === 'mismatch') return 'ticket_mismatch';
	if (reason === 'bad_signature') return 'bad_ticket_signature';
	if (reason === 'server_unconfigured') return 'ticket_server_unconfigured';
	return 'malformed_ticket';
}

async function validateRelayTicketUpgrade(input: {
	readonly protocolHeader: string | string[] | undefined;
	readonly roomId: string;
	readonly peerId: string;
}): Promise<RelayUpgradeAccess> {
	if (!hasP2PRelayProtocol(input.protocolHeader)) {
		return { ok: false, status: 426, telemetryReason: 'missing_protocol', reason: 'Upgrade Required' };
	}
	const ticketToken = readP2PRelayTicketToken(input.protocolHeader);
	const ticket = verifyP2PMatchTicketForRoom({
		token: ticketToken,
		roomId: input.roomId,
		peerId: input.peerId,
	});
	if (!ticket.ok && (isRelayTicketRequired() || ticket.reason !== 'missing')) {
		return {
			ok: false,
			status: ticket.reason === 'server_unconfigured' ? 503 : 403,
			telemetryReason: relayErrorForTicketReason(ticket.reason),
			reason: 'Forbidden',
		};
	}
	if (ticket.ok && ticket.payload.scope === 'matchmaking' && isRelayTicketRequired() && ticketToken) {
		const activeMatch = verifyP2PActiveMatchTicket({
			token: ticketToken,
			roomId: input.roomId,
			peerId: input.peerId,
		});
		if (!activeMatch.ok) {
			return { ok: false, status: 403, telemetryReason: 'ticket_mismatch', reason: 'Forbidden' };
		}
	}
	if (ticket.ok && !await isP2PRelayTicketStarterClaimAllowed({
		ticketRequired: isRelayTicketRequired(),
		account: ticket.payload.account,
	})) {
		return { ok: false, status: 403, telemetryReason: 'starter_claim_required', reason: 'Forbidden' };
	}
	return { ok: true };
}

function rejectUpgrade(socket: { write: (chunk: string) => unknown; destroy: () => unknown }, status: number, reason: string): void {
	try {
		socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
	} catch { /* socket may already be gone */ }
	try { socket.destroy(); } catch { /* already closed */ }
}

export function validateP2PRelayFrame(text: string): P2PRelayFrameValidationResult {
	if (Buffer.byteLength(text, 'utf8') > P2P_RELAY_MAX_PAYLOAD_BYTES) {
		return { ok: false, reason: 'oversize' };
	}

	let parsed: unknown;
	try { parsed = JSON.parse(text); }
	catch { return { ok: false, reason: 'invalid_json' }; }

	const result = relayEnvelopeSchema.safeParse(parsed);
	if (!result.success) return { ok: false, reason: 'malformed_envelope' };

	const { type } = result.data;
	if (type.startsWith(RESERVED_TYPE_PREFIX)) {
		return { ok: false, reason: 'reserved_type' };
	}
	if (!RELAY_ALLOWED_MESSAGE_TYPES.has(type)) {
		return { ok: false, reason: `unknown_type:${type}` };
	}

	return { ok: true, type };
}

function sendSys(ws: WebSocket, payload: Record<string, unknown>): void {
	if (ws.readyState !== WebSocket.OPEN) return;
	try {
		ws.send(JSON.stringify({ type: '__sys', ...payload }));
	} catch { /* socket closed mid-send */ }
}

function sendPhaseCheckpoint(
	ws: WebSocket,
	message: PhaseCheckpointServerMessage,
): void {
	sendSys(ws, { event: 'phase_checkpoint', message });
}

function sendPokerTurnNotary(
	ws: WebSocket,
	message: PokerTurnNotaryServerMessage,
): void {
	sendSys(ws, { event: 'poker_turn_notary', message });
}

function notifyRoomFull(room: readonly RoomMember[]): void {
	if (room.length !== ROOM_MAX_PEERS) return;
	const [first, second] = room;
	// Stable across reconnect order: the lexicographically smaller peer keeps
	// cards authority instead of authority silently flipping after a dropout.
	const firstIsHost = first.peerId.localeCompare(second.peerId) < 0;
	sendSys(first.ws, { event: 'open', isHost: firstIsHost, remotePeerId: second.peerId });
	sendSys(second.ws, { event: 'open', isHost: !firstIsHost, remotePeerId: first.peerId });
}

function relayRawFrameToText(raw: RawData): string {
	if (typeof raw === 'string') return raw;
	if (Buffer.isBuffer(raw)) return raw.toString('utf8');
	if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
	return Buffer.from(raw).toString('utf8');
}

export function getP2PRelayStats(): P2PRelayTelemetrySnapshot {
	let activeConnections = 0;
	let activeFullRooms = 0;
	rooms.forEach((room) => {
		activeConnections += room.length;
		if (room.length === ROOM_MAX_PEERS) activeFullRooms += 1;
	});
	return getP2PRelayTelemetrySnapshot({
		activeRooms: rooms.size,
		activeConnections,
		activeFullRooms,
	});
}

export function attachP2PRelay(server: HttpServer): void {
	const wss = new WebSocketServer({
		noServer: true,
		maxPayload: P2P_RELAY_MAX_PAYLOAD_BYTES,
		handleProtocols: (protocols) => protocols.has(P2P_MATCH_TICKET_WS_PROTOCOL) ? P2P_MATCH_TICKET_WS_PROTOCOL : false,
	});

	async function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
		const rawUrl = req.url ?? '/';
		if (!rawUrl.startsWith('/ws/p2p')) return; // not ours
		const url = new URL(rawUrl, `http://${req.headers.host ?? 'localhost'}`);
		if (url.pathname !== '/ws/p2p') return;
		if (!isAllowedOrigin(req)) {
			recordP2PRelayError('origin_forbidden');
			rejectUpgrade(socket, 403, 'Forbidden');
			return;
		}
		const roomId = url.searchParams.get('room');
		const peerId = url.searchParams.get('peer');
		if (!roomId || !peerId || !isSafeRoomOrMatchId(roomId) || !isSafePeerId(peerId)) {
			recordP2PRelayError('invalid_room_or_peer');
			rejectUpgrade(socket, 400, 'Bad Request');
			return;
		}
		const ticketAccess = await validateRelayTicketUpgrade({
			protocolHeader: req.headers['sec-websocket-protocol'],
			roomId,
			peerId,
		});
		if (!ticketAccess.ok) {
			recordP2PRelayError(ticketAccess.telemetryReason);
			rejectUpgrade(socket, ticketAccess.status, ticketAccess.reason);
			return;
		}

		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit('connection', ws, req);
		});
	}

	server.on('upgrade', (req: IncomingMessage, socket, head) => {
		void handleUpgrade(req, socket, head).catch((error: unknown) => {
			recordP2PRelayError('socket_error');
			log(`upgrade failed: ${error instanceof Error ? error.message : String(error)}`, 'Relay');
			rejectUpgrade(socket, 500, 'Internal Server Error');
		});
	});

	wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
		const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
		const roomId = url.searchParams.get('room');
		const peerId = url.searchParams.get('peer');

		if (!roomId || !peerId) {
			recordP2PRelayError('missing_room_or_peer');
			sendSys(ws, { event: 'error', reason: 'missing_room_or_peer' });
			ws.close();
			return;
		}
		if (!isSafeRoomOrMatchId(roomId) || !isSafePeerId(peerId)) {
			recordP2PRelayError('invalid_room_or_peer');
			sendSys(ws, { event: 'error', reason: 'invalid_room_or_peer' });
			ws.close();
			return;
		}

		let room = rooms.get(roomId);
		if (!room) {
			room = [];
			rooms.set(roomId, room);
		}
		emptyCheckpointRoomExpiry.delete(roomId);

		if (room.length >= ROOM_MAX_PEERS) {
			recordP2PRelayError('room_full');
			sendSys(ws, { event: 'error', reason: 'room_full' });
			ws.close();
			return;
		}
		if (room.some(m => m.peerId === peerId)) {
			recordP2PRelayError('duplicate_peer');
			sendSys(ws, { event: 'error', reason: 'duplicate_peer' });
			ws.close();
			return;
		}

		room.push({ peerId, ws });
		recordP2PRelayConnection();
		log(`room=${roomId.slice(0, 16)}… peer=${peerId.slice(0, 8)}… joined (${room.length}/${ROOM_MAX_PEERS})`, 'Relay');

		relayAliveSockets.add(ws);
		ws.on('pong', () => { relayAliveSockets.add(ws); });

		if (room.length === ROOM_MAX_PEERS) notifyRoomFull(room);

		let checkpointTokens = CHECKPOINT_TOKEN_CAPACITY;
		let checkpointTokensRefilledAt = Date.now();
		const consumeCheckpointToken = (): boolean => {
			const now = Date.now();
			const refill = Math.floor((now - checkpointTokensRefilledAt) / CHECKPOINT_TOKEN_REFILL_MS);
			if (refill > 0) {
				checkpointTokens = Math.min(CHECKPOINT_TOKEN_CAPACITY, checkpointTokens + refill);
				checkpointTokensRefilledAt += refill * CHECKPOINT_TOKEN_REFILL_MS;
			}
			if (checkpointTokens <= 0) return false;
			checkpointTokens--;
			return true;
		};

		ws.on('message', (raw: RawData) => {
			const currentRoom = rooms.get(roomId);
			if (!currentRoom) return;
			if (!currentRoom.some(member => member.peerId === peerId && member.ws === ws)) return;

			// Coerce to string so the recipient sees the same shape regardless of
			// how the sender's WebSocket lib emitted the frame. App payloads are
			// JSON; binary would be a protocol violation we'd rather surface.
			const text = relayRawFrameToText(raw);

			// Validate envelope BEFORE fan-out. The recipient's `useWireSync` does
			// deep payload validation per type, so we only enforce the structural
			// contract here: well-formed JSON, known type, non-reserved, sane size.
			// Drops are logged but silent to the sender — surfacing them risks an
			// info-leak channel for probing the whitelist.
			const validation = validateP2PRelayFrame(text);
			if (!validation.ok) {
				recordP2PRelayDrop(validation.reason);
				log(`dropping frame room=${roomId.slice(0, 16)}… peer=${peerId.slice(0, 8)}… reason=${validation.reason}`, 'Relay');
				return;
			}

			if (validation.type === 'phase_checkpoint_propose_v1') {
				if (!consumeCheckpointToken()) {
					recordP2PRelayDrop('phase_checkpoint_rate_limited');
					return;
				}
				let parsedJson: unknown;
				try { parsedJson = JSON.parse(text); }
				catch { return; }
				const proposal = tryParsePhaseCheckpointProposal(parsedJson);
				if (!proposal) {
					recordP2PRelayDrop('malformed_phase_checkpoint');
					return;
				}
				const result = phaseCheckpointCoordinator.submit({ roomId, peerId, proposal });
				if (result.status === 'pending') return;
				if (result.recipients === 'sender') {
					sendPhaseCheckpoint(ws, result.message);
					return;
				}
				for (const member of currentRoom) {
					sendPhaseCheckpoint(member.ws, result.message);
				}
				recordP2PRelayMessage();
				return;
			}

			if (validation.type === 'poker_turn_started') {
				if (!consumeCheckpointToken()) {
					recordP2PRelayDrop('poker_turn_notary_rate_limited');
					return;
				}
				let parsedTurn: unknown;
				try { parsedTurn = JSON.parse(text); }
				catch { return; }
				const proposal = tryParsePokerTurnClockProposal(parsedTurn);
				if (!proposal) {
					recordP2PRelayDrop('malformed_poker_turn_notary');
					return;
				}
				const result = pokerTimeNotary.submit({
					roomId,
					peerId,
					proposal,
					nowMs: Date.now(),
				});
				if (result.status === 'pending') return;
				if (result.recipients === 'sender') {
					sendPokerTurnNotary(ws, result.message);
					return;
				}
				for (const member of currentRoom) {
					sendPokerTurnNotary(member.ws, result.message);
				}
				recordP2PRelayMessage();
				return;
			}

			if (validation.type === 'poker_action') {
				let parsedAction: unknown;
				try { parsedAction = JSON.parse(text); }
				catch { return; }
				const gateInput = tryParsePokerActionTimeGate(parsedAction);
				if (!gateInput) {
					recordP2PRelayDrop('malformed_poker_action_time_gate');
					return;
				}
				const gate = pokerTimeNotary.gatePokerAction({
					roomId,
					action: gateInput,
					receivedAtMs: Date.now(),
				});
				if (gate.status === 'drop') {
					recordP2PRelayDrop(gate.reason);
					return;
				}
			}

			const other = currentRoom.find(m => m.peerId !== peerId);
			if (!other || other.ws.readyState !== WebSocket.OPEN) return;

			try {
				other.ws.send(text);
				recordP2PRelayMessage();
			} catch {
				recordP2PRelayError('send_failed');
			}
		});

		const handleDeparture = () => {
			const currentRoom = rooms.get(roomId);
			if (!currentRoom) return;
			const idx = currentRoom.findIndex(m => m.peerId === peerId);
			if (idx === -1) return;
			currentRoom.splice(idx, 1);
			log(`room=${roomId.slice(0, 16)}… peer=${peerId.slice(0, 8)}… left (${currentRoom.length}/${ROOM_MAX_PEERS})`, 'Relay');

			const survivor = currentRoom[0];
			if (survivor && survivor.ws.readyState === WebSocket.OPEN) {
				sendSys(survivor.ws, { event: 'close' });
			}
			if (currentRoom.length === 0) {
				rooms.delete(roomId);
				emptyCheckpointRoomExpiry.set(
					roomId,
					Date.now() + CHECKPOINT_RECONNECT_RETENTION_MS,
				);
			}
		};

		ws.on('close', handleDeparture);
		ws.on('error', (err) => {
			recordP2PRelayError('socket_error');
			log(`room=${roomId.slice(0, 16)}… peer=${peerId.slice(0, 8)}… error: ${err.message}`, 'Relay');
		});
	});

	// WS-level keepalive — terminate sockets that don't pong back within one
	// interval. App-level heartbeat (in useWireSync) still runs on top; this
	// catches dead connections that didn't trigger a clean close (e.g., NIC
	// dropped, kernel hasn't sent FIN yet).
	const keepaliveTimer = setInterval(() => {
		wss.clients.forEach((ws) => {
			if (!relayAliveSockets.has(ws)) {
				recordP2PRelayError('keepalive_timeout');
				ws.terminate();
				return;
			}
			relayAliveSockets.delete(ws);
			try { ws.ping(); } catch { /* socket closed */ }
		});
	}, KEEPALIVE_INTERVAL_MS);
	keepaliveTimer.unref?.();

	const checkpointSweepTimer = setInterval(() => {
		const now = Date.now();
		for (const [roomId, expiresAt] of emptyCheckpointRoomExpiry) {
			if (expiresAt > now || rooms.has(roomId)) continue;
			emptyCheckpointRoomExpiry.delete(roomId);
			phaseCheckpointCoordinator.dropRoom(roomId);
			pokerTimeNotary.dropRoom(roomId);
		}
	}, CHECKPOINT_SWEEP_INTERVAL_MS);
	checkpointSweepTimer.unref?.();
}

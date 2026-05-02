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
 *                     same shape that `useP2PSync` sends today).
 *   Server → client : same opaque frame fanned out to the *other* peer in
 *                     the room. Reserved control envelopes use type `__sys`
 *                     with an `event` field (`open`/`close`/`error`) so the
 *                     transport can distinguish lifecycle from app payload.
 */

import type { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';

interface RoomMember {
	readonly peerId: string;
	readonly ws: WebSocket;
}

const rooms = new Map<string, RoomMember[]>();

const ROOM_MAX_PEERS = 2;
const KEEPALIVE_INTERVAL_MS = 15_000;
const MAX_PAYLOAD_BYTES = 64 * 1024; // 64 KB per frame — sane upper bound for any
                                     // game message; full GameState snapshots are
                                     // the largest legit payload at ~10 KB.

/**
 * Whitelist of message `type` values the relay will fan out. Everything else
 * is dropped (with a warn log) before reaching the peer — defense in depth
 * for both directions: a tampered client can't push exotic message types,
 * and the recipient's `useP2PSync` switch never receives surprises.
 *
 * Keep in sync with `P2PMessage` in `client/src/game/hooks/useP2PSync.ts`
 * and `GameCommandEnvelope.type` in `client/src/game/hooks/p2pEnvelope.ts`.
 */
const RELAY_ALLOWED_MESSAGE_TYPES: ReadonlySet<string> = new Set([
	'init',
	'game_command',
	'gameState',
	'opponentDisconnected',
	'ping',
	'pong',
	'heartbeat',
	'deck_verify',
	'seed_commit',
	'seed_reveal',
	'army_announcement',
	'result_propose',
	'result_countersign',
	'result_reject',
	'version_check',
	'wasm_hash_check',
	'hash_check',
	'hash_mismatch',
	'poker_action',
	'spectator_state',
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

interface ValidationOk { readonly ok: true; readonly type: string; }
interface ValidationFail { readonly ok: false; readonly reason: string; }
type ValidationResult = ValidationOk | ValidationFail;

function validateRelayFrame(text: string): ValidationResult {
	if (text.length > MAX_PAYLOAD_BYTES) {
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

function notifyRoomFull(room: readonly RoomMember[]): void {
	if (room.length !== ROOM_MAX_PEERS) return;
	const [first, second] = room;
	// First arrival is the host (canonical pick — useP2PSync seed-exchange
	// breaks ties by lexicographical peerId comparison anyway).
	sendSys(first.ws, { event: 'open', isHost: true,  remotePeerId: second.peerId });
	sendSys(second.ws, { event: 'open', isHost: false, remotePeerId: first.peerId });
}

export function attachP2PRelay(server: HttpServer): void {
	const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });

	server.on('upgrade', (req: IncomingMessage, socket, head) => {
		const rawUrl = req.url ?? '/';
		if (!rawUrl.startsWith('/ws/p2p')) return; // not ours
		const url = new URL(rawUrl, `http://${req.headers.host ?? 'localhost'}`);
		if (url.pathname !== '/ws/p2p') return;

		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit('connection', ws, req);
		});
	});

	wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
		const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
		const roomId = url.searchParams.get('room');
		const peerId = url.searchParams.get('peer');

		if (!roomId || !peerId) {
			sendSys(ws, { event: 'error', reason: 'missing_room_or_peer' });
			ws.close();
			return;
		}
		// Length sanity — matchId is `${peerA}-${peerB}` so worst case ~80 chars.
		if (roomId.length > 256 || peerId.length > 64) {
			sendSys(ws, { event: 'error', reason: 'room_or_peer_too_long' });
			ws.close();
			return;
		}

		let room = rooms.get(roomId);
		if (!room) {
			room = [];
			rooms.set(roomId, room);
		}

		if (room.length >= ROOM_MAX_PEERS) {
			sendSys(ws, { event: 'error', reason: 'room_full' });
			ws.close();
			return;
		}
		if (room.some(m => m.peerId === peerId)) {
			sendSys(ws, { event: 'error', reason: 'duplicate_peer' });
			ws.close();
			return;
		}

		room.push({ peerId, ws });
		console.log(`[Relay] room=${roomId.slice(0, 16)}… peer=${peerId.slice(0, 8)}… joined (${room.length}/${ROOM_MAX_PEERS})`);

		(ws as WebSocket & { isAlive?: boolean }).isAlive = true;
		ws.on('pong', () => { (ws as WebSocket & { isAlive?: boolean }).isAlive = true; });

		if (room.length === ROOM_MAX_PEERS) notifyRoomFull(room);

		ws.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
			const currentRoom = rooms.get(roomId);
			if (!currentRoom) return;
			const other = currentRoom.find(m => m.peerId !== peerId);
			if (!other || other.ws.readyState !== WebSocket.OPEN) return;

			// Coerce to string so the recipient sees the same shape regardless of
			// how the sender's WebSocket lib emitted the frame. App payloads are
			// JSON; binary would be a protocol violation we'd rather surface.
			const text = typeof raw === 'string'
				? raw
				: Buffer.isBuffer(raw)
					? raw.toString('utf8')
					: Buffer.concat(Array.isArray(raw) ? raw : [Buffer.from(raw as ArrayBuffer)]).toString('utf8');

			// Validate envelope BEFORE fan-out. The recipient's `useP2PSync` does
			// deep payload validation per type, so we only enforce the structural
			// contract here: well-formed JSON, known type, non-reserved, sane size.
			// Drops are logged but silent to the sender — surfacing them risks an
			// info-leak channel for probing the whitelist.
			const validation = validateRelayFrame(text);
			if (!validation.ok) {
				console.warn(`[Relay] dropping frame room=${roomId.slice(0, 16)}… peer=${peerId.slice(0, 8)}… reason=${validation.reason}`);
				return;
			}

			try { other.ws.send(text); } catch { /* peer closed mid-send */ }
		});

		const handleDeparture = () => {
			const currentRoom = rooms.get(roomId);
			if (!currentRoom) return;
			const idx = currentRoom.findIndex(m => m.peerId === peerId);
			if (idx === -1) return;
			currentRoom.splice(idx, 1);
			console.log(`[Relay] room=${roomId.slice(0, 16)}… peer=${peerId.slice(0, 8)}… left (${currentRoom.length}/${ROOM_MAX_PEERS})`);

			const survivor = currentRoom[0];
			if (survivor && survivor.ws.readyState === WebSocket.OPEN) {
				sendSys(survivor.ws, { event: 'close' });
			}
			if (currentRoom.length === 0) rooms.delete(roomId);
		};

		ws.on('close', handleDeparture);
		ws.on('error', (err) => {
			console.warn(`[Relay] room=${roomId.slice(0, 16)}… peer=${peerId.slice(0, 8)}… error:`, err.message);
		});
	});

	// WS-level keepalive — terminate sockets that don't pong back within one
	// interval. App-level heartbeat (in useP2PSync) still runs on top; this
	// catches dead connections that didn't trigger a clean close (e.g., NIC
	// dropped, kernel hasn't sent FIN yet).
	const keepaliveTimer = setInterval(() => {
		wss.clients.forEach((ws) => {
			const w = ws as WebSocket & { isAlive?: boolean };
			if (w.isAlive === false) { ws.terminate(); return; }
			w.isAlive = false;
			try { ws.ping(); } catch { /* socket closed */ }
		});
	}, KEEPALIVE_INTERVAL_MS);
	keepaliveTimer.unref?.();
}

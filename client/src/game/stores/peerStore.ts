/**
 * peerStore.ts — match transport (server-mediated WebSocket relay).
 *
 * Replaces the previous PeerJS + WebRTC + STUN/TURN stack with a single
 * WebSocket connection to the game's own server (`/ws/p2p`). Same external
 * API (`host`, `join`, `send`, `disconnect`, `handleHeartbeat`) so
 * `useP2PSync` keeps working unchanged. The `connection` exposed in the
 * store is structurally compatible with the subset of `DataConnection` that
 * `useP2PSync` consumes (events `data|open|close|error`, methods `send`/
 * `close`, props `peer`/`open`).
 *
 * Why WS instead of WebRTC: under WSL2 + Chrome the internal DNS resolver
 * fails on every STUN/TURN hostname (errorCode=701) and the public OpenRelay
 * TURN credentials were revoked (errorCode=400). With both srflx and relay
 * unavailable two same-machine peers behind WSL2 NAT couldn't negotiate.
 * Going through the server eliminates ICE/STUN/TURN/broker entirely; works
 * everywhere the HTTP server is reachable. Tradeoff: server sees all match
 * traffic (~1 KB/s per match — negligible). WebRTC can be re-introduced as
 * a transparent upgrade later (open the WebRTC peer connection over the
 * same WS for signaling; swap transports if the data channel opens).
 *
 * Features preserved from the WebRTC implementation:
 * - Heartbeat keepalive (app-level, in addition to WS-level ping/pong).
 * - Grace period after opponent dropout before declaring DC.
 * - Outgoing message buffer that flushes on reconnect.
 * - Exponential reconnect backoff (2s → 5s → 10s).
 */

import { create } from 'zustand';
import type { DataConnection } from 'peerjs';
import { debug } from '../config/debugConfig';
import { LocalWebSocketTransport, deriveRelayUrl } from './wsTransport';
import type { ArmySelection } from '../types/ChessTypes';

// ── Timing Constants ──

const PEER_CONNECT_TIMEOUT_MS = 25_000;

// Reconnect backoff: 2s → 5s → 10s
const RECONNECT_DELAYS = [2_000, 5_000, 10_000];
const MAX_RECONNECT_ATTEMPTS = RECONNECT_DELAYS.length;

// Grace period: how long to wait before declaring opponent gone
const DISCONNECT_GRACE_MS = 15_000;

// Heartbeat: app-level keepalive on top of WS-level ping/pong
const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_TIMEOUT_MS = 12_000;

// Message buffer: max messages queued during disconnect
const MAX_BUFFERED_MESSAGES = 200;

// ── Module-level state (survives store resets) ──

let reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let graceTimerId: ReturnType<typeof setTimeout> | null = null;
let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
let lastHeartbeatReceived = 0;
const messageBuffer: unknown[] = [];

// Active transport (kept outside the store to avoid serializing zustand on
// each WS event — the store only holds the structural cast for consumers).
let activeTransport: LocalWebSocketTransport | null = null;
// Last roomId used — needed by `attemptReconnect` to rejoin the same room.
let lastRoomId: string | null = null;

// ── Types ──

export type P2PConnectionState =
	| 'disconnected'
	| 'connecting'
	| 'waiting'
	| 'connected'
	| 'reconnecting'
	| 'grace_period'
	| 'error';

export interface PeerStore {
	myPeerId: string | null;
	remotePeerId: string | null;
	connection: DataConnection | null;
	connectionState: P2PConnectionState;
	isHost: boolean;
	error: string | null;
	reconnectCountdown: number;
	bufferedMessageCount: number;
	opponentArmy: ArmySelection | null;
	/**
	 * True once the P2P `init` envelope has been applied locally —
	 * - host: set after `initGameWithSeed` populates gameState and the
	 *   init message is sent.
	 * - client: set inside `case 'init'` after `setState` adopts the
	 *   host's gameState (flipped).
	 *
	 * Reset to false only on hard `disconnect()`; reconnect inside the
	 * grace period is implicitly handled by the host re-emitting `init`,
	 * which re-runs the case 'init' handler and re-sets the flag.
	 *
	 * Used by `MultiplayerGame.tsx` to gate render of the in-game
	 * coordinator. Without this gate the coordinator could mount with an
	 * empty (post-C5) or stale gameState before the host's authoritative
	 * state arrives, causing TD-15 payload-existence rejections.
	 */
	p2pInitApplied: boolean;

	setMyPeerId: (id: string | null) => void;
	setRemotePeerId: (id: string | null) => void;
	setConnection: (conn: DataConnection | null) => void;
	setConnectionState: (state: P2PConnectionState) => void;
	setIsHost: (isHost: boolean) => void;
	setError: (error: string | null) => void;
	setOpponentArmy: (army: ArmySelection | null) => void;
	setP2pInitApplied: (applied: boolean) => void;

	/** Generate a peerId for matchmaking without opening a transport yet.
	 *  Used by Quick Match — the room id is unknown until matchmaking pairs us. */
	prepareForMatchmaking: () => void;
	/** Manual host: opens a room named after our peerId; user shares the id. */
	host: () => Promise<void>;
	/** Manual join: opens the room named after the host's peerId. */
	join: (remoteId: string, isReconnect?: boolean) => Promise<void>;
	/** Quick Match join: opens the room emitted by matchmaking (matchId). */
	connectToRoom: (roomId: string) => Promise<void>;
	disconnect: () => void;
	send: (data: unknown) => void;
	handleHeartbeat: () => void;
}

// ── Helpers ──

function generatePeerId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clearAllTimers(): void {
	if (reconnectTimerId) { clearTimeout(reconnectTimerId); reconnectTimerId = null; }
	if (graceTimerId) { clearTimeout(graceTimerId); graceTimerId = null; }
	if (heartbeatIntervalId) { clearInterval(heartbeatIntervalId); heartbeatIntervalId = null; }
	reconnectAttempt = 0;
}

function flushBuffer(transport: LocalWebSocketTransport): void {
	let flushed = 0;
	while (messageBuffer.length > 0) {
		const msg = messageBuffer.shift();
		try {
			transport.send(msg);
			flushed++;
		} catch {
			break;
		}
	}
	if (flushed > 0) debug.log(`[PeerStore] Flushed ${flushed} buffered messages`);
}

function startHeartbeat(get: () => PeerStore, set: (state: Partial<PeerStore>) => void): void {
	if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
	lastHeartbeatReceived = Date.now();

	heartbeatIntervalId = setInterval(() => {
		const { connection, connectionState, isHost } = get();
		if (connectionState !== 'connected' || !connection) return;

		try { connection.send({ type: 'heartbeat', t: Date.now() }); }
		catch { /* socket closed mid-send — let reconnect handle it */ }

		const silenceMs = Date.now() - lastHeartbeatReceived;
		if (silenceMs > HEARTBEAT_TIMEOUT_MS) {
			debug.warn(`[PeerStore] No heartbeat for ${(silenceMs / 1000).toFixed(1)}s — connection may be dead`);
			if (isHost) {
				set({ connectionState: 'grace_period', reconnectCountdown: Math.ceil(DISCONNECT_GRACE_MS / 1000) });
				startGracePeriod(get, set);
			}
		}
	}, HEARTBEAT_INTERVAL_MS);
}

function startGracePeriod(get: () => PeerStore, set: (state: Partial<PeerStore>) => void): void {
	if (graceTimerId) clearTimeout(graceTimerId);

	const countdownInterval = setInterval(() => {
		const { connectionState, reconnectCountdown } = get();
		if (connectionState !== 'grace_period' && connectionState !== 'reconnecting') {
			clearInterval(countdownInterval);
			return;
		}
		const newCount = reconnectCountdown - 1;
		if (newCount <= 0) {
			clearInterval(countdownInterval);
			return;
		}
		set({ reconnectCountdown: newCount });
	}, 1000);

	graceTimerId = setTimeout(() => {
		clearInterval(countdownInterval);
		const { connectionState } = get();
		if (connectionState === 'grace_period' || connectionState === 'reconnecting') {
			debug.warn('[PeerStore] Grace period expired — opponent disconnected');
			set({
				connection: null,
				connectionState: 'disconnected',
				reconnectCountdown: 0,
				error: 'Opponent disconnected. The match has ended.',
			});
		}
	}, DISCONNECT_GRACE_MS);
}

function attemptReconnect(roomId: string, get: () => PeerStore, set: (state: Partial<PeerStore>) => void): void {
	if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
		debug.error(`[PeerStore] All ${MAX_RECONNECT_ATTEMPTS} reconnect attempts failed`);
		set({
			connectionState: 'disconnected',
			reconnectCountdown: 0,
			error: 'Connection lost. Could not reconnect after multiple attempts.',
		});
		return;
	}

	const delay = RECONNECT_DELAYS[reconnectAttempt] ?? 10_000;
	reconnectAttempt++;

	debug.warn(`[PeerStore] Reconnect attempt ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS} in ${delay / 1000}s…`);
	set({
		connectionState: 'reconnecting',
		reconnectCountdown: Math.ceil(DISCONNECT_GRACE_MS / 1000),
		error: null,
	});

	startGracePeriod(get, set);

	reconnectTimerId = setTimeout(() => {
		reconnectTimerId = null;
		const currentState = get();
		if (currentState.connectionState !== 'reconnecting' || currentState.connection) return;

		get().connectToRoom(roomId).then(() => {
			if (graceTimerId) { clearTimeout(graceTimerId); graceTimerId = null; }
			reconnectAttempt = 0;
			set({ reconnectCountdown: 0 });
		}).catch(() => {
			attemptReconnect(roomId, get, set);
		});
	}, delay);
}

/**
 * Open the WS transport against a roomId and wire up its lifecycle to the
 * store. Shared by `host()`, `join()`, `connectToRoom()`. Resolves once the
 * server confirms `__sys event=open` (i.e. the room is full / both peers
 * present); rejects on timeout or transport error before then.
 */
function openTransport(
	roomId: string,
	peerId: string,
	get: () => PeerStore,
	set: (state: Partial<PeerStore>) => void,
): Promise<void> {
	// Close any previous transport before opening a new one — protects against
	// stale connections after a reconnect or a quick-match retry.
	if (activeTransport) {
		try { activeTransport.close(); } catch { /* already closed */ }
		activeTransport = null;
	}

	lastRoomId = roomId;
	const transport = new LocalWebSocketTransport({
		url: deriveRelayUrl(),
		roomId,
		peerId,
	});
	activeTransport = transport;

	return new Promise<void>((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			debug.error(`[PeerStore] TIMEOUT (${PEER_CONNECT_TIMEOUT_MS}ms) waiting for peer in room=${roomId.slice(0, 16)}…`);
			try { transport.close(); } catch { /* ignored */ }
			set({ error: 'Connection timeout — opponent did not arrive', connectionState: 'error' });
			reject(new Error('Connect timeout'));
		}, PEER_CONNECT_TIMEOUT_MS);

		transport.on('open', (...args: unknown[]) => {
			clearTimeout(timeoutId);
			const payload = (args[0] ?? {}) as { isHost?: boolean; remotePeerId?: string };
			reconnectAttempt = 0;
			if (graceTimerId) { clearTimeout(graceTimerId); graceTimerId = null; }
			set({
				connection: transport as unknown as DataConnection,
				connectionState: 'connected',
				isHost: !!payload.isHost,
				remotePeerId: payload.remotePeerId ?? null,
				reconnectCountdown: 0,
				error: null,
			});
			flushBuffer(transport);
			startHeartbeat(get, set);
			debug.log(`[PeerStore] connected via WS relay — isHost=${!!payload.isHost} remotePeerId=${(payload.remotePeerId ?? '').slice(0, 8)}…`);
			resolve();
		});

		transport.on('close', () => {
			const { connectionState } = get();
			if (connectionState === 'connected') {
				debug.warn('[PeerStore] transport closed — entering grace period');
				set({
					connection: null,
					connectionState: 'grace_period',
					reconnectCountdown: Math.ceil(DISCONNECT_GRACE_MS / 1000),
				});
				if (lastRoomId) attemptReconnect(lastRoomId, get, set);
				else startGracePeriod(get, set);
			} else if (connectionState === 'connecting' || connectionState === 'waiting') {
				clearTimeout(timeoutId);
				set({ connection: null, connectionState: 'disconnected' });
				reject(new Error('Connection closed before opening'));
			}
		});

		transport.on('error', (...args: unknown[]) => {
			const err = (args[0] instanceof Error) ? args[0] : new Error('Transport error');
			debug.error('[PeerStore] transport error:', err.message);
			const { connectionState } = get();
			if (connectionState === 'connecting' || connectionState === 'waiting') {
				clearTimeout(timeoutId);
				set({ error: err.message, connectionState: 'error' });
				reject(err);
			} else {
				set({ error: err.message });
			}
		});

		transport.connect();
	});
}

// ── Store ──

export const usePeerStore = create<PeerStore>((set, get) => ({
	myPeerId: null,
	remotePeerId: null,
	connection: null,
	connectionState: 'disconnected',
	isHost: false,
	error: null,
	reconnectCountdown: 0,
	bufferedMessageCount: 0,
	opponentArmy: null,
	p2pInitApplied: false,

	setMyPeerId: (id) => set({ myPeerId: id }),
	setRemotePeerId: (id) => set({ remotePeerId: id }),
	setConnection: (conn) => set({ connection: conn }),
	setConnectionState: (state) => set({ connectionState: state }),
	setIsHost: (isHost) => set({ isHost }),
	setError: (error) => set({ error }),
	setOpponentArmy: (army) => set({ opponentArmy: army }),
	setP2pInitApplied: (applied) => set({ p2pInitApplied: applied }),

	handleHeartbeat: () => {
		lastHeartbeatReceived = Date.now();
		const { connectionState } = get();
		if (connectionState === 'grace_period') {
			if (graceTimerId) { clearTimeout(graceTimerId); graceTimerId = null; }
			set({ connectionState: 'connected', reconnectCountdown: 0, error: null });
			debug.log('[PeerStore] Heartbeat received during grace period — connection restored');
		}
	},

	prepareForMatchmaking: () => {
		const { myPeerId } = get();
		if (myPeerId) return;
		const newId = generatePeerId();
		set({ myPeerId: newId, connectionState: 'disconnected', error: null });
		debug.log(`[PeerStore] prepared peerId=${newId.slice(0, 8)}… (no transport yet)`);
	},

	host: async () => {
		const { connection } = get();
		if (connection) get().disconnect();

		clearAllTimers();
		messageBuffer.length = 0;

		const peerId = generatePeerId();
		set({
			myPeerId: peerId,
			remotePeerId: null,
			connectionState: 'waiting',
			isHost: true,
			error: null,
			opponentArmy: null,
		});

		debug.log(`[PeerStore][host] opening room=${peerId.slice(0, 8)}…`);
		try {
			await openTransport(peerId, peerId, get, set);
		} catch (err) {
			throw err instanceof Error ? err : new Error(String(err));
		}
	},

	join: async (remoteId: string, isReconnect = false) => {
		const { connection } = get();
		if (connection) get().disconnect();

		messageBuffer.length = 0;

		const peerId = get().myPeerId ?? generatePeerId();
		set({
			myPeerId: peerId,
			remotePeerId: remoteId,
			connectionState: isReconnect ? 'reconnecting' : 'connecting',
			isHost: false,
			error: null,
			opponentArmy: null,
		});

		debug.log(`[PeerStore][join] joining room=${remoteId.slice(0, 8)}… as peer=${peerId.slice(0, 8)}…`);
		await openTransport(remoteId, peerId, get, set);
	},

	connectToRoom: async (roomId: string) => {
		const { connection } = get();
		if (connection) {
			try { (connection as unknown as { close: () => void }).close(); } catch { /* ignored */ }
		}

		messageBuffer.length = 0;

		const peerId = get().myPeerId ?? generatePeerId();
		set({
			myPeerId: peerId,
			connectionState: 'connecting',
			error: null,
			opponentArmy: null,
		});

		debug.log(`[PeerStore][connectToRoom] room=${roomId.slice(0, 16)}… peer=${peerId.slice(0, 8)}…`);
		await openTransport(roomId, peerId, get, set);
	},

	disconnect: () => {
		clearAllTimers();
		messageBuffer.length = 0;
		if (activeTransport) {
			try { activeTransport.close(); } catch { /* already closed */ }
			activeTransport = null;
		}
		lastRoomId = null;
		set({
			myPeerId: null, remotePeerId: null, connection: null,
			connectionState: 'disconnected', isHost: false, error: null,
			reconnectCountdown: 0, bufferedMessageCount: 0,
			opponentArmy: null,
			p2pInitApplied: false,
		});
	},

	send: (data: unknown) => {
		const { connection, connectionState } = get();

		if (connection && connectionState === 'connected') {
			try {
				connection.send(data);
			} catch (err) {
				debug.error('[PeerStore] Send failed, buffering:', err);
				if (messageBuffer.length < MAX_BUFFERED_MESSAGES) {
					messageBuffer.push(data);
					set({ bufferedMessageCount: messageBuffer.length });
				}
			}
			return;
		}

		if (connectionState === 'reconnecting' || connectionState === 'grace_period') {
			if (messageBuffer.length < MAX_BUFFERED_MESSAGES) {
				messageBuffer.push(data);
				set({ bufferedMessageCount: messageBuffer.length });
				debug.log(`[PeerStore] Buffered message (${messageBuffer.length}/${MAX_BUFFERED_MESSAGES})`);
			} else {
				debug.warn('[PeerStore] Message buffer full — dropping oldest');
				messageBuffer.shift();
				messageBuffer.push(data);
			}
			return;
		}

		debug.warn('[PeerStore] Cannot send — not connected');
	},
}));

// Expose on globalThis so combat controller can access P2P state without circular imports
(globalThis as Record<string, unknown>).__ragnarokPeerStore = usePeerStore;

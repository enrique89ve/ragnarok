/**
 * peerStore.ts — P2P connection with production-grade resilience
 *
 * Features:
 * - STUN/TURN for cross-continent NAT traversal
 * - Exponential backoff reconnection (3 attempts: 2s, 5s, 10s)
 * - Message buffer: queues outgoing messages during disconnect, replays on reconnect
 * - Grace period: 15s window before declaring opponent disconnected
 * - Heartbeat keepalive: detects dead connections before PeerJS close event
 */

import { create } from 'zustand';
import Peer, { DataConnection } from 'peerjs';
import { debug } from '../config/debugConfig';

// ── Timing Constants ──

const PEER_CONNECT_TIMEOUT_MS = 25_000;
const PEER_RETRY_DELAY_MS = 3_000;
const MAX_JOIN_RETRIES = 2;

// Reconnect backoff: 2s → 5s → 10s
const RECONNECT_DELAYS = [2_000, 5_000, 10_000];
const MAX_RECONNECT_ATTEMPTS = RECONNECT_DELAYS.length;

// Grace period: how long to wait before declaring opponent gone
const DISCONNECT_GRACE_MS = 15_000;

// Heartbeat: detect dead connections (PeerJS close event can be delayed)
const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_TIMEOUT_MS = 12_000;

// Message buffer: max messages queued during disconnect
const MAX_BUFFERED_MESSAGES = 200;

// ── ICE Servers ──

// eslint-disable-next-line no-undef
const ICE_SERVERS: RTCIceServer[] = [
	{ urls: 'stun:stun.l.google.com:19302' },
	{ urls: 'stun:stun1.l.google.com:19302' },
	{ urls: 'stun:stun2.l.google.com:19302' },
	{ urls: 'stun:stun3.l.google.com:19302' },
	{ urls: 'stun:stun4.l.google.com:19302' },
	{ urls: 'stun:stun.stunprotocol.org:3478' },
	{ urls: 'stun:stun.nextcloud.com:443' },
	{
		urls: ['turn:a.relay.metered.ca:80', 'turn:a.relay.metered.ca:80?transport=tcp', 'turn:a.relay.metered.ca:443', 'turns:a.relay.metered.ca:443'],
		username: 'open',
		credential: 'open',
	},
];

const PEER_CONFIG = {
	host: '0.peerjs.com',
	port: 443,
	path: '/',
	secure: true,
	config: { iceServers: ICE_SERVERS },
	debug: 0,
};

// ── Module-level state (survives store resets) ──

let reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let graceTimerId: ReturnType<typeof setTimeout> | null = null;
let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
let lastHeartbeatReceived = 0;
const messageBuffer: unknown[] = [];

// ── Types ──

export type P2PConnectionState =
	| 'disconnected'
	| 'connecting'
	| 'waiting'
	| 'connected'
	| 'reconnecting'  // actively trying to restore connection
	| 'grace_period'  // opponent dropped, waiting before declaring DC
	| 'error';

export interface PeerStore {
	myPeerId: string | null;
	remotePeerId: string | null;
	connection: DataConnection | null;
	peer: Peer | null;
	connectionState: P2PConnectionState;
	isHost: boolean;
	error: string | null;
	reconnectCountdown: number; // seconds remaining in grace period (for UI)
	bufferedMessageCount: number;

	setMyPeerId: (id: string | null) => void;
	setRemotePeerId: (id: string | null) => void;
	setConnection: (conn: DataConnection | null) => void;
	setPeer: (peer: Peer | null) => void;
	setConnectionState: (state: P2PConnectionState) => void;
	setIsHost: (isHost: boolean) => void;
	setError: (error: string | null) => void;

	host: () => Promise<void>;
	join: (remoteId: string, isReconnect?: boolean, _retryCount?: number) => Promise<void>;
	disconnect: () => void;
	send: (data: unknown) => void;
	handleHeartbeat: () => void;
}

// ── Helpers ──

function clearAllTimers() {
	if (reconnectTimerId) { clearTimeout(reconnectTimerId); reconnectTimerId = null; }
	if (graceTimerId) { clearTimeout(graceTimerId); graceTimerId = null; }
	if (heartbeatIntervalId) { clearInterval(heartbeatIntervalId); heartbeatIntervalId = null; }
	reconnectAttempt = 0;
}

function flushBuffer(conn: DataConnection) {
	let flushed = 0;
	while (messageBuffer.length > 0) {
		const msg = messageBuffer.shift();
		try {
			conn.send(msg);
			flushed++;
		} catch {
			break;
		}
	}
	if (flushed > 0) {
		debug.log(`[PeerStore] Flushed ${flushed} buffered messages`);
	}
}

function startHeartbeat(get: () => PeerStore, set: (state: Partial<PeerStore>) => void) {
	if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
	lastHeartbeatReceived = Date.now();

	heartbeatIntervalId = setInterval(() => {
		const { connection, connectionState, isHost } = get();
		if (connectionState !== 'connected' || !connection) return;

		// Send keepalive ping
		try {
			connection.send({ type: 'heartbeat', t: Date.now() });
		} catch { /* ignore send errors here */ }

		// Check if we've heard from opponent recently
		const silenceMs = Date.now() - lastHeartbeatReceived;
		if (silenceMs > HEARTBEAT_TIMEOUT_MS) {
			debug.warn(`[PeerStore] No heartbeat for ${(silenceMs / 1000).toFixed(1)}s — connection may be dead`);
			// Don't immediately disconnect — enter grace period
			if (isHost) {
				// Host: enter grace period, wait for opponent to reconnect
				set({ connectionState: 'grace_period', reconnectCountdown: Math.ceil(DISCONNECT_GRACE_MS / 1000) });
				startGracePeriod(get, set);
			}
		}
	}, HEARTBEAT_INTERVAL_MS);
}

function startGracePeriod(get: () => PeerStore, set: (state: Partial<PeerStore>) => void) {
	if (graceTimerId) clearTimeout(graceTimerId);

	// Countdown timer for UI
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

function attemptReconnect(remoteId: string, get: () => PeerStore, set: (state: Partial<PeerStore>) => void) {
	if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
		debug.error(`[PeerStore] All ${MAX_RECONNECT_ATTEMPTS} reconnect attempts failed`);
		set({
			connectionState: 'disconnected',
			reconnectCountdown: 0,
			error: 'Connection lost. Could not reconnect after multiple attempts.',
		});
		return;
	}

	const delay = RECONNECT_DELAYS[reconnectAttempt] || 10_000;
	reconnectAttempt++;

	debug.warn(`[PeerStore] Reconnect attempt ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS} in ${delay / 1000}s...`);
	set({
		connectionState: 'reconnecting',
		reconnectCountdown: Math.ceil(DISCONNECT_GRACE_MS / 1000),
		error: null,
	});

	// Start grace period countdown in parallel
	startGracePeriod(get, set);

	reconnectTimerId = setTimeout(() => {
		reconnectTimerId = null;
		const currentState = get();
		if (currentState.connectionState !== 'reconnecting' || currentState.connection) return;

		get().join(remoteId, true).then(() => {
			// Reconnected — clear grace period
			if (graceTimerId) { clearTimeout(graceTimerId); graceTimerId = null; }
			reconnectAttempt = 0;
			set({ reconnectCountdown: 0 });
		}).catch(() => {
			// Try again with next backoff level
			attemptReconnect(remoteId, get, set);
		});
	}, delay);
}

// ── Store ──

export const usePeerStore = create<PeerStore>((set, get) => ({
	myPeerId: null,
	remotePeerId: null,
	connection: null,
	peer: null,
	connectionState: 'disconnected',
	isHost: false,
	error: null,
	reconnectCountdown: 0,
	bufferedMessageCount: 0,

	setMyPeerId: (id) => set({ myPeerId: id }),
	setRemotePeerId: (id) => set({ remotePeerId: id }),
	setConnection: (conn) => set({ connection: conn }),
	setPeer: (peer) => set({ peer }),
	setConnectionState: (state) => set({ connectionState: state }),
	setIsHost: (isHost) => set({ isHost }),
	setError: (error) => set({ error }),

	handleHeartbeat: () => {
		lastHeartbeatReceived = Date.now();
		// If we were in grace period and got a heartbeat, connection is alive
		const { connectionState } = get();
		if (connectionState === 'grace_period') {
			if (graceTimerId) { clearTimeout(graceTimerId); graceTimerId = null; }
			set({ connectionState: 'connected', reconnectCountdown: 0, error: null });
			debug.log('[PeerStore] Heartbeat received during grace period — connection restored');
		}
	},

	host: async () => {
		const { peer, disconnect } = get();
		if (peer) disconnect();

		set({ connectionState: 'connecting', isHost: true, error: null });
		clearAllTimers();
		messageBuffer.length = 0;

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				newPeer.destroy();
				set({ error: 'Connection timeout — check your internet connection', connectionState: 'error' });
				reject(new Error('Peer connection timeout'));
			}, PEER_CONNECT_TIMEOUT_MS);

			const newPeer = new Peer(PEER_CONFIG);

			newPeer.on('open', (id) => {
				clearTimeout(timeoutId);
				set({ myPeerId: id, peer: newPeer, connectionState: 'waiting' });
				resolve();
			});

			newPeer.on('error', (err) => {
				clearTimeout(timeoutId);
				set({ error: err.message || 'Failed to create peer', connectionState: 'error' });
				reject(err);
			});

			newPeer.on('connection', (conn) => {
				conn.on('open', () => {
					reconnectAttempt = 0;
					if (graceTimerId) { clearTimeout(graceTimerId); graceTimerId = null; }
					set({ connection: conn, connectionState: 'connected', remotePeerId: conn.peer, reconnectCountdown: 0, error: null });
					flushBuffer(conn);
					startHeartbeat(get, set);
					debug.log(`[PeerStore] Host: opponent connected (${conn.peer})`);
				});

				conn.on('error', (err) => {
					if (!get().peer) return;
					set({ error: err.message || 'Connection error', connectionState: 'error' });
				});

				conn.on('close', () => {
					if (!get().peer) return;
					debug.warn('[PeerStore] Host: opponent connection closed — entering grace period');
					set({ connection: null, connectionState: 'grace_period', reconnectCountdown: Math.ceil(DISCONNECT_GRACE_MS / 1000) });
					startGracePeriod(get, set);
				});
			});
		});
	},

	join: async (remoteId: string, isReconnect = false, _retryCount = 0) => {
		const { peer, disconnect } = get();
		if (peer) disconnect();

		set({ connectionState: isReconnect ? 'reconnecting' : 'connecting', isHost: false, remotePeerId: remoteId, error: null });

		return new Promise<void>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				newPeer.destroy();
				if (_retryCount < MAX_JOIN_RETRIES) {
					debug.warn(`[PeerStore] Attempt ${_retryCount + 1} timed out — retrying...`);
					set({ error: null, connectionState: 'connecting' });
					setTimeout(() => {
						get().join(remoteId, isReconnect, _retryCount + 1).then(resolve).catch(reject);
					}, PEER_RETRY_DELAY_MS);
					return;
				}
				set({ error: 'Connection failed. Try sharing game code directly.', connectionState: 'error' });
				reject(new Error('Connection failed'));
			}, PEER_CONNECT_TIMEOUT_MS);

			const newPeer = new Peer(PEER_CONFIG);

			newPeer.on('open', (id) => {
				set({ myPeerId: id, peer: newPeer });

				const conn = newPeer.connect(remoteId, { reliable: true });

				conn.on('open', () => {
					clearTimeout(timeoutId);
					reconnectAttempt = 0;
					if (graceTimerId) { clearTimeout(graceTimerId); graceTimerId = null; }
					set({ connection: conn, connectionState: 'connected', reconnectCountdown: 0, error: null });
					flushBuffer(conn);
					startHeartbeat(get, set);
					debug.log(`[PeerStore] Connected to ${remoteId}`);
					resolve();
				});

				conn.on('error', (err) => {
					clearTimeout(timeoutId);
					if (!get().peer) return;
					set({ error: err.message || 'Connection error', connectionState: 'error' });
					reject(err);
				});

				conn.on('close', () => {
					if (!get().peer) return;
					const { remotePeerId } = get();
					if (remotePeerId) {
						debug.warn('[PeerStore] Client: connection lost — attempting reconnect');
						attemptReconnect(remotePeerId, get, set);
					} else {
						set({ connection: null, connectionState: 'disconnected' });
					}
				});
			});

			newPeer.on('error', (err) => {
				clearTimeout(timeoutId);
				set({ error: err.message || 'Peer error', connectionState: 'error' });
				reject(err);
			});
		});
	},

	disconnect: () => {
		clearAllTimers();
		messageBuffer.length = 0;
		const { connection, peer } = get();
		if (connection) connection.close();
		if (peer) peer.destroy();
		set({
			myPeerId: null, remotePeerId: null, connection: null, peer: null,
			connectionState: 'disconnected', isHost: false, error: null,
			reconnectCountdown: 0, bufferedMessageCount: 0,
		});
	},

	send: (data: unknown) => {
		const { connection, connectionState } = get();

		// Connected: send immediately
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

		// Reconnecting or grace period: buffer the message for replay
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

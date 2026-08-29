/**
 * peerStore.ts — match transport selected by TransportManager.
 *
 * Replaces the previous PeerJS + WebRTC + STUN/TURN stack with a single
 * WebSocket connection to the game's own server (`/ws/p2p`). Same external
 * API (`host`, `join`, `send`, `disconnect`, `handleHeartbeat`) so
 * `useWireSync` keeps working unchanged. The `connection` exposed in the
 * store is structurally compatible with the subset of `P2PConnection` that
 * `useWireSync` consumes (events `data|open|close|error`, methods `send`/
 * `close`, props `peer`/`open`).
 *
 * Why WS instead of WebRTC: under WSL2 + Chrome the internal DNS resolver
 * fails on every STUN/TURN hostname (errorCode=701) and the public OpenRelay
 * TURN credentials were revoked (errorCode=400). With both srflx and relay
 * unavailable two same-machine peers behind WSL2 NAT couldn't negotiate.
 * Going through the server eliminates ICE/STUN/TURN/broker entirely; works
 * everywhere the HTTP server is reachable. Tradeoff: server sees all match
 * traffic (~1 KB/s per match — negligible). Native WebRTC is now an opt-in
 * initial-connect attempt; TransportManager falls back before gameplay opens.
 *
 * Features preserved from the WebRTC implementation:
 * - Heartbeat keepalive (app-level, in addition to WS-level ping/pong).
 * - 60s reconnect window after dropout before technical result.
 * - Outgoing message buffer that flushes on reconnect.
 * - Two automatic reconnect attempts within that window.
 */

import { create } from 'zustand';
import { debug } from '../config/debugConfig';
import { deriveControlUrl, deriveRelayUrl } from './wsTransport';
import {
	createTransportManager,
	type ManagedTransport,
} from '../p2p/transport/TransportManager';
import { loadP2PTransportConfig } from '../p2p/transport/transportConfigClient';
import { detectBrowserTransportCapabilities } from '../p2p/transport/transportCapabilities';
import { resolveTransportPlan } from '../p2p/transport/transportPolicy';
import { createTransportSession, type TransportSession } from '../p2p/transport/transportSession';
import { isSharedNetworkEnvironment } from '../config/featureFlags';
import { getAuthenticatedHiveUsername, subscribeHiveSessionIdentity } from '../../data/HiveSessionIdentity';
import type { ArmySelection } from '../types/ChessTypes';
import type { WireMessage } from '../p2p/messages';
import type { P2PBattleReadyProof } from '../p2p/battleReady';
import type { P2PConnectionAvailabilityState, P2PMatchTicket, ServerSignedChallenge } from '@shared/p2pAvailability';
import { useMatchmakingStore, type MatchmakingStatus } from './matchmakingStore';
export { isP2PConnectionStateBusy } from '@shared/p2pAvailability';

// ── Timing Constants ──

// Reconnect backoff: two attempts inside the 60s technical-forfeit window.
const RECONNECT_DELAYS = [2_000, 15_000];
const MAX_RECONNECT_ATTEMPTS = RECONNECT_DELAYS.length;

// Grace period: Axie-like technical result threshold.
const DISCONNECT_GRACE_MS = 60_000;

// Heartbeat: app-level keepalive on top of WS-level ping/pong
const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_TIMEOUT_MS = 12_000;

// Message buffer: max messages queued during disconnect
const MAX_BUFFERED_MESSAGES = 200;

// ── Module-level state (survives store resets) ──

let reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let graceTimerId: ReturnType<typeof setTimeout> | null = null;
let graceCountdownIntervalId: ReturnType<typeof setInterval> | null = null;
let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
let lastHeartbeatReceived = 0;
let reconnectDeadlineAt = 0;
const messageBuffer: WireMessage[] = [];

// Active transport (kept outside the store to avoid serializing zustand on
// each WS event — the store only holds the structural cast for consumers).
let activeTransport: ManagedTransport | null = null;
let activeTransportSession: TransportSession | null = null;
// Last roomId used — needed by `attemptReconnect` to rejoin the same room.
let lastRoomId: string | null = null;
let transportOpenGeneration = 0;

// ── Types ──

/**
 * Structural subset of the active wire connection that `useWireSync` and
 * `peerStore` consume. The legacy PeerJS `P2PConnection` import was
 * removed (Patch-WebRTC.3) — the WS transport (`LocalWebSocketTransport`
 * in `wsTransport.ts`) implements this surface natively, so the field
 * type is owned by us instead of by an external package whose runtime we
 * no longer depend on.
 */
export type P2PConnection = ManagedTransport;

export type P2PDisconnectSide = 'local' | 'opponent' | 'unknown';

export type P2PConnectionState = P2PConnectionAvailabilityState;

export type PeerStore = {
	myPeerId: string | null;
	remotePeerId: string | null;
	matchChallenge: ServerSignedChallenge | null;
	opponentMatchChallenge: ServerSignedChallenge | null;
	matchTicket: P2PMatchTicket | null;
	lastRoomId: string | null;
	connection: P2PConnection | null;
	connectionState: P2PConnectionState;
	isHost: boolean;
	error: string | null;
	reconnectCountdown: number;
	reconnectAttemptCount: number;
	disconnectSide: P2PDisconnectSide | null;
	forfeitSide: P2PDisconnectSide | null;
	bufferedMessageCount: number;
	opponentArmy: ArmySelection | null;
	p2pSessionLocalAuthorized: boolean;
	p2pSessionRemoteAuthorized: boolean;
	p2pSessionAuthError: string | null;
	p2pBattleReadyLocal: P2PBattleReadyProof | null;
	p2pBattleReadyRemote: P2PBattleReadyProof | null;
	p2pBattleReadyExpectedRemoteLoadoutHash: string | null;
	p2pBattleReadyError: string | null;
	/**
	 * True once cards handshake init has populated local gameState —
	 * both peers set this after `initGameFromHandshake` (seed + both
	 * `cards_deck` announces). Leftover host `init` adoption still sets
	 * it in legacy mode.
	 *
	 * Reset to false only on hard `disconnect()`. F5 resume restores it
	 * from the sealed snapshot without re-running seed exchange.
	 *
	 * Used by `MultiplayerGame.tsx` to gate render of the in-game
	 * coordinator so input cannot hit an empty/stale gameState (TD-15).
	 */
	p2pInitApplied: boolean;
	/**
	 * True after applying a local IndexedDB/session resume snapshot.
	 * useWireSync must not re-run commit-reveal or deck handshake init.
	 */
	hardReloadResume: boolean;

	setMyPeerId: (id: string | null) => void;
	setRemotePeerId: (id: string | null) => void;
	setConnection: (conn: P2PConnection | null) => void;
	setConnectionState: (state: P2PConnectionState) => void;
	setIsHost: (isHost: boolean) => void;
	setError: (error: string | null) => void;
	setOpponentArmy: (army: ArmySelection | null) => void;
	setP2pSessionAuthorization: (state: {
		readonly localAuthorized?: boolean;
		readonly remoteAuthorized?: boolean;
		readonly error?: string | null;
	}) => void;
	setP2pBattleReady: (state: {
		readonly local?: P2PBattleReadyProof | null;
		readonly remote?: P2PBattleReadyProof | null;
		readonly expectedRemoteLoadoutHash?: string | null;
		readonly error?: string | null;
	}) => void;
	clearP2pBattleReady: () => void;
	setMatchChallenges: (matchChallenge: ServerSignedChallenge | null, opponentMatchChallenge: ServerSignedChallenge | null) => void;
	setMatchTicket: (ticket: P2PMatchTicket | null) => void;
	clearMatchChallenges: () => void;
	setP2pInitApplied: (applied: boolean) => void;
	setHardReloadResume: (value: boolean) => void;
	/** Rejoin a persisted room with the existing 2-attempt / 60s window. */
	rejoinPersistedRoom: (roomId: string) => void;

	/** Generate a peerId for matchmaking without opening a transport yet.
	 *  Used by Quick Match — the room id is unknown until matchmaking pairs us. */
	prepareForMatchmaking: () => void;
	/** Manual host: opens a room named after our peerId; user shares the id. */
	host: () => Promise<void>;
	/** Manual join: opens the room named after the host's peerId. */
	join: (remoteId: string, isReconnect?: boolean) => Promise<void>;
	/** Quick Match join: opens the room emitted by matchmaking (matchId). */
	connectToRoom: (roomId: string, isReconnect?: boolean) => Promise<void>;
	disconnect: () => void;
	send: (data: WireMessage) => void;
	handleHeartbeat: () => void;
};

type PeerRuntimeState = Pick<
	PeerStore,
	| 'myPeerId'
	| 'remotePeerId'
	| 'matchChallenge'
	| 'opponentMatchChallenge'
	| 'matchTicket'
	| 'connection'
	| 'connectionState'
	| 'bufferedMessageCount'
	| 'opponentArmy'
	| 'p2pSessionLocalAuthorized'
	| 'p2pSessionRemoteAuthorized'
	| 'p2pSessionAuthError'
	| 'p2pBattleReadyLocal'
	| 'p2pBattleReadyRemote'
	| 'p2pBattleReadyExpectedRemoteLoadoutHash'
	| 'p2pBattleReadyError'
	| 'p2pInitApplied'
>;

type MatchmakingRuntimeState = {
	readonly status: MatchmakingStatus;
	readonly queueToken: string | null;
	readonly roomId: string | null;
	readonly opponentPeerId: string | null;
};

type HiveSessionChangeRuntimeState = {
	readonly peer: PeerRuntimeState;
	readonly matchmaking: MatchmakingRuntimeState;
};

export function hasVolatileP2PRuntimeState(state: HiveSessionChangeRuntimeState): boolean {
	return [
		state.peer.myPeerId,
		state.peer.remotePeerId,
		state.peer.matchChallenge,
		state.peer.opponentMatchChallenge,
		state.peer.matchTicket,
		state.peer.connection,
		state.peer.connectionState !== 'disconnected',
		state.peer.bufferedMessageCount > 0,
		state.peer.opponentArmy,
		state.peer.p2pSessionLocalAuthorized,
		state.peer.p2pSessionRemoteAuthorized,
		state.peer.p2pSessionAuthError,
		state.peer.p2pBattleReadyLocal,
		state.peer.p2pBattleReadyRemote,
		state.peer.p2pBattleReadyExpectedRemoteLoadoutHash,
		state.peer.p2pBattleReadyError,
		state.peer.p2pInitApplied,
		state.matchmaking.status !== 'idle',
		state.matchmaking.queueToken,
		state.matchmaking.roomId,
		state.matchmaking.opponentPeerId,
	].some(Boolean);
}

export function shouldClearP2PRuntimeForHiveSessionChange(input: {
	readonly previousAuthenticatedHiveUsername: string | null;
	readonly nextAuthenticatedHiveUsername: string | null;
	readonly runtimeState: HiveSessionChangeRuntimeState;
}): boolean {
	if (input.previousAuthenticatedHiveUsername === null) return false;
	if (input.previousAuthenticatedHiveUsername === input.nextAuthenticatedHiveUsername) return false;
	return hasVolatileP2PRuntimeState(input.runtimeState);
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
	if (graceCountdownIntervalId) { clearInterval(graceCountdownIntervalId); graceCountdownIntervalId = null; }
	if (heartbeatIntervalId) { clearInterval(heartbeatIntervalId); heartbeatIntervalId = null; }
	reconnectAttempt = 0;
	reconnectDeadlineAt = 0;
}

function clearReconnectWindow(): void {
	if (reconnectTimerId) { clearTimeout(reconnectTimerId); reconnectTimerId = null; }
	if (graceTimerId) { clearTimeout(graceTimerId); graceTimerId = null; }
	if (graceCountdownIntervalId) { clearInterval(graceCountdownIntervalId); graceCountdownIntervalId = null; }
	reconnectAttempt = 0;
	reconnectDeadlineAt = 0;
}

function parseDisconnectSide(value: unknown): P2PDisconnectSide {
	return value === 'local' || value === 'opponent' ? value : 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOpenPayload(value: unknown): { readonly isHost: boolean; readonly remotePeerId: string | null } {
	if (!isRecord(value)) return { isHost: false, remotePeerId: null };
	return {
		isHost: value.isHost === true,
		remotePeerId: typeof value.remotePeerId === 'string' ? value.remotePeerId : null,
	};
}

function mergeDisconnectSide(current: P2PDisconnectSide | null, next: P2PDisconnectSide): P2PDisconnectSide {
	if (current === 'local' || next === 'local') return 'local';
	if (current === 'opponent' || next === 'opponent') return 'opponent';
	return 'unknown';
}

function getReconnectCountdownSeconds(): number {
	if (reconnectDeadlineAt <= 0) return Math.ceil(DISCONNECT_GRACE_MS / 1000);
	return Math.max(0, Math.ceil((reconnectDeadlineAt - Date.now()) / 1000));
}

function getForfeitMessage(side: P2PDisconnectSide): string {
	if (side === 'opponent') return 'Opponent failed to reconnect after 60 seconds. Technical victory.';
	return 'Connection lost for 60 seconds. Technical defeat.';
}

function getTransportSession(roomId: string, preserveSession: boolean): TransportSession {
	const currentSession = activeTransportSession?.getSnapshot();
	if (!preserveSession || !currentSession || currentSession.matchId !== roomId) {
		activeTransportSession = createTransportSession(roomId);
	}
	if (!activeTransportSession) throw new Error('P2P transport session was not initialized');
	return activeTransportSession;
}

function resolveReconnectForfeit(get: () => PeerStore, set: (state: Partial<PeerStore>) => void): void {
	const side = get().disconnectSide ?? 'unknown';
	const attemptsUsed = reconnectAttempt;
	if (activeTransport) {
		try { activeTransport.close(); } catch { /* already closed */ }
		activeTransport = null;
	}
	clearReconnectWindow();
	debug.warn(`[PeerStore] Reconnect window expired — technical result side=${side}`);
	set({
		connection: null,
		connectionState: 'disconnected',
		reconnectCountdown: 0,
		reconnectAttemptCount: attemptsUsed,
		error: getForfeitMessage(side),
		forfeitSide: side,
	});
}

function trySendBufferedMessage(transport: ManagedTransport, msg: WireMessage): boolean {
	try {
		transport.send(msg);
		return true;
	} catch {
		return false;
	}
}

function flushBuffer(transport: ManagedTransport): void {
	const pendingMessages = messageBuffer.splice(0, messageBuffer.length);
	let flushed = 0;
	const failedIndex = pendingMessages.findIndex((msg) => {
		if (!trySendBufferedMessage(transport, msg)) return true;
		flushed++;
		return false;
	});
	if (failedIndex !== -1) messageBuffer.unshift(...pendingMessages.slice(failedIndex));
	if (flushed > 0) debug.log(`[PeerStore] Flushed ${flushed} buffered messages`);
}

function startHeartbeat(get: () => PeerStore, set: (state: Partial<PeerStore>) => void): void {
	if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
	lastHeartbeatReceived = Date.now();

	heartbeatIntervalId = setInterval(() => {
		const { connection, connectionState } = get();
		if (connectionState !== 'connected' || !connection) return;

		try { connection.send({ type: 'heartbeat', t: Date.now() }); }
		catch { /* socket closed mid-send — let reconnect handle it */ }

		const silenceMs = Date.now() - lastHeartbeatReceived;
		if (silenceMs > HEARTBEAT_TIMEOUT_MS) {
			debug.warn(`[PeerStore] No heartbeat for ${(silenceMs / 1000).toFixed(1)}s — connection may be dead`);
			try { activeTransport?.close(); } catch { /* already closed */ }
			activeTransport = null;
			set({
				connection: null,
				connectionState: 'grace_period',
				disconnectSide: mergeDisconnectSide(get().disconnectSide, 'unknown'),
				forfeitSide: null,
				reconnectCountdown: getReconnectCountdownSeconds(),
			});
			startGracePeriod('unknown', get, set);
			if (lastRoomId) attemptReconnect(lastRoomId, get, set);
		}
	}, HEARTBEAT_INTERVAL_MS);
}

function startGracePeriod(side: P2PDisconnectSide, get: () => PeerStore, set: (state: Partial<PeerStore>) => void): void {
	if (reconnectDeadlineAt <= 0) {
		reconnectDeadlineAt = Date.now() + DISCONNECT_GRACE_MS;
	}

	const mergedSide = mergeDisconnectSide(get().disconnectSide, side);
	set({
		disconnectSide: mergedSide,
		forfeitSide: null,
		reconnectCountdown: getReconnectCountdownSeconds(),
	});

	if (!graceCountdownIntervalId) {
		graceCountdownIntervalId = setInterval(() => {
			const remaining = getReconnectCountdownSeconds();
			const { connectionState } = get();
			if (connectionState !== 'grace_period' && connectionState !== 'reconnecting') {
				if (graceCountdownIntervalId) {
					clearInterval(graceCountdownIntervalId);
					graceCountdownIntervalId = null;
				}
				return;
			}
			set({ reconnectCountdown: remaining });
			if (remaining <= 0 && graceCountdownIntervalId) {
				clearInterval(graceCountdownIntervalId);
				graceCountdownIntervalId = null;
			}
		}, 1000);
	}

	if (graceTimerId) return;
	graceTimerId = setTimeout(() => {
		const { connectionState } = get();
		if (connectionState === 'grace_period' || connectionState === 'reconnecting') {
			resolveReconnectForfeit(get, set);
		}
	}, DISCONNECT_GRACE_MS);
}

function attemptReconnect(roomId: string, get: () => PeerStore, set: (state: Partial<PeerStore>) => void): void {
	if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
		const remaining = getReconnectCountdownSeconds();
		if (remaining <= 0) {
			resolveReconnectForfeit(get, set);
			return;
		}
		debug.error(`[PeerStore] All ${MAX_RECONNECT_ATTEMPTS} reconnect attempts used; waiting for reconnect window expiry`);
		set({
			connectionState: 'reconnecting',
			reconnectCountdown: remaining,
			reconnectAttemptCount: reconnectAttempt,
			error: `Reconnect attempts used. Technical result in ${remaining}s if the connection does not return.`,
		});
		return;
	}

	const delay = RECONNECT_DELAYS[reconnectAttempt] ?? 10_000;
	reconnectAttempt++;

	debug.warn(`[PeerStore] Reconnect attempt ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS} in ${delay / 1000}s…`);
	set({
		connectionState: 'reconnecting',
		reconnectCountdown: getReconnectCountdownSeconds(),
		reconnectAttemptCount: reconnectAttempt,
		error: null,
	});

	startGracePeriod(get().disconnectSide ?? 'unknown', get, set);

	reconnectTimerId = setTimeout(() => {
		reconnectTimerId = null;
		const currentState = get();
		if (currentState.connectionState !== 'reconnecting' || currentState.connection) return;
		if (getReconnectCountdownSeconds() <= 0) {
			resolveReconnectForfeit(get, set);
			return;
		}

		get().connectToRoom(roomId, true).then(() => {
			clearReconnectWindow();
			set({
				reconnectCountdown: 0,
				reconnectAttemptCount: 0,
				disconnectSide: null,
				forfeitSide: null,
				bufferedMessageCount: messageBuffer.length,
			});
		}).catch(() => {
			attemptReconnect(roomId, get, set);
		});
	}, delay);
}

/**
 * Open the selected transport against a roomId and wire up its lifecycle to
 * the store. Shared by `host()`, `join()`, `connectToRoom()`. Resolves once
 * the selected transport is connected and the room is full / both peers are
 * present; rejects on timeout or transport error before then.
 */
async function openTransport(
	roomId: string,
	peerId: string,
	get: () => PeerStore,
	set: (state: Partial<PeerStore>) => void,
	preserveSession: boolean,
): Promise<void> {
	const openGeneration = ++transportOpenGeneration;
	// Close any previous transport before opening a new one — protects against
	// stale connections after a reconnect or a quick-match retry.
	if (activeTransport) {
		try { activeTransport.close(); } catch { /* already closed */ }
		activeTransport = null;
	}

	lastRoomId = roomId;
	set({ lastRoomId: roomId });
	const config = await loadP2PTransportConfig();
	if (openGeneration !== transportOpenGeneration || lastRoomId !== roomId) {
		throw new Error('Stale P2P transport open attempt');
	}
	const session = getTransportSession(roomId, preserveSession);
	const capabilities = detectBrowserTransportCapabilities(config.iceServers);
	const plan = resolveTransportPlan({
		webrtcEnabled: config.webrtcEnabled,
		relayEnabled: config.relayEnabled,
		capabilities,
		timeouts: config.timeouts,
		sharedNetwork: isSharedNetworkEnvironment(),
		matchRole: get().matchTicket?.role ?? null,
		relayLocked: session.getSnapshot().relayLocked,
	});
	const transport = createTransportManager({
		relayUrl: deriveRelayUrl(),
		controlUrl: deriveControlUrl(),
		roomId,
		peerId,
		matchTicket: get().matchTicket,
		isHostHint: get().isHost,
		plan,
		session,
		iceServers: config.iceServers,
	});
	activeTransport = transport;

	return new Promise<void>((resolve, reject) => {
		let settled = false;
		const isActiveAttempt = (): boolean => (
			openGeneration === transportOpenGeneration
			&& lastRoomId === roomId
			&& activeTransport === transport
		);
		const rejectStaleAttempt = (): void => {
			try { transport.close(); } catch { /* already closed */ }
			if (!settled) {
				settled = true;
				reject(new Error('Stale P2P transport event ignored'));
			}
		};
		const resolveConnection = (): void => {
			if (settled) return;
			settled = true;
			resolve();
		};
		const rejectConnection = (error: Error): void => {
			if (settled) return;
			settled = true;
			reject(error);
		};

		transport.on('open', (...args: unknown[]) => {
			if (settled) return;
			if (!isActiveAttempt()) {
				rejectStaleAttempt();
				return;
			}
			const payload = readOpenPayload(args[0]);
			clearReconnectWindow();
			set({
				connection: transport,
				connectionState: 'connected',
				isHost: payload.isHost,
				remotePeerId: payload.remotePeerId,
				reconnectCountdown: 0,
				reconnectAttemptCount: 0,
				disconnectSide: null,
				forfeitSide: null,
				error: null,
			});
			flushBuffer(transport);
			set({ bufferedMessageCount: messageBuffer.length });
			startHeartbeat(get, set);
			debug.log(`[PeerStore] connected via ${transport.kind} — isHost=${payload.isHost} remotePeerId=${(payload.remotePeerId ?? '').slice(0, 8)}…`);
			resolveConnection();
		});

		transport.on('close', (...args: unknown[]) => {
			if (!isActiveAttempt()) return;
			const side = parseDisconnectSide(args[0]);
			const { connectionState } = get();
			if (connectionState === 'connected') {
				debug.warn(`[PeerStore] transport closed — entering grace period side=${side}`);
				startGracePeriod(side, get, set);
				set({
					connection: null,
					connectionState: 'grace_period',
					disconnectSide: mergeDisconnectSide(get().disconnectSide, side),
					forfeitSide: null,
					reconnectCountdown: getReconnectCountdownSeconds(),
				});
				if (lastRoomId) attemptReconnect(lastRoomId, get, set);
				else startGracePeriod(side, get, set);
			} else if (connectionState === 'connecting' || connectionState === 'waiting') {
				set({ connection: null, connectionState: 'disconnected' });
				rejectConnection(new Error('Connection closed before opening'));
			}
		});

		transport.on('error', (...args: unknown[]) => {
			if (!isActiveAttempt()) return;
			const err = (args[0] instanceof Error) ? args[0] : new Error('Transport error');
			debug.error('[PeerStore] transport error:', err.message);
			const { connectionState } = get();
			if (connectionState === 'disconnected' || get().forfeitSide) {
				return;
			}
			if (connectionState === 'connecting' || connectionState === 'waiting') {
				set({ error: err.message, connectionState: 'error' });
				rejectConnection(err);
			} else {
				set({ error: err.message });
			}
		});

		void transport.connect().catch((error: unknown) => {
			const connectionError = error instanceof Error ? error : new Error('Transport connection failed');
			if (!isActiveAttempt()) {
				rejectConnection(connectionError);
				return;
			}
			if (!settled) {
				set({ error: connectionError.message, connectionState: 'error' });
				rejectConnection(connectionError);
			}
		});
	});
}

function getMatchmakingApiBase(): string | null {
	if (typeof window === 'undefined') return null;
	return import.meta.env.VITE_API_URL || window.location.origin;
}

function leaveMatchmakingBestEffort(peerId: string | null, queueToken: string | null): void {
	const apiBase = getMatchmakingApiBase();
	if (!apiBase || !peerId) return;

	void fetch(`${apiBase}/api/matchmaking/leave`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(queueToken ? { 'x-p2p-queue-token': queueToken } : {}),
		},
		body: JSON.stringify({ peerId }),
	}).catch((error: unknown) => {
		debug.warn('[PeerStore] Failed to leave matchmaking during Hive session reset:', error);
	});
}

function getHiveSessionChangeRuntimeState(): HiveSessionChangeRuntimeState {
	const peer = usePeerStore.getState();
	const matchmaking = useMatchmakingStore.getState();
	return {
		peer,
		matchmaking: {
			status: matchmaking.status,
			queueToken: matchmaking.queueToken,
			roomId: matchmaking.roomId,
			opponentPeerId: matchmaking.opponentPeerId,
		},
	};
}

// ── Store ──

export const usePeerStore = create<PeerStore>((set, get) => ({
	myPeerId: null,
	remotePeerId: null,
	matchChallenge: null,
	opponentMatchChallenge: null,
	matchTicket: null,
	lastRoomId: null,
	connection: null,
	connectionState: 'disconnected',
	isHost: false,
	error: null,
	reconnectCountdown: 0,
	reconnectAttemptCount: 0,
	disconnectSide: null,
	forfeitSide: null,
	bufferedMessageCount: 0,
	opponentArmy: null,
	p2pSessionLocalAuthorized: false,
	p2pSessionRemoteAuthorized: false,
	p2pSessionAuthError: null,
	p2pBattleReadyLocal: null,
	p2pBattleReadyRemote: null,
	p2pBattleReadyExpectedRemoteLoadoutHash: null,
	p2pBattleReadyError: null,
	p2pInitApplied: false,
	hardReloadResume: false,

	setMyPeerId: (id) => set({ myPeerId: id }),
	setRemotePeerId: (id) => set({ remotePeerId: id }),
	setConnection: (conn) => set({ connection: conn }),
	setConnectionState: (state) => set({ connectionState: state }),
	setIsHost: (isHost) => set({ isHost }),
	setError: (error) => set({ error }),
	setOpponentArmy: (army) => set({ opponentArmy: army }),
	setMatchChallenges: (matchChallenge, opponentMatchChallenge) => set({
		matchChallenge,
		opponentMatchChallenge,
	}),
	setMatchTicket: (ticket) => set({ matchTicket: ticket }),
	clearMatchChallenges: () => set({
		matchChallenge: null,
		opponentMatchChallenge: null,
		matchTicket: null,
	}),
	setP2pSessionAuthorization: (state) => set({
		...(state.localAuthorized !== undefined ? { p2pSessionLocalAuthorized: state.localAuthorized } : {}),
		...(state.remoteAuthorized !== undefined ? { p2pSessionRemoteAuthorized: state.remoteAuthorized } : {}),
		...(state.error !== undefined ? { p2pSessionAuthError: state.error } : {}),
	}),
	setP2pBattleReady: (state) => set({
		...(state.local !== undefined ? { p2pBattleReadyLocal: state.local } : {}),
		...(state.remote !== undefined ? { p2pBattleReadyRemote: state.remote } : {}),
		...(state.expectedRemoteLoadoutHash !== undefined ? { p2pBattleReadyExpectedRemoteLoadoutHash: state.expectedRemoteLoadoutHash } : {}),
		...(state.error !== undefined ? { p2pBattleReadyError: state.error } : {}),
	}),
	clearP2pBattleReady: () => set({
		p2pBattleReadyLocal: null,
		p2pBattleReadyRemote: null,
		p2pBattleReadyExpectedRemoteLoadoutHash: null,
		p2pBattleReadyError: null,
	}),
	setP2pInitApplied: (applied) => set({ p2pInitApplied: applied }),
	setHardReloadResume: (value) => set({ hardReloadResume: value }),

	rejoinPersistedRoom: (roomId) => {
		lastRoomId = roomId;
		reconnectAttempt = 0;
		reconnectDeadlineAt = Date.now() + DISCONNECT_GRACE_MS;
		set({
			hardReloadResume: true,
			disconnectSide: 'local',
			forfeitSide: null,
			connectionState: 'reconnecting',
			reconnectCountdown: getReconnectCountdownSeconds(),
			reconnectAttemptCount: 0,
			error: null,
		});
		startGracePeriod('local', get, set);
		attemptReconnect(roomId, get, set);
	},

	handleHeartbeat: () => {
		lastHeartbeatReceived = Date.now();
		const { connectionState } = get();
		if (connectionState === 'grace_period') {
			clearReconnectWindow();
			set({
				connectionState: 'connected',
				reconnectCountdown: 0,
				reconnectAttemptCount: 0,
				disconnectSide: null,
				forfeitSide: null,
				error: null,
			});
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
		const matchChallenge = get().matchChallenge;
		const opponentMatchChallenge = get().opponentMatchChallenge;
		const matchTicket = get().matchTicket;
		set({
			myPeerId: peerId,
			remotePeerId: null,
			matchChallenge,
			opponentMatchChallenge,
			matchTicket,
			connectionState: 'waiting',
			isHost: true,
			error: null,
			reconnectAttemptCount: 0,
			disconnectSide: null,
			forfeitSide: null,
			opponentArmy: null,
			p2pSessionLocalAuthorized: false,
			p2pSessionRemoteAuthorized: false,
			p2pSessionAuthError: null,
			p2pBattleReadyLocal: null,
			p2pBattleReadyRemote: null,
			p2pBattleReadyExpectedRemoteLoadoutHash: null,
			p2pBattleReadyError: null,
		});

		debug.log(`[PeerStore][host] opening room=${peerId.slice(0, 8)}…`);
		try {
			await openTransport(peerId, peerId, get, set, false);
		} catch (err) {
			throw err instanceof Error ? err : new Error(String(err));
		}
	},

	join: async (remoteId: string, isReconnect = false) => {
		const { connection } = get();
		if (connection) get().disconnect();

		if (!isReconnect) messageBuffer.length = 0;

		const peerId = get().myPeerId ?? generatePeerId();
		const matchChallenge = get().matchChallenge;
		const opponentMatchChallenge = get().opponentMatchChallenge;
		const matchTicket = get().matchTicket;
		set({
			myPeerId: peerId,
			remotePeerId: remoteId,
			matchChallenge,
			opponentMatchChallenge,
			matchTicket,
			connectionState: isReconnect ? 'reconnecting' : 'connecting',
			isHost: false,
			error: null,
			reconnectAttemptCount: isReconnect ? reconnectAttempt : 0,
			disconnectSide: isReconnect ? get().disconnectSide : null,
			forfeitSide: null,
			opponentArmy: null,
			p2pSessionLocalAuthorized: isReconnect ? get().p2pSessionLocalAuthorized : false,
			p2pSessionRemoteAuthorized: isReconnect ? get().p2pSessionRemoteAuthorized : false,
			p2pSessionAuthError: isReconnect ? get().p2pSessionAuthError : null,
			p2pBattleReadyLocal: isReconnect ? get().p2pBattleReadyLocal : null,
			p2pBattleReadyRemote: isReconnect ? get().p2pBattleReadyRemote : null,
			p2pBattleReadyExpectedRemoteLoadoutHash: isReconnect ? get().p2pBattleReadyExpectedRemoteLoadoutHash : null,
			p2pBattleReadyError: isReconnect ? get().p2pBattleReadyError : null,
		});

		debug.log(`[PeerStore][join] joining room=${remoteId.slice(0, 8)}… as peer=${peerId.slice(0, 8)}…`);
		await openTransport(remoteId, peerId, get, set, isReconnect);
	},

	connectToRoom: async (roomId: string, isReconnect = false) => {
		const { connection } = get();
		if (connection) {
			try { connection.close(); } catch { /* ignored */ }
		}

		if (!isReconnect) messageBuffer.length = 0;

		const peerId = get().myPeerId ?? generatePeerId();
		const matchChallenge = get().matchChallenge;
		const opponentMatchChallenge = get().opponentMatchChallenge;
		const matchTicket = get().matchTicket;
		const matchmakingHost = useMatchmakingStore.getState().isHost;
		set({
			myPeerId: peerId,
			connectionState: isReconnect ? 'reconnecting' : 'connecting',
			matchChallenge,
			opponentMatchChallenge,
			matchTicket,
			...(matchmakingHost === true || matchmakingHost === false ? { isHost: matchmakingHost } : {}),
			error: null,
			reconnectAttemptCount: isReconnect ? reconnectAttempt : 0,
			disconnectSide: isReconnect ? get().disconnectSide : null,
			forfeitSide: null,
			opponentArmy: isReconnect ? get().opponentArmy : null,
			p2pSessionLocalAuthorized: isReconnect ? get().p2pSessionLocalAuthorized : false,
			p2pSessionRemoteAuthorized: isReconnect ? get().p2pSessionRemoteAuthorized : false,
			p2pSessionAuthError: isReconnect ? get().p2pSessionAuthError : null,
			p2pBattleReadyLocal: isReconnect ? get().p2pBattleReadyLocal : null,
			p2pBattleReadyRemote: isReconnect ? get().p2pBattleReadyRemote : null,
			p2pBattleReadyExpectedRemoteLoadoutHash: isReconnect ? get().p2pBattleReadyExpectedRemoteLoadoutHash : null,
			p2pBattleReadyError: isReconnect ? get().p2pBattleReadyError : null,
			bufferedMessageCount: messageBuffer.length,
		});

		debug.log(`[PeerStore][connectToRoom] room=${roomId.slice(0, 16)}… peer=${peerId.slice(0, 8)}… reconnect=${isReconnect}`);
		await openTransport(roomId, peerId, get, set, isReconnect);
	},

	disconnect: () => {
	transportOpenGeneration += 1;
		clearAllTimers();
		messageBuffer.length = 0;
		if (activeTransport) {
			try { activeTransport.close(); } catch { /* already closed */ }
			activeTransport = null;
		}
		lastRoomId = null;
		activeTransportSession = null;
		set({
			myPeerId: null,
			remotePeerId: null,
			connection: null,
			connectionState: 'disconnected',
			isHost: false,
			error: null,
			reconnectCountdown: 0,
			reconnectAttemptCount: 0,
			disconnectSide: null,
			forfeitSide: null,
			bufferedMessageCount: 0,
			matchChallenge: null,
			opponentMatchChallenge: null,
			matchTicket: null,
			lastRoomId: null,
			opponentArmy: null,
			p2pSessionLocalAuthorized: false,
			p2pSessionRemoteAuthorized: false,
			p2pSessionAuthError: null,
			p2pBattleReadyLocal: null,
			p2pBattleReadyRemote: null,
			p2pBattleReadyExpectedRemoteLoadoutHash: null,
			p2pBattleReadyError: null,
			p2pInitApplied: false,
			hardReloadResume: false,
		});
	},

	send: (data: WireMessage) => {
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

let lastAuthenticatedHiveUsername = getAuthenticatedHiveUsername();

subscribeHiveSessionIdentity(() => {
	const previousAuthenticatedHiveUsername = lastAuthenticatedHiveUsername;
	const nextAuthenticatedHiveUsername = getAuthenticatedHiveUsername();
	lastAuthenticatedHiveUsername = nextAuthenticatedHiveUsername;

	const runtimeState = getHiveSessionChangeRuntimeState();
	if (!shouldClearP2PRuntimeForHiveSessionChange({
		previousAuthenticatedHiveUsername,
		nextAuthenticatedHiveUsername,
		runtimeState,
	})) {
		return;
	}

	leaveMatchmakingBestEffort(runtimeState.peer.myPeerId, runtimeState.matchmaking.queueToken);
	usePeerStore.getState().disconnect();
	useMatchmakingStore.getState().reset();
});

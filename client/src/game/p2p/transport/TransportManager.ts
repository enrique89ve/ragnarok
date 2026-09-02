import { debug } from '../../config/debugConfig';
import { createWebSocketRelayTransport } from './WebSocketRelayTransport';
import {
	type LocalWebSocketTransportOptions,
	type TransportEvent,
	type TransportListener,
} from '../../stores/wsTransport';
import type { P2PMatchTicket } from '@shared/p2pAvailability';
import type { P2PControlClientMessage, P2PControlServerMessage } from '@shared/p2p-wire/control';
import type { P2PMessage } from '../messages';
import {
	createWebRTCTransport,
	type WebRTCTransportOptions,
} from './WebRTCTransport';
import type {
	GameTransport,
	TransportMessageListener,
	TransportStatsSnapshot,
	TransportState,
	TransportStateListener,
	TransportCloseReason,
} from './transportTypes';
import { createTransportFailure, getTransportFailureReason } from './transportTypes';
import type { TransportPlan } from './transportPolicy';
import type { TransportSession } from './transportSession';
import {
	recordRelayFallback,
	recordWebRTCAttempt,
	recordWebRTCConnected,
	recordWebRTCFailed,
} from './transportTelemetry';

export type TransportManagerOptions = {
	readonly roomId: string;
	readonly peerId: string;
	readonly relayUrl: string;
	readonly controlUrl: string;
	readonly matchTicket: P2PMatchTicket | null;
	readonly isHostHint: boolean;
	readonly plan: TransportPlan;
	readonly session: TransportSession;
	readonly iceServers?: readonly import('@shared/p2p-wire/transportConfig').P2PIceServerConfig[];
};

export type ManagedTransport = GameTransport & {
	readonly peer: string;
	readonly open: boolean;
	readonly isHostHint: boolean;
	readonly transportEpoch?: number;
	on: (event: TransportEvent, listener: TransportListener) => void;
	off: (event: TransportEvent, listener: TransportListener) => void;
	/** Optional authenticated control-plane referee channel. */
	readonly controlAvailable?: boolean;
	/** Optional transport diagnostics, available for native WebRTC sessions. */
	readonly getStats?: () => Promise<TransportStatsSnapshot | null>;
	sendControlMessage?: (message: P2PControlClientMessage) => void;
	onControlMessage?: (listener: (message: P2PControlServerMessage) => void) => () => void;
};

type ControlCapableTransport = GameTransport & {
	readonly sendControlMessage: (message: P2PControlClientMessage) => void;
	readonly onControlMessage: (listener: (message: P2PControlServerMessage) => void) => () => void;
};

function hasControlChannel(transport: GameTransport): transport is ControlCapableTransport {
	return 'sendControlMessage' in transport
		&& typeof transport.sendControlMessage === 'function'
		&& 'onControlMessage' in transport
		&& typeof transport.onControlMessage === 'function';
}

type ControlMessageCapableTransport = GameTransport & {
	readonly onControlMessage: (listener: (message: P2PControlServerMessage) => void) => () => void;
};

function hasControlMessageListener(transport: GameTransport): transport is ControlMessageCapableTransport {
	return 'onControlMessage' in transport
		&& typeof transport.onControlMessage === 'function';
}

export type TransportManagerDependencies = {
	readonly createWebRTC?: (options: WebRTCTransportOptions) => GameTransport;
	readonly createRelay?: (options: LocalWebSocketTransportOptions) => GameTransport;
};

function toError(value: unknown, fallback: string): Error {
	return value instanceof Error ? value : new Error(fallback);
}

function safeConnectBudget(value: number): number {
	if (!Number.isFinite(value)) return 8_000;
	return Math.min(30_000, Math.max(1_000, Math.floor(value)));
}

function remainingBudget(deadlineAt: number): number {
	return Math.max(0, deadlineAt - Date.now());
}

// A transport can open before React attaches `useWireSync`'s data listener.
// Keep the short handshake burst so a fast peer (or a reconnect flush) cannot
// lose the first canonical frame in that listener-installation window.
const MAX_PENDING_MESSAGES = 256;
const MAX_PENDING_CONTROL_MESSAGES = 128;

function isBufferedControlMessage(message: P2PControlServerMessage): boolean {
	return message.type === 'phase_checkpoint_commit_v1'
		|| message.type === 'phase_checkpoint_dispute_v1'
	|| message.type === 'poker_turn_notary_commit_v1'
	|| message.type === 'poker_turn_notary_dispute_v1'
	|| message.type === 'poker_action_time_gate_v1'
	|| message.type === 'poker_action_time_gate_ack_v1'
	|| message.type === 'action_applied_v1'
	|| message.type === 'transport_committed_v1';
}

async function connectWithinBudget(
	transport: GameTransport,
	deadlineAt: number,
	message: string,
	abortPromise?: Promise<never>,
): Promise<void> {
	const remaining = remainingBudget(deadlineAt);
	if (remaining <= 0) throw createTransportFailure(message, 'timeout');
	let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
	try {
		const pending = [
			transport.connect(),
			new Promise<never>((_, reject) => {
				timeoutHandle = setTimeout(() => reject(createTransportFailure(message, 'timeout')), remaining);
			}),
		];
		if (abortPromise) pending.push(abortPromise);
		await Promise.race(pending);
	} catch (error) {
		// A timeout or manager close must actively close the adapter. Otherwise
		// its late `connect()` resolution can publish a stale open event.
		try { transport.close(); } catch { /* adapter may already be closed */ }
		throw error;
	} finally {
		if (timeoutHandle) clearTimeout(timeoutHandle);
	}
}

export function createTransportManager(
	options: TransportManagerOptions,
	dependencies: TransportManagerDependencies = {},
): ManagedTransport {
	const eventListeners = new Map<TransportEvent, Set<TransportListener>>();
	const messageListeners = new Set<TransportMessageListener>();
	const controlMessageListeners = new Set<(message: P2PControlServerMessage) => void>();
	const stateListeners = new Set<TransportStateListener>();
	const pendingMessages: P2PMessage[] = [];
	const pendingControlMessages: P2PControlServerMessage[] = [];
	const createWebRTC = dependencies.createWebRTC ?? createWebRTCTransport;
	const createRelay = dependencies.createRelay ?? createWebSocketRelayTransport;
	let selected: GameTransport | null = null;
	let selectedCleanup: (() => void) | null = null;
	let state: TransportState = 'idle';
	let connectPromise: Promise<void> | null = null;
	let remotePeer = '';
	let hostHint = options.isHostHint;
	let open = false;
	let closed = false;
	let cancelPendingConnect: (() => void) | null = null;

	const emit = (event: TransportEvent, ...args: unknown[]): void => {
		for (const listener of eventListeners.get(event) ?? []) {
			try { listener(...args); } catch (error) { debug.error('[TransportManager] listener failed:', error); }
		}
	};

	const on = (event: TransportEvent, listener: TransportListener): void => {
		const listeners = eventListeners.get(event) ?? new Set<TransportListener>();
		listeners.add(listener);
		eventListeners.set(event, listeners);
	};

	const off = (event: TransportEvent, listener: TransportListener): void => {
		eventListeners.get(event)?.delete(listener);
	};

	const setState = (next: TransportState): void => {
		if (state === next) return;
		state = next;
		for (const listener of stateListeners) {
			try { listener(next); } catch (error) { debug.error('[TransportManager] state listener failed:', error); }
		}
	};

	const dispatchControlMessage = (message: P2PControlServerMessage): void => {
		if (!isBufferedControlMessage(message)) return;
		if (controlMessageListeners.size === 0) {
			if (pendingControlMessages.length < MAX_PENDING_CONTROL_MESSAGES) {
				pendingControlMessages.push(message);
				return;
			}
			debug.warn('[TransportManager] referee control queue full before a listener attached');
			return;
		}
		for (const listener of controlMessageListeners) {
			try { listener(message); } catch (error) { debug.error('[TransportManager] control listener failed:', error); }
		}
	};

	const cleanupSelected = (): void => {
		selectedCleanup?.();
		selectedCleanup = null;
	};

	const attachSelected = (transport: GameTransport, attemptId: number): void => {
		cleanupSelected();
		selected = transport;
		const dispatchMessage = (message: P2PMessage): void => {
			if (messageListeners.size === 0) {
				if (pendingMessages.length < MAX_PENDING_MESSAGES) {
					pendingMessages.push(message);
					return;
				}
				debug.warn('[TransportManager] inbound message queue full before a listener attached');
				return;
			}
			for (const listener of messageListeners) {
				try { listener(message); } catch (error) { debug.error('[TransportManager] message listener failed:', error); }
			}
		};
		const removeMessage = transport.onMessage(message => {
			if (selected !== transport || closed || !options.session.isCurrent(attemptId)) return;
			dispatchMessage(message);
			emit('data', message);
		});
		const removeState = transport.onStateChange(next => {
			if (selected !== transport || closed || !options.session.isCurrent(attemptId)) return;
			if (next === 'reconnecting' || next === 'connecting') {
				if (state === 'connected' || state === 'reconnecting') {
					open = false;
					setState('reconnecting');
				}
				return;
			}
			if (next === 'connected') {
				if (!options.session.selectTransport(attemptId, transport.kind)) return;
				const wasReconnecting = state === 'reconnecting';
				open = true;
				remotePeer = 'peer' in transport && typeof transport.peer === 'string' ? transport.peer : '';
				hostHint = options.isHostHint;
				setState('connected');
				if (!wasReconnecting) emit('open', { isHost: hostHint, remotePeerId: remotePeer });
				return;
			}
			if (next === 'failed' || next === 'closed') {
				if (open || state === 'reconnecting') emit('close', (transport.closeReason ?? 'unknown') satisfies TransportCloseReason);
				open = false;
				setState(next);
			}
		});
		const removeControl = hasControlMessageListener(transport)
			? transport.onControlMessage(dispatchControlMessage)
			: null;
		selectedCleanup = () => {
			removeMessage();
			removeState();
			removeControl?.();
			pendingControlMessages.length = 0;
		};
	};

	const connectOne = async (
		transport: GameTransport,
		attemptId: number,
		budgetMs: number,
		abortPromise?: Promise<never>,
	): Promise<void> => {
		attachSelected(transport, attemptId);
		const deadlineAt = Date.now() + safeConnectBudget(budgetMs);
		await connectWithinBudget(
			transport,
			deadlineAt,
			`${transport.kind} transport connection timed out`,
			abortPromise,
		);
		if (!options.session.isCurrent(attemptId) || closed) {
			try { transport.close(); } catch { /* stale attempt */ }
			throw new Error('Transport connection attempt became stale');
		}
		if (!open) {
			try {
				if (transport.state !== 'connected') {
					throw new Error(`${transport.kind} transport did not confirm an open state`);
				}
				if (!options.session.selectTransport(attemptId, transport.kind)) throw new Error('Transport connection attempt became stale');
				open = true;
				remotePeer = 'peer' in transport && typeof transport.peer === 'string' ? transport.peer : '';
				hostHint = options.isHostHint;
				setState('connected');
				emit('open', { isHost: hostHint, remotePeerId: remotePeer });
			} catch (error) {
				// An adapter may resolve connect() without publishing a connected
				// state. Close it before fallback so it cannot leak sockets or emit a
				// late open event.
				try { transport.close(); } catch { /* adapter may already be closed */ }
				throw error;
			}
		}
	};

	const connect = async (): Promise<void> => {
		if (state === 'connected') return;
		if (connectPromise) return connectPromise;
		if (closed) throw new Error('Transport manager is closed');
		setState('connecting');
		connectPromise = (async () => {
			const attemptId = options.session.beginAttempt();
			const abortPromise = new Promise<never>((_, reject) => {
				cancelPendingConnect = () => reject(createTransportFailure('Transport manager closed', 'manual'));
			});
			const plan = options.plan;
			if (plan.mode === 'unavailable') {
				setState('failed');
				const error = new Error(`No P2P transport available: ${plan.reason}`);
				emit('error', error);
				throw error;
			}
			let webRtcError: Error | null = null;
			if (plan.mode === 'webrtc-first') {
				const matchTicket = options.matchTicket;
				if (!matchTicket) {
					setState('failed');
					const error = new Error('WebRTC transport requires a match ticket');
					emit('error', error);
					throw error;
				}
				recordWebRTCAttempt();
				let webRtc: GameTransport | null = null;
				try {
					webRtc = createWebRTC({
						controlUrl: options.controlUrl,
						roomId: options.roomId,
						peerId: options.peerId,
						matchTicket,
						connectTimeoutMs: safeConnectBudget(plan.webrtcConnectMs),
						...(options.iceServers ? { iceServers: options.iceServers } : {}),
					});
					await connectOne(webRtc, attemptId, plan.webrtcConnectMs, abortPromise);
					recordWebRTCConnected();
					return;
				} catch (error) {
					webRtcError = toError(error, 'WebRTC connection failed');
					recordWebRTCFailed(getTransportFailureReason(error) ?? 'manual');
					cleanupSelected();
					selected = null;
				}
			}
			if (closed) throw webRtcError ?? new Error('Transport manager is closed');

			if (plan.mode === 'webrtc-first' && !plan.relayFallback) {
				setState('failed');
				const error = webRtcError ?? new Error('No transport available');
				emit('error', error);
				throw error;
			}
			if (plan.mode === 'webrtc-first') {
				options.session.lockRelay(attemptId);
				recordRelayFallback(getTransportFailureReason(webRtcError) ?? 'manual');
			}
			try {
				const relay = createRelay({
					url: options.relayUrl,
					controlUrl: options.controlUrl,
					roomId: options.roomId,
					peerId: options.peerId,
					matchTicket: options.matchTicket,
				});
				await connectOne(relay, attemptId, plan.relayConnectMs, abortPromise);
			} catch (error) {
				setState('failed');
				const finalError = toError(error, 'Relay connection failed');
				emit('error', finalError);
				throw finalError;
			}
		})();
		try {
			await connectPromise;
		} finally {
			connectPromise = null;
			cancelPendingConnect = null;
		}
	};

	const close = (): void => {
		if (closed) return;
		closed = true;
		options.session.invalidate();
		cancelPendingConnect?.();
		cancelPendingConnect = null;
		cleanupSelected();
		try { selected?.close(); } catch { /* already closed */ }
		selected = null;
		pendingMessages.length = 0;
		pendingControlMessages.length = 0;
		open = false;
		setState('closed');
	};

	return {
		get kind(): GameTransport['kind'] { return selected?.kind ?? 'websocket-relay'; },
		get state(): TransportState { return state; },
		connect,
		send: message => {
			if (!selected || state !== 'connected' || !open) {
				throw new Error('No committed gameplay transport');
			}
			selected.send(message);
		},
		onMessage: listener => {
			messageListeners.add(listener);
			if (pendingMessages.length > 0) {
				const pending = pendingMessages.splice(0, pendingMessages.length);
				for (const message of pending) {
					try { listener(message); } catch (error) { debug.error('[TransportManager] queued message listener failed:', error); }
				}
			}
			return () => messageListeners.delete(listener);
		},
		onStateChange: listener => {
			stateListeners.add(listener);
			return () => stateListeners.delete(listener);
		},
		close,
		get peer(): string { return remotePeer; },
		get open(): boolean { return open; },
		get isHostHint(): boolean { return hostHint; },
		get transportEpoch(): number {
			const transport = selected;
			if (transport && 'transportEpoch' in transport && typeof transport.transportEpoch === 'number') {
				return transport.transportEpoch;
			}
			return 1;
		},
		get controlAvailable(): boolean { return Boolean(selected && hasControlChannel(selected)); },
		getStats: async (): Promise<TransportStatsSnapshot | null> => {
			const transport = selected;
			if (!transport || !('getStats' in transport) || typeof transport.getStats !== 'function') return null;
			return transport.getStats();
		},
		sendControlMessage: message => {
			if (!selected || !hasControlChannel(selected)) {
				throw new Error('P2P control plane is not available');
			}
			selected.sendControlMessage(message);
		},
		onControlMessage: listener => {
			controlMessageListeners.add(listener);
			if (pendingControlMessages.length > 0) {
				const pending = pendingControlMessages.splice(0, pendingControlMessages.length);
				for (const message of pending) {
					try { listener(message); } catch (error) { debug.error('[TransportManager] queued control listener failed:', error); }
				}
			}
			return () => controlMessageListeners.delete(listener);
		},
		on,
		off,
	};
}

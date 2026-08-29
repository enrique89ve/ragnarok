import { debug } from '../../config/debugConfig';
import { createWebSocketRelayTransport } from './WebSocketRelayTransport';
import {
	type LocalWebSocketTransportOptions,
	type TransportEvent,
	type TransportListener,
} from '../../stores/wsTransport';
import type { P2PMatchTicket } from '@shared/p2pAvailability';
import {
	createWebRTCTransport,
	type WebRTCTransportOptions,
} from './WebRTCTransport';
import type {
	GameTransport,
	TransportMessageListener,
	TransportState,
	TransportStateListener,
} from './transportTypes';
import { createTransportFailure, getTransportFailureReason } from './transportTypes';
import type { TransportCapabilities } from './transportCapabilities';
import { resolveTransportPlan } from './transportPolicy';
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
	readonly webrtcEnabled: boolean;
	readonly wsFallbackEnabled: boolean;
	readonly isHostHint: boolean;
	readonly capabilities: TransportCapabilities;
	readonly session: TransportSession;
	readonly connectTimeoutMs: number;
	readonly iceServers?: readonly import('@shared/p2p-wire/transportConfig').P2PIceServerConfig[];
};

export type ManagedTransport = GameTransport & {
	readonly peer: string;
	readonly open: boolean;
	readonly isHostHint: boolean;
	on: (event: TransportEvent, listener: TransportListener) => void;
	off: (event: TransportEvent, listener: TransportListener) => void;
};

export type TransportManagerDependencies = {
	readonly createWebRTC?: (options: WebRTCTransportOptions) => GameTransport;
	readonly createRelay?: (options: LocalWebSocketTransportOptions) => GameTransport;
};

function toError(value: unknown, fallback: string): Error {
	return value instanceof Error ? value : new Error(fallback);
}

function safeConnectTimeout(value: number): number {
	if (!Number.isFinite(value)) return 20_000;
	return Math.min(30_000, Math.max(1_000, Math.floor(value)));
}

function remainingBudget(deadlineAt: number): number {
	return Math.max(0, deadlineAt - Date.now());
}

async function connectWithinBudget(
	transport: GameTransport,
	deadlineAt: number,
	message: string,
): Promise<void> {
	const remaining = remainingBudget(deadlineAt);
	if (remaining <= 0) throw createTransportFailure(message, 'timeout');
	let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
	try {
		await Promise.race([
			transport.connect(),
			new Promise<never>((_, reject) => {
				timeoutHandle = setTimeout(() => reject(createTransportFailure(message, 'timeout')), remaining);
			}),
		]);
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
	const stateListeners = new Set<TransportStateListener>();
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

	const cleanupSelected = (): void => {
		selectedCleanup?.();
		selectedCleanup = null;
	};

	const attachSelected = (transport: GameTransport, attemptId: number): void => {
		cleanupSelected();
		selected = transport;
		const removeMessage = transport.onMessage(message => {
			if (selected !== transport || closed || !options.session.isCurrent(attemptId)) return;
			for (const listener of messageListeners) {
				try { listener(message); } catch (error) { debug.error('[TransportManager] message listener failed:', error); }
			}
			emit('data', message);
		});
		const removeState = transport.onStateChange(next => {
			if (selected !== transport || closed || !options.session.isCurrent(attemptId)) return;
			if (next === 'connected') {
				if (!options.session.selectTransport(attemptId, transport.kind)) return;
				open = true;
				remotePeer = 'peer' in transport && typeof transport.peer === 'string' ? transport.peer : '';
				hostHint = options.isHostHint;
				setState('connected');
				emit('open', { isHost: hostHint, remotePeerId: remotePeer });
				return;
			}
			if (next === 'failed' || next === 'closed') {
				if (open) emit('close', 'unknown');
				open = false;
				setState(next);
			}
		});
		selectedCleanup = () => {
			removeMessage();
			removeState();
		};
	};

	const connectOne = async (transport: GameTransport, attemptId: number, deadlineAt: number): Promise<void> => {
		attachSelected(transport, attemptId);
		await connectWithinBudget(transport, deadlineAt, `${transport.kind} transport connection timed out`);
		if (!options.session.isCurrent(attemptId) || closed) {
			try { transport.close(); } catch { /* stale attempt */ }
			throw new Error('Transport connection attempt became stale');
		}
		if (!open) {
			if (!options.session.selectTransport(attemptId, transport.kind)) throw new Error('Transport connection attempt became stale');
			open = true;
			remotePeer = 'peer' in transport && typeof transport.peer === 'string' ? transport.peer : '';
			hostHint = options.isHostHint;
			setState('connected');
			emit('open', { isHost: hostHint, remotePeerId: remotePeer });
		}
	};

	const connect = async (): Promise<void> => {
		if (state === 'connected') return;
		if (connectPromise) return connectPromise;
		if (closed) throw new Error('Transport manager is closed');
		setState('connecting');
		connectPromise = (async () => {
			const attemptId = options.session.beginAttempt();
			const deadlineAt = Date.now() + safeConnectTimeout(options.connectTimeoutMs);
			const session = options.session.getSnapshot();
			const plan = resolveTransportPlan({
				webrtcEnabled: options.webrtcEnabled,
				relayEnabled: options.wsFallbackEnabled,
				capabilities: options.capabilities,
				matchRole: options.matchTicket?.role ?? null,
				relayLocked: session.relayLocked,
			});
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
					const connectTimeoutMs = remainingBudget(deadlineAt);
					webRtc = createWebRTC({
						controlUrl: options.controlUrl,
						roomId: options.roomId,
						peerId: options.peerId,
						matchTicket,
						connectTimeoutMs,
						...(options.iceServers ? { iceServers: options.iceServers } : {}),
					});
					await connectOne(webRtc, attemptId, deadlineAt);
					recordWebRTCConnected();
					return;
				} catch (error) {
					webRtcError = toError(error, 'WebRTC connection failed');
					recordWebRTCFailed(getTransportFailureReason(error) ?? 'manual');
					try { webRtc?.close(); } catch { /* already closed */ }
					cleanupSelected();
					selected = null;
				}
			}

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
				if (remainingBudget(deadlineAt) <= 0) throw webRtcError ?? new Error('P2P transport connection timed out');
				const relay = createRelay({
					url: options.relayUrl,
					roomId: options.roomId,
					peerId: options.peerId,
					matchTicket: options.matchTicket,
				});
				await connectOne(relay, attemptId, deadlineAt);
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
		}
	};

	const close = (): void => {
		if (closed) return;
		closed = true;
		cleanupSelected();
		try { selected?.close(); } catch { /* already closed */ }
		selected = null;
		open = false;
		setState('closed');
	};

	return {
		get kind(): GameTransport['kind'] { return selected?.kind ?? 'websocket-relay'; },
		get state(): TransportState { return state; },
		connect,
		send: message => {
			if (!selected) throw new Error('No active transport');
			selected.send(message);
		},
		onMessage: listener => {
			messageListeners.add(listener);
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
		on,
		off,
	};
}

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
	readonly iceServers?: readonly import('./WebRTCTransport').WebRTCIceServerConfig[];
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

	const attachSelected = (transport: GameTransport): void => {
		cleanupSelected();
		selected = transport;
		const removeMessage = transport.onMessage(message => {
			for (const listener of messageListeners) {
				try { listener(message); } catch (error) { debug.error('[TransportManager] message listener failed:', error); }
			}
			emit('data', message);
		});
		const removeState = transport.onStateChange(next => {
			if (selected !== transport || closed) return;
			if (next === 'connected') {
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

	const connectOne = async (transport: GameTransport): Promise<void> => {
		attachSelected(transport);
		await transport.connect();
		if (!open) {
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
			let webRtcError: Error | null = null;
			let attemptedWebRTC = false;
			if (options.webrtcEnabled && options.matchTicket?.role) {
				attemptedWebRTC = true;
				recordWebRTCAttempt();
				let webRtc: GameTransport | null = null;
				try {
					webRtc = createWebRTC({
						controlUrl: options.controlUrl,
						roomId: options.roomId,
						peerId: options.peerId,
						matchTicket: options.matchTicket,
						...(options.iceServers ? { iceServers: options.iceServers } : {}),
					});
					await connectOne(webRtc);
					recordWebRTCConnected();
					return;
				} catch (error) {
					webRtcError = toError(error, 'WebRTC connection failed');
					recordWebRTCFailed();
					try { webRtc?.close(); } catch { /* already closed */ }
					cleanupSelected();
					selected = null;
				}
			}

			if (!options.wsFallbackEnabled) {
				setState('failed');
				const error = webRtcError ?? new Error('No transport available');
				emit('error', error);
				throw error;
			}
			if (attemptedWebRTC) recordRelayFallback();
			try {
				const relay = createRelay({
					url: options.relayUrl,
					roomId: options.roomId,
					peerId: options.peerId,
					matchTicket: options.matchTicket,
				});
				await connectOne(relay);
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

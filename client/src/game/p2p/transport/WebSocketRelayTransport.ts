import { debug } from '../../config/debugConfig';
import { parseWireMessage } from '../messageSchemas';
import type { P2PMessage } from '../messages';
import {
	LocalWebSocketTransport,
	type LocalWebSocketTransportOptions,
	type TransportEvent,
	type TransportListener,
} from '../../stores/wsTransport';
import type {
	GameTransport,
	TransportMessageListener,
	TransportState,
	TransportStateListener,
	TransportCloseReason,
} from './transportTypes';
import { createP2PControlChannel, type P2PControlChannel } from './P2PControlChannel';
import {
	P2P_CONTROL_PROTOCOL_VERSION,
	parseP2PControlServerMessage,
	type P2PControlClientMessage,
	type P2PControlServerMessage,
} from '@shared/p2p-wire/control';

export type WebSocketRelayTransport = GameTransport & {
	readonly peer: string;
	readonly open: boolean;
	readonly isHostHint: boolean;
	on: (event: TransportEvent, listener: TransportListener) => void;
	off: (event: TransportEvent, listener: TransportListener) => void;
	readonly controlAvailable?: boolean;
	readonly sendControlMessage?: (message: P2PControlClientMessage) => void;
	readonly onControlMessage?: (listener: (message: P2PControlServerMessage) => void) => () => void;
};

/**
 * Adapter for the known-good relay transport. The legacy event surface stays
 * available to peerStore during this migration, while new consumers use the
 * GameTransport contract.
 */
export function createWebSocketRelayTransport(
	options: LocalWebSocketTransportOptions,
): WebSocketRelayTransport {
	const relay = new LocalWebSocketTransport(options);
	const control: P2PControlChannel | null = options.controlUrl && options.matchTicket?.role
		? createP2PControlChannel({
			controlUrl: options.controlUrl,
			roomId: options.roomId,
			peerId: options.peerId,
			matchTicket: options.matchTicket,
		})
		: null;
	const stateListeners = new Set<TransportStateListener>();
	const controlMessageListeners = new Set<(message: P2PControlServerMessage) => void>();
	let state: TransportState = 'idle';
	let connectPromise: Promise<void> | null = null;
	let relayReady = false;
	let controlReady = control === null;
	// Relay gameplay is not exposed until the authenticated control plane has
	// committed the same transport for both peers. Legacy/direct rooms have no
	// control plane and retain their existing relay-only readiness semantics.
	let transportCommitted = control === null;
	let transportReadySent = false;
	let cancelRelayConnect: (() => void) | null = null;

	const sendTransportReady = (): void => {
		if (!control || transportReadySent || !relayReady || !controlReady) return;
		control.send({
			type: 'transport_ready_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: options.roomId,
			transportEpoch: control.transportEpoch,
			kind: 'websocket-relay',
		});
		transportReadySent = true;
	};

	const maybeSetConnected = (): void => {
		if (state !== 'connecting' && state !== 'reconnecting') return;
		if (!relayReady || !controlReady) return;
		try {
			sendTransportReady();
		} catch (error) {
			debug.error('[WebSocketRelayTransport] failed to announce transport readiness:', error);
			setState('failed');
			control?.close();
			relay.close();
			return;
		}
		if (control && !transportCommitted) return;
		setState('connected');
	};

	const emitControlMessage = (message: P2PControlServerMessage): void => {
		for (const listener of controlMessageListeners) {
			try { listener(message); }
			catch (error) { debug.error('[WebSocketRelayTransport] control listener failed:', error); }
		}
	};

	const setState = (next: TransportState): void => {
		if (state === next) return;
		state = next;
		for (const listener of stateListeners) {
			try { listener(next); }
			catch (error) { debug.error('[WebSocketRelayTransport] state listener failed:', error); }
		}
	};

	relay.on('open', () => {
		relayReady = true;
		maybeSetConnected();
	});
	relay.on('close', () => {
		if (state !== 'closed') setState('failed');
	});
	relay.on('error', () => {
		if (state !== 'closed') setState('failed');
	});
	// Relay-only compatibility rooms receive server referee acknowledgements
	// through a reserved `__sys` frame. Route those through the same typed
	// control listener as an authenticated Control WS, never through the
	// untrusted gameplay-data parser.
	relay.on('control', (value: unknown) => {
		const message = parseP2PControlServerMessage(value);
		if (message) emitControlMessage(message);
	});
	control?.onMessage(message => {
		if (message.type === 'transport_reset_v2') {
			transportCommitted = false;
			transportReadySent = false;
			if (state === 'connected' || state === 'connecting') setState('reconnecting');
			sendTransportReady();
			return;
		}
		if (message.type === 'transport_committed_v1') {
			if (message.matchId !== options.roomId || message.kind !== 'websocket-relay') {
				debug.error('[WebSocketRelayTransport] transport commitment mismatch');
				setState('failed');
				cancelRelayConnect?.();
				cancelRelayConnect = null;
				control.close();
				relay.close();
				return;
			}
			transportCommitted = true;
			maybeSetConnected();
			return;
		}
		emitControlMessage(message);
	});
	control?.onStateChange(next => {
		controlReady = next === 'connected';
		if (next === 'degraded') {
			if (state === 'connecting' || state === 'connected' || state === 'reconnecting') {
				setState('failed');
				// A degraded control plane invalidates the authenticated relay
				// session too. Abort both pending connects so neither side can
				// publish a late `connected` event after the control failure.
				cancelRelayConnect?.();
				cancelRelayConnect = null;
				control.close();
				relay.close();
			}
			return;
		}
		maybeSetConnected();
	});

	const connect = (): Promise<void> => {
		if (state === 'connected') return Promise.resolve();
		if (connectPromise) return connectPromise;
		if (state === 'closed') return Promise.reject(new Error('WebSocket relay is closed'));

		setState('connecting');
		const connectedState = new Promise<void>((resolve, reject) => {
			const remove = onStateChange(next => {
				if (next === 'connected') {
					remove();
					resolve();
				} else if (next === 'failed' || next === 'closed') {
					remove();
					reject(new Error(`WebSocket relay ${next} before connecting`));
				}
			});
		});
		const relayConnect = new Promise<void>((resolve, reject) => {
			let settled = false;
			let cancel: (() => void) | null = null;
			const cleanup = (): void => {
				relay.off('open', onOpen);
				relay.off('close', onClose);
				relay.off('error', onError);
				if (cancelRelayConnect === cancel) cancelRelayConnect = null;
			};
			const onOpen = (): void => {
				if (settled) return;
				settled = true;
				cleanup();
				relayReady = true;
				maybeSetConnected();
				resolve();
			};
			const onClose = (): void => {
				if (settled) return;
				settled = true;
				cleanup();
				reject(new Error('WebSocket relay closed before connecting'));
			};
			const onError = (args: unknown): void => {
				if (settled) return;
				settled = true;
				cleanup();
				reject(args instanceof Error ? args : new Error('WebSocket relay failed to connect'));
			};
			cancel = onClose;
			cancelRelayConnect = cancel;

			relay.on('open', onOpen);
			relay.on('close', onClose);
			relay.on('error', onError);
			relay.connect();
		});
		const controlConnect = control?.connect() ?? Promise.resolve();
		connectPromise = Promise.all([relayConnect, controlConnect, connectedState])
			.then(() => undefined)
			.catch(error => {
				cancelRelayConnect?.();
				control?.close();
				relay.close();
				if (state !== 'closed') setState('failed');
				throw error instanceof Error ? error : new Error('P2P relay/control connection failed');
			})
			.finally(() => { connectPromise = null; });

		return connectPromise;
	};

	const onMessage = (callback: TransportMessageListener): (() => void) => {
		const listener: TransportListener = (value: unknown): void => {
			const message = parseWireMessage(value);
			if (!message) return;
			// The relay socket can open before the authenticated Control WS has
			// received bilateral `transport_committed_v1`. Never queue gameplay
			// from that window: TransportManager retains early frames until its
			// listener attaches, which would otherwise make a pre-commit frame look
			// valid after the transport becomes connected.
			if (control && !transportCommitted) {
				debug.warn('[WebSocketRelayTransport] dropped gameplay frame before transport commitment', { type: message.type });
				return;
			}
			callback(message);
		};
		relay.on('data', listener);
		return () => relay.off('data', listener);
	};

	const onStateChange = (callback: TransportStateListener): (() => void) => {
		stateListeners.add(callback);
		return () => stateListeners.delete(callback);
	};

	const baseTransport: WebSocketRelayTransport = {
		kind: 'websocket-relay' as const,
		get state(): TransportState { return state; },
		get closeReason(): TransportCloseReason { return relay.closeReason; },
		connect,
		send: (message: P2PMessage): void => {
			if (state !== 'connected' || !relay.open || !transportCommitted) {
				throw new Error('WebSocket relay is not committed for gameplay');
			}
			relay.send(message);
		},
		onMessage,
		onStateChange,
		onControlMessage: (listener: (message: P2PControlServerMessage) => void) => {
			controlMessageListeners.add(listener);
			return () => controlMessageListeners.delete(listener);
		},
		close: (): void => {
			if (state === 'closed') return;
			setState('closed');
			cancelRelayConnect?.();
			cancelRelayConnect = null;
			control?.close();
			relay.close();
		},
		get peer(): string { return relay.peer; },
		get open(): boolean { return relay.open; },
		get isHostHint(): boolean { return relay.isHostHint; },
		on: (event, listener) => relay.on(event, listener),
		off: (event, listener) => relay.off(event, listener),
	};
	if (!control) return baseTransport;
	return {
		...baseTransport,
		get state(): TransportState { return state; },
		get closeReason(): TransportCloseReason { return relay.closeReason; },
		get peer(): string { return relay.peer; },
		get open(): boolean { return relay.open; },
		get isHostHint(): boolean { return relay.isHostHint; },
		controlAvailable: true,
		sendControlMessage: (message: P2PControlClientMessage) => control.send(message),
		onControlMessage: (listener: (message: P2PControlServerMessage) => void) => {
			controlMessageListeners.add(listener);
			return () => controlMessageListeners.delete(listener);
		},
	};
}

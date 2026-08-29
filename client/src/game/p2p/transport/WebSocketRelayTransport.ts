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
} from './transportTypes';
import { createP2PControlChannel, type P2PControlChannel } from './P2PControlChannel';
import type { P2PControlClientMessage, P2PControlServerMessage } from '@shared/p2p-wire/control';

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
			transportKind: 'websocket-relay',
		})
		: null;
	const stateListeners = new Set<TransportStateListener>();
	const controlMessageListeners = new Set<(message: P2PControlServerMessage) => void>();
	let state: TransportState = 'idle';
	let connectPromise: Promise<void> | null = null;
	let relayReady = false;
	let controlReady = control === null;

	const maybeSetConnected = (): void => {
		if (relayReady && controlReady && state === 'connecting') setState('connected');
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
	relay.on('close', () => setState('failed'));
	relay.on('error', () => {
		if (state !== 'closed') setState('failed');
	});
	control?.onMessage(emitControlMessage);
	control?.onStateChange(next => {
		controlReady = next === 'connected';
		if (next === 'degraded' && state === 'connected') {
			setState('failed');
			relay.close();
		}
		maybeSetConnected();
	});

	const connect = (): Promise<void> => {
		if (state === 'connected') return Promise.resolve();
		if (connectPromise) return connectPromise;

		setState('connecting');
		const relayConnect = new Promise<void>((resolve, reject) => {
			const onOpen = (): void => {
				cleanup();
				relayReady = true;
				maybeSetConnected();
				resolve();
			};
			const onClose = (): void => {
				cleanup();
				reject(new Error('WebSocket relay closed before connecting'));
			};
			const onError = (args: unknown): void => {
				cleanup();
				reject(args instanceof Error ? args : new Error('WebSocket relay failed to connect'));
			};
			const cleanup = (): void => {
				relay.off('open', onOpen);
				relay.off('close', onClose);
				relay.off('error', onError);
				connectPromise = null;
			};

			relay.on('open', onOpen);
			relay.on('close', onClose);
			relay.on('error', onError);
			relay.connect();
		});
		const controlConnect = control?.connect() ?? Promise.resolve();
		connectPromise = Promise.all([relayConnect, controlConnect])
			.then(() => undefined)
			.catch(error => {
				control?.close();
				relay.close();
				throw error instanceof Error ? error : new Error('P2P relay/control connection failed');
			})
			.finally(() => { connectPromise = null; });

		return connectPromise;
	};

	const onMessage = (callback: TransportMessageListener): (() => void) => {
		const listener: TransportListener = (value: unknown): void => {
			const message = parseWireMessage(value);
			if (message) callback(message);
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
		connect,
		send: (message: P2PMessage): void => {
			if (state !== 'connected' || !relay.open) throw new Error('WebSocket relay is not open');
			relay.send(message);
		},
		onMessage,
		onStateChange,
		close: (): void => {
			setState('closed');
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
		controlAvailable: true,
		sendControlMessage: (message: P2PControlClientMessage) => control.send(message),
		onControlMessage: (listener: (message: P2PControlServerMessage) => void) => {
			controlMessageListeners.add(listener);
			return () => controlMessageListeners.delete(listener);
		},
	};
}

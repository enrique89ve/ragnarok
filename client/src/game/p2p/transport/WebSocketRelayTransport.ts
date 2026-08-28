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

export type WebSocketRelayTransport = GameTransport & {
	readonly peer: string;
	readonly open: boolean;
	readonly isHostHint: boolean;
	on: (event: TransportEvent, listener: TransportListener) => void;
	off: (event: TransportEvent, listener: TransportListener) => void;
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
	const stateListeners = new Set<TransportStateListener>();
	let state: TransportState = 'idle';
	let connectPromise: Promise<void> | null = null;

	const setState = (next: TransportState): void => {
		if (state === next) return;
		state = next;
		for (const listener of stateListeners) {
			try { listener(next); }
			catch (error) { debug.error('[WebSocketRelayTransport] state listener failed:', error); }
		}
	};

	relay.on('open', () => setState('connected'));
	relay.on('close', () => setState('failed'));
	relay.on('error', () => {
		if (state !== 'closed') setState('failed');
	});

	const connect = (): Promise<void> => {
		if (state === 'connected') return Promise.resolve();
		if (connectPromise) return connectPromise;

		setState('connecting');
		connectPromise = new Promise<void>((resolve, reject) => {
			const onOpen = (): void => {
				cleanup();
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

	return {
		kind: 'websocket-relay',
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
			relay.close();
		},
		get peer(): string { return relay.peer; },
		get open(): boolean { return relay.open; },
		get isHostHint(): boolean { return relay.isHostHint; },
		on: (event, listener) => relay.on(event, listener),
		off: (event, listener) => relay.off(event, listener),
	};
}

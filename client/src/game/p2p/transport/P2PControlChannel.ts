import { debug } from '../../config/debugConfig';
import {
	P2P_CONTROL_PROTOCOL_VERSION,
	P2P_CONTROL_WS_PROTOCOL,
	P2P_CONTROL_WS_PROTOCOL_PREFIX,
	parseP2PControlServerMessage,
	type P2PControlClientMessage,
	type P2PControlServerMessage,
} from '@shared/p2p-wire/control';
import type { P2PMatchTicket } from '@shared/p2pAvailability';

export type P2PControlChannelState = 'idle' | 'connecting' | 'connected' | 'degraded' | 'closed';

export type P2PControlChannel = Readonly<{
	readonly state: P2PControlChannelState;
	readonly peer: string;
	connect: () => Promise<void>;
	send: (message: P2PControlClientMessage) => void;
	onMessage: (listener: (message: P2PControlServerMessage) => void) => () => void;
	onStateChange: (listener: (state: P2PControlChannelState) => void) => () => void;
	close: () => void;
}>;

export function buildP2PControlWebSocketUrl(options: Readonly<{
	readonly controlUrl: string;
	readonly roomId: string;
	readonly peerId: string;
}>): string {
	return `${options.controlUrl}?match=${encodeURIComponent(options.roomId)}&peer=${encodeURIComponent(options.peerId)}`;
}

export function buildP2PControlWebSocketProtocols(matchTicket: P2PMatchTicket): string[] {
	return [
		P2P_CONTROL_WS_PROTOCOL,
		`${P2P_CONTROL_WS_PROTOCOL_PREFIX}${matchTicket.token}`,
	];
}

function safeConnectTimeout(value: number | undefined): number {
	if (!Number.isFinite(value)) return 10_000;
	return Math.min(30_000, Math.max(1_000, Math.floor(value ?? 10_000)));
}

export function createP2PControlChannel(options: Readonly<{
	readonly controlUrl: string;
	readonly roomId: string;
	readonly peerId: string;
	readonly matchTicket: P2PMatchTicket;
	readonly transportKind: 'webrtc' | 'websocket-relay';
	readonly connectTimeoutMs?: number;
}>): P2PControlChannel {
	const messageListeners = new Set<(message: P2PControlServerMessage) => void>();
	const stateListeners = new Set<(state: P2PControlChannelState) => void>();
	let state: P2PControlChannelState = 'idle';
	let socket: WebSocket | null = null;
	let connectPromise: Promise<void> | null = null;
	let resolveConnect: (() => void) | null = null;
	let rejectConnect: ((error: Error) => void) | null = null;
	let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
	let remotePeer = '';
	let closed = false;

	const setState = (next: P2PControlChannelState): void => {
		if (state === next) return;
		state = next;
		for (const listener of stateListeners) {
			try { listener(next); }
			catch (error) { debug.error('[P2PControlChannel] state listener failed:', error); }
		}
	};

	const clearTimeoutHandle = (): void => {
		if (!timeoutHandle) return;
		clearTimeout(timeoutHandle);
		timeoutHandle = null;
	};

	const settleConnect = (error?: Error): void => {
		clearTimeoutHandle();
		const resolve = resolveConnect;
		const reject = rejectConnect;
		resolveConnect = null;
		rejectConnect = null;
		connectPromise = null;
		if (error) reject?.(error);
		else resolve?.();
	};

	const disposeSocket = (): void => {
		try { socket?.close(); } catch { /* already closed */ }
		socket = null;
	};

	const fail = (error: Error | string): void => {
		if (closed || state === 'closed') return;
		const failure = typeof error === 'string' ? new Error(error) : error;
		if (state === 'connecting') {
			setState('degraded');
			settleConnect(failure);
			disposeSocket();
			return;
		}
		setState('degraded');
		disposeSocket();
	};

	const send = (message: P2PControlClientMessage): void => {
		if (socket?.readyState !== WebSocket.OPEN || (state !== 'connected' && state !== 'connecting')) {
			throw new Error('P2P control plane is not connected');
		}
		try { socket.send(JSON.stringify(message)); }
		catch (error) {
			fail(error instanceof Error ? error : 'P2P control message failed to send');
			throw error instanceof Error ? error : new Error('P2P control message failed to send');
		}
	};

	const emitMessage = (message: P2PControlServerMessage): void => {
		for (const listener of messageListeners) {
			try { listener(message); }
			catch (error) { debug.error('[P2PControlChannel] message listener failed:', error); }
		}
	};

	const handleMessage = (raw: unknown): void => {
		let payload: unknown = raw;
		if (typeof payload === 'string') {
			try { payload = JSON.parse(payload); }
			catch { fail('Malformed P2P control JSON'); return; }
		}
		const message = parseP2PControlServerMessage(payload);
		if (!message) {
			fail('Malformed P2P control message');
			return;
		}
		if (message.type === 'control_error_v1') {
			fail(`P2P control rejected: ${message.code}`);
			return;
		}
		if (message.type === 'control_open_v1') {
			if (message.matchId !== options.roomId
				|| message.peerId !== options.peerId
				|| message.role !== options.matchTicket.role) {
				fail('P2P control identity mismatch');
				return;
			}
			remotePeer = message.opponentPeerId;
			setState('connected');
			settleConnect();
			try {
				send({
					type: 'transport_ready_v1',
					protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
					matchId: options.roomId,
					kind: options.transportKind,
				});
			} catch { /* the peer may close immediately after control_open */ }
			return;
		}
		if (message.type === 'control_peer_left_v1') {
			emitMessage(message);
			fail('Opponent control plane left');
			return;
		}
		emitMessage(message);
	};

	const connect = (): Promise<void> => {
		if (state === 'connected') return Promise.resolve();
		if (connectPromise) return connectPromise;
		if (closed) return Promise.reject(new Error('P2P control plane is closed'));
		if (typeof WebSocket === 'undefined') return Promise.reject(new Error('WebSocket is unavailable'));

		setState('connecting');
		connectPromise = new Promise<void>((resolve, reject) => {
			resolveConnect = resolve;
			rejectConnect = reject;
			timeoutHandle = setTimeout(() => fail('P2P control plane connection timed out'), safeConnectTimeout(options.connectTimeoutMs));
			const control = new WebSocket(
				buildP2PControlWebSocketUrl(options),
				buildP2PControlWebSocketProtocols(options.matchTicket),
			);
			socket = control;
			control.onopen = () => {
				try {
					send({
						type: 'control_hello_v1',
						protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
						matchId: options.roomId,
						peerId: options.peerId,
					});
				} catch (error) {
					fail(error instanceof Error ? error : 'P2P control hello failed');
				}
			};
			control.onmessage = event => handleMessage(event.data);
			control.onerror = () => fail('P2P control plane socket error');
			control.onclose = () => {
				if (closed) return;
				if (state === 'connecting') fail('P2P control plane closed before opening');
				else setState('degraded');
			};
		});
		return connectPromise;
	};

	const close = (): void => {
		if (closed) return;
		closed = true;
		clearTimeoutHandle();
		if (state === 'connecting') settleConnect(new Error('P2P control plane closed'));
		setState('closed');
		disposeSocket();
	};

	return {
		get state(): P2PControlChannelState { return state; },
		get peer(): string { return remotePeer; },
		connect,
		send,
		onMessage: listener => {
			messageListeners.add(listener);
			return () => messageListeners.delete(listener);
		},
		onStateChange: listener => {
			stateListeners.add(listener);
			return () => stateListeners.delete(listener);
		},
		close,
	};
}

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { P2PMessage } from '../messages';
import type { P2PControlServerMessage } from '@shared/p2p-wire/control';
import { createTransportManager } from './TransportManager';
import { createTransportSession } from './transportSession';
import {
	getTransportTelemetrySnapshot,
	resetTransportTelemetryForTests,
} from './transportTelemetry';
import type {
	GameTransport,
	TransportMessageListener,
	TransportState,
	TransportStateListener,
} from './transportTypes';
import { createTransportFailure } from './transportTypes';

const ticket = {
	token: 'payload.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
	roomId: 'room-1',
	peerId: 'peer-a',
	expiresAt: Date.now() + 60_000,
	role: 'offerer' as const,
};

function fakeTransport(kind: GameTransport['kind'], connect: () => Promise<void>): {
	transport: GameTransport;
	setState: (state: TransportState) => void;
	emitMessage: (message: P2PMessage) => void;
	emitControlMessage: (message: P2PControlServerMessage) => void;
	connect: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
} {
	const messageListeners = new Set<TransportMessageListener>();
	const controlMessageListeners = new Set<(message: P2PControlServerMessage) => void>();
	const stateListeners = new Set<TransportStateListener>();
	const connectSpy = vi.fn(connect);
	const close = vi.fn();
	let state: TransportState = 'idle';
	const transport: GameTransport & {
		onControlMessage: (listener: (message: P2PControlServerMessage) => void) => () => void;
	} = {
		kind,
		get state(): TransportState { return state; },
		connect: connectSpy,
		send: vi.fn(),
		onMessage: listener => {
			messageListeners.add(listener);
			return () => messageListeners.delete(listener);
		},
		onStateChange: listener => {
			stateListeners.add(listener);
			return () => stateListeners.delete(listener);
		},
		close,
		onControlMessage: listener => {
			controlMessageListeners.add(listener);
			return () => controlMessageListeners.delete(listener);
		},
	};
	return {
		transport,
		connect: connectSpy,
		setState: next => {
			state = next;
			for (const listener of stateListeners) listener(next);
		},
		emitMessage: message => {
			for (const listener of messageListeners) listener(message);
		},
		emitControlMessage: message => {
			for (const listener of controlMessageListeners) listener(message);
		},
		close,
	};
}

function managerOptions(overrides: Partial<Parameters<typeof createTransportManager>[0]> = {}): Parameters<typeof createTransportManager>[0] {
	return {
		roomId: ticket.roomId,
		peerId: ticket.peerId,
		relayUrl: 'ws://game.test/ws/p2p',
		controlUrl: 'ws://game.test/ws/control',
		matchTicket: ticket,
		isHostHint: false,
		plan: {
			mode: 'webrtc-first',
			relayFallback: true,
			webrtcConnectMs: 20_000,
			relayConnectMs: 8_000,
		},
		session: createTransportSession(ticket.roomId),
		...overrides,
	};
}

afterEach(() => {
	vi.useRealTimers();
});

describe('TransportManager', () => {
	it('uses WebRTC when it connects and exposes the selected transport', async () => {
		resetTransportTelemetryForTests();
		const webRtc = fakeTransport('webrtc', async () => { webRtc.setState('connected'); });
		const relay = fakeTransport('websocket-relay', async () => { relay.setState('connected'); });
		const open = vi.fn();
		const manager = createTransportManager(managerOptions(), {
			createWebRTC: () => webRtc.transport,
			createRelay: () => relay.transport,
		});
		manager.on('open', open);

		await manager.connect();

		expect(manager.kind).toBe('webrtc');
		expect(manager.state).toBe('connected');
		expect(open).toHaveBeenCalledTimes(1);
		expect(relay.connect).not.toHaveBeenCalled();
		expect(getTransportTelemetrySnapshot()).toMatchObject({
			webrtcAttemptTotal: 1,
			webrtcConnectedTotal: 1,
			relayFallbackTotal: 0,
		});
	});

	it('does not derive gameplay perspective from the WebRTC offerer role', async () => {
		const webRtc = fakeTransport('webrtc', async () => { webRtc.setState('connected'); });
		const manager = createTransportManager(managerOptions({ isHostHint: true }), {
			createWebRTC: () => webRtc.transport,
		});
		const open = vi.fn();
		manager.on('open', open);

		await manager.connect();

		expect(open).toHaveBeenCalledWith({ isHost: true, remotePeerId: '' });
		expect(manager.isHostHint).toBe(true);
	});

	it('passes configured ICE servers to the WebRTC factory', async () => {
		const webRtc = fakeTransport('webrtc', async () => { webRtc.setState('connected'); });
		let receivedIceServers: unknown;
		const manager = createTransportManager(managerOptions({
			iceServers: [{ urls: 'stun:testnetdev.ragnaroknft.quest:3478' }],
		}), {
			createWebRTC: options => {
				receivedIceServers = options.iceServers;
				expect(options.connectTimeoutMs).toBe(20_000);
				return webRtc.transport;
			},
		});

		await manager.connect();

		expect(receivedIceServers).toEqual([{ urls: 'stun:testnetdev.ragnaroknft.quest:3478' }]);
	});

	it('closes an adapter that resolves without confirming connected state', async () => {
		const webRtc = fakeTransport('webrtc', async () => undefined);
		const manager = createTransportManager(managerOptions({
			plan: { mode: 'webrtc-first', relayFallback: false, webrtcConnectMs: 20_000, relayConnectMs: 8_000 },
		}), {
			createWebRTC: () => webRtc.transport,
		});

		await expect(manager.connect()).rejects.toThrow('webrtc transport did not confirm an open state');
		expect(webRtc.close).toHaveBeenCalledTimes(1);
		expect(manager.state).toBe('failed');
	});

	it('falls back to relay when WebRTC fails before the match opens', async () => {
		resetTransportTelemetryForTests();
		const webRtc = fakeTransport('webrtc', async () => { throw new Error('ICE failed'); });
		const relay = fakeTransport('websocket-relay', async () => { relay.setState('connected'); });
		const manager = createTransportManager(managerOptions(), {
			createWebRTC: () => webRtc.transport,
			createRelay: () => relay.transport,
		});

		await manager.connect();

		expect(manager.kind).toBe('websocket-relay');
		expect(manager.state).toBe('connected');
		expect(webRtc.close).toHaveBeenCalledTimes(1);
		expect(getTransportTelemetrySnapshot()).toMatchObject({
			webrtcAttemptTotal: 1,
			webrtcConnectedTotal: 0,
			webrtcFailedTotal: 1,
			relayFallbackTotal: 1,
		});
	});

	it('gives relay a fresh budget after an aggressive WebRTC timeout', async () => {
		vi.useFakeTimers();
		const webRtc = fakeTransport('webrtc', () => new Promise<void>(() => undefined));
		const relay = fakeTransport('websocket-relay', async () => { relay.setState('connected'); });
		const manager = createTransportManager(managerOptions({
			plan: { mode: 'webrtc-first', relayFallback: true, webrtcConnectMs: 5_000, relayConnectMs: 8_000 },
		}), {
			createWebRTC: () => webRtc.transport,
			createRelay: () => relay.transport,
		});

		const pending = manager.connect();
		await vi.advanceTimersByTimeAsync(5_001);
		await pending;

		expect(webRtc.close).toHaveBeenCalledTimes(1);
		expect(relay.connect).toHaveBeenCalledTimes(1);
		expect(manager.kind).toBe('websocket-relay');
	});

	it('preserves the remote fallback reason in local telemetry', async () => {
		resetTransportTelemetryForTests();
		const webRtc = fakeTransport('webrtc', async () => {
			throw createTransportFailure('Opponent selected relay transport', 'timeout');
		});
		const relay = fakeTransport('websocket-relay', async () => { relay.setState('connected'); });
		const manager = createTransportManager(managerOptions(), {
			createWebRTC: () => webRtc.transport,
			createRelay: () => relay.transport,
		});

		await manager.connect();

		expect(getTransportTelemetrySnapshot()).toMatchObject({
			webrtcFailedByReason: { timeout: 1 },
			relayFallbackByReason: { timeout: 1 },
		});
	});

	it('keeps a relay fallback sticky when a reconnect recreates the manager', async () => {
		const session = createTransportSession(ticket.roomId);
		const firstWebRtc = fakeTransport('webrtc', async () => { throw new Error('ICE failed'); });
		const firstRelay = fakeTransport('websocket-relay', async () => { firstRelay.setState('connected'); });
		const firstManager = createTransportManager(managerOptions({ session }), {
			createWebRTC: () => firstWebRtc.transport,
			createRelay: () => firstRelay.transport,
		});

		await firstManager.connect();
		firstManager.close();

		const secondWebRtc = fakeTransport('webrtc', async () => { secondWebRtc.setState('connected'); });
		const secondRelay = fakeTransport('websocket-relay', async () => { secondRelay.setState('connected'); });
		const createWebRTC = vi.fn(() => secondWebRtc.transport);
		const secondManager = createTransportManager(managerOptions({
			session,
			plan: { mode: 'relay-only', reason: 'session-relay-locked', relayConnectMs: 8_000 },
		}), {
			createWebRTC,
			createRelay: () => secondRelay.transport,
		});

		await secondManager.connect();

		expect(createWebRTC).not.toHaveBeenCalled();
		expect(secondManager.kind).toBe('websocket-relay');
	});

	it('keeps the current relay-only behavior when WebRTC is disabled', async () => {
		const webRtc = fakeTransport('webrtc', async () => { webRtc.setState('connected'); });
		const relay = fakeTransport('websocket-relay', async () => { relay.setState('connected'); });
		const createWebRTC = vi.fn(() => webRtc.transport);
		const createRelay = vi.fn(() => relay.transport);
		const manager = createTransportManager(managerOptions({
			plan: { mode: 'relay-only', reason: 'webrtc-disabled', relayConnectMs: 8_000 },
		}), {
			createWebRTC,
			createRelay,
		});

		await manager.connect();

		expect(manager.kind).toBe('websocket-relay');
		expect(createWebRTC).not.toHaveBeenCalled();
		expect(createRelay).toHaveBeenCalledTimes(1);
		expect(webRtc.connect).not.toHaveBeenCalled();
	});

	it('does not hide relay failure when fallback is disabled', async () => {
		const webRtc = fakeTransport('webrtc', async () => { throw new Error('unsupported'); });
		const relay = fakeTransport('websocket-relay', async () => { relay.setState('connected'); });
		const errors: unknown[] = [];
		const manager = createTransportManager(managerOptions({
			plan: { mode: 'webrtc-first', relayFallback: false, webrtcConnectMs: 20_000, relayConnectMs: 8_000 },
		}), {
			createWebRTC: () => webRtc.transport,
			createRelay: () => relay.transport,
		});
		manager.on('error', error => errors.push(error));

		await expect(manager.connect()).rejects.toThrow('unsupported');
		expect(relay.connect).not.toHaveBeenCalled();
		expect(errors).toHaveLength(1);
	});

	it('emits one final error when both WebRTC and relay fail', async () => {
		const webRtc = fakeTransport('webrtc', async () => { throw new Error('ICE failed'); });
		const relay = fakeTransport('websocket-relay', async () => { throw new Error('relay failed'); });
		const errors: unknown[] = [];
		const manager = createTransportManager(managerOptions(), {
			createWebRTC: () => webRtc.transport,
			createRelay: () => relay.transport,
		});
		manager.on('error', error => errors.push(error));

		await expect(manager.connect()).rejects.toThrow('relay failed');
		expect(manager.state).toBe('failed');
		expect(errors).toHaveLength(1);
	});

	it('closes the selected transport and ignores messages from a failed attempt', async () => {
		const webRtc = fakeTransport('webrtc', async () => { throw new Error('ICE failed'); });
		const relay = fakeTransport('websocket-relay', async () => { relay.setState('connected'); });
		const messages: P2PMessage[] = [];
		const manager = createTransportManager(managerOptions(), {
			createWebRTC: () => webRtc.transport,
			createRelay: () => relay.transport,
		});
		manager.onMessage(message => messages.push(message));

		await manager.connect();
		webRtc.emitMessage({ type: 'ping' });
		relay.emitMessage({ type: 'pong' });
		manager.close();

		expect(messages).toEqual([{ type: 'pong' }]);
		expect(relay.close).toHaveBeenCalledTimes(1);
		expect(manager.state).toBe('closed');
	});

	it('retains an inbound frame that arrives before the gameplay listener attaches', async () => {
		const relay = fakeTransport('websocket-relay', async () => { relay.setState('connected'); });
		const manager = createTransportManager(managerOptions({
			plan: { mode: 'relay-only', reason: 'test', relayConnectMs: 8_000 },
		}), {
			createRelay: () => relay.transport,
		});

		await manager.connect();
		// Models the relay flush/peer response racing React's useWireSync effect
		// after the socket has opened, including a VPN reconnect replacement.
		relay.emitMessage({ type: 'ping' });
		const messages: P2PMessage[] = [];
		manager.onMessage(message => messages.push(message));

		expect(messages).toEqual([{ type: 'ping' }]);
		manager.close();
	});

	it('retains referee control frames that arrive before the control listener attaches', async () => {
		const relay = fakeTransport('websocket-relay', async () => { relay.setState('connected'); });
		const manager = createTransportManager(managerOptions({
			plan: { mode: 'relay-only', reason: 'test', relayConnectMs: 8_000 },
		}), {
			createRelay: () => relay.transport,
		});

		await manager.connect();
		relay.emitControlMessage({
			type: 'poker_action_time_gate_ack_v1',
			protocolVersion: 1,
			matchId: ticket.roomId,
			turnId: 'turn-1',
			decisionId: 'decision-1',
			seq: 0,
			allowed: true,
		});
		const messages: P2PControlServerMessage[] = [];
		manager.onControlMessage(message => messages.push(message));

		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({
			type: 'poker_action_time_gate_ack_v1',
			decisionId: 'decision-1',
		});
		manager.close();
	});

	it('cancels a pending adapter connection when the manager closes', async () => {
		const webRtc = fakeTransport('webrtc', () => new Promise<void>(() => undefined));
		const manager = createTransportManager(managerOptions(), {
			createWebRTC: () => webRtc.transport,
		});

		const pending = manager.connect();
		manager.close();

		await expect(pending).rejects.toThrow('Transport manager closed');
		expect(manager.state).toBe('closed');
		expect(webRtc.close).toHaveBeenCalled();
	});
});

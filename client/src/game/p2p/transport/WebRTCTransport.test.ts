import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	buildP2PControlWebSocketProtocols,
	buildP2PControlWebSocketUrl,
	createWebRTCTransport,
} from './WebRTCTransport';
import { getTransportFailureReason } from './transportTypes';
import { P2P_CONTROL_PROTOCOL_VERSION } from '@shared/p2p-wire/control';

const ticket = {
	token: 'payload.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
	roomId: 'match-1',
	peerId: 'peer-a',
	expiresAt: Date.now() + 60_000,
	role: 'offerer' as const,
};

type FakeDataChannel = {
	readyState: 'connecting' | 'open' | 'closed';
	onopen: (() => void) | null;
	onmessage: ((event: MessageEvent<unknown>) => void) | null;
	onerror: (() => void) | null;
	onclose: (() => void) | null;
	send: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
	open: () => void;
};

type FakeControlSocket = {
	readyState: number;
	onopen: (() => void) | null;
	onmessage: ((event: MessageEvent<unknown>) => void) | null;
	onerror: (() => void) | null;
	onclose: (() => void) | null;
	sent: string[];
	send: (payload: string) => void;
	close: ReturnType<typeof vi.fn>;
	triggerOpen: () => void;
	triggerMessage: (payload: unknown) => void;
	triggerClose: () => void;
};

type FakePeerConnection = {
	connectionState: string;
	iceConnectionState: string;
	iceGatheringState: string;
	signalingState: string;
	onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null;
	ondatachannel: ((event: RTCDataChannelEvent) => void) | null;
	onconnectionstatechange: (() => void) | null;
	localDescription: FakeSessionDescription | null;
	dataChannel: FakeDataChannel | null;
	createDataChannel: ReturnType<typeof vi.fn>;
	createOffer: ReturnType<typeof vi.fn>;
	setLocalDescription: ReturnType<typeof vi.fn>;
	setRemoteDescription: ReturnType<typeof vi.fn>;
	createAnswer: ReturnType<typeof vi.fn>;
	addIceCandidate: ReturnType<typeof vi.fn>;
	getStats: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
};

type FakeSessionDescription = {
	type: 'offer' | 'answer';
	sdp: string;
};

function createFakeDataChannel(): FakeDataChannel {
	const channel: FakeDataChannel = {
		readyState: 'connecting',
		onopen: null,
		onmessage: null,
		onerror: null,
		onclose: null,
		send: vi.fn(),
		close: vi.fn(),
		open: () => {
			channel.readyState = 'open';
			channel.onopen?.();
		},
	};
	return channel;
}

function createFakePeerConnection(): FakePeerConnection {
	const connection: FakePeerConnection = {
		connectionState: 'new',
		iceConnectionState: 'new',
		iceGatheringState: 'complete',
		signalingState: 'stable',
		onicecandidate: null,
		ondatachannel: null,
		onconnectionstatechange: null,
		localDescription: null,
		dataChannel: null,
		createDataChannel: vi.fn(() => {
			connection.dataChannel = createFakeDataChannel();
			return connection.dataChannel;
		}),
		createOffer: vi.fn(async () => ({ type: 'offer', sdp: 'fake-offer' })),
		setLocalDescription: vi.fn(async (description: FakeSessionDescription) => {
			connection.localDescription = description;
		}),
		setRemoteDescription: vi.fn(async () => undefined),
		createAnswer: vi.fn(async () => ({ type: 'answer', sdp: 'fake-answer' })),
		addIceCandidate: vi.fn(async () => undefined),
		getStats: vi.fn(async () => new Map()),
		close: vi.fn(),
	};
	return connection;
}

function createFakeControlSocket(): FakeControlSocket {
	const socket: FakeControlSocket = {
		readyState: 0,
		onopen: null,
		onmessage: null,
		onerror: null,
		onclose: null,
		sent: [],
		send: payload => socket.sent.push(payload),
		close: vi.fn(),
		triggerOpen: () => {
			socket.readyState = 1;
			socket.onopen?.();
		},
		triggerMessage: payload => socket.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent<unknown>),
		triggerClose: () => {
			socket.readyState = 3;
			socket.onclose?.();
		},
	};
	return socket;
}

async function settleMicrotasks(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

function commitWebRTCTransport(socket: FakeControlSocket): void {
	socket.triggerMessage({
		type: 'transport_committed_v1',
		protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
		matchId: ticket.roomId,
		transportEpoch: 1,
		kind: 'webrtc',
	});
}

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('WebRTC transport boundary', () => {
	it('keeps the ticket in the control subprotocol and not in the URL', () => {
		const url = buildP2PControlWebSocketUrl({ controlUrl: 'wss://game.example/ws/control', roomId: ticket.roomId, peerId: ticket.peerId });
		expect(url).toBe('wss://game.example/ws/control?match=match-1&peer=peer-a');
		expect(url).not.toContain(ticket.token);
		expect(buildP2PControlWebSocketProtocols(ticket)).toHaveLength(2);
	});

	it('starts idle and exposes the canonical GameTransport shape', () => {
		const transport = createWebRTCTransport({ controlUrl: 'wss://game.example/ws/control', roomId: ticket.roomId, peerId: ticket.peerId, matchTicket: ticket });
		expect(transport.kind).toBe('webrtc');
		expect(transport.state).toBe('idle');
		expect(transport.peer).toBe('');
		transport.close();
		expect(transport.state).toBe('closed');
	});

	it('cancels the connect timeout after the DataChannel becomes connected', async () => {
		vi.useFakeTimers();
		const socket = createFakeControlSocket();
		const connection = createFakePeerConnection();
		let receivedIceServers: readonly unknown[] | undefined;
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);
		vi.stubGlobal('RTCPeerConnection', vi.fn(function RTCPeerConnectionMock(configuration: { readonly iceServers?: readonly unknown[] }) {
			receivedIceServers = configuration.iceServers;
			return connection;
		}));

		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
			iceServers: [{ urls: 'stun:testnetdev.ragnaroknft.quest:3478' }],
			connectTimeoutMs: 1_000,
		});
		const messages: string[] = [];
		transport.onMessage(message => messages.push(message.type));
		const pending = transport.connect();
		socket.triggerOpen();
		socket.triggerMessage({
			type: 'control_open_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			peerId: ticket.peerId,
			opponentPeerId: 'peer-b',
			role: 'offerer',
			transportEpoch: 1,
		});
		await settleMicrotasks();
		connection.dataChannel?.open();
		await settleMicrotasks();
		expect(transport.state).toBe('connecting');
		connection.dataChannel?.onmessage?.({ data: JSON.stringify({ type: 'ping' }) } as MessageEvent<unknown>);
		expect(messages).toEqual([]);
		expect(() => transport.send({ type: 'ping' })).toThrow('not committed');
		commitWebRTCTransport(socket);
		await pending;
		connection.dataChannel?.onmessage?.({ data: JSON.stringify({ type: 'ping' }) } as MessageEvent<unknown>);
		expect(messages).toEqual(['ping']);
		await vi.advanceTimersByTimeAsync(2_000);
		connection.getStats.mockResolvedValue(new Map([
			['pair-1', {
				type: 'candidate-pair',
				id: 'pair-1',
				state: 'succeeded',
				selected: true,
				localCandidateId: 'local-1',
				remoteCandidateId: 'remote-1',
				protocol: 'udp',
				currentRoundTripTime: 0.042,
				bytesSent: 1024,
				bytesReceived: 2048,
			}],
			['local-1', { type: 'local-candidate', id: 'local-1', candidateType: 'relay', protocol: 'udp' }],
			['remote-1', { type: 'remote-candidate', id: 'remote-1', candidateType: 'srflx' }],
		]));

		expect(transport.state).toBe('connected');
		expect(receivedIceServers).toEqual([{ urls: 'stun:testnetdev.ragnaroknft.quest:3478' }]);
		expect(connection.dataChannel).toEqual(expect.any(Object));
		expect(connection.dataChannel?.readyState).toBe('open');
		await expect(transport.getStats()).resolves.toMatchObject({
			connectionState: 'new',
			iceConnectionState: 'new',
			candidatePair: {
				localCandidateType: 'relay',
				remoteCandidateType: 'srflx',
				protocol: 'udp',
				currentRoundTripTimeMs: 42,
				bytesSent: 1024,
				bytesReceived: 2048,
			},
		});
	});

	it('announces transport readiness before publishing connected state', async () => {
		const socket = createFakeControlSocket();
		const connection = createFakePeerConnection();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);
		vi.stubGlobal('RTCPeerConnection', vi.fn(function RTCPeerConnectionMock() { return connection; }));
		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});
		const observedStates: string[] = [];
		transport.onStateChange(next => observedStates.push(next));
		const pending = transport.connect();
		socket.triggerOpen();
		socket.triggerMessage({
			type: 'control_open_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			peerId: ticket.peerId,
			opponentPeerId: 'peer-b',
			role: 'offerer',
			transportEpoch: 1,
		});
		await settleMicrotasks();
		connection.dataChannel?.open();
		commitWebRTCTransport(socket);
		await pending;

		expect(socket.sent.map(payload => JSON.parse(payload))).toContainEqual(expect.objectContaining({ type: 'transport_ready_v1' }));
		expect(observedStates).toEqual(['connecting', 'connected']);
	});

	it('forwards Poker time-gate acknowledgements through the control listener', async () => {
		const socket = createFakeControlSocket();
		const connection = createFakePeerConnection();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);
		vi.stubGlobal('RTCPeerConnection', vi.fn(function RTCPeerConnectionMock() { return connection; }));

		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});
		const controlMessages: string[] = [];
		transport.onControlMessage(message => controlMessages.push(message.type));
		const pending = transport.connect();
		socket.triggerOpen();
		socket.triggerMessage({
			type: 'control_open_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			peerId: ticket.peerId,
			opponentPeerId: 'peer-b',
			role: 'offerer',
			transportEpoch: 1,
		});
		await settleMicrotasks();
		connection.dataChannel?.open();
		commitWebRTCTransport(socket);
		await pending;

		socket.triggerMessage({
			type: 'poker_action_time_gate_ack_v1',
			protocolVersion: 1,
			matchId: ticket.roomId,
			turnId: 'combat-1:faith:peer-a:0',
			decisionId: 'decision-1',
			seq: 0,
			allowed: true,
		});

		expect(controlMessages).toEqual(['poker_action_time_gate_ack_v1']);
		transport.close();
	});

	it('notifies the opponent before failing a pre-connect timeout', async () => {
		vi.useFakeTimers();
		const socket = createFakeControlSocket();
		const connection = createFakePeerConnection();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);
		vi.stubGlobal('RTCPeerConnection', vi.fn(function RTCPeerConnectionMock() { return connection; }));

		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
			connectTimeoutMs: 1_000,
		});
		const pending = transport.connect();
		socket.triggerOpen();
		const rejected = expect(pending).rejects.toThrow('timed out');
		await vi.advanceTimersByTimeAsync(1_001);

		await rejected;
		expect(socket.sent.map(payload => JSON.parse(payload))).toContainEqual(expect.objectContaining({
			type: 'transport_fallback_v1',
			reason: 'timeout',
		}));
	});

	it('adopts the peer relay decision before the DataChannel connects', async () => {
		const socket = createFakeControlSocket();
		const connection = createFakePeerConnection();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);
		vi.stubGlobal('RTCPeerConnection', vi.fn(function RTCPeerConnectionMock() { return connection; }));

		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});
		const pending = transport.connect();
		socket.triggerMessage({
			type: 'transport_fallback_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			transportEpoch: 1,
			reason: 'ice_failed',
		});

		const error = await pending.then(() => null, rejection => rejection);
		expect(error).toBeInstanceOf(Error);
		expect(error).toMatchObject({ message: 'Opponent selected relay transport' });
		expect(getTransportFailureReason(error)).toBe('ice_failed');
		expect(socket.sent.map(payload => JSON.parse(payload))).not.toContainEqual(expect.objectContaining({ type: 'transport_fallback_v1' }));
	});

	it('fails WebRTC when Control WS closes before the DataChannel connects', async () => {
		const socket = createFakeControlSocket();
		const connection = createFakePeerConnection();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);
		vi.stubGlobal('RTCPeerConnection', vi.fn(function RTCPeerConnectionMock() { return connection; }));

		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});
		const pending = transport.connect();
		socket.triggerClose();

		await expect(pending).rejects.toThrow('Control WebSocket closed');
		expect(transport.state).toBe('failed');
	});

	it('reconnects the full session when Control WS closes after connection', async () => {
		const socket = createFakeControlSocket();
		const connection = createFakePeerConnection();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);
		vi.stubGlobal('RTCPeerConnection', vi.fn(function RTCPeerConnectionMock() { return connection; }));

		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});
		const pending = transport.connect();
		socket.triggerOpen();
		socket.triggerMessage({
			type: 'control_open_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			peerId: ticket.peerId,
			opponentPeerId: 'peer-b',
			role: 'offerer',
			transportEpoch: 1,
		});
		await settleMicrotasks();
		connection.dataChannel?.open();
		commitWebRTCTransport(socket);
		await pending;

		socket.triggerMessage({
			type: 'control_error_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			code: 'protocol',
		});
		socket.triggerMessage({ type: 'unexpected_control_message' });
		await settleMicrotasks();

		expect(transport.state).toBe('failed');
		expect(transport.controlState).toBe('closed');
		expect(connection.dataChannel?.close).toHaveBeenCalled();

		socket.triggerClose();

		expect(transport.state).toBe('failed');
		expect(transport.controlState).toBe('closed');
	});

	it('reconnects the full session when control_peer_left arrives after connection', async () => {
		const socket = createFakeControlSocket();
		const connection = createFakePeerConnection();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);
		vi.stubGlobal('RTCPeerConnection', vi.fn(function RTCPeerConnectionMock() { return connection; }));

		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});
		const pending = transport.connect();
		socket.triggerOpen();
		socket.triggerMessage({
			type: 'control_open_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			peerId: ticket.peerId,
			opponentPeerId: 'peer-b',
			role: 'offerer',
			transportEpoch: 1,
		});
		await settleMicrotasks();
		connection.dataChannel?.open();
		commitWebRTCTransport(socket);
		await pending;

		socket.triggerMessage({
			type: 'control_peer_left_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			opponentPeerId: 'peer-b',
		});

		expect(transport.state).toBe('failed');
		expect(transport.controlState).toBe('closed');
		expect(connection.dataChannel?.close).toHaveBeenCalled();
		expect(connection.close).toHaveBeenCalled();
	});

	it('keeps the Control WebSocket and destroys gameplay transport on transport_reset_v2', async () => {
		const socket = createFakeControlSocket();
		const connection = createFakePeerConnection();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);
		vi.stubGlobal('RTCPeerConnection', vi.fn(function RTCPeerConnectionMock() { return connection; }));

		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});
		const pending = transport.connect();
		socket.triggerOpen();
		socket.triggerMessage({
			type: 'control_open_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			peerId: ticket.peerId,
			opponentPeerId: 'peer-b',
			role: 'offerer',
			transportEpoch: 1,
		});
		await settleMicrotasks();
		connection.dataChannel?.open();
		commitWebRTCTransport(socket);
		await pending;

		socket.triggerMessage({
			type: 'transport_reset_v2',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			transportEpoch: 2,
			reason: 'peer_reconnected',
			opponentPeerId: 'peer-a',
		});

		expect(transport.state).toBe('reconnecting');
		expect(transport.controlState).toBe('connected');
		expect(connection.dataChannel?.close).toHaveBeenCalled();
		expect(connection.close).toHaveBeenCalled();
		expect(socket.close).not.toHaveBeenCalled();
	});

	it('fails WebRTC when control_peer_left arrives before connection', async () => {
		const socket = createFakeControlSocket();
		const connection = createFakePeerConnection();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);
		vi.stubGlobal('RTCPeerConnection', vi.fn(function RTCPeerConnectionMock() { return connection; }));

		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});
		const pending = transport.connect();
		socket.triggerMessage({
			type: 'control_peer_left_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			opponentPeerId: 'peer-b',
		});

		await expect(pending).rejects.toThrow('Control peer left before WebRTC connection completed');
		expect(transport.state).toBe('failed');
	});

	it('fails closed when send is attempted without an open DataChannel', () => {
		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});

		expect(() => transport.send({ type: 'ping' })).toThrow('WebRTC DataChannel is not open');
	});

	it('surfaces a failed control send to gameplay callers', () => {
		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});

		expect(() => transport.sendControlMessage({
			type: 'transport_ready_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			transportEpoch: 1,
			kind: 'webrtc',
		})).toThrow('Control WebSocket send failed');
		expect(transport.state).toBe('failed');
	});

	it('rethrows a DataChannel send failure after marking the game transport failed', async () => {
		const socket = createFakeControlSocket();
		const connection = createFakePeerConnection();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);
		vi.stubGlobal('RTCPeerConnection', vi.fn(function RTCPeerConnectionMock() { return connection; }));

		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});
		const pending = transport.connect();
		socket.triggerOpen();
		socket.triggerMessage({
			type: 'control_open_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			peerId: ticket.peerId,
			opponentPeerId: 'peer-b',
			role: 'offerer',
			transportEpoch: 1,
		});
		await settleMicrotasks();
		connection.dataChannel?.open();
		commitWebRTCTransport(socket);
		await pending;
		connection.dataChannel?.send.mockImplementation(() => { throw new Error('send exploded'); });

		expect(() => transport.send({ type: 'ping' })).toThrow('send exploded');
		expect(transport.state).toBe('failed');
	});

	it('lets only the offerer create an SDP offer', async () => {
		const answererTicket = { ...ticket, role: 'answerer' as const };
		const socket = createFakeControlSocket();
		const connection = createFakePeerConnection();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);
		vi.stubGlobal('RTCPeerConnection', vi.fn(function RTCPeerConnectionMock() { return connection; }));

		const transport = createWebRTCTransport({
			controlUrl: 'wss://game.example/ws/control',
			roomId: answererTicket.roomId,
			peerId: answererTicket.peerId,
			matchTicket: answererTicket,
		});
		const pending = transport.connect();
		socket.triggerOpen();
		socket.triggerMessage({
			type: 'control_open_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: answererTicket.roomId,
			peerId: answererTicket.peerId,
			opponentPeerId: 'peer-b',
			role: 'answerer',
			transportEpoch: 1,
		});
		await settleMicrotasks();

		expect(connection.createDataChannel).not.toHaveBeenCalled();
		expect(connection.createOffer).not.toHaveBeenCalled();
		transport.close();
		await expect(pending).rejects.toThrow('WebRTC transport closed before connecting');
	});
});

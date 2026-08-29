import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	buildP2PControlWebSocketProtocols,
	buildP2PControlWebSocketUrl,
	createWebRTCTransport,
} from './WebRTCTransport';
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
		const pending = transport.connect();
		socket.triggerOpen();
		socket.triggerMessage({
			type: 'control_open_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			peerId: ticket.peerId,
			opponentPeerId: 'peer-b',
			role: 'offerer',
		});
		await settleMicrotasks();
		connection.dataChannel?.open();
		await pending;
		await vi.advanceTimersByTimeAsync(2_000);

		expect(transport.state).toBe('connected');
		expect(receivedIceServers).toEqual([{ urls: 'stun:testnetdev.ragnaroknft.quest:3478' }]);
		expect(connection.dataChannel).toEqual(expect.any(Object));
		expect(connection.dataChannel?.readyState).toBe('open');
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
			reason: 'ice_failed',
		});

		await expect(pending).rejects.toThrow('Opponent selected relay transport');
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

	it('keeps the DataChannel alive when Control WS closes after connection', async () => {
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
		});
		await settleMicrotasks();
		connection.dataChannel?.open();
		await pending;

		socket.triggerClose();

		expect(transport.state).toBe('connected');
		expect(transport.controlState).toBe('degraded');
		expect(connection.dataChannel?.readyState).toBe('open');
	});

	it('isolates control_peer_left after connection from the game transport', async () => {
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
		});
		await settleMicrotasks();
		connection.dataChannel?.open();
		await pending;

		socket.triggerMessage({
			type: 'control_peer_left_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			opponentPeerId: 'peer-b',
		});

		expect(transport.state).toBe('connected');
		expect(transport.controlState).toBe('degraded');
		expect(connection.dataChannel?.close).not.toHaveBeenCalled();
		expect(connection.close).not.toHaveBeenCalled();
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
		});
		await settleMicrotasks();
		connection.dataChannel?.open();
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
		});
		await settleMicrotasks();

		expect(connection.createDataChannel).not.toHaveBeenCalled();
		expect(connection.createOffer).not.toHaveBeenCalled();
		transport.close();
		await expect(pending).rejects.toThrow('WebRTC transport closed before connecting');
	});
});

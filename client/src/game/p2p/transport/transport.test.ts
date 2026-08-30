import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWebSocketRelayTransport } from './WebSocketRelayTransport';
import { isTransportConnected } from './transportTypes';

type FakeSocket = {
	readonly sent: string[];
	readonly open: () => void;
	readonly openRelay: () => void;
	readonly receive: (message: unknown) => void;
};

class FakeWebSocket {
	static readonly OPEN = 1;
	static readonly CONNECTING = 0;
	static readonly CLOSED = 3;
	static instances: FakeWebSocket[] = [];
	readonly sent: string[] = [];
	readyState = FakeWebSocket.CONNECTING;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: (() => void) | null = null;
	onclose: ((event: CloseEvent) => void) | null = null;
	onopen: (() => void) | null = null;

	constructor(_url: string, _protocols: string[]) {
		FakeWebSocket.instances.push(this);
	}

	send(value: string): void {
		this.sent.push(value);
	}

	close(): void {
		this.readyState = FakeWebSocket.CLOSED;
		this.onclose?.({ code: 1000, reason: 'closed' } as CloseEvent);
	}

	open(): void {
		this.readyState = FakeWebSocket.OPEN;
		this.onopen?.();
	}

	openRelay(): void {
		this.open();
		this.onmessage?.({
			data: JSON.stringify({ type: '__sys', event: 'open', isHost: true, remotePeerId: 'peer-b' }),
		} as MessageEvent);
	}

	receive(message: unknown): void {
		this.onmessage?.({ data: JSON.stringify(message) } as MessageEvent);
	}
}

function latestSocket(): FakeSocket {
	const socket = FakeWebSocket.instances.at(-1);
	if (!socket) throw new Error('fake websocket was not created');
	return socket;
}

describe('GameTransport relay adapter', () => {
	afterEach(() => {
		FakeWebSocket.instances = [];
		vi.unstubAllGlobals();
	});

	it('keeps transport state separate from battle readiness', () => {
		expect(isTransportConnected('connected')).toBe(true);
		expect(isTransportConnected('failed')).toBe(false);
		expect(isTransportConnected('closed')).toBe(false);
	});

	it('adapts the known-good relay and validates incoming messages', async () => {
		vi.stubGlobal('WebSocket', FakeWebSocket);
		const transport = createWebSocketRelayTransport({
			url: 'ws://game.test/ws/p2p',
			roomId: 'room-1',
			peerId: 'peer-a',
		});
		const states: string[] = [];
		const messages: string[] = [];
		transport.onStateChange((state) => states.push(state));
		transport.onMessage((message) => messages.push(message.type));

		const connected = transport.connect();
		latestSocket().openRelay();
		await connected;

		expect(transport.kind).toBe('websocket-relay');
		expect(transport.state).toBe('connected');
		expect(transport.peer).toBe('peer-b');
		expect(transport.isHostHint).toBe(true);

		latestSocket().receive({ type: 'ping' });
		latestSocket().receive({ type: 'unknown_message' });
		transport.send({ type: 'pong' });

		expect(messages).toEqual(['ping']);
		expect(JSON.parse(latestSocket().sent[0] ?? '{}')).toEqual({ type: 'pong' });

		transport.close();
		expect(transport.state).toBe('closed');
		expect(transport.closeReason).toBe('local');
		expect(states).toEqual(['connecting', 'connected', 'closed']);
	});

	it('preserves the relay server close as an opponent disconnect', async () => {
		vi.stubGlobal('WebSocket', FakeWebSocket);
		const transport = createWebSocketRelayTransport({
			url: 'ws://game.test/ws/p2p',
			roomId: 'room-1',
			peerId: 'peer-a',
		});

		const connected = transport.connect();
		latestSocket().openRelay();
		await connected;
		latestSocket().receive({ type: '__sys', event: 'close' });

		expect(transport.closeReason).toBe('opponent');
		expect(transport.state).toBe('failed');
	});

	it('announces relay transport readiness only after relay and Control WS are both ready', async () => {
		vi.stubGlobal('WebSocket', FakeWebSocket);
		const transport = createWebSocketRelayTransport({
			url: 'ws://game.test/ws/p2p',
			controlUrl: 'ws://game.test/ws/control',
			roomId: 'room-1',
			peerId: 'peer-a',
			matchTicket: {
				token: 'ticket',
				roomId: 'room-1',
				peerId: 'peer-a',
				expiresAt: Date.now() + 60_000,
				role: 'offerer',
			},
		});

		const connected = transport.connect();
		const relaySocket = FakeWebSocket.instances[0];
		const controlSocket = FakeWebSocket.instances[1];
		if (!relaySocket || !controlSocket) throw new Error('Expected relay and control sockets');

		controlSocket.open();
		controlSocket.receive({
			type: 'control_open_v1',
			protocolVersion: 1,
			matchId: 'room-1',
			peerId: 'peer-a',
			opponentPeerId: 'peer-b',
			role: 'offerer',
		});
		await Promise.resolve();
		expect(controlSocket.sent.map(value => JSON.parse(value).type)).not.toContain('transport_ready_v1');

		relaySocket.openRelay();
		await connected;

		const sentTypes = controlSocket.sent.map(value => JSON.parse(value).type);
		expect(sentTypes.filter(type => type === 'transport_ready_v1')).toHaveLength(1);
		expect(transport.state).toBe('connected');
		transport.close();
	});

	it('fails and closes the relay when Control WS degrades during connection', async () => {
		vi.stubGlobal('WebSocket', FakeWebSocket);
		const transport = createWebSocketRelayTransport({
			url: 'ws://game.test/ws/p2p',
			controlUrl: 'ws://game.test/ws/control',
			roomId: 'room-1',
			peerId: 'peer-a',
			matchTicket: {
				token: 'ticket',
				roomId: 'room-1',
				peerId: 'peer-a',
				expiresAt: Date.now() + 60_000,
				role: 'offerer',
			},
		});

		const connected = transport.connect();
		const relaySocket = FakeWebSocket.instances[0];
		const controlSocket = FakeWebSocket.instances[1];
		if (!relaySocket || !controlSocket) throw new Error('Expected relay and control sockets');

		controlSocket.open();
		controlSocket.receive({
			type: 'control_open_v1',
			protocolVersion: 1,
			matchId: 'room-1',
			peerId: 'peer-a',
			opponentPeerId: 'peer-b',
			role: 'offerer',
		});
		controlSocket.close();

		await expect(connected).rejects.toThrow();
		expect(transport.state).toBe('failed');
		expect(relaySocket.readyState).toBe(FakeWebSocket.CLOSED);
	});

	it('rejects a pending connect when closed before relay readiness', async () => {
		vi.stubGlobal('WebSocket', FakeWebSocket);
		const transport = createWebSocketRelayTransport({
			url: 'ws://game.test/ws/p2p',
			roomId: 'room-1',
			peerId: 'peer-a',
		});

		const connected = transport.connect();
		transport.close();

		await expect(connected).rejects.toThrow('closed');
		expect(transport.state).toBe('closed');
		await expect(transport.connect()).rejects.toThrow('closed');
	});
});

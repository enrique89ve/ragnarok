import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	buildP2PControlWebSocketProtocols,
	buildP2PControlWebSocketUrl,
	createP2PControlChannel,
} from './P2PControlChannel';
import { P2P_CONTROL_PROTOCOL_VERSION } from '@shared/p2p-wire/control';

const ticket = {
	token: 'payload.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
	roomId: 'match-1',
	peerId: 'peer-a',
	expiresAt: Date.now() + 60_000,
	role: 'offerer' as const,
};

type FakeSocket = {
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
};

function createFakeSocket(): FakeSocket {
	const socket: FakeSocket = {
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
	};
	return socket;
}

async function settleMicrotasks(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

afterEach(() => vi.unstubAllGlobals());

describe('P2P control channel', () => {
	it('keeps the ticket in the subprotocol and delivers referee messages', async () => {
		const socket = createFakeSocket();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);

		const received: unknown[] = [];
		const channel = createP2PControlChannel({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});
		channel.onMessage(message => received.push(message));
		const pending = channel.connect();
		socket.triggerOpen();
		socket.triggerMessage({
			type: 'control_open_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			peerId: ticket.peerId,
			opponentPeerId: 'peer-b',
			role: 'offerer',
		});
		await pending;

		socket.triggerMessage({
			type: 'phase_checkpoint_dispute_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			scope: 'round-boundary',
			roomId: ticket.roomId,
			matchId: ticket.roomId,
			epoch: 1,
			reason: 'peer_mismatch',
		});

		const sent = socket.sent.map(payload => JSON.parse(payload) as Record<string, unknown>);
		expect(buildP2PControlWebSocketUrl({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
		})).not.toContain(ticket.token);
		expect(buildP2PControlWebSocketProtocols(ticket)).toHaveLength(2);
		expect(sent).toContainEqual(expect.objectContaining({ type: 'control_hello_v1' }));
		expect(sent).not.toContainEqual(expect.objectContaining({ type: 'transport_ready_v1' }));
		expect(received).toHaveLength(1);
		channel.close();
		socket.triggerMessage({
			type: 'control_open_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			peerId: ticket.peerId,
			opponentPeerId: 'peer-b',
			role: 'offerer',
		});
		expect(channel.state).toBe('closed');
	});

	it('fails closed when the authenticated control identity does not match', async () => {
		const socket = createFakeSocket();
		const WebSocketConstructor = vi.fn(function WebSocketMock() { return socket; });
		Object.assign(WebSocketConstructor, { OPEN: 1 });
		vi.stubGlobal('WebSocket', WebSocketConstructor);

		const channel = createP2PControlChannel({
			controlUrl: 'wss://game.example/ws/control',
			roomId: ticket.roomId,
			peerId: ticket.peerId,
			matchTicket: ticket,
		});
		const pending = channel.connect();
		socket.triggerOpen();
		socket.triggerMessage({
			type: 'control_open_v1',
			protocolVersion: P2P_CONTROL_PROTOCOL_VERSION,
			matchId: ticket.roomId,
			peerId: 'peer-forged',
			opponentPeerId: 'peer-b',
			role: 'offerer',
		});

		await expect(pending).rejects.toThrow('identity mismatch');
		await settleMicrotasks();
		expect(channel.state).toBe('degraded');
	});
});

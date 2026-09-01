import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import WebSocket, { type RawData } from 'ws';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	P2P_MATCH_TICKET_WS_PROTOCOL,
	P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX,
	type P2PMatchTicket,
} from '../../shared/p2pAvailability';
import { attachP2PRelay, getP2PRelayStats } from './p2pRelay';
import { buildP2PMatchTicket } from '../services/p2pMatchTicketSigner';
import {
	clearStarterCeremonyClaimsForTests,
	setStarterCeremonyClaim,
} from '../services/starterClaimRegistry';

const envSnapshot = {
	NODE_ENV: process.env.NODE_ENV,
	VITE_NETWORK_STAGE: process.env.VITE_NETWORK_STAGE,
	P2P_CHALLENGE_SIGNING_SECRET: process.env.P2P_CHALLENGE_SIGNING_SECRET,
};

function restoreEnv(): void {
	for (const [key, value] of Object.entries(envSnapshot)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
}

function parseJsonRecord(raw: RawData): Record<string, unknown> | null {
	const text = typeof raw === 'string'
		? raw
		: Buffer.isBuffer(raw)
			? raw.toString('utf8')
			: Array.isArray(raw)
				? Buffer.concat(raw).toString('utf8')
				: Buffer.from(raw).toString('utf8');
	try {
		const parsed: unknown = JSON.parse(text);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}

function relayProtocols(ticket: P2PMatchTicket): string[] {
	return [
		P2P_MATCH_TICKET_WS_PROTOCOL,
		`${P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX}${ticket.token}`,
	];
}

function waitForRelayOpen(socket: WebSocket): Promise<void> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error('relay open timeout'));
		}, 5_000);
		const cleanup = () => {
			clearTimeout(timeout);
			socket.off('message', onMessage);
			socket.off('error', onError);
			socket.off('close', onClose);
		};
		const onMessage = (raw: RawData) => {
			const message = parseJsonRecord(raw);
			if (!message || message.type !== '__sys' || message.event !== 'open') return;
			cleanup();
			resolve();
		};
		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};
		const onClose = () => {
			cleanup();
			reject(new Error('relay closed before open'));
		};
		socket.on('message', onMessage);
		socket.once('error', onError);
		socket.once('close', onClose);
	});
}

function waitForRelayError(socket: WebSocket, reason: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error(`relay error timeout: ${reason}`));
		}, 5_000);
		const cleanup = () => {
			clearTimeout(timeout);
			socket.off('message', onMessage);
			socket.off('error', onError);
		};
		const onMessage = (raw: RawData) => {
			const message = parseJsonRecord(raw);
			if (!message || message.type !== '__sys' || message.event !== 'error' || message.reason !== reason) return;
			cleanup();
			resolve();
		};
		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};
		socket.on('message', onMessage);
		socket.once('error', onError);
	});
}

function waitForApplicationMessage(socket: WebSocket): Promise<Record<string, unknown>> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error('relay application message timeout'));
		}, 5_000);
		const cleanup = () => {
			clearTimeout(timeout);
			socket.off('message', onMessage);
			socket.off('error', onError);
		};
		const onMessage = (raw: RawData) => {
			const message = parseJsonRecord(raw);
			if (!message || message.type === '__sys') return;
			cleanup();
			resolve(message);
		};
		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};
		socket.on('message', onMessage);
		socket.once('error', onError);
	});
}

function waitForRelaySystemEvent(socket: WebSocket, event: string): Promise<Record<string, unknown>> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error(`relay system event timeout: ${event}`));
		}, 5_000);
		const cleanup = () => {
			clearTimeout(timeout);
			socket.off('message', onMessage);
			socket.off('error', onError);
		};
		const onMessage = (raw: RawData) => {
			const message = parseJsonRecord(raw);
			if (!message || message.type !== '__sys' || message.event !== event) return;
			cleanup();
			resolve(message);
		};
		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};
		socket.on('message', onMessage);
		socket.once('error', onError);
	});
}

function waitForNoRelaySystemEvent(socket: WebSocket, event: string, durationMs = 250): Promise<void> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			resolve();
		}, durationMs);
		const cleanup = () => {
			clearTimeout(timeout);
			socket.off('message', onMessage);
			socket.off('error', onError);
		};
		const onMessage = (raw: RawData) => {
			const message = parseJsonRecord(raw);
			if (message?.type === '__sys' && message.event === event) {
				cleanup();
				reject(new Error(`unexpected relay system event: ${event}`));
			}
		};
		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};
		socket.on('message', onMessage);
		socket.once('error', onError);
	});
}

function closeSocket(socket: WebSocket): Promise<void> {
	if (socket.readyState === WebSocket.CLOSED) return Promise.resolve();
	return new Promise(resolve => {
		socket.once('close', () => resolve());
		if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
		else resolve();
	});
}

async function listenOnEphemeralPort(server: Server): Promise<number> {
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			server.off('error', reject);
			resolve();
		});
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Expected TCP server address');
	return (address as AddressInfo).port;
}

function ticketFor(roomId: string, peerId: string, account: string): P2PMatchTicket {
	return buildP2PMatchTicket({
		roomId,
		peerId,
		account,
		scope: 'direct-challenge',
	});
}

describe('p2pRelay reconnect identity', () => {
	const sockets: WebSocket[] = [];
	const servers: Server[] = [];

	beforeEach(() => {
		process.env.NODE_ENV = 'test';
		process.env.VITE_NETWORK_STAGE = 'testnet';
		process.env.P2P_CHALLENGE_SIGNING_SECRET = 'reconnect-integration-secret-32-characters';
		clearStarterCeremonyClaimsForTests();
	});

	afterEach(async () => {
		await Promise.all(sockets.map(closeSocket));
		sockets.length = 0;
		await Promise.all(servers.map(server => new Promise<void>(resolve => server.close(() => resolve()))));
		servers.length = 0;
		clearStarterCeremonyClaimsForTests();
		restoreEnv();
	});

	it('replaces a half-open socket for the same ticket without dropping the room', async () => {
		await setStarterCeremonyClaim('alice', 1_800_000_000_000);
		await setStarterCeremonyClaim('bob', 1_800_000_000_000);
		const server = createServer();
		servers.push(server);
		attachP2PRelay(server);
		const port = await listenOnEphemeralPort(server);
		const roomId = 'relay-reconnect-room';
		const peerOneId = 'relay-reconnect-a';
		const peerTwoId = 'relay-reconnect-b';
		const peerOneTicket = ticketFor(roomId, peerOneId, 'alice');
		const peerTwoTicket = ticketFor(roomId, peerTwoId, 'bob');
		const makeSocket = (peerId: string, ticket: P2PMatchTicket, forwardedFor?: string): WebSocket => {
			const socket = new WebSocket(
				`ws://127.0.0.1:${port}/ws/p2p?room=${roomId}&peer=${peerId}`,
				relayProtocols(ticket),
				forwardedFor ? { headers: { 'x-forwarded-for': forwardedFor } } : undefined,
			);
			sockets.push(socket);
			return socket;
		};

		const firstSocket = makeSocket(peerOneId, peerOneTicket, '203.0.113.10');
		const secondSocket = makeSocket(peerTwoId, peerTwoTicket);
		await Promise.all([waitForRelayOpen(firstSocket), waitForRelayOpen(secondSocket)]);
		expect(getP2PRelayStats().activeConnections).toBe(2);
		const staleCloseEvents: Record<string, unknown>[] = [];
		const observeSystemEvents = (raw: RawData) => {
			const message = parseJsonRecord(raw);
			if (message?.type === '__sys') staleCloseEvents.push(message);
		};
		secondSocket.on('message', observeSystemEvents);

		// Keep firstSocket open to model a VPN/NIC change where the server has not
		// received a clean close before the browser retries the same match.
		const replacementSocket = makeSocket(peerOneId, peerOneTicket, '198.51.100.42');
		await waitForRelayOpen(replacementSocket);
		expect(getP2PRelayStats().activeConnections).toBe(2);

		const received = waitForApplicationMessage(secondSocket);
		replacementSocket.send(JSON.stringify({ type: 'ping', sequence: 2 }));
		await expect(received).resolves.toMatchObject({ type: 'ping', sequence: 2 });
		await new Promise(resolve => setTimeout(resolve, 50));
		expect(staleCloseEvents.some(event => event.event === 'close')).toBe(false);
		secondSocket.off('message', observeSystemEvents);
	});

	it('rejects a different ticket for the same peer without evicting the authenticated member', async () => {
		await setStarterCeremonyClaim('alice', 1_800_000_000_000);
		await setStarterCeremonyClaim('bob', 1_800_000_000_000);
		await setStarterCeremonyClaim('mallory', 1_800_000_000_000);
		const server = createServer();
		servers.push(server);
		attachP2PRelay(server);
		const port = await listenOnEphemeralPort(server);
		const roomId = 'relay-ticket-reject-room';
		const peerOneId = 'relay-ticket-reject-a';
		const peerTwoId = 'relay-ticket-reject-b';
		const aliceTicket = ticketFor(roomId, peerOneId, 'alice');
		const bobTicket = ticketFor(roomId, peerTwoId, 'bob');
		const malloryTicket = ticketFor(roomId, peerOneId, 'mallory');
		const makeSocket = (peerId: string, ticket: P2PMatchTicket): WebSocket => {
			const socket = new WebSocket(
				`ws://127.0.0.1:${port}/ws/p2p?room=${roomId}&peer=${peerId}`,
				relayProtocols(ticket),
			);
			sockets.push(socket);
			return socket;
		};

		const alice = makeSocket(peerOneId, aliceTicket);
		const bob = makeSocket(peerTwoId, bobTicket);
		await Promise.all([waitForRelayOpen(alice), waitForRelayOpen(bob)]);

		const mallory = makeSocket(peerOneId, malloryTicket);
		await expect(waitForRelayError(mallory, 'duplicate_peer')).resolves.toBeUndefined();
		await closeSocket(mallory);
		expect(getP2PRelayStats().activeConnections).toBe(2);

		const received = waitForApplicationMessage(bob);
		alice.send(JSON.stringify({ type: 'ping', sequence: 3 }));
		await expect(received).resolves.toMatchObject({ type: 'ping', sequence: 3 });
	});

	it('forwards an allowed Poker action before acknowledging it', async () => {
		await setStarterCeremonyClaim('alice', 1_800_000_000_000);
		await setStarterCeremonyClaim('bob', 1_800_000_000_000);
		const server = createServer();
		servers.push(server);
		attachP2PRelay(server);
		const port = await listenOnEphemeralPort(server);
		const roomId = 'relay-poker-gate-room';
		const peerOneId = 'relay-poker-gate-a';
		const peerTwoId = 'relay-poker-gate-b';
		const peerOneTicket = ticketFor(roomId, peerOneId, 'alice');
		const peerTwoTicket = ticketFor(roomId, peerTwoId, 'bob');
		const makeSocket = (peerId: string, ticket: P2PMatchTicket): WebSocket => {
			const socket = new WebSocket(
				`ws://127.0.0.1:${port}/ws/p2p?room=${roomId}&peer=${peerId}`,
				relayProtocols(ticket),
			);
			sockets.push(socket);
			return socket;
		};

		const alice = makeSocket(peerOneId, peerOneTicket);
		const bob = makeSocket(peerTwoId, peerTwoTicket);
		await Promise.all([waitForRelayOpen(alice), waitForRelayOpen(bob)]);

		const turn = {
			type: 'poker_turn_started',
			combatId: 'relay-poker-combat',
			turnId: 'relay-poker-combat:pre_flop:relay-poker-gate-a:0',
			phase: 'pre_flop',
			activePlayerId: peerOneId,
			actionsThisRound: 0,
			durationMs: 60_000,
			sentAtMs: 1,
		};
		const commitOnAlice = waitForRelaySystemEvent(alice, 'poker_turn_notary');
		const commitOnBob = waitForRelaySystemEvent(bob, 'poker_turn_notary');
		alice.send(JSON.stringify(turn));
		bob.send(JSON.stringify(turn));
		await Promise.all([commitOnAlice, commitOnBob]);

		const ackOnAlice = waitForRelaySystemEvent(alice, 'poker_action_time_gate');
		const actionOnBob = waitForApplicationMessage(bob);
		alice.send(JSON.stringify({
			type: 'poker_action',
			playerId: peerOneId,
			action: 'defend',
			origin: 'player',
			turnId: turn.turnId,
			decisionId: 'relay-poker-decision-1',
			seq: 0,
		}));

		const [ack, forwarded] = await Promise.all([ackOnAlice, actionOnBob]);
		expect(ack.message).toMatchObject({
			type: 'poker_action_time_gate_ack_v1',
			matchId: roomId,
			turnId: turn.turnId,
			decisionId: 'relay-poker-decision-1',
			seq: 0,
			allowed: true,
		});
		expect(forwarded).toMatchObject({
			type: 'poker_action',
			decisionId: 'relay-poker-decision-1',
		});
	});

	it('does not acknowledge an allowed Poker action after the opponent has left', async () => {
		await setStarterCeremonyClaim('alice', 1_800_000_000_000);
		await setStarterCeremonyClaim('bob', 1_800_000_000_000);
		const server = createServer();
		servers.push(server);
		attachP2PRelay(server);
		const port = await listenOnEphemeralPort(server);
		const roomId = 'relay-poker-opponent-left-room';
		const aliceTicket = ticketFor(roomId, 'relay-poker-left-a', 'alice');
		const bobTicket = ticketFor(roomId, 'relay-poker-left-b', 'bob');
		const alice = new WebSocket(
			`ws://127.0.0.1:${port}/ws/p2p?room=${roomId}&peer=${aliceTicket.peerId}`,
			relayProtocols(aliceTicket),
		);
		const bob = new WebSocket(
			`ws://127.0.0.1:${port}/ws/p2p?room=${roomId}&peer=${bobTicket.peerId}`,
			relayProtocols(bobTicket),
		);
		sockets.push(alice, bob);
		await Promise.all([waitForRelayOpen(alice), waitForRelayOpen(bob)]);

		const turn = {
			type: 'poker_turn_started',
			combatId: 'relay-poker-left-combat',
			turnId: 'relay-poker-left-combat:pre_flop:relay-poker-left-a:0',
			phase: 'pre_flop',
			activePlayerId: aliceTicket.peerId,
			actionsThisRound: 0,
			durationMs: 60_000,
			sentAtMs: 1,
		};
		const commitOnAlice = waitForRelaySystemEvent(alice, 'poker_turn_notary');
		const commitOnBob = waitForRelaySystemEvent(bob, 'poker_turn_notary');
		alice.send(JSON.stringify(turn));
		bob.send(JSON.stringify(turn));
		await Promise.all([commitOnAlice, commitOnBob]);
		await closeSocket(bob);

		alice.send(JSON.stringify({
			type: 'poker_action',
			playerId: aliceTicket.peerId,
			action: 'defend',
			origin: 'player',
			turnId: turn.turnId,
			decisionId: 'relay-poker-opponent-left-decision',
			seq: 0,
		}));

		await expect(waitForNoRelaySystemEvent(alice, 'poker_action_time_gate')).resolves.toBeUndefined();
	});
});

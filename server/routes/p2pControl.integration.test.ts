import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import WebSocket, { type RawData } from 'ws';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	P2P_CONTROL_WS_PROTOCOL,
	P2P_CONTROL_WS_PROTOCOL_PREFIX,
} from '../../shared/p2p-wire/control';
import { buildP2PMatchTicket } from '../services/p2pMatchTicketSigner';
import { clearHiveWebSessionsForTests, issueHiveWebSession } from '../services/hiveWebSession';
import { attachP2PControl } from './p2pControl';

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

function rawToText(raw: RawData): string {
	if (typeof raw === 'string') return raw;
	if (Buffer.isBuffer(raw)) return raw.toString('utf8');
	if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
	return Buffer.from(raw).toString('utf8');
}

function parseRecord(raw: RawData): Record<string, unknown> | null {
	try {
		const value: unknown = JSON.parse(rawToText(raw));
		return typeof value === 'object' && value !== null && !Array.isArray(value)
			? value as Record<string, unknown>
			: null;
	} catch {
		return null;
	}
}

async function listen(server: Server): Promise<number> {
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			server.off('error', reject);
			resolve();
		});
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Expected TCP address');
	return (address as AddressInfo).port;
}

async function closeServer(server: Server): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		server.close(error => error ? reject(error) : resolve());
	});
}

function loginCookie(baseUrl: string, username: string): Promise<string> {
	return fetch(`${baseUrl}/login/${username}`).then(response => {
		const cookie = response.headers.get('set-cookie');
		if (!cookie) throw new Error('Missing session cookie');
		return cookie.split(';', 1)[0];
	});
}

function controlProtocols(token: string): string[] {
	return [P2P_CONTROL_WS_PROTOCOL, `${P2P_CONTROL_WS_PROTOCOL_PREFIX}${token}`];
}

function waitForType(socket: WebSocket, type: string): Promise<Record<string, unknown>> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error(`Timed out waiting for ${type}`));
		}, 3_000);
		const cleanup = (): void => {
			clearTimeout(timeout);
			socket.off('message', onMessage);
			socket.off('error', onError);
		};
		const onError = (error: Error): void => {
			cleanup();
			reject(error);
		};
		const onMessage = (raw: RawData): void => {
			const message = parseRecord(raw);
			if (!message || message.type !== type) return;
			cleanup();
			resolve(message);
		};
		socket.on('message', onMessage);
		socket.once('error', onError);
	});
}

function waitForPing(socket: WebSocket): Promise<void> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error('Timed out waiting for control keepalive ping'));
		}, 3_000);
		const cleanup = (): void => {
			clearTimeout(timeout);
			socket.off('ping', onPing);
			socket.off('error', onError);
		};
		const onError = (error: Error): void => {
			cleanup();
			reject(error);
		};
		const onPing = (): void => {
			cleanup();
			resolve();
		};
		socket.once('ping', onPing);
		socket.once('error', onError);
	});
}

function closeSocket(socket: WebSocket): void {
	if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
}

describe('P2P control websocket', () => {
	let server: Server;
	const sockets: WebSocket[] = [];

	beforeEach(() => {
		process.env.NODE_ENV = 'test';
		process.env.VITE_NETWORK_STAGE = 'testnet';
		process.env.P2P_CHALLENGE_SIGNING_SECRET = 'control-integration-secret-32-characters';
		clearHiveWebSessionsForTests();
	});

	afterEach(async () => {
		for (const socket of sockets) closeSocket(socket);
		sockets.length = 0;
		if (server?.listening) await closeServer(server);
		restoreEnv();
	});

	it('authenticates both ticket and Hive session, then relays signaling and referee control messages', async () => {
		const app = express();
		app.get('/login/:username', (req, res) => {
			issueHiveWebSession(res, req.params.username);
			res.end('ok');
		});
		server = createServer(app);
		attachP2PControl(server);
		const port = await listen(server);
		const baseUrl = `http://127.0.0.1:${port}`;
		const aliceCookie = await loginCookie(baseUrl, 'alice');
		const bobCookie = await loginCookie(baseUrl, 'bob');
		const roomId = 'control-match-1';
		const aliceTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-a', role: 'offerer', account: 'alice' });
		const bobTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-b', role: 'answerer', account: 'bob' });
		const wsUrl = `ws://127.0.0.1:${port}/ws/control?match=${roomId}`;
		const alice = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
		const bob = new WebSocket(`${wsUrl}&peer=peer-b`, controlProtocols(bobTicket.token), { headers: { Cookie: bobCookie } });
		sockets.push(alice, bob);
		await Promise.all([
			new Promise<void>((resolve, reject) => { alice.once('open', () => resolve()); alice.once('error', reject); }),
			new Promise<void>((resolve, reject) => { bob.once('open', () => resolve()); bob.once('error', reject); }),
		]);

		const aliceOpen = waitForType(alice, 'control_open_v1');
		const bobOpen = waitForType(bob, 'control_open_v1');
		const hello = (peerId: string): string => JSON.stringify({ type: 'control_hello_v1', protocolVersion: 2, matchId: roomId, peerId });
		alice.send(hello('peer-a'));
		bob.send(hello('peer-b'));
		await expect(aliceOpen).resolves.toMatchObject({ peerId: 'peer-a', opponentPeerId: 'peer-b', role: 'offerer' });
		await expect(bobOpen).resolves.toMatchObject({ peerId: 'peer-b', opponentPeerId: 'peer-a', role: 'answerer' });

		const offerOnBob = waitForType(bob, 'webrtc_offer_v1');
		alice.send(JSON.stringify({ type: 'webrtc_offer_v1', protocolVersion: 2, matchId: roomId, transportEpoch: 1, sdp: 'offer-sdp' }));
		await expect(offerOnBob).resolves.toMatchObject({ sdp: 'offer-sdp' });
		const answerOnAlice = waitForType(alice, 'webrtc_answer_v1');
		bob.send(JSON.stringify({ type: 'webrtc_answer_v1', protocolVersion: 2, matchId: roomId, transportEpoch: 1, sdp: 'answer-sdp' }));
		await expect(answerOnAlice).resolves.toMatchObject({ sdp: 'answer-sdp' });
		const iceOnBob = waitForType(bob, 'ice_candidate_v1');
		alice.send(JSON.stringify({ type: 'ice_candidate_v1', protocolVersion: 2, matchId: roomId, transportEpoch: 1, candidate: 'candidate:test' }));
		await expect(iceOnBob).resolves.toMatchObject({ candidate: 'candidate:test' });

		const fallbackOnBob = waitForType(bob, 'transport_fallback_v1');
		alice.send(JSON.stringify({ type: 'transport_fallback_v1', protocolVersion: 2, matchId: roomId, transportEpoch: 1, reason: 'ice_failed' }));
		await expect(fallbackOnBob).resolves.toMatchObject({ reason: 'ice_failed' });

		const readyOnAlice = waitForType(alice, 'transport_ready_v1');
		bob.send(JSON.stringify({ type: 'transport_ready_v1', protocolVersion: 2, matchId: roomId, transportEpoch: 1, kind: 'websocket-relay' }));
		await expect(readyOnAlice).resolves.toMatchObject({ kind: 'websocket-relay' });
		bob.send(JSON.stringify({ type: 'transport_fallback_v1', protocolVersion: 2, matchId: roomId, transportEpoch: 1, reason: 'timeout' }));

		const checkpointOnAlice = waitForType(alice, 'phase_checkpoint_commit_v1');
		const checkpointOnBob = waitForType(bob, 'phase_checkpoint_commit_v1');
		const checkpoint = {
			type: 'phase_checkpoint_propose_v1',
			protocolVersion: 1,
			scope: 'round-boundary',
			matchId: roomId,
			epoch: 1,
			fromPhase: 'chess',
			toPhase: 'poker_combat',
			previousCheckpointId: '0'.repeat(64),
			stateRoot: '1'.repeat(64),
		};
		alice.send(JSON.stringify(checkpoint));
		bob.send(JSON.stringify(checkpoint));
		const [firstCheckpointOnAlice, firstCheckpointOnBob] = await Promise.all([checkpointOnAlice, checkpointOnBob]);
		expect(firstCheckpointOnAlice).toMatchObject({ type: 'phase_checkpoint_commit_v1', epoch: 1, stateRoot: '1'.repeat(64) });
		expect(firstCheckpointOnBob).toMatchObject({ type: 'phase_checkpoint_commit_v1', epoch: 1, stateRoot: '1'.repeat(64) });

		const notaryOnAlice = waitForType(alice, 'poker_turn_notary_commit_v1');
		const notaryOnBob = waitForType(bob, 'poker_turn_notary_commit_v1');
		const turn = {
			type: 'poker_turn_started',
			combatId: 'combat-1',
			turnId: 'combat-1:pre_flop:player:0',
			phase: 'pre_flop',
			activePlayerId: 'player',
			actionsThisRound: 0,
			durationMs: 60_000,
			sentAtMs: 1,
		};
		alice.send(JSON.stringify(turn));
		bob.send(JSON.stringify(turn));
		const [firstNotaryOnAlice, firstNotaryOnBob] = await Promise.all([notaryOnAlice, notaryOnBob]);
		expect(firstNotaryOnAlice).toMatchObject({ type: 'poker_turn_notary_commit_v1', matchId: roomId, turnId: turn.turnId });
		expect(firstNotaryOnBob).toMatchObject({ type: 'poker_turn_notary_commit_v1', matchId: roomId, turnId: turn.turnId });

		const actionAckOnAlice = waitForType(alice, 'poker_action_time_gate_ack_v1');
		const actionOnBob = waitForType(bob, 'poker_action_time_gate_v1');
		alice.send(JSON.stringify({
			type: 'poker_action_time_gate_v1',
			protocolVersion: 2,
			matchId: roomId,
			playerId: 'player',
			action: 'defend',
			origin: 'player',
			turnId: turn.turnId,
			decisionId: 'decision-1',
			seq: 0,
		}));
		const [actionAck, actionForwarded] = await Promise.all([actionAckOnAlice, actionOnBob]);
		expect(actionAck).toMatchObject({
			type: 'poker_action_time_gate_ack_v1',
			matchId: roomId,
			turnId: turn.turnId,
			decisionId: 'decision-1',
			seq: 0,
			allowed: true,
		});
		expect(actionForwarded).toMatchObject({ type: 'poker_action_time_gate_v1', decisionId: 'decision-1' });

		bob.send(JSON.stringify({ type: 'webrtc_offer_v1', protocolVersion: 2, matchId: roomId, transportEpoch: 1, sdp: 'forbidden-glare' }));
		await new Promise(resolve => setTimeout(resolve, 100));

		const closeAndWait = (socket: WebSocket): Promise<void> => new Promise(resolve => {
			if (socket.readyState === WebSocket.CLOSED) {
				resolve();
				return;
			}
			socket.once('close', () => resolve());
			socket.close();
		});
		await Promise.all([closeAndWait(alice), closeAndWait(bob)]);

		const aliceReconnected = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
		const bobReconnected = new WebSocket(`${wsUrl}&peer=peer-b`, controlProtocols(bobTicket.token), { headers: { Cookie: bobCookie } });
		sockets.push(aliceReconnected, bobReconnected);
		await Promise.all([
			new Promise<void>((resolve, reject) => { aliceReconnected.once('open', () => resolve()); aliceReconnected.once('error', reject); }),
			new Promise<void>((resolve, reject) => { bobReconnected.once('open', () => resolve()); bobReconnected.once('error', reject); }),
		]);
		const aliceReconnectedOpen = waitForType(aliceReconnected, 'control_open_v1');
		const bobReconnectedOpen = waitForType(bobReconnected, 'control_open_v1');
		aliceReconnected.send(hello('peer-a'));
		bobReconnected.send(hello('peer-b'));
		await Promise.all([aliceReconnectedOpen, bobReconnectedOpen]);

		const resumedNotaryOnAlice = waitForType(aliceReconnected, 'poker_turn_notary_commit_v1');
		const resumedNotaryOnBob = waitForType(bobReconnected, 'poker_turn_notary_commit_v1');
		aliceReconnected.send(JSON.stringify(turn));
		bobReconnected.send(JSON.stringify(turn));
		const [resumedAliceCommit, resumedBobCommit] = await Promise.all([resumedNotaryOnAlice, resumedNotaryOnBob]);
		expect(resumedAliceCommit.serverStartedAtMs).toBe(firstNotaryOnAlice.serverStartedAtMs);
		expect(resumedAliceCommit.serverDeadlineAtMs).toBe(firstNotaryOnAlice.serverDeadlineAtMs);
		expect(resumedBobCommit.serverStartedAtMs).toBe(firstNotaryOnBob.serverStartedAtMs);
		expect(resumedBobCommit.serverDeadlineAtMs).toBe(firstNotaryOnBob.serverDeadlineAtMs);

		const resumedCheckpointOnAlice = waitForType(aliceReconnected, 'phase_checkpoint_commit_v1');
		const resumedCheckpointOnBob = waitForType(bobReconnected, 'phase_checkpoint_commit_v1');
		const nextCheckpoint = {
			...checkpoint,
			epoch: 2,
			fromPhase: 'poker_combat',
			toPhase: 'chess',
			previousCheckpointId: firstCheckpointOnAlice.checkpointId,
			stateRoot: '2'.repeat(64),
		};
		aliceReconnected.send(JSON.stringify(nextCheckpoint));
		bobReconnected.send(JSON.stringify(nextCheckpoint));
		const [resumedAliceCheckpoint, resumedBobCheckpoint] = await Promise.all([resumedCheckpointOnAlice, resumedCheckpointOnBob]);
		expect(resumedAliceCheckpoint).toMatchObject({ epoch: 2, previousCheckpointId: firstCheckpointOnAlice.checkpointId, stateRoot: '2'.repeat(64) });
		expect(resumedBobCheckpoint).toMatchObject({ epoch: 2, previousCheckpointId: firstCheckpointOnBob.checkpointId, stateRoot: '2'.repeat(64) });
	});

	it('commits a transport only after both peers select the same kind and permits relay recovery', async () => {
		const app = express();
		app.get('/login/:username', (req, res) => {
			issueHiveWebSession(res, req.params.username);
			res.end('ok');
		});
		server = createServer(app);
		attachP2PControl(server);
		const port = await listen(server);
		const baseUrl = `http://127.0.0.1:${port}`;
		const aliceCookie = await loginCookie(baseUrl, 'alice');
		const bobCookie = await loginCookie(baseUrl, 'bob');

		const openPair = async (roomId: string): Promise<{ readonly alice: WebSocket; readonly bob: WebSocket }> => {
			const aliceTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-a', role: 'offerer', account: 'alice' });
			const bobTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-b', role: 'answerer', account: 'bob' });
			const wsUrl = `ws://127.0.0.1:${port}/ws/control?match=${roomId}`;
			const alice = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
			const bob = new WebSocket(`${wsUrl}&peer=peer-b`, controlProtocols(bobTicket.token), { headers: { Cookie: bobCookie } });
			sockets.push(alice, bob);
			await Promise.all([
				new Promise<void>((resolve, reject) => { alice.once('open', () => resolve()); alice.once('error', reject); }),
				new Promise<void>((resolve, reject) => { bob.once('open', () => resolve()); bob.once('error', reject); }),
			]);
			const aliceOpen = waitForType(alice, 'control_open_v1');
			const bobOpen = waitForType(bob, 'control_open_v1');
			alice.send(JSON.stringify({ type: 'control_hello_v1', protocolVersion: 2, matchId: roomId, peerId: 'peer-a' }));
			bob.send(JSON.stringify({ type: 'control_hello_v1', protocolVersion: 2, matchId: roomId, peerId: 'peer-b' }));
			await Promise.all([aliceOpen, bobOpen]);
			return { alice, bob };
		};

		const sameKindRoom = await openPair('control-transport-commit-1');
		const unilateralCommitMessages: Record<string, unknown>[] = [];
		const observeUnilateralCommit = (raw: RawData): void => {
			const message = parseRecord(raw);
			if (message?.type === 'transport_committed_v1') unilateralCommitMessages.push(message);
		};
		sameKindRoom.alice.on('message', observeUnilateralCommit);
		const readyOnBob = waitForType(sameKindRoom.bob, 'transport_ready_v1');
		sameKindRoom.alice.send(JSON.stringify({ type: 'transport_ready_v1', protocolVersion: 2, matchId: 'control-transport-commit-1', transportEpoch: 1, kind: 'webrtc' }));
		await expect(readyOnBob).resolves.toMatchObject({ kind: 'webrtc' });
		expect(unilateralCommitMessages).toHaveLength(0);
		sameKindRoom.alice.off('message', observeUnilateralCommit);
		const sameKindCommitOnAlice = waitForType(sameKindRoom.alice, 'transport_committed_v1');
		const sameKindCommitOnBob = waitForType(sameKindRoom.bob, 'transport_committed_v1');
		sameKindRoom.bob.send(JSON.stringify({ type: 'transport_ready_v1', protocolVersion: 2, matchId: 'control-transport-commit-1', transportEpoch: 1, kind: 'webrtc' }));
		await expect(sameKindCommitOnAlice).resolves.toMatchObject({ kind: 'webrtc' });
		await expect(sameKindCommitOnBob).resolves.toMatchObject({ kind: 'webrtc' });

		const mixedRoom = await openPair('control-transport-commit-2');
		const fallbackOnAlice = waitForType(mixedRoom.alice, 'transport_fallback_v1');
		mixedRoom.alice.send(JSON.stringify({ type: 'transport_ready_v1', protocolVersion: 2, matchId: 'control-transport-commit-2', transportEpoch: 1, kind: 'webrtc' }));
		mixedRoom.bob.send(JSON.stringify({ type: 'transport_ready_v1', protocolVersion: 2, matchId: 'control-transport-commit-2', transportEpoch: 1, kind: 'websocket-relay' }));
		await expect(fallbackOnAlice).resolves.toMatchObject({ reason: 'manual' });

		const relayCommitOnAlice = waitForType(mixedRoom.alice, 'transport_committed_v1');
		const relayCommitOnBob = waitForType(mixedRoom.bob, 'transport_committed_v1');
		mixedRoom.alice.send(JSON.stringify({ type: 'transport_ready_v1', protocolVersion: 2, matchId: 'control-transport-commit-2', transportEpoch: 1, kind: 'websocket-relay' }));
		await expect(relayCommitOnAlice).resolves.toMatchObject({ kind: 'websocket-relay' });
		await expect(relayCommitOnBob).resolves.toMatchObject({ kind: 'websocket-relay' });
	});

	it('keeps an authenticated control websocket alive without gameplay actions', async () => {
		const app = express();
		app.get('/login/:username', (req, res) => {
			issueHiveWebSession(res, req.params.username);
			res.end('ok');
		});
		server = createServer(app);
		attachP2PControl(server, { keepaliveIntervalMs: 20 });
		const port = await listen(server);
		const baseUrl = `http://127.0.0.1:${port}`;
		const aliceCookie = await loginCookie(baseUrl, 'alice');
		const roomId = 'control-idle-keepalive-1';
		const aliceTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-a', role: 'offerer', account: 'alice' });
		const alice = new WebSocket(
			`ws://127.0.0.1:${port}/ws/control?match=${roomId}&peer=peer-a`,
			controlProtocols(aliceTicket.token),
			{ headers: { Cookie: aliceCookie } },
		);
		sockets.push(alice);
		await new Promise<void>((resolve, reject) => {
			alice.once('open', () => resolve());
			alice.once('error', reject);
		});
		alice.send(JSON.stringify({
			type: 'control_hello_v1',
			protocolVersion: 2,
			matchId: roomId,
			peerId: 'peer-a',
		}));

		await expect(waitForPing(alice)).resolves.toBeUndefined();
		await expect(waitForPing(alice)).resolves.toBeUndefined();
		expect(alice.readyState).toBe(WebSocket.OPEN);
	});

	it('rejects a control upgrade without a session or with a mismatched session account', async () => {
		const app = express();
		server = createServer(app);
		attachP2PControl(server);
		const port = await listen(server);
		const roomId = 'control-match-2';
		const ticket = buildP2PMatchTicket({ roomId, peerId: 'peer-a', role: 'offerer', account: 'alice' });
		const url = `ws://127.0.0.1:${port}/ws/control?match=${roomId}&peer=peer-a`;
		const noSession = new WebSocket(url, controlProtocols(ticket.token));
		await expect(new Promise<void>((resolve, reject) => {
			noSession.once('unexpected-response', (_request, response) => { expect(response.statusCode).toBe(401); resolve(); });
			noSession.once('error', () => undefined);
			timeoutReject(reject);
		})).resolves.toBeUndefined();

		const appWithLogin = express();
		appWithLogin.get('/login/:username', (req, res) => { issueHiveWebSession(res, req.params.username); res.end('ok'); });
		const secondServer = createServer(appWithLogin);
		attachP2PControl(secondServer);
		const secondPort = await listen(secondServer);
		const malloryCookie = await loginCookie(`http://127.0.0.1:${secondPort}`, 'mallory');
		const mismatch = new WebSocket(`ws://127.0.0.1:${secondPort}/ws/control?match=${roomId}&peer=peer-a`, controlProtocols(ticket.token), { headers: { Cookie: malloryCookie } });
		await expect(new Promise<void>((resolve, reject) => {
			mismatch.once('unexpected-response', (_request, response) => { expect(response.statusCode).toBe(403); resolve(); });
			mismatch.once('error', () => undefined);
			timeoutReject(reject);
		})).resolves.toBeUndefined();
		await closeServer(secondServer);
	});

	it('allows an account-bearing local ticket without a Hive HTTP session', async () => {
		process.env.VITE_NETWORK_STAGE = 'local';
		const app = express();
		server = createServer(app);
		attachP2PControl(server);
		const port = await listen(server);
		const roomId = 'control-local-account-1';
		const ticket = buildP2PMatchTicket({ roomId, peerId: 'peer-local', role: 'offerer', account: 'alice' });
		const socket = new WebSocket(
			`ws://127.0.0.1:${port}/ws/control?match=${roomId}&peer=peer-local`,
			controlProtocols(ticket.token),
		);
		sockets.push(socket);
		await expect(new Promise<void>((resolve, reject) => {
			socket.once('open', () => resolve());
			socket.once('error', reject);
		})).resolves.toBeUndefined();
	});

	it('replaces an in-flight duplicate connection for the same authenticated ticket', async () => {
		const app = express();
		app.get('/login/:username', (req, res) => {
			issueHiveWebSession(res, req.params.username);
			res.end('ok');
		});
		server = createServer(app);
		attachP2PControl(server);
		const port = await listen(server);
		const baseUrl = `http://127.0.0.1:${port}`;
		const aliceCookie = await loginCookie(baseUrl, 'alice');
		const bobCookie = await loginCookie(baseUrl, 'bob');
		const roomId = 'control-duplicate-1';
		const aliceTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-a', role: 'offerer', account: 'alice' });
		const bobTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-b', role: 'answerer', account: 'bob' });
		const wsUrl = `ws://127.0.0.1:${port}/ws/control?match=${roomId}`;
		const firstAlice = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), {
			headers: { Cookie: aliceCookie, 'x-forwarded-for': '203.0.113.10' },
		});
		const firstAlicePeerLeft = waitForType(firstAlice, 'control_peer_left_v1');
		const firstAliceOpen = new Promise<void>((resolve, reject) => { firstAlice.once('open', () => resolve()); firstAlice.once('error', reject); });
		sockets.push(firstAlice);
		await firstAliceOpen;
		firstAlice.send(JSON.stringify({ type: 'control_hello_v1', protocolVersion: 2, matchId: roomId, peerId: 'peer-a' }));

		// A VPN/NIC change can leave the old control socket half-open. Identity is
		// ticket/session-bound, never source-IP-bound, so the replacement must keep
		// the same authenticated room member.
		const replacement = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), {
			headers: { Cookie: aliceCookie, 'x-forwarded-for': '198.51.100.42' },
		});
		const replacementOpen = new Promise<void>((resolve, reject) => { replacement.once('open', () => resolve()); replacement.once('error', reject); });
		sockets.push(replacement);
		await replacementOpen;
		replacement.send(JSON.stringify({ type: 'control_hello_v1', protocolVersion: 2, matchId: roomId, peerId: 'peer-a' }));
		await expect(firstAlicePeerLeft).resolves.toMatchObject({ opponentPeerId: 'peer-a' });

		const bob = new WebSocket(`${wsUrl}&peer=peer-b`, controlProtocols(bobTicket.token), { headers: { Cookie: bobCookie } });
		const bobOpen = new Promise<void>((resolve, reject) => { bob.once('open', () => resolve()); bob.once('error', reject); });
		sockets.push(bob);
		await bobOpen;
		const replacementControlOpen = waitForType(replacement, 'control_open_v1');
		const bobControlOpen = waitForType(bob, 'control_open_v1');
		bob.send(JSON.stringify({ type: 'control_hello_v1', protocolVersion: 2, matchId: roomId, peerId: 'peer-b' }));
		await expect(replacementControlOpen).resolves.toMatchObject({ peerId: 'peer-a', opponentPeerId: 'peer-b' });
		await expect(bobControlOpen).resolves.toMatchObject({ peerId: 'peer-b', opponentPeerId: 'peer-a' });
	});

	it('restarts the bilateral transport epoch when a connected peer replaces its control socket', async () => {
		const app = express();
		app.get('/login/:username', (req, res) => {
			issueHiveWebSession(res, req.params.username);
			res.end('ok');
		});
		server = createServer(app);
		attachP2PControl(server);
		const port = await listen(server);
		const baseUrl = `http://127.0.0.1:${port}`;
		const aliceCookie = await loginCookie(baseUrl, 'alice');
		const bobCookie = await loginCookie(baseUrl, 'bob');
		const roomId = 'control-reconnect-epoch-1';
		const aliceTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-a', role: 'offerer', account: 'alice' });
		const bobTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-b', role: 'answerer', account: 'bob' });
		const wsUrl = `ws://127.0.0.1:${port}/ws/control?match=${roomId}`;
		const alice = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
		const bob = new WebSocket(`${wsUrl}&peer=peer-b`, controlProtocols(bobTicket.token), { headers: { Cookie: bobCookie } });
		sockets.push(alice, bob);
		await Promise.all([
			new Promise<void>((resolve, reject) => { alice.once('open', () => resolve()); alice.once('error', reject); }),
			new Promise<void>((resolve, reject) => { bob.once('open', () => resolve()); bob.once('error', reject); }),
		]);
		const hello = (peerId: string): string => JSON.stringify({ type: 'control_hello_v1', protocolVersion: 2, matchId: roomId, peerId });
		const aliceOpen = waitForType(alice, 'control_open_v1');
		const bobOpen = waitForType(bob, 'control_open_v1');
		alice.send(hello('peer-a'));
		bob.send(hello('peer-b'));
		await Promise.all([aliceOpen, bobOpen]);

		const commitOnAlice = waitForType(alice, 'transport_committed_v1');
		const commitOnBob = waitForType(bob, 'transport_committed_v1');
		const webrtcReady = JSON.stringify({ type: 'transport_ready_v1', protocolVersion: 2, matchId: roomId, transportEpoch: 1, kind: 'webrtc' });
		alice.send(webrtcReady);
		bob.send(webrtcReady);
		await Promise.all([commitOnAlice, commitOnBob]);

		const bobReset = waitForType(bob, 'transport_reset_v2');
		const replacement = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie, 'x-forwarded-for': '198.51.100.42' } });
		sockets.push(replacement);
		await new Promise<void>((resolve, reject) => { replacement.once('open', () => resolve()); replacement.once('error', reject); });
		expect(bob.readyState).toBe(WebSocket.OPEN);
		await new Promise(resolve => setTimeout(resolve, 50));
		expect(bob.readyState).toBe(WebSocket.OPEN);

		const replacementOpen = waitForType(replacement, 'control_open_v1');
		const bobReopen = waitForType(bob, 'control_open_v1');
		replacement.send(hello('peer-a'));
		await expect(bobReset).resolves.toMatchObject({
			opponentPeerId: 'peer-a',
			reason: 'peer_reconnected',
			transportEpoch: 2,
		});
		expect(bob.readyState).toBe(WebSocket.OPEN);

		alice.send(JSON.stringify({
			type: 'ice_candidate_v1',
			protocolVersion: 2,
			matchId: roomId,
			transportEpoch: 1,
			candidate: 'stale-from-alice-old',
		}));
		bob.send(JSON.stringify({
			type: 'ice_candidate_v1',
			protocolVersion: 2,
			matchId: roomId,
			transportEpoch: 1,
			candidate: 'stale-from-bob',
		}));

		const [openedReplacement, openedBob] = await Promise.all([replacementOpen, bobReopen]);
		expect(openedReplacement).toMatchObject({ transportEpoch: 2, peerId: 'peer-a' });
		expect(openedBob).toMatchObject({ transportEpoch: 2, peerId: 'peer-b' });

		const relayCommitOnReplacement = waitForType(replacement, 'transport_committed_v1');
		const relayCommitOnBob = waitForType(bob, 'transport_committed_v1');
		const relayReady = JSON.stringify({ type: 'transport_ready_v1', protocolVersion: 2, matchId: roomId, transportEpoch: 2, kind: 'websocket-relay' });
		replacement.send(relayReady);
		bob.send(relayReady);
		await expect(relayCommitOnReplacement).resolves.toMatchObject({ kind: 'websocket-relay', transportEpoch: 2 });
		await expect(relayCommitOnBob).resolves.toMatchObject({ kind: 'websocket-relay', transportEpoch: 2 });
		expect(bob.readyState).toBe(WebSocket.OPEN);
	});

	it('rate-limits control socket replacements for the same match peer', async () => {
		const app = express();
		app.get('/login/:username', (req, res) => {
			issueHiveWebSession(res, req.params.username);
			res.end('ok');
		});
		server = createServer(app);
		attachP2PControl(server);
		const port = await listen(server);
		const baseUrl = `http://127.0.0.1:${port}`;
		const aliceCookie = await loginCookie(baseUrl, 'alice');
		const roomId = 'control-replacement-rate-1';
		const aliceTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-a', role: 'offerer', account: 'alice' });
		const wsUrl = `ws://127.0.0.1:${port}/ws/control?match=${roomId}&peer=peer-a`;
		const hello = JSON.stringify({ type: 'control_hello_v1', protocolVersion: 2, matchId: roomId, peerId: 'peer-a' });
		let current = new WebSocket(wsUrl, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
		sockets.push(current);
		await new Promise<void>((resolve, reject) => { current.once('open', () => resolve()); current.once('error', reject); });
		current.send(hello);

		for (let index = 0; index < 4; index += 1) {
			const next = new WebSocket(wsUrl, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
			sockets.push(next);
			await new Promise<void>((resolve, reject) => { next.once('open', () => resolve()); next.once('error', reject); });
			const previousClosed = new Promise<void>(resolve => { current.once('close', () => resolve()); });
			next.send(hello);
			await previousClosed;
			current = next;
		}

		const blocked = new WebSocket(wsUrl, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
		sockets.push(blocked);
		const blockedError = waitForType(blocked, 'control_error_v1');
		await expect(blockedError).resolves.toMatchObject({ code: 'rate_limited' });
	});

	it('promotes a pending replacement with a new epoch when the incumbent dies before hello', async () => {
		const app = express();
		app.get('/login/:username', (req, res) => {
			issueHiveWebSession(res, req.params.username);
			res.end('ok');
		});
		server = createServer(app);
		attachP2PControl(server);
		const port = await listen(server);
		const baseUrl = `http://127.0.0.1:${port}`;
		const aliceCookie = await loginCookie(baseUrl, 'alice');
		const bobCookie = await loginCookie(baseUrl, 'bob');
		const roomId = 'control-pending-incumbent-die-1';
		const aliceTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-a', role: 'offerer', account: 'alice' });
		const bobTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-b', role: 'answerer', account: 'bob' });
		const wsUrl = `ws://127.0.0.1:${port}/ws/control?match=${roomId}`;
		const alice = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
		const bob = new WebSocket(`${wsUrl}&peer=peer-b`, controlProtocols(bobTicket.token), { headers: { Cookie: bobCookie } });
		sockets.push(alice, bob);
		await Promise.all([
			new Promise<void>((resolve, reject) => { alice.once('open', () => resolve()); alice.once('error', reject); }),
			new Promise<void>((resolve, reject) => { bob.once('open', () => resolve()); bob.once('error', reject); }),
		]);
		const hello = (peerId: string): string => JSON.stringify({ type: 'control_hello_v1', protocolVersion: 2, matchId: roomId, peerId });
		const aliceOpen = waitForType(alice, 'control_open_v1');
		const bobOpen = waitForType(bob, 'control_open_v1');
		alice.send(hello('peer-a'));
		bob.send(hello('peer-b'));
		await Promise.all([aliceOpen, bobOpen]);

		const bobReset = waitForType(bob, 'transport_reset_v2');
		const replacement = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
		sockets.push(replacement);
		await new Promise<void>((resolve, reject) => { replacement.once('open', () => resolve()); replacement.once('error', reject); });
		const replacementOpen = waitForType(replacement, 'control_open_v1');
		const bobReopen = waitForType(bob, 'control_open_v1');
		const aliceClosed = new Promise<void>(resolve => { alice.once('close', () => resolve()); });
		alice.close();
		await aliceClosed;
		expect(bob.readyState).toBe(WebSocket.OPEN);
		replacement.send(hello('peer-a'));
		await expect(bobReset).resolves.toMatchObject({
			reason: 'peer_reconnected',
			transportEpoch: 2,
			opponentPeerId: 'peer-a',
		});
		const [openedReplacement, openedBob] = await Promise.all([replacementOpen, bobReopen]);
		expect(openedReplacement).toMatchObject({ transportEpoch: 2, peerId: 'peer-a' });
		expect(openedBob).toMatchObject({ transportEpoch: 2, peerId: 'peer-b' });
		expect(bob.readyState).toBe(WebSocket.OPEN);
	});

	it('notifies the survivor when both incumbent and pending replacement disappear', async () => {
		const app = express();
		app.get('/login/:username', (req, res) => {
			issueHiveWebSession(res, req.params.username);
			res.end('ok');
		});
		server = createServer(app);
		attachP2PControl(server);
		const port = await listen(server);
		const baseUrl = `http://127.0.0.1:${port}`;
		const aliceCookie = await loginCookie(baseUrl, 'alice');
		const bobCookie = await loginCookie(baseUrl, 'bob');
		const roomId = 'control-pending-orphan-1';
		const aliceTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-a', role: 'offerer', account: 'alice' });
		const bobTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-b', role: 'answerer', account: 'bob' });
		const wsUrl = `ws://127.0.0.1:${port}/ws/control?match=${roomId}`;
		const alice = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
		const bob = new WebSocket(`${wsUrl}&peer=peer-b`, controlProtocols(bobTicket.token), { headers: { Cookie: bobCookie } });
		sockets.push(alice, bob);
		await Promise.all([
			new Promise<void>((resolve, reject) => { alice.once('open', () => resolve()); alice.once('error', reject); }),
			new Promise<void>((resolve, reject) => { bob.once('open', () => resolve()); bob.once('error', reject); }),
		]);
		const hello = (peerId: string): string => JSON.stringify({ type: 'control_hello_v1', protocolVersion: 2, matchId: roomId, peerId });
		const aliceOpen = waitForType(alice, 'control_open_v1');
		const bobOpen = waitForType(bob, 'control_open_v1');
		alice.send(hello('peer-a'));
		bob.send(hello('peer-b'));
		await Promise.all([aliceOpen, bobOpen]);

		const bobPeerLeft = waitForType(bob, 'control_peer_left_v1');
		const replacement = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
		sockets.push(replacement);
		await new Promise<void>((resolve, reject) => { replacement.once('open', () => resolve()); replacement.once('error', reject); });
		const aliceClosed = new Promise<void>(resolve => { alice.once('close', () => resolve()); });
		alice.close();
		await aliceClosed;
		replacement.close();
		await expect(bobPeerLeft).resolves.toMatchObject({ opponentPeerId: 'peer-a' });
		expect(bob.readyState).toBe(WebSocket.OPEN);
	});

	it('never allows a newer socket to bypass an existing pending replacement', async () => {
		const app = express();
		app.get('/login/:username', (req, res) => {
			issueHiveWebSession(res, req.params.username);
			res.end('ok');
		});
		server = createServer(app);
		attachP2PControl(server);
		const port = await listen(server);
		const baseUrl = `http://127.0.0.1:${port}`;
		const aliceCookie = await loginCookie(baseUrl, 'alice');
		const bobCookie = await loginCookie(baseUrl, 'bob');
		const roomId = 'control-pending-coalesce-1';
		const aliceTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-a', role: 'offerer', account: 'alice' });
		const bobTicket = buildP2PMatchTicket({ roomId, peerId: 'peer-b', role: 'answerer', account: 'bob' });
		const wsUrl = `ws://127.0.0.1:${port}/ws/control?match=${roomId}`;
		const alice = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
		const bob = new WebSocket(`${wsUrl}&peer=peer-b`, controlProtocols(bobTicket.token), { headers: { Cookie: bobCookie } });
		sockets.push(alice, bob);
		await Promise.all([
			new Promise<void>((resolve, reject) => { alice.once('open', () => resolve()); alice.once('error', reject); }),
			new Promise<void>((resolve, reject) => { bob.once('open', () => resolve()); bob.once('error', reject); }),
		]);
		const hello = (peerId: string): string => JSON.stringify({ type: 'control_hello_v1', protocolVersion: 2, matchId: roomId, peerId });
		const aliceOpen = waitForType(alice, 'control_open_v1');
		const bobOpen = waitForType(bob, 'control_open_v1');
		alice.send(hello('peer-a'));
		bob.send(hello('peer-b'));
		await Promise.all([aliceOpen, bobOpen]);

		const firstCandidate = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
		sockets.push(firstCandidate);
		const firstCandidateClosed = new Promise<void>(resolve => { firstCandidate.once('close', () => resolve()); });
		await new Promise<void>((resolve, reject) => { firstCandidate.once('open', () => resolve()); firstCandidate.once('error', reject); });
		const aliceClosed = new Promise<void>(resolve => { alice.once('close', () => resolve()); });
		alice.close();
		await aliceClosed;

		const secondCandidate = new WebSocket(`${wsUrl}&peer=peer-a`, controlProtocols(aliceTicket.token), { headers: { Cookie: aliceCookie } });
		sockets.push(secondCandidate);
		await new Promise<void>((resolve, reject) => { secondCandidate.once('open', () => resolve()); secondCandidate.once('error', reject); });
		await firstCandidateClosed;
		expect(firstCandidate.readyState).toBe(WebSocket.CLOSED);
		expect(bob.readyState).toBe(WebSocket.OPEN);

		const bobReset = waitForType(bob, 'transport_reset_v2');
		const secondOpen = waitForType(secondCandidate, 'control_open_v1');
		const bobReopen = waitForType(bob, 'control_open_v1');
		secondCandidate.send(hello('peer-a'));
		await expect(bobReset).resolves.toMatchObject({ transportEpoch: 2 });
		await Promise.all([secondOpen, bobReopen]);
		expect(bob.readyState).toBe(WebSocket.OPEN);
	});
});

function timeoutReject(reject: (error: Error) => void): void {
	setTimeout(() => reject(new Error('Timed out waiting for rejected websocket upgrade')), 3_000);
}

import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import WebSocket, { type RawData } from 'ws';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	P2P_MATCH_TICKET_WS_PROTOCOL,
	P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX,
	type P2PMatchTicket,
} from '../../shared/p2pAvailability';
import { buildP2PQueueAuthMessage } from '../../shared/p2pMatchmakingAuth';
import {
	PHASE_CHECKPOINT_PROTOCOL_VERSION,
	PHASE_CHECKPOINT_SCOPE,
	ZERO_PHASE_CHECKPOINT_ID,
} from '../../shared/p2p-wire/phaseCheckpoint';
import { attachP2PRelay } from './p2pRelay';
import { verifyHiveAuth } from '../services/hiveAuth';
import {
	clearStarterCeremonyClaimsForTests,
	setStarterCeremonyClaim,
} from '../services/starterClaimRegistry';

vi.mock('../services/hiveAuth', async () => {
	const actual = await vi.importActual<typeof import('../services/hiveAuth')>('../services/hiveAuth');
	return {
		...actual,
		verifyHiveAuth: vi.fn(async () => ({ valid: true })),
	};
});

type HttpJsonResponse = {
	readonly status: number;
	readonly body: unknown;
};

type MatchedQueueBody = {
	readonly status: 'matched';
	readonly matchId: string;
	readonly opponentPeerId: string;
	readonly isHost: boolean;
	readonly queueToken?: string;
	readonly matchTicket: P2PMatchTicket;
};

type RelayOpenPayload = {
	readonly isHost: boolean;
	readonly remotePeerId: string;
};

const envSnapshot = {
	NODE_ENV: process.env.NODE_ENV,
	VITE_NETWORK_STAGE: process.env.VITE_NETWORK_STAGE,
	P2P_CHALLENGE_SIGNING_SECRET: process.env.P2P_CHALLENGE_SIGNING_SECRET,
	VITE_RAGNAROK_RESET_EPOCH: process.env.VITE_RAGNAROK_RESET_EPOCH,
	RAGNAROK_RESET_EPOCH: process.env.RAGNAROK_RESET_EPOCH,
};

function restoreEnv(): void {
	for (const [key, value] of Object.entries(envSnapshot)) {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringProperty(value: Record<string, unknown>, key: string): string {
	const candidate = value[key];
	expect(typeof candidate).toBe('string');
	return typeof candidate === 'string' ? candidate : '';
}

function readBooleanProperty(value: Record<string, unknown>, key: string): boolean {
	const candidate = value[key];
	expect(typeof candidate).toBe('boolean');
	return typeof candidate === 'boolean' ? candidate : false;
}

function readMatchTicket(value: Record<string, unknown>, key: string): P2PMatchTicket {
	const candidate = value[key];
	expect(isRecord(candidate)).toBe(true);
	const ticket = isRecord(candidate) ? candidate : {};
	return {
		token: readStringProperty(ticket, 'token'),
		roomId: readStringProperty(ticket, 'roomId'),
		peerId: readStringProperty(ticket, 'peerId'),
		expiresAt: Number(ticket.expiresAt),
	};
}

function expectMatchedBody(body: unknown): MatchedQueueBody {
	expect(isRecord(body)).toBe(true);
	const record = isRecord(body) ? body : {};
	expect(record.status).toBe('matched');
	return {
		status: 'matched',
		matchId: readStringProperty(record, 'matchId'),
		opponentPeerId: readStringProperty(record, 'opponentPeerId'),
		isHost: readBooleanProperty(record, 'isHost'),
		...(typeof record.queueToken === 'string' ? { queueToken: record.queueToken } : {}),
		matchTicket: readMatchTicket(record, 'matchTicket'),
	};
}

function rawDataToText(raw: RawData): string {
	if (typeof raw === 'string') return raw;
	if (Buffer.isBuffer(raw)) return raw.toString('utf8');
	if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
	return Buffer.from(raw).toString('utf8');
}

function parseJsonRecord(raw: RawData): Record<string, unknown> | null {
	try {
		const parsed: unknown = JSON.parse(rawDataToText(raw));
		return isRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
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

async function closeServer(server: Server): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
}

async function postJson(
	baseUrl: string,
	path: string,
	body: Record<string, unknown>,
	queueToken?: string,
): Promise<HttpJsonResponse> {
	const response = await fetch(`${baseUrl}${path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(queueToken ? { 'x-p2p-queue-token': queueToken } : {}),
		},
		body: JSON.stringify(body),
	});
	return {
		status: response.status,
		body: await response.json(),
	};
}

async function getJson(
	baseUrl: string,
	path: string,
	queueToken?: string,
): Promise<HttpJsonResponse> {
	const response = await fetch(`${baseUrl}${path}`, {
		headers: queueToken ? { 'x-p2p-queue-token': queueToken } : {},
	});
	return {
		status: response.status,
		body: await response.json(),
	};
}

function queueBody(peerId: string, username: string, starterClaimed = true): Record<string, unknown> {
	return {
		peerId,
		username,
		signature: `${username}-mock-signature`,
		timestamp: Date.now(),
		starterClaimed,
	};
}

function assertNoCrossPeerTicketLeak(body: unknown): void {
	expect(isRecord(body)).toBe(true);
	const record = isRecord(body) ? body : {};
	expect(record.player1MatchTicket).toBeUndefined();
	expect(record.player2MatchTicket).toBeUndefined();
	expect(record.matchTickets).toBeUndefined();
}

function relayProtocols(ticket: P2PMatchTicket): string[] {
	return [
		P2P_MATCH_TICKET_WS_PROTOCOL,
		`${P2P_MATCH_TICKET_WS_PROTOCOL_PREFIX}${ticket.token}`,
	];
}

function waitForRelayOpen(socket: WebSocket): Promise<RelayOpenPayload> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error('Timed out waiting for relay open'));
		}, 5_000);
		const cleanup = () => {
			clearTimeout(timeout);
			socket.off('message', onMessage);
			socket.off('error', onError);
			socket.off('close', onClose);
		};
		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};
		const onClose = () => {
			cleanup();
			reject(new Error('Socket closed before relay open'));
		};
		const onMessage = (raw: RawData) => {
			const message = parseJsonRecord(raw);
			if (!message || message.type !== '__sys' || message.event !== 'open') return;
			const remotePeerId = message.remotePeerId;
			if (typeof remotePeerId !== 'string') {
				cleanup();
				reject(new Error('Relay open message missing remotePeerId'));
				return;
			}
			cleanup();
			resolve({ isHost: message.isHost === true, remotePeerId });
		};
		socket.on('message', onMessage);
		socket.once('error', onError);
		socket.once('close', onClose);
	});
}

function waitForApplicationMessage(socket: WebSocket): Promise<Record<string, unknown>> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error('Timed out waiting for application message'));
		}, 5_000);
		const cleanup = () => {
			clearTimeout(timeout);
			socket.off('message', onMessage);
			socket.off('error', onError);
			socket.off('close', onClose);
		};
		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};
		const onClose = () => {
			cleanup();
			reject(new Error('Socket closed before application message'));
		};
		const onMessage = (raw: RawData) => {
			const message = parseJsonRecord(raw);
			if (!message || message.type === '__sys') return;
			cleanup();
			resolve(message);
		};
		socket.on('message', onMessage);
		socket.once('error', onError);
		socket.once('close', onClose);
	});
}

function waitForPhaseCheckpoint(socket: WebSocket): Promise<Record<string, unknown>> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error('Timed out waiting for phase checkpoint'));
		}, 5_000);
		const cleanup = () => {
			clearTimeout(timeout);
			socket.off('message', onMessage);
			socket.off('error', onError);
		};
		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};
		const onMessage = (raw: RawData) => {
			const envelope = parseJsonRecord(raw);
			if (!envelope || envelope.type !== '__sys' || envelope.event !== 'phase_checkpoint') return;
			if (!isRecord(envelope.message)) return;
			cleanup();
			resolve(envelope.message);
		};
		socket.on('message', onMessage);
		socket.once('error', onError);
	});
}

describe('matchmaking and relay integration', () => {
	beforeEach(() => {
		process.env.NODE_ENV = 'test';
		process.env.VITE_NETWORK_STAGE = 'testnet';
		process.env.VITE_RAGNAROK_RESET_EPOCH = 'alfa-testnet-matchmaking';
		process.env.RAGNAROK_RESET_EPOCH = 'alfa-testnet-matchmaking';
		process.env.P2P_CHALLENGE_SIGNING_SECRET = 'integration-secret-32-characters-minimum';
		clearStarterCeremonyClaimsForTests();
	});

	afterEach(() => {
		restoreEnv();
		vi.clearAllMocks();
	});

	it('matches two authenticated players and lets only their own relay tickets join the room', async () => {
		const { default: matchmakingRouter, clearP2PMatchmakingStateForTests } = await import('./matchmakingRoutes');
		clearP2PMatchmakingStateForTests();
		const app = express();
		app.use(express.json());
		app.use('/api/matchmaking', matchmakingRouter);
		const server = createServer(app);
		attachP2PRelay(server);
		const sockets: WebSocket[] = [];

		try {
			const port = await listenOnEphemeralPort(server);
			const baseUrl = `http://127.0.0.1:${port}`;
			const wsBaseUrl = `ws://127.0.0.1:${port}/ws/p2p`;

			const peerOneId = 'it-peer-one';
			const peerTwoId = 'it-peer-two';
			await setStarterCeremonyClaim('alice', 1_800_000_000_000);
			await setStarterCeremonyClaim('bob', 1_800_000_000_000);

			const unclaimedQueue = await postJson(
				baseUrl,
				'/api/matchmaking/queue',
				queueBody('it-peer-unclaimed', 'charlie', true),
			);
			expect(unclaimedQueue.status).toBe(403);
			expect(unclaimedQueue.body).toMatchObject({ success: false, error: 'starter claim required' });

			const firstQueueBody = queueBody(peerOneId, 'alice');
			const firstQueue = await postJson(baseUrl, '/api/matchmaking/queue', firstQueueBody);
			expect(firstQueue.status).toBe(200);
			expect(vi.mocked(verifyHiveAuth)).not.toHaveBeenCalled();
			expect(isRecord(firstQueue.body)).toBe(true);
			const firstQueueRecord = isRecord(firstQueue.body) ? firstQueue.body : {};
			expect(firstQueueRecord.status).toBe('queued');
			const peerOneQueueToken = readStringProperty(firstQueueRecord, 'queueToken');
			assertNoCrossPeerTicketLeak(firstQueue.body);

			const unauthenticatedStatus = await getJson(baseUrl, `/api/matchmaking/status/${peerOneId}`);
			expect(unauthenticatedStatus.status).toBe(403);

			const secondQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody(peerTwoId, 'bob'));
			expect(secondQueue.status).toBe(200);
			const peerTwoMatch = expectMatchedBody(secondQueue.body);
			expect(peerTwoMatch.matchTicket.peerId).toBe(peerTwoId);
			expect(peerTwoMatch.opponentPeerId).toBe(peerOneId);
			assertNoCrossPeerTicketLeak(secondQueue.body);
			const peerTwoQueueToken = peerTwoMatch.queueToken;
			expect(typeof peerTwoQueueToken).toBe('string');

			const peerOneWrongTokenStatus = await getJson(baseUrl, `/api/matchmaking/status/${peerOneId}`, peerTwoQueueToken);
			expect(peerOneWrongTokenStatus.status).toBe(403);

			const firstStatus = await getJson(baseUrl, `/api/matchmaking/status/${peerOneId}`, peerOneQueueToken);
			expect(firstStatus.status).toBe(200);
			const peerOneMatch = expectMatchedBody(firstStatus.body);
			expect(peerOneMatch.matchId).toBe(peerTwoMatch.matchId);
			expect(peerOneMatch.matchTicket.peerId).toBe(peerOneId);
			expect(peerOneMatch.opponentPeerId).toBe(peerTwoId);
			expect(peerOneMatch.matchTicket.token).not.toBe(peerTwoMatch.matchTicket.token);
			assertNoCrossPeerTicketLeak(firstStatus.body);

			const peerOneSocket = new WebSocket(
				`${wsBaseUrl}?room=${encodeURIComponent(peerOneMatch.matchId)}&peer=${encodeURIComponent(peerOneId)}`,
				relayProtocols(peerOneMatch.matchTicket),
			);
			const peerTwoSocket = new WebSocket(
				`${wsBaseUrl}?room=${encodeURIComponent(peerTwoMatch.matchId)}&peer=${encodeURIComponent(peerTwoId)}`,
				relayProtocols(peerTwoMatch.matchTicket),
			);
			sockets.push(peerOneSocket, peerTwoSocket);

			const [peerOneOpen, peerTwoOpen] = await Promise.all([
				waitForRelayOpen(peerOneSocket),
				waitForRelayOpen(peerTwoSocket),
			]);
			expect(peerOneOpen.remotePeerId).toBe(peerTwoId);
			expect(peerTwoOpen.remotePeerId).toBe(peerOneId);
			expect(peerOneOpen.isHost).not.toBe(peerTwoOpen.isHost);

			const receivedByPeerTwo = waitForApplicationMessage(peerTwoSocket);
			peerOneSocket.send(JSON.stringify({ type: 'ping', t: 1 }));
			await expect(receivedByPeerTwo).resolves.toMatchObject({ type: 'ping', t: 1 });

			const proposal = {
				type: 'phase_checkpoint_propose_v1',
				protocolVersion: PHASE_CHECKPOINT_PROTOCOL_VERSION,
				scope: PHASE_CHECKPOINT_SCOPE,
				matchId: peerOneMatch.matchId,
				epoch: 1,
				fromPhase: 'chess',
				toPhase: 'poker_combat',
				previousCheckpointId: ZERO_PHASE_CHECKPOINT_ID,
				stateRoot: '1'.repeat(64),
			};
			const peerOneCheckpoint = waitForPhaseCheckpoint(peerOneSocket);
			const peerTwoCheckpoint = waitForPhaseCheckpoint(peerTwoSocket);
			peerOneSocket.send(JSON.stringify(proposal));
			peerTwoSocket.send(JSON.stringify(proposal));
			const [firstCommit, secondCommit] = await Promise.all([
				peerOneCheckpoint,
				peerTwoCheckpoint,
			]);
			expect(firstCommit).toEqual(secondCommit);
			expect(firstCommit).toMatchObject({
				type: 'phase_checkpoint_commit_v1',
				roomId: peerOneMatch.matchId,
				matchId: peerOneMatch.matchId,
				epoch: 1,
				stateRoot: '1'.repeat(64),
			});
		} finally {
			for (const socket of sockets) {
				if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
					socket.close();
				}
			}
			await closeServer(server);
		}
	});

	it('requires Hive verification for F2 shared-network queue bodies', async () => {
		process.env.VITE_RAGNAROK_RESET_EPOCH = 'closed-beta-queue-auth';
		process.env.RAGNAROK_RESET_EPOCH = 'closed-beta-queue-auth';
		const { default: matchmakingRouter, clearP2PMatchmakingStateForTests } = await import('./matchmakingRoutes');
		clearP2PMatchmakingStateForTests();
		vi.mocked(verifyHiveAuth).mockClear();
		const app = express();
		app.use(express.json());
		app.use('/api/matchmaking', matchmakingRouter);
		const server = createServer(app);

		try {
			const port = await listenOnEphemeralPort(server);
			const baseUrl = `http://127.0.0.1:${port}`;
			await setStarterCeremonyClaim('alice', 1_800_000_000_000);
			const body = queueBody('f2-signed-peer', 'alice');
			const response = await postJson(baseUrl, '/api/matchmaking/queue', body);
			expect(response.status).toBe(200);
			expect(vi.mocked(verifyHiveAuth)).toHaveBeenCalledWith(
				'alice',
				buildP2PQueueAuthMessage({
					username: 'alice',
					peerId: 'f2-signed-peer',
					starterClaimed: true,
					timestamp: Number(body.timestamp),
				}),
				'alice-mock-signature',
			);
		} finally {
			await closeServer(server);
		}
	});

	it('accepts an unsigned F1 shared-network queue body without Hive verification', async () => {
		const { default: matchmakingRouter, clearP2PMatchmakingStateForTests } = await import('./matchmakingRoutes');
		clearP2PMatchmakingStateForTests();
		vi.mocked(verifyHiveAuth).mockClear();
		const app = express();
		app.use(express.json());
		app.use('/api/matchmaking', matchmakingRouter);
		const server = createServer(app);

		try {
			const port = await listenOnEphemeralPort(server);
			const baseUrl = `http://127.0.0.1:${port}`;
			await setStarterCeremonyClaim('alice', 1_800_000_000_000);
			const response = await postJson(baseUrl, '/api/matchmaking/queue', {
				peerId: 'f1-unsigned-peer',
				username: 'alice',
				starterClaimed: true,
			});
			expect(response.status).toBe(200);
			expect(isRecord(response.body)).toBe(true);
			expect(isRecord(response.body) ? response.body.status : null).toBe('queued');
			expect(vi.mocked(verifyHiveAuth)).not.toHaveBeenCalled();
		} finally {
			await closeServer(server);
		}
	});

	it('does not match or return status for queued peers after their starter receipt disappears', async () => {
		const { default: matchmakingRouter, clearP2PMatchmakingStateForTests } = await import('./matchmakingRoutes');
		clearP2PMatchmakingStateForTests();
		const app = express();
		app.use(express.json());
		app.use('/api/matchmaking', matchmakingRouter);
		const server = createServer(app);

		try {
			const port = await listenOnEphemeralPort(server);
			const baseUrl = `http://127.0.0.1:${port}`;

			await setStarterCeremonyClaim('alice', 1_800_000_000_000);
			const firstQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody('stale-peer-one', 'alice'));
			expect(firstQueue.status).toBe(200);
			expect(isRecord(firstQueue.body)).toBe(true);
			const firstQueueRecord = isRecord(firstQueue.body) ? firstQueue.body : {};
			expect(firstQueueRecord.status).toBe('queued');
			const staleQueueToken = readStringProperty(firstQueueRecord, 'queueToken');

			clearStarterCeremonyClaimsForTests();
			const staleStatus = await getJson(baseUrl, '/api/matchmaking/status/stale-peer-one', staleQueueToken);
			expect(staleStatus.status).toBe(403);
			expect(staleStatus.body).toMatchObject({
				success: false,
				error: 'starter claim required',
			});

			await setStarterCeremonyClaim('alice', 1_800_000_000_000);
			const staleRequeue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody('stale-peer-two', 'alice'));
			expect(staleRequeue.status).toBe(200);
			expect(isRecord(staleRequeue.body)).toBe(true);
			const staleRequeueRecord = isRecord(staleRequeue.body) ? staleRequeue.body : {};
			expect(staleRequeueRecord.status).toBe('queued');

			clearStarterCeremonyClaimsForTests();
			await setStarterCeremonyClaim('bob', 1_800_000_000_000);
			const bobQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody('fresh-peer-bob', 'bob'));
			expect(bobQueue.status).toBe(200);
			expect(bobQueue.body).toMatchObject({
				success: true,
				status: 'queued',
			});
		} finally {
			await closeServer(server);
		}
	});

	it('clears active matches when a matched peer leaves before relay connection', async () => {
		const { default: matchmakingRouter, clearP2PMatchmakingStateForTests } = await import('./matchmakingRoutes');
		clearP2PMatchmakingStateForTests();
		const app = express();
		app.use(express.json());
		app.use('/api/matchmaking', matchmakingRouter);
		const server = createServer(app);

		try {
			const port = await listenOnEphemeralPort(server);
			const baseUrl = `http://127.0.0.1:${port}`;
			const peerOneId = 'leave-peer-one';
			const peerTwoId = 'leave-peer-two';
			await setStarterCeremonyClaim('alice', 1_800_000_000_000);
			await setStarterCeremonyClaim('bob', 1_800_000_000_000);

			const firstQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody(peerOneId, 'alice'));
			expect(firstQueue.status).toBe(200);
			expect(isRecord(firstQueue.body)).toBe(true);
			const firstQueueRecord = isRecord(firstQueue.body) ? firstQueue.body : {};
			expect(firstQueueRecord.status).toBe('queued');
			const peerOneQueueToken = readStringProperty(firstQueueRecord, 'queueToken');

			const secondQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody(peerTwoId, 'bob'));
			expect(secondQueue.status).toBe(200);
			const peerTwoMatch = expectMatchedBody(secondQueue.body);
			expect(peerTwoMatch.queueToken).toBeDefined();
			const peerTwoQueueToken = peerTwoMatch.queueToken ?? '';

			const wrongTokenLeave = await postJson(
				baseUrl,
				'/api/matchmaking/leave',
				{ peerId: peerTwoId },
				peerOneQueueToken,
			);
			expect(wrongTokenLeave.status).toBe(403);
			expect(wrongTokenLeave.body).toMatchObject({ success: false, error: 'queue token required' });

			const stillMatchedStatus = await getJson(baseUrl, `/api/matchmaking/status/${peerOneId}`, peerOneQueueToken);
			expect(stillMatchedStatus.status).toBe(200);
			expectMatchedBody(stillMatchedStatus.body);

			const leaveResponse = await postJson(
				baseUrl,
				'/api/matchmaking/leave',
				{ peerId: peerTwoId },
				peerTwoQueueToken,
			);
			expect(leaveResponse.status).toBe(200);
			expect(leaveResponse.body).toMatchObject({ success: true });

			const remainingPeerStatus = await getJson(baseUrl, `/api/matchmaking/status/${peerOneId}`, peerOneQueueToken);
			expect(remainingPeerStatus.status).toBe(200);
			expectMatchedBody(remainingPeerStatus.body);
		} finally {
			await closeServer(server);
		}
	});
});

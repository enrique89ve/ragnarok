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
import {
	PHASE_CHECKPOINT_PROTOCOL_VERSION,
	PHASE_CHECKPOINT_SCOPE,
	ZERO_PHASE_CHECKPOINT_ID,
} from '../../shared/p2p-wire/phaseCheckpoint';
import { attachP2PRelay } from './p2pRelay';
import hiveSessionRouter from './hiveSessionRoutes';
import { verifyHiveAuth } from '../services/hiveAuth';
import {
	clearStarterCeremonyClaimsForTests,
	setStarterCeremonyClaim,
} from '../services/starterClaimRegistry';
import { clearHiveWebSessionsForTests } from '../services/hiveWebSession';
import { buildMatchmakingDelegationMessage } from '../../shared/p2pMatchDelegation';

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
	readonly status: 'ready';
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
	expect(record.status).toBe('ready');
	return {
		status: 'ready',
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
	cookie?: string,
): Promise<HttpJsonResponse> {
	const response = await fetch(`${baseUrl}${path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(queueToken ? { 'x-p2p-queue-token': queueToken } : {}),
			...(cookie ? { Cookie: cookie } : {}),
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
	cookie?: string,
): Promise<HttpJsonResponse> {
	const response = await fetch(`${baseUrl}${path}`, {
		headers: {
			...(queueToken ? { 'x-p2p-queue-token': queueToken } : {}),
			...(cookie ? { Cookie: cookie } : {}),
		},
	});
	return {
		status: response.status,
		body: await response.json(),
	};
}

async function loginSession(baseUrl: string, username: string): Promise<string> {
	const timestamp = Date.now();
	const response = await fetch(`${baseUrl}/api/session/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, timestamp, signature: `${username}-login-signature` }),
	});
	expect(response.status).toBe(200);
	const cookie = response.headers.get('set-cookie');
	if (!cookie) throw new Error('Hive session cookie missing');
	return cookie.split(';', 1)[0];
}

function queueBody(peerId: string, username: string, starterClaimed = true): Record<string, unknown> {
	return {
		peerId,
		username,
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

type TestOffer = {
	readonly protocol: 'ragnarok-match-offer-v1';
	readonly offerId: string;
	readonly matchId: string;
	readonly player: { readonly peerId: string; readonly username?: string; readonly elo: number };
	readonly opponent: { readonly peerId: string; readonly username?: string; readonly elo: number };
	readonly createdAt: number;
	readonly expiresAt: number;
	readonly serverNonce: string;
};

function readOffer(value: unknown): TestOffer {
	expect(isRecord(value)).toBe(true);
	return value as TestOffer;
}

function acceptanceForOffer(offer: TestOffer, pubkey: string, signature: string): Record<string, unknown> {
	return {
		protocol: 'ragnarok-match-accept-v1',
		offerId: offer.offerId,
		matchId: offer.matchId,
		account: offer.player.username,
		peerId: offer.player.peerId,
		opponentAccount: offer.opponent.username,
		opponentPeerId: offer.opponent.peerId,
		ephemeralPubkey: pubkey,
		rulesetHash: 'registry-test',
		engineHash: 'engine-test',
		serverNonce: offer.serverNonce,
		expiresAt: offer.expiresAt,
		hiveSig: signature,
	};
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
		clearHiveWebSessionsForTests();
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
		app.use('/api/session', hiveSessionRouter);
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
			const charlieCookie = await loginSession(baseUrl, 'charlie');
			const aliceCookie = await loginSession(baseUrl, 'alice');
			const bobCookie = await loginSession(baseUrl, 'bob');
			vi.mocked(verifyHiveAuth).mockClear();
			await setStarterCeremonyClaim('alice', 1_800_000_000_000);
			await setStarterCeremonyClaim('bob', 1_800_000_000_000);

			const unclaimedQueue = await postJson(
				baseUrl,
				'/api/matchmaking/queue',
				queueBody('it-peer-unclaimed', 'charlie', true),
				undefined,
				charlieCookie,
			);
			expect(unclaimedQueue.status).toBe(403);
			expect(unclaimedQueue.body).toMatchObject({ success: false, error: 'starter claim required' });

			const firstQueueBody = queueBody(peerOneId, 'alice');
			const firstQueue = await postJson(baseUrl, '/api/matchmaking/queue', firstQueueBody, undefined, aliceCookie);
			expect(firstQueue.status).toBe(200);
			expect(vi.mocked(verifyHiveAuth)).not.toHaveBeenCalled();
			expect(isRecord(firstQueue.body)).toBe(true);
			const firstQueueRecord = isRecord(firstQueue.body) ? firstQueue.body : {};
			expect(firstQueueRecord.status).toBe('queued');
			const peerOneQueueToken = readStringProperty(firstQueueRecord, 'queueToken');
			assertNoCrossPeerTicketLeak(firstQueue.body);

			const unauthenticatedStatus = await getJson(baseUrl, `/api/matchmaking/status/${peerOneId}`);
			expect(unauthenticatedStatus.status).toBe(401);

			const secondQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody(peerTwoId, 'bob'), undefined, bobCookie);
			expect(secondQueue.status).toBe(200);
			expect(secondQueue.body).toMatchObject({ success: true, status: 'offered' });
			const peerTwoOffer = readOffer(isRecord(secondQueue.body) ? secondQueue.body.offer : null);
			expect(peerTwoOffer.opponent.peerId).toBe(peerOneId);
			assertNoCrossPeerTicketLeak(secondQueue.body);
			const peerTwoQueueToken = readStringProperty(isRecord(secondQueue.body) ? secondQueue.body : {}, 'queueToken');

			const peerOneWrongTokenStatus = await getJson(baseUrl, `/api/matchmaking/status/${peerOneId}`, peerTwoQueueToken, aliceCookie);
			expect(peerOneWrongTokenStatus.status).toBe(403);

			const firstStatus = await getJson(baseUrl, `/api/matchmaking/status/${peerOneId}`, peerOneQueueToken, aliceCookie);
			expect(firstStatus.status).toBe(200);
			expect(firstStatus.body).toMatchObject({ success: true, status: 'offered' });
			const peerOneOffer = readOffer(isRecord(firstStatus.body) ? firstStatus.body.offer : null);
			expect(peerOneOffer.matchId).toBe(peerTwoOffer.matchId);
			assertNoCrossPeerTicketLeak(firstStatus.body);

			const firstAccepted = await postJson(baseUrl, '/api/matchmaking/accept', {
				peerId: peerOneId,
				offerId: peerOneOffer.offerId,
				acceptance: acceptanceForOffer(peerOneOffer, 'a'.repeat(43), 'alice-acceptance-signature'),
			}, peerOneQueueToken, aliceCookie);
			expect(firstAccepted.body).toMatchObject({ success: true, status: 'waiting_opponent' });
			const secondAccepted = await postJson(baseUrl, '/api/matchmaking/accept', {
				peerId: peerTwoId,
				offerId: peerTwoOffer.offerId,
				acceptance: acceptanceForOffer(peerTwoOffer, 'b'.repeat(43), 'bob-acceptance-signature'),
			}, peerTwoQueueToken, bobCookie);
			const peerTwoMatch = expectMatchedBody(secondAccepted.body);
			const retryAfterCommit = await postJson(baseUrl, '/api/matchmaking/accept', {
				peerId: peerTwoId,
				offerId: peerTwoOffer.offerId,
				acceptance: acceptanceForOffer(peerTwoOffer, 'b'.repeat(43), 'bob-acceptance-signature'),
			}, peerTwoQueueToken, bobCookie);
			const retryMatch = expectMatchedBody(retryAfterCommit.body);
			expect(retryMatch).toMatchObject({
				matchId: peerTwoMatch.matchId,
				matchTicket: peerTwoMatch.matchTicket,
			});
			expect(peerTwoMatch.matchTicket.peerId).toBe(peerTwoId);
			expect(peerTwoMatch.opponentPeerId).toBe(peerOneId);
			const peerOneMatch = expectMatchedBody((await getJson(baseUrl, `/api/matchmaking/status/${peerOneId}`, peerOneQueueToken, aliceCookie)).body);
			expect(peerOneMatch.matchId).toBe(peerTwoMatch.matchId);
			expect(peerOneMatch.matchTicket.peerId).toBe(peerOneId);
			expect(peerOneMatch.opponentPeerId).toBe(peerTwoId);
			expect(peerOneMatch.matchTicket.token).not.toBe(peerTwoMatch.matchTicket.token);

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

	it('accepts a single Hive-signed Find delegation and creates the reusable web session', async () => {
		const { default: matchmakingRouter, clearP2PMatchmakingStateForTests } = await import('./matchmakingRoutes');
		clearP2PMatchmakingStateForTests();
		const app = express();
		app.use(express.json());
		app.use('/api/matchmaking', matchmakingRouter);
		const server = createServer(app);

		try {
			const port = await listenOnEphemeralPort(server);
			const baseUrl = `http://127.0.0.1:${port}`;
			const peerId = 'find-delegation-peer';
			await setStarterCeremonyClaim('alice', 1_800_000_000_000);

			const challengeResponse = await postJson(baseUrl, '/api/matchmaking/delegation-challenge', {
				account: 'alice',
				peerId,
				rulesetHash: 'registry-test',
				engineHash: 'engine-test',
			});
			expect(challengeResponse.status).toBe(200);
			expect(isRecord(challengeResponse.body)).toBe(true);
			const challenge = isRecord(challengeResponse.body) && isRecord(challengeResponse.body.challenge)
				? challengeResponse.body.challenge
				: null;
			expect(challenge).not.toBeNull();
			if (!challenge) throw new Error('delegation challenge missing');

			const proof = {
				...challenge,
				ephemeralPubkey: 'c'.repeat(43),
				hiveSig: 'delegation-signature',
			};
			vi.mocked(verifyHiveAuth).mockClear();
			const queueResponse = await fetch(`${baseUrl}/api/matchmaking/queue`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ peerId, username: 'alice', starterClaimed: true, delegation: proof }),
			});
			expect(queueResponse.status).toBe(200);
			expect(await queueResponse.json()).toMatchObject({ success: true, status: 'queued' });
			expect(queueResponse.headers.get('set-cookie')).toContain('ragnarok-hive-session=');
			const { hiveSig: _hiveSig, ...delegationPayload } = proof;
			expect(vi.mocked(verifyHiveAuth)).toHaveBeenCalledWith(
				'alice',
				buildMatchmakingDelegationMessage(delegationPayload),
				'delegation-signature',
			);
		} finally {
			await closeServer(server);
		}
	});

	it('reuses the HTTP Hive session without verifying the queue request again', async () => {
		const { default: matchmakingRouter, clearP2PMatchmakingStateForTests } = await import('./matchmakingRoutes');
		clearP2PMatchmakingStateForTests();
		vi.mocked(verifyHiveAuth).mockClear();
		const app = express();
		app.use(express.json());
		app.use('/api/session', hiveSessionRouter);
		app.use('/api/matchmaking', matchmakingRouter);
		const server = createServer(app);

		try {
			const port = await listenOnEphemeralPort(server);
			const baseUrl = `http://127.0.0.1:${port}`;
			const cookie = await loginSession(baseUrl, 'alice');
			vi.mocked(verifyHiveAuth).mockClear();
			await setStarterCeremonyClaim('alice', 1_800_000_000_000);
			const body = queueBody('f2-signed-peer', 'alice');
			const response = await postJson(baseUrl, '/api/matchmaking/queue', body, undefined, cookie);
			expect(response.status).toBe(200);
			expect(vi.mocked(verifyHiveAuth)).not.toHaveBeenCalled();
		} finally {
			await closeServer(server);
		}
	});

	it('keeps matchmaking status uncached and does not duplicate a pending offer on retry', async () => {
		const { default: matchmakingRouter, clearP2PMatchmakingStateForTests } = await import('./matchmakingRoutes');
		clearP2PMatchmakingStateForTests();
		const app = express();
		app.use(express.json());
		app.use('/api/session', hiveSessionRouter);
		app.use('/api/matchmaking', matchmakingRouter);
		const server = createServer(app);

		try {
			const port = await listenOnEphemeralPort(server);
			const baseUrl = `http://127.0.0.1:${port}`;
			const aliceCookie = await loginSession(baseUrl, 'alice');
			const bobCookie = await loginSession(baseUrl, 'bob');
			await setStarterCeremonyClaim('alice', 1_800_000_000_000);
			await setStarterCeremonyClaim('bob', 1_800_000_000_000);

			const firstQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody('cache-peer-a', 'alice'), undefined, aliceCookie);
			const firstQueueRecord = isRecord(firstQueue.body) ? firstQueue.body : {};
			const firstToken = readStringProperty(firstQueueRecord, 'queueToken');
			const secondQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody('cache-peer-b', 'bob'), undefined, bobCookie);
			expect(secondQueue.body).toMatchObject({ success: true, status: 'offered' });
			const secondRecord = isRecord(secondQueue.body) ? secondQueue.body : {};
			const secondToken = readStringProperty(secondRecord, 'queueToken');
			const offer = readOffer(secondRecord.offer);

			const initialStatus = await fetch(`${baseUrl}/api/matchmaking/status/cache-peer-a`, {
				headers: { Cookie: aliceCookie, 'x-p2p-queue-token': firstToken },
			});
			expect(initialStatus.status).toBe(200);
			expect(initialStatus.headers.get('cache-control')).toContain('no-store');
			const etag = initialStatus.headers.get('etag');
			if (!etag) throw new Error('Expected matchmaking status ETag');
			const conditionalStatus = await fetch(`${baseUrl}/api/matchmaking/status/cache-peer-a`, {
				headers: { Cookie: aliceCookie, 'x-p2p-queue-token': firstToken, 'If-None-Match': etag },
			});
			expect(conditionalStatus.status).toBe(200);
			expect(await conditionalStatus.json()).toMatchObject({ status: 'offered', offer: { offerId: offer.offerId } });

			const retryQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody('cache-peer-a', 'alice'), firstToken, aliceCookie);
			expect(retryQueue.body).toMatchObject({ success: true, status: 'offered' });
			const retryRecord = isRecord(retryQueue.body) ? retryQueue.body : {};
			expect(readOffer(retryRecord.offer).offerId).toBe(offer.offerId);

			const secondRetryQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody('cache-peer-b', 'bob'), secondToken, bobCookie);
			expect(secondRetryQueue.body).toMatchObject({ success: true, status: 'offered' });
			expect(readOffer(isRecord(secondRetryQueue.body) ? secondRetryQueue.body.offer : null).offerId).toBe(offer.offerId);
		} finally {
			await closeServer(server);
		}
	});

	it('rejects matchmaking without the reusable HTTP Hive session', async () => {
		const { default: matchmakingRouter, clearP2PMatchmakingStateForTests } = await import('./matchmakingRoutes');
		clearP2PMatchmakingStateForTests();
		vi.mocked(verifyHiveAuth).mockClear();
		const app = express();
		app.use(express.json());
		app.use('/api/session', hiveSessionRouter);
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
			expect(response.status).toBe(401);
			expect(response.body).toMatchObject({ success: false, error: 'Hive web session required for shared-network matchmaking' });
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
		app.use('/api/session', hiveSessionRouter);
		app.use('/api/matchmaking', matchmakingRouter);
		const server = createServer(app);

		try {
			const port = await listenOnEphemeralPort(server);
			const baseUrl = `http://127.0.0.1:${port}`;
			const aliceCookie = await loginSession(baseUrl, 'alice');

			await setStarterCeremonyClaim('alice', 1_800_000_000_000);
			const firstQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody('stale-peer-one', 'alice'), undefined, aliceCookie);
			expect(firstQueue.status).toBe(200);
			expect(isRecord(firstQueue.body)).toBe(true);
			const firstQueueRecord = isRecord(firstQueue.body) ? firstQueue.body : {};
			expect(firstQueueRecord.status).toBe('queued');
			const staleQueueToken = readStringProperty(firstQueueRecord, 'queueToken');

			clearStarterCeremonyClaimsForTests();
			const staleStatus = await getJson(baseUrl, '/api/matchmaking/status/stale-peer-one', staleQueueToken, aliceCookie);
			expect(staleStatus.status).toBe(403);
			expect(staleStatus.body).toMatchObject({
				success: false,
				error: 'starter claim required',
			});

			await setStarterCeremonyClaim('alice', 1_800_000_000_000);
			const staleRequeue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody('stale-peer-two', 'alice'), undefined, aliceCookie);
			expect(staleRequeue.status).toBe(200);
			expect(isRecord(staleRequeue.body)).toBe(true);
			const staleRequeueRecord = isRecord(staleRequeue.body) ? staleRequeue.body : {};
			expect(staleRequeueRecord.status).toBe('queued');

			clearStarterCeremonyClaimsForTests();
			await setStarterCeremonyClaim('bob', 1_800_000_000_000);
			const bobCookie = await loginSession(baseUrl, 'bob');
			const bobQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody('fresh-peer-bob', 'bob'), undefined, bobCookie);
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
		app.use('/api/session', hiveSessionRouter);
		app.use('/api/matchmaking', matchmakingRouter);
		const server = createServer(app);

		try {
			const port = await listenOnEphemeralPort(server);
			const baseUrl = `http://127.0.0.1:${port}`;
			const peerOneId = 'leave-peer-one';
			const peerTwoId = 'leave-peer-two';
			const aliceCookie = await loginSession(baseUrl, 'alice');
			const bobCookie = await loginSession(baseUrl, 'bob');
			await setStarterCeremonyClaim('alice', 1_800_000_000_000);
			await setStarterCeremonyClaim('bob', 1_800_000_000_000);

			const firstQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody(peerOneId, 'alice'), undefined, aliceCookie);
			expect(firstQueue.status).toBe(200);
			expect(isRecord(firstQueue.body)).toBe(true);
			const firstQueueRecord = isRecord(firstQueue.body) ? firstQueue.body : {};
			expect(firstQueueRecord.status).toBe('queued');
			const peerOneQueueToken = readStringProperty(firstQueueRecord, 'queueToken');

			const secondQueue = await postJson(baseUrl, '/api/matchmaking/queue', queueBody(peerTwoId, 'bob'), undefined, bobCookie);
			expect(secondQueue.status).toBe(200);
			expect(secondQueue.body).toMatchObject({ success: true, status: 'offered' });
			const peerTwoOffer = readOffer(isRecord(secondQueue.body) ? secondQueue.body.offer : null);
			const peerTwoQueueToken = readStringProperty(isRecord(secondQueue.body) ? secondQueue.body : {}, 'queueToken');

			const wrongTokenLeave = await postJson(
				baseUrl,
				'/api/matchmaking/leave',
				{ peerId: peerTwoId },
				peerOneQueueToken,
				bobCookie,
			);
			expect(wrongTokenLeave.status).toBe(403);
			expect(wrongTokenLeave.body).toMatchObject({ success: false, error: 'queue token required' });

			const stillMatchedStatus = await getJson(baseUrl, `/api/matchmaking/status/${peerOneId}`, peerOneQueueToken, aliceCookie);
			expect(stillMatchedStatus.status).toBe(200);
			expect(stillMatchedStatus.body).toMatchObject({ success: true, status: 'offered' });

			const leaveResponse = await postJson(
				baseUrl,
				'/api/matchmaking/leave',
				{ peerId: peerTwoId },
				peerTwoQueueToken,
				bobCookie,
			);
			expect(leaveResponse.status).toBe(200);
			expect(leaveResponse.body).toMatchObject({ success: true });

			const remainingPeerStatus = await getJson(baseUrl, `/api/matchmaking/status/${peerOneId}`, peerOneQueueToken, aliceCookie);
			expect(remainingPeerStatus.status).toBe(200);
			expect(remainingPeerStatus.body).toMatchObject({ success: true, status: 'not_queued' });
		} finally {
			await closeServer(server);
		}
	});
});

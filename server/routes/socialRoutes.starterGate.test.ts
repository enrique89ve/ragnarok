import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyHiveAuth } from '../services/hiveAuth';
import {
	clearStarterCeremonyClaimsForTests,
	setStarterCeremonyClaim,
} from '../services/starterClaimRegistry';
import {
	clearAcceptedWarbandRelationsForTest,
	setAcceptedWarbandRelationForTest,
} from '../services/warbandRelations';

vi.mock('../services/hiveAuth', async () => {
	const actual = await vi.importActual<typeof import('../services/hiveAuth')>('../services/hiveAuth');
	return {
		...actual,
		verifyHiveAuth: vi.fn(async () => ({ valid: true })),
	};
});

type JsonResponse = {
	readonly status: number;
	readonly body: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function listen(server: Server): Promise<string> {
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			server.off('error', reject);
			resolve();
		});
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('expected TCP server address');
	return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		server.close(error => error ? reject(error) : resolve());
	});
}

function authHeaders(username: string): Record<string, string> {
	return {
		'Content-Type': 'application/json',
		'x-hive-username': username,
		'x-hive-signature': `${username}-signature`,
		'x-hive-timestamp': String(Date.now()),
	};
}

async function postJson(baseUrl: string, path: string, username: string, body: Record<string, unknown>): Promise<JsonResponse> {
	const response = await fetch(`${baseUrl}${path}`, {
		method: 'POST',
		headers: authHeaders(username),
		body: JSON.stringify(body),
	});
	return {
		status: response.status,
		body: await response.json(),
	};
}

async function getJson(baseUrl: string, path: string, username: string): Promise<JsonResponse> {
	const response = await fetch(`${baseUrl}${path}`, {
		method: 'GET',
		headers: authHeaders(username),
	});
	return {
		status: response.status,
		body: await response.json(),
	};
}

async function withSocialServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
	const { default: socialRouter, clearP2PSocialStateForTests } = await import('./socialRoutes');
	clearP2PSocialStateForTests();
	const app = express();
	app.use(express.json());
	app.use('/api/friends', socialRouter);
	const server = createServer(app);
	try {
		await run(await listen(server));
	} finally {
		await closeServer(server);
	}
}

describe('socialRoutes starter P2P gate', () => {
	beforeEach(() => {
		process.env.NODE_ENV = 'test';
		process.env.VITE_NETWORK_STAGE = 'testnet';
		process.env.P2P_CHALLENGE_SIGNING_SECRET = 'social-starter-secret-32-characters';
		clearAcceptedWarbandRelationsForTest();
		clearStarterCeremonyClaimsForTests();
		vi.clearAllMocks();
	});

	it('does not expose a heartbeat peer id for accounts without a starter receipt', async () => {
		await setStarterCeremonyClaim('bob', Date.now());
		setAcceptedWarbandRelationForTest('alice', 'bob');

		await withSocialServer(async (baseUrl) => {
			const aliceHeartbeat = await postJson(baseUrl, '/api/friends/heartbeat', 'alice', {
				username: 'alice',
				friends: [],
				peerId: 'alice-peer',
				availability: 'available',
			});
			expect(aliceHeartbeat.status).toBe(200);

			const bobHeartbeat = await postJson(baseUrl, '/api/friends/heartbeat', 'bob', {
				username: 'bob',
				friends: ['alice'],
				peerId: 'bob-peer',
				availability: 'available',
			});
			expect(bobHeartbeat.status).toBe(200);
			expect(isRecord(bobHeartbeat.body)).toBe(true);
			const statuses = isRecord(bobHeartbeat.body) && isRecord(bobHeartbeat.body.statuses)
				? bobHeartbeat.body.statuses
				: {};
			expect(statuses.alice).toMatchObject({
				online: true,
				availability: 'offline',
				canReceiveChallenge: false,
			});
			expect(isRecord(statuses.alice) ? statuses.alice.peerId : undefined).toBeUndefined();
		});
	});

	it('rejects direct challenges unless both accounts have starter receipts', async () => {
		setAcceptedWarbandRelationForTest('alice', 'bob');
		await setStarterCeremonyClaim('bob', Date.now());

		await withSocialServer(async (baseUrl) => {
			const missingSenderReceipt = await postJson(baseUrl, '/api/friends/challenge', 'alice', {
				from: 'alice',
				to: 'bob',
				peerId: 'alice-peer',
			});
			expect(missingSenderReceipt.status).toBe(403);
			expect(missingSenderReceipt.body).toMatchObject({
				ok: false,
				reason: 'starter_claim_required',
			});
		});

		clearStarterCeremonyClaimsForTests();
		await setStarterCeremonyClaim('alice', Date.now());

		await withSocialServer(async (baseUrl) => {
			const missingTargetReceipt = await postJson(baseUrl, '/api/friends/challenge', 'alice', {
				from: 'alice',
				to: 'bob',
				peerId: 'alice-peer',
			});
			expect(missingTargetReceipt.status).toBe(403);
			expect(missingTargetReceipt.body).toMatchObject({
				ok: false,
				reason: 'starter_claim_required',
			});
		});

		expect(vi.mocked(verifyHiveAuth)).toHaveBeenCalled();
	});

	it('does not deliver pending challenge tickets after the receiver loses starter access', async () => {
		setAcceptedWarbandRelationForTest('alice', 'bob');
		await setStarterCeremonyClaim('alice', Date.now());
		await setStarterCeremonyClaim('bob', Date.now());

		await withSocialServer(async (baseUrl) => {
			const bobHeartbeat = await postJson(baseUrl, '/api/friends/heartbeat', 'bob', {
				username: 'bob',
				friends: [],
				peerId: 'bob-peer',
				availability: 'available',
			});
			expect(bobHeartbeat.status).toBe(200);

			const challenge = await postJson(baseUrl, '/api/friends/challenge', 'alice', {
				from: 'alice',
				to: 'bob',
				peerId: 'alice-peer',
			});
			expect(challenge.status).toBe(200);

			clearStarterCeremonyClaimsForTests();
			await setStarterCeremonyClaim('alice', Date.now());

			const blocked = await getJson(baseUrl, '/api/friends/challenges/bob', 'bob');
			expect(blocked.status).toBe(403);
			expect(blocked.body).toMatchObject({
				ok: false,
				reason: 'starter_claim_required',
			});

			await setStarterCeremonyClaim('bob', Date.now());
			const afterBlock = await getJson(baseUrl, '/api/friends/challenges/bob', 'bob');
			expect(afterBlock.status).toBe(200);
			expect(afterBlock.body).toMatchObject({ challenges: [] });
		});
	});
});

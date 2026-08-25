import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildStarterClaimAuthMessage } from '../../shared/starterClaimAuth';
import { verifyHiveAuth } from '../services/hiveAuth';
import {
	clearStarterCeremonyClaimsForTests,
	hasStarterCeremonyClaim,
} from '../services/starterClaimRegistry';

vi.mock('../services/hiveAuth', async () => {
	const actual = await vi.importActual<typeof import('../services/hiveAuth')>('../services/hiveAuth');
	return {
		...actual,
		verifyHiveAuth: vi.fn(async () => ({ valid: true })),
	};
});

async function createApp() {
	const { default: starterClaimRouter } = await import('./starterClaimRoutes');
	const app = express();
	app.use(express.json());
	app.use('/api/starter', starterClaimRouter);
	return app;
}

async function postStarterClaim(body: Record<string, unknown>): Promise<Response> {
	const app = await createApp();
	const server = app.listen(0);
	try {
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('expected TCP address');
		return await fetch(`http://127.0.0.1:${address.port}/api/starter/claim`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
	} finally {
		await new Promise<void>((resolve, reject) => {
			server.close(error => error ? reject(error) : resolve());
		});
	}
}

function setProtocolPhase(phase: 'local-gameplay-v1' | 'hive-testnet-v1'): void {
	const resetEpoch = phase === 'local-gameplay-v1'
		? 'alfa-testnet-starter-claim'
		: 'closed-beta-starter-claim';
	vi.stubEnv('VITE_NETWORK_STAGE', 'testnet');
	vi.stubEnv('VITE_RAGNAROK_PROTOCOL_ID', 'rk_game_testnet');
	vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', resetEpoch);
	vi.stubEnv('RAGNAROK_PROTOCOL_ID', 'rk_game_testnet');
	vi.stubEnv('RAGNAROK_RESET_EPOCH', resetEpoch);
}

describe('starterClaimRoutes', () => {
	beforeEach(() => {
		vi.stubEnv('NODE_ENV', 'test');
		clearStarterCeremonyClaimsForTests();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('accepts and normalizes an unsigned F1 starter claim without Hive verification', async () => {
		setProtocolPhase('local-gameplay-v1');
		const response = await postStarterClaim({ username: ' Alice ' });

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({
			success: true,
			account: 'alice',
		});
		await expect(hasStarterCeremonyClaim('alice')).resolves.toBe(true);
		expect(vi.mocked(verifyHiveAuth)).not.toHaveBeenCalled();
	});

	it('rejects an empty F1 starter claim username', async () => {
		setProtocolPhase('local-gameplay-v1');
		const response = await postStarterClaim({ username: '   ' });

		expect(response.status).toBe(400);
		await expect(hasStarterCeremonyClaim('alice')).resolves.toBe(false);
		expect(vi.mocked(verifyHiveAuth)).not.toHaveBeenCalled();
	});

	it('records an F2 starter ceremony claim after Hive body auth succeeds', async () => {
		setProtocolPhase('hive-testnet-v1');
		const timestamp = Date.now();
		const response = await postStarterClaim({
			username: 'Alice',
			timestamp,
			signature: 'starter-signature',
		});

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({
			success: true,
			account: 'alice',
		});
		await expect(hasStarterCeremonyClaim('alice')).resolves.toBe(true);
		expect(vi.mocked(verifyHiveAuth)).toHaveBeenCalledWith(
			'alice',
			buildStarterClaimAuthMessage({ username: 'alice', timestamp }),
			'starter-signature',
		);
	});

	it('rejects unsigned F2 starter claim attempts', async () => {
		setProtocolPhase('hive-testnet-v1');
		const response = await postStarterClaim({
			username: 'alice',
			timestamp: 1_800_000_000_000,
		});

		expect(response.status).toBe(401);
		await expect(hasStarterCeremonyClaim('alice')).resolves.toBe(false);
	});
});

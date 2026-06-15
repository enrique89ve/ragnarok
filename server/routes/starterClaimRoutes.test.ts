import express from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';
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

describe('starterClaimRoutes', () => {
	beforeEach(() => {
		process.env.NODE_ENV = 'test';
		clearStarterCeremonyClaimsForTests();
		vi.clearAllMocks();
	});

	it('records a starter ceremony claim after Hive body auth succeeds', async () => {
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

	it('rejects unsigned starter claim attempts', async () => {
		const response = await postStarterClaim({
			username: 'alice',
			timestamp: 1_800_000_000_000,
		});

		expect(response.status).toBe(401);
		await expect(hasStarterCeremonyClaim('alice')).resolves.toBe(false);
	});
});

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildRagnarokRuntimeEvidence } from '../../shared/runtimeConfig';
import { getRagnarokServerRuntimeConfig } from './runtimeConfig';

async function loadRegistryModule() {
	return import('./starterClaimRegistry');
}

describe('starterClaimRegistry', () => {
	let tempDir: string;
	let claimsFile: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'starter-claims-'));
		claimsFile = path.join(tempDir, 'starter-claims.test.json');
		vi.stubEnv('NODE_ENV', 'test');
		vi.stubEnv('RAGNAROK_STARTER_CLAIMS_FILE', claimsFile);
		vi.stubEnv('VITE_NETWORK_STAGE', 'local');
		vi.stubEnv('VITE_RAGNAROK_PROTOCOL_ID', 'rk_game_local');
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'local-starter-claims');
		vi.stubEnv('RAGNAROK_PROTOCOL_ID', 'rk_game_local');
		vi.stubEnv('RAGNAROK_RESET_EPOCH', 'local-starter-claims');
	});

	afterEach(async () => {
		const mod = await loadRegistryModule();
		mod.resetStarterClaimRegistryForTests();
		vi.unstubAllEnvs();
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it('persists claims atomically and reloads after simulated restart', async () => {
		const mod = await loadRegistryModule();
		mod.resetStarterClaimRegistryForTests();

		await mod.setStarterCeremonyClaim('alice', 1_700_000_000_000);
		await mod.setStarterCeremonyClaim('bob', 1_700_000_000_001);

		const raw = JSON.parse(await fs.readFile(claimsFile, 'utf8')) as { version: number; claims: unknown[] };
		expect(raw.version).toBe(2);
		expect(raw.claims).toHaveLength(2);

		mod.resetStarterClaimRegistryForTests();
		expect(await mod.hasStarterCeremonyClaim('alice')).toBe(true);
		expect(await mod.hasStarterCeremonyClaim('bob')).toBe(true);
	});

	it('serializes concurrent claims into valid JSON with every account present', async () => {
		const mod = await loadRegistryModule();
		mod.resetStarterClaimRegistryForTests();

		const accounts = Array.from({ length: 12 }, (_, index) => `player${index}`);
		await Promise.all(accounts.map((account, index) => mod.setStarterCeremonyClaim(account, 1_710_000_000_000 + index)));

		const raw = JSON.parse(await fs.readFile(claimsFile, 'utf8')) as {
			claims: Array<{ account: string }>;
		};
		const saved = new Set(raw.claims.map((entry) => entry.account));
		for (const account of accounts) {
			expect(saved.has(account)).toBe(true);
		}
	});

	it('rejects files whose runtimeFingerprint does not match the current epoch', async () => {
		const mod = await loadRegistryModule();
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'stale-epoch');
		vi.stubEnv('RAGNAROK_RESET_EPOCH', 'stale-epoch');
		const staleFingerprint = buildRagnarokRuntimeEvidence(getRagnarokServerRuntimeConfig()).runtimeFingerprint;
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'local-starter-claims');
		vi.stubEnv('RAGNAROK_RESET_EPOCH', 'local-starter-claims');
		await fs.writeFile(claimsFile, `${JSON.stringify({
			version: 2,
			runtimeFingerprint: staleFingerprint,
			claims: [{ account: 'alice', claimedAt: 1 }],
		}, null, 2)}\n`);

		mod.resetStarterClaimRegistryForTests();
		await expect(mod.hasStarterCeremonyClaim('alice')).rejects.toThrow(/fingerprint mismatch/i);
	});

	it('keeps existing disk claims when load races with a concurrent write on cold start', async () => {
		const mod = await loadRegistryModule();
		const fingerprint = buildRagnarokRuntimeEvidence(getRagnarokServerRuntimeConfig()).runtimeFingerprint;
		await fs.writeFile(claimsFile, `${JSON.stringify({
			version: 2,
			runtimeFingerprint: fingerprint,
			claims: [{ account: 'alice', claimedAt: 1_700_000_000_000 }],
		}, null, 2)}\n`);

		mod.resetStarterClaimRegistryForTests();
		await Promise.all([
			mod.hasStarterCeremonyClaim('alice'),
			mod.setStarterCeremonyClaim('bob', 1_700_000_000_001),
		]);

		expect(await mod.hasStarterCeremonyClaim('alice')).toBe(true);
		expect(await mod.hasStarterCeremonyClaim('bob')).toBe(true);
		const raw = JSON.parse(await fs.readFile(claimsFile, 'utf8')) as {
			claims: Array<{ account: string }>;
		};
		const accounts = new Set(raw.claims.map((entry) => entry.account));
		expect(accounts.has('alice')).toBe(true);
		expect(accounts.has('bob')).toBe(true);
	});

	it('still rejects after fingerprint_mismatch on repeated calls instead of returning false', async () => {
		const mod = await loadRegistryModule();
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'stale-epoch');
		vi.stubEnv('RAGNAROK_RESET_EPOCH', 'stale-epoch');
		const staleFingerprint = buildRagnarokRuntimeEvidence(getRagnarokServerRuntimeConfig()).runtimeFingerprint;
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'local-starter-claims');
		vi.stubEnv('RAGNAROK_RESET_EPOCH', 'local-starter-claims');
		await fs.writeFile(claimsFile, `${JSON.stringify({
			version: 2,
			runtimeFingerprint: staleFingerprint,
			claims: [{ account: 'alice', claimedAt: 1 }],
		}, null, 2)}\n`);

		mod.resetStarterClaimRegistryForTests();
		await expect(mod.hasStarterCeremonyClaim('alice')).rejects.toThrow(/fingerprint mismatch/i);
		await expect(mod.hasStarterCeremonyClaim('alice')).rejects.toThrow(/fingerprint mismatch/i);
	});

	it('rejects v2 files with a malformed runtimeFingerprint', async () => {
		const mod = await loadRegistryModule();
		await fs.writeFile(claimsFile, `${JSON.stringify({
			version: 2,
			runtimeFingerprint: { stage: 'not-a-stage' },
			claims: [{ account: 'alice', claimedAt: 1 }],
		}, null, 2)}\n`);

		mod.resetStarterClaimRegistryForTests();
		await expect(mod.hasStarterCeremonyClaim('alice')).rejects.toThrow(/invalid protocol runtime fingerprint/i);
	});

	it('migrates legacy data/starter-claims.json v1 into alfa-testnet v2 on first load', async () => {
		const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'starter-claims-legacy-'));
		const dataDir = path.join(workDir, 'data');
		await fs.mkdir(dataDir, { recursive: true });
		const legacyFile = path.join(dataDir, 'starter-claims.json');
		await fs.writeFile(legacyFile, `${JSON.stringify({
			version: 1,
			claims: [{ account: 'legacyalice', claimedAt: 1_700_000_000_000 }],
		}, null, 2)}\n`);

		const previousCwd = process.cwd();
		process.chdir(workDir);
		vi.unstubAllEnvs();
		vi.stubEnv('NODE_ENV', 'development');
		delete process.env.RAGNAROK_STARTER_CLAIMS_FILE;
		vi.stubEnv('VITE_NETWORK_STAGE', 'testnet');
		vi.stubEnv('VITE_RAGNAROK_PROTOCOL_ID', 'rk_game_testnet');
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'alfa-testnet-full-nft-2026-05-22');
		vi.stubEnv('RAGNAROK_PROTOCOL_ID', 'rk_game_testnet');
		vi.stubEnv('RAGNAROK_RESET_EPOCH', 'alfa-testnet-full-nft-2026-05-22');

		vi.resetModules();
		const mod = await import('./starterClaimRegistry');
		mod.resetStarterClaimRegistryForTests();

		expect(await mod.hasStarterCeremonyClaim('legacyalice')).toBe(true);

		const phaseFile = mod.resolveStarterClaimsFilePath();
		const migrated = JSON.parse(await fs.readFile(phaseFile, 'utf8')) as { version: number; claims: unknown[] };
		expect(migrated.version).toBe(2);
		expect(migrated.claims).toHaveLength(1);

		process.chdir(previousCwd);
		await fs.rm(workDir, { recursive: true, force: true });
	});

	it('does not migrate legacy v1 starter claims for closed-beta', async () => {
		const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'starter-claims-legacy-beta-'));
		const dataDir = path.join(workDir, 'data');
		await fs.mkdir(dataDir, { recursive: true });
		const legacyFile = path.join(dataDir, 'starter-claims.json');
		await fs.writeFile(legacyFile, `${JSON.stringify({
			version: 1,
			claims: [{ account: 'legacybob', claimedAt: 1_700_000_000_001 }],
		}, null, 2)}\n`);

		const previousCwd = process.cwd();
		process.chdir(workDir);
		vi.unstubAllEnvs();
		vi.stubEnv('NODE_ENV', 'test');
		delete process.env.RAGNAROK_STARTER_CLAIMS_FILE;
		vi.stubEnv('VITE_NETWORK_STAGE', 'testnet');
		vi.stubEnv('VITE_RAGNAROK_PROTOCOL_ID', 'rk_game_testnet');
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'closed-beta');
		vi.stubEnv('RAGNAROK_PROTOCOL_ID', 'rk_game_testnet');
		vi.stubEnv('RAGNAROK_RESET_EPOCH', 'closed-beta');

		vi.resetModules();
		const mod = await import('./starterClaimRegistry');
		mod.resetStarterClaimRegistryForTests();

		expect(await mod.hasStarterCeremonyClaim('legacybob')).toBe(false);
		expect(fssync.existsSync(mod.resolveStarterClaimsFilePath())).toBe(false);

		process.chdir(previousCwd);
		await fs.rm(workDir, { recursive: true, force: true });
	});

	it('partitions the default path by runtime phase when no override is set', async () => {
		vi.unstubAllEnvs();
		vi.stubEnv('NODE_ENV', 'test');
		delete process.env.RAGNAROK_STARTER_CLAIMS_FILE;

		vi.stubEnv('VITE_NETWORK_STAGE', 'testnet');
		vi.stubEnv('VITE_RAGNAROK_PROTOCOL_ID', 'rk_game_testnet');
		vi.stubEnv('VITE_RAGNAROK_RESET_EPOCH', 'alfa-testnet');
		vi.stubEnv('RAGNAROK_PROTOCOL_ID', 'rk_game_testnet');
		vi.stubEnv('RAGNAROK_RESET_EPOCH', 'alfa-testnet');

		const mod = await import('./starterClaimRegistry');
		expect(mod.resolveStarterClaimsFilePath()).toBe(
			path.join(process.cwd(), 'data', 'starter-claims.alfa-testnet.json'),
		);
	});
});
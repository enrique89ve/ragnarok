import { execFileSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/verifyRuntimeEnv.mjs');
const TEST_CWD = resolve(process.cwd(), 'shared');
const BASE_ENV = {
	VITE_NETWORK_STAGE: 'testnet',
	VITE_RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
	VITE_RAGNAROK_COLLECTION_ID: 'ragnarok-testnet',
	VITE_RAGNAROK_RESET_EPOCH: 'closed-beta-2026-06',
	VITE_SEASON_START: '2026-06-14T23:28:54Z',
	VITE_RAGNAROK_INDEX_START_BLOCK: '109016418',
	RAGNAROK_RESET_EPOCH: 'closed-beta-2026-06',
	RAGNAROK_SEASON_START: '2026-06-14T23:28:54Z',
	RAGNAROK_INDEX_START_BLOCK: '109016418',
	RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
	RAGNAROK_CHAIN_STATE_FILE: 'data/chain-state.closed-beta.json',
	RAGNAROK_NFT_OWNERSHIP_SOURCE: 'json',
	RAGNAROK_HIVE_KEYCHAIN_SMOKE: 'passed',
	RAGNAROK_P2P_TWO_BROWSER_SMOKE: 'passed',
	RAGNAROK_CLOSED_BETA_OPERATOR_SIGNOFF: 'approved',
	P2P_CHALLENGE_SIGNING_SECRET: 'closed-beta-test-secret-012345678901234567890',
};

const ALFA_ENV = {
	VITE_NETWORK_STAGE: 'testnet',
	VITE_RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
	VITE_RAGNAROK_COLLECTION_ID: 'ragnarok-testnet',
	VITE_RAGNAROK_RESET_EPOCH: 'alfa-testnet-regression',
	VITE_SEASON_START: '2026-06-14T23:28:54Z',
	VITE_RAGNAROK_INDEX_START_BLOCK: '109016418',
	RAGNAROK_RESET_EPOCH: 'alfa-testnet-regression',
	RAGNAROK_PROTOCOL_ID: 'rk_game_testnet',
	RAGNAROK_SEASON_START: '2026-06-14T23:28:54Z',
	RAGNAROK_INDEX_START_BLOCK: '109016418',
	RAGNAROK_CHAIN_STATE_FILE: 'data/chain-state.alfa-testnet.json',
	RAGNAROK_NFT_OWNERSHIP_SOURCE: 'json',
	P2P_CHALLENGE_SIGNING_SECRET: 'alfa-testnet-regression-secret-0123456789',
};

type RunOptions = {
	readonly baseEnv?: Readonly<Record<string, string>>;
	readonly mode?: string;
};

function run(
	overrides: Record<string, string | undefined> = {},
	options: RunOptions = {},
): { status: number; output: string } {
	const outputDirectory = mkdtempSync(join(tmpdir(), 'verify-runtime-env-'));
	const outputPath = join(outputDirectory, 'output.log');
	const outputFd = openSync(outputPath, 'w');
	let status = 0;
	try {
		const env: Record<string, string | undefined> = {
			PATH: process.env.PATH ?? '',
			...(options.baseEnv ?? BASE_ENV),
			...overrides,
		};
		for (const [name, value] of Object.entries(env)) {
			if (value === undefined) delete env[name];
		}
		execFileSync(process.execPath, [SCRIPT, '--mode', options.mode ?? 'testnet-safe', '--scope', 'runtime'], {
			cwd: TEST_CWD,
			env,
			stdio: ['ignore', outputFd, outputFd],
		});
	} catch (error) {
		const failure = error as { status?: number };
		status = failure.status ?? 1;
	} finally {
		closeSync(outputFd);
	}
	const output = readFileSync(outputPath, 'utf8');
	rmSync(outputDirectory, { force: true, recursive: true });
	return { status, output };
}

describe('verifyRuntimeEnv Closed Beta contract', () => {
	it('passes F2 server fingerprint requirements without NFTLox variables', () => {
		const result = run();

		expect(result.status).toBe(0);
		expect(result.output).toContain('resetEpoch=closed-beta-2026-06');
	});

	it('fails closed when client/server season fingerprints differ', () => {
		const result = run({ RAGNAROK_SEASON_START: '2026-06-15T00:00:00Z' });

		expect(result.status).not.toBe(0);
		expect(result.output).toContain('RAGNAROK_SEASON_START must match VITE_SEASON_START');
	});

	it('fails closed when client/server reset epochs differ, including an inverse server value', () => {
		const result = run({ RAGNAROK_RESET_EPOCH: 'alfa-testnet-2026-06' });

		expect(result.status).not.toBe(0);
		expect(result.output).toContain('RAGNAROK_RESET_EPOCH must match VITE_RAGNAROK_RESET_EPOCH');
	});

	it('fails closed when client/server protocol ids differ', () => {
		const result = run({ RAGNAROK_PROTOCOL_ID: 'wrong-protocol' });

		expect(result.status).not.toBe(0);
		expect(result.output).toContain('RAGNAROK_PROTOCOL_ID must match VITE_RAGNAROK_PROTOCOL_ID');
	});

	it('fails closed when the server protocol id is missing', () => {
		const result = run({ RAGNAROK_PROTOCOL_ID: undefined });

		expect(result.status).not.toBe(0);
		expect(result.output).toContain('RAGNAROK_PROTOCOL_ID is required');
	});

	it('rejects NFTLox ownership input in the F2 runtime scope', () => {
		const result = run({ RAGNAROK_NFT_OWNERSHIP_SOURCE: 'nftlox' });

		expect(result.status).not.toBe(0);
		expect(result.output).toContain('RAGNAROK_NFT_OWNERSHIP_SOURCE must be json');
	});
});

describe('verifyRuntimeEnv Alfa runtime contract', () => {
	it('fails closed with the required-field error, never a TypeError, when the server epoch is absent', () => {
		const result = run(
			{ RAGNAROK_RESET_EPOCH: undefined },
			{ baseEnv: ALFA_ENV, mode: 'alfa-testnet' },
		);

		expect(result.status).not.toBe(0);
		expect(result.output).toContain('RAGNAROK_RESET_EPOCH is required.');
		expect(result.output).not.toContain('TypeError');
	});

	it('passes with matching Alfa client and server epochs and the complete runtime environment', () => {
		const result = run({}, { baseEnv: ALFA_ENV, mode: 'alfa-testnet' });

		expect(result.status).toBe(0);
		expect(result.output).toContain('resetEpoch=alfa-testnet-regression');
	});

	it('fails closed when Alfa client and server reset epochs differ', () => {
		const result = run(
			{ RAGNAROK_RESET_EPOCH: 'alfa-testnet-other' },
			{ baseEnv: ALFA_ENV, mode: 'alfa-testnet' },
		);

		expect(result.status).not.toBe(0);
		expect(result.output).toContain('RAGNAROK_RESET_EPOCH must match VITE_RAGNAROK_RESET_EPOCH');
	});

	it('fails closed when Alfa client and server protocol ids differ', () => {
		const result = run(
			{ RAGNAROK_PROTOCOL_ID: 'rk_game_other' },
			{ baseEnv: ALFA_ENV, mode: 'alfa-testnet' },
		);

		expect(result.status).not.toBe(0);
		expect(result.output).toContain('RAGNAROK_PROTOCOL_ID must match VITE_RAGNAROK_PROTOCOL_ID');
	});
});

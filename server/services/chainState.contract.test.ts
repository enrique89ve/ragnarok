import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createProtocolRuntimeFingerprint, type ProtocolRuntimeFingerprintInput } from '../../shared/protocolPhase';
import * as chainState from './chainState';

function createTempFile(): { dir: string; stateFile: string } {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'norse-chainstate-'));
	const stateFile = path.join(dir, 'chain-state.json');
	return { dir, stateFile };
}

function setStateFileEnv(stateFile: string, startBlock?: number): () => void {
	const previousStateFile = process.env.RAGNAROK_CHAIN_STATE_FILE;
	const previousStartBlock = process.env.RAGNAROK_INDEX_START_BLOCK;

	process.env.RAGNAROK_CHAIN_STATE_FILE = stateFile;
	if (typeof startBlock === 'number') {
		process.env.RAGNAROK_INDEX_START_BLOCK = String(startBlock);
	} else {
		delete process.env.RAGNAROK_INDEX_START_BLOCK;
	}

	return () => {
		if (previousStateFile === undefined) {
			delete process.env.RAGNAROK_CHAIN_STATE_FILE;
		} else {
			process.env.RAGNAROK_CHAIN_STATE_FILE = previousStateFile;
		}

		if (previousStartBlock === undefined) {
			delete process.env.RAGNAROK_INDEX_START_BLOCK;
		} else {
			process.env.RAGNAROK_INDEX_START_BLOCK = previousStartBlock;
		}
	};
}

describe('chainState contract loading', () => {
	beforeEach(() => {
		chainState.importState({
			runtimeFingerprint: chainState.getCurrentServerProtocolRuntimeFingerprint(),
			players: [],
			cards: [],
			matches: [],
			knownAccounts: [],
			syncCursors: [],
			lastSyncedAt: 0,
			playerNonces: [],
		} as Parameters<typeof chainState.importState>[0]);
		chainState.setSyncStatus(0, 0, 0, false, 0);
	});

	it('exports exactly the current runtime fingerprint', () => {
		expect(chainState.exportState().runtimeFingerprint).toEqual(chainState.getCurrentServerProtocolRuntimeFingerprint());
	});

	it('initializes a missing file with the configured cursor', () => {
		const { dir, stateFile } = createTempFile();
		const restore = setStateFileEnv(stateFile, 123);
		try {
			expect(() => chainState.loadState()).not.toThrow();
			expect(chainState.getStats().lastIrreversibleBlockProcessed).toBe(122);
		} finally {
			restore();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('rejects legacy and malformed runtime fingerprints', () => {
		const { dir, stateFile } = createTempFile();
		const restore = setStateFileEnv(stateFile, 1);
		const current = chainState.getCurrentServerProtocolRuntimeFingerprint();
		try {
			for (const payload of [
				{ players: [['alice', {}]] },
				{ runtimeFingerprint: { ...current, indexStartBlock: 0 } },
				{ runtimeFingerprint: { ...current, representation: 'tampered' } },
			]) {
				fs.writeFileSync(stateFile, JSON.stringify(payload));
				expect(() => chainState.loadState()).toThrowError(expect.objectContaining({ code: 'fingerprint_mismatch' }));
			}
		} finally {
			restore();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it.each(['stage', 'phaseId', 'protocolId', 'resetEpoch', 'seasonStart', 'indexStartBlock', 'representation'] as const)('rejects adulterated fingerprint field: %s', field => {
		const { dir, stateFile } = createTempFile();
		const restore = setStateFileEnv(stateFile, 1);
		const current = chainState.getCurrentServerProtocolRuntimeFingerprint();
		try {
			if (field === 'representation') {
				const altered = { ...current, representation: JSON.stringify(['tampered']) };
				fs.writeFileSync(stateFile, JSON.stringify({ ...chainState.exportState(), runtimeFingerprint: altered }));
			} else {
				const alteredFields: ProtocolRuntimeFingerprintInput = {
					stage: field === 'stage' ? current.stage === 'local' ? 'testnet' : 'local' : current.stage,
					phaseId: field === 'phaseId' ? current.phaseId === 'mainnet-v1' ? 'hive-testnet-v1' : 'mainnet-v1' : current.phaseId,
					protocolId: field === 'protocolId' ? `${current.protocolId}-tampered` : current.protocolId,
					resetEpoch: field === 'resetEpoch' ? `${current.resetEpoch}-tampered` : current.resetEpoch,
					seasonStart: field === 'seasonStart' ? `${current.seasonStart}-tampered` : current.seasonStart,
					indexStartBlock: field === 'indexStartBlock' ? current.indexStartBlock + 1 : current.indexStartBlock,
				};
				const altered = createProtocolRuntimeFingerprint(alteredFields);
				fs.writeFileSync(stateFile, JSON.stringify({ ...chainState.exportState(), runtimeFingerprint: altered }));
			}
			expect(() => chainState.loadState()).toThrowError(expect.objectContaining({ code: 'fingerprint_mismatch' }));
		} finally {
			restore();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('rejects the same state path after the runtime epoch changes', () => {
		const { dir, stateFile } = createTempFile();
		const restore = setStateFileEnv(stateFile, 1);
		const previousResetEpoch = process.env.RAGNAROK_RESET_EPOCH;
		const previousViteResetEpoch = process.env.VITE_RAGNAROK_RESET_EPOCH;
		try {
			delete process.env.VITE_RAGNAROK_RESET_EPOCH;
			fs.writeFileSync(stateFile, JSON.stringify(chainState.exportState()));
			process.env.RAGNAROK_RESET_EPOCH = `${chainState.getCurrentServerProtocolRuntimeFingerprint().resetEpoch}-changed`;
			expect(() => chainState.loadState()).toThrowError(expect.objectContaining({ code: 'fingerprint_mismatch' }));
		} finally {
			if (previousResetEpoch === undefined) delete process.env.RAGNAROK_RESET_EPOCH; else process.env.RAGNAROK_RESET_EPOCH = previousResetEpoch;
			if (previousViteResetEpoch === undefined) delete process.env.VITE_RAGNAROK_RESET_EPOCH; else process.env.VITE_RAGNAROK_RESET_EPOCH = previousViteResetEpoch;
			restore();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('rejects import mismatch before mutating existing state', () => {
		const current = chainState.getCurrentServerProtocolRuntimeFingerprint();
		chainState.importState({ ...chainState.exportState(), players: [['alice', { username: 'alice', elo: 1, wins: 0, losses: 0, lastMatchAt: 0 }]] } as Parameters<typeof chainState.importState>[0]);
		expect(() => chainState.importState({ ...chainState.exportState(), runtimeFingerprint: { ...current, resetEpoch: `${current.resetEpoch}-other`, representation: 'mismatch' }, players: [['bob', { username: 'bob', elo: 1, wins: 0, losses: 0, lastMatchAt: 0 }]] } as Parameters<typeof chainState.importState>[0])).toThrowError(expect.objectContaining({ code: 'fingerprint_mismatch' }));
		expect(chainState.exportState().players.some(([key]) => key === 'alice')).toBe(true);
		expect(chainState.exportState().players.some(([key]) => key === 'bob')).toBe(false);
	});

	it('falls back to defaults when the persisted file is not valid JSON', () => {
		const { dir, stateFile } = createTempFile();
		const restoreEnv = setStateFileEnv(stateFile, 42_000);

		try {
			fs.writeFileSync(stateFile, '{ this is not valid json', 'utf8');
			chainState.loadState();

			expect(chainState.getStats()).toMatchObject({
				totalPlayers: 0,
				totalCards: 0,
				totalMatches: 0,
				knownAccounts: 0,
				lastSyncedAt: 0,
				lastIrreversibleBlockProcessed: 41_999,
				inSync: false,
				headBlock: 0,
				irreversibleBlock: 0,
				syncTargetBlock: 41_999,
				blocksBehind: 0,
			});
		} finally {
			restoreEnv();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('falls back to defaults when persisted contract structure is invalid', () => {
		const { dir, stateFile } = createTempFile();
		const restoreEnv = setStateFileEnv(stateFile, 1);

		try {
			fs.writeFileSync(
				stateFile,
				JSON.stringify('invalid-root'),
				'utf8',
			);
			chainState.loadState();

			expect(chainState.getStats()).toMatchObject({
				totalPlayers: 0,
				totalCards: 0,
				totalMatches: 0,
				knownAccounts: 0,
				lastIrreversibleBlockProcessed: 0,
				inSync: false,
				headBlock: 0,
				irreversibleBlock: 0,
				syncTargetBlock: 0,
				blocksBehind: 0,
			});
		} finally {
			restoreEnv();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('loads a valid persisted contract and populates player/card sync cursor state', () => {
		const { dir, stateFile } = createTempFile();
		const restoreEnv = setStateFileEnv(stateFile, 1);

		try {
			fs.writeFileSync(
				stateFile,
				JSON.stringify({
					runtimeFingerprint: chainState.getCurrentServerProtocolRuntimeFingerprint(),
					players: [
						[
							'alice',
							{
								username: 'alice',
								elo: 1010,
								wins: 3,
								losses: 1,
								lastMatchAt: 1_700_000_001_111,
							},
						],
					],
					cards: [
						[
							'card-01',
							{
								uid: 'card-01',
								cardId: 123,
								owner: 'alice',
								rarity: 'rare',
								level: 4,
								xp: 55,
							},
						],
					],
					matches: [],
					knownAccounts: ['alice'],
					syncCursors: [['alice', 500]],
					lastSyncedAt: 1_700_000_001_222,
					playerNonces: [['alice', 2]],
					lastIrreversibleBlockProcessed: 500,
					headBlock: 620,
					irreversibleBlock: 610,
					syncTargetBlock: 700,
					inSync: true,
				}),
				'utf8',
			);
			chainState.loadState();

			expect(chainState.getStats()).toMatchObject({
				totalPlayers: 1,
				totalCards: 1,
				totalMatches: 0,
				knownAccounts: 1,
				lastSyncedAt: 1_700_000_001_222,
				lastIrreversibleBlockProcessed: 500,
				inSync: true,
				headBlock: 620,
				irreversibleBlock: 610,
				syncTargetBlock: 700,
				blocksBehind: 200,
			});
			expect(chainState.getCard('card-01')).toMatchObject({
				uid: 'card-01',
				owner: 'alice',
				rarity: 'rare',
			});
			expect(chainState.getSyncCursor('alice')).toBe(500);
		} finally {
			restoreEnv();
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it('normalizes worker import payloads through the same contract boundary', () => {
		chainState.importState(123 as unknown as Parameters<typeof chainState.importState>[0]);

		expect(chainState.getStats()).toMatchObject({
			totalPlayers: 0,
			totalCards: 0,
			totalMatches: 0,
			knownAccounts: 0,
			lastIrreversibleBlockProcessed: 0,
			inSync: false,
			headBlock: 0,
			irreversibleBlock: 0,
			syncTargetBlock: 0,
			blocksBehind: 0,
		});
	});

	it('imports a valid worker snapshot without poisoning existing state', () => {
		chainState.importState({
			runtimeFingerprint: chainState.getCurrentServerProtocolRuntimeFingerprint(),
			players: [
				[
					'alice',
					{
						username: 'alice',
						elo: 1020,
						wins: 3,
						losses: 1,
						lastMatchAt: 1_700_000_001_111,
					},
				],
			],
			cards: [
				[
					'card-01',
					{
						uid: 'card-01',
						cardId: 88,
						owner: 'alice',
						rarity: 'rare',
						level: 4,
						xp: 44,
					},
				],
			],
			matches: [],
			knownAccounts: ['alice'],
			syncCursors: [['alice', 500]],
			lastSyncedAt: 1_700_000_002_333,
			playerNonces: [['alice', 2]],
			lastIrreversibleBlockProcessed: 999,
			inSync: true,
			headBlock: 1200,
			irreversibleBlock: 1100,
			syncTargetBlock: 1300,
		} as Parameters<typeof chainState.importState>[0]);

		expect(chainState.getStats()).toMatchObject({
			totalPlayers: 1,
			totalCards: 1,
			totalMatches: 0,
			knownAccounts: 1,
			lastIrreversibleBlockProcessed: 999,
			inSync: true,
			headBlock: 1200,
			irreversibleBlock: 1100,
			syncTargetBlock: 1300,
			blocksBehind: 301,
			lastSyncedAt: 1_700_000_002_333,
		});
		expect(chainState.getCard('card-01')?.uid).toBe('card-01');
	});

	it('resolves relative and fallback paths for state file env input', () => {
		const previous = process.env.RAGNAROK_CHAIN_STATE_FILE;
		try {
			process.env.RAGNAROK_CHAIN_STATE_FILE = '  data/chain-state-test.json  ';
			expect(chainState.getStateFilePath()).toBe(
				path.resolve(process.cwd(), 'data/chain-state-test.json'),
			);

			delete process.env.RAGNAROK_CHAIN_STATE_FILE;
			expect(chainState.getStateFilePath()).toBe(
				path.resolve(process.cwd(), 'data', 'chain-state.local.json'),
			);
		} finally {
			if (previous === undefined) {
				delete process.env.RAGNAROK_CHAIN_STATE_FILE;
			} else {
				process.env.RAGNAROK_CHAIN_STATE_FILE = previous;
			}
		}
	});
});

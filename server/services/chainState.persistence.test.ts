import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as chainState from './chainState';

function createTempFile(): { dir: string; stateFile: string } {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'norse-chainstate-persist-'));
	const stateFile = path.join(dir, 'chain-state.json');
	return { dir, stateFile };
}

function setStateFileEnv(stateFile: string, startBlock?: number): () => void {
	const previousStateFile = process.env.RAGNAROK_CHAIN_STATE_FILE;
	const previousStartBlock = process.env.RAGNAROK_INDEX_START_BLOCK;
	const previousRecoveryMode = process.env.RAGNAROK_CHAIN_STATE_RECOVERY_MODE;

	process.env.RAGNAROK_CHAIN_STATE_FILE = stateFile;
	if (typeof startBlock === 'number') {
		process.env.RAGNAROK_INDEX_START_BLOCK = String(startBlock);
	} else {
		delete process.env.RAGNAROK_INDEX_START_BLOCK;
	}
	delete process.env.RAGNAROK_CHAIN_STATE_RECOVERY_MODE;

	return () => {
		if (previousStateFile === undefined) delete process.env.RAGNAROK_CHAIN_STATE_FILE;
		else process.env.RAGNAROK_CHAIN_STATE_FILE = previousStateFile;
		if (previousStartBlock === undefined) delete process.env.RAGNAROK_INDEX_START_BLOCK;
		else process.env.RAGNAROK_INDEX_START_BLOCK = previousStartBlock;
		if (previousRecoveryMode === undefined) delete process.env.RAGNAROK_CHAIN_STATE_RECOVERY_MODE;
		else process.env.RAGNAROK_CHAIN_STATE_RECOVERY_MODE = previousRecoveryMode;
	};
}

describe('chainState async persistence', () => {
	let cleanupDirs: string[] = [];

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
		});
	});

	afterEach(() => {
		for (const dir of cleanupDirs) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
		cleanupDirs = [];
		vi.restoreAllMocks();
	});

	it('saveStateAsync writes valid JSON atomically and removes temp files', async () => {
		const { dir, stateFile } = createTempFile();
		cleanupDirs.push(dir);
		const restoreEnv = setStateFileEnv(stateFile);

		chainState.putCard({
			uid: 'card-async-1',
			cardId: 1,
			owner: 'alice',
			rarity: 'common',
			level: 1,
			xp: 0,
		});

		await chainState.saveStateAsync();

		expect(fs.existsSync(stateFile)).toBe(true);
		const raw = fs.readFileSync(stateFile, 'utf8');
		const parsed = JSON.parse(raw);
		expect(parsed.cards).toEqual(
			expect.arrayContaining([[ 'card-async-1', expect.objectContaining({ owner: 'alice' }) ]]),
		);
		const dirEntries = fs.readdirSync(dir);
		expect(dirEntries.every(name => !name.endsWith('.tmp'))).toBe(true);

		restoreEnv();
	});

	it('coalesces concurrent dirty mutations without losing updates', async () => {
		const { dir, stateFile } = createTempFile();
		cleanupDirs.push(dir);
		const restoreEnv = setStateFileEnv(stateFile);

		const originalRename = fsPromises.rename.bind(fsPromises);
		const renameSpy = vi.spyOn(fsPromises, 'rename').mockImplementation(async (src, dest) => {
			await new Promise(resolve => setTimeout(resolve, 20));
			return originalRename(src, dest);
		});

		chainState.putCard({
			uid: 'card-a',
			cardId: 1,
			owner: 'alice',
			rarity: 'common',
			level: 1,
			xp: 0,
		});

		const first = chainState.saveStateAsync();
		chainState.putCard({
			uid: 'card-b',
			cardId: 2,
			owner: 'bob',
			rarity: 'rare',
			level: 1,
			xp: 0,
		});
		const second = chainState.saveStateAsync();

		await Promise.all([first, second]);
		await chainState.flushPersistenceAsync();

		expect(renameSpy).toHaveBeenCalled();
		const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
		const uids = saved.cards.map((entry: [string, unknown]) => entry[0]);
		expect(uids).toEqual(expect.arrayContaining(['card-a', 'card-b']));

		restoreEnv();
	});

	it('does not regress persisted state when a newer sync saveState completes before an older async save', async () => {
		const { dir, stateFile } = createTempFile();
		cleanupDirs.push(dir);
		const restoreEnv = setStateFileEnv(stateFile);

		const originalRename = fsPromises.rename.bind(fsPromises);
		let releaseRename: (() => void) | undefined;
		const renameGate = new Promise<void>((resolve) => {
			releaseRename = resolve;
		});
		vi.spyOn(fsPromises, 'rename').mockImplementation(async (src, dest) => {
			await renameGate;
			return originalRename(src, dest);
		});

		chainState.putCard({
			uid: 'card-async-stale',
			cardId: 1,
			owner: 'alice',
			rarity: 'common',
			level: 1,
			xp: 0,
		});
		const asyncSave = chainState.saveStateAsync();

		chainState.importState({
			runtimeFingerprint: chainState.getCurrentServerProtocolRuntimeFingerprint(),
			players: [],
			cards: [],
			matches: [],
			knownAccounts: [],
			syncCursors: [],
			lastSyncedAt: 0,
			playerNonces: [],
		});
		chainState.putCard({
			uid: 'card-sync-newer',
			cardId: 2,
			owner: 'bob',
			rarity: 'rare',
			level: 1,
			xp: 0,
		});
		chainState.saveState();
		releaseRename?.();

		await asyncSave;
		await chainState.flushPersistenceAsync();

		const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
		const uids = saved.cards.map((entry: [string, unknown]) => entry[0]);
		expect(uids).toContain('card-sync-newer');
		expect(uids).not.toContain('card-async-stale');

		restoreEnv();
	});

	it('skips main-process flush when the indexer worker owns chain-state persistence', async () => {
		const { dir, stateFile } = createTempFile();
		cleanupDirs.push(dir);
		const restoreEnv = setStateFileEnv(stateFile);
		vi.stubEnv('ENABLE_CHAIN_INDEXER', 'true');

		chainState.putCard({
			uid: 'worker-owned-card',
			cardId: 1,
			owner: 'alice',
			rarity: 'common',
			level: 1,
			xp: 0,
		});
		fs.writeFileSync(stateFile, JSON.stringify(chainState.exportState()), 'utf8');

		chainState.importState({
			runtimeFingerprint: chainState.getCurrentServerProtocolRuntimeFingerprint(),
			players: [],
			cards: [],
			matches: [],
			knownAccounts: [],
			syncCursors: [],
			lastSyncedAt: 0,
			playerNonces: [],
		});

		const indexerOwnsPersistence = process.env.ENABLE_CHAIN_INDEXER !== 'false';
		if (!indexerOwnsPersistence) {
			await chainState.flushPersistenceAsync();
		}

		const persisted = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
		const uids = persisted.cards.map((entry: [string, unknown]) => entry[0]);
		expect(uids).toEqual(['worker-owned-card']);

		restoreEnv();
		vi.unstubAllEnvs();
	});
});

describe('chainState corrupt recovery', () => {
	let cleanupDirs: string[] = [];

	afterEach(() => {
		for (const dir of cleanupDirs) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
		cleanupDirs = [];
	});

	it('quarantines corrupt JSON in rebuild mode and resets cursor', () => {
		const { dir, stateFile } = createTempFile();
		cleanupDirs.push(dir);
		const restoreEnv = setStateFileEnv(stateFile, 42_000);

		fs.writeFileSync(stateFile, '{not-json', 'utf8');
		chainState.loadState();

		const quarantined = fs.readdirSync(dir).find(name => name.includes('.corrupt-'));
		expect(quarantined).toBeDefined();
		expect(fs.existsSync(stateFile)).toBe(false);
		expect(chainState.getStats()).toMatchObject({
			totalPlayers: 0,
			totalCards: 0,
			lastIrreversibleBlockProcessed: 41_999,
			syncTargetBlock: 41_999,
		});

		restoreEnv();
	});

	it('throws chain_state_corrupt in fail mode while quarantining', () => {
		const { dir, stateFile } = createTempFile();
		cleanupDirs.push(dir);
		const restoreEnv = setStateFileEnv(stateFile, 1);
		process.env.RAGNAROK_CHAIN_STATE_RECOVERY_MODE = 'fail';

		fs.writeFileSync(stateFile, '{bad-json', 'utf8');
		expect(() => chainState.loadState()).toThrowError(expect.objectContaining({ code: 'chain_state_corrupt' }));
		expect(fs.readdirSync(dir).some(name => name.includes('.corrupt-'))).toBe(true);

		restoreEnv();
	});

	it.each(['rebuild', 'fail'] as const)(
		'quarantines valid fingerprint with corrupt players in %s mode (not fingerprint_mismatch)',
		mode => {
			const { dir, stateFile } = createTempFile();
			cleanupDirs.push(dir);
			const restoreEnv = setStateFileEnv(stateFile, 50_000);
			if (mode === 'fail') process.env.RAGNAROK_CHAIN_STATE_RECOVERY_MODE = 'fail';

			const payload = {
				...chainState.exportState(),
				players: { not: 'a-player-array' },
			};
			fs.writeFileSync(stateFile, JSON.stringify(payload), 'utf8');

			if (mode === 'fail') {
				expect(() => chainState.loadState()).toThrowError(expect.objectContaining({ code: 'chain_state_corrupt' }));
			} else {
				expect(() => chainState.loadState()).not.toThrow();
				expect(chainState.getStats().totalPlayers).toBe(0);
			}
			expect(fs.readdirSync(dir).some(name => name.includes('.corrupt-'))).toBe(true);

			restoreEnv();
		},
	);
});

describe('chainState async save disk failure', () => {
	let cleanupDirs: string[] = [];

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
		});
	});

	afterEach(() => {
		for (const dir of cleanupDirs) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
		cleanupDirs = [];
		vi.restoreAllMocks();
	});

	it('does not tight-loop retries when async persistence write fails', async () => {
		const { dir, stateFile } = createTempFile();
		cleanupDirs.push(dir);
		const restoreEnv = setStateFileEnv(stateFile);

		const renameSpy = vi.spyOn(fsPromises, 'rename').mockRejectedValue(new Error('EACCES: permission denied'));

		chainState.putCard({
			uid: 'card-fail-save',
			cardId: 1,
			owner: 'alice',
			rarity: 'common',
			level: 1,
			xp: 0,
		});

		await chainState.saveStateAsync();
		const callsAfterFirstFailure = renameSpy.mock.calls.length;
		expect(callsAfterFirstFailure).toBe(1);

		await new Promise(resolve => setTimeout(resolve, 50));
		expect(renameSpy.mock.calls.length).toBe(callsAfterFirstFailure);

		chainState.putCard({
			uid: 'card-fail-save-2',
			cardId: 2,
			owner: 'bob',
			rarity: 'common',
			level: 1,
			xp: 0,
		});
		await chainState.saveStateAsync();

		expect(renameSpy.mock.calls.length).toBe(callsAfterFirstFailure + 1);

		restoreEnv();
	});
});
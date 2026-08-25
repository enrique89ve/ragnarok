import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createProtocolRuntimeFingerprint } from '../../shared/protocolPhase';
import {
	applyChainStateMigration,
	planChainStateMigration,
	type ChainStateMigrationOptions,
} from './chainStateMigration';
import { createEmptyChainStateSnapshot } from './chainState';
import { parseChainStateMigrationArgs } from '../../scripts/prepareChainStateMigrationArgs';

const tempDirectories: string[] = [];
function tempDir(): string {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ragnarok-chain-state-migration-'));
	tempDirectories.push(directory);
	return directory;
}
function fingerprint(resetEpoch: string, phaseId: 'local-gameplay-v1' | 'hive-testnet-v1' = 'local-gameplay-v1') {
	return createProtocolRuntimeFingerprint({ stage: 'testnet', phaseId, protocolId: 'rk_game_testnet', resetEpoch, seasonStart: '2026-06-14T23:28:54Z', indexStartBlock: 109016418 });
}
function options(directory: string): ChainStateMigrationOptions {
	return { sourcePath: path.join(directory, 'old.json'), destinationPath: path.join(directory, 'next', 'state.json'), archivePath: path.join(directory, 'old.json.archive'), targetFingerprint: fingerprint('alfa-testnet-2026-08') };
}

afterEach(() => {
	for (const directory of tempDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('chain state migration preparation', () => {
	it('dry-runs without changing source bytes and discards all authority-bearing arrays', () => {
		const directory = tempDir();
		const migration = options(directory);
		const source = { runtimeFingerprint: fingerprint('qa-season-0-2026-07'), players: [['alice', { elo: 1200 }]], runeLedger: [['rune', { amount: 5 }]], cards: [['card', {}]] };
		fs.writeFileSync(migration.sourcePath, JSON.stringify(source));
		const before = fs.readFileSync(migration.sourcePath, 'utf8');
		const result = planChainStateMigration(migration);

		expect(fs.readFileSync(migration.sourcePath, 'utf8')).toBe(before);
		expect(result.report.sourceFingerprint.resetEpoch).toContain('qa-season-0');
		expect(result.report.localEconomyPromoted).toBe(false);
		expect(result.report.discardedCounts).toMatchObject({ players: 1, cards: 1, runeLedger: 1 });
		expect(result.targetState.runtimeFingerprint).toEqual(migration.targetFingerprint);
		expect(result.targetState.players).toEqual([]);
		expect(result.targetState.runeLedger).toEqual([]);
		expect(result.targetState).toMatchObject({ lastIrreversibleBlockProcessed: 109016418, genesis: null, supplyCounters: [], matchAnchors: [], packCommits: [], rewardClaims: [], duatClaims: [], campaignNonces: [], campaignSubmissions: [], campaignProgress: [], eitrLedger: [], forgeCommits: [], packs: [], packSupply: [], slashedAccounts: [], marketListings: [], marketOffers: [], syncTargetBlock: 109016418 });
	});

	it('rejects legacy or malformed source state and accepts a valid mismatch for archival', () => {
		const directory = tempDir();
		const migration = options(directory);
		const legacy = createEmptyChainStateSnapshot(fingerprint('legacy')) as Record<string, unknown>;
		delete legacy.runtimeFingerprint;
		fs.writeFileSync(migration.sourcePath, JSON.stringify(legacy));
		expect(planChainStateMigration(migration).report.sourceKind).toBe('legacy_unfingerprinted');
		fs.writeFileSync(migration.sourcePath, JSON.stringify({ runtimeFingerprint: { ...fingerprint('old'), representation: 'tampered' } }));
		expect(() => planChainStateMigration(migration)).toThrow(/invalid protocol runtime fingerprint/);
		fs.writeFileSync(migration.sourcePath, JSON.stringify({ runtimeFingerprint: fingerprint('old') }));
		expect(() => planChainStateMigration(migration)).not.toThrow();
	});

	it('applies with explicit confirmation, archives source, and writes fresh target fingerprint', () => {
		const directory = tempDir();
		const migration = options(directory);
		fs.writeFileSync(migration.sourcePath, JSON.stringify({ runtimeFingerprint: fingerprint('old'), runeLedger: [['rune', { amount: 5 }]] }));
		const planned = planChainStateMigration(migration);
		expect(() => applyChainStateMigration(migration, 'wrong')).toThrow(/confirmation/);
		const result = applyChainStateMigration(migration, planned.report.migrationId);
		expect(result.status).toBe('applied');
		expect(fs.existsSync(migration.archivePath)).toBe(true);
		expect(JSON.parse(fs.readFileSync(migration.destinationPath, 'utf8'))).toEqual(result.targetState);
		expect(JSON.parse(fs.readFileSync(migration.destinationPath, 'utf8')).runeLedger).toEqual([]);
	});

	it('rejects existing destination/archive and preserves an archive after destination failure', () => {
		const directory = tempDir();
		const migration = options(directory);
		fs.writeFileSync(migration.sourcePath, JSON.stringify({ runtimeFingerprint: fingerprint('old') }));
		fs.mkdirSync(path.dirname(migration.destinationPath), { recursive: true });
		fs.writeFileSync(migration.destinationPath, 'existing');
		expect(() => applyChainStateMigration(migration, planChainStateMigration(migration).report.projectionHash)).toThrow(/destination already exists/);
		fs.rmSync(migration.destinationPath);
		fs.writeFileSync(migration.archivePath, 'existing');
		expect(() => applyChainStateMigration(migration, planChainStateMigration(migration).report.projectionHash)).toThrow(/archive already exists/);
		fs.rmSync(migration.archivePath);
		const planned = planChainStateMigration(migration);
		const destinationTmp = `${migration.destinationPath}.tmp-${planned.report.migrationId.slice(-8)}`;
		fs.mkdirSync(path.dirname(destinationTmp), { recursive: true });
		fs.writeFileSync(destinationTmp, 'foreign temporary artifact');
		try { applyChainStateMigration(migration, planned.report.projectionHash); } catch { /* expected pre-existing tmp rejection */ }
		expect(fs.readFileSync(destinationTmp, 'utf8')).toBe('foreign temporary artifact');
		expect(fs.existsSync(migration.archivePath)).toBe(true);
		fs.rmSync(migration.archivePath);
		fs.rmSync(destinationTmp);
		const blockedParent = path.join(directory, 'blocked');
		fs.writeFileSync(blockedParent, 'not a directory');
		const failing = { ...migration, destinationPath: path.join(blockedParent, 'state.json') };
		try { applyChainStateMigration(failing, planChainStateMigration(failing).report.projectionHash); } catch (error) { expect((error as { recoveryArchivePath?: string }).recoveryArchivePath).toBe(migration.archivePath); }
		expect(fs.existsSync(migration.sourcePath)).toBe(true);
		expect(fs.existsSync(migration.archivePath)).toBe(true);
	});

	it('rejects symlink sources and aliases that resolve to the same path', () => {
		const directory = tempDir();
		const migration = options(directory);
		fs.writeFileSync(migration.sourcePath, JSON.stringify({ runtimeFingerprint: fingerprint('old') }));
		const alias = { ...migration, destinationPath: path.join(directory, 'next', '..', 'old.json'), archivePath: path.join(directory, 'archive.json') };
		expect(() => planChainStateMigration(alias)).toThrow(/paths must be distinct/);
		const linkPath = path.join(directory, 'link.json');
		fs.symlinkSync(migration.sourcePath, linkPath);
		expect(() => planChainStateMigration({ ...migration, sourcePath: linkPath })).toThrow(/regular non-symlink/);
	});

	it('parses pnpm separator and keeps apply confirmation separate', () => {
		const parsed = parseChainStateMigrationArgs(['--', '--source', 'old.json', '--destination', 'new.json', '--apply', '--confirm', 'migration-id']);
		expect(parsed.apply).toBe(true);
		expect(parsed.values.get('source')).toBe('old.json');
		expect(parsed.values.get('confirm')).toBe('migration-id');
		expect(() => parseChainStateMigrationArgs(['--source', 'old.json', '--'])).toThrow(/only allowed at the beginning/);
		expect(() => parseChainStateMigrationArgs(['--unknown'])).toThrow(/unknown flag/);
	});
});

import fs from 'node:fs';
import path from 'node:path';
import { canonicalStringify } from '../../shared/protocol-core/hash';
import { fnv1a } from '../../shared/protocol-core/broadcast-utils';
import { parseProtocolRuntimeFingerprint, type ProtocolRuntimeFingerprint } from '../../shared/protocolPhase';
import { createEmptyChainStateSnapshot, validateChainStateSnapshot, type SerializedState } from './chainState';

export type ChainStateMigrationOptions = {
	readonly sourcePath: string;
	readonly destinationPath: string;
	readonly archivePath: string;
	readonly targetFingerprint: ProtocolRuntimeFingerprint;
};
export type ChainStateSourceKind = 'fingerprinted' | 'legacy_unfingerprinted';
export type ChainStateMigrationReport = {
	readonly migrationId: string; readonly projectionHash: string; readonly sourcePath: string;
	readonly destinationPath: string; readonly archivePath: string; readonly sourceKind: ChainStateSourceKind;
	readonly sourceFingerprint: ProtocolRuntimeFingerprint | null; readonly targetFingerprint: ProtocolRuntimeFingerprint;
	readonly sourceBytes: number; readonly discardedCounts: Readonly<Record<string, number>>;
	readonly localEconomyPromoted: false; readonly status: 'ready';
};
export type ChainStateMigrationResult =
	| { readonly status: 'dry_run'; readonly report: ChainStateMigrationReport; readonly targetState: SerializedState }
	| { readonly status: 'applied'; readonly report: ChainStateMigrationReport; readonly targetState: SerializedState; readonly recoveryArchivePath: string };

const DATA_KEYS = [
	'players', 'cards', 'matches', 'knownAccounts', 'runeLedger', 'eitrLedger', 'matchAnchors',
	'campaignProgress', 'campaignSubmissions', 'packs', 'marketListings', 'marketOffers', 'packCommits',
	'supplyCounters', 'rewardClaims', 'duatClaims', 'campaignNonces', 'playerNonces', 'syncCursors',
	'outbox', 'cardXp', 'levelUps', 'tokenBalances', 'genesis', 'lastIrreversibleBlockProcessed',
	'syncTargetBlock', 'inSync', 'headBlock', 'irreversibleBlock', 'lastSyncedAt',
] as const;

function migrationError(message: string, code = 'chain_state_migration_rejected'): Error & { readonly code: string } {
	const error = new Error(message) as Error & { code: string }; error.code = code; return error;
}
function validatePaths(options: ChainStateMigrationOptions): { sourcePath: string; destinationPath: string; archivePath: string } {
	const resolved = { sourcePath: path.resolve(options.sourcePath), destinationPath: path.resolve(options.destinationPath), archivePath: path.resolve(options.archivePath) };
	if (new Set(Object.values(resolved)).size !== 3) throw migrationError('source, destination and archive paths must be distinct');
	const sourceStat = fs.lstatSync(resolved.sourcePath);
	if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) throw migrationError('source must be a regular non-symlink file');
	return resolved;
}
function readSource(sourcePath: string): { readonly raw: string; readonly value: Record<string, unknown>; readonly sourceKind: ChainStateSourceKind; readonly fingerprint: ProtocolRuntimeFingerprint | null } {
	if (!fs.existsSync(sourcePath)) throw migrationError(`source chain state does not exist: ${sourcePath}`);
	const raw = fs.readFileSync(sourcePath, 'utf8'); let parsed: unknown;
	try { parsed = JSON.parse(raw); } catch { throw migrationError('source chain state is not valid JSON'); }
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw migrationError('source chain state must be an object');
	const value = parsed as Record<string, unknown>;
	if (!('runtimeFingerprint' in value)) return { raw, value, sourceKind: 'legacy_unfingerprinted', fingerprint: null };
	return { raw, value, sourceKind: 'fingerprinted', fingerprint: parseProtocolRuntimeFingerprint(value.runtimeFingerprint) };
}
export function planChainStateMigration(options: ChainStateMigrationOptions): { readonly report: ChainStateMigrationReport; readonly targetState: SerializedState } {
	const paths = validatePaths(options); const source = readSource(paths.sourcePath); const targetFingerprint = parseProtocolRuntimeFingerprint(options.targetFingerprint);
	const discardedCounts = Object.fromEntries(DATA_KEYS.map((key) => [key, Array.isArray(source.value[key]) ? source.value[key].length : source.value[key] === undefined ? 0 : 1]));
	const migrationId = `chain-state-migration:${fnv1a(canonicalStringify({ from: source.fingerprint, sourceKind: source.sourceKind, to: targetFingerprint, sourcePath: paths.sourcePath, destinationPath: paths.destinationPath }))}`;
	const projectionHash = fnv1a(canonicalStringify({ migrationId, target: targetFingerprint, discardedCounts, localEconomyPromoted: false }));
	const targetState = validateChainStateSnapshot(createEmptyChainStateSnapshot(targetFingerprint));
	return { report: { migrationId, projectionHash, sourcePath: paths.sourcePath, destinationPath: paths.destinationPath, archivePath: paths.archivePath, sourceKind: source.sourceKind, sourceFingerprint: source.fingerprint, targetFingerprint, sourceBytes: Buffer.byteLength(source.raw), discardedCounts, localEconomyPromoted: false, status: 'ready' }, targetState };
}
export function applyChainStateMigration(options: ChainStateMigrationOptions, confirmation: string): ChainStateMigrationResult {
	const planned = planChainStateMigration(options); if (confirmation !== planned.report.migrationId && confirmation !== planned.report.projectionHash && confirmation !== planned.report.targetFingerprint.representation) throw migrationError('confirmation must equal migrationId, projectionHash, or target fingerprint representation');
	const { sourcePath, destinationPath, archivePath } = planned.report;
	if (fs.existsSync(destinationPath)) throw migrationError(`destination already exists: ${destinationPath}`); if (fs.existsSync(archivePath)) throw migrationError(`archive already exists: ${archivePath}`);
	const destinationTmp = `${destinationPath}.tmp-${planned.report.migrationId.slice(-8)}`; let archiveCreated = false; let destinationCreated = false; let destinationTmpCreated = false;
	try {
		fs.mkdirSync(path.dirname(archivePath), { recursive: true, mode: 0o700 }); fs.copyFileSync(sourcePath, archivePath, fs.constants.COPYFILE_EXCL); archiveCreated = true;
		fs.mkdirSync(path.dirname(destinationPath), { recursive: true, mode: 0o700 }); fs.writeFileSync(destinationTmp, JSON.stringify(planned.targetState), { encoding: 'utf8', mode: 0o600, flag: 'wx' }); destinationTmpCreated = true; fs.linkSync(destinationTmp, destinationPath); destinationCreated = true; fs.unlinkSync(destinationTmp);
		return { status: 'applied', ...planned, recoveryArchivePath: archivePath };
	} catch (error) {
		if (destinationTmpCreated && fs.existsSync(destinationTmp)) fs.unlinkSync(destinationTmp); if (destinationCreated && fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath);
		const withRecovery = error instanceof Error ? error : new Error(String(error)); if (archiveCreated) Object.assign(withRecovery, { recoveryArchivePath: archivePath }); throw withRecovery;
	}
}

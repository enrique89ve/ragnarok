import process from 'node:process';
import { buildRagnarokRuntimeEvidence } from '../shared/runtimeConfig';
import { getRagnarokServerRuntimeConfig } from '../server/services/runtimeConfig';
import { applyChainStateMigration, planChainStateMigration, type ChainStateMigrationOptions } from '../server/services/chainStateMigration';
import { parseChainStateMigrationArgs } from './prepareChainStateMigrationArgs';
function required(values: ReadonlyMap<string, string>, name: string): string {
	const value = values.get(name)?.trim(); if (!value) throw new Error(`--${name} is required`); return value;
}
try {
	const parsed = parseChainStateMigrationArgs(process.argv.slice(2));
	const sourcePath = parsed.values.get('source')?.trim() ?? process.env.RAGNAROK_CHAIN_STATE_FILE?.trim();
	if (!sourcePath) throw new Error('--source or RAGNAROK_CHAIN_STATE_FILE is required');
	const destinationPath = required(parsed.values, 'destination');
	const archivePath = parsed.values.get('archive')?.trim() ?? `${sourcePath}.archive`;
	const options: ChainStateMigrationOptions = { sourcePath, destinationPath, archivePath, targetFingerprint: buildRagnarokRuntimeEvidence(getRagnarokServerRuntimeConfig()).runtimeFingerprint };
	if (!parsed.apply) {
		const planned = planChainStateMigration(options); console.log(JSON.stringify({ ...planned.report, mode: 'dry-run', targetState: planned.targetState }, null, 2)); process.exit(0);
	}
	const result = applyChainStateMigration(options, required(parsed.values, 'confirm')); console.log(JSON.stringify({ ...result.report, mode: result.status, targetState: result.targetState, recoveryArchivePath: result.recoveryArchivePath }, null, 2));
} catch (error) {
	const message = error instanceof Error ? error.message : String(error); const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'chain_state_migration_rejected'; const recoveryArchivePath = error && typeof error === 'object' && 'recoveryArchivePath' in error && typeof error.recoveryArchivePath === 'string' ? error.recoveryArchivePath : undefined;
	console.error(JSON.stringify({ status: 'rejected', code, error: message, ...(recoveryArchivePath ? { recoveryArchivePath } : {}) }, null, 2)); process.exitCode = 1;
}

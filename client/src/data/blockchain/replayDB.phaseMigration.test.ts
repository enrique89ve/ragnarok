import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createProtocolRuntimeFingerprint } from '@shared/protocolPhase';
import { planProtocolPhaseMigration } from '@shared/protocolPhaseMigration';
import { recordPhaseMigrationDryRun } from './replayDB';
describe('phase migration replay persistence', () => {
	it('is idempotent and conflicts when projection changes', async () => {
		const from = createProtocolRuntimeFingerprint({ stage: 'testnet', phaseId: 'local-gameplay-v1', protocolId: 'pm-idb', resetEpoch: 'a', seasonStart: '2026-01-01', indexStartBlock: 1 });
		const to = createProtocolRuntimeFingerprint({ stage: 'testnet', phaseId: 'hive-testnet-v1', protocolId: 'pm-idb', resetEpoch: 'b', seasonStart: '2026-01-01', indexStartBlock: 1 });
		const report = planProtocolPhaseMigration(from, to, { rune: 2 }); if (report.status !== 'ready') throw new Error('expected ready');
		expect(await recordPhaseMigrationDryRun(report)).toBe('applied'); expect(await recordPhaseMigrationDryRun(report)).toBe('already_applied');
		expect(await recordPhaseMigrationDryRun({ ...report, projectionHash: 'different' })).toBe('conflict');
		expect(await recordPhaseMigrationDryRun(report)).toBe('already_applied');
	});
});

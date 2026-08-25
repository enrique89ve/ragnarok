import { describe, expect, it } from 'vitest';
import { createProtocolRuntimeFingerprint } from './protocolPhase';
import { planProtocolPhaseMigration } from './protocolPhaseMigration';
const fp = (phaseId: 'local-gameplay-v1' | 'hive-testnet-v1', resetEpoch: string) => createProtocolRuntimeFingerprint({ stage: 'testnet', phaseId, protocolId: 'migration-test', resetEpoch, seasonStart: '2026-01-01T00:00:00Z', indexStartBlock: 1 });
describe('protocol phase migration', () => {
	it('is deterministic and explicit about carry/archive/reset/never promote', () => { const a = planProtocolPhaseMigration(fp('local-gameplay-v1', 'a'), fp('hive-testnet-v1', 'b'), { preferences: 1, rune: 2, local_settlement: 3 }); expect(a.status).toBe('ready'); if (a.status === 'ready') { expect(a.localEconomyPromoted).toBe(false); expect(a.actions.local_settlement).toBe('never_promote'); expect(a.projectionHash).toBe((planProtocolPhaseMigration(fp('local-gameplay-v1', 'a'), fp('hive-testnet-v1', 'b'), { preferences: 1, rune: 2, local_settlement: 3 }) as typeof a).projectionHash); } });
	it('rejects skip/regression and no-ops identical fingerprints', () => { expect(planProtocolPhaseMigration(fp('local-gameplay-v1', 'a'), fp('local-gameplay-v1', 'a')).status).toBe('no_op'); expect(planProtocolPhaseMigration(fp('local-gameplay-v1', 'a'), fp('hive-testnet-v1', 'a')).status).toBe('rejected'); });
	it('covers skip, regression, same-phase fingerprint, epoch, invalid inventory, actions and totals', () => {
		const local = fp('local-gameplay-v1', 'a'); const hive = fp('hive-testnet-v1', 'b');
		expect(planProtocolPhaseMigration(local, { ...hive, phaseId: 'mainnet-v1' }).status).toBe('rejected');
		expect(planProtocolPhaseMigration(hive, local).status).toBe('rejected');
		expect(planProtocolPhaseMigration(local, { ...local, protocolId: 'other', representation: 'other' }).status).toBe('rejected');
		expect(planProtocolPhaseMigration(local, { ...hive, resetEpoch: 'a' }).status).toBe('rejected');
		expect(planProtocolPhaseMigration(local, hive, { rune: -1 }).status).toBe('rejected');
		expect(planProtocolPhaseMigration(local, hive, { rune: 1.5 }).status).toBe('rejected');
		const report = planProtocolPhaseMigration(local, hive, { preferences: 1, accessibility: 1, saved_decks: 1, transcripts: 1, campaign_evidence: 1, daily_quest_evidence: 1, rune: 1, elo: 1, season_score: 1, card_xp: 1, level_ups: 1, outbox: 1, market: 1, packs: 1, nft_ownership: 1, local_settlement: 1 });
		expect(report.status).toBe('ready'); if (report.status === 'ready') { expect(report.totals.carry).toBe(3); expect(report.totals.archive).toBe(3); expect(report.totals.reset).toBe(9); expect(report.totals.never_promote).toBe(1); }
	});
});

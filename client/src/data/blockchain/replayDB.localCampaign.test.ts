import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createProtocolRuntimeFingerprint } from '@shared/protocolPhase';
import { createLocalCampaignSettlement } from '@shared/protocol-core/localCampaignSettlement';
import { createRuneLedgerEntryId, createCampaignFirstClearRuneSourceKey } from '@shared/protocol-core/runeEconomy';
import {
	abandonStartedCampaignRuns,
	commitLocalCampaignSettlement,
	getCampaignRun,
	getLatestLocalCardProgressionByOwner,
	getLocalCardProgressionByOwner,
	getRuneLedgerEntries,
	markCampaignRunAbandoned,
	markCampaignRunWon,
	putCampaignRun,
	type CampaignRunRecord,
} from './replayDB';

describe('IndexedDB local campaign settlement', () => {
	it('closes campaign drafts with explicit won and abandoned states', async () => {
		const run = {
			localRunId: 'campaign-run-state-test',
			account: 'campaign-run-state-user',
			campaignId: 'ragnarok',
			missionId: 'norse-1',
			difficulty: 'normal',
			registryHash: 'registry',
			nonce: 1,
			localStartedAt: 1,
			status: 'started',
			createdAt: 1,
			updatedAt: 1,
		} satisfies CampaignRunRecord;
		await putCampaignRun(run);

		expect(await markCampaignRunWon({ localRunId: run.localRunId, matchId: 'match-state-test', matchSeed: 'seed', turnCount: 7, updatedAt: 2 })).toBe(true);
		expect(await getCampaignRun(run.localRunId)).toMatchObject({ status: 'won', matchId: 'match-state-test', turnCount: 7 });
		expect(await markCampaignRunAbandoned(run.localRunId, 3)).toBe(false);

		const staleRun = { ...run, localRunId: 'campaign-run-stale-test', status: 'started' as const };
		await putCampaignRun(staleRun);
		expect(await abandonStartedCampaignRuns(run.account)).toBe(1);
		expect(await getCampaignRun(staleRun.localRunId)).toMatchObject({ status: 'abandoned' });
	});

	it('commits, retries idempotently, and detects same-event conflict', async () => {
		const fingerprint = createProtocolRuntimeFingerprint({ stage: 'testnet', phaseId: 'local-gameplay-v1', protocolId: 'campaign-idb', resetEpoch: 'campaign-idb', seasonStart: '2026-01-01T00:00:00Z', indexStartBlock: 1 });
		const record = createLocalCampaignSettlement({ runtimeFingerprint: fingerprint, account: 'campaign-idb-user', campaignId: 'ragnarok', missionId: 'norse-1', difficulty: 'normal', matchId: 'campaign-idb-match', matchSeed: 'seed', turnCount: 3, firstClear: true, runeAmount: 2, seasonId: 'S-idb', timestamp: 1, cards: [{ uid: 'starter:1', ownerAccount: 'campaign-idb-user', cardId: 1, rarity: 'common', xpBefore: 95 }] });
		const applied = await commitLocalCampaignSettlement(record);
		expect(applied.status).toBe('applied');
		expect(applied.record.anchor.anchorId).toContain(record.eventId);
		expect(applied.record.result.resultHash).toBe(record.resultHash);
		expect((await getLatestLocalCardProgressionByOwner('campaign-idb-user')).find(card => card.uid === 'starter:1')).toMatchObject({ xp: 105, level: 2 });
		expect((await commitLocalCampaignSettlement(record)).status).toBe('already_applied');
		expect((await commitLocalCampaignSettlement({ ...record, resultHash: 'different', result: { ...record.result, resultHash: 'different' } })).status).toBe('conflict');
		const second = createLocalCampaignSettlement({ runtimeFingerprint: fingerprint, account: 'campaign-idb-user', campaignId: 'ragnarok', missionId: 'norse-1', difficulty: 'normal', matchId: 'campaign-idb-match-2', matchSeed: 'seed-2', turnCount: 4, firstClear: true, runeAmount: 2, seasonId: 'S-idb', timestamp: 2, cards: [] });
		const secondApplied = await commitLocalCampaignSettlement(second);
		expect(secondApplied.status).toBe('applied');
		expect(secondApplied.record.firstClear).toBe(false);
		 expect(secondApplied.record.runeAmount).toBe(0);
	});

	it('serializes concurrent matches to one first-clear reward and progression for both matches', async () => {
		const fingerprint = createProtocolRuntimeFingerprint({ stage: 'testnet', phaseId: 'local-gameplay-v1', protocolId: 'campaign-concurrent', resetEpoch: 'campaign-concurrent', seasonStart: '2026-01-01T00:00:00Z', indexStartBlock: 1 });
		const make = (matchId: string, uid: string) => { const record = createLocalCampaignSettlement({ runtimeFingerprint: fingerprint, account: 'concurrent-user', campaignId: 'ragnarok', missionId: 'concurrent-mission', difficulty: 'normal', matchId, matchSeed: matchId, turnCount: 2, firstClear: true, runeAmount: 3, seasonId: 'S-concurrent', timestamp: 1, cards: [{ uid, ownerAccount: 'concurrent-user', cardId: 100, rarity: 'common', xpBefore: 95 }] }); const sourceKey = createCampaignFirstClearRuneSourceKey('concurrent-user', 'ragnarok', 'concurrent-mission', 'S-concurrent'); return { ...record, runeEntry: { entryId: createRuneLedgerEntryId({ seasonId: 'S-concurrent', direction: 'credit', sourceType: 'campaign_first_clear', sourceKey }), seasonId: 'S-concurrent', account: 'concurrent-user', direction: 'credit' as const, sourceType: 'campaign_first_clear' as const, sourceKey, amount: 3, balanceBefore: 0, balanceAfter: 3, trxId: record.eventId, blockNum: 0, timestamp: 1 } }; };
		const [a, b] = await Promise.all([commitLocalCampaignSettlement(make('a', 'starter-100-concurrent')), commitLocalCampaignSettlement(make('b', 'starter-100-concurrent'))]);
		expect([a.record, b.record].filter(record => record.firstClear)).toHaveLength(1);
		expect((await getRuneLedgerEntries({ seasonId: 'S-concurrent', account: 'concurrent-user', direction: 'credit' })).filter(entry => entry.sourceType === 'campaign_first_clear')).toHaveLength(1);
		expect((await getLocalCardProgressionByOwner('concurrent-user')).filter(card => card.eventId === a.record.eventId || card.eventId === b.record.eventId)).toHaveLength(2);
	});
});

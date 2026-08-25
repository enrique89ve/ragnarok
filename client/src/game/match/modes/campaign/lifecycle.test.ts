import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ settle: vi.fn(), publish: vi.fn(), completeMission: vi.fn() }));
const { settle, publish, completeMission } = mocks;
vi.mock('../../../campaign/localCampaignSettlement', () => ({ settleLocalCampaignMatch: mocks.settle }));
vi.mock('../../../campaign', () => ({ publishCampaignVictoryResult: mocks.publish, useCampaignStore: { getState: () => ({ completeMission: mocks.completeMission, recordRewardFeedback: vi.fn() }) } }));
vi.mock('../../../nft', () => ({ getNFTBridge: () => ({ getUsername: () => 'alice', submitCampaignResult: vi.fn(), emitTransactionConfirmed: vi.fn() }) }));
vi.mock('../../../../config/networkConfig', () => ({ getRagnarokNetworkConfig: () => ({ stage: 'testnet' }) }));
vi.mock('@shared/runtimeConfig', async importOriginal => ({ ...(await importOriginal<typeof import('@shared/runtimeConfig')>()), buildRagnarokRuntimeEvidence: () => ({ phasePolicy: { localSettlement: true } }) }));
import { onCampaignMatchEnd } from './lifecycle';
import type { MatchContext } from '../../types';
const ctx = { matchId: 'life-match', matchSeed: 'life-seed', reward: { matchXp: { kind: 'percentage', multiplier: 1 }, rune: { kind: 'projected', source: 'campaign_first_clear' }, ranking: { kind: 'none' } }, opponent: { kind: 'scripted', script: { kind: 'campaign-mission', mission: { id: 'life-mission' }, difficulty: 'normal', chapter: {}, localRunId: null } } } as unknown as MatchContext;
describe('campaign local lifecycle boundary', () => {
	it('commits before completing and never publishes externally', async () => {
		let resolve!: (value: unknown) => void; settle.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
		onCampaignMatchEnd(ctx, { iWon: true, turnCount: 2 }); expect(completeMission).not.toHaveBeenCalled(); expect(publish).not.toHaveBeenCalled();
		resolve({ status: 'applied', record: { campaignId: 'ragnarok', missionId: 'life-mission', difficulty: 'normal', turnCount: 2, firstClear: true, runeEntry: { amount: 2 }, matchXpShown: 10 } });
		await vi.waitFor(() => expect(completeMission).toHaveBeenCalledTimes(1)); expect(publish).not.toHaveBeenCalled();
	});
	it('defeat does not settle, publish, or complete', () => { settle.mockClear(); publish.mockClear(); completeMission.mockClear(); onCampaignMatchEnd(ctx, { iWon: false, turnCount: 2 }); expect(settle).not.toHaveBeenCalled(); expect(publish).not.toHaveBeenCalled(); expect(completeMission).not.toHaveBeenCalled(); });
});

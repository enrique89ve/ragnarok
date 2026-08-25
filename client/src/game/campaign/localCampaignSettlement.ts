import { createCampaignFirstClearRuneSourceKey, createRuneLedgerEntryId } from '@shared/protocol-core/runeEconomy';
import { deriveRuneSeasonId } from '@shared/protocol-core/runeSeasonHash';
import type { RagnarokRuntimeEvidence, RagnarokRuntimeConfig } from '@shared/runtimeConfig';
import { projectBattleEndRewards } from '../match/battleEndRewards';
import { CAMPAIGN_ID } from '@shared/campaign/constants';
import type { MatchContext } from '../match/types';
import type { MatchEndContext } from '../match/onWinDispatch';
import {
	commitLocalCampaignSettlement,
	hasLocalCampaignFirstClear,
	getLatestLocalCardProgressionByOwner,
	type LocalCampaignSettlementRecord,
} from '@/data/blockchain/replayDB';
import { createLocalCampaignSettlement } from '@shared/protocol-core/localCampaignSettlement';
import { getTokenBalance } from '@/data/blockchain/replayDB';
import { collectLocalWinnerCards } from '../match/localCardProjection';
import { commitProgressAccountId } from '../auth/progressAccount';

export type LocalCampaignSettlementResult =
	| { readonly status: 'applied' | 'already_applied' | 'conflict'; readonly record: LocalCampaignSettlementRecord }
	| { readonly status: 'skipped'; readonly reason: 'not_local_phase' | 'not_campaign' | 'defeat' | 'missing_account' };

export async function settleLocalCampaignMatch(
	ctx: MatchContext | null,
	end: MatchEndContext,
	deps: {
		readonly runtimeConfig: RagnarokRuntimeConfig;
		readonly runtimeEvidence: RagnarokRuntimeEvidence;
		readonly account: string | null;
		readonly now: () => number;
	},
): Promise<LocalCampaignSettlementResult> {
	if (!deps.runtimeEvidence.phasePolicy.localSettlement) return { status: 'skipped', reason: 'not_local_phase' };
	if (!ctx || ctx.opponent.kind !== 'scripted' || ctx.opponent.script.kind !== 'campaign-mission') return { status: 'skipped', reason: 'not_campaign' };
	if (!end.iWon) return { status: 'skipped', reason: 'defeat' };
	const account = commitProgressAccountId(deps.account, deps.runtimeConfig.stage);
	if (!account) return { status: 'skipped', reason: 'missing_account' };
	const { mission, difficulty } = ctx.opponent.script;
	const seasonId = deriveRuneSeasonId(deps.runtimeConfig);
	const firstClear = !(await hasLocalCampaignFirstClear(account, mission.id));
	const reward = projectBattleEndRewards({
		reward: ctx.reward,
		result: 'victory',
		runtimeStage: deps.runtimeConfig.stage,
		campaign: { missionId: mission.id, isFirstClear: firstClear },
	});
	const sourceKey = createCampaignFirstClearRuneSourceKey(account, CAMPAIGN_ID, mission.id, seasonId);
	const progression = await getLatestLocalCardProgressionByOwner(account);
	const base = createLocalCampaignSettlement({ runtimeFingerprint: deps.runtimeEvidence.runtimeFingerprint, account, campaignId: CAMPAIGN_ID, missionId: mission.id, difficulty, matchId: ctx.matchId, matchSeed: ctx.matchSeed, turnCount: end.turnCount, firstClear, runeAmount: reward.rune, seasonId, matchXpShown: reward.matchXp, cards: collectLocalWinnerCards(end.finalGameState, account, progression), timestamp: deps.now() });
	const balanceBefore = (await getTokenBalance(account, seasonId)).RUNE;
	const runeEntry = firstClear && reward.rune > 0 ? {
		entryId: createRuneLedgerEntryId({ seasonId, direction: 'credit', sourceType: 'campaign_first_clear', sourceKey }),
		seasonId, account, direction: 'credit' as const, sourceType: 'campaign_first_clear' as const,
		sourceKey, amount: reward.rune, balanceBefore, balanceAfter: balanceBefore + reward.rune,
		trxId: base.eventId, blockNum: 0, timestamp: deps.now(),
	} : undefined;
	const record: LocalCampaignSettlementRecord = { ...base, ...(runeEntry ? { runeEntry } : {}) };
	const committed = await commitLocalCampaignSettlement(record);
	return { status: committed.status, record: committed.record };
}

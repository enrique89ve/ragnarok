/**
 * Campaign match lifecycle handlers.
 *
 * Owns:
 *   - Record personal-best stats in `useCampaignStore.completedMissions`.
 *   - Publish the winning campaign run as `rp_campaign_result`.
 *
 * Reward economy:
 *   - `rp_campaign_result` validates inline and credits first-clear RUNE
 *     in the same chain apply step. No separate `reward_claim` broadcast.
 *   - Local mode (no Hive) records completion only; no economy.
 *
 * Idempotency:
 *   - Chain-side: `applyCampaignResult` uses (broadcaster, missionId, nonce)
 *     submission key + ledger source key for RUNE; duplicates are no-ops.
 *   - `completeMission` updates personal-best stats every win and is
 *     intentionally NOT idempotent — replay should refresh bests.
 */

import { toast } from 'sonner';
import { CAMPAIGN_ID } from '@shared/campaign/constants';
import { debug } from '../../../config/debugConfig';
import { publishCampaignVictoryResult, useCampaignStore } from '../../../campaign';
import { getNFTBridge } from '../../../nft';
import { projectBattleEndRewards } from '../../battleEndRewards';
import type { MatchEndContext } from '../../onWinDispatch';
import type { MatchContext } from '../../types';
import { recordCeremonyFeedbackEvent } from '../../../protocol/ceremonyFeedback';
import type { CampaignRewardFeedbackInput } from '../../../campaign';

export function onCampaignMatchEnd(ctx: MatchContext, end: MatchEndContext): void {
	if (ctx.opponent.kind !== 'scripted') return;
	if (ctx.opponent.script.kind !== 'campaign-mission') return;

	const { mission, difficulty } = ctx.opponent.script;
	const localRunId = ctx.opponent.script.localRunId ?? null;
	const campaign = useCampaignStore.getState();
	const isFirstClear = !campaign.completedMissions[mission.id];
	const projection = projectBattleEndRewards({
		reward: ctx.reward,
		result: end.iWon ? 'victory' : 'defeat',
		campaign: { missionId: mission.id, isFirstClear },
	});
	const previewRune = projection.rune;
	const baseFeedback = {
		campaignId: CAMPAIGN_ID,
		missionId: mission.id,
		localRunId,
		difficulty,
		isFirstClear,
		previewRune,
		matchXpShown: projection.matchXp,
		turnCount: end.turnCount,
		trxId: null,
		error: null,
	} satisfies Omit<CampaignRewardFeedbackInput, 'status'>;

	if (!end.iWon) {
		recordCampaignRewardFeedback({
			...baseFeedback,
			status: 'defeat_no_reward',
		});
		return;
	}

	recordCampaignRewardFeedback({
		...baseFeedback,
		status: isFirstClear ? 'first_clear_pending' : 'replay_no_reward',
	});

	campaign.completeMission(mission.id, difficulty, end.turnCount);

	void publishCampaignVictoryResult(ctx, end)
		.then(result => {
			if (!result.success) {
				debug.warn('[Campaign] Result publication failed:', result.error);
				recordCampaignRewardFeedback({
					...baseFeedback,
					status: 'publish_failed',
					trxId: result.trxId ?? null,
					error: result.error ?? 'Campaign result publication failed.',
				});
				return;
			}
			if (result.trxId) getNFTBridge().emitTransactionConfirmed(result.trxId);
			recordCampaignRewardFeedback({
				...baseFeedback,
				status: isFirstClear
					? previewRune > 0 ? 'first_clear_published' : 'first_clear_no_rune'
					: 'replay_no_reward',
				trxId: result.trxId ?? null,
			});
			showFirstClearRuneToast(isFirstClear, previewRune);
		})
		.catch(err => {
			const error = err instanceof Error ? err.message : 'Campaign result publication failed.';
			debug.warn('[Campaign] Result publication error:', err);
			recordCampaignRewardFeedback({
				...baseFeedback,
				status: 'publish_failed',
				error,
			});
		});
}

function recordCampaignRewardFeedback(input: CampaignRewardFeedbackInput): void {
	useCampaignStore.getState().recordRewardFeedback(input);
	recordCeremonyFeedbackEvent('campaign_reward', input.status, {
		missionId: input.missionId,
		campaignId: input.campaignId,
		localRunId: input.localRunId ?? null,
		difficulty: input.difficulty,
		isFirstClear: input.isFirstClear,
		previewRune: input.previewRune,
		matchXpShown: input.matchXpShown ?? 0,
		turnCount: input.turnCount,
		trxId: input.trxId,
		error: input.error,
	});
}

function showFirstClearRuneToast(isFirstClear: boolean, previewRune: number): void {
	if (!isFirstClear) return;
	if (previewRune > 0) {
		toast.success(`First clear · +${previewRune} RUNE`, {
			description: 'Reward submitted — chain reconciles within your S01 cap.',
		});
		return;
	}
	toast.success('First clear logged', {
		description: 'No RUNE reward for this stage. Earlier missions in the chapter pay first-clear RUNE.',
	});
}

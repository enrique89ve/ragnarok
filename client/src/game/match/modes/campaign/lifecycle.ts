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
 *   - F1 local mode commits campaign anchor/result, RUNE and card progression
 *     atomically in replay IndexedDB before recording mission completion.
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
import { getRagnarokNetworkConfig } from '../../../config/networkConfig';
import { buildRagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import { settleLocalCampaignMatch } from '../../../campaign/localCampaignSettlement';
import { getCurrentHiveUsername } from '../../../../data/HiveSessionIdentity';
import { commitProgressAccountId } from '../../../auth/progressAccount';

export type CampaignLifecycleDependencies = {
	readonly getRuntimeConfig: typeof getRagnarokNetworkConfig;
	readonly getSessionUsername: typeof getCurrentHiveUsername;
	readonly getFallbackUsername: () => string | null;
	readonly settleLocal: typeof settleLocalCampaignMatch;
	readonly completeMission: (missionId: string, difficulty: 'normal' | 'heroic' | 'mythic', turns: number) => void | Promise<void>;
	readonly recordFeedback: (input: CampaignRewardFeedbackInput) => void;
	readonly publish: typeof publishCampaignVictoryResult;
	readonly emitTransactionConfirmed: (trxId: string) => void;
	readonly now: () => number;
};

const DEFAULT_DEPENDENCIES: CampaignLifecycleDependencies = {
	getRuntimeConfig: getRagnarokNetworkConfig,
	getSessionUsername: getCurrentHiveUsername,
	getFallbackUsername: () => getNFTBridge().getUsername(),
	settleLocal: settleLocalCampaignMatch,
	completeMission: (missionId, difficulty, turns) => useCampaignStore.getState().completeMission(missionId, difficulty, turns),
	recordFeedback: recordCampaignRewardFeedback,
	publish: publishCampaignVictoryResult,
	emitTransactionConfirmed: trxId => getNFTBridge().emitTransactionConfirmed(trxId),
	now: Date.now,
};

export function onCampaignMatchEnd(ctx: MatchContext, end: MatchEndContext): void {
	void processCampaignMatchEnd(ctx, end).catch(error => debug.warn('[Campaign] Lifecycle failed:', error));
}

export async function processCampaignMatchEnd(
	ctx: MatchContext,
	end: MatchEndContext,
	deps: CampaignLifecycleDependencies = DEFAULT_DEPENDENCIES,
): Promise<void> {
	if (ctx.opponent.kind !== 'scripted') return;
	if (ctx.opponent.script.kind !== 'campaign-mission') return;
	const campaignScript = ctx.opponent.script;
	const runtimeConfig = deps.getRuntimeConfig();
	const runtimeEvidence = buildRagnarokRuntimeEvidence(runtimeConfig);
	if (runtimeEvidence.phasePolicy.localSettlement) {
		if (!end.iWon) {
			deps.recordFeedback({ campaignId: CAMPAIGN_ID, missionId: campaignScript.mission.id, localRunId: campaignScript.localRunId, difficulty: campaignScript.difficulty, isFirstClear: false, previewRune: 0, matchXpShown: 0, turnCount: end.turnCount, trxId: null, error: null, status: 'defeat_no_reward' });
			return;
		}
		const result = await deps.settleLocal(ctx, end, {
			runtimeConfig,
			runtimeEvidence,
			account: commitProgressAccountId(
				deps.getSessionUsername() ?? deps.getFallbackUsername(),
				runtimeConfig.stage,
			),
			now: deps.now,
		});
		if (result.status === 'skipped' || result.status === 'conflict') return;
		await deps.completeMission(result.record.missionId, result.record.difficulty, result.record.turnCount);
		deps.recordFeedback({
			campaignId: result.record.campaignId, missionId: result.record.missionId, localRunId: campaignScript.localRunId,
			difficulty: result.record.difficulty, isFirstClear: result.record.firstClear,
			previewRune: result.record.runeEntry?.amount ?? 0, matchXpShown: result.record.matchXpShown, turnCount: result.record.turnCount,
			trxId: null, error: null, status: result.record.firstClear ? 'first_clear_local' : 'replay_no_reward',
		});
		return;
	}

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
		deps.recordFeedback({
			...baseFeedback,
			status: 'defeat_no_reward',
		});
		return;
	}

	deps.recordFeedback({
		...baseFeedback,
		status: isFirstClear ? 'first_clear_pending' : 'replay_no_reward',
	});

	await deps.completeMission(mission.id, difficulty, end.turnCount);

	await deps.publish(ctx, end)
		.then(result => {
			if (!result.success) {
				debug.warn('[Campaign] Result publication failed:', result.error);
				deps.recordFeedback({
					...baseFeedback,
					status: 'publish_failed',
					trxId: result.trxId ?? null,
					error: result.error ?? 'Campaign result publication failed.',
				});
				return;
			}
			if (result.trxId) deps.emitTransactionConfirmed(result.trxId);
			deps.recordFeedback({
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
			deps.recordFeedback({
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

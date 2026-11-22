/** Settle campaign victories in local replay. Shared profiles require independently verified evidence. */
import { toast } from 'sonner';
import { CAMPAIGN_ID } from '@shared/campaign/constants';
import { debug } from '../../../config/debugConfig';
import { useCampaignStore } from '../../../campaign';
import { getNFTBridge } from '../../../nft';
import type { MatchEndContext } from '../../onWinDispatch';
import type { MatchContext } from '../../types';
import { recordCeremonyFeedbackEvent } from '../../../protocol/ceremonyFeedback';
import type { CampaignRewardFeedbackInput } from '../../../campaign';
import { getRagnarokNetworkConfig } from '../../../config/networkConfig';
import { buildRagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import { settleLocalCampaignMatch } from '../../../campaign/localCampaignSettlement';
import { getCurrentHiveUsername } from '../../../../data/HiveSessionIdentity';
import { commitProgressAccountId } from '../../../auth/progressAccount';
import { markCampaignRunWon } from '../../../../data/blockchain/replayDB';

export type CampaignLifecycleDependencies = {
	readonly getRuntimeConfig: typeof getRagnarokNetworkConfig;
	readonly getSessionUsername: typeof getCurrentHiveUsername;
	readonly getFallbackUsername: () => string | null;
	readonly settleLocal: typeof settleLocalCampaignMatch;
	readonly completeMission: (missionId: string, difficulty: 'normal' | 'heroic' | 'mythic', turns: number) => void | Promise<void>;
	readonly recordFeedback: (input: CampaignRewardFeedbackInput) => void;
	readonly now: () => number;
};

const DEFAULT_DEPENDENCIES: CampaignLifecycleDependencies = {
	getRuntimeConfig: getRagnarokNetworkConfig,
	getSessionUsername: getCurrentHiveUsername,
	getFallbackUsername: () => getNFTBridge().getUsername(),
	settleLocal: settleLocalCampaignMatch,
	completeMission: (missionId, difficulty, turns) => useCampaignStore.getState().completeMission(missionId, difficulty, turns),
	recordFeedback: recordCampaignRewardFeedback,
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
		if (campaignScript.localRunId) {
			await markCampaignRunWon({
				localRunId: campaignScript.localRunId,
				matchId: ctx.matchId,
				matchSeed: ctx.matchSeed,
				turnCount: result.record.turnCount,
			}).catch(error => debug.warn('[Campaign] Failed to close local campaign run:', error));
		}
		await deps.completeMission(result.record.missionId, result.record.difficulty, result.record.turnCount);
		if (result.eitrAwarded > 0) {
			toast.success(`+${result.eitrAwarded} Eitr`, {
				description: 'Spend it at the Campaign Forge before the season resets.',
			});
		}
		deps.recordFeedback({
			campaignId: result.record.campaignId, missionId: result.record.missionId, localRunId: campaignScript.localRunId,
			difficulty: result.record.difficulty, isFirstClear: result.record.firstClear,
			previewRune: result.record.runeEntry?.amount ?? 0, matchXpShown: result.record.matchXpShown, turnCount: result.record.turnCount,
			trxId: null, error: null, status: result.record.firstClear ? 'first_clear_local' : 'replay_no_reward',
		});
		return;
	}

	const { mission, difficulty, localRunId } = campaignScript;
	deps.recordFeedback({
		campaignId: CAMPAIGN_ID,
		missionId: mission.id,
		localRunId,
		difficulty,
		isFirstClear: false,
		previewRune: 0,
		turnCount: end.turnCount,
		trxId: null,
		error: null,
		status: end.iWon ? 'verification_required' : 'defeat_no_reward',
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

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

import { debug } from '../../../config/debugConfig';
import { publishCampaignVictoryResult, useCampaignStore } from '../../../campaign';
import { getNFTBridge } from '../../../nft';
import type { MatchEndContext } from '../../onWinDispatch';
import type { MatchContext } from '../../types';

export function onCampaignMatchEnd(ctx: MatchContext, end: MatchEndContext): void {
	if (ctx.opponent.kind !== 'scripted') return;
	if (ctx.opponent.script.kind !== 'campaign-mission') return;
	if (!end.iWon) return;

	const { mission, difficulty } = ctx.opponent.script;
	const campaign = useCampaignStore.getState();

	campaign.completeMission(mission.id, difficulty, end.turnCount);

	void publishCampaignVictoryResult(ctx, end)
		.then(result => {
			if (result.success && result.trxId) getNFTBridge().emitTransactionConfirmed(result.trxId);
			if (!result.success) debug.warn('[Campaign] Result publication failed:', result.error);
		})
		.catch(err => debug.warn('[Campaign] Result publication error:', err));
}

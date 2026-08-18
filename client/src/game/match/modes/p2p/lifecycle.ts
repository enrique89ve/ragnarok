/**
 * P2P match lifecycle handlers.
 *
 * Closed-beta status: deferred. The chain handler
 * (`applyRankedMatchSettlement`) is fully wired, but no `match_result`
 * broadcast fires here because no winner-arbiter exists yet — accepting
 * client-declared winners would let either peer claim 2 RUNE per match.
 * See `docs/RUNE.md` § "Beta status" for the canon decision.
 *
 * When the arbiter ships, the on-win path will:
 *   - Submit (winner, loser, matchId, matchSeed) to the arbiter for
 *     transcript-verified settlement.
 *   - Update local ELO snapshot + season streak.
 *
 * Battle-end Match XP and RUNE are projected together via
 * `projectBattleEndRewards`. P2P RUNE persist stays deferred.
 */

import { debug } from '../../../config/debugConfig';
import { getRagnarokNetworkConfig } from '../../../config/networkConfig';
import { recordSessionEvent } from '../../../../data/blockchain/transcriptBuilder';
import type { MatchEndContext } from '../../onWinDispatch';
import type { MatchContext } from '../../types';
import {
	createDefaultP2PRankedSettlementAdapters,
	createP2PRankedSettlementModule,
} from './rankedSettlement';
import { projectBattleEndRewards } from '../../battleEndRewards';
import { createP2PQaLocalRewardPreview } from './qaLocalRewardPreview';

const RANKED_SETTLEMENT_MODULE = createP2PRankedSettlementModule(
	createDefaultP2PRankedSettlementAdapters({
		runtime: getRagnarokNetworkConfig(),
	}),
);

export function onP2PMatchEnd(ctx: MatchContext, end: MatchEndContext): void {
	if (ctx.opponent.kind !== 'peer') return;
	const result = end.iWon ? 'victory' : 'defeat';
	const battleEndRewards = projectBattleEndRewards({
		reward: ctx.reward,
		result,
		runtimeStage: getRagnarokNetworkConfig().stage,
	});
	const qaLocalRewardPreview = createP2PQaLocalRewardPreview({
		match: ctx,
		result,
		runtime: getRagnarokNetworkConfig(),
	});
	const rankedDecision = RANKED_SETTLEMENT_MODULE.evaluateMatchEnd(ctx, end);
	// P2P RUNE/ELO deferred — wait for winner-arbiter (see file header).
	recordSessionEvent('p2p_match_end_deferred_settlement', {
		matchId: ctx.matchId,
		iWon: end.iWon,
		turnCount: end.turnCount,
		rankedDecisionStatus: rankedDecision.status,
		rankedCanBroadcast: rankedDecision.canBroadcastMatchResult,
		rankedCanApplyRune: rankedDecision.canApplyP2PRankedRune,
		rankedCanApplyElo: rankedDecision.canApplyElo,
		reason: 'ranked_settlement_requires_dual_signed_match_anchor',
		runeSettlement: 'not_credited_from_result_only',
		battleEndRewards,
		qaLocalRewardPreview: qaLocalRewardPreview
			? {
				scope: qaLocalRewardPreview.scope,
				runeShown: qaLocalRewardPreview.runeShown,
				matchXpShown: qaLocalRewardPreview.matchXpShown,
				cardXpShown: qaLocalRewardPreview.cardXpShown,
				cacheKey: qaLocalRewardPreview.cacheKey,
				persistence: qaLocalRewardPreview.persistence,
			}
			: null,
	});
	debug.chess(
		`[P2P] Match ended (matchId=${ctx.matchId.slice(0, 8)}, iWon=${end.iWon}, turns=${end.turnCount}, ranked=${rankedDecision.status}). RUNE/ELO settlement deferred — no arbiter.`,
	);
}

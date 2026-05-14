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
 * The xpRunes side of the reward already runs through the same generic
 * handler (`MATCH_ECONOMY[mode].xpRunesShare * BASE_XP_PER_MATCH`); peer
 * mode gets the full pool by default.
 */

import { debug } from '../../../config/debugConfig';
import type { MatchEndContext } from '../../onWinDispatch';
import type { MatchContext } from '../../types';

export function onP2PMatchEnd(ctx: MatchContext, end: MatchEndContext): void {
	if (ctx.opponent.kind !== 'peer') return;
	// P2P RUNE/ELO deferred — wait for winner-arbiter (see file header).
	debug.chess(
		`[P2P] Match ended (matchId=${ctx.matchId.slice(0, 8)}, iWon=${end.iWon}, turns=${end.turnCount}). RUNE/ELO settlement deferred — no arbiter.`,
	);
}

/**
 * onWin dispatcher — picks the right mode's lifecycle handler.
 *
 * Lives separately from `derived.ts` because the lifecycle modules
 * import Zustand stores that touch localStorage at module init
 * (campaignStore uses `persist` middleware). Pulling those imports
 * into derived.ts would crash Vitest's node environment for any
 * test that loaded derived.ts. Same split pattern as
 * legacySynth.ts vs legacyBridge.ts.
 *
 * Coordinator pattern at game-end:
 *   if (ctx) selectOnWinHandler(ctx)({ iWon, turnCount });
 */

import { useDailyQuestStore } from '../stores/dailyQuestStore';
import { onCampaignMatchEnd } from './modes/campaign/lifecycle';
import { onP2PMatchEnd } from './modes/p2p/lifecycle';
import { onSingleMatchEnd } from './modes/single/lifecycle';
import type { MatchContext } from './types';

/** Inputs the lifecycle handler needs from the coordinator on game-end. */
export interface MatchEndContext {
	/**
	 * Whether the local player won. Computed by the coordinator from
	 * canonical winner vs `myCanonicalSide`. Lifecycle handlers gate
	 * their reward dispatch on this — losses do not pay.
	 */
	iWon: boolean;
	/**
	 * Turns the player took. Used by campaign for personal-best
	 * tracking; ignored by other modes today.
	 */
	turnCount: number;
}

/**
 * Returns the on-win handler for this match's mode. Always returns a
 * function (no nulls / no defensive null-check at the call site).
 *
 *   ai       => onSingleMatchEnd     (no-op)
 *   scripted => onCampaignMatchEnd   (mark mission + reward dispatch)
 *   peer     => onP2PMatchEnd        (stub until ranking server lands)
 */
export function selectOnWinHandler(
	ctx: MatchContext,
): (end: MatchEndContext) => void {
	switch (ctx.opponent.kind) {
		case 'ai':
			return (end) => onSingleMatchEnd(ctx, end);
		case 'scripted':
			return (end) => onCampaignMatchEnd(ctx, end);
		case 'peer':
			return (end) => onP2PMatchEnd(ctx, end);
	}
}

/**
 * Match-end side effects that run for every mode (win or loss) — flushes
 * any daily-quest progress that crossed its goal mid-combat so the chain
 * broadcasts happen now, at the neutral moment after the match, instead
 * of popping a Keychain dialog while the player was deciding their move.
 *
 * Idempotent — completed-but-unclaimed is the filter. Re-entering this
 * after a successful flush is a no-op.
 */
export function flushDailyQuestClaimsAfterMatch(): void {
	void useDailyQuestStore.getState().flushPendingClaims();
}

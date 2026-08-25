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

import { GameEventBus } from '../../core/events/GameEventBus';
import { onCampaignMatchEnd } from './modes/campaign/lifecycle';
import { onP2PMatchEnd } from './modes/p2p/lifecycle';
import { onSingleMatchEnd } from './modes/single/lifecycle';
import type { MatchContext } from './types';
import type { GameState } from '../types';

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
	/** Immutable terminal card state used by local campaign progression. */
	finalGameState?: GameState;
}

/**
 * Returns the on-win handler for this match's mode. Always returns a
 * function (no nulls / no defensive null-check at the call site).
 *
 *   ai       => onSingleMatchEnd     (local result + streak)
 *   scripted => onCampaignMatchEnd   (mark mission + reward dispatch)
 *   peer     => onP2PMatchEnd        (local IndexedDB or future Hive route)
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
 * Match-end side effects that run for every mode (win or loss). Daily-quest
 * progress may cross its goal mid-combat, but match-end must not open
 * Keychain. The quest panel exposes an explicit Claim action for the wallet
 * prompt.
 *
 * Emits GAME_ENDED so win_games can advance independently of blockchain
 * packaging. Duplicate emissions for the same turn are ignored by the
 * daily-quest subscriber.
 */
export function markDailyQuestClaimsPendingAfterMatch(input: {
	iWon: boolean;
	turnCount?: number;
}): void {
	GameEventBus.emitGameEnded({
		winner: input.iWon ? 'player' : 'opponent',
		reason: 'hero_death',
		finalTurn: input.turnCount ?? 0,
	});
}

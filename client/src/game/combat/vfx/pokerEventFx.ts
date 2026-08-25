import type { ArenaVfxOwner } from '../arenaVfxTargets';
import type { VisualEventType } from './events';
import type { PokerMotionIntent, PokerMotionPriority, PokerMotionZone } from './pokerMotionContract';

/**
 * One gameplay visual event occupies one overlay lane.
 * Log always records separately and is not an overlay.
 */
export type PokerFxLane = 'cinema' | 'stack' | 'floater' | 'zone';

export interface PokerEventFxSpec {
	readonly event: VisualEventType;
	readonly lane: PokerFxLane;
	readonly motion: PokerMotionIntent;
	readonly zone: PokerMotionZone;
	readonly priority: PokerMotionPriority;
}

export const POKER_EVENT_FX: Readonly<Record<VisualEventType, PokerEventFxSpec>> = {
	phaseEntered: {
		event: 'phaseEntered',
		lane: 'cinema',
		motion: 'phase-reveal',
		zone: 'vfxFocus',
		priority: 'cinema',
	},
	bettingAction: {
		event: 'bettingAction',
		lane: 'zone',
		motion: 'betting-action',
		zone: 'feedbackStack',
		priority: 'feedback',
	},
	communityCardRevealed: {
		event: 'communityCardRevealed',
		lane: 'zone',
		motion: 'community-reveal',
		zone: 'communityCards',
		priority: 'feedback',
	},
	handRankAnnounced: {
		event: 'handRankAnnounced',
		lane: 'cinema',
		motion: 'hand-rank',
		zone: 'vfxFocus',
		priority: 'cinema',
	},
	showdownDamage: {
		event: 'showdownDamage',
		lane: 'floater',
		motion: 'showdown-impact',
		zone: 'playerHero',
		priority: 'impact',
	},
	ragnarokTriggered: {
		event: 'ragnarokTriggered',
		lane: 'cinema',
		motion: 'streak-announcement',
		zone: 'vfxFocus',
		priority: 'cinema',
	},
	streakAnnounced: {
		event: 'streakAnnounced',
		lane: 'cinema',
		motion: 'streak-announcement',
		zone: 'vfxFocus',
		priority: 'cinema',
	},
	handImproved: {
		event: 'handImproved',
		lane: 'zone',
		motion: 'betting-action',
		zone: 'communityCards',
		priority: 'feedback',
	},
	spellCast: {
		event: 'spellCast',
		lane: 'stack',
		motion: 'betting-action',
		zone: 'feedbackStack',
		priority: 'feedback',
	},
	wagerActivated: {
		event: 'wagerActivated',
		lane: 'zone',
		motion: 'betting-action',
		zone: 'feedbackStack',
		priority: 'feedback',
	},
	combatImpact: {
		event: 'combatImpact',
		lane: 'floater',
		motion: 'showdown-impact',
		zone: 'playerHero',
		priority: 'impact',
	},
};

export function pokerEventFx(eventType: VisualEventType): PokerEventFxSpec {
	return POKER_EVENT_FX[eventType];
}

/** One cinema slam per showdown: winner only, or the player line on a draw. */
export function shouldAnnounceHandRank(event: {
	readonly side: ArenaVfxOwner;
	readonly winner: ArenaVfxOwner | 'draw';
}): boolean {
	if (event.winner === 'draw') return event.side === 'player';
	return event.winner === event.side;
}

export function cinemaHoldMs(enterMs: number, exitMs: number): number {
	return enterMs + 1200 + exitMs;
}

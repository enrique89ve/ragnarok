import type { ArenaVfxOwner } from '../arenaVfxTargets';
import type { CombatAction } from '../../types/PokerCombatTypes';
import {
	gameEffectCoordinator,
	type GameEffectHandle,
	type GameEffectPriority,
} from '@/game/effects/core/gameEffectCoordinator';
import { occupyCinema } from '../feedback/combatFeedbackStore';
import { cinemaHoldMs } from './pokerEventFx';

/**
 * Stable motion vocabulary for poker feedback. The intent is deliberately
 * separate from the effect implementation so a new art treatment cannot
 * silently choose a conflicting position or priority.
 */
export type PokerMotionIntent =
	| 'phase-reveal'
	| 'betting-action'
	| 'community-reveal'
	| 'hand-rank'
	| 'showdown-impact'
	| 'streak-announcement'
	| 'persistent-turn';

export type PokerMotionZone =
	| 'vfxFocus'
	| 'feedbackStack'
	| 'communityCards'
	| 'playerHero'
	| 'opponentHero'
	| 'turnBadge';

export type PokerMotionPriority = 'cinema' | 'impact' | 'feedback' | 'persistent';

export interface PokerMotionSpec {
	readonly intent: PokerMotionIntent;
	readonly zone: PokerMotionZone;
	readonly priority: PokerMotionPriority;
	readonly owner?: ArenaVfxOwner;
	readonly enterMs: number;
	readonly exitMs: number;
	readonly staggerMs?: number;
	readonly action?: CombatAction;
}

export const POKER_MOTION_SPECS: Readonly<Record<PokerMotionIntent, PokerMotionSpec>> = {
	'phase-reveal': {
		intent: 'phase-reveal',
		zone: 'vfxFocus',
		priority: 'cinema',
		enterMs: 220,
		exitMs: 160,
	},
	'betting-action': {
		intent: 'betting-action',
		zone: 'feedbackStack',
		priority: 'feedback',
		enterMs: 160,
		exitMs: 160,
	},
	'community-reveal': {
		intent: 'community-reveal',
		zone: 'communityCards',
		priority: 'feedback',
		enterMs: 180,
		exitMs: 160,
		staggerMs: 160,
	},
	'hand-rank': {
		intent: 'hand-rank',
		zone: 'vfxFocus',
		priority: 'cinema',
		enterMs: 220,
		exitMs: 180,
	},
	'showdown-impact': {
		intent: 'showdown-impact',
		zone: 'playerHero',
		priority: 'impact',
		enterMs: 180,
		exitMs: 180,
	},
	'streak-announcement': {
		intent: 'streak-announcement',
		zone: 'vfxFocus',
		priority: 'cinema',
		enterMs: 240,
		exitMs: 220,
	},
	'persistent-turn': {
		intent: 'persistent-turn',
		zone: 'turnBadge',
		priority: 'persistent',
		enterMs: 180,
		exitMs: 160,
	},
};

export function bettingActionMotion(action: CombatAction, owner: ArenaVfxOwner): PokerMotionSpec {
	return { ...POKER_MOTION_SPECS['betting-action'], owner, action };
}

export function showdownImpactMotion(owner: ArenaVfxOwner): PokerMotionSpec {
	return {
		...POKER_MOTION_SPECS['showdown-impact'],
		owner,
		zone: owner === 'player' ? 'playerHero' : 'opponentHero',
	};
}

const activePokerSchedules = new Set<GameEffectHandle>();

function coordinatorPriority(priority: PokerMotionPriority): GameEffectPriority {
	switch (priority) {
		case 'cinema':
			return 'critical';
		case 'impact':
			return 'high';
		case 'feedback':
			return 'normal';
		case 'persistent':
			return 'low';
		default: {
			const exhaustive: never = priority;
			return exhaustive;
		}
	}
}

/** Schedule only future work; cancellation prevents stale VFX after a phase or hand changes. */
export function schedulePokerMotion(
	spec: PokerMotionSpec,
	delays: readonly number[],
	effect: (index: number) => void,
	key: string = spec.zone,
): GameEffectHandle {
	if (spec.priority === 'cinema') {
		gameEffectCoordinator.cancelOwnerLane('poker', 'cinema');
		occupyCinema('poker-cinema', cinemaHoldMs(spec.enterMs, spec.exitMs));
	}
	const handle = gameEffectCoordinator.scheduleSequence({
		owner: 'poker',
		lane: spec.priority,
		key,
		priority: coordinatorPriority(spec.priority),
		delaysMs: delays,
		run: effect,
	});
	activePokerSchedules.add(handle);
	handle.onComplete?.then(() => activePokerSchedules.delete(handle));
	return handle;
}

export function cancelPokerMotionSchedules(): void {
	gameEffectCoordinator.cancelOwner('poker');
	activePokerSchedules.clear();
}

import type { ArenaVfxOwner } from '../arenaVfxTargets';
import type { CombatAction } from '../../types/PokerCombatTypes';
import {
	gameEffectCoordinator,
	type GameEffectHandle,
	type GameEffectPriority,
} from '@/game/effects/core/gameEffectCoordinator';
import { canShowFloater } from '@/game/effects/presentation/presentationOrchestrator';
import { occupyCinema, releaseCinemaHold } from '../feedback/combatFeedbackStore';
import { dismissCenterSlams } from '../animations/PokerDramaVFX';
import { cinemaHoldMs } from './pokerEventFx';

/** Gap before the next center title. Longer than enter + 3s read + exit. */
export const CENTER_SLAM_GAP_MS = 3_900;

const FLOATER_LANE_RETRY_MS = 80;

function isFloaterIntent(intent: PokerMotionIntent): boolean {
	return intent === 'showdown-impact' || intent === 'combat-hit';
}

function wrapFloaterGatedRun(
	spec: PokerMotionSpec,
	effect: (index: number) => void,
	key: string,
): (index: number) => void {
	if (!isFloaterIntent(spec.intent)) return effect;
	return (index: number) => {
		const attempt = (): void => {
			if (canShowFloater()) {
				effect(index);
				return;
			}
			gameEffectCoordinator.schedule({
				owner: 'poker',
				lane: 'impact',
				key: `${key}:floater-gate`,
				priority: coordinatorPriority(spec.priority),
				delayMs: FLOATER_LANE_RETRY_MS,
				run: attempt,
			});
		};
		attempt();
	};
}

/**
 * Stable motion vocabulary for poker feedback. The intent is deliberately
 * separate from the effect implementation so a new art treatment cannot
 * silently choose a conflicting position or priority.
 */
export type PokerMotionIntent =
	| 'phase-reveal'
	| 'betting-action'
	| 'spell-cast'
	| 'wager-activate'
	| 'community-reveal'
	| 'hand-improve'
	| 'hand-rank'
	| 'showdown-impact'
	| 'combat-hit'
	| 'streak-announcement'
	| 'ragnarok-ultimate'
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
	/** Quiet read after the hit, before the lane is free again. */
	readonly readMs?: number;
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
		readMs: 620,
	},
	'betting-action': {
		intent: 'betting-action',
		zone: 'feedbackStack',
		priority: 'feedback',
		enterMs: 140,
		exitMs: 120,
	},
	'spell-cast': {
		intent: 'spell-cast',
		zone: 'feedbackStack',
		priority: 'feedback',
		enterMs: 160,
		exitMs: 140,
	},
	'wager-activate': {
		intent: 'wager-activate',
		zone: 'feedbackStack',
		priority: 'feedback',
		enterMs: 180,
		exitMs: 140,
	},
	'community-reveal': {
		intent: 'community-reveal',
		zone: 'communityCards',
		priority: 'feedback',
		enterMs: 180,
		exitMs: 160,
		staggerMs: 160,
	},
	'hand-improve': {
		intent: 'hand-improve',
		zone: 'communityCards',
		priority: 'feedback',
		enterMs: 160,
		exitMs: 140,
	},
	'hand-rank': {
		intent: 'hand-rank',
		zone: 'vfxFocus',
		priority: 'cinema',
		enterMs: 300,
		exitMs: 400,
		readMs: 3_000,
	},
	'showdown-impact': {
		intent: 'showdown-impact',
		zone: 'playerHero',
		priority: 'impact',
		enterMs: 180,
		exitMs: 180,
	},
	'combat-hit': {
		intent: 'combat-hit',
		zone: 'playerHero',
		priority: 'impact',
		enterMs: 120,
		exitMs: 120,
	},
	'streak-announcement': {
		intent: 'streak-announcement',
		zone: 'vfxFocus',
		priority: 'cinema',
		enterMs: 300,
		exitMs: 400,
		readMs: 3_000,
	},
	'ragnarok-ultimate': {
		intent: 'ragnarok-ultimate',
		zone: 'vfxFocus',
		priority: 'cinema',
		enterMs: 300,
		exitMs: 400,
		readMs: 3_000,
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
	const leadMs = delays.reduce((max, delay) => Math.max(max, delay), 0);
	if (spec.intent === 'phase-reveal') {
		// PhaseBanner owns the center title for this beat. Decorative shake /
		// audio must not grab poker-cinema and cut the title short (see
		// cinemaLanePolicy.ts).
		gameEffectCoordinator.cancelOwnerLane('poker', 'cinema');
		dismissCenterSlams();
	} else if (spec.priority === 'cinema') {
		const holdMs = leadMs + cinemaHoldMs(spec.enterMs, spec.exitMs, spec.readMs);
		occupyCinema('poker-cinema', holdMs);
	}
	const handle = gameEffectCoordinator.scheduleSequence({
		owner: 'poker',
		lane: spec.priority,
		key,
		priority: coordinatorPriority(spec.priority),
		delaysMs: delays,
		run: wrapFloaterGatedRun(spec, effect, key),
	});
	activePokerSchedules.add(handle);
	handle.onComplete?.then(() => activePokerSchedules.delete(handle));
	return handle;
}

export function cancelPokerMotionSchedules(): void {
	gameEffectCoordinator.cancelOwner('poker');
	activePokerSchedules.clear();
	dismissCenterSlams();
	releaseCinemaHold('poker-cinema');
}

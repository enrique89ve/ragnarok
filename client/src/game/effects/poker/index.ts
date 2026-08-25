/**
 * Poker gameplay effects are exposed from this domain boundary. The current
 * motion implementation remains in combat/vfx during the incremental move so
 * existing imports and runtime behavior stay intact.
 */
export {
	bettingActionMotion,
	cancelPokerMotionSchedules,
	POKER_MOTION_SPECS,
	schedulePokerMotion,
	showdownImpactMotion,
	type PokerMotionIntent,
	type PokerMotionPriority,
	type PokerMotionSpec,
	type PokerMotionZone,
} from '@/game/combat/vfx/pokerMotionContract';

export {
	cinemaHoldMs,
	pokerEventFx,
	shouldAnnounceHandRank,
	POKER_EVENT_FX,
	type PokerEventFxSpec,
	type PokerFxLane,
} from '@/game/combat/vfx/pokerEventFx';

export { attackIntentsFromImpact } from './attackEffectAdapter';

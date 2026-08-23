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

export { attackIntentsFromImpact } from './attackEffectAdapter';

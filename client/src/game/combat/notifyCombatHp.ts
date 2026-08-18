import { CombatEventBus } from '../services/CombatEventBus';
import type { PokerCombatState } from '../types/PokerCombatTypes';
import type { CombatHpChannelId } from './combatHpBook';
import { isOpponentHpChannel, type PokerHpWrite } from './pokerCombatHp';
import { emitCombatImpact } from './vfx/events';

export function notifyOpponentHpDebit(
	state: PokerCombatState,
	write: PokerHpWrite,
	sourceId: string,
): void {
	if (!isOpponentHpChannel(state, write.channelId)) return;
	const actualDamage = -write.transition.applied;
	if (actualDamage <= 0) return;
	CombatEventBus.emitDamageResolved({
		sourceId,
		sourceType: 'effect',
		targetId: write.channelId,
		targetType: 'hero',
		actualDamage,
		damageSource: 'effect',
		attackerOwner: 'player',
		defenderOwner: 'opponent',
		targetHealthBefore: write.transition.before.current,
		targetHealthAfter: write.transition.after.current,
		targetDied: write.transition.after.current <= 0,
	});
	emitCombatImpact({
		targetId: 'opponent-hero',
		damage: actualDamage,
		kind: 'hit',
	});
}

export type { CombatHpChannelId };

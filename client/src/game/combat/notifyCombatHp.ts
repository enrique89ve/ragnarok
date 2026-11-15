import { CombatEventBus } from '../services/CombatEventBus';
import type { PokerCombatState } from '../types/PokerCombatTypes';
import type { CombatHpChannelId } from './combatHpBook';
import { isOpponentHpChannel, type PokerHpWrite } from './pokerCombatHp';

function heroTargetIdForChannel(state: PokerCombatState, channelId: CombatHpChannelId): string {
	if (state.player.playerId === channelId) return 'player-hero';
	if (state.opponent.playerId === channelId) return 'opponent-hero';
	return channelId;
}

export function notifyHeroHpCredit(
	state: PokerCombatState,
	write: PokerHpWrite,
	sourceId: string,
): void {
	const actualHeal = write.transition.applied;
	if (actualHeal <= 0) return;
	CombatEventBus.emitHealResolved({
		sourceId,
		targetId: heroTargetIdForChannel(state, write.channelId),
		actualHeal,
		targetHealthBefore: write.transition.before.current,
		targetHealthAfter: write.transition.after.current,
	});
}

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
}

export type { CombatHpChannelId };

import type { Player } from '../types';
import type { PokerCombatState } from '../types/PokerCombatTypes';
import { combatHpFromPlayer } from './playerCombatHp';
import type { CombatHpAccount } from './combatHp';
import type { PokerHpSlot } from './pokerCombatHp';

export function readCardsHeroHp(player: Pick<Player, 'heroHealth' | 'health' | 'maxHealth'>): CombatHpAccount {
	const current = player.heroHealth ?? player.health ?? 0;
	const max = player.maxHealth ?? current;
	return {
		current,
		max,
		committed: 0,
	};
}

export function readViewerCombatHeroHp(
	state: PokerCombatState | null | undefined,
	slot: PokerHpSlot,
): CombatHpAccount | null {
	if (!state) return null;
	return combatHpFromPlayer(slot === 'player' ? state.player : state.opponent);
}

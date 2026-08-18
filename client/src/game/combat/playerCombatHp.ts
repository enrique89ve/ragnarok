import type { PlayerCombatState } from '../types/PokerCombatTypes';
import {
	applyCombatHpDelta,
	readCombatHp,
	setCombatHpCurrent,
	type CombatHpAccount,
	type CombatHpTransition,
} from './combatHp';

export function combatHpFromPlayer(player: PlayerCombatState): CombatHpAccount {
	return readCombatHp({
		current: player.pet.stats.currentHealth,
		max: player.pet.stats.maxHealth,
		committed: player.hpCommitted,
	});
}

export function playerWithCombatHp(
	player: PlayerCombatState,
	account: CombatHpAccount,
): PlayerCombatState {
	const next = readCombatHp(account);
	if (
		player.pet.stats.currentHealth === next.current
		&& player.pet.stats.maxHealth === next.max
		&& player.hpCommitted === next.committed
	) {
		return player;
	}
	return {
		...player,
		hpCommitted: next.committed,
		pet: {
			...player.pet,
			stats: {
				...player.pet.stats,
				currentHealth: next.current,
				maxHealth: next.max,
			},
		},
	};
}

export function applyPlayerCombatHpDelta(
	player: PlayerCombatState,
	delta: number,
): { player: PlayerCombatState; transition: CombatHpTransition } {
	const transition = applyCombatHpDelta(combatHpFromPlayer(player), delta);
	return {
		player: playerWithCombatHp(player, transition.after),
		transition,
	};
}

export function setPlayerCombatHpCurrent(
	player: PlayerCombatState,
	current: number,
): { player: PlayerCombatState; transition: CombatHpTransition } {
	const transition = setCombatHpCurrent(combatHpFromPlayer(player), current);
	return {
		player: playerWithCombatHp(player, transition.after),
		transition,
	};
}

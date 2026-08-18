import { useGameStore } from '../stores/gameStore';
import type { PokerCombatState } from '../types/PokerCombatTypes';
import { combatHpFromPlayer } from './playerCombatHp';
import { isPokerHeroHpProjectionLocked, withPokerHeroHpProjectionLock } from './hpProjectionLock';

/**
 * Cards-layer heroHealth is a projection of the poker HP channels.
 * Never the other way around.
 */
export function projectPokerHeroHpToCards(state: PokerCombatState | null): void {
	if (!state || isPokerHeroHpProjectionLocked()) return;
	const gameState = useGameStore.getState().gameState;
	if (!gameState) return;

	const playerHp = combatHpFromPlayer(state.player);
	const opponentHp = combatHpFromPlayer(state.opponent);
	const player = gameState.players.player;
	const opponent = gameState.players.opponent;
	if (
		(player.heroHealth ?? player.health) === playerHp.current
		&& player.maxHealth === playerHp.max
		&& (opponent.heroHealth ?? opponent.health) === opponentHp.current
		&& opponent.maxHealth === opponentHp.max
	) {
		return;
	}

	withPokerHeroHpProjectionLock(() => {
		useGameStore.setState({
			gameState: {
				...gameState,
				players: {
					...gameState.players,
					player: {
						...player,
						health: playerHp.current,
						heroHealth: playerHp.current,
						maxHealth: playerHp.max,
					},
					opponent: {
						...opponent,
						health: opponentHp.current,
						heroHealth: opponentHp.current,
						maxHealth: opponentHp.max,
					},
				},
			},
		});
	});
}

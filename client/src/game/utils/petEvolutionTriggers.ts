import { GameState } from '../types';

export function checkPetEvolutionTrigger(state: GameState, trigger: string, minionId?: string): GameState {
	let changed = false;
	const newPlayers: any = {};
	for (const side of ['player', 'opponent'] as const) {
		const bf = state.players[side].battlefield;
		const newBf = bf.map(minion => {
			if (minion.petEvolutionMet) return minion;
			const cond = (minion.card as any).evolutionCondition;
			if (!cond || cond.trigger !== trigger) return minion;
			if (minionId && minion.instanceId !== minionId) return minion;
			changed = true;
			return { ...minion, petEvolutionMet: true };
		});
		newPlayers[side] = newBf !== bf ? { ...state.players[side], battlefield: newBf } : state.players[side];
	}
	if (!changed) return state;
	return { ...state, players: { ...state.players, ...newPlayers } };
}

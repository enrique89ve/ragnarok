import type { GameState, Player, CardInstance } from '../types';

function redactCard(card: CardInstance): CardInstance {
	return {
		instanceId: card.instanceId,
		card: {
			id: 0,
			name: '???',
			type: 'minion',
			cost: 0,
			rarity: 'common',
			faction: 'neutral',
		},
	} as CardInstance;
}

function filterPlayer(player: Player): Player {
	return {
		...player,
		hand: player.hand.map(redactCard),
		deck: [],
		battlefield: player.battlefield,
		graveyard: player.graveyard,
		secrets: player.secrets?.map(redactCard) ?? [],
	};
}

export function filterGameStateForSpectator(state: GameState): GameState {
	return {
		...state,
		players: {
			player: filterPlayer(state.players.player),
			opponent: filterPlayer(state.players.opponent),
		},
		prophecies: (state as any).prophecies?.map((p: any) => ({ ...p, turnsRemaining: undefined })),
		mulligan: undefined,
	} as GameState;
}

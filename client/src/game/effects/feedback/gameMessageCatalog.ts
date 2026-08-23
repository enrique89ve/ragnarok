import type { GameFeedbackTone } from '../core/gameEffectTypes';

export const GAME_MESSAGE_IDS = {
	CARD_MYTHIC: 'card.mythic',
	CARD_BURNED: 'card.burned',
	BATTLECRY_TRIGGERED: 'battlecry.triggered',
	DEATHRATTLE_TRIGGERED: 'deathrattle.triggered',
	SECRET_REVEALED: 'secret.revealed',
	PLAYER_TURN: 'turn.player',
	SILENCE_APPLIED: 'silence.applied',
	OVERLOAD_TRIGGERED: 'overload.triggered',
} as const;

type GameMessageParamsById = {
	[GAME_MESSAGE_IDS.CARD_MYTHIC]: { readonly cardName: string };
	[GAME_MESSAGE_IDS.CARD_BURNED]: { readonly player: 'player' | 'opponent'; readonly cardName: string };
	[GAME_MESSAGE_IDS.BATTLECRY_TRIGGERED]: { readonly sourceName: string; readonly effectType: string };
	[GAME_MESSAGE_IDS.DEATHRATTLE_TRIGGERED]: { readonly sourceName: string };
	[GAME_MESSAGE_IDS.SECRET_REVEALED]: { readonly player: 'player' | 'opponent'; readonly cardName: string };
	[GAME_MESSAGE_IDS.PLAYER_TURN]: Record<never, never>;
	[GAME_MESSAGE_IDS.SILENCE_APPLIED]: { readonly targetName: string };
	[GAME_MESSAGE_IDS.OVERLOAD_TRIGGERED]: { readonly amount: number };
};

export type GameMessageId = keyof GameMessageParamsById;

export type GameMessageRequest = {
	[Id in GameMessageId]: {
		readonly id: Id;
		readonly params: GameMessageParamsById[Id];
	};
}[GameMessageId];

export type GameMessageView = {
	readonly text: string;
	readonly tone: GameFeedbackTone;
	readonly durationMs: number;
};

function actorLabel(player: 'player' | 'opponent'): string {
	return player === 'player' ? 'Your' : "Opponent's";
}

export function renderGameMessage(request: GameMessageRequest): GameMessageView {
	switch (request.id) {
		case GAME_MESSAGE_IDS.CARD_MYTHIC:
			return { text: `Mythic! ${request.params.cardName}`, tone: 'success', durationMs: 2000 };
		case GAME_MESSAGE_IDS.CARD_BURNED:
			return {
				text: `${actorLabel(request.params.player)} ${request.params.cardName} was burned!`,
				tone: 'warning',
				durationMs: 3000,
			};
		case GAME_MESSAGE_IDS.BATTLECRY_TRIGGERED:
			return {
				text: `${request.params.sourceName}: ${request.params.effectType}`,
				tone: 'info',
				durationMs: 2000,
			};
		case GAME_MESSAGE_IDS.DEATHRATTLE_TRIGGERED:
			return { text: `Deathrattle: ${request.params.sourceName}`, tone: 'info', durationMs: 2000 };
		case GAME_MESSAGE_IDS.SECRET_REVEALED:
			return {
				text: `${actorLabel(request.params.player)} rune: ${request.params.cardName}!`,
				tone: 'info',
				durationMs: 3000,
			};
		case GAME_MESSAGE_IDS.PLAYER_TURN:
			return { text: 'Your turn!', tone: 'success', durationMs: 1500 };
		case GAME_MESSAGE_IDS.SILENCE_APPLIED:
			return { text: `${request.params.targetName} was silenced!`, tone: 'info', durationMs: 2000 };
		case GAME_MESSAGE_IDS.OVERLOAD_TRIGGERED:
			return { text: `Overloaded: ${request.params.amount} mana`, tone: 'warning', durationMs: 2000 };
		default: {
			const exhaustive: never = request;
			return exhaustive;
		}
	}
}

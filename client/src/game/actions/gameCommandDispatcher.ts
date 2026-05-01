import type { CardData } from '../types';
import { GAME_COMMAND_TYPES, assertNeverCommand, type GameCommand, type GameTargetType, type HeroPowerTargetType } from '../core/commands';

export interface GameCommandHandlers {
	readonly playCard: (
		cardId: string,
		targetId?: string,
		targetType?: GameTargetType,
		insertionIndex?: number,
		payWithBlood?: boolean,
	) => void;
	readonly attackWithCard: (attackerId: string, defenderId?: string) => void;
	readonly endTurn: () => void;
	readonly performHeroPower: (targetId?: string, targetType?: HeroPowerTargetType) => void;
	readonly toggleMulliganCard: (cardId: string) => void;
	readonly confirmMulligan: () => void;
	readonly skipMulligan: () => void;
	readonly selectDiscoveryOption: (card: CardData | null) => void;
}

export function dispatchGameCommand(command: GameCommand, handlers: GameCommandHandlers): void {
	switch (command.type) {
		case GAME_COMMAND_TYPES.playCard:
			handlers.playCard(command.cardId, command.targetId, command.targetType, command.insertionIndex, command.payWithBlood);
			return;
		case GAME_COMMAND_TYPES.attack:
			handlers.attackWithCard(command.attackerId, command.defenderId);
			return;
		case GAME_COMMAND_TYPES.endTurn:
			handlers.endTurn();
			return;
		case GAME_COMMAND_TYPES.useHeroPower:
			handlers.performHeroPower(command.targetId, command.targetType);
			return;
		case GAME_COMMAND_TYPES.toggleMulliganCard:
			handlers.toggleMulliganCard(command.cardId);
			return;
		case GAME_COMMAND_TYPES.confirmMulligan:
			handlers.confirmMulligan();
			return;
		case GAME_COMMAND_TYPES.skipMulligan:
			handlers.skipMulligan();
			return;
		case GAME_COMMAND_TYPES.selectDiscoveryOption:
			handlers.selectDiscoveryOption(command.card);
			return;
		default:
			assertNeverCommand(command);
	}
}

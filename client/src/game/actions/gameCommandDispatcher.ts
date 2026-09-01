import type { CardData } from '../types';
import { GAME_COMMAND_TYPES, assertNeverCommand, type GameCommand, type GameTargetType, type HeroPowerTargetType, type FrontlineAttackMode } from '../core/commands';

export type GameCommandCommitCallback = () => void;

export interface GameCommandHandlers {
	readonly playCard: (
		cardId: string,
		targetId?: string,
		targetType?: GameTargetType,
		insertionIndex?: number,
		payWithBlood?: boolean,
		onCommitted?: GameCommandCommitCallback,
	) => void;
	readonly attackWithCard: (attackerId: string, defenderId?: string, onCommitted?: GameCommandCommitCallback) => void;
	readonly endTurn: (onCommitted?: GameCommandCommitCallback) => void;
	readonly performHeroPower: (targetId?: string, targetType?: HeroPowerTargetType, onCommitted?: GameCommandCommitCallback) => void;
	readonly frontlineAttack: (mode: FrontlineAttackMode, actionId: string, onCommitted?: GameCommandCommitCallback) => void;
	readonly performNorseHeroPower: (norseHeroId: string, targetId?: string, targetType?: 'minion' | 'hero', actionId?: string, onCommitted?: GameCommandCommitCallback) => void;
	readonly weaponUpgrade: (norseHeroId: string, actionId: string, onCommitted?: GameCommandCommitCallback) => void;
	readonly toggleMulliganCard: (cardId: string, onCommitted?: GameCommandCommitCallback) => void;
	readonly confirmMulligan: (onCommitted?: GameCommandCommitCallback) => void;
	readonly skipMulligan: (onCommitted?: GameCommandCommitCallback) => void;
	readonly selectDiscoveryOption: (card: CardData | null, onCommitted?: GameCommandCommitCallback) => void;
}

export function dispatchGameCommand(
	command: GameCommand,
	handlers: GameCommandHandlers,
	onCommitted?: GameCommandCommitCallback,
): void {
	switch (command.type) {
		case GAME_COMMAND_TYPES.playCard:
			if (onCommitted) handlers.playCard(command.cardId, command.targetId, command.targetType, command.insertionIndex, command.payWithBlood, onCommitted);
			else handlers.playCard(command.cardId, command.targetId, command.targetType, command.insertionIndex, command.payWithBlood);
			return;
		case GAME_COMMAND_TYPES.attack:
			if (onCommitted) handlers.attackWithCard(command.attackerId, command.defenderId, onCommitted);
			else handlers.attackWithCard(command.attackerId, command.defenderId);
			return;
		case GAME_COMMAND_TYPES.endTurn:
			if (onCommitted) handlers.endTurn(onCommitted);
			else handlers.endTurn();
			return;
		case GAME_COMMAND_TYPES.useHeroPower:
			if (onCommitted) handlers.performHeroPower(command.targetId, command.targetType, onCommitted);
			else handlers.performHeroPower(command.targetId, command.targetType);
			return;
		case GAME_COMMAND_TYPES.frontlineAttack:
			if (onCommitted) handlers.frontlineAttack(command.mode, command.actionId, onCommitted);
			else handlers.frontlineAttack(command.mode, command.actionId);
			return;
		case GAME_COMMAND_TYPES.norseHeroPower:
			if (onCommitted) handlers.performNorseHeroPower(command.norseHeroId, command.targetId, command.targetType, command.actionId, onCommitted);
			else handlers.performNorseHeroPower(command.norseHeroId, command.targetId, command.targetType, command.actionId);
			return;
		case GAME_COMMAND_TYPES.weaponUpgrade:
			if (onCommitted) handlers.weaponUpgrade(command.norseHeroId, command.actionId, onCommitted);
			else handlers.weaponUpgrade(command.norseHeroId, command.actionId);
			return;
		case GAME_COMMAND_TYPES.toggleMulliganCard:
			if (onCommitted) handlers.toggleMulliganCard(command.cardId, onCommitted);
			else handlers.toggleMulliganCard(command.cardId);
			return;
		case GAME_COMMAND_TYPES.confirmMulligan:
			if (onCommitted) handlers.confirmMulligan(onCommitted);
			else handlers.confirmMulligan();
			return;
		case GAME_COMMAND_TYPES.skipMulligan:
			if (onCommitted) handlers.skipMulligan(onCommitted);
			else handlers.skipMulligan();
			return;
		case GAME_COMMAND_TYPES.selectDiscoveryOption:
			if (onCommitted) handlers.selectDiscoveryOption(command.card, onCommitted);
			else handlers.selectDiscoveryOption(command.card);
			return;
		default:
			assertNeverCommand(command);
	}
}

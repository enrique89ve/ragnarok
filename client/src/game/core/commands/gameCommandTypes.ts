import type { CardData } from '../../types';
import {
	POKER_AUXILIARY_ACTION_TYPES,
	type FrontlineAttackIntent,
	type FrontlineAttackMode,
	type NorseHeroPowerIntent,
	type PokerAuxiliaryAction,
	type WeaponUpgradeIntent,
} from '../../../../../shared/p2p-wire/pokerAuxiliary';

export const GAME_COMMAND_TYPES = {
	playCard: 'play_card',
	attack: 'attack',
	endTurn: 'end_turn',
	useHeroPower: 'use_hero_power',
	toggleMulliganCard: 'toggle_mulligan_card',
	confirmMulligan: 'confirm_mulligan',
	skipMulligan: 'skip_mulligan',
	selectDiscoveryOption: 'select_discovery_option',
	frontlineAttack: POKER_AUXILIARY_ACTION_TYPES.frontlineAttack,
	norseHeroPower: POKER_AUXILIARY_ACTION_TYPES.norseHeroPower,
	weaponUpgrade: POKER_AUXILIARY_ACTION_TYPES.weaponUpgrade,
} as const;

export type GameCommandType = typeof GAME_COMMAND_TYPES[keyof typeof GAME_COMMAND_TYPES];

export type GameTargetType = 'minion' | 'hero';
export type HeroPowerTargetType = 'card' | 'hero';

export type PlayCardCommand = {
	readonly type: typeof GAME_COMMAND_TYPES.playCard;
	readonly cardId: string;
	readonly targetId?: string;
	readonly targetType?: GameTargetType;
	readonly insertionIndex?: number;
	readonly payWithBlood?: boolean;
};

export type AttackCommand = {
	readonly type: typeof GAME_COMMAND_TYPES.attack;
	readonly attackerId: string;
	readonly defenderId?: string;
};

export type EndTurnCommand = {
	readonly type: typeof GAME_COMMAND_TYPES.endTurn;
};

export type UseHeroPowerCommand = {
	readonly type: typeof GAME_COMMAND_TYPES.useHeroPower;
	readonly targetId?: string;
	readonly targetType?: HeroPowerTargetType;
};

export type ToggleMulliganCardCommand = {
	readonly type: typeof GAME_COMMAND_TYPES.toggleMulliganCard;
	readonly cardId: string;
};

export type ConfirmMulliganCommand = {
	readonly type: typeof GAME_COMMAND_TYPES.confirmMulligan;
};

export type SkipMulliganCommand = {
	readonly type: typeof GAME_COMMAND_TYPES.skipMulligan;
};

export type SelectDiscoveryOptionCommand = {
	readonly type: typeof GAME_COMMAND_TYPES.selectDiscoveryOption;
	readonly card: CardData | null;
};

export type FrontlineAttackCommand = FrontlineAttackIntent;
export type NorseHeroPowerCommand = NorseHeroPowerIntent;
export type WeaponUpgradeCommand = WeaponUpgradeIntent;
export type { FrontlineAttackMode, PokerAuxiliaryAction };

export type GameCommand =
	| PlayCardCommand
	| AttackCommand
	| EndTurnCommand
	| UseHeroPowerCommand
	| ToggleMulliganCardCommand
	| ConfirmMulliganCommand
	| SkipMulliganCommand
	| SelectDiscoveryOptionCommand
	| FrontlineAttackCommand
	| NorseHeroPowerCommand
	| WeaponUpgradeCommand;

export function assertNeverCommand(command: never): never {
	throw new Error(`Unhandled game command: ${JSON.stringify(command)}`);
}

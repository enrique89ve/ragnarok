/**
 * Semantic auxiliary actions that live inside one universal Poker turn.
 *
 * These intents are deliberately small: the sender identifies the action and
 * its target, while both peers resolve the same command against their local
 * canonical state. None of them advances the Poker turn or changes its clock.
 */

export const POKER_AUXILIARY_ACTION_TYPES = {
	frontlineAttack: 'frontline_attack',
	norseHeroPower: 'norse_hero_power',
	weaponUpgrade: 'weapon_upgrade',
} as const;

export type PokerAuxiliaryActionType =
	typeof POKER_AUXILIARY_ACTION_TYPES[keyof typeof POKER_AUXILIARY_ACTION_TYPES];

export type PokerAuxiliaryTargetType = 'minion' | 'hero';
export type FrontlineAttackMode = 'minion' | 'hero';

export type FrontlineAttackIntent = Readonly<{
	type: typeof POKER_AUXILIARY_ACTION_TYPES.frontlineAttack;
	mode: FrontlineAttackMode;
	actionId: string;
}>;

export type NorseHeroPowerIntent = Readonly<{
	type: typeof POKER_AUXILIARY_ACTION_TYPES.norseHeroPower;
	norseHeroId: string;
	targetId?: string;
	targetType?: PokerAuxiliaryTargetType;
	actionId: string;
}>;

export type WeaponUpgradeIntent = Readonly<{
	type: typeof POKER_AUXILIARY_ACTION_TYPES.weaponUpgrade;
	norseHeroId: string;
	actionId: string;
}>;

export type PokerAuxiliaryAction =
	| FrontlineAttackIntent
	| NorseHeroPowerIntent
	| WeaponUpgradeIntent;

export function isPokerAuxiliaryAction(value: unknown): value is PokerAuxiliaryAction {
	if (!value || typeof value !== 'object') return false;
	const action = value as Record<string, unknown>;
	if (typeof action.actionId !== 'string' || action.actionId.length === 0) return false;
	switch (action.type) {
		case POKER_AUXILIARY_ACTION_TYPES.frontlineAttack:
			return action.mode === 'minion' || action.mode === 'hero';
		case POKER_AUXILIARY_ACTION_TYPES.norseHeroPower:
			return typeof action.norseHeroId === 'string'
				&& (action.targetType === undefined || action.targetType === 'minion' || action.targetType === 'hero')
				&& (action.targetId === undefined || typeof action.targetId === 'string');
		case POKER_AUXILIARY_ACTION_TYPES.weaponUpgrade:
			return typeof action.norseHeroId === 'string';
		default:
			return false;
	}
}

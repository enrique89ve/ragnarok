import { CombatAction } from '../../types/PokerCombatTypes';

export type PokerActionGlyph = 'single_sword' | 'crossed_swords' | 'shield' | 'helm' | 'frontline';

export type PokerActionDefinition = {
	readonly action: CombatAction;
	readonly label: string;
	readonly buttonLabel: string;
	readonly pokerLabel: string;
	readonly glyph: PokerActionGlyph;
	readonly color: string;
	readonly sound: 'sword_clash' | 'attack_prepare' | 'combat_brace';
	readonly showForPlayer: boolean;
};

export const POKER_ACTION_CATALOG = {
	[CombatAction.ATTACK]: {
		action: CombatAction.ATTACK,
		label: 'Attack',
		buttonLabel: 'Attack',
		pokerLabel: 'Bet',
		glyph: 'single_sword',
		color: 'var(--gold-300)',
		sound: 'sword_clash',
		showForPlayer: true,
	},
	[CombatAction.COUNTER_ATTACK]: {
		action: CombatAction.COUNTER_ATTACK,
		label: 'Counter Attack',
		buttonLabel: 'Counter',
		pokerLabel: 'Raise',
		glyph: 'crossed_swords',
		color: 'var(--ember-300)',
		sound: 'sword_clash',
		showForPlayer: true,
	},
	[CombatAction.ENGAGE]: {
		action: CombatAction.ENGAGE,
		label: 'Engage',
		buttonLabel: 'Engage',
		pokerLabel: 'Call',
		glyph: 'crossed_swords',
		color: 'var(--rarity-rare-color)',
		sound: 'attack_prepare',
		showForPlayer: false,
	},
	[CombatAction.DEFEND]: {
		action: CombatAction.DEFEND,
		label: 'Defend',
		buttonLabel: 'Defend',
		pokerLabel: 'Check',
		glyph: 'helm',
		color: 'var(--success-500)',
		sound: 'combat_brace',
		showForPlayer: false,
	},
	[CombatAction.BRACE]: {
		action: CombatAction.BRACE,
		label: 'Brace',
		buttonLabel: 'Brace',
		pokerLabel: 'Fold',
		glyph: 'shield',
		color: 'var(--rarity-common-color)',
		sound: 'combat_brace',
		showForPlayer: true,
	},
} as const satisfies Record<CombatAction, PokerActionDefinition>;

export const FRONTLINE_CONTROL_DEFINITION = {
	buttonLabel: 'Frontline',
	glyph: 'frontline',
} as const satisfies Pick<PokerActionDefinition, 'buttonLabel' | 'glyph'>;

export function getPokerActionDefinition(action: CombatAction): PokerActionDefinition {
	return POKER_ACTION_CATALOG[action];
}

export function isCombatAction(value: string): value is CombatAction {
	return value === CombatAction.ATTACK
		|| value === CombatAction.COUNTER_ATTACK
		|| value === CombatAction.ENGAGE
		|| value === CombatAction.DEFEND
		|| value === CombatAction.BRACE;
}

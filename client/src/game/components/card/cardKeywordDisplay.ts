export type CardKeywordDisplay = {
	label: string;
	compactLabel: string;
	description: string;
};

const KEYWORD_DISPLAY = {
	battlecry: {
		label: 'Battlecry',
		compactLabel: 'B.CRY',
		description: 'Triggers when the card is played from hand.',
	},
	deathrattle: {
		label: 'Deathrattle',
		compactLabel: 'D.RTL',
		description: 'Triggers when this card dies.',
	},
	taunt: {
		label: 'Taunt',
		compactLabel: 'TAUNT',
		description: 'Enemies must target this before other valid targets.',
	},
	divine_shield: {
		label: 'Divine Shield',
		compactLabel: 'SHLD',
		description: 'Prevents the next damage this card would take.',
	},
	rush: {
		label: 'Rush',
		compactLabel: 'RUSH',
		description: 'Can attack minions the turn it is played.',
	},
	charge: {
		label: 'Charge',
		compactLabel: 'CHRG',
		description: 'Can attack immediately.',
	},
	lifesteal: {
		label: 'Lifesteal',
		compactLabel: 'LIFE',
		description: 'Damage dealt by this card restores health.',
	},
	windfury: {
		label: 'Windfury',
		compactLabel: 'WIND',
		description: 'Can attack twice each turn.',
	},
	stealth: {
		label: 'Stealth',
		compactLabel: 'STLH',
		description: 'Cannot be targeted until it attacks or is revealed.',
	},
	discover: {
		label: 'Discover',
		compactLabel: 'DISC',
		description: 'Choose one card from a generated set of options.',
	},
	inspire: {
		label: 'Inspire',
		compactLabel: 'INSP',
		description: 'Triggers when the hero power is used.',
	},
	secret: {
		label: 'Secret',
		compactLabel: 'SECR',
		description: 'Hidden effect that triggers from a future condition.',
	},
	quest: {
		label: 'Quest',
		compactLabel: 'QST',
		description: 'Progress objective that grants a reward.',
	},
	poker_spell: {
		label: 'Poker Spell',
		compactLabel: 'P.SPL',
		description: 'Poker-combat spell effect.',
	},
	echo: {
		label: 'Echo',
		compactLabel: 'ECHO',
		description: 'Can be played repeatedly while the echo copy remains available.',
	},
	overkill: {
		label: 'Overkill',
		compactLabel: 'OVRK',
		description: 'Triggers when damage exceeds the target health.',
	},
	colossal: {
		label: 'Colossal',
		compactLabel: 'COLS',
		description: 'Summons extra appendage or companion units.',
	},
	frenzy: {
		label: 'Frenzy',
		compactLabel: 'FRNZ',
		description: 'Triggers the first time this survives damage.',
	},
	reborn: {
		label: 'Reborn',
		compactLabel: 'RBRN',
		description: 'Returns once with 1 health after dying.',
	},
	spell_damage: {
		label: 'Spell Damage',
		compactLabel: 'S.DMG',
		description: 'Increases spell damage.',
	},
	elusive: {
		label: 'Elusive',
		compactLabel: 'ELSV',
		description: 'Cannot be targeted by enemy spells or hero powers.',
	},
} satisfies Record<string, CardKeywordDisplay>;

const toTitleCase = (value: string): string =>
	value
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (letter) => letter.toUpperCase());

const hasKeywordDisplay = (keyword: string): keyword is keyof typeof KEYWORD_DISPLAY =>
	Object.prototype.hasOwnProperty.call(KEYWORD_DISPLAY, keyword);

export const formatCardKeywordLabel = (keyword: string): string =>
	hasKeywordDisplay(keyword) ? KEYWORD_DISPLAY[keyword].label : toTitleCase(keyword);

export const formatCardKeywordCompactLabel = (keyword: string): string =>
	hasKeywordDisplay(keyword)
		? KEYWORD_DISPLAY[keyword].compactLabel
		: keyword.replace(/_/g, ' ').slice(0, 4).toUpperCase();

export const getCardKeywordTooltipText = (keyword: string): string => {
	if (!hasKeywordDisplay(keyword)) return formatCardKeywordLabel(keyword);
	const display = KEYWORD_DISPLAY[keyword];
	return `${display.label}: ${display.description}`;
};

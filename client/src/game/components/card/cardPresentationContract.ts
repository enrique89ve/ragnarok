import type { CardLayoutSlotId } from './cardLayoutDraft';

export const CARD_PRESENTATION_CONTRACT_SCHEMA = 'norse-card-presentation-contract/v1';

export const CARD_PRESENTATION_SURFACES = [
	'collection',
	'pregame',
	'gameplay',
] as const;

export type CardPresentationSurface = typeof CARD_PRESENTATION_SURFACES[number];

export const CARD_RENDER_IMPORTANCE = [
	'decisive',
	'important',
	'contextual',
	'filter-only',
	'metadata',
	'hidden',
] as const;

export type CardRenderImportance = typeof CARD_RENDER_IMPORTANCE[number];

export type CardElementFunction =
	| 'identity'
	| 'recognition'
	| 'resource-cost'
	| 'combat-stat'
	| 'rules-text'
	| 'rules-signal'
	| 'deck-filter'
	| 'synergy-filter'
	| 'ownership'
	| 'economy'
	| 'visual-chrome';

export type CardElementSurfaceContract = {
	readonly render: CardRenderImportance;
	readonly purpose: readonly CardElementFunction[];
	readonly rationale: string;
};

export type CardElementContract = {
	readonly id: CardLayoutSlotId;
	readonly label: string;
	readonly source: 'registry' | 'instance' | 'derived' | 'layout';
	readonly owner: 'card-registry' | 'runtime-instance' | 'card-frame';
	readonly surfaces: Record<CardPresentationSurface, CardElementSurfaceContract>;
};

export type CardKeywordFunction =
	| 'filter'
	| 'trigger'
	| 'static-combat-rule'
	| 'targeting-rule'
	| 'state-rule'
	| 'resource-rule'
	| 'choice-rule'
	| 'progression-rule'
	| 'summon-rule'
	| 'card-generation'
	| 'deck-construction'
	| 'poker-rule'
	| 'theme-marker';

export type CardKeywordSemantics = {
	readonly keyword: string;
	readonly label: string;
	readonly compactLabel: string;
	readonly description: string;
	readonly functions: readonly CardKeywordFunction[];
	readonly filterable: boolean;
	readonly collection: CardRenderImportance;
	readonly pregame: CardRenderImportance;
	readonly gameplay: CardRenderImportance;
};

type KeywordDefinitionInput = Omit<CardKeywordSemantics, 'keyword'>;

const surfaceContract = (
	render: CardRenderImportance,
	purpose: readonly CardElementFunction[],
	rationale: string,
): CardElementSurfaceContract => ({ render, purpose, rationale });

export const CARD_ELEMENT_CONTRACTS = {
	art: {
		id: 'art',
		label: 'Art',
		source: 'registry',
		owner: 'card-frame',
		surfaces: {
			collection: surfaceContract('decisive', ['recognition', 'visual-chrome'], 'Primary scan target in collection and deck browsing.'),
			pregame: surfaceContract('decisive', ['recognition'], 'Fast recognition during deck choice and mulligan.'),
			gameplay: surfaceContract('important', ['recognition'], 'Board recognition, but combat numbers and rules state outrank it.'),
		},
	},
	mana: {
		id: 'mana',
		label: 'Mana',
		source: 'registry',
		owner: 'card-registry',
		surfaces: {
			collection: surfaceContract('important', ['resource-cost', 'deck-filter'], 'Supports curve filtering and cost comparison.'),
			pregame: surfaceContract('decisive', ['resource-cost'], 'Mulligan decisions depend on early curve.'),
			gameplay: surfaceContract('decisive', ['resource-cost'], 'Determines whether the card can be played now.'),
		},
	},
	name: {
		id: 'name',
		label: 'Name',
		source: 'registry',
		owner: 'card-registry',
		surfaces: {
			collection: surfaceContract('decisive', ['identity', 'deck-filter'], 'Search, recognition, and ownership inspection need the exact card identity.'),
			pregame: surfaceContract('decisive', ['identity'], 'Players must recognize the card before committing to a keep or swap.'),
			gameplay: surfaceContract('important', ['identity'], 'Needed for readable board state and hover/target confirmations.'),
		},
	},
	keywords: {
		id: 'keywords',
		label: 'Keywords',
		source: 'registry',
		owner: 'card-registry',
		surfaces: {
			collection: surfaceContract('important', ['deck-filter', 'rules-signal'], 'Keywords are searchable deckbuilding facets and short rules summaries.'),
			pregame: surfaceContract('important', ['rules-signal'], 'Opening decisions care about timing keywords such as Battlecry, Secret, Quest, and Rush.'),
			gameplay: surfaceContract('contextual', ['rules-signal'], 'Only gameplay-relevant keywords should occupy board space.'),
		},
	},
	description: {
		id: 'description',
		label: 'Description',
		source: 'registry',
		owner: 'card-registry',
		surfaces: {
			collection: surfaceContract('important', ['rules-text'], 'Full rules text belongs in inspection and collection detail.'),
			pregame: surfaceContract('contextual', ['rules-text'], 'Useful in enlarged mulligan/detail views, too noisy for compact card rows.'),
			gameplay: surfaceContract('hidden', ['rules-text'], 'Board cards need compact state; detailed text belongs in hover/detail surfaces.'),
		},
	},
	tribe: {
		id: 'tribe',
		label: 'Tribe',
		source: 'registry',
		owner: 'card-registry',
		surfaces: {
			collection: surfaceContract('important', ['synergy-filter', 'deck-filter'], 'Tribe drives deckbuilding and discover pools.'),
			pregame: surfaceContract('contextual', ['synergy-filter'], 'Relevant when the current deck plan depends on tribes.'),
			gameplay: surfaceContract('metadata', ['synergy-filter'], 'Usually inferred from effects; compact board slots should hide it unless a synergy is active.'),
		},
	},
	attack: {
		id: 'attack',
		label: 'Attack',
		source: 'instance',
		owner: 'runtime-instance',
		surfaces: {
			collection: surfaceContract('important', ['combat-stat', 'deck-filter'], 'Base attack helps compare threats.'),
			pregame: surfaceContract('important', ['combat-stat'], 'Mulligan and curve planning need early board pressure.'),
			gameplay: surfaceContract('decisive', ['combat-stat'], 'Combat resolution and target choices depend on current attack.'),
		},
	},
	health: {
		id: 'health',
		label: 'Health',
		source: 'instance',
		owner: 'runtime-instance',
		surfaces: {
			collection: surfaceContract('important', ['combat-stat', 'deck-filter'], 'Base health helps compare survivability.'),
			pregame: surfaceContract('important', ['combat-stat'], 'Mulligan and early trades depend on durability.'),
			gameplay: surfaceContract('decisive', ['combat-stat'], 'Combat survival and lethal math depend on current health.'),
		},
	},
	rarity: {
		id: 'rarity',
		label: 'Rarity',
		source: 'registry',
		owner: 'card-registry',
		surfaces: {
			collection: surfaceContract('important', ['economy', 'deck-filter', 'visual-chrome'], 'Rarity affects inventory reading, pack value, and visual hierarchy.'),
			pregame: surfaceContract('metadata', ['economy', 'visual-chrome'], 'Rarity can remain as chrome but should not compete with play decisions.'),
			gameplay: surfaceContract('metadata', ['visual-chrome'], 'Rarity is ornamental during combat except for premium readability.'),
		},
	},
	badge: {
		id: 'badge',
		label: 'Element badge',
		source: 'registry',
		owner: 'card-registry',
		surfaces: {
			collection: surfaceContract('important', ['synergy-filter', 'visual-chrome'], 'Element supports filtering and card identity.'),
			pregame: surfaceContract('important', ['synergy-filter'], 'Element can affect hero/pet synergy before the match.'),
			gameplay: surfaceContract('decisive', ['combat-stat', 'rules-signal'], 'Elemental advantage can change combat stats, armor, and target priority.'),
		},
	},
	count: {
		id: 'count',
		label: 'Collection count',
		source: 'derived',
		owner: 'runtime-instance',
		surfaces: {
			collection: surfaceContract('important', ['ownership', 'deck-filter'], 'Collection and deckbuilding need owned-copy count.'),
			pregame: surfaceContract('hidden', ['ownership'], 'A verified deck slot has already resolved availability.'),
			gameplay: surfaceContract('hidden', ['ownership'], 'Combat state must not depend on collection count.'),
		},
	},
	bloodPrice: {
		id: 'bloodPrice',
		label: 'Blood Price',
		source: 'registry',
		owner: 'card-registry',
		surfaces: {
			collection: surfaceContract('important', ['resource-cost', 'deck-filter'], 'Alternate health cost must be visible when building or inspecting.'),
			pregame: surfaceContract('decisive', ['resource-cost'], 'Mulligan keep/swap depends on whether the card can be paid with HP.'),
			gameplay: surfaceContract('decisive', ['resource-cost'], 'Players need the blood cost before committing a play.'),
		},
	},
	evolution: {
		id: 'evolution',
		label: 'Evolution',
		source: 'registry',
		owner: 'card-registry',
		surfaces: {
			collection: surfaceContract('important', ['identity', 'visual-chrome'], 'Pet stage and evolution identity belong on collection tiles.'),
			pregame: surfaceContract('important', ['identity'], 'Stage I/II/III changes what the card becomes after play.'),
			gameplay: surfaceContract('hidden', ['identity'], 'Board slots keep combat state; evolution stays on hand, mulligan, and collection.'),
		},
	},
} satisfies Record<CardLayoutSlotId, CardElementContract>;

const defineKeyword = (
	keyword: string,
	definition: KeywordDefinitionInput,
): CardKeywordSemantics => ({ keyword, ...definition });

const keyword = (
	label: string,
	compactLabel: string,
	description: string,
	functions: readonly CardKeywordFunction[],
	visual: Pick<CardKeywordSemantics, 'collection' | 'pregame' | 'gameplay'>,
	filterable = true,
): KeywordDefinitionInput => ({
	label,
	compactLabel,
	description,
	functions,
	filterable,
	...visual,
});

const decisiveBoard = { collection: 'important', pregame: 'important', gameplay: 'decisive' } as const;
const importantBoard = { collection: 'important', pregame: 'important', gameplay: 'important' } as const;
const contextualBoard = { collection: 'important', pregame: 'contextual', gameplay: 'contextual' } as const;
const filterOnly = { collection: 'filter-only', pregame: 'metadata', gameplay: 'hidden' } as const;
const setupOnly = { collection: 'important', pregame: 'important', gameplay: 'hidden' } as const;

export const CARD_KEYWORD_SEMANTICS = {
	adapt: defineKeyword('adapt', keyword('Adapt', 'ADPT', 'Choose one of several bonuses for this minion.', ['choice-rule'], contextualBoard)),
	adapt_option: defineKeyword('adapt_option', keyword('Adapt Option', 'ADPT', 'Internal option generated by Adapt.', ['choice-rule'], filterOnly)),
	artifact: defineKeyword('artifact', keyword('Artifact', 'ARTF', 'Artifact classification used for equipment-style cards.', ['filter', 'theme-marker'], filterOnly)),
	aura: defineKeyword('aura', keyword('Aura', 'AURA', 'Persistent effect while this card remains active.', ['static-combat-rule'], importantBoard)),
	battlecry: defineKeyword('battlecry', keyword('Battlecry', 'B.CRY', 'Triggers when the card is played from hand.', ['trigger'], setupOnly)),
	blood_echo: defineKeyword('blood_echo', keyword('Blood Echo', 'ECHO', 'Repeats or amplifies effects through health payment.', ['resource-rule', 'trigger'], contextualBoard)),
	blood_price: defineKeyword('blood_price', keyword('Blood Price', 'BLOD', 'Can be played by paying health instead of mana.', ['resource-rule'], importantBoard)),
	cant_attack: defineKeyword('cant_attack', keyword('Cannot Attack', 'NOAT', 'This minion cannot attack while the restriction is active.', ['state-rule'], decisiveBoard)),
	charge: defineKeyword('charge', keyword('Charge', 'CHRG', 'Can attack immediately.', ['static-combat-rule'], decisiveBoard)),
	choose_one: defineKeyword('choose_one', keyword('Choose One', 'CHSE', 'Pick one of multiple effects when played.', ['choice-rule'], setupOnly)),
	cleave: defineKeyword('cleave', keyword('Cleave', 'CLVE', 'Also damages adjacent minions when attacking.', ['static-combat-rule'], decisiveBoard)),
	colossal: defineKeyword('colossal', keyword('Colossal', 'COLS', 'Summons extra appendage or companion units.', ['summon-rule'], setupOnly)),
	combo: defineKeyword('combo', keyword('Combo', 'CMBO', 'Bonus effect if another card was played first this turn.', ['trigger'], setupOnly)),
	corrupt: defineKeyword('corrupt', keyword('Corrupt', 'CRPT', 'Upgrades in hand after a higher-cost card is played.', ['progression-rule'], setupOnly)),
	deathrattle: defineKeyword('deathrattle', keyword('Deathrattle', 'D.RTL', 'Triggers when this card dies.', ['trigger'], importantBoard)),
	discover: defineKeyword('discover', keyword('Discover', 'DISC', 'Choose one card from generated options.', ['card-generation', 'choice-rule'], setupOnly)),
	divine_shield: defineKeyword('divine_shield', keyword('Divine Shield', 'SHLD', 'Prevents the next damage this card would take.', ['static-combat-rule'], decisiveBoard)),
	dormant: defineKeyword('dormant', keyword('Dormant', 'DRMT', 'Temporarily inactive before awakening.', ['state-rule'], decisiveBoard)),
	dual_class: defineKeyword('dual_class', keyword('Dual Class', 'DUAL', 'Deckbuilding/class metadata for multi-class cards.', ['deck-construction', 'filter'], filterOnly)),
	echo: defineKeyword('echo', keyword('Echo', 'ECHO', 'Can be played repeatedly while the temporary copy remains available.', ['resource-rule'], setupOnly)),
	einherjar: defineKeyword('einherjar', keyword('Einherjar', 'EINH', 'Returns through a limited death-loop style effect.', ['progression-rule', 'trigger'], importantBoard)),
	elusive: defineKeyword('elusive', keyword('Elusive', 'ELSV', 'Cannot be targeted by enemy spells or hero powers.', ['targeting-rule'], decisiveBoard)),
	enrage: defineKeyword('enrage', keyword('Enrage', 'ENRG', 'Gains a bonus while damaged.', ['state-rule'], importantBoard)),
	fateweave: defineKeyword('fateweave', keyword('Fateweave', 'FATE', 'Manipulates or prepares future draws/effects.', ['card-generation'], setupOnly)),
	flying: defineKeyword('flying', keyword('Flying', 'FLY', 'Can bypass some ground-target restrictions.', ['targeting-rule'], decisiveBoard)),
	freeze: defineKeyword('freeze', keyword('Freeze', 'FRZE', 'Applies frozen state to a target.', ['state-rule'], setupOnly)),
	freeze_on_damage: defineKeyword('freeze_on_damage', keyword('Freeze on Damage', 'FRZD', 'Freezes targets damaged by this card.', ['static-combat-rule', 'state-rule'], decisiveBoard)),
	frenzy: defineKeyword('frenzy', keyword('Frenzy', 'FRNZ', 'Triggers the first time this survives damage.', ['trigger'], importantBoard)),
	frozen: defineKeyword('frozen', keyword('Frozen', 'FRZN', 'Cannot attack while frozen.', ['state-rule'], decisiveBoard)),
	immune: defineKeyword('immune', keyword('Immune', 'IMMN', 'Cannot be damaged or targeted by normal hostile effects.', ['targeting-rule', 'state-rule'], decisiveBoard)),
	inspire: defineKeyword('inspire', keyword('Inspire', 'INSP', 'Triggers when the hero power is used.', ['trigger'], contextualBoard)),
	lifesteal: defineKeyword('lifesteal', keyword('Lifesteal', 'LIFE', 'Damage dealt by this card restores health.', ['static-combat-rule'], decisiveBoard)),
	magnetic: defineKeyword('magnetic', keyword('Runic Bond', 'BOND', 'Can attach to a friendly Automaton to combine stats and abilities.', ['static-combat-rule', 'summon-rule'], setupOnly)),
	mega_windfury: defineKeyword('mega_windfury', keyword('Mega-Windfury', 'M.WF', 'Can attack four times each turn.', ['static-combat-rule'], decisiveBoard)),
	outcast: defineKeyword('outcast', keyword('Outcast', 'OUT', 'Bonus effect if played from the hand edge.', ['trigger'], setupOnly)),
	overkill: defineKeyword('overkill', keyword('Overkill', 'OVRK', 'Triggers when damage exceeds lethal damage.', ['trigger'], importantBoard)),
	overload: defineKeyword('overload', keyword('Overload', 'OVLD', 'Locks future mana as an additional cost.', ['resource-rule'], setupOnly)),
	poker_spell: defineKeyword('poker_spell', keyword('Poker Spell', 'P.SPL', 'Spell effect resolved through poker-combat rules.', ['poker-rule'], setupOnly)),
	poisonous: defineKeyword('poisonous', keyword('Poisonous', 'PSN', 'Destroys minions damaged by this card.', ['static-combat-rule'], decisiveBoard)),
	prophecy: defineKeyword('prophecy', keyword('Prophecy', 'PROP', 'Creates a visible countdown before its effect resolves.', ['progression-rule', 'trigger'], importantBoard)),
	quest: defineKeyword('quest', keyword('Quest', 'QST', 'Starts a progress objective that grants a reward.', ['progression-rule'], setupOnly)),
	reborn: defineKeyword('reborn', keyword('Reborn', 'RBRN', 'Returns once with 1 health after dying.', ['static-combat-rule', 'trigger'], decisiveBoard)),
	recruit: defineKeyword('recruit', keyword('Recruit', 'RCUT', 'Summons a minion from the deck.', ['summon-rule'], setupOnly)),
	rush: defineKeyword('rush', keyword('Rush', 'RUSH', 'Can attack minions the turn it is played.', ['static-combat-rule', 'targeting-rule'], decisiveBoard)),
	secret: defineKeyword('secret', keyword('Rune', 'RUNE', 'Hidden effect that triggers from a future condition.', ['trigger'], setupOnly)),
	sidequest: defineKeyword('sidequest', keyword('Sidequest', 'SIDE', 'Secondary progress objective that grants a reward.', ['progression-rule'], setupOnly)),
	spell_damage: defineKeyword('spell_damage', keyword('Spell Damage', 'S.DMG', 'Increases spell damage.', ['static-combat-rule'], importantBoard)),
	spell_trigger: defineKeyword('spell_trigger', keyword('Spell Trigger', 'S.TRG', 'Triggers from spell casts or spell resolution.', ['trigger'], contextualBoard)),
	spellburst: defineKeyword('spellburst', keyword('Spellburst', 'S.BST', 'Triggers once after a spell is cast.', ['trigger'], importantBoard)),
	spellDamage: defineKeyword('spellDamage', keyword('Spell Damage', 'S.DMG', 'Legacy alias for Spell Damage.', ['static-combat-rule'], importantBoard)),
	stealth: defineKeyword('stealth', keyword('Stealth', 'STLH', 'Cannot be targeted until it attacks or is revealed.', ['targeting-rule', 'state-rule'], decisiveBoard)),
	taunt: defineKeyword('taunt', keyword('Taunt', 'TAUNT', 'Enemies must target this before other valid targets.', ['targeting-rule', 'static-combat-rule'], decisiveBoard)),
	tradeable: defineKeyword('tradeable', keyword('Tradeable', 'TRAD', 'Can be cycled for a replacement draw.', ['resource-rule', 'card-generation'], setupOnly)),
	wager: defineKeyword('wager', keyword('Wager', 'WAGR', 'Effect activates during poker combat.', ['poker-rule', 'trigger'], importantBoard)),
	windfury: defineKeyword('windfury', keyword('Windfury', 'WIND', 'Can attack twice each turn.', ['static-combat-rule'], decisiveBoard)),
	yggdrasil_golem: defineKeyword('yggdrasil_golem', keyword('Yggdrasil Golem', 'YGDR', 'Summons or scales an Yggdrasil Golem counter.', ['summon-rule', 'progression-rule'], setupOnly)),
	silence: defineKeyword('silence', keyword('Silence', 'SLNC', 'Removes card text and enchantments.', ['state-rule'], setupOnly)),
	pet_evolution: defineKeyword('pet_evolution', keyword('Pet Evolution', 'EVOL', 'Transforms through pet evolution stages.', ['progression-rule'], setupOnly)),
	master_evolution: defineKeyword('master_evolution', keyword('Master Evolution', 'MSTR', 'Final pet evolution stage.', ['progression-rule'], setupOnly)),
	submerge: defineKeyword('submerge', keyword('Submerge', 'SUBM', 'Enters play face-down and untargetable before surfacing.', ['state-rule', 'targeting-rule'], decisiveBoard)),
	coil: defineKeyword('coil', keyword('Coil', 'COIL', 'Locks an enemy minion attack value while this minion lives.', ['state-rule'], decisiveBoard)),
} satisfies Record<string, CardKeywordSemantics>;

const CARD_KEYWORD_SEMANTICS_LOOKUP: Readonly<Record<string, CardKeywordSemantics>> = CARD_KEYWORD_SEMANTICS;

const titleCase = (value: string): string =>
	value
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (letter) => letter.toUpperCase());

const fallbackKeywordSemantics = (keywordValue: string): CardKeywordSemantics => ({
	keyword: keywordValue,
	label: titleCase(keywordValue),
	compactLabel: keywordValue.replace(/_/g, ' ').slice(0, 4).toUpperCase(),
	description: 'Unclassified keyword. Treat as searchable metadata until a gameplay contract is added.',
	functions: ['filter'],
	filterable: true,
	collection: 'filter-only',
	pregame: 'metadata',
	gameplay: 'hidden',
});

const RENDERED_IMPORTANCE_BY_SURFACE = {
	collection: new Set<CardRenderImportance>(['decisive', 'important', 'contextual', 'filter-only']),
	pregame: new Set<CardRenderImportance>(['decisive', 'important', 'contextual']),
	gameplay: new Set<CardRenderImportance>(['decisive', 'important', 'contextual']),
} satisfies Record<CardPresentationSurface, ReadonlySet<CardRenderImportance>>;

const IMPORTANCE_RANK = {
	decisive: 0,
	important: 1,
	contextual: 2,
	'filter-only': 3,
	metadata: 4,
	hidden: 5,
} satisfies Record<CardRenderImportance, number>;

export const getCardElementContract = (slotId: CardLayoutSlotId): CardElementContract =>
	CARD_ELEMENT_CONTRACTS[slotId];

export const getCardElementSurfaceContract = (
	slotId: CardLayoutSlotId,
	surface: CardPresentationSurface,
): CardElementSurfaceContract => CARD_ELEMENT_CONTRACTS[slotId].surfaces[surface];

export const getCardKeywordSemantics = (keywordValue: string): CardKeywordSemantics => {
	const found = CARD_KEYWORD_SEMANTICS_LOOKUP[keywordValue];
	return found ?? fallbackKeywordSemantics(keywordValue);
};

export const getCardKeywordRenderImportance = (
	keywordValue: string,
	surface: CardPresentationSurface,
): CardRenderImportance => getCardKeywordSemantics(keywordValue)[surface];

export const shouldRenderCardKeywordOnSurface = (
	keywordValue: string,
	surface: CardPresentationSurface,
): boolean => RENDERED_IMPORTANCE_BY_SURFACE[surface].has(getCardKeywordRenderImportance(keywordValue, surface));

export const getCardKeywordsForSurface = (
	keywords: readonly string[] | undefined,
	surface: CardPresentationSurface,
): readonly string[] => {
	const unique = Array.from(new Set(keywords ?? []));
	return unique
		.filter((keywordValue) => shouldRenderCardKeywordOnSurface(keywordValue, surface))
		.sort((a, b) => (
			IMPORTANCE_RANK[getCardKeywordRenderImportance(a, surface)] -
			IMPORTANCE_RANK[getCardKeywordRenderImportance(b, surface)]
		));
};

export const cardFrameSurfaceToPresentationSurface = (surface: string): CardPresentationSurface => {
	if (surface === 'collection' || surface === 'preview') return 'collection';
	if (surface === 'mulligan') return 'pregame';
	return 'gameplay';
};

import { getCardKeywordSemantics, normalizeCardKeyword } from '../../components/card/cardPresentationContract';
import type { CardInstance } from '../../types';
import { toSimpleCardData, type SimpleCardData } from '../../components/card/cardDataAdapter';

export type CardInspectorSource = 'hand' | 'player-battlefield' | 'opponent-battlefield';

export interface CardInspectorFact {
	readonly label: string;
	readonly value: string;
}

export interface CardInspectorStat {
	readonly label: 'Attack' | 'Health' | 'Durability';
	readonly current: number;
	readonly base: number;
	readonly state: 'buffed' | 'damaged' | 'base';
}

export interface CardInspectorFeature {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly active: boolean;
	readonly value?: string;
}

export interface CardInspectorModel {
	readonly card: SimpleCardData;
	readonly sourceLabel: string;
	readonly description: string;
	readonly facts: readonly CardInspectorFact[];
	readonly stats: readonly CardInspectorStat[];
	readonly keywords: readonly CardInspectorFeature[];
	readonly modifiers: readonly CardInspectorFeature[];
	readonly combatStates: readonly CardInspectorFeature[];
}

interface RuntimeStateDefinition {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly isActive: (card: CardInstance, keywords: ReadonlySet<string>) => boolean;
	readonly value?: (card: CardInstance) => string | undefined;
}

const SOURCE_LABELS: Record<CardInspectorSource, string> = {
	hand: 'Your hand',
	'player-battlefield': 'Allied battlefield',
	'opponent-battlefield': 'Enemy battlefield',
};

const compareStat = (current: number, base: number): CardInspectorStat['state'] => {
	if (current > base) return 'buffed';
	if (current < base) return 'damaged';
	return 'base';
};

const readNumber = (source: object, key: string): number | undefined => {
	const value = (source as Record<string, unknown>)[key];
	return typeof value === 'number' ? value : undefined;
};

const withTurns = (turns: number | undefined): string | undefined => {
	if (turns === undefined) return undefined;
	return `${turns} turn${turns === 1 ? '' : 's'} remaining`;
};

const RUNTIME_STATES: readonly RuntimeStateDefinition[] = [
	{
		id: 'ready',
		name: 'Ready to attack',
		description: 'This unit can be selected as an attacker now.',
		isActive: card => card.canAttack === true && !card.isSummoningSick && !card.isFrozen && !card.isDormant && !card.isSubmerged,
	},
	{
		id: 'divine_shield',
		name: 'Divine Shield',
		description: 'Absorbs the next source of damage.',
		isActive: card => card.hasDivineShield === true,
	},
	{
		id: 'stealth',
		name: 'Stealth',
		description: 'Cannot be targeted until the protection is broken.',
		isActive: card => card.isStealth === true,
	},
	{
		id: 'taunt',
		name: 'Taunt',
		description: 'Enemies must attack this unit before other targets.',
		isActive: (card, keywords) => card.isTaunt === true || keywords.has('taunt'),
	},
	{
		id: 'frozen',
		name: 'Frozen',
		description: 'Cannot attack while frozen.',
		isActive: card => card.isFrozen === true,
	},
	{
		id: 'burning',
		name: 'Burning',
		description: 'Has increased attack and takes self-damage.',
		isActive: card => card.isBurning === true,
	},
	{
		id: 'poisoned',
		name: 'Poisoned',
		description: 'Takes damage at the start of its turn.',
		isActive: card => card.isPoisonedDoT === true,
	},
	{
		id: 'bleeding',
		name: 'Bleeding',
		description: 'Takes additional damage when damaged.',
		isActive: card => card.isBleeding === true,
	},
	{
		id: 'paralyzed',
		name: 'Paralyzed',
		description: 'Has a chance to fail actions.',
		isActive: card => card.isParalyzed === true,
	},
	{
		id: 'weakened',
		name: 'Weakened',
		description: 'Current attack is reduced.',
		isActive: card => card.isWeakened === true,
	},
	{
		id: 'vulnerable',
		name: 'Vulnerable',
		description: 'Takes additional damage from all sources.',
		isActive: card => card.isVulnerable === true,
	},
	{
		id: 'marked',
		name: 'Marked',
		description: 'Can be targeted through stealth and protection.',
		isActive: card => card.isMarked === true,
	},
	{
		id: 'dormant',
		name: 'Dormant',
		description: 'Cannot act or be targeted until it awakens.',
		isActive: card => card.isDormant === true,
		value: card => withTurns(card.dormantTurnsLeft),
	},
	{
		id: 'submerged',
		name: 'Submerged',
		description: 'Hidden and untargetable until it surfaces.',
		isActive: card => card.isSubmerged === true,
		value: card => withTurns(card.submergeTurnsLeft),
	},
	{
		id: 'coiled',
		name: 'Coiled',
		description: 'Attack is locked while the coil source remains in play.',
		isActive: card => typeof card.coiledBy === 'string' && card.coiledBy.length > 0,
	},
	{
		id: 'evolution_ready',
		name: 'Evolution ready',
		description: 'The evolution condition has been completed.',
		isActive: card => card.petEvolutionMet === true,
	},
	{
		id: 'ragnarok_chain',
		name: 'Ragnarok Chain',
		description: 'The linked partner is currently present on the battlefield.',
		isActive: card => typeof card.chainPartnerInstanceId === 'string' && card.chainPartnerInstanceId.length > 0,
	},
];

function buildStats(card: CardInstance, simpleCard: SimpleCardData): CardInspectorStat[] {
	const stats: CardInspectorStat[] = [];
	if (simpleCard.attack !== undefined) {
		const current = card.currentAttack ?? simpleCard.attack;
		stats.push({ label: 'Attack', current, base: simpleCard.attack, state: compareStat(current, simpleCard.attack) });
	}
	if (simpleCard.health !== undefined) {
		const current = card.currentHealth ?? simpleCard.health;
		stats.push({ label: 'Health', current, base: simpleCard.health, state: compareStat(current, simpleCard.health) });
	}
	if ('durability' in card.card && typeof card.card.durability === 'number') {
		const current = card.currentDurability ?? card.card.durability;
		stats.push({ label: 'Durability', current, base: card.card.durability, state: compareStat(current, card.card.durability) });
	}
	return stats;
}

function buildFacts(card: CardInstance, simpleCard: SimpleCardData): CardInspectorFact[] {
	const facts: CardInspectorFact[] = [
		{ label: 'Cost', value: `${simpleCard.manaCost} mana` },
		{ label: 'Type', value: simpleCard.type.replace('_', ' ') },
		{ label: 'Rarity', value: simpleCard.rarity ?? 'common' },
	];
	if (simpleCard.cardClass) facts.push({ label: 'Class', value: simpleCard.cardClass });
	if (simpleCard.tribe) facts.push({ label: 'Tribe', value: simpleCard.tribe });
	if (simpleCard.element) facts.push({ label: 'Element', value: simpleCard.element });
	if (simpleCard.petStage) facts.push({ label: 'Evolution', value: simpleCard.petStage });
	if (simpleCard.evolutionCondition) facts.push({ label: 'Evolution condition', value: simpleCard.evolutionCondition.description });
	if (simpleCard.bloodPrice !== undefined) facts.push({ label: 'Blood Price', value: `${simpleCard.bloodPrice} HP` });
	if (card.card.set) facts.push({ label: 'Set', value: card.card.set });
	if (card.card.realm) facts.push({ label: 'Realm', value: card.card.realm });
	if ('armorValue' in card.card) facts.push({ label: 'Armor', value: String(card.card.armorValue) });
	if (card.nft_id) facts.push({ label: 'NFT', value: card.nft_id });
	const einpieces = readNumber(simpleCard, 'einpieces');
	if (einpieces !== undefined) facts.push({ label: 'Einherjar returns', value: String(einpieces) });
	return facts;
}

function describeStatModifier(attack: number, health: number): string {
	const parts = [
		attack !== 0 ? `${attack > 0 ? '+' : ''}${attack} Attack` : null,
		health !== 0 ? `${health > 0 ? '+' : ''}${health} Health` : null,
	].filter((part): part is string => part !== null);
	return parts.length > 0 ? parts.join(', ') : 'No current stat change.';
}

function buildModifiers(card: CardInstance): CardInspectorFeature[] {
	const buffs = (card.buffs ?? []).map<CardInspectorFeature>((buff, index) => ({
		id: `buff-${index}`,
		name: buff.source?.trim() || 'Stat modifier',
		description: describeStatModifier(buff.attack, buff.health),
		active: true,
	}));
	const enchantments = (card.enchantments ?? []).map<CardInspectorFeature>((enchantment, index) => ({
		id: `enchantment-${index}`,
		name: enchantment.source?.trim() || enchantment.type.replace(/_/g, ' '),
		description: describeStatModifier(enchantment.buffAttack ?? 0, enchantment.buffHealth ?? 0),
		active: true,
		...(enchantment.effect?.type ? { value: enchantment.effect.type.replace(/_/g, ' ') } : {}),
	}));
	return [...buffs, ...enchantments];
}

export function buildCardInspectorModel(card: CardInstance, source: CardInspectorSource): CardInspectorModel | null {
	const simpleCard = toSimpleCardData(card);
	if (!simpleCard) return null;

	const keywordIds = (card.instanceKeywords ?? card.card.keywords ?? []).map(normalizeCardKeyword);
	const keywordSet = new Set(keywordIds);
	const isSilenced = card.silenced === true || card.isSilenced === true;
	const keywords = keywordIds.map<CardInspectorFeature>(id => {
		const definition = getCardKeywordSemantics(id);
		return {
			id,
			name: definition.label,
			description: definition.description,
			active: !isSilenced,
			...(isSilenced ? { value: 'Silenced' } : {}),
		};
	});

	return {
		card: simpleCard,
		sourceLabel: SOURCE_LABELS[source],
		description: simpleCard.description?.trim() || 'No description is available for this card.',
		facts: buildFacts(card, simpleCard),
		stats: buildStats(card, simpleCard),
		keywords,
		modifiers: buildModifiers(card),
		combatStates: RUNTIME_STATES.map(state => ({
			id: state.id,
			name: state.name,
			description: state.description,
			active: state.isActive(card, keywordSet),
			...(state.value?.(card) ? { value: state.value(card) } : {}),
		})),
	};
}

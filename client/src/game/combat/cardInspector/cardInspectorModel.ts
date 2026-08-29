import { getCardKeywordSemantics, normalizeCardKeyword } from '../../components/card/cardPresentationContract';
import type { CardInstance } from '../../types';
import { toSimpleCardData, type SimpleCardData } from '../../components/card/cardDataAdapter';
import {
	getActiveRuntimeStates,
	getEinherjarReturnsRemaining,
	RUNTIME_STATE_DEFINITIONS,
} from '../runtimeStateContract';

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
	const einherjarReturns = getEinherjarReturnsRemaining(card);
	if (einherjarReturns !== undefined) {
		facts.push({ label: 'Einherjar returns remaining', value: String(einherjarReturns) });
	}
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
	const isSilenced = card.silenced === true || card.isSilenced === true;
	const activeStateIds = new Set(getActiveRuntimeStates(card).map(state => state.id));
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
		combatStates: RUNTIME_STATE_DEFINITIONS.map(state => ({
			id: state.id,
			name: state.name,
			description: state.description,
			active: activeStateIds.has(state.id),
			...(state.value?.(card) ? { value: state.value(card) } : {}),
		})),
	};
}

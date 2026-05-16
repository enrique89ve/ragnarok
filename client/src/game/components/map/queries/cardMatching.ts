import { cardRegistry } from '../../../data/cardRegistry';
import { realmShiftCards } from '../../../data/cardRegistry/sets/core/neutrals/realmShiftCards';
import { ALL_HERO_LIST } from '../../../data/norseHeroes';
import { NINE_REALMS } from '../../../campaign/nineRealms';
import type { CardData } from '../../../types';
import type { NorseHero } from '../../../types/NorseTypes';
import { RARITY_ORDER } from '@shared/schemas/rarity';
import { normalizeRarityKey } from '../../../utils/rarityUtils';
import { REALM_CARD_MATCHERS } from '../data/cardMatchers';
import type { MapCardReference, MapCardSection, MapCardSectionId, MapRealmId, RealmShiftSummary } from '../types';
import { isNonEmptyString, matchesTerm, normalizeText, titleCase } from './textUtils';

interface RealmShiftCardView {
	name: string;
	manaCost: number;
	class?: string;
	description?: string;
	spellEffect?: {
		type?: unknown;
		realmId?: unknown;
	};
}

const CARD_SECTION_DEFINITIONS = [
	{ id: 'characters', title: 'Characters' },
	{ id: 'spells', title: 'Spells' },
	{ id: 'arms', title: 'Arms' },
	{ id: 'pets', title: 'Pets' },
] as const satisfies readonly { id: MapCardSectionId; title: string }[];

const CARD_SECTION_LIMIT = 12;

function getSpellEffectView(card: (typeof realmShiftCards)[number]): RealmShiftCardView['spellEffect'] {
	if (!('spellEffect' in card) || !card.spellEffect) return undefined;
	return { type: card.spellEffect.type, realmId: card.spellEffect.realmId };
}

const realmShiftCardViews: readonly RealmShiftCardView[] = realmShiftCards.map(card => ({
	name: card.name,
	manaCost: card.manaCost ?? 0,
	class: card.class ?? undefined,
	description: card.description,
	spellEffect: getSpellEffectView(card),
}));

function getCardCategories(card: CardData): readonly string[] {
	if (!('categories' in card) || !Array.isArray(card.categories)) return [];
	return card.categories.filter(isNonEmptyString);
}

function getPetFamily(card: CardData): string | undefined {
	if (!('petFamily' in card) || !isNonEmptyString(card.petFamily)) return undefined;
	return card.petFamily;
}

function getCardCategory(card: CardData): string | undefined {
	if (!('category' in card) || !isNonEmptyString(card.category)) return undefined;
	return card.category;
}

function getCardSearchText(card: CardData): string {
	return normalizeText(
		[card.name, card.description, card.flavorText, card.class, card.heroClass, card.race, card.type, getPetFamily(card), ...getCardCategories(card)]
			.filter(isNonEmptyString)
			.join(' '),
	);
}

function getHeroSearchText(hero: NorseHero): string {
	return normalizeText(
		[
			hero.id,
			hero.name,
			hero.title,
			hero.element,
			hero.heroClass,
			hero.description,
			hero.lore,
			hero.heroPower.name,
			hero.heroPower.description,
			hero.weaponUpgrade.name,
			hero.weaponUpgrade.description,
			hero.passive.name,
			hero.passive.description,
		]
			.filter(isNonEmptyString)
			.join(' '),
	);
}

function matchesRealmCard(card: CardData, realmId: MapRealmId): boolean {
	if (card.realm === realmId) return true;

	const matcher = REALM_CARD_MATCHERS[realmId];
	const petFamily = getPetFamily(card);
	if (petFamily && matcher.petFamilies.includes(petFamily)) return true;

	const searchText = getCardSearchText(card);
	return matcher.terms.some(term => matchesTerm(searchText, term));
}

function getHeroScore(hero: NorseHero, realmId: MapRealmId): number {
	const matcher = REALM_CARD_MATCHERS[realmId];
	const heroIndex = matcher.heroIds.indexOf(hero.id);
	if (heroIndex >= 0) return 1000 - heroIndex;

	const searchText = getHeroSearchText(hero);
	return matcher.terms.some(term => matchesTerm(searchText, term)) ? 10 : 0;
}

export function getPrimaryRealmHeroes(realmId: MapRealmId): readonly NorseHero[] {
	const matcher = REALM_CARD_MATCHERS[realmId];
	return matcher.heroIds
		.map(heroId => ALL_HERO_LIST.find(hero => hero.id === heroId))
		.filter((hero): hero is NorseHero => Boolean(hero));
}

export function getSecondaryRealmHeroes(realmId: MapRealmId): readonly NorseHero[] {
	return ALL_HERO_LIST.filter(
		hero => getHeroScore(hero, realmId) > 0 && !REALM_CARD_MATCHERS[realmId].heroIds.includes(hero.id),
	).sort((left, right) => {
		const scoreDelta = getHeroScore(right, realmId) - getHeroScore(left, realmId);
		if (scoreDelta !== 0) return scoreDelta;
		return left.name.localeCompare(right.name);
	});
}

function cleanRealmShiftEffect(description: string | undefined): string {
	if (!description) return 'No Gate text found.';
	return description.replace(/^Realm Shift:\s*/, '');
}

export function getRealmShiftSummary(realmId: MapRealmId): RealmShiftSummary {
	const gateCard = realmShiftCardViews.find(
		card => card.spellEffect?.type === 'realm_shift' && card.spellEffect.realmId === realmId,
	);

	if (!gateCard) {
		return {
			cardName: 'No Gate card',
			cardClass: 'Neutral',
			cost: 0,
			effect: 'No Realm Shift card is registered for this realm.',
		};
	}

	return {
		cardName: gateCard.name,
		cardClass: gateCard.class ?? 'Neutral',
		cost: gateCard.manaCost,
		effect: cleanRealmShiftEffect(gateCard.description),
	};
}

export function getCampaignRealm(realmId: MapRealmId) {
	const realm = NINE_REALMS.find(candidate => candidate.id === realmId);
	if (!realm) throw new Error(`Missing campaign realm theory for ${realmId}`);
	return realm;
}

function getCardScore(card: CardData, realmId: MapRealmId): number {
	const petFamily = getPetFamily(card);
	const rarity = isNonEmptyString(card.rarity) ? card.rarity.toLowerCase() : '';
	const searchText = getCardSearchText(card);
	const nameText = normalizeText(card.name);
	const realmName = normalizeText(getCampaignRealm(realmId).name);
	const matchesRealmTerm = REALM_CARD_MATCHERS[realmId].terms.some(term => matchesTerm(searchText, term));
	const matchesRealmTermInName = REALM_CARD_MATCHERS[realmId].terms.some(term => matchesTerm(nameText, term));

	return [
		card.realm === realmId ? 120 : 0,
		matchesTerm(searchText, realmName) ? 60 : 0,
		card.type === 'hero' ? 90 : 0,
		matchesRealmTermInName ? 50 : 0,
		matchesRealmTerm ? 20 : 0,
		card.type === 'spell' && card.name.startsWith('Gate to ') ? 30 : 0,
		petFamily && REALM_CARD_MATCHERS[realmId].petFamilies.includes(petFamily) ? 25 : 0,
		card.collectible ? 8 : 0,
		(RARITY_ORDER[normalizeRarityKey(rarity)] + 1) * 10,
	].reduce((total, value) => total + value, 0);
}

function sortCardsForRealm(realmId: MapRealmId) {
	return (left: CardData, right: CardData): number => {
		const scoreDelta = getCardScore(right, realmId) - getCardScore(left, realmId);
		if (scoreDelta !== 0) return scoreDelta;

		const leftCost = left.manaCost ?? 99;
		const rightCost = right.manaCost ?? 99;
		if (leftCost !== rightCost) return leftCost - rightCost;

		return left.name.localeCompare(right.name);
	};
}

function getCardStatLine(card: CardData): string | undefined {
	if (card.type === 'minion') return `${card.attack}/${card.health}`;
	if (card.type === 'weapon') return `${card.attack}/${card.durability}`;
	if (card.type === 'armor') return `Armor ${card.armorValue}`;
	return undefined;
}

function toCardReference(card: CardData): MapCardReference {
	return {
		id: String(card.id),
		name: card.name,
		typeLabel: titleCase(card.type),
		sourceLabel: getCardCategory(card) ? titleCase(getCardCategory(card)) : 'Card',
		costLabel: card.manaCost === undefined ? '-' : String(card.manaCost),
		rarityLabel: titleCase(card.rarity),
		description: card.description ?? card.flavorText ?? 'No rules text registered.',
		statLine: getCardStatLine(card),
	};
}

function toHeroReference(hero: NorseHero): MapCardReference {
	return {
		id: hero.id,
		name: hero.name,
		typeLabel: hero.title,
		sourceLabel: 'Hero',
		costLabel: 'Hero',
		rarityLabel: titleCase(hero.element),
		description: hero.description,
		statLine: hero.heroClass ? titleCase(hero.heroClass) : undefined,
	};
}

function toHeroWeaponReference(hero: NorseHero): MapCardReference {
	return {
		id: `${hero.id}-weapon-${hero.weaponUpgrade.id}`,
		name: hero.weaponUpgrade.name,
		typeLabel: 'Weapon Upgrade',
		sourceLabel: hero.name,
		costLabel: String(hero.weaponUpgrade.manaCost),
		rarityLabel: 'Hero Kit',
		description: hero.weaponUpgrade.description,
	};
}

function uniqueReferences(references: readonly MapCardReference[]): readonly MapCardReference[] {
	const seen = new Set<string>();
	return references.filter(reference => {
		if (seen.has(reference.id)) return false;
		seen.add(reference.id);
		return true;
	});
}

function getRealmCards(realmId: MapRealmId, predicate: (card: CardData) => boolean): readonly MapCardReference[] {
	return cardRegistry
		.filter(card => matchesRealmCard(card, realmId) && predicate(card))
		.sort(sortCardsForRealm(realmId))
		.map(toCardReference);
}

function isPetCard(card: CardData): boolean {
	return Boolean(getPetFamily(card));
}

function isCharacterCard(card: CardData): boolean {
	return (card.type === 'hero' || card.type === 'minion') && !isPetCard(card);
}

function isSpellCard(card: CardData): boolean {
	return card.type === 'spell' || card.type === 'secret' || card.type === 'poker_spell';
}

function isArmsCard(card: CardData): boolean {
	return card.type === 'weapon' || card.type === 'armor' || card.type === 'artifact';
}

function buildCardSection(id: MapCardSectionId, title: string, references: readonly MapCardReference[]): MapCardSection {
	const uniqueCards = uniqueReferences(references);
	return {
		id,
		title,
		count: uniqueCards.length,
		cards: uniqueCards.slice(0, CARD_SECTION_LIMIT),
	};
}

export function buildRealmCardSections(realmId: MapRealmId): readonly MapCardSection[] {
	const primaryHeroes = getPrimaryRealmHeroes(realmId);
	const secondaryHeroes = getSecondaryRealmHeroes(realmId);
	const sections: Record<MapCardSectionId, readonly MapCardReference[]> = {
		characters: [
			...primaryHeroes.map(toHeroReference),
			...getRealmCards(realmId, isCharacterCard),
			...secondaryHeroes.map(toHeroReference),
		],
		spells: getRealmCards(realmId, isSpellCard),
		arms: [
			...primaryHeroes.map(toHeroWeaponReference),
			...getRealmCards(realmId, isArmsCard),
			...secondaryHeroes.map(toHeroWeaponReference),
		],
		pets: getRealmCards(realmId, isPetCard),
	};

	return CARD_SECTION_DEFINITIONS.map(section => buildCardSection(section.id, section.title, sections[section.id]));
}

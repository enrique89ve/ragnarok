import type { AtlasCard, AtlasDataAdapter, AtlasHero, AtlasRealmShiftCard } from '../adapter';
import { REALM_CARD_MATCHERS } from '../data/cardMatchers';
import type { MapCardReference, MapCardSection, MapCardSectionId, MapRealmId, RealmShiftSummary } from '../types';
import { isNonEmptyString, matchesTerm, normalizeText, titleCase } from './textUtils';

const CARD_SECTION_DEFINITIONS = [
	{ id: 'characters', title: 'Characters' },
	{ id: 'spells', title: 'Spells' },
	{ id: 'arms', title: 'Arms' },
	{ id: 'pets', title: 'Pets' },
] as const satisfies readonly { id: MapCardSectionId; title: string }[];

const CARD_SECTION_LIMIT = 12;

function getRealmShiftEffect(card: AtlasRealmShiftCard): { type?: string; realmId?: string } {
	return card.spellEffect ? { type: card.spellEffect.type, realmId: card.spellEffect.realmId } : {};
}

function getRealmName(realmId: MapRealmId, data: AtlasDataAdapter): string {
	const realm = data.realms.find(candidate => candidate.id === realmId);
	if (!realm) throw new Error(`Missing campaign realm theory for ${realmId}`);
	return realm.name;
}

function getCardCategories(card: AtlasCard): readonly string[] {
	if (!Array.isArray(card.categories)) return [];
	return card.categories.filter(isNonEmptyString);
}

function getPetFamily(card: AtlasCard): string | undefined {
	if (!isNonEmptyString(card.petFamily)) return undefined;
	return card.petFamily;
}

function getCardCategory(card: AtlasCard): string | undefined {
	if (!isNonEmptyString(card.category)) return undefined;
	return card.category;
}

function getCardSearchText(card: AtlasCard): string {
	return normalizeText(
		[card.name, card.description, card.flavorText, card.class, card.heroClass, card.race, card.type, getPetFamily(card), ...getCardCategories(card)]
			.filter(isNonEmptyString)
			.join(' '),
	);
}

function getHeroSearchText(hero: AtlasHero): string {
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

function matchesRealmCard(card: AtlasCard, realmId: MapRealmId): boolean {
	if (card.realm === realmId) return true;

	const matcher = REALM_CARD_MATCHERS[realmId];
	const petFamily = getPetFamily(card);
	if (petFamily && matcher.petFamilies.includes(petFamily)) return true;

	const searchText = getCardSearchText(card);
	return matcher.terms.some(term => matchesTerm(searchText, term));
}

function getHeroScore(hero: AtlasHero, realmId: MapRealmId): number {
	const matcher = REALM_CARD_MATCHERS[realmId];
	const heroIndex = matcher.heroIds.indexOf(hero.id);
	if (heroIndex >= 0) return 1000 - heroIndex;

	const searchText = getHeroSearchText(hero);
	return matcher.terms.some(term => matchesTerm(searchText, term)) ? 10 : 0;
}

export function getPrimaryRealmHeroes(realmId: MapRealmId, data: AtlasDataAdapter): readonly AtlasHero[] {
	const matcher = REALM_CARD_MATCHERS[realmId];
	return matcher.heroIds
		.map(heroId => data.heroes.find(hero => hero.id === heroId))
		.filter((hero): hero is AtlasHero => Boolean(hero));
}

export function getSecondaryRealmHeroes(realmId: MapRealmId, data: AtlasDataAdapter): readonly AtlasHero[] {
	return data.heroes
		.filter(
			hero => getHeroScore(hero, realmId) > 0 && !REALM_CARD_MATCHERS[realmId].heroIds.includes(hero.id),
		)
		.sort((left, right) => {
			const scoreDelta = getHeroScore(right, realmId) - getHeroScore(left, realmId);
			if (scoreDelta !== 0) return scoreDelta;
			return left.name.localeCompare(right.name);
		});
}

function cleanRealmShiftEffect(description: string | undefined): string {
	if (!description) return 'No Gate text found.';
	return description.replace(/^Realm Shift:\s*/, '');
}

export function getRealmShiftSummary(realmId: MapRealmId, data: AtlasDataAdapter): RealmShiftSummary {
	const gateCard = data.realmShiftCards.find(card => {
		const effect = getRealmShiftEffect(card);
		return effect.type === 'realm_shift' && effect.realmId === realmId;
	});

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
		cost: gateCard.manaCost ?? 0,
		effect: cleanRealmShiftEffect(gateCard.description),
	};
}

function getCardScore(card: AtlasCard, realmId: MapRealmId, data: AtlasDataAdapter): number {
	const petFamily = getPetFamily(card);
	const rarity = isNonEmptyString(card.rarity) ? card.rarity.toLowerCase() : '';
	const rarityRank = data.rarityOrder.indexOf(rarity);
	const searchText = getCardSearchText(card);
	const nameText = normalizeText(card.name);
	const realmName = normalizeText(getRealmName(realmId, data));
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
		rarityRank >= 0 ? (rarityRank + 1) * 10 : 0,
	].reduce((total, value) => total + value, 0);
}

function sortCardsForRealm(realmId: MapRealmId, data: AtlasDataAdapter) {
	return (left: AtlasCard, right: AtlasCard): number => {
		const scoreDelta = getCardScore(right, realmId, data) - getCardScore(left, realmId, data);
		if (scoreDelta !== 0) return scoreDelta;

		const leftCost = left.manaCost ?? 99;
		const rightCost = right.manaCost ?? 99;
		if (leftCost !== rightCost) return leftCost - rightCost;

		return left.name.localeCompare(right.name);
	};
}

function getCardStatLine(card: AtlasCard): string | undefined {
	if (card.type === 'minion') return `${card.attack}/${card.health}`;
	if (card.type === 'weapon') return `${card.attack}/${card.durability}`;
	if (card.type === 'armor') return `Armor ${card.armorValue}`;
	return undefined;
}

function toCardReference(card: AtlasCard): MapCardReference {
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

function toHeroReference(hero: AtlasHero): MapCardReference {
	return {
		id: hero.id,
		name: hero.name,
		typeLabel: hero.title,
		sourceLabel: 'Hero',
		costLabel: 'Hero',
		rarityLabel: titleCase(hero.element),
		description: hero.description ?? '',
		statLine: hero.heroClass ? titleCase(hero.heroClass) : undefined,
	};
}

function toHeroWeaponReference(hero: AtlasHero): MapCardReference {
	return {
		id: `${hero.id}-weapon-${hero.weaponUpgrade.id}`,
		name: hero.weaponUpgrade.name,
		typeLabel: 'Weapon Upgrade',
		sourceLabel: hero.name,
		costLabel: String(hero.weaponUpgrade.manaCost),
		rarityLabel: 'Hero Kit',
		description: hero.weaponUpgrade.description ?? '',
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

function getRealmCards(realmId: MapRealmId, data: AtlasDataAdapter, predicate: (card: AtlasCard) => boolean): readonly MapCardReference[] {
	return data.cards
		.filter(card => matchesRealmCard(card, realmId) && predicate(card))
		.sort(sortCardsForRealm(realmId, data))
		.map(toCardReference);
}

function isPetCard(card: AtlasCard): boolean {
	return Boolean(getPetFamily(card));
}

function isCharacterCard(card: AtlasCard): boolean {
	return (card.type === 'hero' || card.type === 'minion') && !isPetCard(card);
}

function isSpellCard(card: AtlasCard): boolean {
	return card.type === 'spell' || card.type === 'secret' || card.type === 'poker_spell';
}

function isArmsCard(card: AtlasCard): boolean {
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

export function buildRealmCardSections(realmId: MapRealmId, data: AtlasDataAdapter): readonly MapCardSection[] {
	const primaryHeroes = getPrimaryRealmHeroes(realmId, data);
	const secondaryHeroes = getSecondaryRealmHeroes(realmId, data);
	const sections: Record<MapCardSectionId, readonly MapCardReference[]> = {
		characters: [
			...primaryHeroes.map(toHeroReference),
			...getRealmCards(realmId, data, isCharacterCard),
			...secondaryHeroes.map(toHeroReference),
		],
		spells: getRealmCards(realmId, data, isSpellCard),
		arms: [
			...primaryHeroes.map(toHeroWeaponReference),
			...getRealmCards(realmId, data, isArmsCard),
			...secondaryHeroes.map(toHeroWeaponReference),
		],
		pets: getRealmCards(realmId, data, isPetCard),
	};

	return CARD_SECTION_DEFINITIONS.map(section => buildCardSection(section.id, section.title, sections[section.id]));
}

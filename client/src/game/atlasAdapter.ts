import { RARITY } from '@shared/schemas/rarity';
import { routes } from '../lib/routes';
import { NINE_REALMS } from './campaign/nineRealms';
import { cardRegistry } from './data/cardRegistry';
import { realmShiftCards } from './data/cardRegistry/sets/core/neutrals/realmShiftCards';
import { ALL_HERO_LIST } from './data/norseHeroes';
import { FACTIONS } from './pvp/pvpData';
import { normalizeRarityKey } from './utils/rarityUtils';
import { getCardArtPath, getHeroArtPath } from './utils/art/artMapping';
import type { AtlasCard, AtlasDataAdapter, AtlasFaction, AtlasHero, AtlasRealmInfo, AtlasRealmShiftCard } from './components/map/adapter';
import type { MapRealmId } from './components/map/types';
import type { CardData } from './types';
import type { NorseHero } from './types/NorseTypes';

/**
 * Game-side implementation of the Atlas data adapter. This is the only file
 * that imports host-game data (card registry, heroes, realms, factions);
 * the map module itself stays free of those imports so it can be copied
 * into another project and re-wired with a new adapter.
 */

const FACTION_HOME_REALMS: Readonly<Record<string, MapRealmId>> = Object.freeze({
	aesir: 'asgard',
	vanir: 'vanaheim',
	jotun: 'jotunheim',
	helheim: 'helheim',
	muspell: 'muspelheim',
});

function toAtlasCard(card: CardData): AtlasCard {
	return {
		id: card.id,
		name: card.name,
		artUrl: getCardArtPath(card.id) ?? undefined,
		type: card.type,
		rarity: normalizeRarityKey(card.rarity),
		manaCost: card.manaCost,
		description: card.description,
		flavorText: card.flavorText,
		class: card.class,
		heroClass: card.heroClass,
		race: card.race,
		realm: card.realm,
		categories: 'categories' in card ? card.categories : undefined,
		petFamily: 'petFamily' in card ? card.petFamily : undefined,
		collectible: card.collectible,
		attack: 'attack' in card ? card.attack : undefined,
		health: 'health' in card ? card.health : undefined,
		durability: 'durability' in card ? card.durability : undefined,
		armorValue: 'armorValue' in card ? card.armorValue : undefined,
	};
}

function toAtlasHero(hero: NorseHero): AtlasHero {
	const heroArtUrl = getHeroArtPath(hero.id) ?? undefined;
	const weaponArtUrl = getCardArtPath(hero.weaponUpgrade.id) ?? heroArtUrl;

	return {
		id: hero.id,
		name: hero.name,
		artUrl: heroArtUrl,
		title: hero.title,
		element: hero.element,
		heroClass: hero.heroClass,
		description: hero.description,
		lore: hero.lore,
		heroPower: { name: hero.heroPower.name, description: hero.heroPower.description },
		weaponUpgrade: {
			id: String(hero.weaponUpgrade.id),
			name: hero.weaponUpgrade.name,
			artUrl: weaponArtUrl,
			manaCost: hero.weaponUpgrade.manaCost,
			description: hero.weaponUpgrade.description,
		},
		passive: { name: hero.passive.name, description: hero.passive.description },
	};
}

function toAtlasRealmShiftCard(card: CardData): AtlasRealmShiftCard {
	return {
		name: card.name,
		manaCost: card.manaCost,
		class: card.class,
		description: card.description,
		spellEffect:
			'spellEffect' in card && card.spellEffect
				? { type: card.spellEffect.type, realmId: card.spellEffect.realmId }
				: undefined,
	};
}

function toAtlasRealmInfo(realm: (typeof NINE_REALMS)[number]): AtlasRealmInfo {
	return {
		id: realm.id,
		name: realm.name,
		description: realm.description,
		runeSymbol: realm.runeSymbol,
		environmentEffect: realm.environmentEffect,
		environmentDescription: realm.environmentDescription,
		connections: realm.connections,
		color: realm.color,
		glow: realm.glowColor,
	};
}

function toAtlasFaction(faction: (typeof FACTIONS)[number]): AtlasFaction {
	return {
		id: faction.id,
		name: faction.name,
		tagline: faction.tagline,
		description: faction.description,
		color: faction.color,
	};
}

export const GAME_ATLAS_DATA: AtlasDataAdapter = {
	realms: NINE_REALMS.map(toAtlasRealmInfo),
	factions: FACTIONS.map(toAtlasFaction),
	cards: cardRegistry.map(toAtlasCard),
	heroes: ALL_HERO_LIST.map(toAtlasHero),
	realmShiftCards: realmShiftCards.map(toAtlasRealmShiftCard),
	rarityOrder: RARITY,
	factionHomeRealms: FACTION_HOME_REALMS,
	homePath: routes.home,
};

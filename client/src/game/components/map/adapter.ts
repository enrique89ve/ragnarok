import type { MapRealmId } from './types';

/**
 * Atlas data adapter — the module's only contract with host-game data.
 *
 * The Yggdrasil Atlas module never imports host-game modules directly.
 * Every piece of game data it renders (realms, factions, cards, heroes,
 * realm-shift gates, rarity order, home path) arrives through this
 * interface. Migrating the module to another project means copying this
 * folder and writing a fresh adapter — nothing inside the folder changes.
 */
export interface AtlasDataAdapter {
	/** Realm lore used to derive the map legend (name, rune, colors, connections). */
	realms: readonly AtlasRealmInfo[];
	/** PvP houses displayed in the launch panel's pledge list. */
	factions: readonly AtlasFaction[];
	/** Full card database the regional-card matcher scores against. */
	cards: readonly AtlasCard[];
	/** Hero registry used to rank realm-affiliated heroes. */
	heroes: readonly AtlasHero[];
	/** Realm-shift gate cards ("Gate to ...") summarized per realm. */
	realmShiftCards: readonly AtlasRealmShiftCard[];
	/** Canonical rarity tiers, most common first. */
	rarityOrder: readonly string[];
	/** Maps each faction id to its home realm id. */
	factionHomeRealms: Readonly<Record<string, MapRealmId>>;
	/** App route for the "back home" link. */
	homePath: string;
}

export interface AtlasRealmInfo {
	id: string;
	name: string;
	description: string;
	runeSymbol: string;
	environmentEffect: string;
	environmentDescription: string;
	connections: readonly string[];
	color: string;
	glow: string;
}

export interface AtlasFaction {
	id: string;
	name: string;
	tagline: string;
	description: string;
	color: string;
}

export interface AtlasCard {
	id: string | number;
	name: string;
	artUrl?: string;
	type: string;
	rarity?: string;
	manaCost?: number;
	description?: string;
	flavorText?: string;
	class?: string;
	heroClass?: string;
	race?: string;
	realm?: string;
	category?: string;
	categories?: readonly string[];
	petFamily?: string;
	collectible?: boolean;
	attack?: number;
	health?: number;
	durability?: number;
	armorValue?: number;
}

export interface AtlasHeroAbility {
	name: string;
	description?: string;
}

export interface AtlasHeroKitEntry {
	id: string;
	name: string;
	artUrl?: string;
	manaCost: number;
	description?: string;
}

export interface AtlasHero {
	id: string;
	name: string;
	artUrl?: string;
	title: string;
	element: string;
	heroClass?: string;
	description?: string;
	lore?: string;
	heroPower: AtlasHeroAbility;
	weaponUpgrade: AtlasHeroKitEntry;
	passive: AtlasHeroAbility;
}

export interface AtlasRealmShiftCard {
	name: string;
	manaCost?: number;
	class?: string;
	description?: string;
	spellEffect?: {
		type?: string;
		realmId?: string;
	};
}

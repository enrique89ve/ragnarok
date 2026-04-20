/**
 * Hero & King Rarity System
 *
 * Assigns rarity tiers to all chess pieces (heroes + kings) for NFT edition display.
 * Supply limits per rarity tier match the blockchain supply caps.
 */

export type HeroRarity = 'base' | 'common' | 'rare' | 'epic' | 'mythic';

/** NFT supply cap per rarity tier — base heroes are non-NFT (free starter) */
export const PIECE_SUPPLY: Record<HeroRarity, number> = {
	mythic: 250,
	epic: 500,
	rare: 1_000,
	common: 2_000,
	base: 0, // non-NFT, everyone gets these free
};

/** Rarity-specific accent colors */
export const RARITY_COLORS: Record<HeroRarity, { primary: string; glow: string; label: string }> = {
	mythic: { primary: '#ff8c00', glow: 'rgba(255, 140, 0, 0.5)', label: 'MYTHIC' },
	epic:   { primary: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)', label: 'EPIC' },
	rare:   { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)', label: 'RARE' },
	common: { primary: '#9ca3af', glow: 'rgba(156, 163, 175, 0.3)', label: 'COMMON' },
	base:   { primary: '#6b7280', glow: 'rgba(107, 114, 128, 0.2)', label: 'BASE' },
};

// ==================== BASE — free starter, non-NFT ====================
// One per chess piece slot. Everyone gets these. Not tradeable.
const BASE_PIECES = new Set([
	'hero-erik-flameheart',   // Queen — starter mage
	'hero-ragnar-ironside',  // Rook — starter warrior
	'hero-brynhild',         // Bishop — starter priest
	'hero-sigurd',           // Knight — starter rogue
	'king-leif',             // King — starter king
]);

// ==================== MYTHIC — 250 supply ====================
// The most iconic gods/titans/cosmic entities across all mythologies.
const MYTHIC_PIECES = new Set([
	// Norse major gods
	'hero-odin',
	'hero-thor',
	'hero-loki',
	'hero-freya',
	'hero-hel',
	'hero-baldur',
	// Greek Olympians — the big four
	'hero-zeus',
	'hero-poseidon',
	'hero-hades',
	'hero-athena',
	// Titans
	'hero-chronos',
	// Japanese
	'hero-izanami',
	// Kings — primordial world-shapers
	'king-ymir',
	'king-surtr',
	'king-ginnungagap',
]);

// ==================== EPIC — 500 supply ====================
// Named deities with strong thematic significance.
const EPIC_PIECES = new Set([
	// Norse deities
	'hero-bragi',
	'hero-eir',
	'hero-forseti',
	'hero-frey',
	'hero-tyr',
	'hero-vidar',
	'hero-heimdall',
	'hero-skadi',
	'hero-ran',
	'hero-njord',
	'hero-sigyn',
	'hero-magni',
	'hero-sinmara',
	'hero-frigg',
	'hero-gullveig',
	// Greek deities
	'hero-apollo',
	'hero-ares',
	'hero-hermes',
	'hero-aphrodite',
	'hero-artemis',
	'hero-hera',
	'hero-persephone',
	'hero-nyx',
	'hero-hephaestus',
	'hero-dionysus',
	'hero-hyperion',
	'hero-hecate',
	'hero-helios',
	'hero-prometheus',
	'hero-rhea',
	'hero-selene',
	// Egyptian
	'hero-ammit',
	// Kings — major primordial figures
	'king-yggdrasil',
	'king-gaia',
	'king-tartarus',
	'king-buri',
]);

// ==================== RARE — 1,250 supply ====================
// Lesser-known mythology figures from all pantheons.
const RARE_PIECES = new Set([
	// Norse lesser deities
	'hero-idunn',
	'hero-sol',
	'hero-mani',
	'hero-hoder',
	'hero-kvasir',
	'hero-ve',
	'hero-vili',
	'hero-hoenir',
	'hero-ullr',
	'hero-aegir',
	'hero-gerd',
	'hero-gefjon',
	// Greek lesser deities / titans
	'hero-eros',
	'hero-demeter',
	'hero-hestia',
	// Greek demigods
	'hero-heracles',
	'hero-perseus',
	// Japanese
	'hero-tsukuyomi',
	'hero-fujin',
	'hero-sarutahiko',
	'hero-kamimusubi',
	// Egyptian
	'hero-maat',
	'hero-serqet',
	'hero-khepri',
	// Norse saga figures / lesser known
	'hero-groa',
	'hero-bestla',
	'hero-blainn',
	'hero-logi',
	'hero-gormr',
	'hero-fjorgyn',
	'hero-verdandi',
	'hero-hermod',
	'hero-vali',
	'hero-nanna',
	'hero-volva',
	// Vikings
	'hero-thorgrim',
	'hero-valthrud',
	'hero-thryma',
	// Kings — supporting primordial figures
	'king-borr',
	'king-brimir',
	'king-audumbla',
]);

// ==================== COMMON — 1,800 supply ====================
// Original game characters not from established mythology.
// Any piece not listed above defaults to common.

export function getHeroRarity(heroId: string): HeroRarity {
	if (BASE_PIECES.has(heroId)) return 'base';
	if (MYTHIC_PIECES.has(heroId)) return 'mythic';
	if (EPIC_PIECES.has(heroId)) return 'epic';
	if (RARE_PIECES.has(heroId)) return 'rare';
	return 'common';
}

export interface EditionInfo {
	rarity: HeroRarity;
	maxSupply: number;
	mintNumber: number;
	editionLabel: string;
	rarityLabel: string;
	colors: { primary: string; glow: string };
}

export function getEditionInfo(heroId: string, _isKing: boolean): EditionInfo {
	const hash = heroId.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
	const rarity = getHeroRarity(heroId);
	const maxSupply = PIECE_SUPPLY[rarity];

	return {
		rarity,
		maxSupply,
		mintNumber: (hash % maxSupply) + 1,
		editionLabel: RARITY_COLORS[rarity].label,
		rarityLabel: RARITY_COLORS[rarity].label,
		colors: RARITY_COLORS[rarity],
	};
}

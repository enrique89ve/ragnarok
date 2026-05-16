/**
 * Hero & King Rarity System
 *
 * Assigns rarity tiers to all chess pieces (heroes + kings) for NFT edition display.
 * Supply limits per rarity tier match the blockchain supply caps.
 */

import type { Rarity } from '@shared/schemas/rarity';
import { supplyCap } from '@shared/schemas/rarity';
import { getRarityCssColor, getRarityCssGlow, getRarityLabel } from './rarityUtils';

export type HeroEditionTier = 'starter' | Rarity;

/** NFT supply cap per canonical rarity tier. Starter pieces are off-chain. */
export const PIECE_SUPPLY: Record<HeroEditionTier, number> = {
	mythic: supplyCap('mythic'),
	epic: supplyCap('epic'),
	rare: supplyCap('rare'),
	common: supplyCap('common'),
	starter: 0,
};

export const HERO_TIER_UI: Record<HeroEditionTier, { primary: string; glow: string; label: string }> = {
	mythic: { primary: getRarityCssColor('mythic'), glow: getRarityCssGlow('mythic'), label: getRarityLabel('mythic').toUpperCase() },
	epic: { primary: getRarityCssColor('epic'), glow: getRarityCssGlow('epic'), label: getRarityLabel('epic').toUpperCase() },
	rare: { primary: getRarityCssColor('rare'), glow: getRarityCssGlow('rare'), label: getRarityLabel('rare').toUpperCase() },
	common: { primary: getRarityCssColor('common'), glow: getRarityCssGlow('common'), label: getRarityLabel('common').toUpperCase() },
	starter: { primary: 'var(--ink-300)', glow: 'color-mix(in srgb, var(--ink-300) 20%, transparent)', label: 'STARTER' },
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
	'hero-freyr',
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

export function getHeroEditionTier(heroId: string): HeroEditionTier {
	if (BASE_PIECES.has(heroId)) return 'starter';
	if (MYTHIC_PIECES.has(heroId)) return 'mythic';
	if (EPIC_PIECES.has(heroId)) return 'epic';
	if (RARE_PIECES.has(heroId)) return 'rare';
	return 'common';
}

export interface EditionInfo {
	tier: HeroEditionTier;
	maxSupply: number;
	mintNumber: number;
	editionLabel: string;
	tierLabel: string;
	colors: { primary: string; glow: string };
}

export function getEditionInfo(heroId: string, _isKing: boolean): EditionInfo {
	const hash = heroId.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
	const tier = getHeroEditionTier(heroId);
	const maxSupply = PIECE_SUPPLY[tier];

	// Starter pieces are non-NFT, so there is no meaningful mint
	// number. Guard against `hash % 0 = NaN` and surface 0 so consumers can
	// branch on tier rather than checking NaN.
	const mintNumber = maxSupply > 0 ? (hash % maxSupply) + 1 : 0;

	return {
		tier,
		maxSupply,
		mintNumber,
		editionLabel: HERO_TIER_UI[tier].label,
		tierLabel: HERO_TIER_UI[tier].label,
		colors: HERO_TIER_UI[tier],
	};
}

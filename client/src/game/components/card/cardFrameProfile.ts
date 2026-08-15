import type { CardType } from './types';

export type CardFrameProfileId = 'minion' | 'spell' | 'weapon' | 'support';
export type CardFrameStatsLayout = 'attack-health' | 'none';

export interface CardFrameProfile {
	readonly id: CardFrameProfileId;
	readonly statsLayout: CardFrameStatsLayout;
	readonly showCombatStats: boolean;
}

const CARD_FRAME_PROFILES: Record<CardFrameProfileId, CardFrameProfile> = {
	minion: { id: 'minion', statsLayout: 'attack-health', showCombatStats: true },
	spell: { id: 'spell', statsLayout: 'none', showCombatStats: false },
	weapon: { id: 'weapon', statsLayout: 'none', showCombatStats: false },
	support: { id: 'support', statsLayout: 'none', showCombatStats: false },
};

/**
 * Resolve the visual family independently from the card data model. The
 * frame, mana gem, rarity and art remain shared; only the lower composition
 * changes with the card role.
 */
export function getCardFrameProfile(type?: string | null): CardFrameProfile {
	switch (type) {
		case 'minion':
			return CARD_FRAME_PROFILES.minion;
		case 'spell':
			return CARD_FRAME_PROFILES.spell;
		case 'weapon':
			return CARD_FRAME_PROFILES.weapon;
		default:
			return CARD_FRAME_PROFILES.support;
	}
}

/**
 * CardFrame exposes theme classes for the types with a dedicated chrome
 * treatment. Unknown/legacy types keep the shared frame without inventing a
 * new visual class.
 */
export function toCardFrameType(type?: string | null): CardType {
	switch (type) {
		case 'minion':
		case 'spell':
		case 'weapon':
		case 'artifact':
		case 'armor':
		case 'hero':
			return type;
		default:
			return null;
	}
}

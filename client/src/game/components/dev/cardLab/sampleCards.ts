/**
 * Curated card samples for the lab.
 *
 * Real cards from the registry, picked one-per-rarity so the rarity
 * gradient is always visible. Each entry is a fallback — if the id
 * cannot be found in the registry at runtime, the lab shows a labelled
 * placeholder rather than crashing.
 *
 * `getCardArtPath` (artMapping.ts) is the canonical art resolver.
 */

import type { CardData } from '../../../types';
import type { NorseElement } from '../../../types/NorseTypes';
import { cardRegistry } from '../../../data/cardRegistry';

export interface SampleCard {
	id: number;
	fallbackName: string;
	fallbackRarity: 'common' | 'rare' | 'epic' | 'mythic';
	fallbackType: 'minion' | 'spell' | 'weapon' | 'hero' | 'secret' | 'location' | 'poker_spell' | 'artifact' | 'armor';
	fallbackElement: NorseElement;
}

export const RARITY_SAMPLES: SampleCard[] = [
	{ id: 1900, fallbackName: 'Niflheim Hatchling', fallbackRarity: 'common', fallbackType: 'minion', fallbackElement: 'water' },
	{ id: 6000, fallbackName: 'Spirit Echo', fallbackRarity: 'rare', fallbackType: 'spell', fallbackElement: 'light' },
	{ id: 4392, fallbackName: 'Echo of the Light God', fallbackRarity: 'epic', fallbackType: 'minion', fallbackElement: 'light' },
	{ id: 20011, fallbackName: "Al'Akir the Windlord", fallbackRarity: 'mythic', fallbackType: 'minion', fallbackElement: 'electric' },
];

const RARITY_INDEX = new Map<SampleCard['fallbackRarity'], SampleCard>(
	RARITY_SAMPLES.map((s) => [s.fallbackRarity, s]),
);

export function sampleForRarity(rarity: SampleCard['fallbackRarity']): SampleCard {
	return RARITY_INDEX.get(rarity) ?? RARITY_SAMPLES[0];
}

/**
 * Resolve a sample into a CardData-shaped record. Falls back to the
 * sample's own fallback fields if the id is not in the registry.
 */
export function resolveSample(sample: SampleCard): CardData {
	const found = cardRegistry.find((c: CardData) => c.id === sample.id);
	if (found) return found;
	return {
		id: sample.id,
		name: sample.fallbackName,
		type: sample.fallbackType,
		rarity: sample.fallbackRarity,
		manaCost: 0,
		description: '',
		collectible: false,
	} as unknown as CardData;
}

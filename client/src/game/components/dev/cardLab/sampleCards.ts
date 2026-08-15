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
	{ id: 4303, fallbackName: 'Root-Gnawer of Yggdrasil', fallbackRarity: 'mythic', fallbackType: 'minion', fallbackElement: 'grass' },
];

export interface FrameStudySample {
	id: 'minion' | 'spell' | 'weapon' | 'pet';
	label: string;
	statContract: string;
	description: string;
	sample: SampleCard;
}

/**
 * Real cards used by the frame comparison. Pets intentionally resolve as
 * minions: that is their canonical data type, while `petStage` carries the
 * evolution identity without changing the combat footer contract.
 */
export const FRAME_STUDY_SAMPLES: readonly FrameStudySample[] = [
	{
		id: 'minion',
		label: 'Minion',
		statContract: 'ATK · HP',
		description: 'Full combat footer with both lower stat sockets.',
		sample: { id: 4303, fallbackName: 'Root-Gnawer of Yggdrasil', fallbackRarity: 'mythic', fallbackType: 'minion', fallbackElement: 'grass' },
	},
	{
		id: 'spell',
		label: 'Spell',
		statContract: 'No combat stats',
		description: 'Keeps the shared mana and frame, without attack or health.',
		sample: { id: 5014, fallbackName: 'War Horn of Asgard', fallbackRarity: 'common', fallbackType: 'spell', fallbackElement: 'neutral' },
	},
	{
		id: 'weapon',
		label: 'Weapon',
		statContract: 'Weapon footer',
		description: 'Uses its own lower contract instead of minion attack/health sockets.',
		sample: { id: 5001, fallbackName: 'Muspelheim Flame', fallbackRarity: 'common', fallbackType: 'weapon', fallbackElement: 'fire' },
	},
	{
		id: 'pet',
		label: 'Pet',
		statContract: 'ATK · HP',
		description: 'A pet is a minion visually; evolution metadata stays independent.',
		sample: { id: 50040, fallbackName: 'Ember Cub', fallbackRarity: 'common', fallbackType: 'minion', fallbackElement: 'fire' },
	},
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

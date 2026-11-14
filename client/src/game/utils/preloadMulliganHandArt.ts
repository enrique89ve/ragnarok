import type { CardInstance } from '../types';
import type { NorseElement } from '../types/NorseTypes';
import { adaptRarity } from '@shared/schemas/rarity';
import { getCardArtPath } from './art/artMapping';
import { framePathFor } from './art/frameArt';
import { preloadImages } from './assetPreloader';

/** LoL-style hand reveal: warm art + frame PNG cache as soon as opening hand is dealt. */
export function preloadMulliganHandArt(hand: ReadonlyArray<CardInstance>): void {
	const paths = new Set<string>();
	for (const card of hand) {
		const art = getCardArtPath(card.card?.id);
		if (art) paths.add(art);
		const cardData = card.card as { rarity?: string; element?: NorseElement } | undefined;
		if (cardData?.rarity) {
			const rarity = adaptRarity(cardData.rarity);
			const element = cardData.element ?? 'neutral';
			paths.add(framePathFor(rarity, element, 'minimal-war-table-v4'));
		}
	}
	if (paths.size > 0) {
		preloadImages([...paths], { urgent: true });
	}
}

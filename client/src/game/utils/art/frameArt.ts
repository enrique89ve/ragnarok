/**
 * Frame PNG path resolver.
 *
 * Canonical frame PNGs live at `client/public/art/frames/concepts/`; the
 * legacy rarity/element exports remain available for frame fallback tests. This
 * module is the runtime-side mirror of both layouts and the single source of
 * truth for selecting the shared card silhouette.
 *
 * Invariant: every returned frame asset is a generated public PNG. If the
 * file is missing, `<CardFrame>` retains its existing visual
 * fallback behavior rather than blanking the card.
 */

import type { Rarity } from '@shared/schemas/rarity';
import type { NorseElement } from '../../types/NorseTypes';
import type { CardFrameAsset } from '../../components/card/types';

const FRAME_DIR = '/art/frames';
const FRAME_EXT = '.png';

export function framePathFor(
	rarity: Rarity,
	element: NorseElement,
	asset: CardFrameAsset = 'rarity-element',
): string {
	if (asset !== 'rarity-element') {
		return `${FRAME_DIR}/concepts/${asset}.png`;
	}
	return `${FRAME_DIR}/${rarity}/${element}${FRAME_EXT}`;
}

export function frameAssetForCardType(
	cardType?: string | null,
	useGameplayFrame = false,
): CardFrameAsset {
	const usesCleanFrame = cardType === 'spell' || cardType === 'weapon';
	if (useGameplayFrame) {
		return usesCleanFrame
			? 'minimal-war-table-v5-gameplay-clean'
			: 'minimal-war-table-v5-gameplay';
	}
	return usesCleanFrame ? 'minimal-war-table-v4-clean' : 'minimal-war-table-v4';
}

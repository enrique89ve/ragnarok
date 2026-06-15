/**
 * <CardFrame> — sizing table.
 *
 * Maps (shape, size) -> resolved pixel dimensions and aspect ratio.
 * NFT cards are rendered in three live combat contexts:
 * hand/opponent previews (`small`), battlefield minions (`medium`), and
 * large inspection/mulligan views (`large`/`preview`).
 *
 * The four `CardSize` buckets match what `SimpleCard` already ships,
 * so HandFan and SimpleBattlefield migrations don't need new sizes.
 */

import type { CardShape, CardSize, ResolvedCardDims } from './types';

interface SizeSpec {
	w: number;
	h: number;
}

/** Base NFT spec per CardSize. All NFT callers resolve to 7:10. */
const SIZE_SPECS: Record<CardSize, SizeSpec> = {
	small:   { w: 132, h: 189 },
	medium:  { w: 156, h: 223 },
	large:   { w: 220, h: 314 },
	preview: { w: 280, h: 400 },
};

/** Poker-shape size override. Poker cards were originally designed for
 *  100×140 (default PlayingCard) and 144×202 (PlayingCard.large) which
 *  differ from the SimpleCard sizing table. Lock those here so the
 *  poker shape stays visually consistent with the pre-existing PlayingCard
 *  chrome (corner rune weights, value font, etc.). */
const POKER_SIZE_SPECS: Record<CardSize, SizeSpec> = {
	small:   { w:  90, h: 130 },
	medium:  { w: 100, h: 140 },
	large:   { w: 144, h: 202 },
	preview: { w: 200, h: 280 },
};

/** Shape -> aspect ratio (canonical CSS aspect-ratio value).
 *  NFT frames use 7:10 to match exported 280x400/420x600 geometry.
 *  Poker remains 5:7 because it is a distinct playing-card surface. */
const SHAPE_ASPECT: Record<CardShape, string> = {
	portrait: '7 / 10',
	tile:     '7 / 10',
	row:      '7 / 10',
	hand:     '7 / 10',
	board:    '7 / 10',
	hero:     '7 / 10',
	poker:    '5 / 7',
};

/** Resolve final dimensions for the root <div>. */
export function resolveCardDims(input: {
	shape: CardShape;
	size: CardSize;
	overrideWidth?: number;
	overrideHeight?: number;
}): ResolvedCardDims {
	const { shape, size, overrideWidth, overrideHeight } = input;

	if (overrideWidth && overrideHeight) {
		return {
			width: overrideWidth,
			height: overrideHeight,
			aspectRatio: `${overrideWidth} / ${overrideHeight}`,
			borderRadius: 12,
		};
	}

	const base = shape === 'poker' ? POKER_SIZE_SPECS[size] : SIZE_SPECS[size];
	const aspect = SHAPE_ASPECT[shape];

	return {
		width: base.w,
		height: base.h,
		aspectRatio: aspect,
		borderRadius: base.w <= 100 ? 8 : base.w <= 140 ? 12 : 16,
	};
}

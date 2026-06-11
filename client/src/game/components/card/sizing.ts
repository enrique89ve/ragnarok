/**
 * <CardFrame> — sizing table.
 *
 * Maps (shape, size) → resolved pixel dimensions and aspect ratio.
 * Centralizes the 280×400 hardcode from the lab `FrameStatic.tsx` and
 * the 130×185 / 180×280 sizes from `SimpleCard.css`.
 *
 * The four `CardSize` buckets match what `SimpleCard` already ships,
 * so HandFan and SimpleBattlefield migrations don't need new sizes.
 */

import type { CardShape, CardSize, ResolvedCardDims } from './types';

interface SizeSpec {
	w: number;
	h: number;
}

/** Base spec per CardSize. Mirrors SimpleCard.css fixed widths/heights. */
const SIZE_SPECS: Record<CardSize, SizeSpec> = {
	small:   { w:  90, h: 130 },
	medium:  { w: 130, h: 185 },
	large:   { w: 200, h: 280 },
	preview: { w: 280, h: 400 },
};

/** Shape → aspect ratio (canonical CSS aspect-ratio value).
 *  `tile` and `portrait` are 3:4, everything else is 5:7. */
const SHAPE_ASPECT: Record<CardShape, string> = {
	portrait: '3 / 4',
	tile:     '3 / 4',
	row:      '5 / 7',
	hand:     '5 / 7',
	board:    '5 / 7',
	hero:     '5 / 7',
	poker:    '5 / 7',
};

/** Force a 3:4 box from a 5:7 base spec. Width stays, height grows. */
function to3by4(spec: SizeSpec): SizeSpec {
	return { w: spec.w, h: Math.round((spec.w * 4) / 3) };
}

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

	const base = SIZE_SPECS[size];
	const aspect = SHAPE_ASPECT[shape];
	const spec = aspect === '3 / 4' ? to3by4(base) : base;

	return {
		width: spec.w,
		height: spec.h,
		aspectRatio: aspect,
		borderRadius: spec.w <= 100 ? 8 : spec.w <= 140 ? 12 : 16,
	};
}

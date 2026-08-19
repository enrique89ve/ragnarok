export type ChromeFaqRect = {
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly left: number;
	readonly width: number;
	readonly height: number;
};

export type ChromeFaqDockSide = 'top' | 'right' | 'left' | 'bottom';

export type ChromeFaqDock = {
	readonly left: number;
	readonly top: number;
	readonly side: ChromeFaqDockSide;
};

type ViewportBox = {
	readonly width: number;
	readonly height: number;
};

type TooltipBox = {
	readonly width: number;
	readonly height: number;
};

const DEFAULT_GAP = 10;
const DEFAULT_EDGE = 12;

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), Math.max(min, max));

const markBand = (mark: ChromeFaqRect, card: ChromeFaqRect): 'top' | 'middle' | 'bottom' => {
	const relY = mark.top + mark.height / 2 - card.top;
	const third = card.height / 3;
	if (relY < third) return 'top';
	if (relY > third * 2) return 'bottom';
	return 'middle';
};

const preferredSides = (
	band: 'top' | 'middle' | 'bottom',
	spaceRight: number,
	spaceLeft: number,
): readonly ChromeFaqDockSide[] => {
	if (band === 'top') return ['top', 'right', 'left', 'bottom'];
	if (band === 'bottom') return ['bottom', 'right', 'left', 'top'];
	return spaceRight >= spaceLeft
		? ['right', 'left', 'top', 'bottom']
		: ['left', 'right', 'top', 'bottom'];
};

const placeOnSide = (
	side: ChromeFaqDockSide,
	mark: ChromeFaqRect,
	card: ChromeFaqRect,
	tooltip: TooltipBox,
	gap: number,
): { left: number; top: number } => {
	const markMidY = mark.top + mark.height / 2;
	const markMidX = mark.left + mark.width / 2;
	if (side === 'top') {
		return { left: markMidX - tooltip.width / 2, top: card.top - gap - tooltip.height };
	}
	if (side === 'bottom') {
		return { left: markMidX - tooltip.width / 2, top: card.bottom + gap };
	}
	if (side === 'right') {
		return { left: card.right + gap, top: markMidY - tooltip.height / 2 };
	}
	return { left: card.left - gap - tooltip.width, top: markMidY - tooltip.height / 2 };
};

const fitsViewport = (
	box: { left: number; top: number },
	tooltip: TooltipBox,
	viewport: ViewportBox,
	edge: number,
): boolean =>
	box.left >= edge &&
	box.top >= edge &&
	box.left + tooltip.width <= viewport.width - edge &&
	box.top + tooltip.height <= viewport.height - edge;

export const resolveChromeFaqDock = (input: {
	readonly mark: ChromeFaqRect;
	readonly card: ChromeFaqRect;
	readonly viewport: ViewportBox;
	readonly tooltip: TooltipBox;
	readonly gap?: number;
	readonly edge?: number;
}): ChromeFaqDock => {
	const gap = input.gap ?? DEFAULT_GAP;
	const edge = input.edge ?? DEFAULT_EDGE;
	const band = markBand(input.mark, input.card);
	const sides = preferredSides(
		band,
		input.viewport.width - input.card.right,
		input.card.left,
	);
	for (const side of sides) {
		const raw = placeOnSide(side, input.mark, input.card, input.tooltip, gap);
		if (fitsViewport(raw, input.tooltip, input.viewport, edge)) {
			return { left: raw.left, top: raw.top, side };
		}
	}
	const fallback = placeOnSide(sides[0] ?? 'right', input.mark, input.card, input.tooltip, gap);
	return {
		left: clamp(fallback.left, edge, input.viewport.width - input.tooltip.width - edge),
		top: clamp(fallback.top, edge, input.viewport.height - input.tooltip.height - edge),
		side: sides[0] ?? 'right',
	};
};

import type { CardSize, CardStatsMode } from './types';

export type CardFrameLayoutSurface =
	| 'collection'
	| 'gameplay'
	| 'battlefield'
	| 'compact'
	| 'mulligan'
	| 'preview';

export type CardFrameLayoutAdapter = {
	surface: CardFrameLayoutSurface;
	showDescriptionText: boolean;
	showTribeLine: boolean;
	showKeywords: boolean;
	keywordLimit: number | null;
	keywordLabelMode: 'full' | 'compact';
};

type ResolveCardFrameLayoutAdapterInput = {
	size: CardSize;
	statsMode: CardStatsMode;
	showDescription: boolean;
	surface?: CardFrameLayoutSurface;
};

const resolveSurface = ({
	size,
	statsMode,
	surface,
}: Pick<ResolveCardFrameLayoutAdapterInput, 'size' | 'statsMode' | 'surface'>): CardFrameLayoutSurface => {
	if (surface !== undefined) return surface;
	if (size === 'preview') return 'preview';
	if (statsMode === 'battlefield') return 'battlefield';
	if (size === 'small') return 'compact';
	if (size === 'large') return 'mulligan';
	return 'gameplay';
};

export const resolveSimpleCardFrameLayoutAdapter = (
	input: ResolveCardFrameLayoutAdapterInput,
): CardFrameLayoutAdapter => {
	const surface = resolveSurface(input);
	const compactSurface = surface === 'battlefield' || surface === 'compact';
	const collectionSurface = surface === 'collection' || surface === 'mulligan';

	return {
		surface,
		showDescriptionText: input.showDescription && !compactSurface && !collectionSurface,
		showTribeLine: !compactSurface && !collectionSurface,
		showKeywords: !collectionSurface,
		keywordLimit: compactSurface ? 1 : surface === 'gameplay' ? 2 : null,
		keywordLabelMode: compactSurface ? 'compact' : 'full',
	};
};

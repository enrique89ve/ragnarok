import type { CardFrameAsset, CardFrameRender, CardSize, CardStatsMode } from './types';
import { frameAssetForCardType } from '../../utils/art/frameArt';

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
	showName: boolean;
	showKeywords: boolean;
	keywordLimit: number | null;
	keywordLabelMode: 'full' | 'compact';
	frameRender: CardFrameRender;
	frameAsset: CardFrameAsset;
};

type ResolveCardFrameLayoutAdapterInput = {
	size: CardSize;
	statsMode: CardStatsMode;
	showDescription: boolean;
	cardType?: string | null;
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
	const battlefieldSurface = surface === 'battlefield';
	const compactSurface = surface === 'battlefield' || surface === 'compact';
	const collectionSurface = surface === 'collection' || surface === 'mulligan';
	const useGameplayFrame = surface === 'gameplay' || surface === 'battlefield' || surface === 'compact';

	return {
		surface,
		showDescriptionText: input.showDescription && !battlefieldSurface && !compactSurface && !collectionSurface,
		showTribeLine: !compactSurface && !collectionSurface,
		showName: !battlefieldSurface && !compactSurface,
		showKeywords: !collectionSurface,
		keywordLimit: compactSurface || surface === 'gameplay' ? 2 : null,
		keywordLabelMode: compactSurface ? 'compact' : 'full',
		frameRender: 'png',
		frameAsset: frameAssetForCardType(input.cardType, useGameplayFrame),
	};
};

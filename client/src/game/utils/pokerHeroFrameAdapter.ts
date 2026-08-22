import type { CSSProperties } from 'react';
import {
	createResponsiveCornerVariables,
	type PokerHeroCornerVariables,
	type PokerHeroFusionComposition,
} from './pokerHeroComposition';

export const POKER_HERO_FRAME_SCHEMA = 'norse-poker-hero-frame/v2' as const;

export type PokerHeroStage = Readonly<{
	width: number;
	height: number;
}>;

export type PokerHeroArtWindow = Readonly<{
	x: number;
	y: number;
	width: number;
	height: number;
}>;

export type PokerHeroPortraitFit = Readonly<{
	mode: 'cover';
	focalPoint: Readonly<{ x: number; y: number }>;
	zoom: number;
}>;

export type PokerHeroPortraitProfile = Readonly<{
	src: string;
	intrinsicSize?: PokerHeroStage;
	fit: PokerHeroPortraitFit;
}>;

export type PokerHeroFrameKit = Readonly<{
	schema: typeof POKER_HERO_FRAME_SCHEMA;
	stage: PokerHeroStage;
	artWindow: PokerHeroArtWindow;
	portraitDefaults: PokerHeroPortraitFit;
	composition: PokerHeroFusionComposition;
}>;

export type PokerHeroFrameSurfaceStyle = CSSProperties & PokerHeroCornerVariables & Record<
	| '--poker-hero-stage-aspect'
	| '--poker-hero-frame-layer-x'
	| '--poker-hero-frame-layer-y'
	| '--poker-hero-frame-layer-width'
	| '--poker-hero-frame-layer-height'
	| '--poker-hero-art-window-x'
	| '--poker-hero-art-window-y'
	| '--poker-hero-art-window-width'
	| '--poker-hero-art-window-height',
	string
>;

export type PokerHeroFrameRenderPlan = Readonly<{
	stageAspectRatio: string;
	surfaceStyle: PokerHeroFrameSurfaceStyle;
	portraitStyle: CSSProperties;
}>;

const DEFAULT_ART_WINDOW: PokerHeroArtWindow = {
	// Measured from the transparent inner opening of player-v2.png.
	x: 11.1,
	y: 7.1,
	width: 77.7,
	height: 85.8,
};

const DEFAULT_PORTRAIT_FIT: PokerHeroPortraitFit = {
	mode: 'cover',
	focalPoint: { x: 50, y: 43 },
	zoom: 1.1,
};

const assertCanonicalStage = ({ width, height }: PokerHeroStage): void => {
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		throw new Error('Poker hero frame stage dimensions must be finite positive numbers.');
	}
	if (Math.abs((width / height) - 0.75) > 0.001) {
		throw new Error(`Poker hero frame stage must preserve the canonical 3:4 ratio; received ${width}x${height}.`);
	}
};

const assertPercent = (value: number, label: string): void => {
	if (!Number.isFinite(value) || value < 0 || value > 100) {
		throw new Error(`${label} must be a finite percentage between 0 and 100.`);
	}
};

const assertArtWindow = ({ x, y, width, height }: PokerHeroArtWindow): void => {
	assertPercent(x, 'Poker hero art window x');
	assertPercent(y, 'Poker hero art window y');
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		throw new Error('Poker hero art window dimensions must be finite positive percentages.');
	}
	if (x + width > 100 || y + height > 100) {
		throw new Error('Poker hero art window must remain inside the canonical stage.');
	}
};

const assertVisibleBounds = (
	{ x, y, width, height }: Readonly<{ x: number; y: number; width: number; height: number }>,
	stage: PokerHeroStage,
): void => {
	if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0) {
		throw new Error('Poker hero frame visible bounds must contain finite positive dimensions and non-negative offsets.');
	}
	if (x + width > stage.width || y + height > stage.height) {
		throw new Error('Poker hero frame visible bounds must remain inside the canonical stage.');
	}
};

const cropPercentRange = (
	startPercent: number,
	sizePercent: number,
	visibleStart: number,
	visibleSize: number,
	stageSize: number,
): Readonly<{ start: number; size: number }> => ({
	start: ((startPercent / 100) * stageSize - visibleStart) / visibleSize * 100,
	size: ((sizePercent / 100) * stageSize) / visibleSize * 100,
});

const assertPortraitProfile = ({ src, intrinsicSize, fit }: PokerHeroPortraitProfile): void => {
	if (!src.trim()) throw new Error('Poker hero portrait source must not be empty.');
	if (intrinsicSize) {
		const { width, height } = intrinsicSize;
		if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
			throw new Error('Poker hero portrait dimensions must be finite positive numbers.');
		}
	}
	assertPercent(fit.focalPoint.x, 'Poker hero portrait focal x');
	assertPercent(fit.focalPoint.y, 'Poker hero portrait focal y');
	if (!Number.isFinite(fit.zoom) || fit.zoom <= 0) {
		throw new Error('Poker hero portrait zoom must be a finite positive number.');
	}
};

export function adaptPokerHeroComposition(composition: PokerHeroFusionComposition): PokerHeroFrameKit {
	const stage = { width: composition.baseFrame.width, height: composition.baseFrame.height };
	assertCanonicalStage(stage);
	assertVisibleBounds(composition.baseFrame.visibleBounds, stage);
	return {
		schema: POKER_HERO_FRAME_SCHEMA,
		stage,
		artWindow: DEFAULT_ART_WINDOW,
		portraitDefaults: DEFAULT_PORTRAIT_FIT,
		composition,
	};
}

export function createPokerHeroPortraitProfile(
	src: string,
	overrides: Readonly<{
		intrinsicSize?: PokerHeroStage;
		fit?: Partial<Omit<PokerHeroPortraitFit, 'focalPoint'>> & {
			focalPoint?: Partial<PokerHeroPortraitFit['focalPoint']>;
		};
	}> = {},
): PokerHeroPortraitProfile {
	const fit = overrides.fit;
	const profile: PokerHeroPortraitProfile = {
		src,
		...(overrides.intrinsicSize ? { intrinsicSize: overrides.intrinsicSize } : {}),
		fit: {
			mode: 'cover',
			zoom: fit?.zoom ?? DEFAULT_PORTRAIT_FIT.zoom,
			focalPoint: {
				x: fit?.focalPoint?.x ?? DEFAULT_PORTRAIT_FIT.focalPoint.x,
				y: fit?.focalPoint?.y ?? DEFAULT_PORTRAIT_FIT.focalPoint.y,
			},
		},
	};
	assertPortraitProfile(profile);
	return profile;
}

export function createPokerHeroFrameRenderPlan(
	kit: PokerHeroFrameKit,
	portrait: PokerHeroPortraitProfile,
): PokerHeroFrameRenderPlan {
	assertCanonicalStage(kit.stage);
	const { artWindow, composition, stage } = kit;
	assertArtWindow(artWindow);
	assertPortraitProfile(portrait);
	const visibleBounds = composition.baseFrame.visibleBounds;
	const croppedArtX = cropPercentRange(
		artWindow.x,
		artWindow.width,
		visibleBounds.x,
		visibleBounds.width,
		stage.width,
	);
	const croppedArtY = cropPercentRange(
		artWindow.y,
		artWindow.height,
		visibleBounds.y,
		visibleBounds.height,
		stage.height,
	);
	const cornerVariables = createResponsiveCornerVariables(
		composition.corners.left.transform,
		composition.corners.right.transform,
		stage,
	);
	const surfaceStyle: PokerHeroFrameSurfaceStyle = {
		'--poker-hero-stage-aspect': `${stage.width} / ${stage.height}`,
		'--poker-hero-frame-layer-x': `${-(visibleBounds.x / visibleBounds.width) * 100}%`,
		'--poker-hero-frame-layer-y': `${-(visibleBounds.y / visibleBounds.height) * 100}%`,
		'--poker-hero-frame-layer-width': `${(stage.width / visibleBounds.width) * 100}%`,
		'--poker-hero-frame-layer-height': `${(stage.height / visibleBounds.height) * 100}%`,
		'--poker-hero-art-window-x': `${croppedArtX.start}%`,
		'--poker-hero-art-window-y': `${croppedArtY.start}%`,
		'--poker-hero-art-window-width': `${croppedArtX.size}%`,
		'--poker-hero-art-window-height': `${croppedArtY.size}%`,
		...cornerVariables,
	};

	return {
		stageAspectRatio: `${stage.width} / ${stage.height}`,
		surfaceStyle,
		portraitStyle: {
			objectFit: portrait.fit.mode,
			objectPosition: `${portrait.fit.focalPoint.x}% ${portrait.fit.focalPoint.y}%`,
			transform: `scale(${portrait.fit.zoom})`,
			transformOrigin: `${portrait.fit.focalPoint.x}% ${portrait.fit.focalPoint.y}%`,
		},
	};
}

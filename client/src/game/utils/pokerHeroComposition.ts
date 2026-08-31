export const POKER_HERO_FRAME_SIZE = {
	width: 1086,
	height: 1448,
} as const;

/** Alpha-visible bounds measured from player-v2.webp. The transparent export
 * bleed is cropped at render time so the visible frame fills the 3:4 Hero
 * stage without changing the board-level footprint. */
export const POKER_HERO_FRAME_VISIBLE_BOUNDS = {
	x: 79,
	y: 61,
	width: 927,
	height: 1327,
} as const;

export const POKER_HERO_FRAME_ASSET = '/ui/poker-hero-frames/player-v2.webp';

export const POKER_HERO_CORNER_ASSETS = {
	left: '/ui/poker-hero-corners/top-left-v2.webp',
	right: '/ui/poker-hero-corners/top-right-v2.webp',
} as const;

export type HeroSide = 'player' | 'opponent';
export type PokerHeroCornerSide = 'left' | 'right';
export type IdentityOrnamentKey = 'crest' | 'side' | 'seal' | 'plate' | 'relic';

export interface IdentityOrnamentAsset {
	id: IdentityOrnamentKey;
	label: string;
	src: string;
	width: number;
	height: number;
}

export interface IdentityOrnamentTransform {
	enabled: boolean;
	x: number;
	y: number;
	scale: number;
	rotation: number;
}

export type IdentityOrnamentTransforms = Record<IdentityOrnamentKey, IdentityOrnamentTransform>;

export const IDENTITY_ORNAMENT_ASSETS: Record<HeroSide, readonly IdentityOrnamentAsset[]> = {
	player: [
		{ id: 'crest', label: 'Forge crest', src: '/ui/poker-hero-ornaments/player-crest-v1.webp', width: 1634, height: 645 },
		{ id: 'side', label: 'Flame side plate', src: '/ui/poker-hero-ornaments/player-side-v1.webp', width: 323, height: 1536 },
		{ id: 'seal', label: 'Ember seal', src: '/ui/poker-hero-ornaments/player-seal-v1.webp', width: 1490, height: 843 },
		{ id: 'plate', label: 'Straight ember plate', src: '/ui/poker-hero-ornaments/player-plate-v1.webp', width: 2165, height: 207 },
		{ id: 'relic', label: 'Forge relic', src: '/ui/poker-hero-ornaments/player-relic-v1.webp', width: 591, height: 1255 },
	],
	opponent: [
		{ id: 'crest', label: 'Rune crest', src: '/ui/poker-hero-ornaments/enemy-crest-v1.webp', width: 1774, height: 791 },
		{ id: 'seal', label: 'Frost seal', src: '/ui/poker-hero-ornaments/enemy-seal-v1.webp', width: 1373, height: 910 },
		{ id: 'plate', label: 'Straight rune plate', src: '/ui/poker-hero-ornaments/enemy-plate-v1.webp', width: 2128, height: 232 },
		{ id: 'relic', label: 'Rune relic', src: '/ui/poker-hero-ornaments/enemy-relic-v1.webp', width: 626, height: 1518 },
	],
};

export const DEFAULT_IDENTITY_TRANSFORMS: Record<HeroSide, IdentityOrnamentTransforms> = {
	player: {
		crest: { enabled: true, x: 50, y: 8, scale: 26, rotation: 0 },
		side: { enabled: false, x: 8, y: 49, scale: 15, rotation: 0 },
		seal: { enabled: true, x: 50, y: 88, scale: 23, rotation: 0 },
		plate: { enabled: false, x: 50, y: 15, scale: 82, rotation: 0 },
		relic: { enabled: false, x: 84, y: 58, scale: 21, rotation: 0 },
	},
	opponent: {
		crest: { enabled: true, x: 50, y: 8, scale: 27, rotation: 0 },
		side: { enabled: false, x: 92, y: 49, scale: 15, rotation: 0 },
		seal: { enabled: true, x: 50, y: 88, scale: 23, rotation: 0 },
		plate: { enabled: false, x: 50, y: 15, scale: 82, rotation: 0 },
		relic: { enabled: false, x: 16, y: 58, scale: 21, rotation: 0 },
	},
};

export interface PokerHeroFusionComposition {
	version: 1;
	coordinateSpace: 'stage-percent-centered';
	cornerOffsetSpace: 'base-frame-pixels';
	baseFrame: {
		src: string;
		width: number;
		height: number;
		visibleBounds: Readonly<{ x: number; y: number; width: number; height: number }>;
	};
	corners: Record<PokerHeroCornerSide, { enabled: boolean; asset: string; transform: BaseFrameCornerTransform }>;
	lightLayer: { enabled: boolean };
	identity: Record<HeroSide, {
		selected: IdentityOrnamentKey;
		layers: Array<{
			id: IdentityOrnamentKey;
			src: string;
			enabled: boolean;
			transform: IdentityOrnamentTransform;
		}>;
	}>;
}

const createIdentityLayers = (
	side: HeroSide,
	overrides: Partial<Record<IdentityOrnamentKey, Partial<IdentityOrnamentTransform>>>,
) => IDENTITY_ORNAMENT_ASSETS[side].map((asset) => {
	const transform = { ...DEFAULT_IDENTITY_TRANSFORMS[side][asset.id], ...overrides[asset.id] };
	return { id: asset.id, src: asset.src, enabled: transform.enabled, transform };
});

/** Approved v1 board composition from the fusion lab. */
export const POKER_HERO_BOARD_COMPOSITION: PokerHeroFusionComposition = {
	version: 1,
	coordinateSpace: 'stage-percent-centered',
	cornerOffsetSpace: 'base-frame-pixels',
	baseFrame: {
		src: POKER_HERO_FRAME_ASSET,
		...POKER_HERO_FRAME_SIZE,
		visibleBounds: POKER_HERO_FRAME_VISIBLE_BOUNDS,
	},
	corners: {
		left: { enabled: true, asset: POKER_HERO_CORNER_ASSETS.left, transform: { scale: 14, x: 48, y: 48 } },
		right: { enabled: true, asset: POKER_HERO_CORNER_ASSETS.right, transform: { scale: 14, x: 48, y: 48 } },
	},
	lightLayer: { enabled: false },
	identity: {
		player: {
			selected: 'side',
			layers: createIdentityLayers('player', {
				crest: { enabled: true, x: 50, y: 6, scale: 23, rotation: 0 },
				side: { enabled: true, x: 91, y: 25, scale: 8, rotation: 0 },
				seal: { enabled: false },
				plate: { enabled: false },
				relic: { enabled: false, x: 74 },
			}),
		},
		opponent: {
			selected: 'relic',
			layers: createIdentityLayers('opponent', {
				crest: { enabled: true, x: 50, y: 6, scale: 22, rotation: 0 },
				seal: { enabled: false },
				plate: { enabled: false },
				relic: { enabled: true, x: 91, y: 70, scale: 13, rotation: -180 },
			}),
		},
	},
};

export interface BaseFrameCornerTransform {
	scale: number;
	x: number;
	y: number;
}

export interface CenteredStageTransform {
	x: number;
	y: number;
	scale: number;
	rotation: number;
}

export type PokerHeroCornerVariables = Record<
	| '--corner-left-scale'
	| '--corner-left-x'
	| '--corner-left-y'
	| '--corner-right-scale'
	| '--corner-right-x'
	| '--corner-right-y',
	string
>;

/**
 * Converts an offset authored against the 1086x1448 base frame into a
 * percentage of the responsive stage. This keeps corner insets proportional
 * when the card is rendered at a different CSS size.
 */
export function baseFramePixelsToStagePercent(
	value: number,
	axis: 'x' | 'y',
	frameSize: Readonly<{ width: number; height: number }> = POKER_HERO_FRAME_SIZE,
): number {
	const baseSize = axis === 'x' ? frameSize.width : frameSize.height;
	return (value / baseSize) * 100;
}

export function createResponsiveCornerVariables(
	left: BaseFrameCornerTransform,
	right: BaseFrameCornerTransform,
	frameSize: Readonly<{ width: number; height: number }> = POKER_HERO_FRAME_SIZE,
): PokerHeroCornerVariables {
	return {
		'--corner-left-scale': `${left.scale / 100}`,
		'--corner-left-x': `${baseFramePixelsToStagePercent(left.x, 'x', frameSize)}%`,
		'--corner-left-y': `${baseFramePixelsToStagePercent(left.y, 'y', frameSize)}%`,
		'--corner-right-scale': `${right.scale / 100}`,
		'--corner-right-x': `${baseFramePixelsToStagePercent(right.x, 'x', frameSize)}%`,
		'--corner-right-y': `${baseFramePixelsToStagePercent(right.y, 'y', frameSize)}%`,
	};
}

export function createCenteredStageVariables(transform: CenteredStageTransform): Record<string, string> {
	return {
		'--ornament-x': `${transform.x}%`,
		'--ornament-y': `${transform.y}%`,
		'--ornament-size': `${transform.scale}%`,
		'--ornament-rotation': `${transform.rotation}deg`,
	};
}

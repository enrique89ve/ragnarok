import type { CSSProperties } from 'react';

export const POKER_VIEWPORT_ZONE_IDS = [
	'turnBadge',
	'topHud',
	'hourglass',
	'attackModeBanner',
	'battleIntel',
	'opponentHero',
	'opponentHeroCards',
	'opponentHand',
	'communityCards',
	'battlefield',
	'opponentBattlefieldCards',
	'playerBattlefieldCards',
	'playerHero',
	'playerHeroCards',
	'playerHand',
	'bettingControls',
	'wagerPanel',
	'deckCounters',
	'battleLog',
	'vfxFocus',
] as const;

export type PokerViewportZoneId = typeof POKER_VIEWPORT_ZONE_IDS[number];
export type PokerViewportLayer = 'game' | 'hud' | 'vfx';
export type PokerViewportCssVarName = `--poker-zone-${PokerViewportZoneId}-${'x' | 'y' | 'w' | 'h' | 'rot'}`
	| '--poker-reference-width'
	| '--poker-reference-height'
	| '--poker-layout-grid';

export interface PokerViewportZone {
	readonly layer: PokerViewportLayer;
	readonly label: string;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly rotation: number;
}

export type PokerViewportZones = Record<PokerViewportZoneId, PokerViewportZone>;
export type PokerViewportLayoutStyle = CSSProperties & Partial<Record<PokerViewportCssVarName, string>>;

export interface PokerViewportLayout {
	readonly schema: 'norse-poker-layout-draft/v1';
	readonly reference: {
		readonly width: number;
		readonly height: number;
		readonly unit: 'px';
	};
	readonly grid: {
		readonly size: number;
		readonly unit: 'px';
	};
	readonly safeArea: {
		readonly label: 'C';
		readonly safeX: number;
		readonly safeY: number;
		readonly maxScale: number;
	};
	readonly source: {
		readonly preset: 'balanced';
		readonly layerOrder: 'normal';
		readonly selectedZone: PokerViewportZoneId;
		readonly normalized: true;
	};
	readonly groups: {
		readonly battlefield: {
			readonly surface: PokerViewportZoneId;
			readonly rows: readonly PokerViewportZoneId[];
		};
		readonly layers: Record<PokerViewportLayer, readonly PokerViewportZoneId[]>;
	};
	readonly zones: PokerViewportZones;
}

export const POKER_VIEWPORT_LAYOUT = {
	schema: 'norse-poker-layout-draft/v1',
	reference: {
		width: 1920,
		height: 1080,
		unit: 'px',
	},
	grid: {
		size: 8,
		unit: 'px',
	},
	safeArea: {
		label: 'C',
		safeX: 32,
		safeY: 28,
		maxScale: 1.08,
	},
	source: {
		preset: 'balanced',
		layerOrder: 'normal',
		selectedZone: 'opponentBattlefieldCards',
		normalized: true,
	},
	groups: {
		battlefield: {
			surface: 'battlefield',
			rows: ['opponentBattlefieldCards', 'playerBattlefieldCards'],
		},
		layers: {
			game: [
				'opponentHero',
				'opponentHeroCards',
				'opponentHand',
				'communityCards',
				'battlefield',
				'opponentBattlefieldCards',
				'playerBattlefieldCards',
				'playerHero',
				'playerHeroCards',
				'playerHand',
			],
			hud: [
				'turnBadge',
				'topHud',
				'hourglass',
				'attackModeBanner',
				'battleIntel',
				'bettingControls',
				'wagerPanel',
				'deckCounters',
				'battleLog',
			],
			vfx: ['vfxFocus'],
		},
	},
	zones: {
		turnBadge: {
			layer: 'hud',
			label: 'Persistent turn badge',
			x: 1352,
			y: 968,
			width: 152,
			height: 48,
			rotation: 0,
		},
		topHud: {
			layer: 'hud',
			label: 'Top turn / phase ribbon',
			x: 584,
			y: 48,
			width: 872,
			height: 72,
			rotation: 0,
		},
		hourglass: {
			layer: 'hud',
			label: 'Hourglass timer',
			x: 936,
			y: 144,
			width: 48,
			height: 96,
			rotation: 0,
		},
		attackModeBanner: {
			layer: 'hud',
			label: 'Attack mode targeting banner',
			x: 696,
			y: 152,
			width: 576,
			height: 56,
			rotation: 0,
		},
		battleIntel: {
			layer: 'hud',
			label: 'Battle intel chip',
			x: 256,
			y: 48,
			width: 240,
			height: 56,
			rotation: 0,
		},
		opponentHero: {
			layer: 'game',
			label: 'Opponent hero card',
			x: 56,
			y: 72,
			width: 192,
			height: 272,
			rotation: 0,
		},
		opponentHeroCards: {
			layer: 'game',
			label: 'Opponent hero pocket cards',
			x: 88,
			y: 320,
			width: 128,
			height: 72,
			rotation: -6,
		},
		opponentHand: {
			layer: 'game',
			label: 'Opponent poker hand / hidden cards',
			x: 256,
			y: 160,
			width: 296,
			height: 88,
			rotation: 0,
		},
		communityCards: {
			layer: 'game',
			label: 'Community poker board',
			x: 48,
			y: 488,
			width: 456,
			height: 104,
			rotation: 0,
		},
		battlefield: {
			layer: 'game',
			label: 'Battlefield board surface',
			x: 608,
			y: 252,
			width: 752,
			height: 456,
			rotation: 0,
		},
		opponentBattlefieldCards: {
			layer: 'game',
			label: 'Opponent minion cards in battlefield',
			x: 632,
			y: 296,
			width: 624,
			height: 176,
			rotation: 0,
		},
		playerBattlefieldCards: {
			layer: 'game',
			label: 'Player minion cards in battlefield',
			x: 704,
			y: 512,
			width: 624,
			height: 176,
			rotation: 0,
		},
		playerHero: {
			layer: 'game',
			label: 'Player hero card',
			x: 56,
			y: 736,
			width: 208,
			height: 288,
			rotation: 0,
		},
		playerHeroCards: {
			layer: 'game',
			label: 'Player hero pocket cards',
			x: 88,
			y: 680,
			width: 152,
			height: 96,
			rotation: -8,
		},
		playerHand: {
			layer: 'game',
			label: 'Player card hand fan',
			x: 264,
			y: 728,
			width: 640,
			height: 192,
			rotation: 0,
		},
		bettingControls: {
			layer: 'hud',
			label: 'Bet buttons and action controls',
			x: 280,
			y: 928,
			width: 608,
			height: 96,
			rotation: 0,
		},
		wagerPanel: {
			layer: 'hud',
			label: 'Battle cadence / wager panel',
			x: 1448,
			y: 240,
			width: 416,
			height: 264,
			rotation: 0,
		},
		deckCounters: {
			layer: 'hud',
			label: 'Enemy and player deck counters',
			x: 1616,
			y: 48,
			width: 248,
			height: 144,
			rotation: 0,
		},
		battleLog: {
			layer: 'hud',
			label: 'Battle log dock',
			x: 1576,
			y: 792,
			width: 288,
			height: 232,
			rotation: 0,
		},
		vfxFocus: {
			layer: 'vfx',
			label: 'VFX interaction band',
			x: 616,
			y: 280,
			width: 824,
			height: 416,
			rotation: 0,
		},
	},
} as const satisfies PokerViewportLayout;

export const POKER_VIEWPORT_SAFE_AREA = POKER_VIEWPORT_LAYOUT.safeArea;

const toPixels = (value: number): string => `${value}px`;
const toDegrees = (value: number): string => `${value}deg`;

export function buildPokerViewportLayoutStyle(layout: PokerViewportLayout = POKER_VIEWPORT_LAYOUT): PokerViewportLayoutStyle {
	const style: PokerViewportLayoutStyle = {
		'--poker-reference-width': toPixels(layout.reference.width),
		'--poker-reference-height': toPixels(layout.reference.height),
		'--poker-layout-grid': toPixels(layout.grid.size),
	};

	for (const zoneId of POKER_VIEWPORT_ZONE_IDS) {
		const zone = layout.zones[zoneId];
		style[`--poker-zone-${zoneId}-x`] = toPixels(zone.x);
		style[`--poker-zone-${zoneId}-y`] = toPixels(zone.y);
		style[`--poker-zone-${zoneId}-w`] = toPixels(zone.width);
		style[`--poker-zone-${zoneId}-h`] = toPixels(zone.height);
		style[`--poker-zone-${zoneId}-rot`] = toDegrees(zone.rotation);
	}

	return style;
}

export const POKER_VIEWPORT_LAYOUT_STYLE = buildPokerViewportLayoutStyle();

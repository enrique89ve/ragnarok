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
	'opponentPokerSpellTray',
	'playerPokerSpellTray',
	'wagerActivation',
] as const;

export type PokerViewportZoneId = typeof POKER_VIEWPORT_ZONE_IDS[number];
export type PokerViewportLayer = 'game' | 'hud' | 'vfx';
export type PokerViewportCssVarName = `--poker-zone-${PokerViewportZoneId}-${'x' | 'y' | 'w' | 'h' | 'rot'}`
	| '--poker-reference-width'
	| '--poker-reference-height'
	| '--poker-layout-grid'
	| '--poker-bottom-rail-y'
	| '--poker-bottom-rail-gap'
	| '--poker-player-hand-card-rise'
	| '--poker-betting-controls-drop'
	| '--poker-hud-badge-height'
	| '--poker-gold-300'
	| '--poker-gold-500'
	| '--poker-bifrost-300'
	| '--poker-surface-overlay-deep'
	| '--poker-space-3'
	| '--poker-space-7'
	| '--poker-space-9'
	| '--poker-space-10'
	| '--poker-radius-full'
	| '--poker-z-hover'
	| '--poker-color-gold'
	| '--poker-hero-card-width';

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

const POKER_BOTTOM_RAIL_Y = 1024;
const TURN_BADGE_HEIGHT = 48;
const OPPONENT_HERO_Y = 56;
const OPPONENT_HERO_WIDTH = 192;
const OPPONENT_HERO_HEIGHT = 272;
const PLAYER_HERO_WIDTH = 208;
const PLAYER_HERO_HEIGHT = 288;
const BETTING_CONTROLS_HEIGHT = 112;
const BETTING_CONTROLS_DROP_RATIO = 0.2;
const BETTING_CONTROLS_DROP = Math.round(BETTING_CONTROLS_HEIGHT * BETTING_CONTROLS_DROP_RATIO);
const BATTLE_LOG_HEIGHT = 232;
const BOTTOM_RAIL_GAP = 52;
const HUD_BADGE_HEIGHT = 36;
const CANVAS_W = 1920;
const EDGE = 32;
const DECK_COUNTERS_WIDTH = 174;
const BATTLE_LOG_WIDTH = 288;
const PLAYER_HAND_BASE_Y = 728;
const PLAYER_HAND_HEIGHT = 192;
const PLAYER_HAND_CARD_RISE_RATIO = 0.2;
const PLAYER_HAND_CARD_RISE = Math.round(PLAYER_HAND_HEIGHT * PLAYER_HAND_CARD_RISE_RATIO);
const HERO_X = EDGE;
const COMMUNITY_SCALE = 0.81;
const COMMUNITY_W = 720 * COMMUNITY_SCALE;
const COMMUNITY_H = 200 * COMMUNITY_SCALE;
const COMMUNITY_X = HERO_X;
const COMMUNITY_Y = 474;
const BATTLE_LOG_X = CANVAS_W - EDGE - BATTLE_LOG_WIDTH;
const DECK_COUNTERS_X = CANVAS_W - EDGE - DECK_COUNTERS_WIDTH;
	const FIELD_W = 752;
const FIELD_X = COMMUNITY_X + COMMUNITY_W + 80;
const FIELD_H = 184;
const OPP_FIELD_Y = 280;
const PLAYER_FIELD_Y = 520;
const BATTLEFIELD_X = FIELD_X - 32;
const BATTLEFIELD_Y = OPP_FIELD_Y - 24;
const BATTLEFIELD_W = FIELD_W + 64;
const BATTLEFIELD_H = PLAYER_FIELD_Y + FIELD_H - BATTLEFIELD_Y;

/**
 * Single source of truth for the 1920x1080 poker arena.
 *
 * Zone x/y/w/h/rot and rail tokens are authored here only.
 * `buildPokerViewportLayoutStyle` paints them onto `.ragnarok-combat-arena`.
 * CSS may consume `var(--poker-zone-*)` — it must not redeclare those names.
 */
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
				'opponentPokerSpellTray',
				'communityCards',
				'battlefield',
				'opponentBattlefieldCards',
				'playerBattlefieldCards',
				'playerHero',
				'playerHeroCards',
				'playerHand',
				'playerPokerSpellTray',
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
			vfx: ['vfxFocus', 'wagerActivation'],
		},
	},
	zones: {
		turnBadge: {
			layer: 'hud',
			label: 'Persistent turn badge',
			x: 1352,
			y: POKER_BOTTOM_RAIL_Y - TURN_BADGE_HEIGHT,
			width: 152,
			height: TURN_BADGE_HEIGHT,
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
			x: 960,
			y: 122,
			width: 65,
			height: 128,
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
			x: HERO_X,
			y: OPPONENT_HERO_Y,
			width: OPPONENT_HERO_WIDTH,
			height: OPPONENT_HERO_HEIGHT,
			rotation: 0,
		},
	opponentHeroCards: {
			layer: 'game',
			label: 'Opponent hero pocket cards',
			x: HERO_X + 32,
		y: OPPONENT_HERO_Y + OPPONENT_HERO_HEIGHT - 4,
			width: 128,
			height: 72,
			rotation: -6,
		},
	opponentHand: {
			layer: 'game',
			label: 'Opponent poker hand / hidden cards',
			x: HERO_X + 208,
			y: 152,
			width: 400,
			height: 88,
			rotation: 0,
		},
		communityCards: {
			layer: 'game',
			label: 'Community poker board',
			x: COMMUNITY_X,
			y: COMMUNITY_Y,
			width: COMMUNITY_W,
			height: COMMUNITY_H,
			rotation: 0,
		},
		battlefield: {
			layer: 'game',
			label: 'Battlefield board surface',
			x: BATTLEFIELD_X,
			y: BATTLEFIELD_Y,
			width: BATTLEFIELD_W,
			height: BATTLEFIELD_H,
			rotation: 0,
		},
		opponentBattlefieldCards: {
			layer: 'game',
			label: 'Opponent minion cards in battlefield',
			x: FIELD_X,
			y: OPP_FIELD_Y,
			width: FIELD_W,
			height: FIELD_H,
			rotation: 0,
		},
		playerBattlefieldCards: {
			layer: 'game',
			label: 'Player minion cards in battlefield',
			x: FIELD_X,
			y: PLAYER_FIELD_Y,
			width: FIELD_W,
			height: FIELD_H,
			rotation: 0,
		},
		playerHero: {
			layer: 'game',
			label: 'Player hero card',
			x: HERO_X,
			y: POKER_BOTTOM_RAIL_Y - PLAYER_HERO_HEIGHT,
			width: PLAYER_HERO_WIDTH,
			height: PLAYER_HERO_HEIGHT,
			rotation: 0,
		},
		playerHeroCards: {
			layer: 'game',
			label: 'Player hero pocket cards',
			x: HERO_X + 32,
			y: 688,
			width: 152,
			height: 96,
			rotation: -8,
		},
		playerHand: {
			layer: 'game',
			label: 'Player card hand fan',
			x: 304,
			y: PLAYER_HAND_BASE_Y,
			width: 700,
			height: PLAYER_HAND_HEIGHT,
			rotation: 0,
		},
		bettingControls: {
			layer: 'hud',
			label: 'Bet buttons and action controls',
			x: 280,
			y: POKER_BOTTOM_RAIL_Y - BETTING_CONTROLS_HEIGHT,
			width: 608,
			height: BETTING_CONTROLS_HEIGHT,
			rotation: 0,
		},
		wagerPanel: {
			layer: 'hud',
			label: 'Battle cadence / wager panel',
			x: 1480,
			y: 224,
			width: 384,
			height: 248,
			rotation: 0,
		},
		deckCounters: {
			layer: 'hud',
			label: 'Enemy and player deck counters',
			x: DECK_COUNTERS_X,
			y: 48,
			width: DECK_COUNTERS_WIDTH,
			height: 144,
			rotation: 0,
		},
		battleLog: {
			layer: 'hud',
			label: 'Battle log dock',
			x: BATTLE_LOG_X,
			y: POKER_BOTTOM_RAIL_Y - BATTLE_LOG_HEIGHT,
			width: 288,
			height: BATTLE_LOG_HEIGHT,
			rotation: 0,
		},
		vfxFocus: {
			layer: 'vfx',
			label: 'VFX interaction band',
			x: FIELD_X,
			y: OPP_FIELD_Y,
			width: FIELD_W,
			height: PLAYER_FIELD_Y + FIELD_H - OPP_FIELD_Y,
			rotation: 0,
		},
		opponentPokerSpellTray: {
			layer: 'game',
			label: 'Opponent poker spell tray (Family 2)',
			x: FIELD_X + 160,
			y: 168,
			width: 320,
			height: 88,
			rotation: 0,
		},
		playerPokerSpellTray: {
			layer: 'game',
			label: 'Player poker spell tray (Family 2)',
			x: FIELD_X + 160,
			y: 816,
			width: 320,
			height: 88,
			rotation: 0,
		},
		wagerActivation: {
			layer: 'vfx',
			label: 'Wager activation surface (Family 3)',
			x: BATTLEFIELD_X,
			y: BATTLEFIELD_Y,
			width: BATTLEFIELD_W,
			height: BATTLEFIELD_H,
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
		'--poker-bottom-rail-y': toPixels(layout.zones.bettingControls.y + layout.zones.bettingControls.height),
		'--poker-bottom-rail-gap': toPixels(BOTTOM_RAIL_GAP),
		'--poker-player-hand-card-rise': toPixels(PLAYER_HAND_CARD_RISE),
		'--poker-betting-controls-drop': toPixels(BETTING_CONTROLS_DROP),
		'--poker-hud-badge-height': toPixels(HUD_BADGE_HEIGHT),
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

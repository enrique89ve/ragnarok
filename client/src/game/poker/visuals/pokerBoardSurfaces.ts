/**
 * Poker arena tabletop surfaces — canonical ids and public asset paths.
 * Files live under `client/public/art/poker/boards/*.webp`.
 */

export const POKER_BOARD_SURFACE_SCHEMA = 'norse-poker-board-surface/v1' as const;

export const POKER_BOARD_SURFACE_IDS = [
	'ember-forge',
	'frost-rune-slate',
	'aurora-ruin',
	'twilight-brazier',
] as const;

export type PokerBoardSurfaceId = (typeof POKER_BOARD_SURFACE_IDS)[number];

export type PokerBoardSurfaceDefinition = Readonly<{
	id: PokerBoardSurfaceId;
	/** Path served from client/public (no BASE_URL prefix). */
	assetPath: `/art/poker/boards/${PokerBoardSurfaceId}.webp`;
	label: string;
}>;

export const POKER_BOARD_SURFACES: Record<PokerBoardSurfaceId, PokerBoardSurfaceDefinition> = {
	'ember-forge': {
		id: 'ember-forge',
		assetPath: '/art/poker/boards/ember-forge.webp',
		label: 'Ember forge',
	},
	'frost-rune-slate': {
		id: 'frost-rune-slate',
		assetPath: '/art/poker/boards/frost-rune-slate.webp',
		label: 'Frost rune slate',
	},
	'aurora-ruin': {
		id: 'aurora-ruin',
		assetPath: '/art/poker/boards/aurora-ruin.webp',
		label: 'Aurora ruin',
	},
	'twilight-brazier': {
		id: 'twilight-brazier',
		assetPath: '/art/poker/boards/twilight-brazier.webp',
		label: 'Twilight brazier',
	},
};

/** Default when no session style is bound (SSR / devtools). */
export const POKER_BOARD_SURFACE_DEFAULT_ID: PokerBoardSurfaceId = 'frost-rune-slate';

export function isPokerBoardSurfaceId(value: string): value is PokerBoardSurfaceId {
	return (POKER_BOARD_SURFACE_IDS as readonly string[]).includes(value);
}

export function pokerBoardSurfaceAssetPath(id: PokerBoardSurfaceId): string {
	return POKER_BOARD_SURFACES[id].assetPath;
}
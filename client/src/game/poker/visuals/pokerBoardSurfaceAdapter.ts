import type { CSSProperties } from 'react';
import type { CombatHandoff } from '../../flow/round/types';
import { assetPath } from '../../utils/assetPath';
import { seededRngFromString } from '../../utils/seededRng';
import {
	POKER_BOARD_SURFACE_DEFAULT_ID,
	POKER_BOARD_SURFACE_IDS,
	POKER_BOARD_SURFACE_SCHEMA,
	type PokerBoardSurfaceId,
	pokerBoardSurfaceAssetPath,
} from './pokerBoardSurfaces';

export type PokerBoardSurfaceArenaStyle = CSSProperties &
	Record<'--poker-board-surface-image', string>;

export function buildPokerBoardSurfaceSessionSeed(handoff: CombatHandoff): string {
	const { attacker, defender } = handoff;
	return `${POKER_BOARD_SURFACE_SCHEMA}:${attacker.id}:${defender.id}:${attacker.position.row},${attacker.position.col}:${defender.position.row},${defender.position.col}`;
}

export function pickPokerBoardSurfaceId(seedKey: string): PokerBoardSurfaceId {
	const rng = seededRngFromString(seedKey);
	const index = Math.floor(rng() * POKER_BOARD_SURFACE_IDS.length);
	return POKER_BOARD_SURFACE_IDS[index] ?? POKER_BOARD_SURFACE_DEFAULT_ID;
}

export function adaptPokerBoardSurfaceToArenaStyle(
	surfaceId: PokerBoardSurfaceId,
): PokerBoardSurfaceArenaStyle {
	const resolved = assetPath(pokerBoardSurfaceAssetPath(surfaceId));
	return {
		'--poker-board-surface-image': `url("${resolved}")`,
	};
}
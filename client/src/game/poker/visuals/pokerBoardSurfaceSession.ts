import type { CSSProperties } from 'react';
import type { CombatHandoff } from '../../flow/round/types';
import {
	adaptPokerBoardSurfaceToArenaStyle,
	buildPokerBoardSurfaceSessionSeed,
	pickPokerBoardSurfaceId,
} from './pokerBoardSurfaceAdapter';
import { POKER_BOARD_SURFACE_DEFAULT_ID, type PokerBoardSurfaceId } from './pokerBoardSurfaces';

let activeSurfaceId: PokerBoardSurfaceId | null = null;

export function beginPokerBoardSurfaceSession(handoff: CombatHandoff): PokerBoardSurfaceId {
	const seedKey = buildPokerBoardSurfaceSessionSeed(handoff);
	activeSurfaceId = pickPokerBoardSurfaceId(seedKey);
	return activeSurfaceId;
}

export function beginPokerBoardSurfaceSessionFromSeed(seedKey: string): PokerBoardSurfaceId {
	activeSurfaceId = pickPokerBoardSurfaceId(seedKey);
	return activeSurfaceId;
}

export function getActivePokerBoardSurfaceId(): PokerBoardSurfaceId {
	return activeSurfaceId ?? POKER_BOARD_SURFACE_DEFAULT_ID;
}

export function getActivePokerBoardSurfaceArenaStyle(): CSSProperties {
	return adaptPokerBoardSurfaceToArenaStyle(getActivePokerBoardSurfaceId());
}

export function endPokerBoardSurfaceSession(): void {
	activeSurfaceId = null;
}

/** Test-only reset. */
export function resetPokerBoardSurfaceSessionForTests(): void {
	activeSurfaceId = null;
}
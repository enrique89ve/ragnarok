/**
 * sceneContext.ts
 *
 * Tribe-agnostic spatial anchor resolution (viewport -> 1920x1080 arena coordinates)
 * and safe procedural audio dispatch shared across all faction VFX scenes.
 */

import {
	getArenaLocalPoint,
	getArenaVfxCombatantTarget,
	getArenaVfxCoordinateLayer,
	getArenaVfxHeroSurfaceTarget,
	getArenaVfxMinionFieldTarget,
	getElementCenter,
	type ArenaVfxOwner,
} from '../../../arenaVfxTargets';
import {
	ARENA_COORDINATE_CONTRACT,
	arenaContractPointToViewport,
} from '../../arenaCoordinateContract';
import { proceduralAudio } from '../../../../audio/proceduralAudio';
import type { FactionVfxSceneRequest, ViewportPoint } from '../types';

export interface ResolvedFactionAnchors {
	readonly sourceScreen: ViewportPoint;
	readonly targetScreen: ViewportPoint;
	readonly targetEntityId: string;
}

export interface ResolvedArenaEndpoints extends ResolvedFactionAnchors {
	readonly sourceArena: ViewportPoint;
	readonly targetArena: ViewportPoint;
}

function heroFallbackPoint(side: ArenaVfxOwner): ViewportPoint | null {
	const el = getArenaVfxHeroSurfaceTarget(side);
	if (el) return getElementCenter(el, 0.45);
	return arenaContractPointToViewport(
		side === 'player'
			? ARENA_COORDINATE_CONTRACT.playerHero
			: ARENA_COORDINATE_CONTRACT.opponentHero,
	);
}

function fieldFallbackPoint(side: ArenaVfxOwner): ViewportPoint | null {
	const el = getArenaVfxMinionFieldTarget(side);
	if (el) return getElementCenter(el, 0.5);
	return heroFallbackPoint(side);
}

function resolveEntityViewportPoint(entityId: string | undefined): ViewportPoint | null {
	if (!entityId) return null;
	if (entityId === 'player' || entityId === 'player-hero') return heroFallbackPoint('player');
	if (entityId === 'opponent' || entityId === 'opponent-hero') return heroFallbackPoint('opponent');
	const el = getArenaVfxCombatantTarget(entityId);
	return el ? getElementCenter(el, 0.5) : null;
}

/**
 * Resolves viewport-space origin & target coordinates for any faction VFX scene.
 */
export function resolveFactionSceneAnchors(
	request: Pick<FactionVfxSceneRequest, 'side' | 'sourceId' | 'targetId' | 'sourcePoint' | 'targetPoint'>,
): ResolvedFactionAnchors | null {
	const caster = request.side;
	const rival: ArenaVfxOwner = caster === 'player' ? 'opponent' : 'player';

	const sourceScreen = request.sourcePoint
		?? resolveEntityViewportPoint(request.sourceId)
		?? fieldFallbackPoint(caster);
	if (!sourceScreen) return null;

	let targetEntityId = request.targetId ?? `${rival}-hero`;
	let targetScreen = request.targetPoint ?? resolveEntityViewportPoint(request.targetId);
	if (!targetScreen) {
		targetScreen = heroFallbackPoint(rival) ?? fieldFallbackPoint(rival);
		targetEntityId = `${rival}-hero`;
	}
	if (!targetScreen) return null;

	return { sourceScreen, targetScreen, targetEntityId };
}

/**
 * Resolves both viewport-space and 1920x1080 arena-local endpoints in one call.
 */
export function resolveArenaEndpoints(
	request: Pick<FactionVfxSceneRequest, 'side' | 'sourceId' | 'targetId' | 'sourcePoint' | 'targetPoint'>,
): ResolvedArenaEndpoints | null {
	const layer = getArenaVfxCoordinateLayer();
	if (!layer) return null;
	const anchors = resolveFactionSceneAnchors(request);
	if (!anchors) return null;

	const sourceArena = getArenaLocalPoint(anchors.sourceScreen, layer);
	const targetArena = getArenaLocalPoint(anchors.targetScreen, layer);
	if (!sourceArena || !targetArena) return null;

	return {
		...anchors,
		sourceArena,
		targetArena,
	};
}

export type FactionAudioCue = 'fire_impact' | 'norse_horn' | 'damage_hero' | 'spell_impact';

export function playFactionSfx(cue: FactionAudioCue): void {
	try {
		proceduralAudio.play(cue);
	} catch {
		// Audio unavailable in headless / test environments
	}
}

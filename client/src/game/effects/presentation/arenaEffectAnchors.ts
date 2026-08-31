import {
	getArenaVfxCombatantTarget,
	getArenaVfxHeroSurfaceTarget,
	getArenaVfxMinionFieldTarget,
	getElementCenter,
	type QueryRoot,
} from '@/game/combat/arenaVfxTargets';
import type { EffectAnchor, EffectEndpoint } from '../core/effectIntentTypes';

export interface EffectPoint {
	readonly x: number;
	readonly y: number;
}

function anchorYRatio(anchor: EffectAnchor): number {
	switch (anchor) {
		case 'health-bar':
			return 0.82;
		case 'hero-body':
			return 0.42;
		case 'card-body':
		case 'board-slot':
		case 'center':
			return 0.5;
		default: {
			const exhaustive: never = anchor;
			return exhaustive;
		}
	}
}

function isOpponentEntity(entityId: string): boolean {
	return entityId.includes('opponent') || entityId === 'opponent-hero';
}

function isHeroEntity(entityId: string): boolean {
	return entityId === 'player-hero' || entityId === 'opponent-hero';
}

/** Resolves semantic endpoints only at the browser/rendering boundary. */
export function resolveArenaEffectPoint(
	endpoint: EffectEndpoint,
	root?: QueryRoot | null,
): EffectPoint | null {
	if (typeof window === 'undefined') return null;
	const { entityId, anchor } = endpoint;
	const yRatio = anchorYRatio(anchor);

	if (isHeroEntity(entityId)) {
		const hero = getArenaVfxHeroSurfaceTarget(isOpponentEntity(entityId) ? 'opponent' : 'player', root);
		return hero ? getElementCenter(hero, yRatio) : null;
	}

	const combatant = getArenaVfxCombatantTarget(entityId, root);
	if (combatant) return getElementCenter(combatant, yRatio);

	if (anchor !== 'board-slot') return null;
	const field = getArenaVfxMinionFieldTarget(isOpponentEntity(entityId) ? 'opponent' : 'player', root);
	if (field?.querySelector('[data-instance-id], [data-card-id]')) {
		return getElementCenter(field, yRatio);
	}

	// An empty minion row is not a gameplay receiver. Keep combat feedback on
	// the defending avatar instead of painting an unexplained effect in the
	// middle of the board.
	const hero = getArenaVfxHeroSurfaceTarget(isOpponentEntity(entityId) ? 'opponent' : 'player', root);
	return hero ? getElementCenter(hero, yRatio) : null;
}

import {
	getArenaVfxCombatantTarget,
	getArenaVfxHeroTarget,
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

function fallbackPoint(entityId: string): EffectPoint {
	if (typeof window === 'undefined') return { x: 0, y: 0 };
	return isOpponentEntity(entityId)
		? { x: window.innerWidth / 2, y: window.innerHeight * 0.2 }
		: { x: window.innerWidth / 2, y: window.innerHeight * 0.8 };
}

/** Resolves semantic endpoints only at the browser/rendering boundary. */
export function resolveArenaEffectPoint(
	endpoint: EffectEndpoint,
	root?: QueryRoot | null,
): EffectPoint | null {
	if (typeof window === 'undefined') return null;
	const { entityId, anchor } = endpoint;
	const yRatio = anchorYRatio(anchor);

	if (entityId.includes('hero') || entityId === 'opponent-hero' || entityId === 'player-hero') {
		const hero = getArenaVfxHeroTarget(isOpponentEntity(entityId) ? 'opponent' : 'player', root);
		return hero ? getElementCenter(hero, yRatio) : fallbackPoint(entityId);
	}

	const combatant = getArenaVfxCombatantTarget(entityId, root);
	if (combatant) return getElementCenter(combatant, yRatio);

	const field = getArenaVfxMinionFieldTarget('opponent', root)
		?? getArenaVfxMinionFieldTarget('player', root);
	return field ? getElementCenter(field, yRatio) : fallbackPoint(entityId);
}

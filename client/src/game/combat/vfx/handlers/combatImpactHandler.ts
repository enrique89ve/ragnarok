import { scheduleDamageEffect } from '../../../animations/UnifiedAnimationOrchestrator';
import {
	getArenaVfxCombatantTarget,
	getArenaVfxHeroTarget,
	getArenaVfxMinionFieldTarget,
	getElementCenter,
} from '../../arenaVfxTargets';
import { registerVisualEffect, type EffectHandle, type VisualEffectUnregister } from '../registry';
import type { CombatImpactEvent } from '../events';

const NO_OP_HANDLE: EffectHandle = { cancel() {} };

function impactPosition(targetId: string): { x: number; y: number } | null {
	if (typeof window === 'undefined') return null;
	if (targetId.includes('hero') || targetId === 'opponent-hero' || targetId === 'player-hero') {
		const isOpponent = targetId.includes('opponent') || targetId === 'opponent-hero';
		const heroElement = getArenaVfxHeroTarget(isOpponent ? 'opponent' : 'player');
		if (heroElement) return getElementCenter(heroElement, 1 / 3);
		return isOpponent
			? { x: window.innerWidth / 2, y: window.innerHeight * 0.2 }
			: { x: window.innerWidth / 2, y: window.innerHeight * 0.8 };
	}

	const minionElement = getArenaVfxCombatantTarget(targetId);
	if (minionElement) return getElementCenter(minionElement, 1 / 4);

	const field = getArenaVfxMinionFieldTarget('opponent') ?? getArenaVfxMinionFieldTarget('player');
	if (field) return getElementCenter(field);
	return { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
}

function handleCombatImpact(event: CombatImpactEvent): EffectHandle | null {
	if (event.damage <= 0) return null;
	const position = impactPosition(event.targetId);
	if (!position) return null;
	const category = event.kind === 'counter' ? 'combat-counter' : 'combat-damage';
	if (event.kind === 'counter') {
		const timer = setTimeout(() => {
			scheduleDamageEffect(position, event.damage, category);
		}, 100);
		return { cancel() { clearTimeout(timer); } };
	}
	scheduleDamageEffect(position, event.damage, category);
	return NO_OP_HANDLE;
}

export function registerCombatImpactVisualEffect(): VisualEffectUnregister {
	return registerVisualEffect('combatImpact', handleCombatImpact);
}

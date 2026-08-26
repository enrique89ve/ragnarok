import {
	getArenaVfxCombatantTarget,
	getArenaVfxHeroTarget,
	getArenaVfxMinionFieldTarget,
	getElementCenter,
	type QueryRoot,
} from '@/game/combat/arenaVfxTargets';
import type { PresentationTarget, VisualSnapshot } from './types';

function entityIdForTarget(target: PresentationTarget): string {
	if (target.type === 'card') return target.instanceId;
	return `${target.side}-${target.type === 'hero' ? 'hero' : 'field'}`;
}

function resolveTargetElement(target: PresentationTarget, root?: QueryRoot | null): HTMLElement | null {
	switch (target.type) {
		case 'card':
			return getArenaVfxCombatantTarget(target.instanceId, root);
		case 'hero':
			return getArenaVfxHeroTarget(target.side, root);
		case 'field':
			return getArenaVfxMinionFieldTarget(target.side, root);
		default: {
			const exhaustive: never = target;
			return exhaustive;
		}
	}
}

export function resolvePresentationTargetElement(
	target: PresentationTarget,
	root?: QueryRoot | null,
): HTMLElement | null {
	return resolveTargetElement(target, root);
}

/**
 * Captures only plain geometry. The snapshot deliberately does not retain a
 * DOM node, so a lethal card can disappear without invalidating its FX.
 */
export function captureVisualSnapshot(
	target: PresentationTarget,
	root?: QueryRoot | null,
): VisualSnapshot | null {
	const element = resolveTargetElement(target, root);
	if (!element) return null;
	const rect = element.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) return null;
	const center = getElementCenter(element);
	return {
		entityId: entityIdForTarget(target),
		rect: {
			left: rect.left,
			top: rect.top,
			width: rect.width,
			height: rect.height,
		},
		center,
		...(target.type !== 'card' ? { side: target.side } : {}),
	};
}

export function targetEntityId(target: PresentationTarget): string {
	return entityIdForTarget(target);
}

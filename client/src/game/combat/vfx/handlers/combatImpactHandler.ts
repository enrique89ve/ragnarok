import {
	scheduleAttackEffect,
	scheduleDamageEffect,
	useAnimationOrchestrator,
} from '../../../animations/UnifiedAnimationOrchestrator';
import { gameEffectMediator } from '@/game/effects/core/gameEffectMediator';
import { registerVisualEffect, type EffectHandle, type VisualEffectUnregister } from '../registry';
import type { CombatImpactEvent } from '../events';
import type { AttackVisualProfile } from '@/game/effects/core/effectIntentTypes';
import { resolveArenaEffectPoint } from '@/game/effects/presentation';

type Point = { readonly x: number; readonly y: number };

function applyAttackVisualProfile(
	source: Point,
	target: Point,
	profile: AttackVisualProfile | undefined,
): { readonly source: Point; readonly target: Point } {
	if (!profile) return { source, target };

	const dx = target.x - source.x;
	const dy = target.y - source.y;
	const distance = Math.hypot(dx, dy) || 1;
	const normal = { x: -dy / distance, y: dx / distance };
	const direction = profile.direction === 'left' ? -1 : 1;
	const pathScale = profile.path === 'lance' ? 1.35 : profile.path === 'arc' ? 1 : 0.45;
	const sourceOffset = profile.sourceJitter * distance * pathScale * direction;
	const targetOffset = profile.targetJitter * distance * pathScale * direction;

	return {
		source: {
			x: source.x + normal.x * sourceOffset,
			y: source.y + normal.y * sourceOffset,
		},
		target: {
			x: target.x + normal.x * targetOffset,
			y: target.y + normal.y * targetOffset,
		},
	};
}

function handleCombatImpact(event: CombatImpactEvent): EffectHandle | null {
	if (event.damage <= 0) return null;
	const targetEndpoint = event.intent?.target ?? { entityId: event.targetId, anchor: 'center' as const };
	const position = resolveArenaEffectPoint(targetEndpoint);
	if (!position) return null;
	const category = event.kind === 'counter' ? 'combat-counter' : 'combat-damage';
	const sourcePosition = event.intent ? resolveArenaEffectPoint(event.intent.source) : null;
	if (sourcePosition && event.intent?.motion.type !== 'instant') {
		const variedPath = applyAttackVisualProfile(sourcePosition, position, event.intent?.visual);
		return gameEffectMediator.dispatch({
			id: `combat-impact:${event.id}`,
			owner: 'visual-impact',
			lane: 'impact',
			priority: event.kind === 'counter' ? 'high' : 'normal',
			nodes: [
				{
					id: 'attack-travel',
					run: () => {
						const effectId = scheduleAttackEffect(variedPath.source, variedPath.target, event.damage, category);
						return { cancel: () => useAnimationOrchestrator.getState().cancelEffect(effectId) };
					},
				},
				{
					id: 'damage-impact',
					after: ['attack-travel'],
					delayMs: 600,
					run: () => {
						const effectId = scheduleDamageEffect(position, event.damage, category);
						return { cancel: () => useAnimationOrchestrator.getState().cancelEffect(effectId) };
					},
				},
			],
		});
	}
	return gameEffectMediator.dispatch({
		id: `combat-impact:${event.id}`,
		owner: 'visual-impact',
		lane: 'impact',
		priority: event.kind === 'counter' ? 'high' : 'normal',
		nodes: [{
			id: 'damage-impact',
			delayMs: event.kind === 'counter' ? 100 : 0,
			run: () => {
				const effectId = scheduleDamageEffect(position, event.damage, category);
				return { cancel: () => useAnimationOrchestrator.getState().cancelEffect(effectId) };
			},
		}],
	});
}

export function registerCombatImpactVisualEffect(): VisualEffectUnregister {
	return registerVisualEffect('combatImpact', handleCombatImpact);
}

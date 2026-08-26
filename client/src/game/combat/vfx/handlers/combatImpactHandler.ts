import {
	scheduleDamageEffect,
	useAnimationOrchestrator,
} from '../../../animations/UnifiedAnimationOrchestrator';
import {
	spawnImpactBurst,
	spawnImpactRing,
	spawnSlashTrail,
	spawnSmokePuff,
	spawnSparkBurst,
	ELEMENT_PALETTES,
	type ParticleColor,
} from '../../../animations/PixiParticleCanvas';
import {
	gameEffectCoordinator,
	type GameEffectHandle,
	type GameEffectPriority,
} from '@/game/effects/core/gameEffectCoordinator';
import { gameEffectMediator } from '@/game/effects/core/gameEffectMediator';
import type { EffectEndpoint } from '@/game/effects/core/effectIntentTypes';
import {
	buildCombatPresentationFromIntent,
} from '@/game/effects/presentation/CombatPresentation';
import {
	captureVisualSnapshot,
} from '@/game/effects/presentation/EffectTargetResolver';
import {
	recipeForCombatPresentation,
} from '@/game/effects/presentation/EffectRecipes';
import type {
	CombatPresentation,
	EffectRecipeStep,
	ImpactLevel,
	LocalFxPrimitive,
	PixiFxPrimitive,
	PresentationTarget,
} from '@/game/effects/presentation/types';
import { resolveArenaEffectPoint } from '@/game/effects/presentation';
import { playLocalFx, combineEffectHandles } from '../localFxPrimitives';
import { registerVisualEffect, type EffectHandle, type VisualEffectUnregister } from '../registry';
import type { CombatImpactEvent } from '../events';

type Point = { readonly x: number; readonly y: number };

const DEFAULT_TRAVEL_MS = 420;

function localPrimitive(value: EffectRecipeStep['primitive']): LocalFxPrimitive | null {
	switch (value) {
		case 'impact-light':
		case 'impact-normal':
		case 'impact-heavy':
		case 'white-flash':
		case 'shine':
		case 'shield-flash':
			return value;
		case 'slashTrail':
		case 'impactBurst':
		case 'impactRing':
		case 'smokePuff':
		case 'sparkBurst':
			return null;
		default: {
			const exhaustive: never = value;
			return exhaustive;
		}
	}
}

function pixiPrimitive(value: EffectRecipeStep['primitive']): PixiFxPrimitive | null {
	switch (value) {
		case 'slashTrail':
		case 'impactBurst':
		case 'impactRing':
		case 'smokePuff':
		case 'sparkBurst':
			return value;
		case 'impact-light':
		case 'impact-normal':
		case 'impact-heavy':
		case 'white-flash':
		case 'shine':
		case 'shield-flash':
			return null;
		default: {
			const exhaustive: never = value;
			return exhaustive;
		}
	}
}

function endpointForTarget(target: PresentationTarget): EffectEndpoint {
	if (target.type === 'card') {
		return { entityId: target.instanceId, anchor: 'card-body' };
	}
	if (target.type === 'hero') {
		return { entityId: `${target.side}-hero`, anchor: 'hero-body' };
	}
	return { entityId: `${target.side}-field`, anchor: 'board-slot' };
}

function fallbackPresentation(event: CombatImpactEvent): CombatPresentation {
	const intent = event.intent;
	return buildCombatPresentationFromIntent({
		id: intent?.id ?? event.id,
		sourceId: intent?.source.entityId ?? event.targetId,
		targetId: intent?.target.entityId ?? event.targetId,
		damage: event.damage,
		sourceIsHero: intent?.source.entityId.includes('hero'),
		targetIsHero: intent?.target.entityId.includes('hero'),
		attackerSide: intent?.source.entityId.includes('opponent') ? 'opponent' : 'player',
	});
}

function getImpact(event: CombatImpactEvent): {
	source: PresentationTarget | null;
	target: PresentationTarget;
	amount: number;
	level: ImpactLevel;
	outcome: 'damage' | 'shield';
	lethal: boolean | null;
} {
	const presentation = event.presentation ?? fallbackPresentation(event);
	const impact = event.kind === 'counter' ? presentation.counter : presentation.target;
	if (impact) {
		return {
			source: event.kind === 'counter' && presentation.counter
				? presentation.counter.source
				: presentation.source,
			target: impact.target,
			amount: impact.amount,
			level: impact.level,
			outcome: impact.outcome,
			lethal: impact.lethal,
		};
	}
	return {
		source: presentation.source,
		target: presentation.target.target,
		amount: event.damage,
		level: presentation.target.level,
		outcome: presentation.target.outcome,
		lethal: presentation.target.lethal,
	};
}

function travelDuration(event: CombatImpactEvent): number {
	const duration = event.intent?.motion.durationMs ?? DEFAULT_TRAVEL_MS;
	return Math.min(900, Math.max(120, duration));
}

function priorityFor(event: CombatImpactEvent): GameEffectPriority {
	return event.kind === 'counter' ? 'high' : 'normal';
}

function primitiveCounts(level: ImpactLevel): {
	readonly burst: number;
	readonly sparks: number;
	readonly smoke: number;
	readonly trail: number;
} {
	switch (level) {
		case 'light':
			return { burst: 12, sparks: 5, smoke: 0, trail: 14 };
		case 'normal':
			return { burst: 20, sparks: 8, smoke: 0, trail: 22 };
		case 'heavy':
			return { burst: 34, sparks: 14, smoke: 6, trail: 32 };
		default: {
			const exhaustive: never = level;
			return exhaustive;
		}
	}
}

function scheduleVisualWindow(
	key: string,
	delayMs: number,
	priority: GameEffectPriority,
): GameEffectHandle {
	return gameEffectCoordinator.schedule({
		owner: 'visual-impact',
		lane: 'pixi',
		key,
		priority,
		delayMs,
		run: () => {},
	});
}

function playPixiPrimitive(
	primitive: PixiFxPrimitive,
	point: Point,
	source: Point | null,
	counts: ReturnType<typeof primitiveCounts>,
	palette: ParticleColor,
	seed: string,
): void {
	switch (primitive) {
		case 'slashTrail':
			if (source) {
				spawnSlashTrail(source.x, source.y, point.x, point.y, counts.trail, palette, seed);
			}
			break;
		case 'impactBurst':
			spawnImpactBurst(point.x, point.y, counts.burst, palette, seed);
			break;
		case 'impactRing':
			spawnImpactRing(point.x, point.y, palette);
			break;
		case 'smokePuff':
			if (counts.smoke > 0) spawnSmokePuff(point.x, point.y, counts.smoke, palette, seed);
			break;
		case 'sparkBurst':
			spawnSparkBurst(point.x, point.y, counts.sparks, palette, seed);
			break;
		default: {
			const exhaustive: never = primitive;
			return exhaustive;
		}
	}
}

function handleCombatImpact(event: CombatImpactEvent): EffectHandle | null {
	if (event.damage <= 0) return null;

	const impact = getImpact(event);
	const targetEndpoint = endpointForTarget(impact.target);
	const targetSnapshot = captureVisualSnapshot(impact.target);
	const targetPoint = targetSnapshot?.center ?? resolveArenaEffectPoint(targetEndpoint);
	if (!targetPoint) return null;

	const sourceSnapshot = impact.source ? captureVisualSnapshot(impact.source) : null;
	const sourcePoint = sourceSnapshot?.center
		?? (event.intent?.source ? resolveArenaEffectPoint(event.intent.source) : null);
	const presentation = event.presentation ?? fallbackPresentation(event);
	const recipe = recipeForCombatPresentation(
		presentation,
		event.kind === 'counter' && presentation.counter ? 'counter' : 'target',
	);
	const counts = primitiveCounts(impact.level);
	const palette = ELEMENT_PALETTES.neutral;
	const seed = event.intent?.id ?? event.id;
	const priority = priorityFor(event);
	return gameEffectMediator.dispatch({
		id: `combat-impact:${event.id}`,
		owner: 'visual-impact',
		lane: 'impact',
		priority,
		nodes: [
			{
				id: 'attack-travel',
				run: () => {
					const trail = recipe.some(recipeStep => pixiPrimitive(recipeStep.primitive) === 'slashTrail');
					if (trail) {
						playPixiPrimitive('slashTrail', targetPoint, sourcePoint, counts, palette, seed);
					}
					return scheduleVisualWindow(
						`${event.id}:travel`,
						travelDuration(event),
						priority,
					);
				},
			},
			{
				id: 'damage-impact',
				after: ['attack-travel'],
				run: () => {
					const handles: GameEffectHandle[] = [];
					for (const recipeStep of recipe) {
						const local = localPrimitive(recipeStep.primitive);
						if (local) {
							handles.push(playLocalFx(impact.target, local, event.id, priority));
							continue;
						}
						const pixi = pixiPrimitive(recipeStep.primitive);
						if (pixi && pixi !== 'slashTrail') {
							playPixiPrimitive(pixi, targetPoint, sourcePoint, counts, palette, seed);
						}
					}

					if (impact.outcome === 'damage' && impact.amount > 0) {
						const effectId = scheduleDamageEffect(
							targetPoint,
							impact.amount,
							event.kind === 'counter' ? 'combat-counter' : 'combat-damage',
						);
						handles.push({
							cancel: () => useAnimationOrchestrator.getState().cancelEffect(effectId),
						});
					}

					handles.push(scheduleVisualWindow(`${event.id}:aftermath`, 1_000, priority));
					return combineEffectHandles(handles);
				},
			},
		],
	});
}

export function registerCombatImpactVisualEffect(): VisualEffectUnregister {
	return registerVisualEffect('combatImpact', handleCombatImpact);
}

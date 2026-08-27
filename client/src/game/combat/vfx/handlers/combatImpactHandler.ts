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
import {
	gameEffectMediator,
	type GameEffectNode,
} from '@/game/effects/core/gameEffectMediator';
import type { EffectEndpoint } from '@/game/effects/core/effectIntentTypes';
import {
	buildCombatPresentationFromIntent,
} from '@/game/effects/presentation/CombatPresentation';
import {
	captureVisualSnapshot,
	targetEntityId,
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
	PresentationImpact,
	PresentationTarget,
} from '@/game/effects/presentation/types';
import { resolveArenaEffectPoint } from '@/game/effects/presentation';
import { playLocalFx, combineEffectHandles } from '../localFxPrimitives';
import { registerVisualEffect, type EffectHandle, type VisualEffectUnregister } from '../registry';
import type { CombatImpactEvent } from '../events';

type Point = { readonly x: number; readonly y: number };

const DEFAULT_TRAVEL_MS = 420;
const IMPACT_CHOREOGRAPHY_GATE_MS = 140;

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

type ImpactPhase = {
	readonly id: 'target' | 'counter';
	readonly source: PresentationTarget | null;
	readonly impact: PresentationImpact;
};

function impactPhases(
	event: CombatImpactEvent,
	presentation: CombatPresentation,
): readonly ImpactPhase[] {
	if (event.kind === 'counter' && presentation.counter) {
		return [{
			id: 'counter',
			source: presentation.counter.source,
			impact: presentation.counter,
		}];
	}

	const targetPhase: ImpactPhase = {
		id: 'target',
		source: presentation.source,
		impact: presentation.target,
	};
	if (event.kind !== 'hit' || !presentation.counter) return [targetPhase];

	return [targetPhase, {
		id: 'counter',
		source: presentation.counter.source,
		impact: presentation.counter,
	}];
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
			return { burst: 34, sparks: 14, smoke: 2, trail: 32 };
		default: {
			const exhaustive: never = level;
			return exhaustive;
		}
	}
}

function countsForImpact(phase: ImpactPhase): ReturnType<typeof primitiveCounts> {
	const counts = primitiveCounts(phase.impact.level);
	if (phase.impact.lethal !== true) return counts;
	return { ...counts, smoke: Math.max(counts.smoke, 5) };
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

const PIXI_FX_DURATION_MS: Record<PixiFxPrimitive, number> = {
	slashTrail: DEFAULT_TRAVEL_MS,
	impactBurst: 320,
	impactRing: 520,
	smokePuff: 620,
	sparkBurst: 360,
};

function scheduleDelayedChild(
	key: string,
	delayMs: number,
	priority: GameEffectPriority,
	start: () => GameEffectHandle | void,
): GameEffectHandle {
	let child: GameEffectHandle | undefined;
	const scheduled = gameEffectCoordinator.schedule({
		owner: 'visual-impact',
		lane: 'impact',
		key,
		priority,
		delayMs,
		run: () => {
			child = start() ?? undefined;
		},
	});
	const onComplete = scheduled.onComplete
		? scheduled.onComplete.then(() => child?.onComplete ?? Promise.resolve())
		: Promise.resolve();

	return {
		cancel: () => {
			scheduled.cancel();
			child?.cancel();
		},
		onComplete,
	};
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

function scheduleRecipeStep(
	phase: ImpactPhase,
	step: EffectRecipeStep,
	stepIndex: number,
	targetPoint: Point,
	sourcePoint: Point | null,
	counts: ReturnType<typeof primitiveCounts>,
	palette: ParticleColor,
	seed: string,
	priority: GameEffectPriority,
): GameEffectHandle {
	return scheduleDelayedChild(
		`${seed}:${phase.id}:recipe:${stepIndex}`,
		step.delayMs,
		priority,
		() => {
			const local = localPrimitive(step.primitive);
			if (local) return playLocalFx(phase.impact.target, local, priority);

			const pixi = pixiPrimitive(step.primitive);
			if (!pixi) return undefined;
			playPixiPrimitive(pixi, targetPoint, sourcePoint, counts, palette, seed);
			return scheduleVisualWindow(
				`${seed}:${phase.id}:recipe:${stepIndex}:duration`,
				PIXI_FX_DURATION_MS[pixi],
				priority,
			);
		},
	);
}

function scheduleDamageNumber(
	phase: ImpactPhase,
	targetPoint: Point,
	delayMs: number,
	event: CombatImpactEvent,
	priority: GameEffectPriority,
	seed: string,
): GameEffectHandle | null {
	if (phase.impact.outcome !== 'damage' || phase.impact.amount <= 0) return null;

	return scheduleDelayedChild(
		`${seed}:${phase.id}:damage-number`,
		delayMs,
		priority,
		() => {
			const effectId = scheduleDamageEffect(
				targetPoint,
				phase.impact.amount,
				event.kind === 'counter' || phase.id === 'counter'
					? 'combat-counter'
					: 'combat-damage',
			);
			const duration = scheduleVisualWindow(
				`${seed}:${phase.id}:damage-number:duration`,
				1_000,
				priority,
			);
			return {
				cancel: () => {
					duration.cancel();
					useAnimationOrchestrator.getState().cancelEffect(effectId);
				},
				onComplete: duration.onComplete,
			};
		},
	);
}

function scheduleImpactPhase(
	phase: ImpactPhase,
	recipe: readonly EffectRecipeStep[],
	targetPoint: Point,
	sourcePoint: Point | null,
	event: CombatImpactEvent,
	priority: GameEffectPriority,
	seed: string,
	includeTrail: boolean,
): GameEffectHandle {
	const counts = countsForImpact(phase);
	const scheduledSteps = scheduledRecipeSteps(recipe, includeTrail);
	const handles = scheduledSteps.map((step, index) => scheduleRecipeStep(
		phase,
		step,
		index,
		targetPoint,
		sourcePoint,
		counts,
		ELEMENT_PALETTES.neutral,
		seed,
		priority,
	));
	const lastRecipeDelay = maxRecipeDelay(recipe, includeTrail);
	const damageNumber = scheduleDamageNumber(
		phase,
		targetPoint,
		lastRecipeDelay,
		event,
		priority,
		seed,
	);
	if (damageNumber) handles.push(damageNumber);
	return combineEffectHandles(handles);
}

function scheduledRecipeSteps(
	recipe: readonly EffectRecipeStep[],
	includeTrail: boolean,
): readonly EffectRecipeStep[] {
	return recipe.filter(
		step => includeTrail || pixiPrimitive(step.primitive) !== 'slashTrail',
	);
}

function maxRecipeDelay(
	recipe: readonly EffectRecipeStep[],
	includeTrail: boolean,
): number {
	return scheduledRecipeSteps(recipe, includeTrail).reduce(
		(maxDelay, step) => Math.max(maxDelay, step.delayMs),
		0,
	);
}

function scheduleImpactPhaseWithGate(
	phase: ImpactPhase,
	recipe: readonly EffectRecipeStep[],
	targetPoint: Point,
	sourcePoint: Point | null,
	event: CombatImpactEvent,
	priority: GameEffectPriority,
	seed: string,
	includeTrail: boolean,
): GameEffectHandle {
	const effects = scheduleImpactPhase(
		phase,
		recipe,
		targetPoint,
		sourcePoint,
		event,
		priority,
		seed,
		includeTrail,
	);
	const gate = scheduleVisualWindow(
		`${seed}:${phase.id}:choreography-gate`,
		Math.max(IMPACT_CHOREOGRAPHY_GATE_MS, maxRecipeDelay(recipe, includeTrail)),
		priority,
	);

	return {
		cancel: () => {
			effects.cancel();
			gate.cancel();
		},
		onComplete: gate.onComplete,
	};
}

function schedulePrimaryTravel(
	phase: ImpactPhase,
	recipe: readonly EffectRecipeStep[],
	targetPoint: Point,
	sourcePoint: Point | null,
	event: CombatImpactEvent,
	priority: GameEffectPriority,
	seed: string,
): GameEffectHandle {
	const trail = recipe.find(step => pixiPrimitive(step.primitive) === 'slashTrail');
	const travelHold = scheduleVisualWindow(
		`${seed}:attack-travel:duration`,
		travelDuration(event),
		priority,
	);
	if (!trail) return travelHold;

	const trailHandle = scheduleRecipeStep(
		phase,
		trail,
		recipe.indexOf(trail),
		targetPoint,
		sourcePoint,
		countsForImpact(phase),
		ELEMENT_PALETTES.neutral,
		seed,
		priority,
	);
	return combineEffectHandles([travelHold, trailHandle]);
}

function pointForTarget(
	target: PresentationTarget,
	snapshots: ReadonlyMap<string, Point>,
): Point | null {
	return snapshots.get(targetEntityId(target)) ?? resolveArenaEffectPoint(endpointForTarget(target));
}

function captureImpactPoints(phases: readonly ImpactPhase[]): ReadonlyMap<string, Point> {
	const snapshots = new Map<string, Point>();
	for (const phase of phases) {
		for (const target of [phase.source, phase.impact.target]) {
			if (!target || snapshots.has(targetEntityId(target))) continue;
			const snapshot = captureVisualSnapshot(target);
			if (snapshot) snapshots.set(targetEntityId(target), snapshot.center);
		}
	}
	return snapshots;
}

function buildImpactPlanNodes(
	targetPhase: ImpactPhase,
	targetPoint: Point,
	targetSourcePoint: Point | null,
	counterPhase: ImpactPhase | undefined,
	counterPoint: Point | null,
	counterSourcePoint: Point | null,
	targetRecipe: readonly EffectRecipeStep[],
	presentation: CombatPresentation,
	event: CombatImpactEvent,
	priority: GameEffectPriority,
	seed: string,
): GameEffectNode[] {
	const nodes: GameEffectNode[] = [
		{
			id: 'attack-travel',
			run: () => schedulePrimaryTravel(
				targetPhase,
				targetRecipe,
				targetPoint,
				targetSourcePoint,
				event,
				priority,
				`${seed}:target`,
			),
		},
		{
			id: 'target-impact',
			after: ['attack-travel'],
			run: () => scheduleImpactPhaseWithGate(
				targetPhase,
				targetRecipe,
				targetPoint,
				targetSourcePoint,
				event,
				priority,
				`${seed}:target`,
				false,
			),
		},
	];

	if (counterPhase && counterPoint) {
		const counterRecipe = recipeForCombatPresentation(presentation, 'counter');
		nodes.push({
			id: 'counter-impact',
			after: ['target-impact'],
			run: () => scheduleImpactPhaseWithGate(
				counterPhase,
				counterRecipe,
				counterPoint,
				counterSourcePoint,
				event,
				priority,
				`${seed}:counter`,
				true,
			),
		});
	}

	const aftermathAfter = counterPhase && counterPoint ? 'counter-impact' : 'target-impact';
	nodes.push({
		id: 'aftermath',
		after: [aftermathAfter],
		run: () => scheduleVisualWindow(`${seed}:aftermath`, 1_000, priority),
	});
	return nodes;
}

function handleCombatImpact(event: CombatImpactEvent): EffectHandle | null {
	const presentation = event.presentation ?? fallbackPresentation(event);
	const phases = impactPhases(event, presentation);
	if (phases.length === 0 || phases.every(phase => phase.impact.amount <= 0)) return null;

	// Capture every endpoint synchronously while the combat state still owns
	// both cards. The later counter/death phases can then render from geometry
	// even when the primary impact removed a card from the DOM.
	const snapshots = captureImpactPoints(phases);

	const targetPhase = phases[0];
	const targetPoint = pointForTarget(targetPhase.impact.target, snapshots);
	if (!targetPoint) return null;
	const targetSourcePoint = targetPhase.source
		? pointForTarget(targetPhase.source, snapshots)
		: null;
	const targetRecipe = recipeForCombatPresentation(
		presentation,
		event.kind === 'counter' && presentation.counter ? 'counter' : 'target',
	);
	const counterPhase = phases.find(phase => phase.id === 'counter');
	const counterPoint = counterPhase
		? pointForTarget(counterPhase.impact.target, snapshots)
		: null;
	const counterSourcePoint = counterPhase?.source
		? pointForTarget(counterPhase.source, snapshots)
		: null;
	const seed = event.intent?.id ?? event.id;
	const priority = priorityFor(event);
	return gameEffectMediator.dispatch({
		id: `combat-impact:${presentation.id}`,
		owner: 'visual-impact',
		lane: 'impact',
		priority,
		nodes: buildImpactPlanNodes(
			targetPhase,
			targetPoint,
			targetSourcePoint,
			counterPhase,
			counterPoint,
			counterSourcePoint,
			targetRecipe,
			presentation,
			event,
			priority,
			seed,
		),
	});
}

export function registerCombatImpactVisualEffect(): VisualEffectUnregister {
	return registerVisualEffect('combatImpact', handleCombatImpact);
}

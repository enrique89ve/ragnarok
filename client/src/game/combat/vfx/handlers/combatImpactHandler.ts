import {
	scheduleDamageEffect,
	useAnimationOrchestrator,
} from '../../../animations/UnifiedAnimationOrchestrator';
import {
	spawnDirectionalImpactBurst,
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
	resolvePresentationTargetElement,
	targetEntityId,
} from '@/game/effects/presentation/EffectTargetResolver';
import {
	attackDirectionBetween,
	combatImpactMotionProfile,
	motionVector,
	type CombatAttackDirection,
	type CombatImpactMotionProfile,
} from '@/game/effects/presentation/CombatImpactMotion';
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

const DEFAULT_TRAVEL_MS = 300;
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

function travelDuration(event: CombatImpactEvent, profile: CombatImpactMotionProfile): number {
	const duration = event.intent?.motion.durationMs ?? profile.travelMs;
	return Math.min(320, Math.max(260, duration));
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

function motionHost(target: PresentationTarget): HTMLElement | null {
	const element = resolvePresentationTargetElement(target);
	if (!element) return null;
	return element.closest<HTMLElement>('.bf-card-wrapper')
		?? (element.matches('.bf-card-wrapper') ? element : element);
}

function setMotionProperty(host: HTMLElement, name: string, value: number, unit = 'px'): void {
	host.style.setProperty(name, `${value}${unit}`);
}

function clearCombatMotion(host: HTMLElement): void {
	host.classList.remove('combat-action-lunge', 'combat-action-recover', 'combat-reaction-recoil');
	[
		'--bf-action-anticipation-x', '--bf-action-anticipation-y',
		'--bf-action-contact-x', '--bf-action-contact-y', '--bf-action-contact-rotate', '--bf-action-anticipation-rotate',
		'--bf-action-rebound-x', '--bf-action-rebound-y', '--bf-action-rebound-rotate',
		'--bf-action-travel-duration', '--bf-action-recovery-duration',
		'--bf-reaction-impulse-x', '--bf-reaction-impulse-y',
		'--bf-reaction-rebound-x', '--bf-reaction-rebound-y',
		'--bf-reaction-tail-x', '--bf-reaction-tail-y',
		'--bf-reaction-rotate-peak', '--bf-reaction-rebound-rotate', '--bf-reaction-tail-rotate', '--bf-reaction-duration',
	].forEach(property => host.style.removeProperty(property));
}

function scheduleAttackMotion(
	target: PresentationTarget,
	direction: CombatAttackDirection,
	profile: CombatImpactMotionProfile,
	priority: GameEffectPriority,
	seed: string,
): GameEffectHandle {
	const host = motionHost(target);
	if (!host) return { cancel() {}, onComplete: Promise.resolve() };

	clearCombatMotion(host);
	const contactVector = motionVector(direction, profile.lungePx);
	const anticipation = motionVector(direction, -profile.lungePx * 0.12);
	const rebound = motionVector(direction, profile.lungePx * 0.08);
	setMotionProperty(host, '--bf-action-anticipation-x', anticipation.x);
	setMotionProperty(host, '--bf-action-anticipation-y', anticipation.y);
	setMotionProperty(host, '--bf-action-contact-x', contactVector.x);
	setMotionProperty(host, '--bf-action-contact-y', contactVector.y);
	setMotionProperty(host, '--bf-action-contact-rotate', direction.x * profile.rotationDeg, 'deg');
	setMotionProperty(host, '--bf-action-anticipation-rotate', direction.x * profile.rotationDeg * -0.15, 'deg');
	setMotionProperty(host, '--bf-action-rebound-x', rebound.x);
	setMotionProperty(host, '--bf-action-rebound-y', rebound.y);
	setMotionProperty(host, '--bf-action-rebound-rotate', direction.x * profile.rotationDeg * 0.18, 'deg');
	setMotionProperty(host, '--bf-action-travel-duration', profile.travelMs, 'ms');
	setMotionProperty(host, '--bf-action-recovery-duration', profile.recoveryMs, 'ms');
	host.classList.add('combat-action-lunge');

	const contact = scheduleVisualWindow(
		`${seed}:attack-action:contact`,
		profile.travelMs,
		priority,
	);
	const recover = scheduleVisualWindow(
		`${seed}:attack-action:recover`,
		profile.travelMs + profile.hitStopMs,
		priority,
	);
	const cleanup = scheduleDelayedChild(
		`${seed}:attack-action:cleanup`,
		profile.travelMs + profile.hitStopMs + profile.recoveryMs,
		priority,
		() => {
			clearCombatMotion(host);
			return undefined;
		},
	);
	recover.onComplete?.then(() => {
		host.classList.remove('combat-action-lunge');
		host.classList.add('combat-action-recover');
	});

	return {
		cancel: () => {
			contact.cancel();
			recover.cancel();
			cleanup.cancel();
			clearCombatMotion(host);
		},
		onComplete: contact.onComplete,
	};
}

function scheduleTargetReaction(
	target: PresentationTarget,
	direction: CombatAttackDirection,
	profile: CombatImpactMotionProfile,
	priority: GameEffectPriority,
	seed: string,
): GameEffectHandle {
	const host = motionHost(target);
	if (!host) return { cancel() {}, onComplete: Promise.resolve() };

	const impulse = motionVector(direction, profile.recoilPx);
	const rebound = motionVector(direction, -profile.recoilPx * 0.18);
	const tail = motionVector(direction, profile.recoilPx * 0.08);
	setMotionProperty(host, '--bf-reaction-impulse-x', impulse.x);
	setMotionProperty(host, '--bf-reaction-impulse-y', impulse.y);
	setMotionProperty(host, '--bf-reaction-rebound-x', rebound.x);
	setMotionProperty(host, '--bf-reaction-rebound-y', rebound.y);
	setMotionProperty(host, '--bf-reaction-tail-x', tail.x);
	setMotionProperty(host, '--bf-reaction-tail-y', tail.y);
	setMotionProperty(host, '--bf-reaction-rotate-peak', direction.x * profile.rotationDeg, 'deg');
	setMotionProperty(host, '--bf-reaction-rebound-rotate', direction.x * profile.rotationDeg * -0.35, 'deg');
	setMotionProperty(host, '--bf-reaction-tail-rotate', direction.x * profile.rotationDeg * 0.15, 'deg');
	setMotionProperty(host, '--bf-reaction-duration', profile.recoveryMs, 'ms');
	host.classList.remove('combat-reaction-recoil');
	void host.offsetWidth;
	host.classList.add('combat-reaction-recoil');

	const cleanup = scheduleVisualWindow(
		`${seed}:target-reaction:cleanup`,
		profile.recoveryMs,
		priority,
	);
	cleanup.onComplete?.then(() => clearCombatMotion(host));
	return {
		cancel: () => {
			cleanup.cancel();
			clearCombatMotion(host);
		},
		onComplete: cleanup.onComplete,
	};
}

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
	direction: CombatAttackDirection,
	travelMs: number,
	counts: ReturnType<typeof primitiveCounts>,
	palette: ParticleColor,
	seed: string,
): void {
	switch (primitive) {
		case 'slashTrail':
			if (source) {
				spawnSlashTrail(source.x, source.y, point.x, point.y, counts.trail, palette, seed, travelMs);
			}
			break;
		case 'impactBurst':
			spawnDirectionalImpactBurst(point.x, point.y, counts.burst, palette, direction, seed);
			break;
		case 'impactRing':
			spawnImpactRing(point.x, point.y, palette);
			break;
		case 'smokePuff':
			if (counts.smoke > 0) spawnSmokePuff(point.x, point.y, counts.smoke, palette, seed);
			break;
		case 'sparkBurst':
			spawnSparkBurst(point.x, point.y, counts.sparks, palette, seed, direction);
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
	direction: CombatAttackDirection,
	travelMs: number,
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
			playPixiPrimitive(pixi, targetPoint, sourcePoint, direction, travelMs, counts, palette, seed);
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
					800,
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
	direction: CombatAttackDirection,
	profile: CombatImpactMotionProfile,
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
		direction,
		profile.travelMs,
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
	direction: CombatAttackDirection,
	profile: CombatImpactMotionProfile,
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
		direction,
		profile,
		event,
		priority,
		seed,
		includeTrail,
	);
	const reaction = scheduleTargetReaction(
		phase.impact.target,
		direction,
		profile,
		priority,
		seed,
	);
	const gate = scheduleVisualWindow(
		`${seed}:${phase.id}:choreography-gate`,
		Math.max(IMPACT_CHOREOGRAPHY_GATE_MS, maxRecipeDelay(recipe, includeTrail)),
		priority,
	);

	return {
		cancel: () => {
			effects.cancel();
			reaction.cancel();
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
	direction: CombatAttackDirection,
	profile: CombatImpactMotionProfile,
	event: CombatImpactEvent,
	priority: GameEffectPriority,
	seed: string,
): GameEffectHandle {
	const trail = recipe.find(step => pixiPrimitive(step.primitive) === 'slashTrail');
	const travelHold = scheduleVisualWindow(
		`${seed}:attack-travel:duration`,
		travelDuration(event, profile),
		priority,
	);
	const action = scheduleAttackMotion(phase.source ?? phase.impact.target, direction, profile, priority, seed);
	if (!trail) return combineEffectHandles([travelHold, action]);

	const trailHandle = scheduleRecipeStep(
		phase,
		trail,
		recipe.indexOf(trail),
		targetPoint,
		sourcePoint,
		countsForImpact(phase),
		ELEMENT_PALETTES.neutral,
		direction,
		profile.travelMs,
		seed,
		priority,
	);
	return combineEffectHandles([travelHold, trailHandle, action]);
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
			run: () => {
				const profile = combatImpactMotionProfile(
					targetPhase.impact.level,
					targetPhase.impact.lethal,
				);
				const travelProfile = { ...profile, travelMs: travelDuration(event, profile) };
				const direction = attackDirectionBetween(
					targetSourcePoint,
					targetPoint,
					event.presentation?.attackerSide === 'player' ? -1 : 1,
				);
				return schedulePrimaryTravel(
					targetPhase,
					targetRecipe,
					targetPoint,
					targetSourcePoint,
					direction,
					travelProfile,
					event,
					priority,
					`${seed}:target`,
				);
			},
		},
		{
			id: 'target-impact',
			after: ['attack-travel'],
			run: () => {
				const profile = combatImpactMotionProfile(
					targetPhase.impact.level,
					targetPhase.impact.lethal,
				);
				const direction = attackDirectionBetween(
					targetSourcePoint,
					targetPoint,
					event.presentation?.attackerSide === 'player' ? -1 : 1,
				);
				return scheduleImpactPhaseWithGate(
					targetPhase,
					targetRecipe,
					targetPoint,
					targetSourcePoint,
					direction,
					profile,
					event,
					priority,
					`${seed}:target`,
					false,
				);
			},
		},
	];

	if (counterPhase && counterPoint) {
		const counterRecipe = recipeForCombatPresentation(presentation, 'counter');
		nodes.push({
			id: 'counter-impact',
			after: ['target-impact'],
			run: () => {
				const profile = combatImpactMotionProfile(
					counterPhase.impact.level,
					counterPhase.impact.lethal,
				);
				const direction = attackDirectionBetween(
					counterSourcePoint,
					counterPoint,
					event.presentation?.attackerSide === 'player' ? -1 : 1,
				);
				return scheduleImpactPhaseWithGate(
					counterPhase,
					counterRecipe,
					counterPoint,
					counterSourcePoint,
					direction,
					profile,
					event,
					priority,
					`${seed}:counter`,
					true,
				);
			},
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

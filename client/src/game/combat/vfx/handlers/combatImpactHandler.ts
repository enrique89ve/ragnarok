import {
	DAMAGE_EFFECT_DURATION_MS,
} from '../../../animations/UnifiedAnimationOrchestrator';
import { requestCombatDamageFloater } from '../../floaters/combatDamageFloater';
import {
	spawnArcaneVortex,
	spawnArenaFlash,
	spawnChromaticSlash,
	spawnDiamondShards,
	spawnDirectionalImpactBurst,
	spawnEmbers,
	spawnImpactRing,
	spawnMagicTunnel,
	spawnShieldDome,
	spawnSlashTrail,
	spawnSmokePuff,
	spawnSparkBurst,
	spawnStarburstBloom,
	spawnTranslucentRibbon,
	spawnTravelingGlowRing,
	triggerEmotionalImpulse,
	type ParticleColor,
} from '../../../animations/PixiParticleCanvas';
import {
	resolveCardSymbolAttackChoreography,
	type SymbolAttackChoreography,
} from '../cardSymbolAttackContract';
import { proceduralAudio } from '../../../audio/proceduralAudio';
import {
	ARENA_COORDINATE_CONTRACT,
	arenaContractPointToViewport,
	hostileFrontAnchorFor,
} from '../arenaCoordinateContract';
import {
	getArenaLocalPoint,
	getArenaVfxCoordinateLayer,
} from '../../arenaVfxTargets';
import { triggerArenaShake } from '../arenaShake';
import { vfxOrchestrationDirector } from '../vfxOrchestrationDirector';
import { holdHeroVisualHp, releaseHeroVisualHp } from '../visualVitalsHold';
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
	buildCombatPresentationFromResolvedAttack,
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
import {
	COMBAT_LETHAL_TIMELINE_MS,
	holdCombatVisualLifetime,
	lethalVisualLifetimeMs,
} from '../combatVisualLifetime';
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
import { playLocalFx, triggerCardImpactVibration, combineEffectHandles } from '../localFxPrimitives';
import { registerVisualEffect, type EffectHandle, type VisualEffectUnregister } from '../registry';
import type { CombatImpactEvent } from '../events';

type Point = { readonly x: number; readonly y: number };

const DEFAULT_TRAVEL_MS = 420;
const IMPACT_REACTION_DELAY_MS = 40;
const IMPACT_CHOREOGRAPHY_GATE_MS = COMBAT_LETHAL_TIMELINE_MS.impact;

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

function holdLethalCardVisuals(presentation: CombatPresentation): void {
	const impacts = [presentation.target, presentation.counter].filter(
	(impact): impact is PresentationImpact => impact !== undefined,
	);
	for (const impact of impacts) {
		if (impact.lethal !== true || impact.target.type !== 'card') continue;
		holdCombatVisualLifetime(
			impact.target.instanceId,
			lethalVisualLifetimeMs(presentation.counter !== undefined),
		);
	}
}

function travelDuration(event: CombatImpactEvent, profile: CombatImpactMotionProfile): number {
	const duration = event.intent?.motion.durationMs ?? profile.travelMs;
	return Math.min(520, Math.max(340, duration));
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
		?? element.closest<HTMLElement>('.hero-card-wrapper')
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
	distancePx?: number,
): GameEffectHandle {
	const host = motionHost(target);
	if (!host) return { cancel() {}, onComplete: Promise.resolve() };

	clearCombatMotion(host);
	// Scale card lunge proportionally toward the real arena-space target distance
	// (1920x1080 coordinates) so attacks visibly reach the enemy regardless of
	// browser viewport scale, instead of twitching 20px in place.
	const effectiveLungePx = distancePx && distancePx > 0
		? Math.min(180, Math.max(profile.lungePx * 2.2, distancePx * 0.48))
		: profile.lungePx * 2;
	const contactVector = motionVector(direction, effectiveLungePx);
	const anticipation = motionVector(direction, -Math.min(20, effectiveLungePx * 0.16));
	const rebound = motionVector(direction, effectiveLungePx * 0.08);
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
	if (phase.impact.outcome !== 'damage' || phase.impact.healthDamage <= 0) return null;

	return scheduleDelayedChild(
		`${seed}:${phase.id}:damage-number`,
		delayMs,
		priority,
		() => {
			const floaterId = `${seed}:${phase.id}:damage-number`;
			requestCombatDamageFloater({
				id: floaterId,
				targetId: targetEntityId(phase.impact.target),
				amount: phase.impact.healthDamage,
			});
			return scheduleVisualWindow(
				`${floaterId}:duration`,
				DAMAGE_EFFECT_DURATION_MS,
				priority,
			);
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
	palette: ParticleColor,
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
		palette,
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

function playImpactAudioAndShake(phase: ImpactPhase): void {
	try {
		if (phase.impact.outcome === 'shield') {
			proceduralAudio.play('sword_clash');
			return;
		}
		if (phase.impact.target.type === 'hero') {
			proceduralAudio.play(phase.impact.level === 'heavy' || phase.impact.lethal === true ? 'damage_hero' : 'damage');
		} else {
			proceduralAudio.play('damage');
		}
	} catch {
		// Audio context unavailable in headless/test environments
	}

	if (phase.impact.lethal === true) {
		triggerArenaShake('lethal');
	} else if (phase.impact.level === 'heavy') {
		triggerArenaShake('heavy');
	}
}

function scheduleImpactPhaseWithGate(
	phase: ImpactPhase,
	recipe: readonly EffectRecipeStep[],
	targetPoint: Point,
	sourcePoint: Point | null,
	direction: CombatAttackDirection,
	profile: CombatImpactMotionProfile,
	palette: ParticleColor,
	choreography: SymbolAttackChoreography,
	event: CombatImpactEvent,
	priority: GameEffectPriority,
	seed: string,
	includeTrail: boolean,
): GameEffectHandle {
	playImpactAudioAndShake(phase);

	// Symbol-contract 2D impact signature rendered purely in PixiJS v8 + tactile
	// CSS card vibration on the actual damage receiver.
	if (phase.impact.outcome === 'shield') {
		spawnShieldDome(targetPoint.x, targetPoint.y);
		triggerCardImpactVibration(phase.impact.target, 'normal', priority);
	} else {
		const isHeavy = phase.impact.lethal === true || phase.impact.level === 'heavy';
		triggerCardImpactVibration(phase.impact.target, isHeavy ? 'heavy' : 'normal', priority);
		spawnChromaticSlash(targetPoint.x, targetPoint.y, direction, palette, choreography.slashScale);
		spawnDiamondShards(
			targetPoint.x,
			targetPoint.y,
			choreography.shardCount,
			palette,
			direction,
			`${seed}:${phase.id}`,
		);
		if (choreography.spawnVortex) {
			spawnArcaneVortex(targetPoint.x, targetPoint.y, palette, 500);
		}
		if (choreography.spawnEmbers) {
			spawnEmbers(targetPoint.x, targetPoint.y, isHeavy ? 10 : 6, palette);
		}
		if (choreography.spawnStarburst || isHeavy) {
			spawnStarburstBloom(
				targetPoint.x,
				targetPoint.y,
				palette,
				phase.impact.lethal === true ? 1.45 : isHeavy ? 1.2 : 0.95,
				340,
			);
		}
		if (isHeavy) {
			spawnArenaFlash(palette.primary, phase.impact.lethal === true ? 0.2 : 0.12, 220);
			triggerEmotionalImpulse('shock', phase.impact.lethal === true ? 0.92 : 0.55);
			if (phase.impact.lethal === true) {
				vfxOrchestrationDirector.triggerCriticalSpotlight(680);
			}
		}
		// Lifesteal return ribbon flowing visibly from target back to the caster hero
		if (choreography.returnRibbonPalette && phase.id === 'target') {
			const casterSide = event.presentation?.attackerSide ?? 'player';
			const casterHeroPoint = arenaContractPointToViewport(
				casterSide === 'player'
					? ARENA_COORDINATE_CONTRACT.playerHero
					: ARENA_COORDINATE_CONTRACT.opponentHero,
			);
			if (casterHeroPoint) {
				spawnTranslucentRibbon(
					targetPoint.x,
					targetPoint.y,
					casterHeroPoint.x,
					casterHeroPoint.y,
					choreography.returnRibbonPalette,
					{ strands: 2, durationMs: 360, lingerMs: 340, arcFactor: 0.2 },
				);
			}
		}
	}

	const effects = scheduleImpactPhase(
		phase,
		recipe,
		targetPoint,
		sourcePoint,
		direction,
		profile,
		palette,
		event,
		priority,
		seed,
		includeTrail,
	);
	const reaction = scheduleDelayedChild(
		`${seed}:${phase.id}:target-reaction`,
		IMPACT_REACTION_DELAY_MS,
		priority,
		() => scheduleTargetReaction(
			phase.impact.target,
			direction,
			profile,
			priority,
			seed,
		),
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

function arenaDistanceBetween(source: Point | null, target: Point): number | undefined {
	if (!source) return undefined;
	const layer = getArenaVfxCoordinateLayer();
	if (layer) {
		const localSource = getArenaLocalPoint(source, layer);
		const localTarget = getArenaLocalPoint(target, layer);
		if (localSource && localTarget) {
			return Math.hypot(localTarget.x - localSource.x, localTarget.y - localSource.y);
		}
	}
	return Math.hypot(target.x - source.x, target.y - source.y);
}

function schedulePrimaryTravel(
	phase: ImpactPhase,
	recipe: readonly EffectRecipeStep[],
	targetPoint: Point,
	sourcePoint: Point | null,
	direction: CombatAttackDirection,
	profile: CombatImpactMotionProfile,
	palette: ParticleColor,
	choreography: SymbolAttackChoreography,
	event: CombatImpactEvent,
	priority: GameEffectPriority,
	seed: string,
): GameEffectHandle {
	const trail = recipe.find(step => pixiPrimitive(step.primitive) === 'slashTrail');
	const travelMs = Math.round(travelDuration(event, profile) * choreography.travelSpeedMultiplier);
	const travelHold = scheduleVisualWindow(
		`${seed}:attack-travel:duration`,
		travelMs,
		priority,
	);
	const distancePx = arenaDistanceBetween(sourcePoint, targetPoint);
	const action = scheduleAttackMotion(
		phase.source ?? phase.impact.target,
		direction,
		profile,
		priority,
		seed,
		distancePx,
	);

	// Alternate between 2D Magic Tunnel and Braided Translucent Silk Ribbon per
	// the card's real symbol choreography contract (element + keywords + race).
	if (sourcePoint) {
		if (choreography.travelStyle === 'tunnel') {
			spawnMagicTunnel(
				sourcePoint.x,
				sourcePoint.y,
				targetPoint.x,
				targetPoint.y,
				palette,
				{
					rings: choreography.tunnelRings,
					durationMs: travelMs,
				},
			);
		} else {
			spawnTranslucentRibbon(
				sourcePoint.x,
				sourcePoint.y,
				targetPoint.x,
				targetPoint.y,
				palette,
				{
					strands: choreography.ribbonStrands,
					durationMs: travelMs,
					lingerMs: phase.impact.lethal === true ? 380 : 280,
					arcFactor: choreography.ribbonArcFactor,
				},
			);
		}
		spawnTravelingGlowRing(
			sourcePoint.x,
			sourcePoint.y,
			targetPoint.x,
			targetPoint.y,
			palette,
			travelMs,
		);
	}

	if (!trail) return combineEffectHandles([travelHold, action]);

	const trailHandle = scheduleRecipeStep(
		phase,
		trail,
		recipe.indexOf(trail),
		targetPoint,
		sourcePoint,
		countsForImpact(phase),
		palette,
		direction,
		travelMs,
		seed,
		priority,
	);
	return combineEffectHandles([travelHold, trailHandle, action]);
}

function contractFallbackPointForTarget(
	target: PresentationTarget,
	fallbackSide: 'player' | 'opponent',
): Point | null {
	if (target.type === 'hero') {
		return arenaContractPointToViewport(
			target.side === 'player'
				? ARENA_COORDINATE_CONTRACT.playerHero
				: ARENA_COORDINATE_CONTRACT.opponentHero,
		);
	}
	if (target.type === 'field') {
		return arenaContractPointToViewport(
			target.side === 'player'
				? ARENA_COORDINATE_CONTRACT.playerFront
				: ARENA_COORDINATE_CONTRACT.opponentFront,
		);
	}
	return arenaContractPointToViewport(
		fallbackSide === 'player'
			? ARENA_COORDINATE_CONTRACT.playerFront
			: ARENA_COORDINATE_CONTRACT.opponentFront,
	);
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

function triggerLethalEmphasisVfx(
	targetPhase: ImpactPhase,
	targetPoint: Point,
	counterPhase: ImpactPhase | undefined,
	counterPoint: Point | null,
	palette: ParticleColor,
	seed: string,
): void {
	if (targetPhase.impact.lethal === true) {
		spawnImpactRing(targetPoint.x, targetPoint.y, palette, 'luminous');
		spawnSparkBurst(targetPoint.x, targetPoint.y, 12, palette, `${seed}:lethal-target`);
	}
	if (counterPhase?.impact.lethal === true && counterPoint) {
		spawnImpactRing(counterPoint.x, counterPoint.y, palette, 'luminous');
		spawnSparkBurst(counterPoint.x, counterPoint.y, 12, palette, `${seed}:lethal-counter`);
	}
}

function triggerDeathVfx(
	targetPhase: ImpactPhase,
	targetPoint: Point,
	counterPhase: ImpactPhase | undefined,
	counterPoint: Point | null,
	palette: ParticleColor,
	seed: string,
): void {
	const lethalEntries: Array<{ phase: ImpactPhase; point: Point }> = [];
	if (targetPhase.impact.lethal === true) lethalEntries.push({ phase: targetPhase, point: targetPoint });
	if (counterPhase?.impact.lethal === true && counterPoint) lethalEntries.push({ phase: counterPhase, point: counterPoint });

	for (const { phase, point } of lethalEntries) {
		spawnImpactRing(point.x, point.y, palette, 'luminous');
		spawnSparkBurst(point.x, point.y, 16, palette, `${seed}:death-sparks:${phase.id}`);
		spawnSmokePuff(point.x, point.y, 6, palette, `${seed}:death-smoke:${phase.id}`);
		spawnEmbers(point.x, point.y, 10, palette);
		if (phase.impact.target.type === 'card') {
			const host = motionHost(phase.impact.target);
			host?.classList.add('card-fx--dying');
		}
	}
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
	const choreography = resolveCardSymbolAttackChoreography({
		element: presentation.element,
		keywords: presentation.keywords,
		race: presentation.race,
		level: targetPhase.impact.level,
		lethal: targetPhase.impact.lethal,
	});
	const palette = choreography.palette;
	const targetZone = event.targetId === 'player-hero'
		? 'playerHero'
		: event.targetId === 'opponent-hero'
			? 'opponentHero'
			: 'board';
	const cascadeSlot = vfxOrchestrationDirector.reserveCascadeSlot({
		weight: targetPhase.impact.lethal || targetPhase.impact.level === 'heavy' ? 'heavy' : 'medium',
		zone: targetZone,
	});
	const paceDelayMs = cascadeSlot.delayMs;
	const nodes: GameEffectNode[] = [
		{
			id: 'attack-travel',
			...(paceDelayMs > 0 ? { delayMs: paceDelayMs } : {}),
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
					palette,
					choreography,
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
				if (targetPhase.impact.target.type === 'hero') {
					releaseHeroVisualHp(targetPhase.impact.target.side, seed);
				}
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
					palette,
					choreography,
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
		const counterChoreography = resolveCardSymbolAttackChoreography({
			element: 'neutral',
			level: counterPhase.impact.level,
			lethal: counterPhase.impact.lethal,
		});
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
					counterChoreography.palette,
					counterChoreography,
					event,
					priority,
					`${seed}:counter`,
					true,
				);
			},
		});
	}

	const impactAfter = counterPhase && counterPoint ? 'counter-impact' : 'target-impact';
	let aftermathAfter: string = impactAfter;
	const hasLethalOutcome = targetPhase.impact.lethal === true
		|| counterPhase?.impact.lethal === true;
	if (hasLethalOutcome) {
		nodes.push({
			id: 'lethal-confirmed',
			after: [impactAfter],
			run: () => {
				triggerLethalEmphasisVfx(targetPhase, targetPoint, counterPhase, counterPoint, palette, seed);
				return scheduleVisualWindow(
					`${seed}:lethal-confirmed`,
					COMBAT_LETHAL_TIMELINE_MS.lethalEmphasis,
					priority,
				);
			},
		});
		nodes.push({
			id: 'death',
			after: ['lethal-confirmed'],
			run: () => {
				triggerDeathVfx(targetPhase, targetPoint, counterPhase, counterPoint, palette, seed);
				return scheduleVisualWindow(
					`${seed}:death`,
					COMBAT_LETHAL_TIMELINE_MS.death,
					priority,
				);
			},
		});
		aftermathAfter = 'death';
	}
	nodes.push({
		id: 'aftermath',
		after: [aftermathAfter],
		run: () => scheduleVisualWindow(`${seed}:aftermath`, 1_000, priority),
	});
	return nodes;
}

function handleCombatImpact(event: CombatImpactEvent): EffectHandle | null {
	const presentation = event.resolvedAttack
		? buildCombatPresentationFromResolvedAttack(event.resolvedAttack)
		: event.presentation ?? fallbackPresentation(event);
	const phases = impactPhases(event, presentation);
	if (phases.length === 0 || phases.every(phase =>
		phase.impact.amount <= 0 && phase.impact.outcome !== 'shield' && phase.impact.lethal !== true
	)) return null;
	holdLethalCardVisuals(presentation);

	// Snapshot available anchors once. Removed cards can use their retained exit
	// geometry, or the arena fallback when no DOM anchor remains.
	const snapshots = captureImpactPoints(phases);

	const defenderSide = presentation.attackerSide === 'player' ? 'opponent' : 'player';
	const targetPhase = phases[0];
	const targetPoint = pointForTarget(targetPhase.impact.target, snapshots)
		?? contractFallbackPointForTarget(targetPhase.impact.target, defenderSide)
		?? arenaContractPointToViewport(hostileFrontAnchorFor(presentation.attackerSide));
	if (!targetPoint) return null;
	const targetSourcePoint = targetPhase.source
		? (pointForTarget(targetPhase.source, snapshots)
			?? contractFallbackPointForTarget(targetPhase.source, presentation.attackerSide))
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

	// Latch hero displayed HP until the exact target-impact beat lands.
	if (
		targetPhase.impact.target.type === 'hero'
		&& event.resolvedAttack
		&& event.resolvedAttack.healthDamageToTarget > 0
	) {
		const profile = combatImpactMotionProfile(
			targetPhase.impact.level,
			targetPhase.impact.lethal,
		);
		const holdMs = travelDuration(event, profile) + 600;
		holdHeroVisualHp(
			targetPhase.impact.target.side,
			event.resolvedAttack.targetHealthBefore,
			seed,
			holdMs,
		);
	}

	const handle = gameEffectMediator.dispatch({
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
	return {
		onComplete: handle.onComplete,
		cancel: () => {
			if (targetPhase.impact.target.type === 'hero') {
				releaseHeroVisualHp(targetPhase.impact.target.side, seed);
			}
			handle.cancel();
		},
	};
}

export function registerCombatImpactVisualEffect(): VisualEffectUnregister {
	return registerVisualEffect('combatImpact', handleCombatImpact);
}

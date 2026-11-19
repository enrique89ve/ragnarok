import {
	spawnDiamondShards,
	spawnImpactRing,
	spawnMagicTunnel,
	spawnParticleBurst,
	spawnPokerTravelTrail,
	spawnRunePulse,
	spawnStarburstBloom,
	spawnTranslucentRibbon,
	spawnTravelingGlowRing,
	triggerEmotionalImpulse,
	type ParticleColor,
} from '../../animations/PixiParticleCanvas';
import { gameEffectCoordinator } from '@/game/effects/core/gameEffectCoordinator';
import { triggerArenaShake } from '../vfx/arenaShake';
import { resolveDynamicVfxIntensity } from '../vfx/vfxIntensityMatrix';
import {
	ARENA_VFX_TARGETS,
	getArenaVfxHeroTarget,
	getArenaVfxTarget,
	getBoundArenaVfxQueryRoot,
	minionCardCenterPoints,
	type ArenaVfxOwner,
} from '../arenaVfxTargets';
import { resolveArenaEffectPoint } from '@/game/effects/presentation';
import { triggerCardImpactVibration } from '../vfx/localFxPrimitives';
import type {
	CallClashEndpoints,
	PokerVfxPoint,
	PokerVfxResolvedIntent,
} from './pokerVfxCatalog';
import { resolveCallClashEndpoints } from './pokerVfxCatalog';

const DEFAULT_TRAVEL_MS = 340;
const AOE_STAGGER_MS = 70;

function stampTransientClass(
	el: HTMLElement | null,
	className: string,
	durationMs: number,
	key: string,
): void {
	if (!el) return;
	el.classList.remove(className);
	void el.offsetWidth;
	el.classList.add(className);
	gameEffectCoordinator.schedule({
		owner: 'poker-vfx-dom',
		lane: 'pulse',
		key,
		priority: 'normal',
		delayMs: durationMs,
		run: () => el.classList.remove(className),
	});
}

export function playLocalPulseAt(target: PokerVfxPoint, palette: ParticleColor): void {
	spawnImpactRing(target.x, target.y, palette, 'luminous');
	spawnParticleBurst(target.x, target.y, 12, palette);
}

export function playTravelImpact(
	source: PokerVfxPoint,
	target: PokerVfxPoint,
	palette: ParticleColor,
	seed?: string,
	travelMs = DEFAULT_TRAVEL_MS,
): void {
	spawnTranslucentRibbon(
		source.x,
		source.y,
		target.x,
		target.y,
		palette,
		{
			strands: 2,
			durationMs: travelMs,
			lingerMs: 420,
		},
	);
	spawnTravelingGlowRing(
		source.x,
		source.y,
		target.x,
		target.y,
		palette,
		travelMs,
		() => {
			spawnStarburstBloom(target.x, target.y, palette, 1.15, 340);
			spawnDiamondShards(target.x, target.y, 10, palette, undefined, seed);
			spawnParticleBurst(target.x, target.y, 14, palette, seed);
		},
	);
	spawnPokerTravelTrail(source.x, source.y, target.x, target.y, palette, seed, travelMs);
}

function pulseStakeSink(firm = false): void {
	const sink = getArenaVfxTarget(ARENA_VFX_TARGETS.stakeSink, getBoundArenaVfxQueryRoot());
	stampTransientClass(
		sink,
		firm ? 'vfx-pulse-stake--firm' : 'vfx-pulse-stake',
		firm ? 280 : 260,
		'stake-sink',
	);
}

function pulseStakesHud(): void {
	const riskBadge = getArenaVfxTarget(ARENA_VFX_TARGETS.riskDisplay, getBoundArenaVfxQueryRoot());
	stampTransientClass(riskBadge, 'vfx-pulse-hud', 220, 'stakes-hud');
}

function pulseSelfHeroGlow(side: PokerVfxResolvedIntent['side'], strength: 'subtle' | 'firm' = 'subtle'): void {
	const hero = getArenaVfxHeroTarget(side, getBoundArenaVfxQueryRoot());
	const firm = strength === 'firm';
	stampTransientClass(
		hero,
		firm ? 'vfx-pulse-hero--firm' : 'vfx-pulse-hero',
		firm ? 340 : 280,
		`hero-glow:${side}`,
	);
}

/**
 * LoR-style motion execution: anchor Pixi 2D particles to resolved arena
 * endpoints, and use pure CSS transient classes for DOM pulses (zero GSAP).
 */
export function playPokerVfxIntent(
	intent: PokerVfxResolvedIntent,
	options?: {
		seed?: string;
		travelMs?: number;
		stakeStrength?: 'subtle' | 'firm';
		amount?: number;
		reraiseLevel?: number;
		isAllIn?: boolean;
	},
): void {
	const { motion, sourcePoint, targetPoint, palette, side } = intent;
	const travelMs = options?.travelMs ?? DEFAULT_TRAVEL_MS;
	const seed = options?.seed;

	switch (motion) {
		case 'local-pulse': {
			const point = targetPoint ?? sourcePoint;
			if (point) playLocalPulseAt(point, palette);
			return;
		}
		case 'travel-impact': {
			if (!sourcePoint || !targetPoint) {
				if (targetPoint) playLocalPulseAt(targetPoint, palette);
				return;
			}
			playTravelImpact(sourcePoint, targetPoint, palette, seed, travelMs);
			return;
		}
		case 'stake-to-pot': {
			const opposingCount = intent.opposingCardCount ?? (intent.targetHasCards ? 1 : 0);
			const matrix = resolveDynamicVfxIntensity({
				opposingCardCount: opposingCount,
				amount: options?.amount ?? intent.stakeAmount,
				reraiseLevel: options?.reraiseLevel,
				isAllIn: options?.isAllIn,
				stakeStrength: options?.stakeStrength,
			});
			const firm = matrix.pressure !== 'light';
			const effectiveTravelMs = options?.travelMs ?? matrix.travelMs;
			pulseSelfHeroGlow(side, firm ? 'firm' : 'subtle');

			if (sourcePoint && targetPoint) {
				if (matrix.delivery === 'tunnel' && matrix.tunnelRings > 0) {
					spawnMagicTunnel(
						sourcePoint.x,
						sourcePoint.y,
						targetPoint.x,
						targetPoint.y,
						palette,
						{ rings: matrix.tunnelRings, durationMs: effectiveTravelMs },
					);
				} else {
					spawnTranslucentRibbon(
						sourcePoint.x,
						sourcePoint.y,
						targetPoint.x,
						targetPoint.y,
						palette,
						{
							strands: matrix.strands,
							durationMs: effectiveTravelMs,
							lingerMs: matrix.lingerMs,
							arcSign: matrix.arcSign,
							arcFactor: matrix.arcFactor,
						},
					);
				}
				spawnTravelingGlowRing(
					sourcePoint.x,
					sourcePoint.y,
					targetPoint.x,
					targetPoint.y,
					palette,
					effectiveTravelMs,
					() => {
						spawnRunePulse(targetPoint.x, targetPoint.y, palette, 400, matrix.runeScale);
						if (matrix.starburstScale > 0) {
							spawnStarburstBloom(targetPoint.x, targetPoint.y, palette, matrix.starburstScale, 340);
						} else {
							spawnImpactRing(targetPoint.x, targetPoint.y, palette, 'standard');
						}
						if (matrix.shardCount > 0) {
							spawnDiamondShards(targetPoint.x, targetPoint.y, matrix.shardCount, palette, undefined, seed);
						}
						if (matrix.burstCount > 0) {
							spawnParticleBurst(targetPoint.x, targetPoint.y, matrix.burstCount, palette, seed);
						}
						if (matrix.vibration !== 'none' && intent.targetInstanceId) {
							triggerCardImpactVibration(
								{ type: 'card', instanceId: intent.targetInstanceId },
								matrix.vibration,
								'normal',
							);
						}
						if (matrix.cameraShake !== 'none') {
							triggerArenaShake(matrix.cameraShake);
						}
						if (matrix.impulse) {
							triggerEmotionalImpulse(matrix.impulse.kind, matrix.impulse.strength);
						}
						pulseStakeSink(firm);
						pulseStakesHud();
					},
				);
				if (matrix.density !== 'empty') {
					spawnPokerTravelTrail(
						sourcePoint.x,
						sourcePoint.y,
						targetPoint.x,
						targetPoint.y,
						palette,
						seed,
						effectiveTravelMs,
					);
				}

				// Formation Echo Ripples: staggered secondary ribbons onto adjacent cards
				const echoes = (intent.echoTargets ?? []).slice(0, Math.max(0, matrix.echoTargets - 1));
				if (echoes.length > 0) {
					gameEffectCoordinator.scheduleSequence({
						owner: 'poker-vfx-dom',
						lane: 'formation-echo',
						key: `stake-echo:${side}`,
						priority: 'normal',
						delaysMs: echoes.map((_, i) => 65 * (i + 1)),
						run: (index) => {
							const echo = echoes[index];
							if (!echo) return;
							spawnTranslucentRibbon(
								sourcePoint.x,
								sourcePoint.y,
								echo.point.x,
								echo.point.y,
								palette,
								{
									strands: 1,
									durationMs: effectiveTravelMs,
									lingerMs: 280,
									arcSign: index % 2 === 0 ? -matrix.arcSign as 1 | -1 : matrix.arcSign,
									arcFactor: 0.22,
									onImpact: () => {
										spawnRunePulse(echo.point.x, echo.point.y, palette, 320, 1.0);
										if (echo.instanceId && matrix.vibration !== 'none') {
											triggerCardImpactVibration(
												{ type: 'card', instanceId: echo.instanceId },
												'normal',
												'normal',
											);
										}
									},
								},
							);
						},
					});
				}
			} else if (targetPoint) {
				pulseStakeSink(firm);
				pulseStakesHud();
				spawnRunePulse(targetPoint.x, targetPoint.y, palette, 400, matrix.runeScale);
				spawnImpactRing(targetPoint.x, targetPoint.y, palette, 'luminous');
			}
			return;
		}
		default: {
			const exhaustive: never = motion;
			return exhaustive;
		}
	}
}

export function playLocalPulseOnMinionRow(
	owner: ArenaVfxOwner,
	palette: ParticleColor,
	staggerMs = AOE_STAGGER_MS,
): void {
	const cards = minionCardCenterPoints(owner);
	if (cards.length === 0) return;
	gameEffectCoordinator.scheduleSequence({
		owner: 'poker-vfx-dom',
		lane: 'aoe-pulse',
		key: `row-pulse:${owner}`,
		priority: 'normal',
		delaysMs: cards.map((_, index) => index * staggerMs),
		run: (index) => {
			const card = cards[index];
			if (card) playLocalPulseAt({ x: card.x, y: card.y }, palette);
		},
	});
}

/** Wager source fans out to every defender minion, then the defender hero. */
export function playShowdownAoeWagerVfx(
	intent: PokerVfxResolvedIntent,
	attackerSide: ArenaVfxOwner,
): void {
	const defender: ArenaVfxOwner = attackerSide === 'player' ? 'opponent' : 'player';
	const source = intent.sourcePoint;
	const { palette } = intent;
	if (!source) return;

	const targets = minionCardCenterPoints(defender);
	const heroPoint = resolveArenaEffectPoint({
		entityId: defender === 'player' ? 'player-hero' : 'opponent-hero',
		anchor: 'health-bar',
	});

	const points: Array<{ point: PokerVfxPoint; seed: string; travelMs: number }> = targets.map(
		(card, index) => ({
			point: { x: card.x, y: card.y },
			seed: `aoe-${index}`,
			travelMs: 280,
		}),
	);
	if (heroPoint) {
		points.push({ point: heroPoint, seed: 'aoe-hero', travelMs: 300 });
	}
	if (points.length === 0) return;

	gameEffectCoordinator.scheduleSequence({
		owner: 'poker-vfx-dom',
		lane: 'aoe-travel',
		key: `showdown-aoe:${attackerSide}`,
		priority: 'high',
		delaysMs: points.map((_, index) => index * AOE_STAGGER_MS),
		run: (index) => {
			const entry = points[index];
			if (entry) {
				playTravelImpact(source, entry.point, palette, entry.seed, entry.travelMs);
			}
		},
	});
}

export function playCallClashVfx(
	endpoints: CallClashEndpoints = resolveCallClashEndpoints(),
	palette: ParticleColor,
	seed = 'poker-call-clash',
): void {
	const { player, opponent, center } = endpoints;
	if (!center) return;
	if (player) playTravelImpact(player, center, palette, `${seed}:player`);
	if (opponent) playTravelImpact(opponent, center, palette, `${seed}:opponent`);
}

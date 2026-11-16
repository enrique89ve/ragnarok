import gsap from 'gsap';
import {
	spawnImpactRing,
	spawnParticleBurst,
	spawnPokerTravelTrail,
	spawnTravelingGlowRing,
	type ParticleColor,
} from '../../animations/PixiParticleCanvas';
import {
	ARENA_VFX_TARGETS,
	getArenaVfxHeroTarget,
	getArenaVfxTarget,
	getBoundArenaVfxQueryRoot,
	minionCardCenterPoints,
	type ArenaVfxOwner,
} from '../arenaVfxTargets';
import { resolveArenaEffectPoint } from '@/game/effects/presentation';
import type {
	CallClashEndpoints,
	PokerVfxPoint,
	PokerVfxResolvedIntent,
} from './pokerVfxCatalog';
import { resolveCallClashEndpoints } from './pokerVfxCatalog';

const DEFAULT_TRAVEL_MS = 360;

export function playLocalPulseAt(target: PokerVfxPoint, palette: ParticleColor): void {
	spawnImpactRing(target.x, target.y, palette, 'luminous');
	spawnParticleBurst(target.x, target.y, 10, palette);
}

export function playTravelImpact(
	source: PokerVfxPoint,
	target: PokerVfxPoint,
	palette: ParticleColor,
	seed?: string,
	travelMs = DEFAULT_TRAVEL_MS,
): void {
	spawnTravelingGlowRing(source.x, source.y, target.x, target.y, palette, travelMs);
	spawnPokerTravelTrail(source.x, source.y, target.x, target.y, palette, seed, travelMs);
	window.setTimeout(() => {
		spawnParticleBurst(target.x, target.y, 14, palette);
	}, Math.max(0, travelMs - 48));
}

function pulseStakeSink(scale = 1.18): void {
	const sink = getArenaVfxTarget(ARENA_VFX_TARGETS.stakeSink, getBoundArenaVfxQueryRoot());
	if (!sink) return;
	gsap.fromTo(
		sink,
		{ scale: 1 },
		{ scale, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out' },
	);
}

function pulseStakesHud(scale = 1.08): void {
	const riskBadge = getArenaVfxTarget(ARENA_VFX_TARGETS.riskDisplay, getBoundArenaVfxQueryRoot());
	if (!riskBadge) return;
	gsap.fromTo(
		riskBadge,
		{ scale: 1 },
		{ scale, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' },
	);
}

function pulseSelfHeroGlow(side: PokerVfxResolvedIntent['side'], strength: 'subtle' | 'firm' = 'subtle'): void {
	const hero = getArenaVfxHeroTarget(side, getBoundArenaVfxQueryRoot());
	if (!hero) return;
	const brightness = strength === 'firm' ? 1.14 : 1.08;
	gsap.fromTo(
		hero,
		{ filter: `brightness(${brightness})` },
		{ filter: 'brightness(1)', duration: strength === 'firm' ? 0.35 : 0.28, ease: 'power2.out' },
	);
}

/**
 * LoR-style motion execution: anchor particles to resolved arena endpoints.
 */
export function playPokerVfxIntent(
	intent: PokerVfxResolvedIntent,
	options?: { seed?: string; travelMs?: number; stakeStrength?: 'subtle' | 'firm' },
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
			pulseStakeSink(options?.stakeStrength === 'firm' ? 1.24 : 1.18);
			pulseStakesHud(options?.stakeStrength === 'firm' ? 1.1 : 1.06);
			pulseSelfHeroGlow(side, options?.stakeStrength ?? 'subtle');
			if (sourcePoint && targetPoint) {
				spawnTravelingGlowRing(
					sourcePoint.x,
					sourcePoint.y,
					targetPoint.x,
					targetPoint.y,
					palette,
					travelMs,
				);
				spawnPokerTravelTrail(
					sourcePoint.x,
					sourcePoint.y,
					targetPoint.x,
					targetPoint.y,
					palette,
					seed,
					travelMs,
				);
			} else if (targetPoint) {
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

const AOE_STAGGER_MS = 70;

export function playLocalPulseOnMinionRow(
	owner: ArenaVfxOwner,
	palette: ParticleColor,
	staggerMs = AOE_STAGGER_MS,
): void {
	minionCardCenterPoints(owner).forEach((card, index) => {
		window.setTimeout(
			() => playLocalPulseAt({ x: card.x, y: card.y }, palette),
			index * staggerMs,
		);
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
	targets.forEach((card, index) => {
		window.setTimeout(() => {
			playTravelImpact(
				source,
				{ x: card.x, y: card.y },
				palette,
				`aoe-${index}`,
				280,
			);
		}, index * AOE_STAGGER_MS);
	});

	const heroPoint = resolveArenaEffectPoint({
		entityId: defender === 'player' ? 'player-hero' : 'opponent-hero',
		anchor: 'health-bar',
	});
	if (heroPoint) {
		const heroDelay = targets.length * AOE_STAGGER_MS + 40;
		window.setTimeout(() => {
			playTravelImpact(source, heroPoint, palette, 'aoe-hero', 300);
		}, heroDelay);
	}
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
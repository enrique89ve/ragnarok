/**
 * ThorHammerVFX.ts
 *
 * Pure PixiJS v8 (`app.ticker`) 5.0-second Marvel-inspired Mjölnir Cinematic.
 * Zero GSAP, 100% scale-accurate 1920x1080 arena coordinates (`getArenaLocalPoint`),
 * synchronized with `vfxOrchestrationDirector`, `triggerArenaShake`,
 * `triggerCardImpactVibration`, `triggerEmotionalImpulse`, and `proceduralAudio`.
 *
 * 4-Act Cinematic Timeline (~5.0 seconds full motion; concise under reduced-motion):
 *   Act I   (0.00s – 1.40s): Solemn summon & ascent to mid-arena hover with Elder Futhark rune
 *   Act II  (1.40s – 2.95s): Mid-air Marvel blue lightning storm — 7 rhythmic waves of sky-to-hammer
 *                            bolts + crackling radial electric arcs charging Mjölnir
 *   Act III (2.95s – 3.77s): Electric Magic Tunnel dive + brutal impact slam + hit-stop + sky pillar
 *   Act IV  (3.77s – 5.00s): Reverberating blue afterglow & solemn boomerang return to caster
 */

import { Assets, Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';
import { createEffectRandom } from '../effects/core/effectRandom';
import {
	getArenaLocalPoint,
	getArenaVfxCombatantTarget,
	getArenaVfxCoordinateLayer,
	getArenaVfxHeroSurfaceTarget,
	getElementCenter,
	type ArenaVfxOwner,
} from '../combat/arenaVfxTargets';
import {
	ARENA_COORDINATE_CONTRACT,
	arenaContractPointToViewport,
} from '../combat/vfx/arenaCoordinateContract';
import { triggerArenaShake } from '../combat/vfx/arenaShake';
import { triggerCardImpactVibration } from '../combat/vfx/localFxPrimitives';
import { vfxOrchestrationDirector } from '../combat/vfx/vfxOrchestrationDirector';
import { proceduralAudio } from '../audio/proceduralAudio';
import { presentationTargetForEntityId } from '@/game/effects/presentation/EffectTargetResolver';
import {
	getPixiApp,
	getThorContainer,
	spawnArenaFlash,
	spawnChromaticSlash,
	spawnDiamondShards,
	spawnImpactRing,
	spawnMagicTunnel,
	spawnRunePulse,
	spawnSparkBurst,
	spawnStarburstBloom,
	spawnTranslucentRibbon,
	triggerEmotionalImpulse,
} from './PixiParticleCanvas';
import {
	easeInCubic,
	easeOutCubic,
	easeOutQuad,
	prefersReducedMotion,
	quadraticBezier,
	type ParticleColor,
} from './pixi/pixiPalettes';

const MARVEL_BLUE_OUTER = 0x1d9bf0;
const MARVEL_BLUE_BRIGHT = 0x38e8ff;
const MARVEL_CORE_WHITE = 0xf8fdff;
const GOLD_ACCENT = 0xffd34d;

const MARVEL_BLUE_PALETTE: ParticleColor = {
	primary: '#00d4ff',
	secondary: '#7dd3fc',
	glow: 'rgba(0,212,255,0.75)',
};

const IMPACT_THUNDER_PALETTE: ParticleColor = {
	primary: '#38e8ff',
	secondary: '#ffd34d',
	glow: 'rgba(56,232,255,0.78)',
};

type ThorHammerPose = 'left' | 'right' | 'strike' | 'front';

const HAMMER_POSE_URLS: Record<ThorHammerPose, string> = {
	left: '/assets/vfx/thor-hammer/hammer-left.webp',
	right: '/assets/vfx/thor-hammer/hammer-right.webp',
	strike: '/assets/vfx/thor-hammer/hammer-strike.webp',
	front: '/assets/vfx/thor-hammer/hammer-front.webp',
};

type ThorHammerTextures = Record<ThorHammerPose, Texture>;

let texturesPromise: Promise<ThorHammerTextures | null> | null = null;

function loadHammerTextures(): Promise<ThorHammerTextures | null> {
	if (!texturesPromise) {
		texturesPromise = Promise.all(
			(Object.entries(HAMMER_POSE_URLS) as Array<[ThorHammerPose, string]>).map(async ([pose, url]) => {
				const texture = await Assets.load<Texture>(url);
				return [pose, texture] as const;
			}),
		)
			.then(entries => Object.fromEntries(entries) as ThorHammerTextures)
			.catch(() => {
				texturesPromise = null;
				return null;
			});
	}
	return texturesPromise;
}

export interface ThorHammerVfxOptions {
	readonly side?: ArenaVfxOwner;
	readonly seed: string;
	/** `'strike'` throws Mjölnir at an enemy target; `'hand-rank'` summons it to caster hero. */
	readonly mode?: 'strike' | 'hand-rank';
	/** Optional explicit target entity id (card instanceId or `'player-hero'` / `'opponent-hero'`). */
	readonly targetId?: string;
	/** Optional pre-resolved viewport source coordinates. */
	readonly sourcePoint?: { readonly x: number; readonly y: number };
	/** Optional pre-resolved viewport target coordinates. */
	readonly targetPoint?: { readonly x: number; readonly y: number };
	/** Optional callback fired on the exact impact frame. */
	readonly onImpact?: () => void;
}

export interface ResolvedThorEndpoints {
	readonly sourceScreen: { readonly x: number; readonly y: number };
	readonly targetScreen: { readonly x: number; readonly y: number };
	readonly targetEntityId: string;
}

function heroScreenPoint(owner: ArenaVfxOwner): { x: number; y: number } | null {
	const heroEl = getArenaVfxHeroSurfaceTarget(owner);
	if (heroEl) return getElementCenter(heroEl, 0.44);
	return arenaContractPointToViewport(
		owner === 'player'
			? ARENA_COORDINATE_CONTRACT.playerHero
			: ARENA_COORDINATE_CONTRACT.opponentHero,
	);
}

/**
 * Resolves exact viewport-space source and target endpoints for Mjölnir.
 * Exported for deterministic unit testing of spatial intentionality.
 */
export function resolveThorHammerEndpoints(
	options: Pick<ThorHammerVfxOptions, 'side' | 'mode' | 'targetId' | 'sourcePoint' | 'targetPoint'>,
): ResolvedThorEndpoints | null {
	const caster: ArenaVfxOwner = options.side ?? 'player';
	const rival: ArenaVfxOwner = caster === 'player' ? 'opponent' : 'player';
	const mode = options.mode ?? 'hand-rank';

	const casterHero = options.sourcePoint ?? heroScreenPoint(caster);
	if (!casterHero) return null;

	if (mode === 'hand-rank') {
		const targetScreen = options.targetPoint ?? casterHero;
		return {
			sourceScreen: {
				x: targetScreen.x + (caster === 'player' ? 180 : -180),
				y: Math.max(24, targetScreen.y - 180),
			},
			targetScreen,
			targetEntityId: `${caster}-hero`,
		};
	}

	let targetScreen = options.targetPoint ?? null;
	let resolvedTargetId = options.targetId ?? `${rival}-hero`;

	if (!targetScreen && options.targetId) {
		if (options.targetId === 'player-hero' || options.targetId === 'player') {
			targetScreen = heroScreenPoint('player');
			resolvedTargetId = 'player-hero';
		} else if (options.targetId === 'opponent-hero' || options.targetId === 'opponent') {
			targetScreen = heroScreenPoint('opponent');
			resolvedTargetId = 'opponent-hero';
		} else {
			const el = getArenaVfxCombatantTarget(options.targetId);
			if (el) targetScreen = getElementCenter(el, 0.5);
		}
	}

	if (!targetScreen) {
		targetScreen = heroScreenPoint(rival);
		resolvedTargetId = `${rival}-hero`;
	}
	if (!targetScreen) return null;

	return {
		sourceScreen: casterHero,
		targetScreen,
		targetEntityId: resolvedTargetId,
	};
}

/**
 * Draws a forked jagged Marvel-style blue lightning arc between two arena points.
 */
function drawJaggedLightningArc(
	g: Graphics,
	random: ReturnType<typeof createEffectRandom>,
	sx: number,
	sy: number,
	tx: number,
	ty: number,
	thickness: number,
	primaryColor = MARVEL_BLUE_BRIGHT,
	withBranch = true,
): void {
	const dx = tx - sx;
	const dy = ty - sy;
	const len = Math.max(1, Math.hypot(dx, dy));
	const nx = -dy / len;
	const ny = dx / len;
	const segments = Math.max(6, Math.min(12, Math.round(len / 42)));
	const jitterAmp = Math.min(34, Math.max(12, len * 0.085));

	const pts: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];
	for (let i = 1; i < segments; i += 1) {
		const u = i / segments;
		const taper = Math.sin(Math.PI * u);
		const offset = random.jitter(jitterAmp) * (0.45 + 0.55 * taper);
		pts.push({
			x: sx + dx * u + nx * offset,
			y: sy + dy * u + ny * offset,
		});
	}
	pts.push({ x: tx, y: ty });

	// Wide translucent outer blue plasma glow
	g.moveTo(pts[0].x, pts[0].y);
	for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i].x, pts[i].y);
	g.stroke({ width: thickness * 3.1, color: MARVEL_BLUE_OUTER, alpha: 0.32 });

	// Mid electric cyan bolt
	g.moveTo(pts[0].x, pts[0].y);
	for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i].x, pts[i].y);
	g.stroke({ width: thickness * 1.4, color: primaryColor, alpha: 0.88 });

	// White-hot lightning filament core
	g.moveTo(pts[0].x, pts[0].y);
	for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i].x, pts[i].y);
	g.stroke({ width: Math.max(1.2, thickness * 0.45), color: MARVEL_CORE_WHITE, alpha: 0.98 });

	// Secondary forked lightning branch
	if (withBranch && pts.length >= 5) {
		const forkIdx = Math.floor(pts.length * 0.45);
		const origin = pts[forkIdx];
		const baseAngle = Math.atan2(dy, dx) + (random.next() > 0.5 ? 0.52 : -0.52);
		const branchLen = len * (0.24 + random.next() * 0.16);
		const bx = origin.x + Math.cos(baseAngle) * branchLen;
		const by = origin.y + Math.sin(baseAngle) * branchLen;
		const midX = (origin.x + bx) * 0.5 + random.jitter(14);
		const midY = (origin.y + by) * 0.5 + random.jitter(14);
		g.moveTo(origin.x, origin.y);
		g.lineTo(midX, midY);
		g.lineTo(bx, by);
		g.stroke({ width: Math.max(1.4, thickness * 0.85), color: primaryColor, alpha: 0.72 });
	}
}

/**
 * Redraws a crackling wave of Marvel blue lightning bolts:
 * 2-3 sky-to-hammer bolts + 8 radial arcs crackling outward from the hammer.
 */
function paintChargeStormWave(
	g: Graphics,
	cx: number,
	cy: number,
	seed: string,
	waveIndex: number,
	intensity: number,
): void {
	g.clear();
	const random = createEffectRandom(`thor-marvel-storm:${seed}:${waveIndex}`);

	// Sky-to-hammer blue lightning pillars (iconic Marvel summon bolts!)
	const skyBolts = 2 + (waveIndex % 2);
	for (let s = 0; s < skyBolts; s += 1) {
		const topX = cx + random.jitter(220);
		drawJaggedLightningArc(g, random, topX, -12, cx, cy, 2.8 + intensity * 1.4, MARVEL_BLUE_BRIGHT, true);
	}

	// Radial blue electric arcs bursting out around Mjölnir
	const arcCount = 8 + Math.round(intensity * 4);
	for (let i = 0; i < arcCount; i += 1) {
		const angle = (Math.PI * 2 * i) / arcCount + random.jitter(0.24);
		const dist = 115 + random.next() * (145 + intensity * 90);
		const tx = cx + Math.cos(angle) * dist;
		const ty = cy + Math.sin(angle) * dist;
		drawJaggedLightningArc(g, random, cx, cy, tx, ty, 2.0 + intensity * 0.8, MARVEL_BLUE_BRIGHT, i % 2 === 0);
	}
}

/**
 * Paints the monumental impact thunder detonation (sky column + 14 radial thunderbolts).
 */
function paintImpactThunderburst(
	g: Graphics,
	tx: number,
	ty: number,
	seed: string,
): void {
	g.clear();
	const random = createEffectRandom(`thor-impact-burst:${seed}`);

	// Massive twin sky-to-target lightning columns
	drawJaggedLightningArc(g, random, tx - 36, -20, tx, ty, 5.2, MARVEL_BLUE_BRIGHT, true);
	drawJaggedLightningArc(g, random, tx + 42, -20, tx, ty, 4.4, MARVEL_BLUE_BRIGHT, true);

	// 14 radial thunderbolts (blue + gold-tipped highlights)
	for (let i = 0; i < 14; i += 1) {
		const angle = (Math.PI * 2 * i) / 14 + random.jitter(0.18);
		const dist = 150 + random.next() * 190;
		const ex = tx + Math.cos(angle) * dist;
		const ey = ty + Math.sin(angle) * dist;
		const color = i % 4 === 0 ? GOLD_ACCENT : MARVEL_BLUE_BRIGHT;
		drawJaggedLightningArc(g, random, tx, ty, ex, ey, i % 2 === 0 ? 3.2 : 2.3, color, i % 3 === 0);
	}
}

function playThorSfx(cue: 'norse_horn' | 'damage_hero' | 'spell_impact'): void {
	try {
		proceduralAudio.play(cue);
	} catch {
		// Audio unavailable in headless environments
	}
}

/**
 * Plays the epic 5.0-second Marvel-inspired Mjölnir choreography directly on the
 * `1920x1080` arena PixiJS v8 stage (zero GSAP).
 */
export async function playThorHammerVFX(options: ThorHammerVfxOptions): Promise<void> {
	const app = getPixiApp();
	const root = getThorContainer();
	if (typeof window === 'undefined' || !app || !root) {
		options.onImpact?.();
		return;
	}

	const endpoints = resolveThorHammerEndpoints(options);
	if (!endpoints) {
		options.onImpact?.();
		return;
	}

	const layer = getArenaVfxCoordinateLayer();
	if (!layer) {
		options.onImpact?.();
		return;
	}

	const arenaSource = getArenaLocalPoint(endpoints.sourceScreen, layer);
	const arenaTarget = getArenaLocalPoint(endpoints.targetScreen, layer);
	if (!arenaSource || !arenaTarget) {
		options.onImpact?.();
		return;
	}

	const textures = await loadHammerTextures();
	if (!textures || getPixiApp() !== app || getThorContainer() !== root) {
		options.onImpact?.();
		return;
	}

	const mode = options.mode ?? 'hand-rank';
	const caster: ArenaVfxOwner = options.side ?? 'player';
	const directionSign = caster === 'player' ? 1 : -1;

	// Dramatic elevated mid-point where Mjölnir hovers & erupts with Marvel blue lightning
	const chargeArena = {
		x: (arenaSource.x * 0.42 + arenaTarget.x * 0.58),
		y: Math.max(210, Math.min(arenaSource.y, arenaTarget.y) - 90),
	};
	const chargeScreen = arenaContractPointToViewport(chargeArena) ?? {
		x: (endpoints.sourceScreen.x + endpoints.targetScreen.x) * 0.5,
		y: Math.min(endpoints.sourceScreen.y, endpoints.targetScreen.y) * 0.72,
	};

	const diveDx = arenaTarget.x - chargeArena.x;
	const diveDy = arenaTarget.y - chargeArena.y;
	const diveLen = Math.max(1, Math.hypot(diveDx, diveDy));
	const diveDir = { x: diveDx / diveLen, y: diveDy / diveLen };
	const diveNx = -diveDy / diveLen;
	const diveNy = diveDx / diveLen;
	const diveArc = Math.min(170, Math.max(55, diveLen * 0.18)) * (diveDx >= 0 ? -1 : 1);
	const diveCtrlX = (chargeArena.x + arenaTarget.x) * 0.5 + diveNx * diveArc;
	const diveCtrlY = (chargeArena.y + arenaTarget.y) * 0.5 + diveNy * diveArc;

	// Larger epic scale (~225px visual presence on 1920x1080)
	const baseScale = 225 / Math.max(256, textures.strike.width);

	const effect = new Container();
	const stormGraphics = new Graphics();
	stormGraphics.blendMode = 'add';
	stormGraphics.alpha = 0;

	const impactGraphics = new Graphics();
	impactGraphics.blendMode = 'add';
	impactGraphics.alpha = 0;

	const hammer = new Sprite(textures.left);
	hammer.anchor.set(0.5);
	hammer.scale.set(baseScale * 0.72);
	hammer.position.set(arenaSource.x, arenaSource.y);
	hammer.alpha = 0;
	hammer.rotation = directionSign * -0.55;

	effect.addChild(stormGraphics, impactGraphics, hammer);
	root.addChild(effect);

	// 5.0-second epic timeline (condensed gracefully under prefers-reduced-motion)
	const reduced = prefersReducedMotion();
	const ascendEnd = reduced ? 0.25 : 1.4;
	const stormEnd = reduced ? 0.55 : 2.95;
	const diveEnd = reduced ? 0.75 : 3.55;
	const hitStopEnd = reduced ? 0.85 : 3.77;
	const totalSec = reduced ? 1.2 : 5.0;

	vfxOrchestrationDirector.triggerCriticalSpotlight(Math.round(totalSec * 1000));
	triggerEmotionalImpulse('climax', 0.85);
	playThorSfx('norse_horn');
	spawnRunePulse(endpoints.sourceScreen.x, endpoints.sourceScreen.y, MARVEL_BLUE_PALETTE, 680, 1.6);

	let age = 0;
	let lastStormWave = -1;
	let diveTunnelFired = false;
	let impactFired = false;
	let cleaned = false;

	const fireDiveTunnel = (): void => {
		if (diveTunnelFired) return;
		diveTunnelFired = true;
		spawnMagicTunnel(
			chargeScreen.x,
			chargeScreen.y,
			endpoints.targetScreen.x,
			endpoints.targetScreen.y,
			MARVEL_BLUE_PALETTE,
			{ rings: 10, durationMs: Math.round((diveEnd - stormEnd) * 1000) },
		);
		spawnTranslucentRibbon(
			chargeScreen.x,
			chargeScreen.y,
			endpoints.targetScreen.x,
			endpoints.targetScreen.y,
			MARVEL_BLUE_PALETTE,
			{ strands: 3, durationMs: Math.round((diveEnd - stormEnd) * 1000), lingerMs: 520, arcFactor: 0.14 },
		);
	};

	const fireImpactBeat = (): void => {
		if (impactFired) return;
		impactFired = true;

		stormGraphics.clear();
		stormGraphics.alpha = 0;
		paintImpactThunderburst(impactGraphics, arenaTarget.x, arenaTarget.y, options.seed);
		impactGraphics.alpha = 1;

		spawnImpactRing(endpoints.targetScreen.x, endpoints.targetScreen.y, IMPACT_THUNDER_PALETTE, 'luminous');
		spawnRunePulse(endpoints.targetScreen.x, endpoints.targetScreen.y, MARVEL_BLUE_PALETTE, 850, 2.15);
		spawnStarburstBloom(endpoints.targetScreen.x, endpoints.targetScreen.y, IMPACT_THUNDER_PALETTE, 1.95, 560);
		spawnChromaticSlash(endpoints.targetScreen.x, endpoints.targetScreen.y, diveDir, MARVEL_BLUE_PALETTE, 1.6);
		spawnDiamondShards(endpoints.targetScreen.x, endpoints.targetScreen.y, 20, MARVEL_BLUE_PALETTE, diveDir, options.seed);
		spawnSparkBurst(endpoints.targetScreen.x, endpoints.targetScreen.y, 24, IMPACT_THUNDER_PALETTE, options.seed, diveDir);
		spawnArenaFlash('#38e8ff', mode === 'strike' ? 0.34 : 0.22, 340);

		if (mode === 'strike') {
			triggerArenaShake('lethal');
			triggerEmotionalImpulse('shock', 1.0);
			triggerCardImpactVibration(
				presentationTargetForEntityId(endpoints.targetEntityId),
				'heavy',
				'critical',
			);
			spawnTranslucentRibbon(
				endpoints.targetScreen.x,
				endpoints.targetScreen.y,
				endpoints.sourceScreen.x,
				endpoints.sourceScreen.y,
				MARVEL_BLUE_PALETTE,
				{ strands: 3, durationMs: 720, lingerMs: 480, arcFactor: 0.2 },
			);
		} else {
			triggerArenaShake('heavy');
			triggerEmotionalImpulse('euphoria', 0.85);
		}

		playThorSfx('damage_hero');
		options.onImpact?.();
	};

	const cleanup = (): void => {
		if (cleaned) return;
		cleaned = true;
		try {
			app.ticker.remove(step);
		} catch {
			// Ticker already torn down
		}
		if (!effect.destroyed) {
			if (effect.parent === root) root.removeChild(effect);
			effect.destroy({ children: true });
		}
	};

	const step = (ticker: Ticker): void => {
		if (effect.destroyed || getThorContainer() !== root) {
			cleanup();
			return;
		}
		const dt = Math.min(ticker.deltaMS, 50) / 1000;
		age += dt;

		if (age <= ascendEnd) {
			// ACT I (0.00s – 1.40s): Solemn summon & ascent to mid-arena charge point
			const t = age / ascendEnd;
			const eased = easeOutCubic(t);
			hammer.texture = t < 0.6 ? textures.left : textures.right;
			hammer.alpha = Math.min(1, t * 2.4);
			hammer.position.set(
				arenaSource.x + (chargeArena.x - arenaSource.x) * eased,
				arenaSource.y + (chargeArena.y - arenaSource.y) * eased - Math.sin(t * Math.PI) * 55,
			);
			hammer.rotation = directionSign * (-0.55 + 0.8 * eased);
			hammer.scale.set(baseScale * (0.72 + 0.56 * eased));
		} else if (age <= stormEnd) {
			// ACT II (1.40s – 2.95s): MARVEL BLUE LIGHTNING STORM MID-ANIMATION!
			const stormElapsed = age - ascendEnd;
			const stormDur = stormEnd - ascendEnd;
			const stormT = Math.min(1, stormElapsed / stormDur);
			const waveIndex = Math.floor(stormT * 7);

			// Trembling high-voltage hover in mid-air
			const tremble = reduced ? 0 : 4 + stormT * 9;
			hammer.texture = waveIndex % 2 === 0 ? textures.right : textures.front;
			hammer.alpha = 1;
			hammer.position.set(
				chargeArena.x + Math.sin(age * 46) * tremble,
				chargeArena.y + Math.cos(age * 53) * tremble * 0.7 - Math.sin(stormT * Math.PI) * 18,
			);
			hammer.rotation = directionSign * (0.25 + Math.sin(age * 16) * 0.14);
			hammer.scale.set(baseScale * (1.28 + Math.sin(stormT * Math.PI * 7) * 0.08 + stormT * 0.14));

			// Emit 7 crisp rhythmic Marvel blue lightning bursts!
			if (waveIndex !== lastStormWave) {
				lastStormWave = waveIndex;
				paintChargeStormWave(stormGraphics, chargeArena.x, chargeArena.y, options.seed, waveIndex, stormT);
				spawnImpactRing(chargeScreen.x, chargeScreen.y, MARVEL_BLUE_PALETTE, 'luminous');
				spawnDiamondShards(chargeScreen.x, chargeScreen.y, 7 + waveIndex, MARVEL_BLUE_PALETTE, undefined, `${options.seed}:w${waveIndex}`);
				if (waveIndex % 2 === 0) {
					spawnRunePulse(chargeScreen.x, chargeScreen.y, MARVEL_BLUE_PALETTE, 420, 1.35 + stormT * 0.55);
					spawnArenaFlash('#00d4ff', 0.1 + stormT * 0.08, 150);
					playThorSfx('spell_impact');
				}
				if (waveIndex === 5) {
					triggerArenaShake('mild');
				}
			}

			// Flicker electric brightness smoothly between waves
			const waveLocalT = (stormT * 7) - waveIndex;
			stormGraphics.alpha = Math.max(0.25, 1.0 - waveLocalT * 0.72);
		} else if (age <= diveEnd) {
			// ACT III-A (2.95s – 3.55s): Supersonic thunder dive straight into target
			fireDiveTunnel();
			stormGraphics.alpha = Math.max(0, stormGraphics.alpha - dt * 5);

			const rawT = (age - stormEnd) / (diveEnd - stormEnd);
			const t = rawT < 0.55
				? rawT * 0.72
				: 0.396 + easeInCubic((rawT - 0.55) / 0.45) * 0.604;
			const pos = quadraticBezier(
				chargeArena.x,
				chargeArena.y,
				diveCtrlX,
				diveCtrlY,
				arenaTarget.x,
				arenaTarget.y,
				t,
			);
			hammer.texture = textures.strike;
			hammer.alpha = 1;
			hammer.position.set(pos.x, pos.y);
			hammer.rotation = directionSign * (0.25 + t * Math.PI * 2.1);
			hammer.scale.set(baseScale * (1.36 + Math.sin(rawT * Math.PI) * 0.24));
		} else if (age <= hitStopEnd) {
			// ACT III-B (3.55s – 3.77s): Heavy impact hit-stop locked dead-center on target
			hammer.texture = textures.strike;
			hammer.position.set(arenaTarget.x, arenaTarget.y);
			hammer.scale.set(baseScale * 1.48);
			fireImpactBeat();
		} else if (age <= totalSec) {
			// ACT IV (3.77s – 5.00s): Blue thunder afterglow & solemn boomerang return
			fireImpactBeat();
			const t = (age - hitStopEnd) / (totalSec - hitStopEnd);
			const eased = easeOutCubic(t);
			hammer.texture = textures.front;
			if (mode === 'strike') {
				const ret = quadraticBezier(
					arenaTarget.x,
					arenaTarget.y,
					(arenaTarget.x + arenaSource.x) * 0.5 - diveNx * diveArc * 0.75,
					(arenaTarget.y + arenaSource.y) * 0.5 - diveNy * diveArc * 0.75,
					arenaSource.x,
					arenaSource.y,
					eased,
				);
				hammer.position.set(ret.x, ret.y);
				hammer.rotation += directionSign * 7.5 * dt;
			} else {
				hammer.position.set(arenaTarget.x, arenaTarget.y + 24 * eased);
			}
			hammer.scale.set(baseScale * (1.28 - 0.45 * eased));
			hammer.alpha = t < 0.72 ? 1 : Math.max(0, 1 - (t - 0.72) / 0.28);

			// Flickering blue lightning dissipation
			const flicker = 0.8 + Math.sin(age * 42) * 0.2;
			impactGraphics.alpha = Math.max(0, (1 - easeOutQuad(t)) * flicker);
		} else {
			fireImpactBeat();
			cleanup();
		}
	};

	app.ticker.add(step);
}

// Dev-only preview trigger so the full 5s Marvel Mjölnir animation can be
// previewed live on demand in the browser console (`__playThorHammerDemo()`).
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
	(window as unknown as Record<string, unknown>).__playThorHammerDemo = (
		side: ArenaVfxOwner = 'player',
		mode: 'strike' | 'hand-rank' = 'strike',
	) => playThorHammerVFX({ side, mode, seed: `demo-${Date.now()}` });
}

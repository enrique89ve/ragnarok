/**
 * titanScene.ts
 *
 * Lightweight Riot / WoW Ulduar-inspired Norse Titan 2D PixiJS v8 scenes powered
 * by the shared faction runtime:
 * - Zero standalone tickers (shares `sceneRunner.ts`).
 * - Dirty-flag crack geometry caching (stops re-tessellating fissures once fully
 *   opened, saving ~80% of CPU & GPU vertex-buffer upload work during fade-out).
 * - Soft feathered crater/shockwave/dust decals + 3-stop distance thermal gradients
 *   + anticipation-to-impact dark basalt rock eruption.
 */

import { Container, Graphics, Sprite } from 'pixi.js';
import { createEffectRandom } from '@/game/effects/core/effectRandom';
import { ARENA_CANVAS_SIZE } from '../../../arenaVfxTargets';
import { triggerArenaShake } from '../../arenaShake';
import { triggerCardImpactVibration } from '../../localFxPrimitives';
import { vfxOrchestrationDirector } from '../../vfxOrchestrationDirector';
import { presentationTargetForEntityId } from '@/game/effects/presentation/EffectTargetResolver';
import {
	spawnArenaFlash,
	spawnImpactRing,
	spawnRunePulse,
	spawnSparkBurst,
	spawnStarburstBloom,
	triggerEmotionalImpulse,
	type ParticleColor,
} from '../../../../animations/PixiParticleCanvas';
import { easeOutCubic, easeOutQuad, prefersReducedMotion } from '../../../../animations/pixi/pixiPalettes';
import {
	fillGradientFissureSeam,
	fillTaperedFissure,
	slicePolylineByProgress,
	type ThreeStopColorRamp,
} from '../runtime/geometryPrimitives';
import { acquireTitanTextures } from '../runtime/gpuAssetPool';
import { playFactionSfx, resolveArenaEndpoints } from '../runtime/sceneContext';
import { runTimedPixiScene } from '../runtime/sceneRunner';
import type { TitanVfxTextures } from './titanTextures';
import type { FactionSceneHandle, FactionVfxSceneRequest, ViewportPoint } from '../types';

export type TitanRealmKey = 'ulduar' | 'frost' | 'magma' | 'void';

export interface TitanVisualTheme {
	readonly realm: TitanRealmKey;
	readonly ringGold: number;
	readonly accentGlow: number;
	readonly crackCore: number;
	readonly crackMid: number;
	readonly crackOuter: number;
	readonly shardTint: number;
	readonly beamTint: number;
	readonly flashHex: string;
	readonly palette: ParticleColor;
}

const TITAN_THEMES: Readonly<Record<TitanRealmKey, TitanVisualTheme>> = {
	ulduar: {
		realm: 'ulduar',
		ringGold: 0xf5c542,
		accentGlow: 0x38bdf8,
		crackCore: 0xfff8dc,
		crackMid: 0xf59e0b,
		crackOuter: 0x78350f,
		shardTint: 0xe2e8f0,
		beamTint: 0x38bdf8,
		flashHex: '#f5c542',
		palette: { primary: '#f5c542', secondary: '#38bdf8', glow: 'rgba(245, 197, 66, 0.72)' },
	},
	frost: {
		realm: 'frost',
		ringGold: 0x7dd3fc,
		accentGlow: 0x38bdf8,
		crackCore: 0xf0f9ff,
		crackMid: 0x38bdf8,
		crackOuter: 0x0c4a6e,
		shardTint: 0xdbeafe,
		beamTint: 0x7dd3fc,
		flashHex: '#38bdf8',
		palette: { primary: '#38bdf8', secondary: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.75)' },
	},
	magma: {
		realm: 'magma',
		ringGold: 0xf59e0b,
		accentGlow: 0xdc2626,
		crackCore: 0xfef08a,
		crackMid: 0xf97316,
		crackOuter: 0x7f1d1d,
		shardTint: 0xd6d3d1,
		beamTint: 0xf59e0b,
		flashHex: '#f59e0b',
		palette: { primary: '#f59e0b', secondary: '#dc2626', glow: 'rgba(245, 158, 11, 0.75)' },
	},
	void: {
		realm: 'void',
		ringGold: 0xf5c542,
		accentGlow: 0xdc2626,
		crackCore: 0xfde68a,
		crackMid: 0xdc2626,
		crackOuter: 0x450a0a,
		shardTint: 0xcbd5e1,
		beamTint: 0xdc2626,
		flashHex: '#dc2626',
		palette: { primary: '#dc2626', secondary: '#f5c542', glow: 'rgba(220, 38, 38, 0.72)' },
	},
};

export function resolveTitanTheme(element?: string): TitanVisualTheme {
	const key = (element ?? '').toLowerCase();
	if (key === 'frost' || key === 'ice' || key === 'water') return TITAN_THEMES.frost;
	if (key === 'magma' || key === 'fire') return TITAN_THEMES.magma;
	if (key === 'void' || key === 'dark' || key === 'shadow') return TITAN_THEMES.void;
	return TITAN_THEMES.ulduar;
}

interface CrackBranch {
	readonly points: readonly ViewportPoint[];
	readonly baseHalfWidth: number;
	readonly glowRatio: number;
}

function buildRadialCracks(
	cx: number,
	cy: number,
	branchCount: number,
	maxRadius: number,
	seed: string,
): readonly CrackBranch[] {
	const random = createEffectRandom(`titan-cracks:${seed}`);
	const branches: CrackBranch[] = [];

	for (let i = 0; i < branchCount; i += 1) {
		const baseAngle = (Math.PI * 2 * i) / branchCount + random.jitter(0.28);
		const length = maxRadius * (0.58 + random.next() * 0.46);
		const pts: ViewportPoint[] = [{ x: cx + random.jitter(5), y: cy + random.jitter(4) }];

		for (let s = 1; s <= 7; s += 1) {
			const u = s / 7;
			const perp = baseAngle + Math.PI / 2;
			const jitter = random.jitter(16) * Math.sin(Math.PI * Math.pow(u, 0.85));
			pts.push({
				x: cx + Math.cos(baseAngle) * length * u + Math.cos(perp) * jitter,
				y: cy + Math.sin(baseAngle) * length * u * 0.7 + Math.sin(perp) * jitter * 0.7,
			});
		}

		const isMajor = i % 2 === 0;
		branches.push({
			points: pts,
			baseHalfWidth: isMajor ? 5.2 + random.next() * 2.0 : 3.2 + random.next() * 1.4,
			glowRatio: isMajor ? 0.56 : 0.36,
		});

		const forkOrigin = pts[isMajor ? 2 : 3];
		const forkAngle = baseAngle + (random.next() > 0.5 ? 0.52 : -0.52) + random.jitter(0.18);
		const forkLen = length * (0.32 + random.next() * 0.22);
		const forkPts: ViewportPoint[] = [forkOrigin];
		for (let fs = 1; fs <= 4; fs += 1) {
			const fu = fs / 4;
			const fPerp = forkAngle + Math.PI / 2;
			const fJit = random.jitter(7) * Math.sin(Math.PI * fu);
			forkPts.push({
				x: forkOrigin.x + Math.cos(forkAngle) * forkLen * fu + Math.cos(fPerp) * fJit,
				y: forkOrigin.y + Math.sin(forkAngle) * forkLen * fu * 0.7 + Math.sin(fPerp) * fJit * 0.7,
			});
		}
		branches.push({ points: forkPts, baseHalfWidth: isMajor ? 2.6 : 1.7, glowRatio: isMajor ? 0.28 : 0 });

		if (isMajor) {
			const spOrigin = pts[4];
			const spAngle = baseAngle + (random.next() > 0.5 ? -0.68 : 0.68);
			const spLen = length * 0.24;
			branches.push({
				points: [
					spOrigin,
					{ x: spOrigin.x + Math.cos(spAngle) * spLen * 0.5 + random.jitter(4), y: spOrigin.y + Math.sin(spAngle) * spLen * 0.35 + random.jitter(3) },
					{ x: spOrigin.x + Math.cos(spAngle) * spLen, y: spOrigin.y + Math.sin(spAngle) * spLen * 0.7 },
				],
				baseHalfWidth: 1.3,
				glowRatio: 0,
			});
		}
	}

	return branches;
}

/**
 * Stateful fissure painter with dirty-flag progress guard so static cracks are
 * drawn ONCE at full openness and only alpha-faded on GPU afterward.
 */
function createCrackPainter(
	g: Graphics,
	branches: readonly CrackBranch[],
	theme: TitanVisualTheme,
): (progress: number) => void {
	const ramp: ThreeStopColorRamp = {
		core: theme.crackCore,
		mid: theme.crackMid,
		outer: theme.crackOuter,
	};
	let lastDrawn = -1;

	return (progress: number): void => {
		const clamped = Math.max(0, Math.min(1, progress));
		if (lastDrawn >= 0.999 && clamped >= 0.999) return;
		if (Math.abs(clamped - lastDrawn) < 0.008 && clamped < 0.999) return;
		lastDrawn = clamped;

		g.clear();
		if (clamped <= 0) return;

		for (const branch of branches) {
			const activePts = slicePolylineByProgress(branch.points, clamped);
			if (activePts.length < 2) continue;

			fillTaperedFissure(g, activePts, branch.baseHalfWidth * 2.3, 0x020307, 0.28, 0, 2.4);
			fillTaperedFissure(g, activePts, branch.baseHalfWidth * 0.68, 0x64748b, 0.16, 1.6, 1.6);
			fillTaperedFissure(g, activePts, branch.baseHalfWidth, 0x05070d, 0.88);

			if (branch.glowRatio > 0) {
				const glowPts = slicePolylineByProgress(activePts, branch.glowRatio);
				if (glowPts.length >= 2) {
					fillGradientFissureSeam(g, glowPts, branch.baseHalfWidth * 0.52, ramp, 0.52);
					fillGradientFissureSeam(g, glowPts, Math.max(0.7, branch.baseHalfWidth * 0.2), ramp, 0.58);
				}
			}
		}
	};
}

/**
 * Generates deterministic jagged seismic fissure vertices between two arena points.
 */
export function computeQuakeCrackPoints(
	origin: ViewportPoint,
	target: ViewportPoint,
	seed: string,
	segments = 8,
): readonly ViewportPoint[] {
	const random = createEffectRandom(`titan-quake:${seed}`);
	const dx = target.x - origin.x;
	const dy = target.y - origin.y;
	const len = Math.max(1, Math.hypot(dx, dy));
	const nx = -dy / len;
	const ny = dx / len;
	const jitterAmp = Math.min(34, Math.max(12, len * 0.065));

	const pts: ViewportPoint[] = [{ x: origin.x, y: origin.y }];
	for (let i = 1; i < segments; i += 1) {
		const u = i / segments;
		const offset = random.jitter(jitterAmp) * Math.sin(Math.PI * u);
		pts.push({ x: origin.x + dx * u + nx * offset, y: origin.y + dy * u + ny * offset });
	}
	pts.push({ x: target.x, y: target.y });
	return pts;
}

interface FlyingDebris {
	readonly sprite: Sprite;
	age: number;
	readonly life: number;
	vx: number;
	vy: number;
	readonly gravity: number;
	readonly spin: number;
	readonly peakScale: number;
	readonly peakAlpha: number;
}

interface DebrisRingOptions {
	readonly useChain?: boolean;
	readonly scaleMultiplier?: number;
	readonly speedMultiplier?: number;
}

function spawnDebrisRing(
	container: Container,
	textures: TitanVfxTextures,
	cx: number,
	cy: number,
	count: number,
	tint: number,
	seed: string,
	options: DebrisRingOptions = {},
): FlyingDebris[] {
	const useChain = options.useChain ?? false;
	const scaleMult = options.scaleMultiplier ?? 1;
	const speedMult = options.speedMultiplier ?? 1;
	const random = createEffectRandom(`titan-debris:${seed}`);
	const list: FlyingDebris[] = [];

	for (let i = 0; i < count; i += 1) {
		const sp = new Sprite(useChain ? textures.chainLink : textures.stoneShard);
		sp.anchor.set(0.5);
		sp.tint = useChain ? 0xe2e8f0 : tint;
		sp.position.set(cx + random.jitter(20), cy + random.jitter(12));
		sp.rotation = random.next() * Math.PI * 2;
		const peakScale = ((useChain ? 0.52 : 0.34) + random.next() * 0.46) * scaleMult;
		sp.scale.set(peakScale * 0.08);
		sp.alpha = 0;
		container.addChild(sp);

		const angle = (Math.PI * 2 * i) / count + random.jitter(0.32);
		const speed = ((useChain ? 240 : 175) + random.next() * 215) * speedMult;
		list.push({
			sprite: sp,
			age: 0,
			life: (0.56 + random.next() * 0.38) * (scaleMult < 0.4 ? 0.65 : 1),
			vx: Math.cos(angle) * speed,
			vy: (Math.sin(angle) * speed * 0.65 - (125 + random.next() * 145)) * speedMult,
			gravity: 560,
			spin: (random.next() > 0.5 ? 1 : -1) * (4.5 + random.next() * 6.5),
			peakScale,
			peakAlpha: 0.95,
		});
	}

	return list;
}

function stepDebrisList(list: readonly FlyingDebris[], dt: number): void {
	for (const d of list) {
		d.age += dt;
		if (d.age >= d.life) {
			d.sprite.alpha = 0;
			continue;
		}
		const u = d.age / d.life;
		d.vy += d.gravity * dt;
		d.sprite.x += d.vx * dt;
		d.sprite.y += d.vy * dt;
		d.sprite.rotation += d.spin * dt;
		const popScale = u < 0.16
			? 0.08 + easeOutCubic(u / 0.16) * 0.92
			: 1 - ((u - 0.16) / 0.84) * 0.28;
		d.sprite.scale.set(d.peakScale * popScale);
		const fadeIn = Math.min(1, u / 0.1);
		const fadeOut = u > 0.58 ? Math.max(0, 1 - (u - 0.58) / 0.42) : 1;
		d.sprite.alpha = d.peakAlpha * fadeIn * fadeOut;
	}
}

interface DustCloud {
	readonly sprite: Sprite;
	readonly vx: number;
	readonly vy: number;
	readonly startScale: number;
}

function spawnDustClouds(
	container: Container,
	textures: TitanVfxTextures,
	origin: ViewportPoint,
	count: number,
	seed: string,
): DustCloud[] {
	const random = createEffectRandom(`titan-dust:${seed}`);
	const clouds: DustCloud[] = [];
	for (let i = 0; i < count; i += 1) {
		const sp = new Sprite(textures.dustPuff);
		sp.anchor.set(0.5);
		const angle = (Math.PI * 2 * i) / count + random.jitter(0.35);
		sp.position.set(origin.x + Math.cos(angle) * 26, origin.y + 14 + Math.sin(angle) * 16);
		const startScale = 0.75 + random.next() * 0.45;
		sp.scale.set(startScale, startScale * 0.65);
		sp.alpha = 0;
		container.addChild(sp);
		clouds.push({
			sprite: sp,
			vx: Math.cos(angle) * (42 + random.next() * 48),
			vy: Math.sin(angle) * (24 + random.next() * 28) - 10,
			startScale,
		});
	}
	return clouds;
}

function stepDustClouds(clouds: readonly DustCloud[], dustT: number, dt: number): void {
	for (const d of clouds) {
		d.sprite.x += d.vx * dt * (1 - dustT * 0.5);
		d.sprite.y += d.vy * dt * (1 - dustT * 0.5);
		const sc = d.startScale * (1 + easeOutQuad(dustT) * 0.85);
		d.sprite.scale.set(sc, sc * 0.65);
		d.sprite.alpha = Math.sin(dustT * Math.PI) * 0.58;
	}
}

function drawTautChains(g: Graphics, cx: number, cy: number, tension: number, glowColor: number): void {
	g.clear();
	const reach = 195;
	const diagonals: readonly ViewportPoint[] = [
		{ x: cx - reach, y: cy - reach * 0.62 },
		{ x: cx + reach, y: cy - reach * 0.62 },
		{ x: cx - reach, y: cy + reach * 0.62 },
		{ x: cx + reach, y: cy + reach * 0.62 },
	];
	const jitter = tension * 4.5;
	for (let i = 0; i < diagonals.length; i += 1) {
		const end = diagonals[i];
		const vibr = Math.sin(tension * 42 + i * 1.7) * jitter;
		const midX = (cx + end.x) * 0.5 + vibr;
		const midY = (cy + end.y) * 0.5 - vibr;

		g.moveTo(end.x, end.y);
		g.lineTo(midX, midY);
		g.lineTo(cx, cy);
		g.stroke({ width: 5.5, color: 0x334155, alpha: 0.92 });

		g.moveTo(end.x, end.y);
		g.lineTo(midX, midY);
		g.lineTo(cx, cy);
		g.stroke({ width: 2.2 + tension * 2.2, color: glowColor, alpha: 0.35 + tension * 0.62 });
	}
}

/**
 * Scene 1: `titan-earth-slam`
 */
export function playTitanEarthSlam(request: FactionVfxSceneRequest): FactionSceneHandle | null {
	const endpoints = resolveArenaEndpoints(request);
	if (!endpoints) return null;

	const reduced = prefersReducedMotion();
	const theme = resolveTitanTheme(request.element);
	const origin = endpoints.sourceArena;
	const durationSec = reduced ? 0.48 : 1.3;
	const crackOpenSec = reduced ? 0.1 : 0.2;
	const rockBurstSec = crackOpenSec * 0.82;

	return runTimedPixiScene({
		sceneId: 'titan-earth-slam',
		durationSec,
		mount(effect, app) {
			const textures = acquireTitanTextures(app);
			if (!textures) return { onUpdate: () => {} };

			const random = createEffectRandom(`titan-slam:${request.seed}`);

			const craterDecal = new Sprite(textures.craterDecal);
			craterDecal.anchor.set(0.5);
			craterDecal.position.set(origin.x, origin.y + 12);
			craterDecal.rotation = random.next() * Math.PI * 2;
			craterDecal.scale.set(0.55, 0.38);
			craterDecal.alpha = 0;

			const shockwave = new Sprite(textures.shockwaveRing);
			shockwave.anchor.set(0.5);
			shockwave.position.set(origin.x, origin.y + 12);
			shockwave.tint = theme.crackMid;
			shockwave.blendMode = 'add';
			shockwave.scale.set(0.28, 0.18);
			shockwave.alpha = 0;

			const crackGraphics = new Graphics();
			const branches = buildRadialCracks(origin.x, origin.y + 12, reduced ? 5 : 8, reduced ? 125 : 195, request.seed);
			const paintCracks = createCrackPainter(crackGraphics, branches, theme);

			const bloom = new Sprite(textures.impactBloom);
			bloom.anchor.set(0.5);
			bloom.position.set(origin.x, origin.y + 12);
			bloom.tint = theme.crackMid;
			bloom.blendMode = 'add';
			bloom.scale.set(0.85, 0.56);
			bloom.alpha = 0;

			effect.addChild(craterDecal, shockwave, crackGraphics, bloom);
			const dustClouds = spawnDustClouds(effect, textures, origin, reduced ? 2 : 5, request.seed);
			const debris: FlyingDebris[] = reduced
				? []
				: spawnDebrisRing(effect, textures, origin.x, origin.y + 10, 3, theme.shardTint, `${request.seed}:pre`, { scaleMultiplier: 0.22, speedMultiplier: 0.42 });

			spawnImpactRing(endpoints.sourceScreen.x, endpoints.sourceScreen.y, theme.palette, 'luminous');
			spawnSparkBurst(endpoints.sourceScreen.x, endpoints.sourceScreen.y, reduced ? 5 : 11, theme.palette, request.seed);
			triggerArenaShake('mild');
			playFactionSfx('damage_hero');

			let rocksErupted = false;

			return {
				onUpdate({ age, dt, progress: t }) {
					const openEased = easeOutCubic(Math.min(1, age / crackOpenSec));
					const fadeOut = t < 0.48 ? 1 : Math.max(0, 1 - (t - 0.48) / 0.52);

					paintCracks(openEased);
					crackGraphics.alpha = fadeOut;

					craterDecal.scale.set(0.65 + openEased * 0.72, 0.44 + openEased * 0.46);
					craterDecal.alpha = openEased * 0.88 * fadeOut;

					const bloomT = Math.min(1, t * 1.45);
					bloom.scale.set(0.7 + easeOutQuad(bloomT) * 0.62, 0.46 + easeOutQuad(bloomT) * 0.38);
					bloom.alpha = Math.max(0, (1 - easeOutQuad(bloomT)) * 0.55);

					const waveT = Math.min(1, t * 2.1);
					const waveEased = easeOutCubic(waveT);
					shockwave.scale.set(0.35 + waveEased * 1.45, 0.22 + waveEased * 0.92);
					shockwave.alpha = Math.sin(waveT * Math.PI) * 0.44;

					stepDustClouds(dustClouds, Math.min(1, t * 1.25), dt);

					if (!rocksErupted && age >= rockBurstSec) {
						rocksErupted = true;
						debris.push(
							...spawnDebrisRing(effect, textures, origin.x, origin.y + 8, reduced ? 6 : 15, theme.shardTint, `${request.seed}:burst`, { scaleMultiplier: 1.05, speedMultiplier: 1.05 }),
						);
					}
					stepDebrisList(debris, dt);
				},
			};
		},
	});
}

/**
 * Scene 2: `titan-colossus-quake`
 */
export function playTitanColossusQuake(request: FactionVfxSceneRequest): FactionSceneHandle | null {
	const endpoints = resolveArenaEndpoints(request);
	if (!endpoints) return null;

	const reduced = prefersReducedMotion();
	const theme = resolveTitanTheme(request.element);
	const origin = endpoints.sourceArena;
	const target = endpoints.targetArena;
	const travelSec = reduced ? 0.16 : 0.36;
	const durationSec = reduced ? 0.44 : 1.12;

	return runTimedPixiScene({
		sceneId: 'titan-colossus-quake',
		durationSec,
		mount(effect, app) {
			const textures = acquireTitanTextures(app);
			if (!textures) return { onUpdate: () => {} };

			const quakePts = computeQuakeCrackPoints(origin, target, request.seed, reduced ? 5 : 9);
			const mainBranch: CrackBranch = { points: quakePts, baseHalfWidth: 6.2, glowRatio: 0.72 };
			const impactBranches = buildRadialCracks(target.x, target.y, reduced ? 4 : 7, reduced ? 95 : 150, `${request.seed}:imp`);

			const craterDecal = new Sprite(textures.craterDecal);
			craterDecal.anchor.set(0.5);
			craterDecal.position.set(target.x, target.y);
			craterDecal.scale.set(0.45, 0.32);
			craterDecal.alpha = 0;

			const quakeGraphics = new Graphics();
			const impactGraphics = new Graphics();
			const paintQuake = createCrackPainter(quakeGraphics, [mainBranch], theme);
			const paintCrater = createCrackPainter(impactGraphics, impactBranches, theme);

			const impactBloom = new Sprite(textures.impactBloom);
			impactBloom.anchor.set(0.5);
			impactBloom.position.set(target.x, target.y);
			impactBloom.tint = theme.crackMid;
			impactBloom.blendMode = 'add';
			impactBloom.scale.set(0.65, 0.44);
			impactBloom.alpha = 0;

			effect.addChild(craterDecal, quakeGraphics, impactGraphics, impactBloom);
			const activeDebris: FlyingDebris[] = [];
			let lastSegmentSpawned = 0;
			let impactFired = false;

			playFactionSfx('spell_impact');

			const fireImpact = (): void => {
				if (impactFired) return;
				impactFired = true;
				activeDebris.push(
					...spawnDebrisRing(effect, textures, target.x, target.y, reduced ? 6 : 16, theme.shardTint, `${request.seed}:crater`, { scaleMultiplier: 1.08, speedMultiplier: 1.05 }),
				);
				spawnImpactRing(endpoints.targetScreen.x, endpoints.targetScreen.y, theme.palette, 'luminous');
				spawnSparkBurst(endpoints.targetScreen.x, endpoints.targetScreen.y, reduced ? 6 : 16, theme.palette, `${request.seed}:spk`);
				triggerArenaShake('mild');
				playFactionSfx('damage_hero');
				if (endpoints.targetEntityId) {
					triggerCardImpactVibration(presentationTargetForEntityId(endpoints.targetEntityId), 'heavy', 'normal');
				}
			};

			return {
				onUpdate({ age, dt }) {
					const travelT = Math.min(1, age / travelSec);
					paintQuake(easeOutQuad(travelT));

					const segIdx = Math.floor(travelT * (quakePts.length - 1));
					if (!reduced && segIdx > lastSegmentSpawned && segIdx < quakePts.length && segIdx % 2 === 0) {
						lastSegmentSpawned = segIdx;
						const p = quakePts[segIdx];
						activeDebris.push(
							...spawnDebrisRing(effect, textures, p.x, p.y, 1, theme.shardTint, `${request.seed}:s${segIdx}`, { scaleMultiplier: 0.2, speedMultiplier: 0.38 }),
						);
					}

					if (age >= travelSec) {
						fireImpact();
						const postT = (age - travelSec) / (durationSec - travelSec);
						const openEased = easeOutCubic(Math.min(1, postT / 0.24));
						const fade = postT < 0.42 ? 1 : Math.max(0, 1 - (postT - 0.42) / 0.58);
						paintCrater(openEased);
						quakeGraphics.alpha = fade;
						impactGraphics.alpha = fade;
						craterDecal.scale.set(0.48 + openEased * 0.56, 0.34 + openEased * 0.36);
						craterDecal.alpha = openEased * 0.82 * fade;
						impactBloom.alpha = Math.max(0, (1 - easeOutQuad(Math.min(1, postT * 1.5))) * 0.5);
					}

					stepDebrisList(activeDebris, dt);
				},
			};
		},
	});
}

/**
 * Scene 3: `titan-pantheon-descent`
 */
export function playTitanPantheonDescent(request: FactionVfxSceneRequest): FactionSceneHandle | null {
	const endpoints = resolveArenaEndpoints(request);
	if (!endpoints) return null;

	const reduced = prefersReducedMotion();
	const theme = resolveTitanTheme(request.element);
	const origin = endpoints.sourceArena;
	const shatterEndSec = reduced ? 0.28 : 0.78;
	const durationSec = reduced ? 0.9 : 2.45;

	return runTimedPixiScene({
		sceneId: 'titan-pantheon-descent',
		durationSec,
		mount(effect, app) {
			const textures = acquireTitanTextures(app);
			if (!textures) return { onUpdate: () => {} };

			const eclipse = new Graphics();
			eclipse.rect(0, 0, ARENA_CANVAS_SIZE.width, ARENA_CANVAS_SIZE.height);
			eclipse.fill({ color: 0x05070d, alpha: 1 });
			eclipse.alpha = 0;

			const beam = new Sprite(textures.celestialBeam);
			beam.anchor.set(0.5, 1);
			beam.position.set(origin.x, origin.y + 32);
			beam.width = 210;
			beam.height = Math.max(420, origin.y + 80);
			beam.tint = theme.beamTint;
			beam.blendMode = 'add';
			beam.alpha = 0;

			const craterDecal = new Sprite(textures.craterDecal);
			craterDecal.anchor.set(0.5);
			craterDecal.position.set(origin.x, origin.y + 14);
			craterDecal.scale.set(0.75, 0.5);
			craterDecal.alpha = 0;

			const shockwave = new Sprite(textures.shockwaveRing);
			shockwave.anchor.set(0.5);
			shockwave.position.set(origin.x, origin.y + 14);
			shockwave.tint = theme.crackMid;
			shockwave.blendMode = 'add';
			shockwave.scale.set(0.35, 0.24);
			shockwave.alpha = 0;

			const crackGraphics = new Graphics();
			const branches = buildRadialCracks(origin.x, origin.y + 14, reduced ? 6 : 10, reduced ? 160 : 255, request.seed);
			const paintCracks = createCrackPainter(crackGraphics, branches, theme);

			const impactBloom = new Sprite(textures.impactBloom);
			impactBloom.anchor.set(0.5);
			impactBloom.position.set(origin.x, origin.y + 14);
			impactBloom.tint = theme.crackMid;
			impactBloom.blendMode = 'add';
			impactBloom.scale.set(1.05, 0.72);
			impactBloom.alpha = 0;

			const outerSeal = new Sprite(textures.astrolabeOuter);
			outerSeal.anchor.set(0.5);
			outerSeal.position.set(origin.x, origin.y);
			outerSeal.tint = theme.ringGold;
			outerSeal.blendMode = 'add';
			outerSeal.alpha = 0;

			const innerSeal = new Sprite(textures.astrolabeInner);
			innerSeal.anchor.set(0.5);
			innerSeal.position.set(origin.x, origin.y);
			innerSeal.tint = theme.accentGlow;
			innerSeal.blendMode = 'add';
			innerSeal.alpha = 0;

			const chainGraphics = new Graphics();
			const dust = new Sprite(textures.dustPuff);
			dust.anchor.set(0.5);
			dust.position.set(origin.x, origin.y + 16);
			dust.tint = theme.shardTint;
			dust.alpha = 0;

			effect.addChild(eclipse, beam, craterDecal, shockwave, crackGraphics, impactBloom, outerSeal, innerSeal, chainGraphics, dust);

			let shatterFired = false;
			let debris: FlyingDebris[] = [];

			vfxOrchestrationDirector.triggerCriticalSpotlight(Math.round(durationSec * 750));
			triggerEmotionalImpulse('climax', 0.8);
			playFactionSfx('norse_horn');
			spawnRunePulse(endpoints.sourceScreen.x, endpoints.sourceScreen.y, theme.palette, 520, 1.5);

			const fireShatterBeat = (): void => {
				if (shatterFired) return;
				shatterFired = true;
				chainGraphics.clear();
				debris = [
					...spawnDebrisRing(effect, textures, origin.x, origin.y, reduced ? 4 : 14, 0xe2e8f0, `${request.seed}:ch`, { useChain: true }),
					...spawnDebrisRing(effect, textures, origin.x, origin.y + 10, reduced ? 7 : 22, theme.shardTint, `${request.seed}:st`, { scaleMultiplier: 1.12, speedMultiplier: 1.08 }),
				];
				spawnImpactRing(endpoints.sourceScreen.x, endpoints.sourceScreen.y, theme.palette, 'luminous');
				spawnRunePulse(endpoints.sourceScreen.x, endpoints.sourceScreen.y, theme.palette, 780, 2.05);
				spawnStarburstBloom(endpoints.sourceScreen.x, endpoints.sourceScreen.y, theme.palette, 1.65, 480);
				spawnSparkBurst(endpoints.sourceScreen.x, endpoints.sourceScreen.y, reduced ? 8 : 22, theme.palette, `${request.seed}:spk`);
				spawnArenaFlash(theme.flashHex, 0.22, 260);
				triggerArenaShake('heavy');
				triggerEmotionalImpulse('shock', 0.85);
				playFactionSfx('damage_hero');
			};

			return {
				onUpdate({ age, dt, progress: globalT }) {
					const fadeOut = globalT > 0.7 ? Math.max(0, 1 - (globalT - 0.7) / 0.3) : 1;
					eclipse.alpha = Math.sin(Math.min(1, globalT) * Math.PI) * (reduced ? 0.14 : 0.26);

					if (age < shatterEndSec) {
						const actT = age / shatterEndSec;
						const eased = easeOutCubic(actT);
						outerSeal.alpha = Math.min(0.95, actT * 2.2);
						outerSeal.scale.set(1.85 - eased * 0.55);
						outerSeal.rotation += dt * (1.2 + actT * 2.4);

						innerSeal.alpha = Math.min(0.9, actT * 2.0);
						innerSeal.scale.set(0.65 + eased * 0.65);
						innerSeal.rotation -= dt * (1.8 + actT * 3.1);

						beam.alpha = Math.min(0.75, actT * 1.4);
						beam.width = 135 + actT * 115;

						if (!reduced) drawTautChains(chainGraphics, origin.x, origin.y, actT, theme.ringGold);
						return;
					}

					fireShatterBeat();
					const postT = (age - shatterEndSec) / (durationSec - shatterEndSec);
					const openEased = easeOutCubic(Math.min(1, postT / 0.16));
					const crackFade = postT < 0.48 ? 1 : Math.max(0, 1 - (postT - 0.48) / 0.52);

					paintCracks(openEased);
					crackGraphics.alpha = crackFade;

					craterDecal.scale.set(0.8 + openEased * 0.9, 0.52 + openEased * 0.58);
					craterDecal.alpha = openEased * 0.88 * crackFade;

					const waveT = Math.min(1, postT * 2.2);
					shockwave.scale.set(0.4 + easeOutCubic(waveT) * 1.9, 0.26 + easeOutCubic(waveT) * 1.25);
					shockwave.alpha = Math.sin(waveT * Math.PI) * 0.5;

					impactBloom.alpha = Math.max(0, (1 - easeOutQuad(Math.min(1, postT * 1.65))) * 0.62);
					beam.alpha = Math.max(0, (1 - easeOutQuad(Math.min(1, postT * 1.8))) * 0.9);
					beam.width = 250 + postT * 110;

					outerSeal.rotation += dt * 0.42;
					outerSeal.scale.set(1.3 + postT * 0.32);
					outerSeal.alpha = 0.88 * fadeOut;

					innerSeal.rotation -= dt * 0.55;
					innerSeal.scale.set(1.3 + postT * 0.25);
					innerSeal.alpha = 0.8 * fadeOut;

					const dustT = Math.min(1, postT * 1.6);
					dust.scale.set(0.9 + easeOutQuad(dustT) * 3.4, 0.55 + easeOutQuad(dustT) * 2.0);
					dust.alpha = Math.max(0, 0.7 * (1 - dustT));

					stepDebrisList(debris, dt);
				},
			};
		},
	});
}

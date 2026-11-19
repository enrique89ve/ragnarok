/**
 * dragonFlameScene.ts
 *
 * Lightweight PixiJS v8 dragon fire scenes powered by the shared faction runtime:
 * - `dragon-flame-ignition`: ONE unified, procedurally randomized living flame using
 *   cached GPU vertical FillGradients, soft feathered heat-scorch decal, and stray wisps.
 * - `dragon-fire-breath`: Continuous tapered Katon flame plume with rounded fireball
 *   crown, swept directional flame ribbons, wind pressure arcs, and golden sparks.
 */

import { Container, Graphics, Sprite } from 'pixi.js';
import { createEffectRandom } from '@/game/effects/core/effectRandom';
import { triggerCardImpactVibration } from '../../localFxPrimitives';
import { presentationTargetForEntityId } from '@/game/effects/presentation/EffectTargetResolver';
import {
	spawnEmbers,
	spawnImpactRing,
	spawnSparkBurst,
	type ParticleColor,
} from '../../../../animations/PixiParticleCanvas';
import { easeOutCubic, easeOutQuad, prefersReducedMotion } from '../../../../animations/pixi/pixiPalettes';
import { fillSmoothClosedContour } from '../runtime/geometryPrimitives';
import {
	acquireDragonFlameTextures,
	acquireUnifiedFlameGradients,
	type UnifiedFlameGradients,
} from '../runtime/gpuAssetPool';
import {
	playFactionSfx,
	resolveArenaEndpoints,
	resolveFactionSceneAnchors,
	type ResolvedFactionAnchors,
} from '../runtime/sceneContext';
import { runTimedPixiScene } from '../runtime/sceneRunner';
import type { DragonFlameTextures } from './dragonFlameTextures';
import type { FactionSceneHandle, FactionVfxSceneRequest, ViewportPoint } from '../types';

export interface DragonFlameTheme {
	readonly key: 'fire' | 'storm' | 'shadow';
	readonly coreTint: number;
	readonly midTint: number;
	readonly outerTint: number;
	readonly celSpriteTint: number;
	readonly coneOuter: number;
	readonly coneMid: number;
	readonly coneCore: number;
	readonly palette: ParticleColor;
}

const DRAGON_THEMES: Readonly<Record<DragonFlameTheme['key'], DragonFlameTheme>> = {
	fire: {
		key: 'fire',
		coreTint: 0xfff7b2,
		midTint: 0xff7a14,
		outerTint: 0xe83018,
		celSpriteTint: 0xffffff,
		coneOuter: 0xe83018,
		coneMid: 0xff7a14,
		coneCore: 0xffe838,
		palette: {
			primary: '#ff7a14',
			secondary: '#ffe838',
			glow: 'rgba(255, 122, 20, 0.78)',
		},
	},
	storm: {
		key: 'storm',
		coreTint: 0xf8fdff,
		midTint: 0xffb732,
		outerTint: 0x38bdf8,
		celSpriteTint: 0xe0f2fe,
		coneOuter: 0x0284c7,
		coneMid: 0x38bdf8,
		coneCore: 0xfff8c4,
		palette: {
			primary: '#38bdf8',
			secondary: '#ffe838',
			glow: 'rgba(56, 189, 248, 0.72)',
		},
	},
	shadow: {
		key: 'shadow',
		coreTint: 0xffe09e,
		midTint: 0xea580c,
		outerTint: 0x991b1b,
		celSpriteTint: 0xffd2c2,
		coneOuter: 0x991b1b,
		coneMid: 0xea580c,
		coneCore: 0xfde047,
		palette: {
			primary: '#ea580c',
			secondary: '#dc2626',
			glow: 'rgba(220, 38, 38, 0.75)',
		},
	},
};

export function resolveDragonFlameTheme(element?: string): DragonFlameTheme {
	const normalized = (element ?? '').toLowerCase();
	if (normalized === 'electric' || normalized === 'lightning') return DRAGON_THEMES.storm;
	if (normalized === 'dark' || normalized === 'shadow') return DRAGON_THEMES.shadow;
	return DRAGON_THEMES.fire;
}

/** Backwards-compatible alias for unit tests and external callers. */
export type ResolvedDragonAnchors = ResolvedFactionAnchors;
export const resolveDragonSceneAnchors = resolveFactionSceneAnchors;

export interface UnifiedFlameProfile {
	readonly leanDrift: number;
	readonly heightScale: number;
	readonly widthScale: number;
	readonly spineFreq1: number;
	readonly spineFreq2: number;
	readonly spineSpeed1: number;
	readonly spineSpeed2: number;
	readonly spinePhase1: number;
	readonly spinePhase2: number;
	readonly leftEdgeFreq: number;
	readonly leftEdgePhase: number;
	readonly rightEdgeFreq: number;
	readonly rightEdgePhase: number;
	readonly shoulderSide: -1 | 1;
	readonly shoulderHeight: number;
	readonly shoulderSpread: number;
	readonly shoulderPhase: number;
}

/**
 * Generates a unique asymmetric flame silhouette profile for a given seed.
 */
export function createUnifiedFlameProfile(seed: string): UnifiedFlameProfile {
	const r = createEffectRandom(`unified-flame:${seed}`);
	return {
		leanDrift: r.jitter(26),
		heightScale: 0.88 + r.next() * 0.28,
		widthScale: 0.88 + r.next() * 0.26,
		spineFreq1: 3.4 + r.next() * 2.2,
		spineFreq2: 6.8 + r.next() * 3.4,
		spineSpeed1: 7.5 + r.next() * 4.5,
		spineSpeed2: 12.5 + r.next() * 6.0,
		spinePhase1: r.next() * Math.PI * 2,
		spinePhase2: r.next() * Math.PI * 2,
		leftEdgeFreq: 4.5 + r.next() * 3.2,
		leftEdgePhase: r.next() * Math.PI * 2,
		rightEdgeFreq: 4.8 + r.next() * 3.2,
		rightEdgePhase: r.next() * Math.PI * 2,
		shoulderSide: r.next() > 0.5 ? 1 : -1,
		shoulderHeight: 0.44 + r.next() * 0.24,
		shoulderSpread: 0.46 + r.next() * 0.24,
		shoulderPhase: r.next() * Math.PI * 2,
	};
}

/**
 * Samples a smooth closed silhouette for one unified organic flame mass.
 */
export function sampleUnifiedFlameContour(
	origin: ViewportPoint,
	profile: UnifiedFlameProfile,
	baseHalfW: number,
	height: number,
	timeSec: number,
	phaseShift = 0,
	steps = 14,
): readonly ViewportPoint[] {
	const leftPts: ViewportPoint[] = [];
	const rightPts: ViewportPoint[] = [];

	for (let i = 0; i <= steps; i += 1) {
		const u = i / steps;
		const belly = Math.pow(Math.max(0.001, 1 - u), 0.72) * (0.86 + 0.36 * Math.sin(u * Math.PI));
		const hw = baseHalfW * belly;

		const sway1 = Math.sin(u * profile.spineFreq1 - timeSec * profile.spineSpeed1 + profile.spinePhase1 + phaseShift);
		const sway2 = Math.sin(u * profile.spineFreq2 - timeSec * profile.spineSpeed2 + profile.spinePhase2 - phaseShift * 0.7);
		const spineX = origin.x + Math.pow(u, 1.25) * (profile.leanDrift + sway1 * 18 + sway2 * 8);
		const y = origin.y - u * height;

		const leftWave = Math.sin(u * profile.leftEdgeFreq - timeSec * 10.5 + profile.leftEdgePhase + phaseShift) * 11 * Math.sin(u * Math.PI);
		const rightWave = Math.sin(u * profile.rightEdgeFreq - timeSec * 11.4 + profile.rightEdgePhase - phaseShift) * 11 * Math.sin(u * Math.PI);

		const shoulderBell = Math.exp(-Math.pow((u - profile.shoulderHeight) / 0.19, 2));
		const shoulderBoost = baseHalfW * profile.shoulderSpread * shoulderBell * (0.75 + 0.25 * Math.sin(timeSec * 9.5 + profile.shoulderPhase));

		leftPts.push({ x: spineX - hw - (profile.shoulderSide < 0 ? shoulderBoost : 0) + leftWave, y });
		rightPts.push({ x: spineX + hw + (profile.shoulderSide > 0 ? shoulderBoost : 0) + rightWave, y });
	}

	const bottomPts: ViewportPoint[] = [
		{ x: origin.x + baseHalfW * 0.56, y: origin.y + baseHalfW * 0.22 },
		{ x: origin.x, y: origin.y + baseHalfW * 0.28 },
		{ x: origin.x - baseHalfW * 0.56, y: origin.y + baseHalfW * 0.22 },
	];

	return [...leftPts, ...rightPts.slice(0, -1).reverse(), ...bottomPts];
}

function drawUnifiedFlameMass(
	g: Graphics,
	origin: ViewportPoint,
	profile: UnifiedFlameProfile,
	scale: number,
	envelopeAlpha: number,
	timeSec: number,
	gradients: UnifiedFlameGradients,
): void {
	g.clear();
	if (scale <= 0.04 || envelopeAlpha <= 0.01) return;

	const baseW = 78 * profile.widthScale * scale;
	const fullH = 215 * profile.heightScale * scale;

	fillSmoothClosedContour(g, sampleUnifiedFlameContour(origin, profile, baseW, fullH, timeSec, 0, 14), gradients.outer, envelopeAlpha);
	const midOrigin = { x: origin.x + profile.leanDrift * 0.05, y: origin.y - 4 * scale };
	fillSmoothClosedContour(g, sampleUnifiedFlameContour(midOrigin, profile, baseW * 0.72, fullH * 0.82, timeSec * 1.08, 0.55, 12), gradients.mid, envelopeAlpha);
	const innerOrigin = { x: origin.x, y: origin.y - 6 * scale };
	fillSmoothClosedContour(g, sampleUnifiedFlameContour(innerOrigin, profile, baseW * 0.44, fullH * 0.58, timeSec * 1.15, 1.1, 10), gradients.inner, envelopeAlpha);
	const coreOrigin = { x: origin.x, y: origin.y - 4 * scale };
	fillSmoothClosedContour(g, sampleUnifiedFlameContour(coreOrigin, profile, baseW * 0.22, fullH * 0.32, timeSec * 1.2, 1.65, 8), gradients.core, envelopeAlpha);
}

interface DetachedFlameWisp {
	readonly sprite: Sprite;
	readonly delay: number;
	readonly life: number;
	readonly startX: number;
	readonly startY: number;
	readonly vx: number;
	readonly vy: number;
	readonly scaleX: number;
	readonly scaleY: number;
	readonly rotSpeed: number;
}

interface GoldenSpark {
	readonly sprite: Sprite;
	readonly delay: number;
	readonly life: number;
	readonly startX: number;
	readonly startY: number;
	readonly vx: number;
	readonly vy: number;
	readonly startScale: number;
}

function spawnGoldenSparks(
	container: Container,
	textures: DragonFlameTextures,
	cx: number,
	cy: number,
	count: number,
	seed: string,
	dirAngle?: number,
): GoldenSpark[] {
	const random = createEffectRandom(`dragon-sparks:${seed}`);
	const sparks: GoldenSpark[] = [];
	for (let i = 0; i < count; i += 1) {
		const sp = new Sprite(textures.emberSpark);
		sp.anchor.set(0.5);
		sp.blendMode = 'add';
		sp.alpha = 0;
		container.addChild(sp);

		const angle = dirAngle !== undefined
			? dirAngle + random.jitter(0.55)
			: (Math.PI * 2 * i) / count + random.jitter(0.35);
		const speed = 130 + random.next() * 260;
		sparks.push({
			sprite: sp,
			delay: random.next() * 0.28,
			life: 0.42 + random.next() * 0.36,
			startX: cx + random.jitter(36),
			startY: cy + random.jitter(28),
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed - (dirAngle === undefined ? 75 : 20),
			startScale: 0.28 + random.next() * 0.42,
		});
	}
	return sparks;
}

function stepGoldenSparks(sparks: readonly GoldenSpark[], age: number): void {
	for (const s of sparks) {
		const local = age - s.delay;
		if (local <= 0 || local >= s.life) {
			s.sprite.alpha = 0;
			continue;
		}
		const u = local / s.life;
		const drag = 1 - u * 0.35;
		s.sprite.position.set(s.startX + s.vx * local * drag, s.startY + s.vy * local * drag);
		s.sprite.scale.set(s.startScale * (1 - u * 0.45) * (0.72 + Math.sin(local * 38) * 0.28));
		const fadeIn = Math.min(1, u / 0.14);
		const fadeOut = u > 0.55 ? Math.max(0, 1 - (u - 0.55) / 0.45) : 1;
		s.sprite.alpha = fadeIn * fadeOut;
	}
}

function spawnStrayWisps(
	container: Container,
	textures: DragonFlameTextures,
	origin: ViewportPoint,
	profile: UnifiedFlameProfile,
	theme: DragonFlameTheme,
	count: number,
	seed: string,
): DetachedFlameWisp[] {
	const random = createEffectRandom(`dragon-wisps:${seed}`);
	const wisps: DetachedFlameWisp[] = [];
	for (let i = 0; i < count; i += 1) {
		const sp = new Sprite(textures.flameLick);
		sp.anchor.set(0.5, 0.85);
		sp.tint = theme.celSpriteTint;
		sp.alpha = 0;
		container.addChild(sp);
		const sideSign = i % 2 === 0 ? profile.shoulderSide : -profile.shoulderSide;
		wisps.push({
			sprite: sp,
			delay: 0.16 + i * 0.18 + random.next() * 0.12,
			life: 0.42 + random.next() * 0.22,
			startX: origin.x + sideSign * (18 + random.next() * 34) + profile.leanDrift * 0.45,
			startY: origin.y - (55 + random.next() * 65),
			vx: sideSign * (18 + random.next() * 32) + profile.leanDrift * 0.6,
			vy: -(85 + random.next() * 55),
			scaleX: 0.2 + random.next() * 0.16,
			scaleY: 0.24 + random.next() * 0.18,
			rotSpeed: sideSign * (0.4 + random.next() * 0.6),
		});
	}
	return wisps;
}

function stepStrayWisps(wisps: readonly DetachedFlameWisp[], age: number, dt: number): void {
	for (const w of wisps) {
		const local = age - w.delay;
		if (local <= 0 || local >= w.life) {
			w.sprite.alpha = 0;
			continue;
		}
		const u = local / w.life;
		w.sprite.position.set(w.startX + w.vx * local, w.startY + w.vy * easeOutQuad(u) * w.life);
		w.sprite.scale.set(w.scaleX * (1 - u * 0.45), w.scaleY * (1 - u * 0.35));
		w.sprite.rotation += w.rotSpeed * dt;
		const fi = Math.min(1, u / 0.2);
		const fo = u > 0.45 ? Math.max(0, 1 - (u - 0.45) / 0.55) : 1;
		w.sprite.alpha = 0.46 * fi * fo;
	}
}

/**
 * Scene 1: `dragon-flame-ignition`
 */
export function playDragonFlameIgnition(request: FactionVfxSceneRequest): FactionSceneHandle | null {
	const endpoints = resolveArenaEndpoints(request);
	if (!endpoints) return null;

	const reduced = prefersReducedMotion();
	const theme = resolveDragonFlameTheme(request.element);
	const profile = createUnifiedFlameProfile(request.seed);
	const origin = endpoints.sourceArena;
	const durationSec = reduced ? 0.5 : 1.35;

	return runTimedPixiScene({
		sceneId: 'dragon-flame-ignition',
		durationSec,
		mount(effect, app) {
			const textures = acquireDragonFlameTextures(app);
			if (!textures) {
				return { onUpdate: () => {} };
			}
			const gradients = acquireUnifiedFlameGradients(app, theme);
			const random = createEffectRandom(`dragon-flame-rot:${request.seed}`);

			const scorch = new Sprite(textures.scorchRing);
			scorch.anchor.set(0.5);
			scorch.position.set(origin.x, origin.y + 24);
			scorch.scale.set(0.32, 0.2);
			scorch.alpha = 0;

			const halo = new Sprite(textures.flamePlume);
			halo.anchor.set(0.5);
			halo.position.set(origin.x, origin.y - 26);
			halo.tint = theme.midTint;
			halo.blendMode = 'add';
			halo.alpha = 0;

			const flameGraphics = new Graphics();
			const flameBase: ViewportPoint = { x: origin.x, y: origin.y + 28 };

			const windArc = new Sprite(textures.windArc);
			windArc.anchor.set(0.5);
			windArc.position.set(origin.x, origin.y - 14);
			windArc.rotation = random.next() * Math.PI * 2;
			windArc.alpha = 0;

			effect.addChild(scorch, halo, flameGraphics, windArc);
			const wisps = spawnStrayWisps(effect, textures, origin, profile, theme, reduced ? 1 : 3, request.seed);
			const sparks = spawnGoldenSparks(effect, textures, origin.x, origin.y - 16, reduced ? 4 : 11, request.seed);

			spawnEmbers(endpoints.sourceScreen.x, endpoints.sourceScreen.y, reduced ? 4 : 10, theme.palette);
			playFactionSfx('fire_impact');

			return {
				onUpdate({ age, dt, progress }) {
					const scorchT = Math.min(1, progress / 0.55);
					const scorchEased = easeOutCubic(scorchT);
					scorch.scale.set(0.42 + scorchEased * 0.72, 0.25 + scorchEased * 0.38);
					scorch.alpha = scorchT < 0.2
						? (scorchT / 0.2) * 0.74
						: Math.max(0, 0.74 * (1 - easeOutQuad((progress - 0.2) / 0.8)));

					const flicker = 0.9 + Math.sin(age * 28 + profile.spinePhase1) * 0.1;
					halo.scale.set((1.6 + Math.sin(progress * Math.PI) * 0.5) * flicker);
					halo.alpha = Math.sin(progress * Math.PI) * 0.3 * flicker;

					const grow = progress < 0.22
						? easeOutCubic(progress / 0.22)
						: progress > 0.62
							? Math.max(0.25, 1 - easeOutQuad((progress - 0.62) / 0.38) * 0.75)
							: 1 + Math.sin(age * 16) * 0.04;
					const flameAlpha = progress < 0.14
						? progress / 0.14
						: progress > 0.58
							? Math.max(0, 1 - (progress - 0.58) / 0.42)
							: 1;
					drawUnifiedFlameMass(flameGraphics, flameBase, profile, grow, flameAlpha, reduced ? 0 : age, gradients);

					const windT = Math.min(1, progress * 1.3);
					windArc.scale.set(0.5 + easeOutCubic(windT) * 0.96);
					windArc.rotation += dt * 3.1;
					windArc.alpha = Math.sin(windT * Math.PI) * 0.32;

					stepStrayWisps(wisps, age, dt);
					stepGoldenSparks(sparks, age);
				},
			};
		},
	});
}

function drawStylizedKatonCone(
	g: Graphics,
	origin: ViewportPoint,
	target: ViewportPoint,
	progress: number,
	timeSec: number,
	theme: DragonFlameTheme,
): void {
	g.clear();
	const p = Math.max(0, Math.min(1, progress));
	if (p <= 0.02) return;

	const dx = target.x - origin.x;
	const dy = target.y - origin.y;
	const fullLen = Math.max(60, Math.hypot(dx, dy));
	const ux = dx / fullLen;
	const uy = dy / fullLen;
	const nx = -uy;
	const ny = ux;
	const reach = fullLen * p;

	const drawPlumeBand = (
		startHalfW: number,
		endHalfW: number,
		color: number,
		alpha: number,
		wobbleAmp: number,
		capExtension: number,
	): void => {
		const steps = 10;
		const leftPts: ViewportPoint[] = [];
		const rightPts: ViewportPoint[] = [];

		for (let i = 0; i <= steps; i += 1) {
			const u = i / steps;
			const distAlong = reach * u;
			const flare = Math.pow(u, 2.05);
			const waveA = Math.sin(u * 12 - timeSec * 30) * wobbleAmp * Math.pow(u, 0.85);
			const waveB = Math.cos(u * 19 - timeSec * 42) * wobbleAmp * 0.45 * u;
			const edgeRuffle = Math.sin(u * 15 + timeSec * 24) * wobbleAmp * 0.55 * u;
			const hw = startHalfW + (endHalfW - startHalfW) * flare;
			const cx = origin.x + ux * distAlong + nx * (waveA * 0.55);
			const cy = origin.y + uy * distAlong + ny * (waveA * 0.55);
			leftPts.push({ x: cx + nx * (hw + edgeRuffle + waveB), y: cy + ny * (hw + edgeRuffle + waveB) });
			rightPts.push({ x: cx - nx * (hw - edgeRuffle + waveB * 0.7), y: cy - ny * (hw - edgeRuffle + waveB * 0.7) });
		}

		const tipCx = origin.x + ux * reach;
		const tipCy = origin.y + uy * reach;
		g.moveTo(leftPts[0].x, leftPts[0].y);
		for (let i = 1; i < leftPts.length; i += 1) g.lineTo(leftPts[i].x, leftPts[i].y);
		for (let k = 1; k < 6; k += 1) {
			const a = (k / 6) * Math.PI;
			const lobe = 1 + Math.sin(a * 3 + timeSec * 26) * 0.16;
			const fwd = Math.sin(a) * (endHalfW * 0.88 + capExtension) * lobe;
			const lat = Math.cos(a) * endHalfW * lobe;
			g.lineTo(tipCx + ux * fwd + nx * lat, tipCy + uy * fwd + ny * lat);
		}
		for (let i = rightPts.length - 1; i >= 0; i -= 1) g.lineTo(rightPts[i].x, rightPts[i].y);
		g.closePath();
		g.fill({ color, alpha });
	};

	const headRadius = 42 + p * 40;
	drawPlumeBand(5, headRadius, theme.coneOuter, 0.34, 13, 14);
	drawPlumeBand(3, headRadius * 0.7, theme.coneMid, 0.46, 10, 9);
	drawPlumeBand(1.5, headRadius * 0.36, theme.coneCore, 0.68, 6, 4);
}

interface ConeFlameRibbon {
	readonly sprite: Sprite;
	readonly delay: number;
	readonly life: number;
	readonly lateralRatio: number;
	readonly startScaleX: number;
	readonly endScaleX: number;
	readonly startScaleY: number;
	readonly endScaleY: number;
	readonly wavePhase: number;
}

function spawnConeRibbons(
	container: Container,
	textures: DragonFlameTextures,
	theme: DragonFlameTheme,
	count: number,
	streamWindowSec: number,
	travelSec: number,
	seed: string,
): ConeFlameRibbon[] {
	const random = createEffectRandom(`dragon-breath-ribbons:${seed}`);
	const ribbons: ConeFlameRibbon[] = [];
	for (let i = 0; i < count; i += 1) {
		const sp = new Sprite(textures.flameLick);
		sp.anchor.set(0.5, 0.75);
		sp.tint = theme.celSpriteTint;
		sp.alpha = 0;
		container.addChild(sp);
		ribbons.push({
			sprite: sp,
			delay: (i / count) * streamWindowSec,
			life: travelSec * (0.85 + random.next() * 0.32),
			lateralRatio: (i % 2 === 0 ? 1 : -1) * (0.35 + random.next() * 0.85),
			startScaleX: 0.22,
			endScaleX: 0.65 + random.next() * 0.38,
			startScaleY: 0.42,
			endScaleY: 1.05 + random.next() * 0.52,
			wavePhase: random.next() * Math.PI * 2,
		});
	}
	return ribbons;
}

function stepConeRibbons(
	ribbons: readonly ConeFlameRibbon[],
	origin: ViewportPoint,
	axis: { readonly ux: number; readonly uy: number; readonly nx: number; readonly ny: number; readonly dist: number; readonly angle: number },
	age: number,
): void {
	for (const r of ribbons) {
		const localAge = age - r.delay;
		if (localAge <= 0 || localAge >= r.life) {
			r.sprite.alpha = 0;
			continue;
		}
		const u = localAge / r.life;
		const travel = easeOutQuad(u) * axis.dist;
		const spread = Math.pow(u, 1.55) * 52 * r.lateralRatio + Math.sin(u * 10 + r.wavePhase) * 12 * u;
		r.sprite.position.set(
			origin.x + axis.ux * travel + axis.nx * spread,
			origin.y + axis.uy * travel + axis.ny * spread,
		);
		r.sprite.scale.set(
			r.startScaleX + (r.endScaleX - r.startScaleX) * u,
			r.startScaleY + (r.endScaleY - r.startScaleY) * u,
		);
		r.sprite.rotation = axis.angle + Math.PI / 2 + r.lateralRatio * 0.22 * u;
		const fi = Math.min(1, u / 0.14);
		const fo = u > 0.58 ? Math.max(0, 1 - (u - 0.58) / 0.42) : 1;
		r.sprite.alpha = 0.56 * fi * fo;
	}
}

/**
 * Scene 2: `dragon-fire-breath`
 */
export function playDragonFireBreath(request: FactionVfxSceneRequest): FactionSceneHandle | null {
	const endpoints = resolveArenaEndpoints(request);
	if (!endpoints) return null;

	const reduced = prefersReducedMotion();
	const theme = resolveDragonFlameTheme(request.element);
	const origin = endpoints.sourceArena;
	const target = endpoints.targetArena;
	const dx = target.x - origin.x;
	const dy = target.y - origin.y;
	const dist = Math.max(80, Math.hypot(dx, dy));
	const axis = { ux: dx / dist, uy: dy / dist, nx: -dy / dist, ny: dx / dist, dist, angle: Math.atan2(dy, dx) };

	const streamWindowSec = reduced ? 0.14 : 0.38;
	const travelSec = reduced ? 0.2 : 0.36;
	const impactTimeSec = travelSec * 0.72;
	const durationSec = reduced ? 0.46 : 1.15;

	return runTimedPixiScene({
		sceneId: 'dragon-fire-breath',
		durationSec,
		mount(effect, app) {
			const textures = acquireDragonFlameTextures(app);
			if (!textures) {
				return { onUpdate: () => {} };
			}

			const nozzleGlow = new Sprite(textures.flamePlume);
			nozzleGlow.anchor.set(0.5);
			nozzleGlow.position.set(origin.x, origin.y);
			nozzleGlow.tint = theme.midTint;
			nozzleGlow.blendMode = 'add';
			nozzleGlow.alpha = 0;

			const targetGlow = new Sprite(textures.flamePlume);
			targetGlow.anchor.set(0.5);
			targetGlow.position.set(target.x, target.y);
			targetGlow.tint = theme.midTint;
			targetGlow.blendMode = 'add';
			targetGlow.alpha = 0;

			const impactScorch = new Sprite(textures.scorchRing);
			impactScorch.anchor.set(0.5);
			impactScorch.position.set(target.x, target.y);
			impactScorch.scale.set(0.25);
			impactScorch.alpha = 0;

			const coneGraphics = new Graphics();
			const fireballA = new Sprite(textures.flameVortex);
			fireballA.anchor.set(0.5);
			fireballA.position.set(target.x, target.y);
			fireballA.tint = theme.celSpriteTint;
			fireballA.alpha = 0;

			const fireballB = new Sprite(textures.flameVortex);
			fireballB.anchor.set(0.5);
			fireballB.position.set(target.x, target.y);
			fireballB.tint = theme.celSpriteTint;
			fireballB.rotation = 1.9;
			fireballB.alpha = 0;

			const midWind = new Sprite(textures.windArc);
			midWind.anchor.set(0.5);
			midWind.position.set(origin.x + dx * 0.48, origin.y + dy * 0.48);
			midWind.rotation = axis.angle - 0.6;
			midWind.alpha = 0;

			const blastWindA = new Sprite(textures.windArc);
			blastWindA.anchor.set(0.5);
			blastWindA.position.set(target.x, target.y);
			blastWindA.rotation = axis.angle - 1.1;
			blastWindA.alpha = 0;

			const blastWindB = new Sprite(textures.windArc);
			blastWindB.anchor.set(0.5);
			blastWindB.position.set(target.x, target.y);
			blastWindB.rotation = axis.angle + 1.85;
			blastWindB.alpha = 0;

			effect.addChild(nozzleGlow, targetGlow, impactScorch, coneGraphics);
			const ribbons = spawnConeRibbons(effect, textures, theme, reduced ? 6 : 16, streamWindowSec, travelSec, request.seed);
			effect.addChild(fireballA, fireballB, midWind, blastWindA, blastWindB);

			const sparks = [
				...spawnGoldenSparks(effect, textures, origin.x + dx * 0.35, origin.y + dy * 0.35, reduced ? 4 : 12, `${request.seed}:j`, axis.angle),
				...spawnGoldenSparks(effect, textures, target.x, target.y, reduced ? 5 : 14, `${request.seed}:t`),
			];

			playFactionSfx('fire_impact');
			let impactFired = false;

			const fireImpactBeat = (): void => {
				if (impactFired) return;
				impactFired = true;
				spawnImpactRing(endpoints.targetScreen.x, endpoints.targetScreen.y, theme.palette, 'luminous');
				spawnEmbers(endpoints.targetScreen.x, endpoints.targetScreen.y, reduced ? 6 : 16, theme.palette);
				spawnSparkBurst(endpoints.targetScreen.x, endpoints.targetScreen.y, reduced ? 6 : 14, theme.palette, `${request.seed}:spk`, { x: axis.ux, y: axis.uy });
				if (endpoints.targetEntityId) {
					triggerCardImpactVibration(presentationTargetForEntityId(endpoints.targetEntityId), 'normal', 'normal');
				}
			};

			const stepImpactHead = (age: number, dt: number): void => {
				const impT = Math.min(1, (age - impactTimeSec) / (durationSec - impactTimeSec));
				const eased = easeOutCubic(impT);
				const impFade = impT < 0.2 ? impT / 0.2 : Math.max(0, 1 - (impT - 0.2) / 0.8);

				impactScorch.scale.set(0.36 + eased * 0.82);
				impactScorch.alpha = impFade * 0.72;
				targetGlow.scale.set(1.35 + eased * 1.15);
				targetGlow.alpha = impFade * 0.36;

				fireballA.scale.set(0.45 + eased * 0.82);
				fireballA.rotation += dt * 4.4;
				fireballA.alpha = impFade * 0.58;

				fireballB.scale.set(0.36 + eased * 0.72);
				fireballB.rotation -= dt * 3.5;
				fireballB.alpha = impFade * 0.46;

				blastWindA.scale.set(0.65 + eased * 1.28);
				blastWindA.rotation += dt * 3.2;
				blastWindA.alpha = impFade * 0.42;

				blastWindB.scale.set(0.52 + eased * 1.45);
				blastWindB.rotation -= dt * 2.6;
				blastWindB.alpha = impFade * 0.3;
			};

			return {
				onUpdate({ age, dt, progress }) {
					const extendT = easeOutCubic(Math.min(1, age / travelSec));
					drawStylizedKatonCone(coneGraphics, origin, target, extendT, age, theme);
					coneGraphics.alpha = progress > 0.56 ? Math.max(0, 1 - (progress - 0.56) / 0.44) : 1;

					const nozzleT = Math.min(1, age / (streamWindowSec + 0.24));
					nozzleGlow.alpha = Math.sin(nozzleT * Math.PI) * 0.42;
					nozzleGlow.scale.set(0.8 + Math.sin(nozzleT * Math.PI) * 0.65);

					const midWindT = Math.min(1, progress / 0.65);
					midWind.scale.set(0.42 + easeOutCubic(midWindT) * 1.05);
					midWind.rotation += dt * 3.0;
					midWind.alpha = Math.sin(midWindT * Math.PI) * 0.34;

					stepConeRibbons(ribbons, origin, axis, age);

					if (age >= impactTimeSec) {
						fireImpactBeat();
						stepImpactHead(age, dt);
					}
					stepGoldenSparks(sparks, age);
				},
			};
		},
	});
}

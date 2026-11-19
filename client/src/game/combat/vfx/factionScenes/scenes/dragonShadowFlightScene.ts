/**
 * dragonShadowFlightScene.ts
 *
 * Mythic Dragon 2D silhouette flight scene powered by the shared faction runtime:
 * - Preloaded 8-frame 4x2 wingbeat spritesheet managed by `gpuAssetPool`.
 * - Shared ticker lifecycle via `runTimedPixiScene` (zero standalone ticker overhead).
 * - Continuous tapered fiery air-wake ribbon + sparse golden sparks + card ignition.
 */

import { BlurFilter, Container, Graphics, Sprite } from 'pixi.js';
import { createEffectRandom } from '@/game/effects/core/effectRandom';
import { ARENA_CANVAS_SIZE, type ArenaVfxOwner } from '../../../arenaVfxTargets';
import { triggerArenaShake } from '../../arenaShake';
import { vfxOrchestrationDirector } from '../../vfxOrchestrationDirector';
import {
	spawnEmbers,
	spawnImpactRing,
	spawnSmokePuff,
	triggerEmotionalImpulse,
} from '../../../../animations/PixiParticleCanvas';
import {
	easeOutCubic,
	prefersReducedMotion,
	quadraticBezier,
} from '../../../../animations/pixi/pixiPalettes';
import { clamp, easeInOutQuad } from '../runtime/geometryPrimitives';
import {
	acquireDragonFlameTextures,
	DRAGON_FLIGHT_SPRITESHEET,
	preloadDragonShadowFrames,
} from '../runtime/gpuAssetPool';
import { playFactionSfx, resolveArenaEndpoints } from '../runtime/sceneContext';
import { runTimedPixiScene } from '../runtime/sceneRunner';
import { playDragonFlameIgnition, resolveDragonFlameTheme } from './dragonFlameScene';
import type { FactionSceneHandle, FactionVfxSceneRequest, ViewportPoint } from '../types';

export { DRAGON_FLIGHT_SPRITESHEET };
export const loadDragonShadowFrames = preloadDragonShadowFrames;

export interface DragonFlightPath {
	readonly start: ViewportPoint;
	readonly control: ViewportPoint;
	readonly end: ViewportPoint;
	readonly facingSign: 1 | -1;
}

/**
 * Computes a diagonal flight path in 1920x1080 arena space sweeping across
 * the war table right over the summoned dragon's anchor point.
 */
export function computeDragonFlightPath(
	side: ArenaVfxOwner,
	cardAnchor: ViewportPoint,
): DragonFlightPath {
	const W = ARENA_CANVAS_SIZE.width;
	const H = ARENA_CANVAS_SIZE.height;
	const clampedY = clamp(cardAnchor.y, 240, H - 220);

	if (side === 'player') {
		return {
			start: { x: -260, y: clamp(clampedY + 150, 560, H - 110) },
			control: { x: clamp(cardAnchor.x, 560, W - 560), y: clamp(clampedY - 95, 220, H - 320) },
			end: { x: W + 260, y: clamp(clampedY - 240, 150, 440) },
			facingSign: 1,
		};
	}

	return {
		start: { x: W + 260, y: clamp(clampedY - 140, 140, 460) },
		control: { x: clamp(cardAnchor.x, 560, W - 560), y: clamp(clampedY + 85, 280, H - 260) },
		end: { x: -260, y: clamp(clampedY + 230, 560, H - 140) },
		facingSign: -1,
	};
}

interface WakeTrailPoint {
	readonly x: number;
	readonly y: number;
	age: number;
	readonly maxAge: number;
}

interface WakeEmberSpark {
	readonly sprite: Sprite;
	age: number;
	readonly life: number;
	readonly vx: number;
	readonly vy: number;
	readonly startScale: number;
}

function drawFlightFireWake(
	g: Graphics,
	trail: readonly WakeTrailPoint[],
	timeSec: number,
	outerColor: number,
	midColor: number,
	coreColor: number,
): void {
	g.clear();
	if (trail.length < 3) return;

	const drawRibbonBand = (maxHalfW: number, color: number, maxAlpha: number, wobbleAmp: number): void => {
		const leftPts: ViewportPoint[] = [];
		const rightPts: ViewportPoint[] = [];

		for (let i = 0; i < trail.length; i += 1) {
			const pt = trail[i];
			const lifeRatio = Math.max(0, 1 - pt.age / pt.maxAge);
			const u = i / (trail.length - 1);
			const prev = trail[Math.max(0, i - 1)];
			const next = trail[Math.min(trail.length - 1, i + 1)];
			const dx = next.x - prev.x;
			const dy = next.y - prev.y;
			const len = Math.max(1, Math.hypot(dx, dy));
			const nx = -dy / len;
			const ny = dx / len;

			const hw = maxHalfW * Math.sin(u * Math.PI) * lifeRatio;
			const wave = Math.sin(u * 10 - timeSec * 14) * wobbleAmp * lifeRatio;
			const cx = pt.x + nx * wave;
			const cy = pt.y + ny * wave;
			leftPts.push({ x: cx + nx * hw, y: cy + ny * hw });
			rightPts.push({ x: cx - nx * hw, y: cy - ny * hw });
		}

		g.moveTo(leftPts[0].x, leftPts[0].y);
		for (let i = 1; i < leftPts.length; i += 1) g.lineTo(leftPts[i].x, leftPts[i].y);
		for (let i = rightPts.length - 1; i >= 0; i -= 1) g.lineTo(rightPts[i].x, rightPts[i].y);
		g.closePath();
		g.fill({ color, alpha: maxAlpha });
	};

	drawRibbonBand(36, outerColor, 0.24, 10);
	drawRibbonBand(20, midColor, 0.34, 7);
	drawRibbonBand(8, coreColor, 0.44, 4);
}

function stepWakeTrail(trail: WakeTrailPoint[], dt: number): void {
	for (let i = trail.length - 1; i >= 0; i -= 1) {
		const point = trail[i];
		point.age += dt;
		if (point.age >= point.maxAge) trail.splice(i, 1);
	}
}

function stepWakeSparks(sparks: WakeEmberSpark[], container: Container, dt: number): void {
	for (let i = sparks.length - 1; i >= 0; i -= 1) {
		const ws = sparks[i];
		ws.age += dt;
		if (ws.age >= ws.life) {
			if (ws.sprite.parent === container) container.removeChild(ws.sprite);
			ws.sprite.destroy();
			sparks.splice(i, 1);
			continue;
		}
		const u = ws.age / ws.life;
		ws.sprite.x += ws.vx * dt;
		ws.sprite.y += ws.vy * dt;
		ws.sprite.scale.set(ws.startScale * (1 - easeOutCubic(u) * 0.55));
		const fi = Math.min(1, u / 0.18);
		const fo = u > 0.45 ? Math.max(0, 1 - (u - 0.45) / 0.55) : 1;
		ws.sprite.alpha = 0.82 * fi * fo;
	}
}

/**
 * Scene 3: `dragon-shadow-flight`
 */
export function playDragonShadowFlight(request: FactionVfxSceneRequest): FactionSceneHandle | null {
	const endpoints = resolveArenaEndpoints(request);
	if (!endpoints) return null;

	const theme = resolveDragonFlameTheme(request.element);
	const reduced = prefersReducedMotion();
	const random = createEffectRandom(`dragon-flight:${request.seed}`);
	const flightPath = computeDragonFlightPath(request.side, endpoints.sourceArena);
	const durationSec = reduced ? 0.9 : 2.55;

	let cancelled = false;
	let innerHandle: FactionSceneHandle | null = null;
	let ignitionHandle: FactionSceneHandle | null = null;

	const handle: FactionSceneHandle = {
		sceneId: 'dragon-shadow-flight',
		cancel() {
			cancelled = true;
			ignitionHandle?.cancel();
			ignitionHandle = null;
			innerHandle?.cancel();
			innerHandle = null;
		},
	};

	void preloadDragonShadowFrames().then((frames) => {
		if (cancelled || !frames || frames.length === 0) return;

		innerHandle = runTimedPixiScene({
			sceneId: 'dragon-shadow-flight',
			durationSec,
			mount(effect, app) {
				const flameTextures = acquireDragonFlameTextures(app);

				const eclipseVeil = new Graphics();
				eclipseVeil.rect(0, 0, ARENA_CANVAS_SIZE.width, ARENA_CANVAS_SIZE.height);
				eclipseVeil.fill({ color: 0x05070d, alpha: 1 });
				eclipseVeil.alpha = 0;

				const wakeContainer = new Container();
				const wakeRibbonGraphics = new Graphics();
				wakeContainer.addChild(wakeRibbonGraphics);

				const shadowBlur = new BlurFilter({ strength: 6, quality: 2, kernelSize: 5 });
				const castShadow = new Sprite(frames[0]);
				castShadow.anchor.set(0.5);
				castShadow.tint = 0x05070d;
				castShadow.alpha = 0;
				castShadow.filters = [shadowBlur];

				const underglow = flameTextures ? new Sprite(flameTextures.flamePlume) : null;
				if (underglow) {
					underglow.anchor.set(0.5);
					underglow.tint = theme.midTint;
					underglow.blendMode = 'add';
					underglow.alpha = 0;
				}

				const silhouette = new Sprite(frames[0]);
				silhouette.anchor.set(0.5);
				silhouette.tint = 0x05070d;
				silhouette.alpha = 0;

				effect.addChild(eclipseVeil, wakeContainer, castShadow);
				if (underglow) effect.addChild(underglow);
				effect.addChild(silhouette);

				const wakeTrail: WakeTrailPoint[] = [];
				const wakeSparks: WakeEmberSpark[] = [];
				const ignitionTimeSec = durationSec * 0.44;
				let wakeAccum = 0;
				let sparkAccum = 0;
				let ignitionFired = false;

				vfxOrchestrationDirector.triggerCriticalSpotlight(Math.round(durationSec * 700));
				triggerEmotionalImpulse('climax', 0.65);
				playFactionSfx('norse_horn');

				const spawnWakeSpark = (ax: number, ay: number): void => {
					if (!flameTextures || reduced || wakeSparks.length >= 18) return;
					const sp = new Sprite(flameTextures.emberSpark);
					sp.anchor.set(0.5);
					sp.blendMode = 'add';
					sp.position.set(ax + random.jitter(36), ay + random.jitter(26));
					const startScale = 0.22 + random.next() * 0.34;
					sp.scale.set(startScale);
					sp.alpha = 0;
					wakeContainer.addChild(sp);
					wakeSparks.push({
						sprite: sp,
						age: 0,
						life: 0.45 + random.next() * 0.38,
						vx: -flightPath.facingSign * (20 + random.next() * 50) + random.jitter(22),
						vy: -(24 + random.next() * 44),
						startScale,
					});
				};

				const fireOverheadIgnition = (): void => {
					if (ignitionFired) return;
					ignitionFired = true;
					playFactionSfx('fire_impact');
					triggerArenaShake('mild');
					spawnImpactRing(endpoints.sourceScreen.x, endpoints.sourceScreen.y, theme.palette, 'luminous');
					spawnEmbers(endpoints.sourceScreen.x, endpoints.sourceScreen.y, reduced ? 10 : 28, theme.palette);
					if (!reduced) {
						spawnSmokePuff(endpoints.sourceScreen.x, endpoints.sourceScreen.y, 8, theme.palette, `${request.seed}:flight-smoke`);
					}
					ignitionHandle = playDragonFlameIgnition({
						...request,
						sceneId: 'dragon-flame-ignition',
						seed: `${request.seed}:flight-ignition`,
					});
				};

				return {
					onUpdate({ age, dt, progress: rawT }) {
						const t = rawT * 0.55 + easeInOutQuad(rawT) * 0.45;
						const pos = quadraticBezier(
							flightPath.start.x, flightPath.start.y,
							flightPath.control.x, flightPath.control.y,
							flightPath.end.x, flightPath.end.y,
							t,
						);
						const nextPos = quadraticBezier(
							flightPath.start.x, flightPath.start.y,
							flightPath.control.x, flightPath.control.y,
							flightPath.end.x, flightPath.end.y,
							Math.min(1, t + 0.015),
						);
						const bankAngle = clamp(
							Math.atan2(nextPos.y - pos.y, (nextPos.x - pos.x) * flightPath.facingSign),
							-0.34,
							0.34,
						) * flightPath.facingSign;

						const frameTex = frames[reduced ? 3 : Math.floor(age * DRAGON_FLIGHT_SPRITESHEET.fps) % frames.length];
						silhouette.texture = frameTex;
						castShadow.texture = frameTex;

						const centerProximity = Math.sin(Math.PI * rawT);
						const baseScale = (reduced ? 2.2 : 2.55) + centerProximity * (reduced ? 0.4 : 0.85);
						const wingBobY = reduced ? 0 : Math.sin(age * DRAGON_FLIGHT_SPRITESHEET.fps * (Math.PI / 4)) * 10;
						const envelope = Math.min(1, rawT / 0.1) * (rawT > 0.86 ? Math.max(0, 1 - (rawT - 0.86) / 0.14) : 1);

						eclipseVeil.alpha = centerProximity * (reduced ? 0.12 : 0.2) * envelope;

						castShadow.position.set(pos.x + 56 * flightPath.facingSign, pos.y + 70 + wingBobY * 0.45);
						castShadow.scale.set(flightPath.facingSign * baseScale * 1.14, baseScale * 1.08);
						castShadow.rotation = bankAngle;
						castShadow.alpha = 0.42 * envelope;

						silhouette.position.set(pos.x, pos.y + wingBobY);
						silhouette.scale.set(flightPath.facingSign * baseScale, baseScale);
						silhouette.rotation = bankAngle;
						silhouette.alpha = 0.92 * envelope;

						if (underglow) {
							const fireBoost = Math.max(0, 1 - Math.abs(rawT - 0.48) / 0.34);
							underglow.position.set(pos.x, pos.y + 8 + wingBobY);
							underglow.scale.set(baseScale * 2.15, baseScale * 1.35);
							underglow.alpha = (0.34 + fireBoost * 0.24) * envelope;
						}

						if (!reduced && rawT >= 0.14 && rawT <= 0.82) {
							wakeAccum += dt;
							if (wakeAccum >= 0.032) {
								wakeAccum = 0;
								wakeTrail.push({ x: pos.x - 42 * flightPath.facingSign, y: pos.y + 18 + wingBobY * 0.5, age: 0, maxAge: 0.56 });
								if (wakeTrail.length > 18) wakeTrail.shift();
							}
							sparkAccum += dt;
							if (sparkAccum >= 0.065) {
								sparkAccum = 0;
								spawnWakeSpark(pos.x - 48 * flightPath.facingSign, pos.y + 16);
							}
						}

						stepWakeTrail(wakeTrail, dt);
						drawFlightFireWake(wakeRibbonGraphics, wakeTrail, age, theme.coneOuter, theme.coneMid, theme.coneCore);

						if (age >= ignitionTimeSec) fireOverheadIgnition();
						stepWakeSparks(wakeSparks, wakeContainer, dt);
					},
					onDispose() {
						shadowBlur.destroy();
					},
				};
			},
		});
	});

	return handle;
}

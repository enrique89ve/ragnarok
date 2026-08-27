import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Application, Graphics, Container } from 'pixi.js';
import gsap from 'gsap';
import { debug } from '../config/debugConfig';
import { createEffectRandom } from '@/game/effects/core/effectRandom';
import {
	ARENA_CANVAS_SIZE,
	ARENA_VFX_LAYERS,
	getArenaLocalPoint,
	getArenaVfxLayer,
} from '../combat/arenaVfxTargets';

export interface ParticleColor {
	primary: string;
	secondary: string;
	glow: string;
}

export interface ParticleDirection {
	readonly x: number;
	readonly y: number;
}

export const ELEMENT_PALETTES: Record<string, ParticleColor> = {
	fire:      { primary: '#ff5500', secondary: '#ffd700', glow: 'rgba(255,85,0,0.6)' },
	ice:       { primary: '#00ccff', secondary: '#b3e5fc', glow: 'rgba(0,204,255,0.6)' },
	lightning: { primary: '#ffd700', secondary: '#fff9c4', glow: 'rgba(255,215,0,0.6)' },
	shadow:    { primary: '#7b1fa2', secondary: '#ce93d8', glow: 'rgba(123,31,162,0.6)' },
	nature:    { primary: '#4caf50', secondary: '#a5d6a7', glow: 'rgba(76,175,80,0.6)' },
	neutral:   { primary: '#cd7f32', secondary: '#f0e68c', glow: 'rgba(205,127,50,0.6)' },
};

function hexToNum(hex: string): number {
	return parseInt(hex.replace('#', ''), 16);
}

function pickColor(palette: ParticleColor, next: () => number = Math.random): number {
	return next() > 0.5 ? hexToNum(palette.primary) : hexToNum(palette.secondary);
}

function prefersReducedMotion(): boolean {
	return typeof window !== 'undefined'
		&& typeof window.matchMedia === 'function'
		&& window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function reducedParticleCount(count: number): number {
	return prefersReducedMotion() ? Math.max(1, Math.ceil(count * 0.25)) : count;
}

function motionDuration(seconds: number): number {
	return prefersReducedMotion() ? seconds * 0.25 : seconds;
}

let pixiApp: Application | null = null;
let trailContainer: Container | null = null;
let burstContainer: Container | null = null;
let ambientContainer: Container | null = null;
let filterContainer: Container | null = null;
let emitterContainer: Container | null = null;
let thorContainer: Container | null = null;
let ambientTimers: ReturnType<typeof setTimeout>[] = [];
let currentRealm: string | undefined;

const PARTICLE_CANVAS_MAX_DPR = 1.5;

export function getPixiApp(): Application | null { return pixiApp; }
export function getBurstContainer(): Container | null { return burstContainer; }
export function getFilterContainer(): Container | null { return filterContainer; }
export function getEmitterContainer(): Container | null { return emitterContainer; }
export function getThorContainer(): Container | null { return thorContainer; }

function clearAmbientTimers() {
	currentRealm = undefined;
	ambientTimers.forEach(timer => clearTimeout(timer));
	ambientTimers = [];
}

function toArenaPoint(x: number, y: number): { x: number; y: number } | null {
	const layer = getArenaVfxLayer(ARENA_VFX_LAYERS.vfx);
	return layer ? getArenaLocalPoint({ x, y }, layer) : null;
}

function killContainerTweens(container: Container | null) {
	if (!container) return;

	for (const child of container.children) {
		gsap.killTweensOf(child);
		if (typeof child === 'object' && child !== null && 'scale' in child) {
			const scaleTarget = (child as { scale?: object }).scale;
			if (scaleTarget) gsap.killTweensOf(scaleTarget);
		}
	}
}

function resetPixiGlobals(app: Application) {
	if (pixiApp === app) pixiApp = null;
	trailContainer = null;
	burstContainer = null;
	ambientContainer = null;
	filterContainer = null;
	emitterContainer = null;
	thorContainer = null;
}

interface RealmParticleConfig {
	colors: number[];
	count: number;
	sizeRange: [number, number];
	driftY: number;
	driftX: number;
	lifetime: [number, number];
	opacity: number;
	sway: number;
}

const REALM_CONFIGS: Record<string, RealmParticleConfig> = {
	niflheim:      { colors: [0x88ccff, 0xcceeFF, 0xffffff], count: 25, sizeRange: [1, 3], driftY: 0.5, driftX: 0.3, lifetime: [4, 7], opacity: 0.6, sway: 30 },
	muspelheim:    { colors: [0xff5500, 0xff8800, 0xffcc00], count: 28, sizeRange: [1, 3], driftY: -0.8, driftX: 0.2, lifetime: [3, 6], opacity: 0.7, sway: 20 },
	alfheim:       { colors: [0x88dd55, 0xffee88, 0xaaffaa], count: 20, sizeRange: [1, 3], driftY: 0.2, driftX: 0.1, lifetime: [5, 8], opacity: 0.5, sway: 50 },
	jotunheim:     { colors: [0xddddff, 0xffffff, 0xaaccee], count: 15, sizeRange: [2, 5], driftY: 0.15, driftX: 0.4, lifetime: [6, 10], opacity: 0.4, sway: 60 },
	helheim:       { colors: [0x6622aa, 0x44cc66, 0x884488], count: 20, sizeRange: [1, 4], driftY: -0.3, driftX: 0.5, lifetime: [3, 6], opacity: 0.5, sway: 80 },
	svartalfheim:  { colors: [0xff6600, 0xcc4400, 0xffaa22], count: 15, sizeRange: [1, 2], driftY: -0.6, driftX: 0.3, lifetime: [2, 5], opacity: 0.6, sway: 15 },
	asgard:        { colors: [0xffd700, 0xffee88, 0xffffff], count: 20, sizeRange: [1, 3], driftY: -0.4, driftX: 0.1, lifetime: [4, 7], opacity: 0.5, sway: 25 },
	vanaheim:      { colors: [0x44aa44, 0x88cc44, 0xaadd66], count: 20, sizeRange: [1, 3], driftY: 0.1, driftX: 0.15, lifetime: [5, 8], opacity: 0.45, sway: 60 },
	ginnungagap:   { colors: [0x8888ff, 0xffffff, 0x4466cc], count: 10, sizeRange: [3, 6], driftY: 0.05, driftX: 0.05, lifetime: [8, 12], opacity: 0.3, sway: 100 },
	midgard:       { colors: [0xccbbaa, 0xaa9988, 0xddccbb], count: 10, sizeRange: [1, 2], driftY: 0.05, driftX: 0.05, lifetime: [6, 10], opacity: 0.2, sway: 40 },
};

function spawnAmbientParticle(config: RealmParticleConfig) {
	if (!pixiApp || !ambientContainer) return;

	const w = ARENA_CANVAS_SIZE.width;
	const h = ARENA_CANVAS_SIZE.height;
	const x = Math.random() * w;
	const y = config.driftY < 0 ? h + 20 : (config.driftY > 0.3 ? -20 : Math.random() * h);
	const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
	const color = config.colors[Math.floor(Math.random() * config.colors.length)];
	const life = config.lifetime[0] + Math.random() * (config.lifetime[1] - config.lifetime[0]);

	const g = new Graphics();
	g.circle(0, 0, size);
	g.fill(color);
	g.position.set(x, y);
	g.alpha = 0;
	ambientContainer.addChild(g);

	const swayX = (Math.random() - 0.5) * config.sway;
	const endY = y + config.driftY * h * (life / 5);

	gsap.to(g, {
		alpha: config.opacity,
		duration: life * 0.2,
		ease: 'power1.in',
	});

	gsap.to(g, {
		x: x + swayX + config.driftX * w * 0.3 * (Math.random() - 0.5),
		y: endY,
		duration: life,
		ease: 'none',
		onComplete: () => {
			gsap.to(g, {
				alpha: 0,
				duration: 0.5,
				onComplete: () => {
					ambientContainer?.removeChild(g);
					g.destroy();
				}
			});
		}
	});

	gsap.to(g, {
		alpha: 0,
		duration: life * 0.3,
		delay: life * 0.7,
		ease: 'power1.out',
	});
}

export function startAmbientParticles(realm: string) {
	stopAmbientParticles();
	currentRealm = realm;
	const config = REALM_CONFIGS[realm] || REALM_CONFIGS.midgard;
	const interval = ((config.lifetime[0] + config.lifetime[1]) / 2 * 1000) / config.count;

	for (let i = 0; i < Math.min(config.count, 8); i++) {
		const delay = setTimeout(() => spawnAmbientParticle(config), i * 200);
		ambientTimers.push(delay);
	}

	const loop = () => {
		if (currentRealm !== realm) return;
		spawnAmbientParticle(config);
		const timer = setTimeout(loop, interval + Math.random() * interval * 0.5);
		ambientTimers.push(timer);
	};
	const startTimer = setTimeout(loop, 2000);
	ambientTimers.push(startTimer);
}

export function stopAmbientParticles() {
	clearAmbientTimers();
	if (ambientContainer) {
		killContainerTweens(ambientContainer);
		const children = ambientContainer.removeChildren();
		for (const child of children) {
			child.destroy();
		}
	}
}

export function spawnSlashTrail(
	sx: number, sy: number,
	tx: number, ty: number,
	count: number,
	palette: ParticleColor,
	seed?: string,
	durationMs = 300,
) {
	if (!pixiApp || !trailContainer) return;
	const random = seed ? createEffectRandom(`slash-trail:${seed}`) : null;
	const next = random?.next ?? Math.random;
	const start = toArenaPoint(sx, sy);
	const end = toArenaPoint(tx, ty);
	if (!start || !end) return;
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const len = Math.sqrt(dx * dx + dy * dy);
	const nx = len > 0 ? -dy / len : 0;
	const ny = len > 0 ? dx / len : 0;

	const particleCount = reducedParticleCount(count);
	const travelMs = Math.max(1, durationMs) * (prefersReducedMotion() ? 0.25 : 1);
	for (let i = 0; i < particleCount; i++) {
		const t = i / particleCount;
		const spread = (next() - 0.5) * 30;
		const x = start.x + dx * t + nx * spread;
		const y = start.y + dy * t + ny * spread;
		const r = 2 + next() * 3;

		const g = new Graphics();
		g.circle(0, 0, r);
		g.fill(pickColor(palette, next));
		g.position.set(x, y);
		g.alpha = 0;
		trailContainer.addChild(g);

		gsap.to(g, {
			alpha: 1,
			duration: 0.1,
			delay: (t * travelMs) / 1000,
			onComplete: () => {
				gsap.to(g, {
					alpha: 0,
					duration: motionDuration(0.3),
					ease: 'power2.out',
					onComplete: () => {
						trailContainer?.removeChild(g);
						g.destroy();
					}
				});
				gsap.to(g.scale, {
					x: 0.3,
					y: 0.3,
					duration: motionDuration(0.3),
					ease: 'power2.out',
				});
			}
		});
	}
}

export function spawnParticleBurst(
	cx: number, cy: number,
	count: number,
	palette: ParticleColor,
	seed?: string,
) {
	if (!pixiApp || !burstContainer) return;
	const random = seed ? createEffectRandom(`particle-burst:${seed}`) : null;
	const next = random?.next ?? Math.random;
	const center = toArenaPoint(cx, cy);
	if (!center) return;

	const particleCount = reducedParticleCount(count);
	for (let i = 0; i < particleCount; i++) {
		const angle = (Math.PI * 2 * i) / particleCount + (next() - 0.5) * 0.4;
		const dist = 30 + next() * 90;
		const r = 2 + next() * 6;
		const endX = center.x + Math.cos(angle) * dist;
		const endY = center.y + Math.sin(angle) * dist;

		const g = new Graphics();
		g.circle(0, 0, r);
		g.fill(pickColor(palette, next));
		g.position.set(center.x, center.y);
		g.alpha = 1;
		burstContainer.addChild(g);

		gsap.to(g, {
			x: endX,
			y: endY,
			alpha: 0,
			duration: motionDuration(0.4 + next() * 0.2),
			ease: 'power2.out',
			onComplete: () => {
				burstContainer?.removeChild(g);
				g.destroy();
			}
		});
	}
}

/** Shared primitive name used by combat recipes. */
export const spawnImpactBurst = spawnParticleBurst;

export function spawnDirectionalImpactBurst(
	cx: number,
	cy: number,
	count: number,
	palette: ParticleColor,
	direction: ParticleDirection,
	seed?: string,
) {
	if (!pixiApp || !burstContainer) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;
	const random = seed ? createEffectRandom(`directional-impact:${seed}`) : null;
	const next = random?.next ?? Math.random;
	const particleCount = reducedParticleCount(count);
	const directionalCount = Math.ceil(particleCount * 0.7);
	const baseAngle = Math.atan2(direction.y, direction.x);

	for (let i = 0; i < particleCount; i += 1) {
		const angle = i < directionalCount
			? baseAngle + (next() - 0.5) * (Math.PI * 100 / 180)
			: next() * Math.PI * 2;
		const distance = 30 + next() * 90;
		const r = 2 + next() * 6;
		const g = new Graphics();
		g.circle(0, 0, r);
		g.fill(pickColor(palette, next));
		g.position.set(center.x, center.y);
		g.alpha = 1;
		burstContainer.addChild(g);

		gsap.to(g, {
			x: center.x + Math.cos(angle) * distance,
			y: center.y + Math.sin(angle) * distance,
			alpha: 0,
			duration: motionDuration(0.4 + next() * 0.2),
			ease: 'power2.out',
			onComplete: () => {
				burstContainer?.removeChild(g);
				g.destroy();
			},
		});
	}
}

export function spawnImpactRing(
	cx: number, cy: number,
	palette: ParticleColor
) {
	if (!pixiApp || !burstContainer) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;

	const ring = new Graphics();
	ring.circle(0, 0, 20);
	ring.stroke({ width: 3, color: hexToNum(palette.primary) });
	ring.position.set(center.x, center.y);
	ring.alpha = 0.9;
	ring.scale.set(0.2);
	burstContainer.addChild(ring);

	gsap.to(ring, {
		alpha: 0,
		duration: motionDuration(0.35),
		ease: 'power2.out',
		onComplete: () => {
			burstContainer?.removeChild(ring);
			ring.destroy();
		}
	});
	gsap.to(ring.scale, {
		x: 2.5,
		y: 2.5,
		duration: motionDuration(0.35),
		ease: 'power2.out',
	});
}

export function spawnEmbers(
	cx: number, cy: number,
	count: number,
	palette: ParticleColor
) {
	if (!pixiApp || !burstContainer) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;

	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const dist = 10 + Math.random() * 40;
		const r = 1 + Math.random() * 2;

		const g = new Graphics();
		g.circle(0, 0, r);
		g.fill(hexToNum(palette.secondary));
		g.position.set(center.x + (Math.random() - 0.5) * 20, center.y + (Math.random() - 0.5) * 20);
		g.alpha = 0.8;
		burstContainer.addChild(g);

		gsap.to(g, {
			x: center.x + Math.cos(angle) * dist,
			y: center.y + Math.sin(angle) * dist - 20,
			alpha: 0,
			duration: 0.8 + Math.random() * 0.6,
			delay: 0.3 + Math.random() * 0.3,
			ease: 'power1.out',
			onComplete: () => {
				burstContainer?.removeChild(g);
				g.destroy();
			}
		});
	}
}

export function spawnSmokePuff(
	cx: number,
	cy: number,
	count: number,
	palette: ParticleColor,
	seed?: string,
) {
	if (!pixiApp || !burstContainer) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;
	const random = seed ? createEffectRandom(`smoke-puff:${seed}`) : null;
	const next = random?.next ?? Math.random;

	const particleCount = reducedParticleCount(count);
	for (let i = 0; i < particleCount; i += 1) {
		const size = 10 + next() * 18;
		const startX = center.x + (next() - 0.5) * 24;
		const startY = center.y + (next() - 0.5) * 18;
		const puff = new Graphics();
		puff.circle(0, 0, size);
		puff.fill(i % 2 === 0 ? 0x667085 : hexToNum(palette.secondary));
		puff.position.set(startX, startY);
		puff.alpha = 0.32;
		puff.scale.set(0.35);
		burstContainer.addChild(puff);

		gsap.to(puff, {
			x: startX + (next() - 0.5) * 50,
			y: startY - 24 - next() * 34,
			alpha: 0,
			duration: motionDuration(0.55 + next() * 0.35),
			ease: 'power1.out',
			onComplete: () => {
				burstContainer?.removeChild(puff);
				puff.destroy();
			},
		});
		gsap.to(puff.scale, {
			x: 1.4,
			y: 1.4,
			duration: motionDuration(0.65),
			ease: 'power1.out',
		});
	}
}

export function spawnSparkBurst(
	cx: number,
	cy: number,
	count: number,
	palette: ParticleColor,
	seed?: string,
	direction?: ParticleDirection,
) {
	if (!pixiApp || !burstContainer) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;
	const random = seed ? createEffectRandom(`spark-burst:${seed}`) : null;
	const next = random?.next ?? Math.random;

	const particleCount = reducedParticleCount(count);
	const directionalCount = Math.ceil(particleCount * 0.7);
	const baseAngle = direction ? Math.atan2(direction.y, direction.x) : 0;
	for (let i = 0; i < particleCount; i += 1) {
		const angle = direction && i < directionalCount
			? baseAngle + (next() - 0.5) * (Math.PI * 100 / 180)
			: next() * Math.PI * 2;
		const distance = 22 + next() * 64;
		const spark = new Graphics();
		spark.rect(-1, -5, 2, 10);
		spark.fill(pickColor(palette, next));
		spark.position.set(center.x, center.y);
		spark.rotation = angle;
		burstContainer.addChild(spark);

		gsap.to(spark, {
			x: center.x + Math.cos(angle) * distance,
			y: center.y + Math.sin(angle) * distance,
			alpha: 0,
			duration: motionDuration(0.25 + next() * 0.2),
			ease: 'power2.out',
			onComplete: () => {
				burstContainer?.removeChild(spark);
				spark.destroy();
			},
		});
	}
}

export const PixiParticleCanvas: React.FC<{ realm?: string }> = ({ realm }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null);

	useEffect(() => {
		setPortalTarget(getArenaVfxLayer(ARENA_VFX_LAYERS.vfx));
	}, []);

	useEffect(() => {
		if (!containerRef.current || !portalTarget) return;

		const app = new Application();
		let mounted = true;
		let initialized = false;
		let destroyRequested = false;
		let destroyed = false;

		const destroyApp = () => {
			destroyRequested = true;
			clearAmbientTimers();
			[
				ambientContainer,
				trailContainer,
				filterContainer,
				emitterContainer,
				thorContainer,
				burstContainer,
			].forEach(killContainerTweens);
			resetPixiGlobals(app);
			if (destroyed) return;

			const runtimeApp = app as Application & {
				stage?: Container | null;
				renderer?: unknown;
			};
			if (!initialized || !runtimeApp.stage || !runtimeApp.renderer) return;

			destroyed = true;
			app.destroy(false, { children: true });
		};

		app.init({
			backgroundAlpha: 0,
			width: ARENA_CANVAS_SIZE.width,
			height: ARENA_CANVAS_SIZE.height,
			antialias: true,
			resolution: Math.min(window.devicePixelRatio || 1, PARTICLE_CANVAS_MAX_DPR),
			autoDensity: true,
		}).then(() => {
			initialized = true;
			if (destroyRequested || !mounted || !containerRef.current) {
				destroyApp();
				return;
			}

			containerRef.current.appendChild(app.canvas as HTMLCanvasElement);
			pixiApp = app;

			trailContainer = new Container();
			burstContainer = new Container();
			ambientContainer = new Container();
			filterContainer = new Container();
			emitterContainer = new Container();
			thorContainer = new Container();
			app.stage.addChild(ambientContainer);
			app.stage.addChild(trailContainer);
			app.stage.addChild(filterContainer);
			app.stage.addChild(emitterContainer);
			app.stage.addChild(thorContainer);
			app.stage.addChild(burstContainer);
		}).catch((error: unknown) => {
			if (mounted) {
				debug.warn('[PixiParticleCanvas] Particle renderer disabled:', error);
			}
			destroyApp();
		});

		return () => {
			mounted = false;
			destroyApp();
		};
	}, [portalTarget]);

	useEffect(() => {
		if (realm) {
			startAmbientParticles(realm);
		} else {
			stopAmbientParticles();
		}
	}, [realm]);

	if (!portalTarget) return null;

	const overlay = (
		<div
			ref={containerRef}
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				pointerEvents: 'none',
				zIndex: 2,
			}}
		/>
	);

	return createPortal(overlay, portalTarget);
};

export default PixiParticleCanvas;

import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, type Ticker } from './atlasPixiRuntime';
import {
	sampleCirclePoint,
	type AtlasEffectPreset,
} from './atlasEffects';
import type { MapRealmId } from './types';

interface AtlasAmbientCanvasProps {
	targetRef: React.RefObject<HTMLElement | null>;
	effects: Record<MapRealmId, AtlasEffectPreset>;
	paused?: boolean;
}

interface Particle {
	graphic: Graphics;
	x: number;
	y: number;
	vx: number;
	vy: number;
	swaySeed: number;
	swayAmp: number;
	size: number;
	color: number;
	life: number;
	maxLife: number;
	alphaTarget: number;
}

interface RealmEmitter {
	realmId: MapRealmId;
	preset: AtlasEffectPreset;
	container: Container;
	particles: Particle[];
	spawnAccumulator: number;
}

const MAX_PARTICLES_PER_REALM = 220;
const TARGET_FPS = 60;

function hexToNum(hex: string): number {
	const clean = hex.startsWith('#') ? hex.slice(1) : hex;
	return parseInt(clean, 16);
}

function rand(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

function pickColor(preset: AtlasEffectPreset): number {
	const colors = preset.colors;
	if (!colors || colors.length === 0) return 0xffffff;
	return hexToNum(colors[Math.floor(Math.random() * colors.length)]);
}

interface SpawnContext {
	canvasWidth: number;
	canvasHeight: number;
}

const EDGE_FEATHER = 0.35;

function featherAlpha(point: { x: number; y: number }, cx: number, cy: number, radius: number): number {
	if (radius <= 0) return 0;
	const dx = point.x - cx;
	const dy = point.y - cy;
	const dist = Math.sqrt(dx * dx + dy * dy);
	const normalized = dist / radius;
	if (normalized <= 1 - EDGE_FEATHER) return 1;
	if (normalized >= 1) return 0;
	const t = (normalized - (1 - EDGE_FEATHER)) / EDGE_FEATHER;
	return 1 - t * t;
}

function spawnParticle(emitter: RealmEmitter, ctx: SpawnContext): Particle | null {
	const preset = emitter.preset;
	if (preset.radius <= 0) return null;

	const point = sampleCirclePoint(preset.x, preset.y, preset.radius);
	const feather = featherAlpha(point, preset.x, preset.y, preset.radius);
	if (feather <= 0) return null;

	const baseSizePx = Math.max(0.6, (preset.size / 36) * 1.6);
	const size = baseSizePx * rand(0.55, 1.35);
	const color = pickColor(preset);
	const px = (point.x / 100) * ctx.canvasWidth;
	const py = (point.y / 100) * ctx.canvasHeight;

	const graphic = new Graphics();
	graphic.circle(0, 0, size);
	graphic.fill({ color, alpha: 1 });
	graphic.alpha = 0;
	emitter.container.addChild(graphic);

	const radiusPxY = (preset.radius / 100) * ctx.canvasHeight;
	const particle = makeParticleByType(preset, graphic, px, py, size, color, radiusPxY);
	particle.alphaTarget *= feather;
	return particle;
}

function makeParticleByType(
	preset: AtlasEffectPreset,
	graphic: Graphics,
	px: number,
	py: number,
	size: number,
	color: number,
	radiusPxY: number,
): Particle {
	const speed = (preset.speed / 22) * 0.6;
	const sway = preset.sway / 32;
	const opacity = preset.opacity;

	switch (preset.type) {
		case 'snow':
		case 'petals':
		case 'mist': {
			const jitter = size * 2 + radiusPxY * 0.15 * Math.random();
			return {
				graphic,
				x: px,
				y: py - jitter,
				vx: 0,
				vy: speed * rand(0.6, 1.2),
				swaySeed: Math.random() * Math.PI * 2,
				swayAmp: sway * rand(0.4, 1.4),
				size,
				color,
				life: 0,
				maxLife: rand(4, 8),
				alphaTarget: opacity * rand(0.7, 1.1),
			};
		}
		case 'embers': {
			const jitter = size * 2 + radiusPxY * 0.15 * Math.random();
			return {
				graphic,
				x: px,
				y: py + jitter,
				vx: 0,
				vy: -speed * rand(0.7, 1.4),
				swaySeed: Math.random() * Math.PI * 2,
				swayAmp: sway * rand(0.3, 0.9),
				size,
				color,
				life: 0,
				maxLife: rand(2.5, 5),
				alphaTarget: opacity * rand(0.8, 1.2),
			};
		}
		case 'sparkles':
		default: {
			return {
				graphic,
				x: px,
				y: py,
				vx: rand(-0.04, 0.04),
				vy: rand(-0.04, 0.04),
				swaySeed: Math.random() * Math.PI * 2,
				swayAmp: sway * rand(0.2, 0.8),
				size,
				color,
				life: 0,
				maxLife: rand(3, 6),
				alphaTarget: opacity * rand(0.6, 1.0),
			};
		}
	}
}

function updateParticle(p: Particle, deltaSec: number, time: number, ctx: SpawnContext): boolean {
	p.life += deltaSec;
	if (p.life >= p.maxLife) return false;

	const swayOffset = Math.sin(time * 0.6 + p.swaySeed) * p.swayAmp;
	p.x += p.vx + swayOffset * 0.04;
	p.y += p.vy;

	const fadeIn = Math.min(1, p.life / 0.6);
	const fadeOut = Math.min(1, (p.maxLife - p.life) / 0.8);
	p.graphic.alpha = p.alphaTarget * Math.min(fadeIn, fadeOut);
	p.graphic.x = p.x;
	p.graphic.y = p.y;

	if (p.y > ctx.canvasHeight + p.size * 4) return false;
	if (p.y < -p.size * 4) return false;
	if (p.x < -p.size * 4 || p.x > ctx.canvasWidth + p.size * 4) return false;
	return true;
}

function targetCount(preset: AtlasEffectPreset): number {
	if (preset.type === 'none') return 0;
	const areaScale = Math.max(0.4, Math.min(4, (preset.radius * preset.radius) / 196));
	return Math.min(MAX_PARTICLES_PER_REALM, Math.round(preset.density * areaScale));
}

export default function AtlasAmbientCanvas({ targetRef, effects, paused = false }: AtlasAmbientCanvasProps) {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const appRef = useRef<Application | null>(null);
	const emittersRef = useRef<Map<MapRealmId, RealmEmitter>>(new Map());
	const effectsRef = useRef(effects);
	const pausedRef = useRef(paused);
	const elapsedRef = useRef(0);

	effectsRef.current = effects;
	pausedRef.current = paused;

	useEffect(() => {
		const wrapper = wrapperRef.current;
		const target = targetRef.current;
		if (!wrapper || !target) return;

		const app = new Application();
		let mounted = true;
		let destroyed = false;
		let onTick: ((ticker: Ticker) => void) | null = null;
		let onVisibility: (() => void) | null = null;

		const cleanup = () => {
			if (destroyed) return;
			destroyed = true;
			if (onTick) app.ticker.remove(onTick);
			if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
			emittersRef.current.forEach(emitter => {
				emitter.particles.forEach(p => p.graphic.destroy());
				emitter.container.destroy({ children: true });
			});
			emittersRef.current.clear();
			const runtimeApp = app as Application & { renderer?: unknown; stage?: Container | null };
			if (runtimeApp.renderer && runtimeApp.stage) {
				app.destroy(true, { children: true });
			}
			appRef.current = null;
		};

		const initialRect = target.getBoundingClientRect();

		app.init({
			backgroundAlpha: 0,
			antialias: true,
			autoStart: false,
			resizeTo: target,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
			width: Math.max(1, Math.round(initialRect.width)),
			height: Math.max(1, Math.round(initialRect.height)),
		}).then(() => {
			if (!mounted) {
				cleanup();
				return;
			}
			wrapper.appendChild(app.canvas);
			app.canvas.style.position = 'absolute';
			app.canvas.style.inset = '0';
			app.canvas.style.width = '100%';
			app.canvas.style.height = '100%';
			app.canvas.style.pointerEvents = 'none';
			appRef.current = app;

			rebuildEmitters(app, effectsRef.current, emittersRef.current);

			onTick = (ticker: Ticker) => {
				if (pausedRef.current) return;
				const deltaSec = ticker.deltaMS / 1000;
				elapsedRef.current += deltaSec;
				const ctx: SpawnContext = { canvasWidth: app.renderer.width / app.renderer.resolution, canvasHeight: app.renderer.height / app.renderer.resolution };

				emittersRef.current.forEach(emitter => {
					const target = targetCount(emitter.preset);
					if (target <= 0 && emitter.particles.length === 0) return;

					emitter.particles = emitter.particles.filter(p => {
						const alive = updateParticle(p, deltaSec, elapsedRef.current, ctx);
						if (!alive) {
							emitter.container.removeChild(p.graphic);
							p.graphic.destroy();
						}
						return alive;
					});

					const deficit = target - emitter.particles.length;
					if (deficit > 0) {
						emitter.spawnAccumulator += deltaSec * (emitter.preset.density / 4);
						const toSpawn = Math.min(deficit, Math.floor(emitter.spawnAccumulator));
						emitter.spawnAccumulator -= toSpawn;
						for (let i = 0; i < toSpawn; i++) {
							const p = spawnParticle(emitter, ctx);
							if (p) emitter.particles.push(p);
						}
					}
				});
			};
			app.ticker.add(onTick);

			onVisibility = () => {
				if (document.visibilityState === 'hidden') app.ticker.stop();
				else if (!pausedRef.current) app.ticker.start();
			};
			document.addEventListener('visibilitychange', onVisibility);
			if (!pausedRef.current && document.visibilityState === 'visible') {
				app.ticker.start();
			}
		}).catch((error: unknown) => {
			console.warn('[AtlasAmbientCanvas] Pixi init failed', error);
			cleanup();
		});

		return () => {
			mounted = false;
			cleanup();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const app = appRef.current;
		if (!app) return;
		rebuildEmitters(app, effects, emittersRef.current);
	}, [effects]);

	useEffect(() => {
		const app = appRef.current;
		if (!app) return;
		if (paused) app.ticker.stop();
		else if (document.visibilityState === 'visible') app.ticker.start();
	}, [paused]);

	return <div ref={wrapperRef} className="pointer-events-none absolute inset-0 z-2" aria-hidden="true" />;
}

function rebuildEmitters(
	app: Application,
	effects: Record<MapRealmId, AtlasEffectPreset>,
	emitters: Map<MapRealmId, RealmEmitter>,
) {
	const realmIds = Object.keys(effects) as MapRealmId[];

	realmIds.forEach(realmId => {
		const preset = effects[realmId];
		const existing = emitters.get(realmId);

		if (preset.type === 'none' || preset.radius <= 0) {
			if (existing) {
				existing.particles.forEach(p => p.graphic.destroy());
				existing.container.destroy({ children: true });
				emitters.delete(realmId);
			}
			return;
		}

		if (existing) {
			const anchorChanged = existing.preset.x !== preset.x || existing.preset.y !== preset.y || existing.preset.radius !== preset.radius || existing.preset.type !== preset.type;
			existing.preset = preset;
			if (anchorChanged) {
				existing.particles.forEach(p => {
					existing.container.removeChild(p.graphic);
					p.graphic.destroy();
				});
				existing.particles = [];
				existing.spawnAccumulator = 0;
			}
			return;
		}

		const container = new Container();
		app.stage.addChild(container);
		emitters.set(realmId, {
			realmId,
			preset,
			container,
			particles: [],
			spawnAccumulator: 0,
		});
	});
}

void TARGET_FPS;

import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, type Ticker } from './atlasPixiRuntime';
import { sampleCatmullRom, type AtlasPath, type PathEntityType } from './atlasPaths';

interface AtlasPathCanvasProps {
	targetRef: React.RefObject<HTMLElement | null>;
	paths: readonly AtlasPath[];
	paused?: boolean;
}

interface PathEntity {
	graphic: Graphics;
	phase: number;
	direction: 1 | -1;
	flapPhase: number;
}

interface PathRuntime {
	id: string;
	path: AtlasPath;
	container: Container;
	entities: PathEntity[];
}

function hexToNum(hex?: string): number {
	if (!hex) return 0x000000;
	const clean = hex.startsWith('#') ? hex.slice(1) : hex;
	return parseInt(clean, 16);
}

const RAVEN_BASE = 1.8;
const EAGLE_BASE = 1.6;
const COMET_BASE = 2.2;
const RUNE_BASE = 2.6;

function drawRaven(g: Graphics, scale: number, flapPhase: number, color: number) {
	g.clear();
	const s = scale * RAVEN_BASE;
	const flap = Math.sin(flapPhase);
	const spread = 1 - Math.abs(flap) * 0.35;
	const tipY = 3.8 * s * spread;
	const tipX = -2 * s - flap * 0.5 * s;

	g.moveTo(0.6 * s, -0.4 * s);
	g.quadraticCurveTo(-2 * s, -2.4 * s * spread, tipX, -tipY);
	g.lineTo(tipX + 0.6 * s, -tipY + 0.5 * s);
	g.quadraticCurveTo(-0.4 * s, -1.4 * s * spread, 1.4 * s, -0.3 * s);
	g.closePath();
	g.fill(color);

	g.moveTo(0.6 * s, 0.4 * s);
	g.quadraticCurveTo(-2 * s, 2.4 * s * spread, tipX, tipY);
	g.lineTo(tipX + 0.6 * s, tipY - 0.5 * s);
	g.quadraticCurveTo(-0.4 * s, 1.4 * s * spread, 1.4 * s, 0.3 * s);
	g.closePath();
	g.fill(color);

	g.ellipse(0, 0, 1.8 * s, 0.45 * s);
	g.fill(color);

	g.moveTo(1.6 * s, -0.18 * s);
	g.quadraticCurveTo(2.6 * s, 0, 2.8 * s, 0);
	g.quadraticCurveTo(2.6 * s, 0, 1.6 * s, 0.18 * s);
	g.closePath();
	g.fill(color);

	g.moveTo(-1.8 * s, -0.3 * s);
	g.lineTo(-3.2 * s, -0.45 * s);
	g.lineTo(-2.8 * s, 0);
	g.lineTo(-3.2 * s, 0.45 * s);
	g.lineTo(-1.8 * s, 0.3 * s);
	g.closePath();
	g.fill(color);
}

function drawEagle(g: Graphics, scale: number, flapPhase: number, color: number) {
	g.clear();
	const s = scale * EAGLE_BASE;
	const flap = Math.sin(flapPhase * 0.55);
	const spread = 1 - Math.abs(flap) * 0.22;
	const tipY = 5.6 * s * spread;
	const tipX = -2.4 * s - flap * 0.6 * s;
	const accent = 0xfbcc6a;

	g.moveTo(1 * s, -0.5 * s);
	g.quadraticCurveTo(-2.4 * s, -3.4 * s * spread, tipX, -tipY);
	g.lineTo(tipX + 0.8 * s, -tipY + 0.6 * s);
	g.lineTo(tipX + 1.6 * s, -tipY + 1.2 * s);
	g.lineTo(tipX + 2.2 * s, -tipY + 2 * s);
	g.quadraticCurveTo(-0.6 * s, -1.9 * s * spread, 1.8 * s, -0.4 * s);
	g.closePath();
	g.fill(color);

	g.moveTo(1 * s, 0.5 * s);
	g.quadraticCurveTo(-2.4 * s, 3.4 * s * spread, tipX, tipY);
	g.lineTo(tipX + 0.8 * s, tipY - 0.6 * s);
	g.lineTo(tipX + 1.6 * s, tipY - 1.2 * s);
	g.lineTo(tipX + 2.2 * s, tipY - 2 * s);
	g.quadraticCurveTo(-0.6 * s, 1.9 * s * spread, 1.8 * s, 0.4 * s);
	g.closePath();
	g.fill(color);

	g.ellipse(0, 0, 2.3 * s, 0.55 * s);
	g.fill(color);

	g.circle(1.9 * s, 0, 0.55 * s);
	g.fill({ color, alpha: 0.85 });
	g.circle(2 * s, -0.12 * s, 0.16 * s);
	g.fill({ color: 0x000000, alpha: 0.7 });

	g.moveTo(2.4 * s, -0.25 * s);
	g.quadraticCurveTo(3.6 * s, -0.05 * s, 3.4 * s, 0.18 * s);
	g.lineTo(2.6 * s, 0.22 * s);
	g.closePath();
	g.fill({ color: accent, alpha: 0.95 });

	g.moveTo(-2.2 * s, -0.45 * s);
	g.lineTo(-4 * s, -0.65 * s);
	g.lineTo(-3.8 * s, 0);
	g.lineTo(-4 * s, 0.65 * s);
	g.lineTo(-2.2 * s, 0.45 * s);
	g.closePath();
	g.fill(color);
}

function drawComet(g: Graphics, scale: number, flapPhase: number, color: number) {
	g.clear();
	const s = scale * COMET_BASE;
	const pulse = 0.9 + Math.sin(flapPhase) * 0.1;

	for (let i = 9; i >= 1; i--) {
		const offset = i * 1.3 * s;
		const ratio = 1 - i / 10;
		const segR = s * (0.5 + ratio * 1.3);
		const alpha = ratio ** 1.4 * 0.55;
		const drift = Math.sin(flapPhase + i * 0.6) * 0.25 * s * (1 - ratio);
		g.circle(-offset, drift, segR);
		g.fill({ color, alpha });
	}

	g.circle(0, 0, 3.2 * s * pulse);
	g.fill({ color, alpha: 0.28 });
	g.circle(0, 0, 2 * s * pulse);
	g.fill({ color, alpha: 0.7 });
	g.circle(0, 0, 1.1 * s * pulse);
	g.fill({ color: 0xffffff, alpha: 0.92 });
	g.circle(0, 0, 0.5 * s * pulse);
	g.fill({ color: 0xffffff, alpha: 1 });

	for (let i = 1; i <= 3; i++) {
		const sx = -i * 2.6 * s + Math.sin(flapPhase * 2 + i) * 0.6 * s;
		const sy = Math.sin(flapPhase * 3 + i * 1.7) * (1.4 + i * 0.3) * s;
		g.circle(sx, sy, 0.4 * s);
		g.fill({ color: 0xffffff, alpha: 0.8 - i * 0.2 });
	}
}

function drawRune(g: Graphics, scale: number, flapPhase: number, color: number) {
	g.clear();
	const s = scale * RUNE_BASE;
	const pulse = 0.88 + Math.sin(flapPhase) * 0.12;
	const r = 3 * s * pulse;
	const innerR = r * 0.55;

	g.circle(0, 0, r + 0.6 * s);
	g.fill({ color, alpha: 0.1 });

	g.circle(0, 0, r);
	g.stroke({ color, width: 0.35 * s, alpha: 0.9 });

	g.circle(0, 0, innerR);
	g.stroke({ color, width: 0.22 * s, alpha: 0.6 });

	for (let i = 0; i < 8; i++) {
		const angle = (Math.PI * 2 * i) / 8 + flapPhase * 0.15;
		const x1 = Math.cos(angle) * innerR;
		const y1 = Math.sin(angle) * innerR;
		const x2 = Math.cos(angle) * r;
		const y2 = Math.sin(angle) * r;
		g.moveTo(x1, y1);
		g.lineTo(x2, y2);
	}
	g.stroke({ color, width: 0.25 * s, alpha: 0.85 });

	for (let i = 0; i < 8; i++) {
		const angle = (Math.PI * 2 * i) / 8 + flapPhase * 0.15;
		const ex = Math.cos(angle) * r * 0.85;
		const ey = Math.sin(angle) * r * 0.85;
		const perpAngle = angle + Math.PI / 2;
		const px = Math.cos(perpAngle) * r * 0.2;
		const py = Math.sin(perpAngle) * r * 0.2;
		g.moveTo(ex - px, ey - py);
		g.lineTo(ex + px, ey + py);
	}
	g.stroke({ color, width: 0.2 * s, alpha: 0.7 });

	g.circle(0, 0, 0.7 * s * pulse);
	g.fill({ color: 0xffffff, alpha: 0.95 });
	g.circle(0, 0, 0.3 * s * pulse);
	g.fill({ color: 0xffffff, alpha: 1 });
}

function drawEntity(type: PathEntityType, g: Graphics, scale: number, flapPhase: number, color: number) {
	switch (type) {
		case 'raven':
			drawRaven(g, scale, flapPhase, color);
			return;
		case 'eagle':
			drawEagle(g, scale, flapPhase, color);
			return;
		case 'comet':
			drawComet(g, scale, flapPhase, color);
			return;
		case 'rune':
			drawRune(g, scale, flapPhase, color);
			return;
	}
}

function createEntity(path: AtlasPath, container: Container, phase: number): PathEntity {
	const graphic = new Graphics();
	graphic.alpha = path.opacity;
	container.addChild(graphic);
	return {
		graphic,
		phase,
		direction: 1,
		flapPhase: Math.random() * Math.PI * 2,
	};
}

function rebuildRuntime(path: AtlasPath, app: Application, existing: PathRuntime | undefined): PathRuntime {
	if (existing) {
		existing.entities.forEach(e => {
			existing.container.removeChild(e.graphic);
			e.graphic.destroy();
		});
		existing.entities = [];
		existing.path = path;
		const container = existing.container;
		for (let i = 0; i < path.spawnCount; i++) {
			existing.entities.push(createEntity(path, container, i / path.spawnCount));
		}
		return existing;
	}

	const container = new Container();
	app.stage.addChild(container);
	const entities: PathEntity[] = [];
	for (let i = 0; i < path.spawnCount; i++) {
		entities.push(createEntity(path, container, i / path.spawnCount));
	}
	return { id: path.id, path, container, entities };
}

export default function AtlasPathCanvas({ targetRef, paths, paused = false }: AtlasPathCanvasProps) {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const appRef = useRef<Application | null>(null);
	const runtimesRef = useRef<Map<string, PathRuntime>>(new Map());
	const pathsRef = useRef(paths);
	const pausedRef = useRef(paused);

	pathsRef.current = paths;
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
			runtimesRef.current.forEach(rt => {
				rt.entities.forEach(e => e.graphic.destroy());
				rt.container.destroy({ children: true });
			});
			runtimesRef.current.clear();
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

			syncRuntimes(app, pathsRef.current, runtimesRef.current);

			onTick = (ticker: Ticker) => {
				if (pausedRef.current) return;
				const deltaSec = ticker.deltaMS / 1000;
				const canvasWidth = app.renderer.width / app.renderer.resolution;
				const canvasHeight = app.renderer.height / app.renderer.resolution;

				runtimesRef.current.forEach(rt => {
					const path = rt.path;
					if (path.waypoints.length < 2) return;
					const closed = path.loopMode === 'loop';
					const advance = deltaSec / Math.max(0.5, path.duration);

					rt.entities = rt.entities.filter(entity => {
						entity.flapPhase += deltaSec * 8;
						entity.phase += advance * entity.direction;

						if (path.loopMode === 'pingpong') {
							if (entity.phase >= 1) { entity.phase = 1 - (entity.phase - 1); entity.direction = -1; }
							else if (entity.phase <= 0) { entity.phase = -entity.phase; entity.direction = 1; }
						} else if (path.loopMode === 'loop') {
							if (entity.phase >= 1) entity.phase -= 1;
							else if (entity.phase < 0) entity.phase += 1;
						} else {
							if (entity.phase >= 1) {
								rt.container.removeChild(entity.graphic);
								entity.graphic.destroy();
								return false;
							}
						}

						const sample = sampleCatmullRom(path.waypoints, entity.phase, closed);
						const px = (sample.point.x / 100) * canvasWidth;
						const py = (sample.point.y / 100) * canvasHeight;
						const rotation = Math.atan2(sample.tangent.y, sample.tangent.x);
						entity.graphic.position.set(px, py);
						entity.graphic.rotation = rotation;
						drawEntity(path.entity, entity.graphic, path.scale, entity.flapPhase, hexToNum(path.color));
						entity.graphic.alpha = path.opacity;
						return true;
					});
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
			console.warn('[AtlasPathCanvas] Pixi init failed', error);
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
		syncRuntimes(app, paths, runtimesRef.current);
	}, [paths]);

	useEffect(() => {
		const app = appRef.current;
		if (!app) return;
		if (paused) app.ticker.stop();
		else if (document.visibilityState === 'visible') app.ticker.start();
	}, [paused]);

	return <div ref={wrapperRef} className="pointer-events-none absolute inset-0 z-3" aria-hidden="true" />;
}

function syncRuntimes(app: Application, paths: readonly AtlasPath[], runtimes: Map<string, PathRuntime>) {
	const seen = new Set<string>();
	paths.forEach(path => {
		seen.add(path.id);
		if (path.waypoints.length < 2) return;
		const existing = runtimes.get(path.id);
		const needsRebuild = !existing || existing.path.entity !== path.entity || existing.path.spawnCount !== path.spawnCount;
		if (needsRebuild) {
			const rt = rebuildRuntime(path, app, existing);
			runtimes.set(path.id, rt);
		} else if (existing) {
			existing.path = path;
		}
	});
	runtimes.forEach((rt, id) => {
		if (!seen.has(id)) {
			rt.entities.forEach(e => e.graphic.destroy());
			rt.container.destroy({ children: true });
			runtimes.delete(id);
		}
	});
}

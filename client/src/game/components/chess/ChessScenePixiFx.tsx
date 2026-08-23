import { useEffect, useRef } from 'react';
import { Application, BlurFilter, Container, Graphics, type Ticker } from 'pixi.js';
import { debug } from '../../config/debugConfig';
import {
	createSeededRandom,
	createThorBoltBranches,
	createThorBoltPath,
	getCenteredCoverTransform,
	getAlternatingElementMix,
	type ChessSceneFxPoint,
} from './chessSceneFxModel';

type ChessScenePixiFxProps = Readonly<{
	paused: boolean;
}>;

type FlameVisual = {
	container: Container;
	baseX: number;
	baseY: number;
	phase: number;
	flicker: number;
	baseScale: number;
	lifetime: number;
};

type BrazierGlow = Readonly<{
	graphic: Graphics;
	phase: number;
}>;

type EmberVisual = {
	graphic: Graphics;
	baseX: number;
	baseY: number;
	x: number;
	y: number;
	speed: number;
	drift: number;
	phase: number;
	riseLimit: number;
};

type SnowVisual = {
	graphic: Graphics;
	x: number;
	y: number;
	speed: number;
	drift: number;
	phase: number;
	spin: number;
	depth: number;
};

type RuneVisual = Readonly<{
	container: Container;
	phase: number;
	direction: -1 | 1;
}>;

type LightningVisual = {
	graphic: Graphics;
	fromLeft: boolean;
	interval: number;
	delay: number;
	cycle: number;
};

type SceneRuntime = Readonly<{
	root: Container;
	fireLayer: Container;
	snowLayer: Container;
	brazierGlows: readonly BrazierGlow[];
	flames: readonly FlameVisual[];
	embers: readonly EmberVisual[];
	snowflakes: readonly SnowVisual[];
	runes: readonly RuneVisual[];
	lightning: readonly LightningVisual[];
}>;

const DESIGN_WIDTH = 1680;
const DESIGN_HEIGHT = 945;
const TARGET_FPS = 45;
const FLAME_COUNT = 32;
const EMBER_COUNT = 28;
const SNOWFLAKE_COUNT = 82;
const BRAZIER_ANCHORS = [
	{ x: 112, y: 612, width: 62 },
	{ x: 1568, y: 606, width: 62 },
] as const;

const drawFlame = (graphic: Graphics, width: number, height: number, color: number): void => {
	graphic.moveTo(-width * 0.5, 0);
	graphic.bezierCurveTo(-width * 0.62, -height * 0.3, -width * 0.16, -height * 0.7, 0, -height);
	graphic.bezierCurveTo(width * 0.08, -height * 0.67, width * 0.58, -height * 0.34, width * 0.46, 0);
	graphic.closePath();
	graphic.fill({ color, alpha: 1 });
};

const createFlames = (stage: Container): readonly FlameVisual[] => {
	const random = createSeededRandom(0x42524153);
	return Array.from({ length: FLAME_COUNT }, (_, index) => {
		const anchor = BRAZIER_ANCHORS[index % BRAZIER_ANCHORS.length];
		const container = new Container();
		const height = 15 + random() * 29;
		const width = height * (0.28 + random() * 0.16);
		const outer = new Graphics();
		drawFlame(outer, width, height, random() > 0.7 ? 0xff8a1f : 0xff4b0a);
		const core = new Graphics();
		drawFlame(core, width * 0.48, height * 0.58, 0xffe08a);
		core.position.y = -1;
		container.addChild(outer, core);
		container.blendMode = 'add';
		container.alpha = 0;
		stage.addChild(container);
		const baseX = anchor.x + (random() - 0.5) * anchor.width;
		const baseY = anchor.y + random() * 5;
		container.position.set(baseX, baseY);
		return {
			container,
			baseX,
			baseY,
			phase: random(),
			flicker: 2.4 + random() * 2.8,
			baseScale: 0.72 + random() * 0.48,
			lifetime: 0.72 + random() * 0.72,
		};
	});
};

const createBrazierGlows = (stage: Container): readonly BrazierGlow[] => (
	BRAZIER_ANCHORS.map((anchor, index) => {
		const graphic = new Graphics();
		graphic.ellipse(0, -9, 43, 24).fill({ color: 0xff5a0a, alpha: 0.2 });
		graphic.ellipse(0, -5, 25, 13).fill({ color: 0xffc247, alpha: 0.3 });
		graphic.position.set(anchor.x, anchor.y);
		graphic.blendMode = 'add';
		graphic.filters = [new BlurFilter({ strength: 12, quality: 2, resolution: 0.5 })];
		stage.addChild(graphic);
		return { graphic, phase: index * Math.PI + 0.6 };
	})
);

const createEmbers = (stage: Container): readonly EmberVisual[] => {
	const random = createSeededRandom(0x454d4245);
	return Array.from({ length: EMBER_COUNT }, (_, index) => {
		const anchor = BRAZIER_ANCHORS[index % BRAZIER_ANCHORS.length];
		const graphic = new Graphics();
		const size = 0.9 + random() * 1.25;
		graphic.circle(0, 0, size * 1.7).fill({ color: 0xff5a0a, alpha: 0.24 });
		graphic.circle(0, 0, size).fill({ color: index % 4 === 0 ? 0xfff4b0 : 0xffa126, alpha: 1 });
		graphic.blendMode = 'add';
		stage.addChild(graphic);
		const riseLimit = 24 + random() * 30;
		const y = anchor.y - random() * riseLimit;
		return {
			graphic,
			baseX: anchor.x,
			baseY: anchor.y,
			x: anchor.x + (random() - 0.5) * anchor.width,
			y,
			speed: 12 + random() * 14,
			drift: 3 + random() * 7,
			phase: random() * Math.PI * 2,
			riseLimit,
		};
	});
};

const drawSnowflake = (graphic: Graphics, size: number, detailed: boolean): void => {
	if (!detailed) {
		graphic.circle(0, 0, Math.max(0.65, size * 0.32));
		graphic.fill({ color: 0xf0f9ff, alpha: 1 });
		return;
	}
	for (let arm = 0; arm < 3; arm += 1) {
		const angle = arm * Math.PI / 3;
		const dx = Math.cos(angle) * size;
		const dy = Math.sin(angle) * size;
		graphic.moveTo(-dx, -dy);
		graphic.lineTo(dx, dy);
	}
	graphic.stroke({ color: 0xe0f2fe, width: 0.75, alpha: 0.9, pixelLine: true });
	graphic.circle(0, 0, Math.max(0.55, size * 0.15));
	graphic.fill({ color: 0xffffff, alpha: 0.9 });
};

const createSnowflakes = (stage: Container): readonly SnowVisual[] => {
	const random = createSeededRandom(0x534e4f57);
	return Array.from({ length: SNOWFLAKE_COUNT }, (_, index) => {
		const graphic = new Graphics();
		const depth = 0.35 + random() * 0.65;
		const size = 1.2 + depth * 3.2;
		drawSnowflake(graphic, size, index % 4 === 0);
		graphic.alpha = 0.2 + depth * 0.42;
		stage.addChild(graphic);
		return {
			graphic,
			x: random() * DESIGN_WIDTH,
			y: random() * DESIGN_HEIGHT,
			speed: 13 + depth * 30,
			drift: 9 + depth * 22,
			phase: random() * Math.PI * 2,
			spin: (random() * 2 - 1) * (0.18 + depth * 0.45),
			depth,
		};
	});
};

const tracePath = (graphic: Graphics, points: readonly ChessSceneFxPoint[]): void => {
	const first = points[0];
	if (!first) return;
	graphic.moveTo(first.x * DESIGN_WIDTH, first.y * DESIGN_HEIGHT);
	for (const point of points.slice(1)) graphic.lineTo(point.x * DESIGN_WIDTH, point.y * DESIGN_HEIGHT);
};

const drawLightning = (graphic: Graphics, seed: number, fromLeft: boolean): void => {
	graphic.clear();
	const leader = createThorBoltPath(seed, fromLeft);
	const paths = [leader, ...createThorBoltBranches(seed, fromLeft, leader)];
	for (const path of paths) {
		tracePath(graphic, path);
		graphic.stroke({ color: 0x0284c7, width: 9, alpha: 0.14 });
		tracePath(graphic, path);
		graphic.stroke({ color: 0x38bdf8, width: 3.1, alpha: 0.74 });
		tracePath(graphic, path);
		graphic.stroke({ color: 0xf0f9ff, width: 1.1, alpha: 1, pixelLine: true });
	}
};

const createLightning = (stage: Container): readonly LightningVisual[] => (
	[
		{ fromLeft: true, interval: 6.8, delay: 1.4 },
		{ fromLeft: false, interval: 8.6, delay: 4.7 },
	].map(config => {
		const graphic = new Graphics();
		graphic.blendMode = 'add';
		graphic.alpha = 0;
		stage.addChild(graphic);
		return { graphic, ...config, cycle: -1 };
	})
);

const drawRune = (color: number): Graphics => {
	const graphic = new Graphics();
	graphic.circle(0, 0, 54).stroke({ color, width: 1.3, alpha: 0.34 });
	graphic.circle(0, 0, 43).stroke({ color, width: 0.8, alpha: 0.22 });
	for (let index = 0; index < 8; index += 1) {
		const angle = index * Math.PI / 4;
		graphic.moveTo(Math.cos(angle) * 43, Math.sin(angle) * 43);
		graphic.lineTo(Math.cos(angle) * 52, Math.sin(angle) * 52);
	}
	graphic.stroke({ color, width: 1.1, alpha: 0.42 });
	return graphic;
};

const createRuneVisuals = (stage: Container): readonly RuneVisual[] => (
	[
		{ x: DESIGN_WIDTH * 0.286, y: DESIGN_HEIGHT * 0.36, color: 0xef4444, phase: 0.4, direction: -1 as const },
		{ x: DESIGN_WIDTH * 0.704, y: DESIGN_HEIGHT * 0.731, color: 0x38bdf8, phase: 2.1, direction: 1 as const },
	].map(config => {
		const container = new Container();
		container.position.set(config.x, config.y);
		container.addChild(drawRune(config.color));
		container.blendMode = 'add';
		container.alpha = 0.24;
		stage.addChild(container);
		return { container, phase: config.phase, direction: config.direction };
	})
);

const createSceneRuntime = (stage: Container): SceneRuntime => {
	const root = new Container();
	const fireLayer = new Container();
	const snowLayer = new Container();
	root.eventMode = 'none';
	root.interactiveChildren = false;
	stage.addChild(root);
	fireLayer.blendMode = 'add';
	snowLayer.blendMode = 'screen';
	snowLayer.alpha = 0;
	root.addChild(fireLayer, snowLayer);
	return {
		root,
		fireLayer,
		snowLayer,
		brazierGlows: createBrazierGlows(fireLayer),
		flames: createFlames(fireLayer),
		embers: createEmbers(fireLayer),
		snowflakes: createSnowflakes(snowLayer),
		runes: createRuneVisuals(root),
		lightning: createLightning(root),
	};
};

const updateFlames = (flames: readonly FlameVisual[], elapsed: number): void => {
	for (const flame of flames) {
		const age = (elapsed / flame.lifetime + flame.phase) % 1;
		const envelope = Math.sin(age * Math.PI);
		const flicker = Math.sin(elapsed * flame.flicker + flame.phase * Math.PI * 2);
		const lean = Math.sin(elapsed * 1.35 + flame.phase * Math.PI * 2) * 0.11;
		flame.container.position.set(flame.baseX, flame.baseY);
		flame.container.skew.x = lean;
		flame.container.scale.set(
			flame.baseScale * (0.92 - age * 0.42) * (0.94 + flicker * 0.05),
			flame.baseScale * (0.72 + envelope * 0.48 + flicker * 0.08),
		);
		flame.container.alpha = envelope * (0.48 + (flicker + 1) * 0.13);
	}
};

const updateBrazierGlows = (glows: readonly BrazierGlow[], elapsed: number): void => {
	for (const glow of glows) {
		const pulse = Math.sin(elapsed * 3.2 + glow.phase);
		glow.graphic.alpha = 0.62 + pulse * 0.13;
		glow.graphic.scale.set(0.96 + pulse * 0.035, 0.92 + pulse * 0.06);
	}
};

const updateEmbers = (embers: readonly EmberVisual[], elapsed: number, deltaSeconds: number): void => {
	for (const ember of embers) {
		ember.y -= ember.speed * deltaSeconds;
		if (ember.y < ember.baseY - ember.riseLimit) {
			ember.y = ember.baseY;
			ember.x = ember.baseX + Math.sin(elapsed * 1.7 + ember.phase) * 20;
		}
		const life = (ember.baseY - ember.y) / ember.riseLimit;
		ember.graphic.position.set(
			ember.x + Math.sin(elapsed * 2.1 + ember.phase) * ember.drift * (0.35 + life),
			ember.y,
		);
		ember.graphic.alpha = Math.max(0, Math.sin(life * Math.PI)) * 0.9;
	}
};

const updateSnowflakes = (snowflakes: readonly SnowVisual[], elapsed: number, deltaSeconds: number): void => {
	for (const snowflake of snowflakes) {
		snowflake.y += snowflake.speed * deltaSeconds;
		if (snowflake.y > 710) snowflake.y = -10;
		const wind = Math.sin(elapsed * 0.42) * 14 * snowflake.depth;
		snowflake.graphic.position.set(
			snowflake.x + Math.sin(elapsed * 0.7 + snowflake.phase) * snowflake.drift + wind,
			snowflake.y,
		);
		snowflake.graphic.rotation += snowflake.spin * deltaSeconds;
		snowflake.graphic.alpha = 0.18 + snowflake.depth * 0.38 + (Math.sin(elapsed + snowflake.phase) + 1) * 0.05;
	}
};

const updateLightning = (lightning: readonly LightningVisual[], elapsed: number): void => {
	for (const bolt of lightning) {
		const localTime = elapsed - bolt.delay;
		if (localTime < 0) continue;
		const cycle = Math.floor(localTime / bolt.interval);
		const cycleTime = localTime - cycle * bolt.interval;
		if (cycle !== bolt.cycle) {
			bolt.cycle = cycle;
			drawLightning(bolt.graphic, 0x54484f52 + cycle * 53 + (bolt.fromLeft ? 0 : 977), bolt.fromLeft);
		}
		const firstFlash = cycleTime < 0.11 ? 1 - cycleTime / 0.11 : 0;
		const echoTime = cycleTime - 0.17;
		const echoFlash = echoTime >= 0 && echoTime < 0.08 ? (1 - echoTime / 0.08) * 0.55 : 0;
		bolt.graphic.alpha = Math.max(firstFlash, echoFlash);
	}
};

const updateScene = (runtime: SceneRuntime, ticker: Ticker, elapsed: number): void => {
	const mix = getAlternatingElementMix(elapsed);
	const { fireLayer, snowLayer } = runtime;
	fireLayer.alpha = 0.24 + mix.fire * 0.68;
	snowLayer.alpha = mix.snow * 0.76;
	for (const rune of runtime.runes) {
		rune.container.rotation += rune.direction * ticker.deltaMS * 0.000025;
		rune.container.alpha = 0.18 + (Math.sin(elapsed * 0.9 + rune.phase) + 1) * 0.08;
	}
	updateBrazierGlows(runtime.brazierGlows, elapsed);
	updateFlames(runtime.flames, elapsed);
	updateEmbers(runtime.embers, elapsed, ticker.deltaMS / 1000);
	updateSnowflakes(runtime.snowflakes, elapsed, ticker.deltaMS / 1000);
	updateLightning(runtime.lightning, elapsed);
};

const syncSceneScale = (app: Application, runtime: SceneRuntime): void => {
	const width = app.screen.width;
	const height = app.screen.height;
	const transform = getCenteredCoverTransform(width, height, DESIGN_WIDTH, DESIGN_HEIGHT);
	runtime.root.scale.set(transform.scale);
	runtime.root.position.set(transform.x, transform.y);
};

export default function ChessScenePixiFx({ paused }: ChessScenePixiFxProps) {
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const appRef = useRef<Application | null>(null);
	const pausedRef = useRef(paused);
	pausedRef.current = paused;

	useEffect(() => {
		const wrapper = wrapperRef.current;
		if (!wrapper) return;
		wrapper.replaceChildren();

		const app = new Application();
		let mounted = true;
		let initialized = false;
		let destroyed = false;
		let elapsed = 0;
		let runtime: SceneRuntime | null = null;
		let resizeObserver: ResizeObserver | null = null;
		let onTick: ((ticker: Ticker) => void) | null = null;
		let onVisibility: (() => void) | null = null;

		const cleanup = () => {
			if (onTick) app.ticker.remove(onTick);
			if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
			resizeObserver?.disconnect();
			if (initialized && !destroyed) {
				destroyed = true;
				app.destroy(true, { children: true });
			}
			wrapper.replaceChildren();
			appRef.current = null;
		};

		app.init({
			backgroundAlpha: 0,
			antialias: false,
			autoDensity: true,
			autoStart: false,
			powerPreference: 'high-performance',
			preference: 'webgl',
			resizeTo: wrapper,
			resolution: Math.min(window.devicePixelRatio || 1, 1.5),
		}).then(() => {
			initialized = true;
			if (!mounted) {
				cleanup();
				return;
			}

			wrapper.appendChild(app.canvas);
			wrapper.dataset.state = 'ready';
			app.canvas.className = 'chess-scene-pixi__canvas';
			appRef.current = app;
			runtime = createSceneRuntime(app.stage);
			syncSceneScale(app, runtime);
			app.ticker.maxFPS = TARGET_FPS;

			onTick = (ticker: Ticker) => {
				if (!runtime || pausedRef.current) return;
				elapsed += ticker.deltaMS / 1000;
				updateScene(runtime, ticker, elapsed);
			};
			app.ticker.add(onTick);

			onVisibility = () => {
				if (document.visibilityState === 'hidden' || pausedRef.current) app.ticker.stop();
				else app.ticker.start();
			};
			document.addEventListener('visibilitychange', onVisibility);

			resizeObserver = new ResizeObserver(() => {
				if (!runtime) return;
				syncSceneScale(app, runtime);
				if (pausedRef.current) app.render();
			});
			resizeObserver.observe(wrapper);
			app.render();
			if (!pausedRef.current && document.visibilityState === 'visible') app.ticker.start();
		}).catch((error: unknown) => {
			wrapper.dataset.state = 'failed';
			debug.warn('[ChessScenePixiFx] Pixi initialization failed', error);
			cleanup();
		});

		return () => {
			mounted = false;
			cleanup();
		};
	}, []);

	useEffect(() => {
		const app = appRef.current;
		if (!app) return;
		if (paused || document.visibilityState === 'hidden') {
			app.ticker.stop();
			app.render();
		} else {
			app.ticker.start();
		}
	}, [paused]);

	return <div ref={wrapperRef} className="chess-scene-pixi" data-state="loading" aria-hidden="true" />;
}

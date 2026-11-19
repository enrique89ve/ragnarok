import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
	Application,
	BlurFilter,
	ColorMatrixFilter,
	Container,
	MeshRope,
	Point,
	Sprite,
	type Ticker,
} from 'pixi.js';
import { debug } from '../config/debugConfig';
import { createEffectRandom } from '@/game/effects/core/effectRandom';
import {
	ARENA_CANVAS_SIZE,
	getArenaLocalPoint,
	getArenaVfxCoordinateLayer,
	type QueryRoot,
} from '../combat/arenaVfxTargets';
import { useArenaVfxRoot } from '../combat/arenaVfxContext';
import {
	buildConvolutionalColorMatrix,
	evaluateFrameAtmosphere,
	getEmotionalMoodPreset,
	rgbToHexNumber,
	stepEmotionalAtmosphere,
	type EmotionalAtmosphereParams,
	type EmotionalImpulseKind,
	type EmotionalImpulseState,
} from '../combat/vfx/emotionalAtmosphere';
import { vfxOrchestrationDirector } from '../combat/vfx/vfxOrchestrationDirector';
import {
	ELEMENT_PALETTES,
	REALM_CONFIGS,
	easeInCubic,
	easeOutCubic,
	easeOutQuad,
	hexToNum,
	motionDuration,
	pickColor,
	prefersReducedMotion,
	quadraticBezier,
	reducedParticleCount,
	resolveElementPalette,
	type ParticleColor,
	type ParticleDirection,
	type RealmParticleConfig,
} from './pixi/pixiPalettes';
import {
	createCachedTextures,
	destroyCachedTextures,
	loadNorseVfxArtTextures,
	type CachedTextures,
} from './pixi/pixiTextures';

export { ELEMENT_PALETTES, resolveElementPalette, type ParticleColor, type ParticleDirection };

// =========================================================================
// Unified Ticker Simulation Records (Zero GSAP!)
// =========================================================================

const MAX_ACTIVE_PARTICLES = 420;
const MAX_ACTIVE_RIBBONS = 24;
const RIBBON_SEGMENTS = 18;

interface SimRibbonStrand {
	aura: MeshRope;
	core: MeshRope;
	points: Point[];
	phase: number;
	amp: number;
	waves: number;
	speed: number;
	tint: number;
}

interface SimRibbon {
	strands: SimRibbonStrand[];
	container: Container;
	age: number;
	travelLife: number;
	lingerLife: number;
	sx: number;
	sy: number;
	cx: number;
	cy: number;
	tx: number;
	ty: number;
	nx: number;
	ny: number;
	palette: ParticleColor;
	wispAccumulator: number;
	impactFired: boolean;
	onImpact?: () => void;
}

interface SimParticle {
	sprite: Sprite;
	container: Container;
	age: number;
	delay: number;
	life: number;
	vx: number;
	vy: number;
	drag: number;
	gravity: number;
	startScaleX: number;
	startScaleY: number;
	endScaleX: number;
	endScaleY: number;
	peakAlpha: number;
	fadeInRatio: number;
	spin: number;
	orientToVelocity: boolean;
}

interface SimRing {
	sprite: Sprite;
	container: Container;
	age: number;
	delay: number;
	life: number;
	startScale: number;
	endScale: number;
	/** Optional elliptical squash ratio on local X axis (used by 2D Magic Tunnel rings). */
	scaleXRatio?: number;
	peakAlpha: number;
	spin: number;
	luminous: boolean;
}

interface SimProjectile {
	core: Sprite;
	halo: Sprite;
	container: Container;
	age: number;
	life: number;
	sx: number;
	sy: number;
	cx: number;
	cy: number;
	tx: number;
	ty: number;
	screenTx: number;
	screenTy: number;
	palette: ParticleColor;
	heavy: boolean;
	trailAccumulator: number;
	onImpact?: () => void;
}

interface SimFlash {
	sprite: Sprite;
	container: Container;
	age: number;
	life: number;
	peakAlpha: number;
}

interface AmbientMote {
	sprite: Sprite;
	age: number;
	life: number;
	vx: number;
	vy: number;
	swayAmp: number;
	swayFreq: number;
	baseX: number;
	maxAlpha: number;
}


// =========================================================================
// Module State
// =========================================================================

let pixiApp: Application | null = null;
let textures: CachedTextures | null = null;
let atmosphereContainer: Container | null = null;
let atmosphereHaloSprite: Sprite | null = null;
let atmosphereBlurFilter: BlurFilter | null = null;
let vfxColorMatrixFilter: ColorMatrixFilter | null = null;
let trailContainer: Container | null = null;
let burstContainer: Container | null = null;
let ambientContainer: Container | null = null;
let filterContainer: Container | null = null;
let emitterContainer: Container | null = null;
let factionSceneContainer: Container | null = null;
let thorContainer: Container | null = null;
let currentRealm: string | undefined;
let activeArenaVfxRoot: QueryRoot | null = null;

let currentAtmosphere: EmotionalAtmosphereParams = getEmotionalMoodPreset('calm');
let targetAtmosphere: EmotionalAtmosphereParams = getEmotionalMoodPreset('calm');
let activeEmotionalImpulse: EmotionalImpulseState | null = null;
let atmosphereClockSec = 0;

const simParticles: SimParticle[] = [];
const simRings: SimRing[] = [];
const simProjectiles: SimProjectile[] = [];
const simRibbons: SimRibbon[] = [];
const simFlashes: SimFlash[] = [];
const ambientMotes: AmbientMote[] = [];
let ambientSpawnAccum = 0;

const PARTICLE_CANVAS_MAX_DPR = 1.5;

export function getPixiApp(): Application | null { return pixiApp; }
export function getBurstContainer(): Container | null { return burstContainer; }
export function getFilterContainer(): Container | null { return filterContainer; }
export function getEmitterContainer(): Container | null { return emitterContainer; }
export function getFactionSceneContainer(): Container | null { return factionSceneContainer; }
export function getThorContainer(): Container | null { return thorContainer; }

function toArenaPoint(x: number, y: number): { x: number; y: number } | null {
	const layer = getArenaVfxCoordinateLayer(activeArenaVfxRoot);
	return layer ? getArenaLocalPoint({ x, y }, layer) : null;
}

function removeSprite(sprite: Sprite, container: Container): void {
	if (sprite.parent === container) container.removeChild(sprite);
	sprite.destroy();
}

function destroyRibbon(ribbon: SimRibbon): void {
	for (const strand of ribbon.strands) {
		if (strand.aura.parent === ribbon.container) ribbon.container.removeChild(strand.aura);
		if (strand.core.parent === ribbon.container) ribbon.container.removeChild(strand.core);
		strand.aura.destroy({ children: true, texture: false, textureSource: false });
		strand.core.destroy({ children: true, texture: false, textureSource: false });
	}
}

function clearSimulationArrays(): void {
	for (const p of simParticles) removeSprite(p.sprite, p.container);
	simParticles.length = 0;

	for (const r of simRings) removeSprite(r.sprite, r.container);
	simRings.length = 0;

	for (const proj of simProjectiles) {
		removeSprite(proj.core, proj.container);
		removeSprite(proj.halo, proj.container);
	}
	simProjectiles.length = 0;

	for (const ribbon of simRibbons) destroyRibbon(ribbon);
	simRibbons.length = 0;

	for (const f of simFlashes) removeSprite(f.sprite, f.container);
	simFlashes.length = 0;

	for (const m of ambientMotes) {
		if (ambientContainer && m.sprite.parent === ambientContainer) {
			ambientContainer.removeChild(m.sprite);
		}
		m.sprite.destroy();
	}
	ambientMotes.length = 0;
	ambientSpawnAccum = 0;
}

function resetPixiGlobals(app: Application) {
	clearSimulationArrays();
	destroyCachedTextures(textures);
	textures = null;
	atmosphereBlurFilter?.destroy();
	vfxColorMatrixFilter?.destroy();
	atmosphereBlurFilter = null;
	vfxColorMatrixFilter = null;
	atmosphereContainer = null;
	atmosphereHaloSprite = null;
	currentAtmosphere = getEmotionalMoodPreset('calm');
	targetAtmosphere = getEmotionalMoodPreset('calm');
	activeEmotionalImpulse = null;
	atmosphereClockSec = 0;
	if (pixiApp === app) pixiApp = null;
	trailContainer = null;
	burstContainer = null;
	ambientContainer = null;
	filterContainer = null;
	emitterContainer = null;
	factionSceneContainer = null;
	thorContainer = null;
	activeArenaVfxRoot = null;
	currentRealm = undefined;
}

function pushParticle(p: SimParticle): void {
	if (simParticles.length >= MAX_ACTIVE_PARTICLES) {
		const evicted = simParticles.shift();
		if (evicted) removeSprite(evicted.sprite, evicted.container);
	}
	simParticles.push(p);
}

function spawnInternalGlowMote(
	container: Container,
	x: number,
	y: number,
	color: number,
	radius: number,
	lifeSec: number,
	vx = 0,
	vy = 0,
	peakAlpha = 0.9,
): void {
	if (!textures) return;
	const sprite = new Sprite(textures.softGlow);
	sprite.anchor.set(0.5);
	sprite.position.set(x, y);
	sprite.tint = color;
	sprite.blendMode = 'add';
	sprite.alpha = peakAlpha;
	const startScale = Math.max(0.08, (radius * 2) / 64);
	sprite.scale.set(startScale);
	container.addChild(sprite);
	pushParticle({
		sprite,
		container,
		age: 0,
		delay: 0,
		life: motionDuration(lifeSec),
		vx,
		vy,
		drag: 3.2,
		gravity: 0,
		startScaleX: startScale,
		startScaleY: startScale,
		endScaleX: startScale * 0.18,
		endScaleY: startScale * 0.18,
		peakAlpha,
		fadeInRatio: 0.12,
		spin: 0,
		orientToVelocity: false,
	});
}

function spawnAmbientMote(config: RealmParticleConfig, randomizeY: boolean): void {
	if (!ambientContainer || !textures) return;
	const w = ARENA_CANVAS_SIZE.width;
	const h = ARENA_CANVAS_SIZE.height;
	const baseX = Math.random() * w;
	const y = randomizeY
		? Math.random() * h
		: config.driftY < 0
			? h + 20
			: config.driftY > 15
				? -20
				: Math.random() * h;
	const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
	const color = config.colors[Math.floor(Math.random() * config.colors.length)];
	const life = config.lifetime[0] + Math.random() * (config.lifetime[1] - config.lifetime[0]);

	const sprite = new Sprite(textures.softGlow);
	sprite.anchor.set(0.5);
	sprite.tint = color;
	sprite.blendMode = 'add';
	sprite.position.set(baseX, y);
	sprite.scale.set((size * 3.2) / 64);
	sprite.alpha = 0;
	ambientContainer.addChild(sprite);

	ambientMotes.push({
		sprite,
		age: 0,
		life,
		vx: (Math.random() - 0.5) * config.driftX,
		vy: config.driftY * (0.75 + Math.random() * 0.5),
		swayAmp: (0.4 + Math.random() * 0.6) * config.sway,
		swayFreq: 0.7 + Math.random() * 1.1,
		baseX,
		maxAlpha: config.opacity,
	});
}

// =========================================================================
// PixiJS v8 Unified Ticker Step
// =========================================================================

function stepSimulation(ticker: Ticker): void {
	const dt = Math.min(ticker.deltaMS, 50) / 1000;
	if (dt <= 0) return;

	// 0. Convolutional Psychological Atmosphere (GPU BlurFilter + ColorMatrixFilter)
	atmosphereClockSec += dt;
	const stepped = stepEmotionalAtmosphere(
		currentAtmosphere,
		targetAtmosphere,
		activeEmotionalImpulse,
		dt,
	);
	currentAtmosphere = stepped.state;
	activeEmotionalImpulse = stepped.nextImpulse;
	const reduced = prefersReducedMotion();
	const frameMood = evaluateFrameAtmosphere(
		currentAtmosphere,
		activeEmotionalImpulse,
		atmosphereClockSec,
		reduced,
	);
	if (atmosphereBlurFilter) {
		atmosphereBlurFilter.strength = reduced ? 1.2 : frameMood.blurStrength;
	}
	if (vfxColorMatrixFilter) {
		vfxColorMatrixFilter.matrix = buildConvolutionalColorMatrix(frameMood);
	}
	const tintHex = rgbToHexNumber(frameMood.tintR, frameMood.tintG, frameMood.tintB);
	const targetDuck = vfxOrchestrationDirector.getAmbientDuckFactor();
	if (ambientContainer) {
		ambientContainer.alpha += (targetDuck - ambientContainer.alpha) * (1 - Math.exp(-8 * dt));
	}
	if (atmosphereHaloSprite) {
		const wave = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(atmosphereClockSec * frameMood.pulseHz * Math.PI * 2);
		atmosphereHaloSprite.tint = tintHex;
		atmosphereHaloSprite.alpha = frameMood.edgeAlpha * (0.82 + wave * 0.32) * targetDuck;
	}

	// 1. Particles
	for (let i = simParticles.length - 1; i >= 0; i -= 1) {
		const p = simParticles[i];
		if (p.delay > 0) {
			p.delay -= dt;
			if (p.delay > 0) continue;
		}
		p.age += dt;
		const t = p.age / p.life;
		if (t >= 1) {
			removeSprite(p.sprite, p.container);
			simParticles.splice(i, 1);
			continue;
		}

		const damping = Math.exp(-p.drag * dt);
		p.vx *= damping;
		p.vy = p.vy * damping + p.gravity * dt;
		p.sprite.x += p.vx * dt;
		p.sprite.y += p.vy * dt;

		const eased = easeOutQuad(t);
		p.sprite.scale.set(
			p.startScaleX + (p.endScaleX - p.startScaleX) * eased,
			p.startScaleY + (p.endScaleY - p.startScaleY) * eased,
		);

		if (p.orientToVelocity && (p.vx * p.vx + p.vy * p.vy) > 1) {
			p.sprite.rotation = Math.atan2(p.vy, p.vx);
		} else if (p.spin !== 0) {
			p.sprite.rotation += p.spin * dt;
		}

		if (p.fadeInRatio > 0 && t < p.fadeInRatio) {
			p.sprite.alpha = p.peakAlpha * (t / p.fadeInRatio);
		} else {
			const fadeT = (t - p.fadeInRatio) / Math.max(0.01, 1 - p.fadeInRatio);
			p.sprite.alpha = p.peakAlpha * (1 - fadeT * fadeT);
		}
	}

	// 2. Expanding Shockwave & Rune Rings
	for (let i = simRings.length - 1; i >= 0; i -= 1) {
		const r = simRings[i];
		if (r.delay > 0) {
			r.delay -= dt;
			if (r.delay > 0) continue;
		}
		r.age += dt;
		const t = r.age / r.life;
		if (t >= 1) {
			removeSprite(r.sprite, r.container);
			simRings.splice(i, 1);
			continue;
		}
		const scaleT = r.luminous ? easeOutCubic(t) : easeOutQuad(t);
		const s = r.startScale + (r.endScale - r.startScale) * scaleT;
		if (r.scaleXRatio !== undefined) {
			r.sprite.scale.set(s * r.scaleXRatio, s);
		} else {
			r.sprite.scale.set(s);
		}
		if (r.spin !== 0) r.sprite.rotation += r.spin * dt;
		r.sprite.alpha = r.peakAlpha * (1 - easeOutQuad(t));
	}

	// 3. Curved Bezier Projectiles (LoR-style commit acceleration)
	for (let i = simProjectiles.length - 1; i >= 0; i -= 1) {
		const proj = simProjectiles[i];
		proj.age += dt;
		const rawT = Math.min(1, proj.age / proj.life);
		// Slight ease-in acceleration into the impact frame
		const travelT = rawT < 0.7
			? rawT * 0.85
			: 0.595 + easeInCubic((rawT - 0.7) / 0.3) * 0.405;

		const pos = quadraticBezier(proj.sx, proj.sy, proj.cx, proj.cy, proj.tx, proj.ty, travelT);
		proj.core.position.set(pos.x, pos.y);
		proj.halo.position.set(pos.x, pos.y);

		const pulse = 1 + Math.sin(rawT * Math.PI) * 0.35;
		const baseCoreScale = proj.heavy ? 1.1 : 0.72;
		proj.core.scale.set(baseCoreScale * pulse);
		proj.halo.scale.set(baseCoreScale * 1.9 * pulse);
		proj.halo.rotation += 4.2 * dt;

		// Emit smooth glowing trail motes along the Bezier curve
		proj.trailAccumulator += dt;
		const emitStep = proj.heavy ? 0.014 : 0.022;
		while (proj.trailAccumulator >= emitStep && rawT < 0.96) {
			proj.trailAccumulator -= emitStep;
			const jitter = proj.heavy ? 12 : 7;
			spawnInternalGlowMote(
				proj.container,
				pos.x + (Math.random() - 0.5) * jitter,
				pos.y + (Math.random() - 0.5) * jitter,
				pickColor(proj.palette),
				proj.heavy ? 16 : 11,
				proj.heavy ? 0.36 : 0.28,
				(Math.random() - 0.5) * 45,
				(Math.random() - 0.5) * 45,
				0.78,
			);
		}

		if (rawT >= 1) {
			const { screenTx, screenTy, palette, heavy, onImpact } = proj;
			removeSprite(proj.core, proj.container);
			removeSprite(proj.halo, proj.container);
			simProjectiles.splice(i, 1);

			spawnImpactRing(screenTx, screenTy, palette, 'luminous');
			if (heavy) {
				spawnStarburstBloom(screenTx, screenTy, palette, 1.55, 420);
				spawnDiamondShards(screenTx, screenTy, 14, palette);
				spawnSparkBurst(screenTx, screenTy, 18, palette);
				spawnParticleBurst(screenTx, screenTy, 22, palette);
				spawnEmbers(screenTx, screenTy, 10, palette);
				spawnArenaFlash(palette.primary, 0.24, 240);
			}
			onImpact?.();
		}
	}

	// 3.5 Translucent Braided Energy Ribbons (PixiJS v8 MeshRope — LoR-style)
	for (let i = simRibbons.length - 1; i >= 0; i -= 1) {
		const r = simRibbons[i];
		r.age += dt;
		const totalLife = r.travelLife + r.lingerLife;
		if (r.age >= totalLife) {
			if (!r.impactFired) {
				r.impactFired = true;
				r.onImpact?.();
			}
			destroyRibbon(r);
			simRibbons.splice(i, 1);
			continue;
		}

		const travelRaw = Math.min(1, r.age / r.travelLife);
		// LoR commit acceleration during travel, then hold head at 1.0 during translucent linger
		const headT = travelRaw < 0.72
			? travelRaw * 0.86
			: 0.6192 + easeInCubic((travelRaw - 0.72) / 0.28) * 0.3808;

		if (travelRaw >= 1 && !r.impactFired) {
			r.impactFired = true;
			r.onImpact?.();
		}

		const lingerT = r.age > r.travelLife
			? Math.min(1, (r.age - r.travelLife) / Math.max(0.04, r.lingerLife))
			: 0;

		// Tail lags smoothly behind head during flight, then peels forward into target during linger
		const tailT = r.age <= r.travelLife
			? Math.max(0, headT - 0.88)
			: Math.min(0.96, easeOutQuad(lingerT) * 0.94);

		// LoR signature layered dissipation: white-hot core fades out FIRST,
		// leaving the wider translucent colored silk mist to thin out gracefully.
		const auraAlpha = r.age <= r.travelLife
			? Math.min(0.84, 0.28 + travelRaw * 0.62)
			: 0.84 * (1 - easeOutQuad(lingerT));
		const coreAlpha = r.age <= r.travelLife
			? Math.min(0.96, 0.4 + travelRaw * 0.6)
			: 0.96 * Math.pow(1 - lingerT, 2.2);

		const span = Math.max(0.001, headT - tailT);
		const segCount = RIBBON_SEGMENTS - 1;

		for (const strand of r.strands) {
			for (let s = 0; s < RIBBON_SEGMENTS; s += 1) {
				const localU = s / segCount;
				const curveU = tailT + localU * span;
				const base = quadraticBezier(r.sx, r.sy, r.cx, r.cy, r.tx, r.ty, curveU);
				// Pin both endpoints (curveU=0 & curveU=1) while braiding smoothly mid-arc
				const pin = Math.sin(Math.PI * curveU);
				const wave = Math.sin(curveU * Math.PI * strand.waves + strand.phase - r.age * strand.speed)
					* strand.amp * pin;
				strand.points[s].x = base.x + r.nx * wave;
				strand.points[s].y = base.y + r.ny * wave;
			}
			strand.aura.alpha = auraAlpha;
			strand.core.alpha = coreAlpha;
		}

		// Shed tiny translucent wisps & diamond glints along the leading ribbon head
		if (!prefersReducedMotion() && r.age <= r.travelLife * 1.15) {
			r.wispAccumulator += dt;
			while (r.wispAccumulator >= 0.026) {
				r.wispAccumulator -= 0.026;
				const headPos = quadraticBezier(r.sx, r.sy, r.cx, r.cy, r.tx, r.ty, Math.min(1, headT));
				spawnInternalGlowMote(
					r.container,
					headPos.x + (Math.random() - 0.5) * 18,
					headPos.y + (Math.random() - 0.5) * 18,
					pickColor(r.palette),
					9 + Math.random() * 7,
					0.34 + Math.random() * 0.16,
					(Math.random() - 0.5) * 55,
					(Math.random() - 0.5) * 55,
					0.68,
				);
			}
		}
	}

	// 4. Bounded Arena Flashes
	for (let i = simFlashes.length - 1; i >= 0; i -= 1) {
		const f = simFlashes[i];
		f.age += dt;
		const t = f.age / f.life;
		if (t >= 1) {
			removeSprite(f.sprite, f.container);
			simFlashes.splice(i, 1);
			continue;
		}
		f.sprite.alpha = t < 0.18
			? f.peakAlpha * (t / 0.18)
			: f.peakAlpha * (1 - easeOutQuad((t - 0.18) / 0.82));
	}

	// 5. Ambient Realm Motes
	if (currentRealm && ambientContainer && !prefersReducedMotion()) {
		const config = REALM_CONFIGS[currentRealm] || REALM_CONFIGS.midgard;
		const avgLife = (config.lifetime[0] + config.lifetime[1]) * 0.5;
		const spawnEvery = Math.max(0.18, avgLife / Math.max(1, config.count));
		ambientSpawnAccum += dt;
		if (ambientSpawnAccum >= spawnEvery && ambientMotes.length < config.count) {
			ambientSpawnAccum = 0;
			spawnAmbientMote(config, false);
		}
	}

	for (let i = ambientMotes.length - 1; i >= 0; i -= 1) {
		const m = ambientMotes[i];
		m.age += dt;
		const t = m.age / m.life;
		if (t >= 1) {
			if (ambientContainer && m.sprite.parent === ambientContainer) {
				ambientContainer.removeChild(m.sprite);
			}
			m.sprite.destroy();
			ambientMotes.splice(i, 1);
			continue;
		}
		m.baseX += m.vx * dt;
		m.sprite.x = m.baseX + Math.sin(m.age * m.swayFreq) * m.swayAmp;
		m.sprite.y += m.vy * dt;
		if (t < 0.2) {
			m.sprite.alpha = m.maxAlpha * (t / 0.2);
		} else if (t > 0.72) {
			m.sprite.alpha = m.maxAlpha * Math.max(0, 1 - (t - 0.72) / 0.28);
		} else {
			m.sprite.alpha = m.maxAlpha;
		}
	}
}

// =========================================================================
// Public 2D VFX Primitives (PixiJS v8, Zero GSAP)
// =========================================================================

export function startAmbientParticles(realm: string) {
	stopAmbientParticles();
	currentRealm = realm;
	if (prefersReducedMotion()) return;
	const config = REALM_CONFIGS[realm] || REALM_CONFIGS.midgard;
	const initialCount = Math.min(config.count, 10);
	for (let i = 0; i < initialCount; i += 1) {
		spawnAmbientMote(config, true);
	}
}

export function stopAmbientParticles() {
	currentRealm = undefined;
	ambientSpawnAccum = 0;
	for (const m of ambientMotes) {
		if (ambientContainer && m.sprite.parent === ambientContainer) {
			ambientContainer.removeChild(m.sprite);
		}
		m.sprite.destroy();
	}
	ambientMotes.length = 0;
}

export function spawnArenaFlash(
	colorHex: string,
	peakAlpha = 0.22,
	durationMs = 220,
): void {
	if (!pixiApp || !burstContainer || !textures) return;
	if (prefersReducedMotion()) return;

	const sprite = new Sprite(textures.arenaVignette);
	sprite.anchor.set(0.5);
	sprite.position.set(ARENA_CANVAS_SIZE.width / 2, ARENA_CANVAS_SIZE.height / 2);
	sprite.width = ARENA_CANVAS_SIZE.width * 1.15;
	sprite.height = ARENA_CANVAS_SIZE.height * 1.15;
	sprite.tint = hexToNum(colorHex);
	sprite.blendMode = 'add';
	sprite.alpha = 0;
	burstContainer.addChild(sprite);

	simFlashes.push({
		sprite,
		container: burstContainer,
		age: 0,
		life: motionDuration(durationMs / 1000),
		peakAlpha: Math.min(0.42, Math.max(0.05, peakAlpha)),
	});
}

export function spawnRunePulse(
	cx: number,
	cy: number,
	palette: ParticleColor,
	durationMs = 420,
	targetScale = 1.45,
): void {
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;

	const sprite = new Sprite(textures.runeSigil);
	sprite.anchor.set(0.5);
	sprite.position.set(center.x, center.y);
	sprite.tint = hexToNum(palette.primary);
	sprite.blendMode = 'add';
	const runeNorm = 128 / Math.max(128, textures.runeSigil.width);
	sprite.scale.set(0.35 * runeNorm);
	sprite.alpha = 0.92;
	burstContainer.addChild(sprite);

	simRings.push({
		sprite,
		container: burstContainer,
		age: 0,
		delay: 0,
		life: motionDuration(durationMs / 1000),
		startScale: 0.35 * runeNorm,
		endScale: targetScale * runeNorm,
		peakAlpha: 0.92,
		spin: 1.6,
		luminous: true,
	});
}

export function spawnSlashTrail(
	sx: number, sy: number,
	tx: number, ty: number,
	count: number,
	palette: ParticleColor,
	seed?: string,
	durationMs = 300,
) {
	if (!pixiApp || !trailContainer || !textures) return;
	const random = seed ? createEffectRandom(`slash-trail:${seed}`) : null;
	const next = random?.next ?? Math.random;
	const start = toArenaPoint(sx, sy);
	const end = toArenaPoint(tx, ty);
	if (!start || !end) return;

	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const len = Math.hypot(dx, dy);
	const nx = len > 0 ? -dy / len : 0;
	const ny = len > 0 ? dx / len : 0;
	// Subtle organic arc rather than a rigid straight line
	const curveOffset = Math.min(85, len * 0.14) * (next() > 0.5 ? 1 : -1);
	const ctrlX = (start.x + end.x) * 0.5 + nx * curveOffset;
	const ctrlY = (start.y + end.y) * 0.5 + ny * curveOffset;

	const particleCount = reducedParticleCount(count);
	const travelSec = motionDuration(Math.max(0.08, durationMs / 1000));
	const baseAngle = Math.atan2(dy, dx);

	for (let i = 0; i < particleCount; i += 1) {
		const t = particleCount > 1 ? i / (particleCount - 1) : 0.5;
		const pos = quadraticBezier(start.x, start.y, ctrlX, ctrlY, end.x, end.y, t);
		const spread = (next() - 0.5) * 22;
		const isLance = i % 3 === 0;
		const sprite = new Sprite(isLance ? textures.spark : textures.softGlow);
		sprite.anchor.set(0.5);
		sprite.position.set(pos.x + nx * spread, pos.y + ny * spread);
		sprite.tint = i % 4 === 0 ? 0xffffff : pickColor(palette, next);
		sprite.blendMode = 'add';
		sprite.alpha = 0;
		sprite.rotation = baseAngle + (next() - 0.5) * 0.25;

		const scale = isLance ? 0.55 + next() * 0.5 : 0.22 + next() * 0.28;
		sprite.scale.set(scale);
		trailContainer.addChild(sprite);

		pushParticle({
			sprite,
			container: trailContainer,
			age: 0,
			delay: t * travelSec * 0.85,
			life: motionDuration(0.28 + next() * 0.14),
			vx: (dx / Math.max(1, len)) * (40 + next() * 60) + nx * (next() - 0.5) * 35,
			vy: (dy / Math.max(1, len)) * (40 + next() * 60) + ny * (next() - 0.5) * 35,
			drag: 4.5,
			gravity: 0,
			startScaleX: scale,
			startScaleY: scale,
			endScaleX: scale * 0.2,
			endScaleY: scale * 0.2,
			peakAlpha: isLance ? 0.95 : 0.85,
			fadeInRatio: 0.16,
			spin: 0,
			orientToVelocity: isLance,
		});
	}
}

export function spawnParticleBurst(
	cx: number, cy: number,
	count: number,
	palette: ParticleColor,
	seed?: string,
) {
	if (!pixiApp || !burstContainer || !textures) return;
	const random = seed ? createEffectRandom(`particle-burst:${seed}`) : null;
	const next = random?.next ?? Math.random;
	const center = toArenaPoint(cx, cy);
	if (!center) return;

	const particleCount = reducedParticleCount(count);
	for (let i = 0; i < particleCount; i += 1) {
		const angle = (Math.PI * 2 * i) / particleCount + (next() - 0.5) * 0.45;
		const speed = 130 + next() * 270;
		const scale = 0.2 + next() * 0.42;

		const sprite = new Sprite(textures.softGlow);
		sprite.anchor.set(0.5);
		sprite.position.set(center.x, center.y);
		sprite.tint = i % 5 === 0 ? 0xffffff : pickColor(palette, next);
		sprite.blendMode = 'add';
		sprite.scale.set(scale);
		sprite.alpha = 0.95;
		burstContainer.addChild(sprite);

		pushParticle({
			sprite,
			container: burstContainer,
			age: 0,
			delay: 0,
			life: motionDuration(0.36 + next() * 0.22),
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			drag: 4.2,
			gravity: 0,
			startScaleX: scale,
			startScaleY: scale,
			endScaleX: scale * 0.15,
			endScaleY: scale * 0.15,
			peakAlpha: 0.95,
			fadeInRatio: 0.08,
			spin: 0,
			orientToVelocity: false,
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
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;
	const random = seed ? createEffectRandom(`directional-impact:${seed}`) : null;
	const next = random?.next ?? Math.random;
	const particleCount = reducedParticleCount(count);
	const directionalCount = Math.ceil(particleCount * 0.72);
	const baseAngle = Math.atan2(direction.y, direction.x);

	for (let i = 0; i < particleCount; i += 1) {
		const angle = i < directionalCount
			? baseAngle + (next() - 0.5) * (Math.PI * 100 / 180)
			: next() * Math.PI * 2;
		const speed = 150 + next() * 310;
		const scale = 0.22 + next() * 0.44;

		const sprite = new Sprite(textures.softGlow);
		sprite.anchor.set(0.5);
		sprite.position.set(center.x, center.y);
		sprite.tint = i % 5 === 0 ? 0xffffff : pickColor(palette, next);
		sprite.blendMode = 'add';
		sprite.scale.set(scale);
		sprite.alpha = 0.96;
		burstContainer.addChild(sprite);

		pushParticle({
			sprite,
			container: burstContainer,
			age: 0,
			delay: 0,
			life: motionDuration(0.36 + next() * 0.22),
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			drag: 4.4,
			gravity: 0,
			startScaleX: scale,
			startScaleY: scale,
			endScaleX: scale * 0.16,
			endScaleY: scale * 0.16,
			peakAlpha: 0.96,
			fadeInRatio: 0.06,
			spin: 0,
			orientToVelocity: false,
		});
	}
}

export type ImpactRingVariant = 'standard' | 'luminous';

export function spawnImpactRing(
	cx: number, cy: number,
	palette: ParticleColor,
	variant: ImpactRingVariant = 'standard',
) {
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;

	const luminous = variant === 'luminous';
	const lifeSec = motionDuration(luminous ? 0.48 : 0.34);

	if (luminous) {
		const bloom = new Sprite(textures.softGlow);
		bloom.anchor.set(0.5);
		bloom.position.set(center.x, center.y);
		bloom.tint = hexToNum(palette.primary);
		bloom.blendMode = 'add';
		bloom.scale.set(0.45);
		bloom.alpha = 0.82;
		burstContainer.addChild(bloom);

		simRings.push({
			sprite: bloom,
			container: burstContainer,
			age: 0,
			delay: 0,
			life: lifeSec,
			startScale: 0.45,
			endScale: 3.6,
			peakAlpha: 0.82,
			spin: 0,
			luminous: true,
		});
	}

	const ringSprite = new Sprite(textures.ring);
	ringSprite.anchor.set(0.5);
	ringSprite.position.set(center.x, center.y);
	ringSprite.tint = hexToNum(palette.primary);
	ringSprite.blendMode = 'add';
	ringSprite.scale.set(0.2);
	ringSprite.alpha = luminous ? 1 : 0.9;
	burstContainer.addChild(ringSprite);

	simRings.push({
		sprite: ringSprite,
		container: burstContainer,
		age: 0,
		delay: 0,
		life: lifeSec,
		startScale: 0.2,
		endScale: luminous ? 2.4 : 1.5,
		peakAlpha: luminous ? 1 : 0.9,
		spin: 0,
		luminous,
	});
}

/** Bright energy orb glides along a curved Bezier path from source to target. */
export function spawnTravelingGlowRing(
	sx: number,
	sy: number,
	tx: number,
	ty: number,
	palette: ParticleColor,
	durationMs = 360,
	onImpact?: () => void,
) {
	if (!pixiApp || !trailContainer || !textures) {
		onImpact?.();
		return;
	}
	const start = toArenaPoint(sx, sy);
	const end = toArenaPoint(tx, ty);
	if (!start || !end) {
		onImpact?.();
		return;
	}

	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const len = Math.hypot(dx, dy);
	const nx = len > 0 ? -dy / len : 0;
	const ny = len > 0 ? dx / len : 0;
	const arc = Math.min(110, Math.max(24, len * 0.18)) * (dx >= 0 ? 1 : -1);

	const halo = new Sprite(textures.ring);
	halo.anchor.set(0.5);
	halo.position.set(start.x, start.y);
	halo.tint = hexToNum(palette.primary);
	halo.blendMode = 'add';
	halo.alpha = 0.92;
	trailContainer.addChild(halo);

	const core = new Sprite(textures.softGlow);
	core.anchor.set(0.5);
	core.position.set(start.x, start.y);
	core.tint = 0xffffff;
	core.blendMode = 'add';
	core.alpha = 0.98;
	trailContainer.addChild(core);

	simProjectiles.push({
		core,
		halo,
		container: trailContainer,
		age: 0,
		life: motionDuration(Math.max(0.08, durationMs / 1000)),
		sx: start.x,
		sy: start.y,
		cx: (start.x + end.x) * 0.5 + nx * arc,
		cy: (start.y + end.y) * 0.5 + ny * arc,
		tx: end.x,
		ty: end.y,
		screenTx: tx,
		screenTy: ty,
		palette,
		heavy: false,
		trailAccumulator: 0,
		onImpact,
	});
}

/** High-energy LoR-style curved Showdown strike rendered 100% in PixiJS 2D. */
export function spawnShowdownBlast(
	sx: number,
	sy: number,
	tx: number,
	ty: number,
	palette: ParticleColor,
	options: {
		travelMs?: number;
		heavy?: boolean;
		onImpact?: () => void;
	} = {},
): void {
	const travelMs = options.travelMs ?? 380;
	const heavy = options.heavy ?? true;
	if (!pixiApp || !trailContainer || !textures) {
		options.onImpact?.();
		return;
	}
	const start = toArenaPoint(sx, sy);
	const end = toArenaPoint(tx, ty);
	if (!start || !end) {
		options.onImpact?.();
		return;
	}

	const dx = end.x - start.x;
	const dy = end.y - start.y;

	// Anticipation rune flare at the caster + braided translucent energy ribbon
	spawnRunePulse(sx, sy, palette, 380, heavy ? 1.75 : 1.35);
	spawnTranslucentRibbon(sx, sy, tx, ty, palette, {
		strands: heavy ? 3 : 2,
		durationMs: travelMs,
		lingerMs: heavy ? 460 : 340,
		arcSign: dx >= 0 ? 1 : -1,
	});
	const len = Math.hypot(dx, dy);
	const nx = len > 0 ? -dy / len : 0;
	const ny = len > 0 ? dx / len : 0;
	const arc = Math.min(140, Math.max(40, len * 0.22));

	const halo = new Sprite(textures.runeSigil);
	halo.anchor.set(0.5);
	halo.position.set(start.x, start.y);
	halo.tint = hexToNum(palette.primary);
	halo.blendMode = 'add';
	halo.alpha = 0.96;
	trailContainer.addChild(halo);

	const core = new Sprite(textures.softGlow);
	core.anchor.set(0.5);
	core.position.set(start.x, start.y);
	core.tint = 0xffffff;
	core.blendMode = 'add';
	core.alpha = 1;
	trailContainer.addChild(core);

	simProjectiles.push({
		core,
		halo,
		container: trailContainer,
		age: 0,
		life: motionDuration(Math.max(0.1, travelMs / 1000)),
		sx: start.x,
		sy: start.y,
		cx: (start.x + end.x) * 0.5 + nx * arc,
		cy: (start.y + end.y) * 0.5 + ny * arc,
		tx: end.x,
		ty: end.y,
		screenTx: tx,
		screenTy: ty,
		palette,
		heavy,
		trailAccumulator: 0,
		onImpact: options.onImpact,
	});
}

export function spawnPokerTravelTrail(
	sx: number,
	sy: number,
	tx: number,
	ty: number,
	palette: ParticleColor,
	seed?: string,
	durationMs = 360,
) {
	spawnSlashTrail(sx, sy, tx, ty, 16, palette, seed, durationMs);
}

export function spawnEmbers(
	cx: number, cy: number,
	count: number,
	palette: ParticleColor
) {
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;

	const particleCount = reducedParticleCount(count);
	for (let i = 0; i < particleCount; i += 1) {
		const angle = Math.random() * Math.PI * 2;
		const speed = 25 + Math.random() * 75;
		const scale = 0.14 + Math.random() * 0.2;

		const sprite = new Sprite(textures.softGlow);
		sprite.anchor.set(0.5);
		sprite.position.set(
			center.x + (Math.random() - 0.5) * 28,
			center.y + (Math.random() - 0.5) * 24,
		);
		sprite.tint = hexToNum(palette.secondary);
		sprite.blendMode = 'add';
		sprite.scale.set(scale);
		sprite.alpha = 0;
		burstContainer.addChild(sprite);

		pushParticle({
			sprite,
			container: burstContainer,
			age: 0,
			delay: 0.12 + Math.random() * 0.22,
			life: motionDuration(0.7 + Math.random() * 0.55),
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed - 35,
			drag: 1.6,
			gravity: -35,
			startScaleX: scale,
			startScaleY: scale,
			endScaleX: scale * 0.2,
			endScaleY: scale * 0.2,
			peakAlpha: 0.85,
			fadeInRatio: 0.18,
			spin: 0,
			orientToVelocity: false,
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
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;
	const random = seed ? createEffectRandom(`smoke-puff:${seed}`) : null;
	const next = random?.next ?? Math.random;

	const particleCount = reducedParticleCount(count);
	for (let i = 0; i < particleCount; i += 1) {
		const startScale = 0.4 + next() * 0.45;
		const sprite = new Sprite(textures.smoke);
		sprite.anchor.set(0.5);
		sprite.position.set(
			center.x + (next() - 0.5) * 28,
			center.y + (next() - 0.5) * 22,
		);
		sprite.tint = i % 2 === 0 ? 0x667085 : hexToNum(palette.secondary);
		sprite.blendMode = 'normal';
		sprite.scale.set(startScale);
		sprite.alpha = 0.36;
		burstContainer.addChild(sprite);

		pushParticle({
			sprite,
			container: burstContainer,
			age: 0,
			delay: 0,
			life: motionDuration(0.55 + next() * 0.35),
			vx: (next() - 0.5) * 75,
			vy: -45 - next() * 55,
			drag: 2.2,
			gravity: -12,
			startScaleX: startScale,
			startScaleY: startScale,
			endScaleX: startScale * 2.1,
			endScaleY: startScale * 2.1,
			peakAlpha: 0.36,
			fadeInRatio: 0.14,
			spin: (next() - 0.5) * 1.2,
			orientToVelocity: false,
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
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;
	const random = seed ? createEffectRandom(`spark-burst:${seed}`) : null;
	const next = random?.next ?? Math.random;

	const particleCount = reducedParticleCount(count);
	const directionalCount = Math.ceil(particleCount * 0.72);
	const baseAngle = direction ? Math.atan2(direction.y, direction.x) : 0;

	for (let i = 0; i < particleCount; i += 1) {
		const angle = direction && i < directionalCount
			? baseAngle + (next() - 0.5) * (Math.PI * 100 / 180)
			: next() * Math.PI * 2;
		const speed = 210 + next() * 360;
		const scaleX = 0.45 + next() * 0.55;
		const scaleY = 0.35 + next() * 0.3;

		const sprite = new Sprite(textures.spark);
		sprite.anchor.set(0.5);
		sprite.position.set(center.x, center.y);
		sprite.tint = i % 3 === 0 ? 0xffffff : pickColor(palette, next);
		sprite.blendMode = 'add';
		sprite.rotation = angle;
		sprite.scale.set(scaleX, scaleY);
		sprite.alpha = 1;
		burstContainer.addChild(sprite);

		pushParticle({
			sprite,
			container: burstContainer,
			age: 0,
			delay: 0,
			life: motionDuration(0.24 + next() * 0.18),
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			drag: 5.2,
			gravity: 60,
			startScaleX: scaleX,
			startScaleY: scaleY,
			endScaleX: scaleX * 0.25,
			endScaleY: scaleY * 0.18,
			peakAlpha: 1,
			fadeInRatio: 0.05,
			spin: 0,
			orientToVelocity: true,
		});
	}
}

/**
 * Beneficial / restorative rising motes + soft rune halo (heal, buff, ward, +STA).
 * Explicitly non-aggressive: smooth upward float with additive luminosity.
 */
export function spawnRisingAura(
	cx: number,
	cy: number,
	count: number,
	palette: ParticleColor,
	seed?: string,
) {
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;
	const random = seed ? createEffectRandom(`rising-aura:${seed}`) : null;
	const next = random?.next ?? Math.random;

	spawnImpactRing(cx, cy, palette, 'luminous');

	const particleCount = reducedParticleCount(count);
	for (let i = 0; i < particleCount; i += 1) {
		const offsetX = (next() - 0.5) * 68;
		const offsetY = (next() - 0.5) * 32 + 12;
		const scale = 0.18 + next() * 0.28;

		const sprite = new Sprite(textures.softGlow);
		sprite.anchor.set(0.5);
		sprite.position.set(center.x + offsetX, center.y + offsetY);
		sprite.tint = i % 4 === 0 ? 0xffffff : pickColor(palette, next);
		sprite.blendMode = 'add';
		sprite.scale.set(scale);
		sprite.alpha = 0;
		burstContainer.addChild(sprite);

		pushParticle({
			sprite,
			container: burstContainer,
			age: 0,
			delay: next() * 0.16,
			life: motionDuration(0.55 + next() * 0.3),
			vx: (next() - 0.5) * 28,
			vy: -(85 + next() * 95),
			drag: 1.4,
			gravity: -25,
			startScaleX: scale,
			startScaleY: scale,
			endScaleX: scale * 0.25,
			endScaleY: scale * 0.25,
			peakAlpha: 0.92,
			fadeInRatio: 0.2,
			spin: 0,
			orientToVelocity: false,
		});
	}
}

/**
 * Tight directional vertical stream anchored to a resource bar (stamina rail):
 * directionY = 1 drains downward (penalty/curse), -1 surges upward (recovery).
 */
export function spawnDrainStream(
	cx: number,
	cy: number,
	count: number,
	palette: ParticleColor,
	directionY: 1 | -1 = 1,
	seed?: string,
) {
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;
	const random = seed ? createEffectRandom(`drain-stream:${seed}`) : null;
	const next = random?.next ?? Math.random;

	const particleCount = reducedParticleCount(count);
	for (let i = 0; i < particleCount; i += 1) {
		const sprite = new Sprite(textures.spark);
		sprite.anchor.set(0.5);
		sprite.position.set(
			center.x + (next() - 0.5) * 22,
			center.y + (next() - 0.5) * 42,
		);
		sprite.tint = i % 3 === 0 ? 0xffffff : pickColor(palette, next);
		sprite.blendMode = 'add';
		const scaleX = 0.36 + next() * 0.34;
		const scaleY = 0.28 + next() * 0.22;
		sprite.scale.set(scaleX, scaleY);
		sprite.alpha = 0;
		burstContainer.addChild(sprite);

		pushParticle({
			sprite,
			container: burstContainer,
			age: 0,
			delay: next() * 0.12,
			life: motionDuration(0.36 + next() * 0.2),
			vx: (next() - 0.5) * 32,
			vy: directionY * (140 + next() * 140),
			drag: 2.6,
			gravity: directionY * 40,
			startScaleX: scaleX,
			startScaleY: scaleY,
			endScaleX: scaleX * 0.22,
			endScaleY: scaleY * 0.18,
			peakAlpha: 0.96,
			fadeInRatio: 0.12,
			spin: 0,
			orientToVelocity: true,
		});
	}
}

/**
 * Bidirectional crossed Bezier arcs (e.g. Hole Swap between player & opponent hole cards).
 */
export function spawnBidirectionalSwapArcs(
	ax: number,
	ay: number,
	bx: number,
	by: number,
	palette: ParticleColor,
	durationMs = 420,
) {
	if (!pixiApp || !trailContainer || !textures) return;
	const a = toArenaPoint(ax, ay);
	const b = toArenaPoint(bx, by);
	if (!a || !b) return;

	spawnRunePulse(ax, ay, palette, 380, 1.25);
	spawnRunePulse(bx, by, palette, 380, 1.25);

	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const len = Math.hypot(dx, dy);
	const nx = len > 0 ? -dy / len : 0;
	const ny = len > 0 ? dx / len : 0;
	const arc = Math.min(130, Math.max(48, len * 0.24));
	const life = motionDuration(Math.max(0.12, durationMs / 1000));

	const launchOne = (
		sx: number,
		sy: number,
		tx: number,
		ty: number,
		screenTx: number,
		screenTy: number,
		curveSign: 1 | -1,
	) => {
		if (!trailContainer || !textures) return;
		const halo = new Sprite(textures.ring);
		halo.anchor.set(0.5);
		halo.position.set(sx, sy);
		halo.tint = hexToNum(palette.primary);
		halo.blendMode = 'add';
		halo.alpha = 0.92;
		trailContainer.addChild(halo);

		const core = new Sprite(textures.softGlow);
		core.anchor.set(0.5);
		core.position.set(sx, sy);
		core.tint = 0xffffff;
		core.blendMode = 'add';
		core.alpha = 0.98;
		trailContainer.addChild(core);

		simProjectiles.push({
			core,
			halo,
			container: trailContainer,
			age: 0,
			life,
			sx,
			sy,
			cx: (sx + tx) * 0.5 + nx * arc * curveSign,
			cy: (sy + ty) * 0.5 + ny * arc * curveSign,
			tx,
			ty,
			screenTx,
			screenTy,
			palette,
			heavy: false,
			trailAccumulator: 0,
		});
	};

	launchOne(a.x, a.y, b.x, b.y, bx, by, 1);
	launchOne(b.x, b.y, a.x, a.y, ax, ay, -1);
	spawnTranslucentRibbon(ax, ay, bx, by, palette, { strands: 2, durationMs, lingerMs: 360, arcSign: 1 });
	spawnTranslucentRibbon(bx, by, ax, ay, palette, { strands: 2, durationMs, lingerMs: 360, arcSign: -1 });
}

export interface TranslucentRibbonOptions {
	/** Number of braided strands (1..3, default 2). */
	strands?: number;
	/** Travel time from source to target in ms (default 340). */
	durationMs?: number;
	/** Translucent linger/peel time after arrival in ms (default 380). */
	lingerMs?: number;
	/** Arc bow direction (+1 or -1; defaults to automatic sweep). */
	arcSign?: 1 | -1;
	/** Curve bend factor relative to distance (default 0.2). */
	arcFactor?: number;
	/** Callback fired at exact head arrival on target. */
	onImpact?: () => void;
}

/**
 * LoR-inspired translucent braided energy ribbons rendered with PixiJS v8 `MeshRope`.
 * Multiple additive strands weave along a Bezier arc from source to target,
 * shedding glowing wisps while the white-hot core fades ahead of the colored silk aura.
 */
export function spawnTranslucentRibbon(
	sx: number,
	sy: number,
	tx: number,
	ty: number,
	palette: ParticleColor,
	options: TranslucentRibbonOptions = {},
): void {
	const travelMs = options.durationMs ?? 340;
	const lingerMs = options.lingerMs ?? 380;
	if (!pixiApp || !trailContainer || !textures) {
		options.onImpact?.();
		return;
	}
	const start = toArenaPoint(sx, sy);
	const end = toArenaPoint(tx, ty);
	if (!start || !end) {
		options.onImpact?.();
		return;
	}

	if (simRibbons.length >= MAX_ACTIVE_RIBBONS) {
		const evicted = simRibbons.shift();
		if (evicted) destroyRibbon(evicted);
	}

	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const len = Math.hypot(dx, dy);
	const nx = len > 0 ? -dy / len : 0;
	const ny = len > 0 ? dx / len : -1;
	const arcSign = options.arcSign ?? (dx >= 0 ? 1 : -1);
	const arcMag = Math.min(165, Math.max(36, len * (options.arcFactor ?? 0.2))) * arcSign;
	const cx = (start.x + end.x) * 0.5 + nx * arcMag;
	const cy = (start.y + end.y) * 0.5 + ny * arcMag;

	const requestedStrands = prefersReducedMotion() ? 1 : Math.min(3, Math.max(1, options.strands ?? 2));
	const primaryTint = hexToNum(palette.primary);
	const secondaryTint = hexToNum(palette.secondary);
	const strands: SimRibbonStrand[] = [];

	for (let s = 0; s < requestedStrands; s += 1) {
		const points: Point[] = [];
		for (let i = 0; i < RIBBON_SEGMENTS; i += 1) {
			points.push(new Point(start.x, start.y));
		}
		const tint = s % 2 === 0 ? primaryTint : secondaryTint;
		const aura = new MeshRope({
			texture: textures.ribbonAura,
			points,
			textureScale: 0,
		});
		aura.tint = tint;
		aura.blendMode = 'add';
		aura.alpha = 0.35;
		trailContainer.addChild(aura);

		const core = new MeshRope({
			texture: textures.ribbonCore,
			points,
			textureScale: 0,
		});
		core.tint = s === 0 ? 0xffffff : secondaryTint;
		core.blendMode = 'add';
		core.alpha = 0.45;
		trailContainer.addChild(core);

		strands.push({
			aura,
			core,
			points,
			phase: (Math.PI * 2 * s) / requestedStrands,
			amp: requestedStrands === 1 ? 10 : 14 + s * 8,
			waves: 2 + s * 0.65,
			speed: 8.5 + s * 2.2,
			tint,
		});
	}

	simRibbons.push({
		strands,
		container: trailContainer,
		age: 0,
		travelLife: motionDuration(Math.max(0.09, travelMs / 1000)),
		lingerLife: motionDuration(Math.max(0.12, lingerMs / 1000)),
		sx: start.x,
		sy: start.y,
		cx,
		cy,
		tx: end.x,
		ty: end.y,
		nx,
		ny,
		palette,
		wispAccumulator: 0,
		impactFired: false,
		onImpact: options.onImpact,
	});
}

/**
 * High-speed chromatic crescent blade slash (LoR diagonal melee/strike smear).
 */
export function spawnChromaticSlash(
	cx: number,
	cy: number,
	direction: ParticleDirection,
	palette: ParticleColor,
	scale = 1,
): void {
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;

	const angle = Math.atan2(direction.y, direction.x) - Math.PI * 0.12;
	const life = motionDuration(0.24);
	const slashNorm = 256 / Math.max(256, textures.slashArc.width);
	const s = scale * slashNorm;

	// Outer colored translucent smear slightly offset for chromatic depth
	const outer = new Sprite(textures.slashArc);
	outer.anchor.set(0.5);
	outer.position.set(center.x - direction.x * 10, center.y - direction.y * 10);
	outer.rotation = angle;
	outer.tint = hexToNum(palette.primary);
	outer.blendMode = 'add';
	outer.scale.set(0.55 * s, 0.72 * s);
	outer.alpha = 0.88;
	burstContainer.addChild(outer);

	pushParticle({
		sprite: outer,
		container: burstContainer,
		age: 0,
		delay: 0,
		life,
		vx: direction.x * 140,
		vy: direction.y * 140,
		drag: 6,
		gravity: 0,
		startScaleX: 0.55 * s,
		startScaleY: 0.72 * s,
		endScaleX: 1.28 * s,
		endScaleY: 0.34 * s,
		peakAlpha: 0.88,
		fadeInRatio: 0.14,
		spin: 0.55,
		orientToVelocity: false,
	});

	// Razor-hot white-tinted inner blade core
	const inner = new Sprite(textures.slashArc);
	inner.anchor.set(0.5);
	inner.position.set(center.x, center.y);
	inner.rotation = angle;
	inner.tint = 0xffffff;
	inner.blendMode = 'add';
	inner.scale.set(0.42 * s, 0.44 * s);
	inner.alpha = 0.98;
	burstContainer.addChild(inner);

	pushParticle({
		sprite: inner,
		container: burstContainer,
		age: 0,
		delay: 0,
		life: life * 0.75,
		vx: direction.x * 165,
		vy: direction.y * 165,
		drag: 6.5,
		gravity: 0,
		startScaleX: 0.42 * s,
		startScaleY: 0.44 * s,
		endScaleX: 1.08 * s,
		endScaleY: 0.18 * s,
		peakAlpha: 0.98,
		fadeInRatio: 0.1,
		spin: 0.55,
		orientToVelocity: false,
	});
}

/**
 * Celestial 4-point starburst lens-flare bloom (heavy hits, spells, battlecries, showdown).
 */
export function spawnStarburstBloom(
	cx: number,
	cy: number,
	palette: ParticleColor,
	scale = 1.25,
	durationMs = 360,
): void {
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;
	const life = motionDuration(durationMs / 1000);

	const outer = new Sprite(textures.starburst);
	outer.anchor.set(0.5);
	outer.position.set(center.x, center.y);
	outer.tint = hexToNum(palette.primary);
	outer.blendMode = 'add';
	outer.scale.set(0.35 * scale);
	outer.alpha = 0.92;
	burstContainer.addChild(outer);

	simRings.push({
		sprite: outer,
		container: burstContainer,
		age: 0,
		delay: 0,
		life,
		startScale: 0.35 * scale,
		endScale: 1.65 * scale,
		peakAlpha: 0.92,
		spin: 0.85,
		luminous: true,
	});

	const core = new Sprite(textures.starburst);
	core.anchor.set(0.5);
	core.position.set(center.x, center.y);
	core.rotation = Math.PI / 4;
	core.tint = 0xffffff;
	core.blendMode = 'add';
	core.scale.set(0.24 * scale);
	core.alpha = 0.98;
	burstContainer.addChild(core);

	simRings.push({
		sprite: core,
		container: burstContainer,
		age: 0,
		delay: 0,
		life: life * 0.72,
		startScale: 0.24 * scale,
		endScale: 1.1 * scale,
		peakAlpha: 0.98,
		spin: -1.1,
		luminous: true,
	});
}

/**
 * Crisp faceted diamond shards bursting outward on magic/heavy impacts (LoR 0:36).
 */
export function spawnDiamondShards(
	cx: number,
	cy: number,
	count: number,
	palette: ParticleColor,
	direction?: ParticleDirection,
	seed?: string,
): void {
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;
	const random = seed ? createEffectRandom(`diamond-shards:${seed}`) : null;
	const next = random?.next ?? Math.random;
	const shardCount = reducedParticleCount(count);
	const baseAngle = direction ? Math.atan2(direction.y, direction.x) : 0;

	for (let i = 0; i < shardCount; i += 1) {
		const angle = direction
			? baseAngle + (next() - 0.5) * Math.PI * 0.95
			: (Math.PI * 2 * i) / shardCount + (next() - 0.5) * 0.4;
		const speed = 160 + next() * 290;
		const scale = 0.35 + next() * 0.55;

		const sprite = new Sprite(textures.diamond);
		sprite.anchor.set(0.5);
		sprite.position.set(center.x, center.y);
		sprite.tint = i % 3 === 0 ? 0xffffff : pickColor(palette, next);
		sprite.blendMode = 'add';
		sprite.scale.set(scale);
		sprite.rotation = angle + Math.PI / 2;
		sprite.alpha = 0.96;
		burstContainer.addChild(sprite);

		pushParticle({
			sprite,
			container: burstContainer,
			age: 0,
			delay: 0,
			life: motionDuration(0.32 + next() * 0.2),
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			drag: 3.8,
			gravity: 60,
			startScaleX: scale,
			startScaleY: scale * 1.25,
			endScaleX: scale * 0.14,
			endScaleY: scale * 0.14,
			peakAlpha: 0.96,
			fadeInRatio: 0.06,
			spin: (next() - 0.5) * 6,
			orientToVelocity: false,
		});
	}
}

/**
 * Iridescent cyan-magenta translucent shield dome (LoR SpellShield / Ward barrier).
 */
export function spawnShieldDome(
	cx: number,
	cy: number,
	palette: ParticleColor = { primary: '#38bdf8', secondary: '#e879f9', glow: 'rgba(56,189,248,0.65)' },
	durationMs = 520,
): void {
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;
	const life = motionDuration(durationMs / 1000);

	// Outer iridescent magenta halo ring
	const magentaRing = new Sprite(textures.ring);
	magentaRing.anchor.set(0.5);
	magentaRing.position.set(center.x, center.y);
	magentaRing.tint = hexToNum(palette.secondary);
	magentaRing.blendMode = 'add';
	magentaRing.scale.set(0.82);
	magentaRing.alpha = 0.78;
	burstContainer.addChild(magentaRing);

	simRings.push({
		sprite: magentaRing,
		container: burstContainer,
		age: 0,
		delay: 0,
		life,
		startScale: 0.82,
		endScale: 1.65,
		peakAlpha: 0.78,
		spin: -1.4,
		luminous: true,
	});

	// Inner electric cyan barrier dome
	const cyanRing = new Sprite(textures.ring);
	cyanRing.anchor.set(0.5);
	cyanRing.position.set(center.x, center.y);
	cyanRing.tint = hexToNum(palette.primary);
	cyanRing.blendMode = 'add';
	cyanRing.scale.set(0.68);
	cyanRing.alpha = 0.92;
	burstContainer.addChild(cyanRing);

	simRings.push({
		sprite: cyanRing,
		container: burstContainer,
		age: 0,
		delay: 0.03,
		life: life * 0.88,
		startScale: 0.68,
		endScale: 1.48,
		peakAlpha: 0.92,
		spin: 1.8,
		luminous: true,
	});

	spawnDiamondShards(cx, cy, 8, palette);
}

/**
 * Spectral translucent arcane vortex + rune crater (LoR Curses / Shadow / Silence / Deathrattle).
 */
export function spawnArcaneVortex(
	cx: number,
	cy: number,
	palette: ParticleColor = { primary: '#00f0d8', secondary: '#8b5cf6', glow: 'rgba(0,240,216,0.58)' },
	durationMs = 560,
): void {
	if (!pixiApp || !burstContainer || !textures) return;
	const center = toArenaPoint(cx, cy);
	if (!center) return;
	const life = motionDuration(durationMs / 1000);

	// Rotating spectral claw / rune vortex crater (uses high-detail Norse art when loaded)
	const sigil = new Sprite(textures.spectralClaw);
	sigil.anchor.set(0.5);
	sigil.position.set(center.x, center.y);
	sigil.tint = hexToNum(palette.primary);
	sigil.blendMode = 'add';
	const vortexNorm = 128 / Math.max(128, textures.spectralClaw.width);
	sigil.scale.set(0.48 * vortexNorm);
	sigil.alpha = 0.92;
	burstContainer.addChild(sigil);

	simRings.push({
		sprite: sigil,
		container: burstContainer,
		age: 0,
		delay: 0,
		life,
		startScale: 0.48 * vortexNorm,
		endScale: 1.8 * vortexNorm,
		peakAlpha: 0.92,
		spin: -2.4,
		luminous: true,
	});

	// Secondary void-colored counter-spinning shockwave
	const ring = new Sprite(textures.ring);
	ring.anchor.set(0.5);
	ring.position.set(center.x, center.y);
	ring.tint = hexToNum(palette.secondary);
	ring.blendMode = 'add';
	ring.scale.set(0.32);
	ring.alpha = 0.82;
	burstContainer.addChild(ring);

	simRings.push({
		sprite: ring,
		container: burstContainer,
		age: 0,
		delay: 0.05,
		life: life * 0.9,
		startScale: 0.32,
		endScale: 1.9,
		peakAlpha: 0.82,
		spin: 2.1,
		luminous: true,
	});

	// Swirling ghostly smoke + diamond wisps
	spawnSmokePuff(cx, cy, 4, palette);
	spawnDiamondShards(cx, cy, 10, palette);
}

export interface MagicTunnelOptions {
	/** Number of perspective-foreshortened portal rings along the corridor (default 8). */
	rings?: number;
	/** Travel time from source to target in ms (default 360). */
	durationMs?: number;
	/** Callback fired when the tunnel beam reaches the target. */
	onImpact?: () => void;
}

/**
 * 2D Perspective Magic Tunnel rendered in pure PixiJS v8:
 * Projects a sequence of elliptically foreshortened additive rings & rune sigils
 * along the exact `source -> target` axis while a translucent ribbon lances
 * straight through the tunnel core. Alternated for high-impact spells, heavy
 * attacks, Hero Powers, and counter-attack raises.
 */
export function spawnMagicTunnel(
	sx: number,
	sy: number,
	tx: number,
	ty: number,
	palette: ParticleColor,
	options: MagicTunnelOptions = {},
): void {
	const durationMs = options.durationMs ?? 360;
	if (!pixiApp || !trailContainer || !textures) {
		options.onImpact?.();
		return;
	}
	const start = toArenaPoint(sx, sy);
	const end = toArenaPoint(tx, ty);
	if (!start || !end) {
		options.onImpact?.();
		return;
	}

	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const angle = Math.atan2(dy, dx);
	const ringCount = prefersReducedMotion()
		? 3
		: Math.min(11, Math.max(5, options.rings ?? 8));
	const travelSec = motionDuration(Math.max(0.14, durationMs / 1000));

	for (let i = 0; i < ringCount; i += 1) {
		const u = (i + 0.5) / ringCount;
		const px = start.x + dx * u;
		const py = start.y + dy * u;
		const isSigil = i % 3 === 1;
		const tex = isSigil ? textures.runeSigil : textures.ring;
		const texNorm = 128 / Math.max(128, tex.width);
		const sprite = new Sprite(tex);
		sprite.anchor.set(0.5);
		sprite.position.set(px, py);
		sprite.rotation = angle;
		sprite.tint = i % 2 === 0 ? hexToNum(palette.primary) : hexToNum(palette.secondary);
		sprite.blendMode = 'add';
		sprite.alpha = 0;
		// Slight funnel taper: wider near origin & target, tighter mid-tunnel
		const funnel = 0.72 + Math.sin(u * Math.PI) * 0.36;
		const startScale = 0.28 * funnel * texNorm;
		const endScale = (isSigil ? 1.05 : 1.28) * funnel * texNorm;
		sprite.scale.set(startScale * 0.36, startScale);
		trailContainer.addChild(sprite);

		simRings.push({
			sprite,
			container: trailContainer,
			age: 0,
			delay: u * travelSec * 0.72,
			life: motionDuration(0.38),
			startScale,
			endScale,
			scaleXRatio: 0.36,
			peakAlpha: isSigil ? 0.72 : 0.84,
			spin: 0,
			luminous: true,
		});
	}

	// Straight-core translucent silk lance gliding through the tunnel rings
	spawnTranslucentRibbon(sx, sy, tx, ty, palette, {
		strands: 2,
		durationMs,
		lingerMs: 360,
		arcFactor: 0.04,
		onImpact: options.onImpact,
	});
}

/**
 * Sets the target psychological emotional atmosphere (smoothly interpolated at 60fps
 * through GPU Gaussian blur & 4x5 RGBA color-matrix convolution).
 */
export function setEmotionalAtmosphere(params: EmotionalAtmosphereParams): void {
	targetAtmosphere = params;
}

/**
 * Fires a decaying psychological impulse (critical shock, euphoria, dread, climax)
 * that temporarily amplifies color convolution & peripheral blur diffusion.
 */
export function triggerEmotionalImpulse(kind: EmotionalImpulseKind, intensity = 0.85): void {
	const clamped = Math.min(1, Math.max(0.1, intensity));
	if (!activeEmotionalImpulse || clamped >= activeEmotionalImpulse.strength) {
		activeEmotionalImpulse = { kind, strength: clamped };
	}
}

export const PixiParticleCanvas: React.FC<{ realm?: string }> = ({ realm }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const arenaRoot = useArenaVfxRoot();
	const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null);

	useEffect(() => {
		activeArenaVfxRoot = arenaRoot;
		setPortalTarget(arenaRoot ? getArenaVfxCoordinateLayer(arenaRoot) : null);
		return () => {
			if (activeArenaVfxRoot === arenaRoot) activeArenaVfxRoot = null;
		};
	}, [arenaRoot]);

	useEffect(() => {
		if (!containerRef.current || !portalTarget) return;

		const app = new Application();
		let mounted = true;
		let initialized = false;
		let destroyRequested = false;
		let destroyed = false;

		const destroyApp = () => {
			destroyRequested = true;
			if (initialized) {
				try {
					app.ticker.remove(stepSimulation);
				} catch {
					// Ticker may already be torn down on context loss
				}
			}
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
			textures = createCachedTextures();
			const mountedTextures = textures;
			loadNorseVfxArtTextures(mountedTextures, () => mounted && !destroyRequested && textures === mountedTextures);

			atmosphereContainer = new Container();
			atmosphereBlurFilter = new BlurFilter({ strength: 1.8, quality: 2, kernelSize: 5 });
			vfxColorMatrixFilter = new ColorMatrixFilter();
			atmosphereContainer.filterArea = app.screen;
			atmosphereContainer.filters = [atmosphereBlurFilter];

			atmosphereHaloSprite = new Sprite(textures.atmosphereHalo);
			atmosphereHaloSprite.anchor.set(0.5);
			atmosphereHaloSprite.position.set(ARENA_CANVAS_SIZE.width / 2, ARENA_CANVAS_SIZE.height / 2);
			atmosphereHaloSprite.width = ARENA_CANVAS_SIZE.width * 1.04;
			atmosphereHaloSprite.height = ARENA_CANVAS_SIZE.height * 1.04;
			atmosphereHaloSprite.blendMode = 'add';
			atmosphereHaloSprite.alpha = 0.025;
			atmosphereContainer.addChild(atmosphereHaloSprite);

			trailContainer = new Container();
			burstContainer = new Container();
			ambientContainer = new Container();
			filterContainer = new Container();
			emitterContainer = new Container();
			factionSceneContainer = new Container();
			thorContainer = new Container();

			ambientContainer.filterArea = app.screen;
			ambientContainer.filters = [vfxColorMatrixFilter];
			trailContainer.filterArea = app.screen;
			trailContainer.filters = [vfxColorMatrixFilter];

			app.stage.addChild(atmosphereContainer);
			app.stage.addChild(ambientContainer);
			app.stage.addChild(trailContainer);
			app.stage.addChild(filterContainer);
			app.stage.addChild(emitterContainer);
			app.stage.addChild(factionSceneContainer);
			app.stage.addChild(thorContainer);
			app.stage.addChild(burstContainer);

			app.ticker.add(stepSimulation);
			if (currentRealm) {
				startAmbientParticles(currentRealm);
			}
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

/**
 * ShaderVFX.ts — Pooled Atlas Spell VFX Facade (Zero GSAP, Zero Filter FBO Swaps)
 *
 * Replaces legacy per-cast `new Graphics()` + `ColorMatrixFilter` + `gsap` tweens
 * with the unified, sprite-pooled, hardware-budgeted PixiParticleCanvas pipeline.
 *
 * Preserves the exact public API consumed by `SpellCompositions.ts` and `BattlecryVFX.ts`.
 */

import {
	ELEMENT_PALETTES,
	spawnArenaFlash,
	spawnDiamondShards,
	spawnEmbers,
	spawnImpactRing,
	spawnParticleBurst,
	spawnRisingAura,
	spawnRunePulse,
	spawnSmokePuff,
	spawnSparkBurst,
	spawnStarburstBloom,
	type ParticleColor,
} from './PixiParticleCanvas';
import { prefersReducedMotion } from './pixi/pixiPalettes';
import { vfxQualityController } from '../combat/vfx/vfxQualityProfile';

const SHOCKWAVE_PALETTE: ParticleColor = {
	primary: '#e2e8f0',
	secondary: '#ffffff',
	glow: 'rgba(255,255,255,0.55)',
};

const BLOOD_PALETTE: ParticleColor = {
	primary: '#dc2626',
	secondary: '#7f1d1d',
	glow: 'rgba(220,38,38,0.65)',
};

function canSpawnShaderVfx(): boolean {
	if (typeof window === 'undefined') return false;
	if (prefersReducedMotion()) return false;
	return vfxQualityController.getBudget().budgetScale > 0;
}

/** Shockwave ripple expanding from a point. */
export function applyShockwave(cx: number, cy: number, _speed = 3, _amplitude = 20, duration = 0.6): void {
	if (!canSpawnShaderVfx()) return;
	spawnImpactRing(cx, cy, SHOCKWAVE_PALETTE, 'luminous');
	spawnRunePulse(cx, cy, SHOCKWAVE_PALETTE, Math.round(duration * 1000), 1.6);
}

/** Freeze distortion — icy crystalline burst + frost ring + subtle cool flash. */
export function applyFreezeDistortion(cx: number, cy: number, duration = 0.8): void {
	if (!canSpawnShaderVfx()) return;
	const ice = ELEMENT_PALETTES.ice;
	spawnImpactRing(cx, cy, ice, 'luminous');
	spawnDiamondShards(cx, cy, 12, ice);
	spawnRunePulse(cx, cy, ice, Math.round(duration * 800), 1.45);
	spawnArenaFlash(ice.primary, 0.14, Math.round(duration * 350));
}

/** Heat haze — rising embers + warm core bloom. */
export function applyHeatHaze(cx: number, cy: number, _radius = 60, duration = 0.8): void {
	if (!canSpawnShaderVfx()) return;
	const fire = ELEMENT_PALETTES.fire;
	spawnEmbers(cx, cy, 14, fire);
	spawnRisingAura(cx, cy, 10, fire);
	spawnStarburstBloom(cx, cy, fire, 1.15, Math.round(duration * 500));
}

/** Bloom pulse — radiant starburst + golden ring. */
export function applyBloomPulse(cx: number, cy: number, intensity = 2, duration = 0.5): void {
	if (!canSpawnShaderVfx()) return;
	const light = ELEMENT_PALETTES.light;
	const scale = Math.min(2.0, Math.max(0.9, 0.75 + intensity * 0.35));
	spawnStarburstBloom(cx, cy, light, scale, Math.round(duration * 1000));
	spawnImpactRing(cx, cy, light, 'luminous');
}

/** Godray — holy rising aura + radiant burst + soft golden flash. */
export function applyGodray(cx: number, cy: number, duration = 1.2): void {
	if (!canSpawnShaderVfx()) return;
	const light = ELEMENT_PALETTES.light;
	spawnRisingAura(cx, cy, 16, light);
	spawnStarburstBloom(cx, cy, light, 1.65, Math.round(duration * 550));
	spawnArenaFlash(light.primary, 0.16, Math.round(duration * 300));
}

/** Dissolve — dark shadow smoke + fading shards. */
export function applyDissolve(cx: number, cy: number, duration = 0.6): void {
	if (!canSpawnShaderVfx()) return;
	const shadow = ELEMENT_PALETTES.shadow;
	spawnSmokePuff(cx, cy, 12, shadow);
	spawnParticleBurst(cx, cy, 14, shadow);
	spawnRunePulse(cx, cy, shadow, Math.round(duration * 900), 1.3);
}

/** Lightning strike — high-contrast electric sparks, starburst, and brief flash. */
export function applyLightningStrike(cx: number, cy: number, duration = 0.4): void {
	if (!canSpawnShaderVfx()) return;
	const lightning = ELEMENT_PALETTES.lightning;
	spawnSparkBurst(cx, cy, 18, lightning);
	spawnStarburstBloom(cx, cy, lightning, 1.5, Math.round(duration * 900));
	spawnImpactRing(cx, cy, lightning, 'luminous');
	spawnArenaFlash(lightning.primary, 0.22, Math.round(duration * 500));
}

/** Blood splash — crimson impact burst + dark embers. */
export function applyBloodSplash(cx: number, cy: number, _duration = 0.5): void {
	if (!canSpawnShaderVfx()) return;
	spawnParticleBurst(cx, cy, 16, BLOOD_PALETTE);
	spawnDiamondShards(cx, cy, 8, BLOOD_PALETTE);
	spawnImpactRing(cx, cy, BLOOD_PALETTE, 'standard');
}

/**
 * No-op retained for backwards compatibility — all shader VFX now run inside
 * the pooled PixiParticleCanvas lifecycle with zero persistent container filters.
 */
export function cleanupAllFilters(): void {
	// Zero active WebGL filters to tear down
}

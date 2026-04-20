/**
 * SpellCompositions.ts — AAA Spell Effect Recipes
 *
 * Composes ShaderVFX + Pixi particles + screen CSS + GSAP timelines + audio
 * into cinematic spell sequences. Each composition is a self-contained
 * timeline that auto-cleans up after playback.
 *
 * Usage: playComposition('FREEZE_SPELL', sourceX, sourceY, targetX, targetY)
 */

import gsap from 'gsap';
import {
	applyShockwave, applyFreezeDistortion, applyHeatHaze,
	applyBloomPulse, applyGodray, applyDissolve,
	applyLightningStrike, applyBloodSplash,
} from './ShaderVFX';
import {
	spawnParticleBurst, spawnImpactRing, spawnEmbers, spawnSlashTrail,
	ELEMENT_PALETTES,
} from './PixiParticleCanvas';
import { playSpellCircle } from './SpellCircles';
import {
	spawnFireBurst, spawnIceShatter, spawnLightningSparks,
	spawnShadowWisps, spawnNatureBloom, spawnBloodBurst, spawnDivineRadiance,
} from './ElementalParticles';

let reducedMotion: boolean | null = null;
function isReducedMotion(): boolean {
	if (reducedMotion === null) {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}
	return reducedMotion;
}

function isEnhancedVFXEnabled(): boolean {
	try {
		const { useSettingsStore } = require('../stores/settingsStore');
		return useSettingsStore.getState().enhancedVFX !== false;
	} catch {
		return true;
	}
}

function addScreenClass(className: string, duration: number): void {
	const viewport = document.querySelector('.game-viewport');
	if (!viewport) return;
	viewport.classList.add(className);
	gsap.delayedCall(duration, () => viewport.classList.remove(className));
}

function screenShake(intensity = 4, duration = 0.3): void {
	const el = document.querySelector('.game-viewport') as HTMLElement;
	if (!el) return;
	gsap.to(el, {
		x: `random(-${intensity}, ${intensity})`,
		y: `random(-${intensity}, ${intensity})`,
		duration: 0.05,
		repeat: Math.floor(duration / 0.05),
		yoyo: true,
		ease: 'none',
		onComplete: () => { gsap.set(el, { x: 0, y: 0 }); },
	});
}

function screenFlash(color = 'rgba(255,255,255,0.3)', duration = 0.15): void {
	const flash = document.createElement('div');
	flash.style.cssText = `position:fixed;inset:0;background:${color};pointer-events:none;z-index:9999;opacity:1;`;
	document.body.appendChild(flash);
	gsap.to(flash, { opacity: 0, duration, onComplete: () => flash.remove() });
}

// ========================================================================
// COMPOSITIONS
// ========================================================================

export type CompositionName =
	| 'FREEZE_SPELL'
	| 'FIRE_AOE'
	| 'LIGHTNING_STRIKE'
	| 'DIVINE_SUMMON'
	| 'SHADOW_DEATH'
	| 'NATURE_HEAL'
	| 'BLOOD_PRICE'
	| 'BUFF_AURA'
	| 'TARGETED_DAMAGE'
	| 'MINION_ENTRY';

/**
 * Play a named spell composition at the given coordinates.
 * Returns a GSAP timeline for external chaining if needed.
 */
export function playComposition(
	name: CompositionName,
	sourceX: number,
	sourceY: number,
	targetX?: number,
	targetY?: number,
): gsap.core.Timeline | null {
	if (isReducedMotion() || !isEnhancedVFXEnabled()) return null;

	try {
		switch (name) {
			case 'FREEZE_SPELL': return composeFreezeSpell(sourceX, sourceY);
			case 'FIRE_AOE': return composeFireAOE(sourceX, sourceY);
			case 'LIGHTNING_STRIKE': return composeLightningStrike(sourceX, sourceY, targetX, targetY);
			case 'DIVINE_SUMMON': return composeDivineSummon(sourceX, sourceY);
			case 'SHADOW_DEATH': return composeShadowDeath(sourceX, sourceY);
			case 'NATURE_HEAL': return composeNatureHeal(sourceX, sourceY);
			case 'BLOOD_PRICE': return composeBloodPrice(sourceX, sourceY);
			case 'BUFF_AURA': return composeBuffAura(sourceX, sourceY);
			case 'TARGETED_DAMAGE': return composeTargetedDamage(sourceX, sourceY, targetX ?? sourceX, targetY ?? sourceY);
			case 'MINION_ENTRY': return composeMinionEntry(sourceX, sourceY);
			default: return null;
		}
	} catch {
		return null;
	}
}

// ── FREEZE SPELL ──────────────────────────────────────────────────────
function composeFreezeSpell(x: number, y: number): gsap.core.Timeline {
	const tl = gsap.timeline();
	tl.call(() => void playSpellCircle('ice_mandala', x, y, 1.2, 0.8), [], 0);
	tl.call(() => addScreenClass('screen-freeze', 1.0), [], 0);
	tl.call(() => applyFreezeDistortion(x, y, 0.8), [], 0.05);
	tl.call(() => spawnIceShatter(x, y, 18), [], 0.15);
	tl.call(() => applyShockwave(x, y, 2.5, 15, 0.5), [], 0.2);
	tl.call(() => spawnImpactRing(x, y, ELEMENT_PALETTES.ice), [], 0.25);
	return tl;
}

// ── FIRE AOE ──────────────────────────────────────────────────────────
function composeFireAOE(x: number, y: number): gsap.core.Timeline {
	const tl = gsap.timeline();
	tl.call(() => void playSpellCircle('fire_sigil', x, y, 1.5, 0.8), [], 0);
	tl.call(() => applyHeatHaze(x, y, 80, 0.8), [], 0);
	tl.call(() => addScreenClass('screen-burn', 0.8), [], 0.05);
	tl.call(() => screenShake(6, 0.4), [], 0.15);
	tl.call(() => applyShockwave(x, y, 3.5, 25, 0.6), [], 0.15);
	tl.call(() => spawnFireBurst(x, y, 30), [], 0.18);
	tl.call(() => spawnEmbers(x, y, 20, ELEMENT_PALETTES.fire), [], 0.25);
	tl.call(() => screenFlash('rgba(255,120,0,0.2)', 0.1), [], 0.15);
	return tl;
}

// ── LIGHTNING STRIKE ──────────────────────────────────────────────────
function composeLightningStrike(sx: number, sy: number, tx?: number, ty?: number): gsap.core.Timeline {
	const targetX = tx ?? sx;
	const targetY = ty ?? sy;
	const tl = gsap.timeline();
	tl.call(() => void playSpellCircle('lightning_seal', targetX, targetY, 1.0, 0.5), [], 0);
	tl.call(() => screenFlash('rgba(255,255,255,0.4)', 0.08), [], 0);
	tl.call(() => applyLightningStrike(targetX, targetY, 0.4), [], 0.02);
	tl.call(() => addScreenClass('screen-lightning', 0.15), [], 0.02);
	tl.call(() => screenShake(8, 0.2), [], 0.05);
	tl.call(() => applyBloomPulse(targetX, targetY, 2.5, 0.4), [], 0.05);
	tl.call(() => spawnLightningSparks(targetX, targetY, 20), [], 0.08);
	return tl;
}

// ── DIVINE SUMMON ─────────────────────────────────────────────────────
function composeDivineSummon(x: number, y: number): gsap.core.Timeline {
	const tl = gsap.timeline();
	tl.call(() => void playSpellCircle('divine_halo', x, y, 1.5, 1.2), [], 0);
	tl.call(() => addScreenClass('screen-holy', 1.5), [], 0);
	tl.call(() => applyGodray(x, y, 1.2), [], 0);
	tl.call(() => applyBloomPulse(x, y, 3, 0.8), [], 0.3);
	tl.call(() => spawnDivineRadiance(x, y, 25), [], 0.4);
	tl.call(() => screenFlash('rgba(255,215,0,0.15)', 0.2), [], 0.35);
	return tl;
}

// ── SHADOW DEATH ──────────────────────────────────────────────────────
function composeShadowDeath(x: number, y: number): gsap.core.Timeline {
	const tl = gsap.timeline();
	tl.call(() => void playSpellCircle('shadow_pentagram', x, y, 1.3, 0.8), [], 0);
	tl.call(() => addScreenClass('screen-shadow', 0.8), [], 0);
	tl.call(() => applyDissolve(x, y, 0.6), [], 0.05);
	tl.call(() => spawnShadowWisps(x, y, 15), [], 0.1);
	tl.call(() => screenFlash('rgba(0,0,0,0.15)', 0.2), [], 0.5);
	return tl;
}

// ── NATURE HEAL ───────────────────────────────────────────────────────
function composeNatureHeal(x: number, y: number): gsap.core.Timeline {
	const tl = gsap.timeline();
	tl.call(() => void playSpellCircle('nature_bloom', x, y, 1.0, 0.8), [], 0);
	tl.call(() => addScreenClass('screen-nature', 1.0), [], 0);
	tl.call(() => applyBloomPulse(x, y, 1.5, 0.6), [], 0.1);
	tl.call(() => spawnNatureBloom(x, y, 15), [], 0.15);
	return tl;
}

// ── BLOOD PRICE ───────────────────────────────────────────────────────
function composeBloodPrice(x: number, y: number): gsap.core.Timeline {
	const tl = gsap.timeline();
	tl.call(() => void playSpellCircle('blood_ritual', x, y, 1.0, 0.6), [], 0);
	tl.call(() => addScreenClass('screen-blood', 0.6), [], 0);
	tl.call(() => applyBloodSplash(x, y, 0.5), [], 0.05);
	tl.call(() => spawnBloodBurst(x, y, 12), [], 0.08);
	tl.call(() => screenShake(3, 0.15), [], 0.08);
	tl.call(() => screenFlash('rgba(180,0,0,0.15)', 0.1), [], 0.05);
	return tl;
}

// ── BUFF AURA ─────────────────────────────────────────────────────────
function composeBuffAura(x: number, y: number): gsap.core.Timeline {
	const tl = gsap.timeline();
	tl.call(() => applyBloomPulse(x, y, 1.8, 0.5), [], 0);
	tl.call(() => spawnParticleBurst(x, y, 12, {
		primary: '#ffd700', secondary: '#ffee88', glow: 'rgba(255,215,0,0.5)'
	}), [], 0.1);
	return tl;
}

// ── TARGETED DAMAGE ───────────────────────────────────────────────────
function composeTargetedDamage(sx: number, sy: number, tx: number, ty: number): gsap.core.Timeline {
	const tl = gsap.timeline();
	tl.call(() => spawnSlashTrail(sx, sy, tx, ty, 15, ELEMENT_PALETTES.fire), [], 0);
	tl.call(() => applyShockwave(tx, ty, 2, 12, 0.4), [], 0.25);
	tl.call(() => spawnImpactRing(tx, ty, ELEMENT_PALETTES.fire), [], 0.28);
	tl.call(() => screenShake(4, 0.15), [], 0.25);
	return tl;
}

// ── MINION ENTRY ──────────────────────────────────────────────────────
function composeMinionEntry(x: number, y: number): gsap.core.Timeline {
	const tl = gsap.timeline();
	tl.call(() => void playSpellCircle('norse_rune', x, y + 10, 0.8, 0.6), [], 0);
	tl.call(() => applyShockwave(x, y + 20, 1.5, 10, 0.4), [], 0.05);
	tl.call(() => spawnParticleBurst(x, y + 20, 10, ELEMENT_PALETTES.neutral), [], 0.1);
	return tl;
}

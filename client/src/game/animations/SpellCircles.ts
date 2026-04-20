/**
 * SpellCircles.ts — Procedural Spell Circle Renderer
 *
 * Draws animated runic circles, sigils, and magic patterns using Pixi Graphics.
 * No external assets needed — everything is generated procedurally.
 * Each spell circle auto-destroys after its duration.
 */

import { Graphics, Container } from 'pixi.js';
import gsap from 'gsap';
import { getFilterContainer } from './PixiParticleCanvas';

let reducedMotion: boolean | null = null;
function isReducedMotion(): boolean {
	if (reducedMotion === null) {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}
	return reducedMotion;
}

export type SpellCircleType =
	| 'norse_rune'
	| 'fire_sigil'
	| 'ice_mandala'
	| 'shadow_pentagram'
	| 'nature_bloom'
	| 'lightning_seal'
	| 'divine_halo'
	| 'blood_ritual';

interface CircleConfig {
	color: number;
	glowColor: number;
	segments: number;
	innerRadius: number;
	outerRadius: number;
	rotationSpeed: number;
	runeCount: number;
}

const CIRCLE_CONFIGS: Record<SpellCircleType, CircleConfig> = {
	norse_rune:       { color: 0xffd700, glowColor: 0xaa8800, segments: 24, innerRadius: 30, outerRadius: 50, rotationSpeed: 0.8, runeCount: 8 },
	fire_sigil:       { color: 0xff5500, glowColor: 0xff2200, segments: 16, innerRadius: 25, outerRadius: 45, rotationSpeed: 1.2, runeCount: 6 },
	ice_mandala:      { color: 0x88ccff, glowColor: 0x4488cc, segments: 32, innerRadius: 35, outerRadius: 55, rotationSpeed: -0.6, runeCount: 12 },
	shadow_pentagram: { color: 0x9933cc, glowColor: 0x6600aa, segments: 5,  innerRadius: 25, outerRadius: 50, rotationSpeed: -0.4, runeCount: 5 },
	nature_bloom:     { color: 0x44cc44, glowColor: 0x228822, segments: 8,  innerRadius: 20, outerRadius: 40, rotationSpeed: 0.5, runeCount: 8 },
	lightning_seal:   { color: 0xffdd00, glowColor: 0xccaa00, segments: 6,  innerRadius: 22, outerRadius: 42, rotationSpeed: 2.0, runeCount: 6 },
	divine_halo:      { color: 0xffeedd, glowColor: 0xffd700, segments: 36, innerRadius: 40, outerRadius: 60, rotationSpeed: 0.3, runeCount: 12 },
	blood_ritual:     { color: 0xcc0000, glowColor: 0x880000, segments: 8,  innerRadius: 28, outerRadius: 48, rotationSpeed: -1.0, runeCount: 8 },
};

// Norse Elder Futhark-inspired line patterns (simplified for Graphics rendering)
const RUNE_PATTERNS = [
	// Fehu (wealth)
	(g: Graphics, s: number) => { g.moveTo(0, -s); g.lineTo(0, s); g.moveTo(0, -s*0.3); g.lineTo(s*0.6, -s); g.moveTo(0, s*0.1); g.lineTo(s*0.6, -s*0.3); },
	// Uruz (strength)
	(g: Graphics, s: number) => { g.moveTo(-s*0.3, -s); g.lineTo(-s*0.3, s); g.moveTo(-s*0.3, -s); g.lineTo(s*0.3, -s*0.3); g.lineTo(s*0.3, s); },
	// Thurisaz (thunder)
	(g: Graphics, s: number) => { g.moveTo(0, -s); g.lineTo(0, s); g.moveTo(0, -s*0.3); g.lineTo(s*0.5, 0); g.lineTo(0, s*0.3); },
	// Ansuz (Odin)
	(g: Graphics, s: number) => { g.moveTo(0, s); g.lineTo(0, -s); g.moveTo(0, -s*0.4); g.lineTo(s*0.5, 0); g.moveTo(0, s*0.1); g.lineTo(s*0.5, s*0.5); },
	// Raido (journey)
	(g: Graphics, s: number) => { g.moveTo(-s*0.2, -s); g.lineTo(-s*0.2, s); g.moveTo(-s*0.2, -s); g.lineTo(s*0.3, -s*0.2); g.lineTo(-s*0.2, s*0.1); g.moveTo(-s*0.2, s*0.1); g.lineTo(s*0.4, s); },
	// Kenaz (fire)
	(g: Graphics, s: number) => { g.moveTo(0, -s); g.lineTo(s*0.5, 0); g.lineTo(0, s); },
	// Isa (ice)
	(g: Graphics, s: number) => { g.moveTo(0, -s); g.lineTo(0, s); },
	// Hagalaz (hail)
	(g: Graphics, s: number) => { g.moveTo(-s*0.3, -s); g.lineTo(-s*0.3, s); g.moveTo(s*0.3, -s); g.lineTo(s*0.3, s); g.moveTo(-s*0.3, 0); g.lineTo(s*0.3, 0); },
	// Tiwaz (Tyr)
	(g: Graphics, s: number) => { g.moveTo(0, -s); g.lineTo(0, s); g.moveTo(-s*0.5, -s); g.lineTo(0, -s*0.3); g.lineTo(s*0.5, -s); },
	// Algiz (protection)
	(g: Graphics, s: number) => { g.moveTo(0, -s); g.lineTo(0, s); g.moveTo(0, -s*0.2); g.lineTo(-s*0.4, -s); g.moveTo(0, -s*0.2); g.lineTo(s*0.4, -s); },
];

/**
 * Spawn a procedural spell circle at the given position.
 * Returns a cleanup function to destroy it early if needed.
 */
export function playSpellCircle(
	type: SpellCircleType,
	cx: number,
	cy: number,
	scale = 1.0,
	duration = 0.8,
): (() => void) | null {
	if (isReducedMotion()) return null;
	const container = getFilterContainer();
	if (!container) return null;

	try {
		const config = CIRCLE_CONFIGS[type];
		const group = new Container();
		group.position.set(cx, cy);
		group.scale.set(0);
		group.alpha = 0;
		container.addChild(group);

		// Outer ring
		const outerRing = new Graphics();
		outerRing.circle(0, 0, config.outerRadius * scale);
		outerRing.stroke({ width: 2, color: config.color, alpha: 0.7 });
		group.addChild(outerRing);

		// Inner ring
		const innerRing = new Graphics();
		innerRing.circle(0, 0, config.innerRadius * scale);
		innerRing.stroke({ width: 1.5, color: config.color, alpha: 0.5 });
		group.addChild(innerRing);

		// Segment lines (radial spokes)
		const spokes = new Graphics();
		for (let i = 0; i < config.segments; i++) {
			const angle = (Math.PI * 2 * i) / config.segments;
			const ix = Math.cos(angle) * config.innerRadius * scale;
			const iy = Math.sin(angle) * config.innerRadius * scale;
			const ox = Math.cos(angle) * config.outerRadius * scale;
			const oy = Math.sin(angle) * config.outerRadius * scale;
			spokes.moveTo(ix, iy);
			spokes.lineTo(ox, oy);
		}
		spokes.stroke({ width: 1, color: config.color, alpha: 0.3 });
		group.addChild(spokes);

		// Rune symbols around the circle
		const runeLayer = new Container();
		const runeRadius = (config.innerRadius + config.outerRadius) * 0.5 * scale;
		for (let i = 0; i < config.runeCount; i++) {
			const angle = (Math.PI * 2 * i) / config.runeCount;
			const rx = Math.cos(angle) * runeRadius;
			const ry = Math.sin(angle) * runeRadius;

			const rune = new Graphics();
			const pattern = RUNE_PATTERNS[i % RUNE_PATTERNS.length];
			pattern(rune, 6 * scale);
			rune.stroke({ width: 1.5, color: config.color, alpha: 0.8 });
			rune.position.set(rx, ry);
			rune.rotation = angle + Math.PI / 2;
			runeLayer.addChild(rune);
		}
		group.addChild(runeLayer);

		// Center glow
		const glow = new Graphics();
		glow.circle(0, 0, config.innerRadius * 0.6 * scale);
		glow.fill({ color: config.glowColor, alpha: 0.15 });
		group.addChild(glow);

		// Animation timeline
		const tl = gsap.timeline({
			onComplete: () => {
				container.removeChild(group);
				group.destroy({ children: true });
			}
		});

		// Appear
		tl.to(group, { alpha: 1, duration: 0.15 }, 0);
		tl.to(group.scale, { x: 1, y: 1, duration: 0.25, ease: 'back.out(1.5)' }, 0);

		// Rotate rune layer
		tl.to(runeLayer, { rotation: config.rotationSpeed * Math.PI, duration: duration * 0.8, ease: 'none' }, 0);

		// Counter-rotate inner ring
		tl.to(innerRing, { rotation: -config.rotationSpeed * Math.PI * 0.5, duration: duration * 0.8, ease: 'none' }, 0);

		// Pulse glow
		tl.to(glow, { alpha: 0.4, duration: duration * 0.3, ease: 'power2.in' }, 0);
		tl.to(glow, { alpha: 0, duration: duration * 0.3 }, duration * 0.5);

		// Fade out
		tl.to(group, { alpha: 0, duration: duration * 0.3, ease: 'power2.in' }, duration * 0.7);
		tl.to(group.scale, { x: 1.3, y: 1.3, duration: duration * 0.3, ease: 'power2.in' }, duration * 0.7);

		return () => {
			tl.kill();
			if (group.parent) container.removeChild(group);
			group.destroy({ children: true });
		};
	} catch {
		return null;
	}
}

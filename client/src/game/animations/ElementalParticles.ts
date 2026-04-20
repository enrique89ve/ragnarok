/**
 * ElementalParticles.ts — Enhanced Element-Specific Particle Effects
 *
 * Spawns visually distinct particle patterns for each element type.
 * Fire = upward embers with gravity, Ice = angular shards, Lightning = fast sparks,
 * Shadow = slow wisps, Nature = floating leaves, Blood = droplets with gravity.
 *
 * Uses existing PixiParticleCanvas infrastructure with richer behaviors.
 */

import { Graphics, Container } from 'pixi.js';
import gsap from 'gsap';
import { getEmitterContainer, ELEMENT_PALETTES, type ParticleColor } from './PixiParticleCanvas';

let reducedMotion: boolean | null = null;
function isReducedMotion(): boolean {
	if (reducedMotion === null) {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}
	return reducedMotion;
}

function hexToNum(hex: string): number {
	return parseInt(hex.replace('#', ''), 16);
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

// ── FIRE: Upward embers with gravity falloff and color ramp ─────────
export function spawnFireBurst(cx: number, cy: number, count = 25): void {
	if (isReducedMotion()) return;
	const container = getEmitterContainer();
	if (!container) return;

	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = 40 + Math.random() * 80;
		const size = 2 + Math.random() * 5;
		const life = 0.6 + Math.random() * 0.8;

		const p = new Graphics();
		p.circle(0, 0, size);
		p.fill(Math.random() > 0.4 ? 0xff5500 : Math.random() > 0.5 ? 0xffaa00 : 0xffd700);
		p.position.set(cx, cy);
		p.alpha = 1;
		container.addChild(p);

		const endX = cx + Math.cos(angle) * speed;
		const endY = cy + Math.sin(angle) * speed - 30 - Math.random() * 50; // upward bias

		gsap.to(p, {
			x: endX,
			y: endY,
			duration: life,
			ease: 'power1.out',
		});
		gsap.to(p, {
			alpha: 0,
			duration: life * 0.4,
			delay: life * 0.6,
			onComplete: () => { container.removeChild(p); p.destroy(); }
		});
		gsap.to(p.scale, {
			x: 0.2,
			y: 0.2,
			duration: life * 0.5,
			delay: life * 0.5,
			ease: 'power2.in',
		});
	}
}

// ── ICE: Angular shards that scatter and spin ───────────────────────
export function spawnIceShatter(cx: number, cy: number, count = 18): void {
	if (isReducedMotion()) return;
	const container = getEmitterContainer();
	if (!container) return;

	for (let i = 0; i < count; i++) {
		const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
		const dist = 30 + Math.random() * 70;
		const w = 2 + Math.random() * 3;
		const h = 6 + Math.random() * 10;

		const shard = new Graphics();
		shard.rect(-w / 2, -h / 2, w, h);
		shard.fill(Math.random() > 0.5 ? 0x88ccff : 0xcceeFF);
		shard.rotation = angle;
		shard.position.set(cx, cy);
		shard.alpha = 0.9;
		container.addChild(shard);

		const endX = cx + Math.cos(angle) * dist;
		const endY = cy + Math.sin(angle) * dist + Math.random() * 20; // slight downward

		gsap.to(shard, {
			x: endX,
			y: endY,
			rotation: angle + (Math.random() - 0.5) * 4,
			alpha: 0,
			duration: 0.5 + Math.random() * 0.3,
			ease: 'power2.out',
			onComplete: () => { container.removeChild(shard); shard.destroy(); }
		});
	}
}

// ── LIGHTNING: Fast bright sparks with erratic paths ────────────────
export function spawnLightningSparks(cx: number, cy: number, count = 20): void {
	if (isReducedMotion()) return;
	const container = getEmitterContainer();
	if (!container) return;

	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = 60 + Math.random() * 120;
		const size = 1 + Math.random() * 3;

		const spark = new Graphics();
		spark.circle(0, 0, size);
		spark.fill(Math.random() > 0.3 ? 0xffd700 : 0xffffff);
		spark.position.set(cx, cy);
		spark.alpha = 1;
		container.addChild(spark);

		// Erratic path: multiple waypoints
		const mid1X = cx + Math.cos(angle) * speed * 0.3 + (Math.random() - 0.5) * 40;
		const mid1Y = cy + Math.sin(angle) * speed * 0.3 + (Math.random() - 0.5) * 40;
		const endX = cx + Math.cos(angle) * speed;
		const endY = cy + Math.sin(angle) * speed;

		const tl = gsap.timeline({
			onComplete: () => { container.removeChild(spark); spark.destroy(); }
		});
		tl.to(spark, { x: mid1X, y: mid1Y, duration: 0.08, ease: 'none' });
		tl.to(spark, { x: endX, y: endY, alpha: 0, duration: 0.15, ease: 'power2.out' });
	}
}

// ── SHADOW: Slow-drifting wisps that fade ───────────────────────────
export function spawnShadowWisps(cx: number, cy: number, count = 15): void {
	if (isReducedMotion()) return;
	const container = getEmitterContainer();
	if (!container) return;

	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const dist = 20 + Math.random() * 50;
		const size = 4 + Math.random() * 8;

		const wisp = new Graphics();
		wisp.circle(0, 0, size);
		wisp.fill({ color: Math.random() > 0.5 ? 0x7b1fa2 : 0x4a0072, alpha: 0.4 });
		wisp.position.set(cx + (Math.random() - 0.5) * 30, cy + (Math.random() - 0.5) * 30);
		wisp.alpha = 0;
		container.addChild(wisp);

		const endX = wisp.x + Math.cos(angle) * dist;
		const endY = wisp.y + Math.sin(angle) * dist - 15; // slight rise

		gsap.to(wisp, { alpha: 0.6, duration: 0.3, delay: i * 0.05 });
		gsap.to(wisp, {
			x: endX,
			y: endY,
			duration: 1.2 + Math.random() * 0.8,
			ease: 'power1.out',
		});
		gsap.to(wisp, {
			alpha: 0,
			duration: 0.5,
			delay: 0.8 + Math.random() * 0.5,
			onComplete: () => { container.removeChild(wisp); wisp.destroy(); }
		});
		gsap.to(wisp.scale, {
			x: 0.3,
			y: 0.3,
			duration: 1.5,
			ease: 'power1.in',
		});
	}
}

// ── NATURE: Floating leaf-like particles rising gently ──────────────
export function spawnNatureBloom(cx: number, cy: number, count = 15): void {
	if (isReducedMotion()) return;
	const container = getEmitterContainer();
	if (!container) return;

	for (let i = 0; i < count; i++) {
		const w = 3 + Math.random() * 5;
		const h = 5 + Math.random() * 8;

		const leaf = new Graphics();
		leaf.ellipse(0, 0, w, h);
		leaf.fill(Math.random() > 0.5 ? 0x66bb6a : Math.random() > 0.5 ? 0xa5d6a7 : 0xffd700);
		leaf.position.set(cx + (Math.random() - 0.5) * 40, cy + (Math.random() - 0.5) * 20);
		leaf.rotation = Math.random() * Math.PI;
		leaf.alpha = 0;
		container.addChild(leaf);

		const swayX = (Math.random() - 0.5) * 60;
		const riseY = -40 - Math.random() * 60;

		gsap.to(leaf, { alpha: 0.8, duration: 0.3, delay: i * 0.06 });
		gsap.to(leaf, {
			x: leaf.x + swayX,
			y: leaf.y + riseY,
			rotation: leaf.rotation + (Math.random() - 0.5) * 3,
			duration: 1.5 + Math.random() * 1.0,
			ease: 'power1.out',
		});
		gsap.to(leaf, {
			alpha: 0,
			duration: 0.6,
			delay: 1.0 + Math.random() * 0.5,
			onComplete: () => { container.removeChild(leaf); leaf.destroy(); }
		});
	}
}

// ── BLOOD: Gravity-affected droplets ────────────────────────────────
export function spawnBloodBurst(cx: number, cy: number, count = 12): void {
	if (isReducedMotion()) return;
	const container = getEmitterContainer();
	if (!container) return;

	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = 20 + Math.random() * 60;
		const size = 2 + Math.random() * 4;

		const drop = new Graphics();
		drop.circle(0, 0, size);
		drop.fill(Math.random() > 0.3 ? 0xcc0000 : 0x880000);
		drop.position.set(cx, cy);
		drop.alpha = 0.9;
		container.addChild(drop);

		const endX = cx + Math.cos(angle) * speed;
		const endY = cy + Math.sin(angle) * speed + 40 + Math.random() * 30; // gravity pull down

		gsap.to(drop, {
			x: endX,
			y: endY,
			alpha: 0,
			duration: 0.5 + Math.random() * 0.3,
			ease: 'power1.in',
			onComplete: () => { container.removeChild(drop); drop.destroy(); }
		});
	}
}

// ── DIVINE: Upward golden radiance particles ────────────────────────
export function spawnDivineRadiance(cx: number, cy: number, count = 20): void {
	if (isReducedMotion()) return;
	const container = getEmitterContainer();
	if (!container) return;

	for (let i = 0; i < count; i++) {
		const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2; // mostly upward
		const speed = 30 + Math.random() * 70;
		const size = 2 + Math.random() * 4;

		const p = new Graphics();
		p.circle(0, 0, size);
		p.fill(Math.random() > 0.4 ? 0xffd700 : 0xffffff);
		p.position.set(cx + (Math.random() - 0.5) * 30, cy);
		p.alpha = 0;
		container.addChild(p);

		const endX = p.x + Math.cos(angle) * speed;
		const endY = p.y + Math.sin(angle) * speed;

		gsap.to(p, { alpha: 1, duration: 0.15, delay: i * 0.03 });
		gsap.to(p, {
			x: endX,
			y: endY,
			duration: 0.8 + Math.random() * 0.6,
			ease: 'power1.out',
		});
		gsap.to(p, {
			alpha: 0,
			duration: 0.4,
			delay: 0.5 + Math.random() * 0.4,
			onComplete: () => { container.removeChild(p); p.destroy(); }
		});
	}
}

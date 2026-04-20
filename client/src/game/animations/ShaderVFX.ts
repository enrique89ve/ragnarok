/**
 * ShaderVFX.ts — GPU Shader Effects for Spell Animations
 *
 * Applies temporary Pixi filters (shockwave, freeze distortion, bloom, godray)
 * to the Pixi canvas containers. All effects are time-limited and auto-cleanup.
 *
 * Uses pixi-filters for advanced effects + Pixi v8 built-in filters as fallback.
 * Every public function checks prefers-reduced-motion and returns early if true.
 */

import gsap from 'gsap';
import { Graphics, BlurFilter, ColorMatrixFilter, Container } from 'pixi.js';
import { getPixiApp, getBurstContainer, getFilterContainer } from './PixiParticleCanvas';

let reducedMotion: boolean | null = null;
function isReducedMotion(): boolean {
	if (reducedMotion === null) {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}
	return reducedMotion;
}

// Track active filters for cleanup
const activeFilters: Array<{ filter: any; container: Container; timeline?: gsap.core.Tween }> = [];

/**
 * Shockwave ripple expanding from a point.
 * Uses a custom radial distortion via animated Graphics + blur.
 */
export function applyShockwave(cx: number, cy: number, speed = 3, amplitude = 20, duration = 0.6): void {
	if (isReducedMotion()) return;
	const container = getFilterContainer();
	if (!container) return;

	try {
		const ring = new Graphics();
		ring.circle(0, 0, 40);
		ring.stroke({ width: amplitude * 0.5, color: 0xffffff, alpha: 0.3 });
		ring.position.set(cx, cy);
		ring.scale.set(0.1);
		ring.alpha = 0.8;
		container.addChild(ring);

		const tl = gsap.timeline({
			onComplete: () => {
				container.removeChild(ring);
				ring.destroy();
			}
		});
		tl.to(ring.scale, { x: speed, y: speed, duration, ease: 'power2.out' }, 0);
		tl.to(ring, { alpha: 0, duration: duration * 0.6, delay: duration * 0.4, ease: 'power2.in' }, 0);
	} catch { /* non-critical */ }
}

/**
 * Freeze distortion — blue tint + blur pulse + ice crystal ring.
 */
export function applyFreezeDistortion(cx: number, cy: number, duration = 0.8): void {
	if (isReducedMotion()) return;
	const container = getFilterContainer();
	const app = getPixiApp();
	if (!container || !app) return;

	try {
		// Blue color tint on burst container
		const colorMatrix = new ColorMatrixFilter();
		colorMatrix.tint(0x4488ff, true);
		const burstC = getBurstContainer();
		if (burstC) {
			const existing = Array.isArray(burstC.filters) ? burstC.filters : burstC.filters ? [burstC.filters] : [];
			burstC.filters = [...existing, colorMatrix];
			activeFilters.push({ filter: colorMatrix, container: burstC });

			gsap.delayedCall(duration, () => {
				const curr = Array.isArray(burstC.filters) ? burstC.filters : burstC.filters ? [burstC.filters] : [];
				burstC.filters = curr.filter((f: any) => f !== colorMatrix);
				const idx = activeFilters.findIndex(a => a.filter === colorMatrix);
				if (idx >= 0) activeFilters.splice(idx, 1);
			});
		}

		// Expanding ice ring
		for (let i = 0; i < 3; i++) {
			const iceRing = new Graphics();
			iceRing.circle(0, 0, 30 + i * 15);
			iceRing.stroke({ width: 2, color: 0x88ccff, alpha: 0.6 });
			iceRing.position.set(cx, cy);
			iceRing.scale.set(0.3);
			iceRing.alpha = 0.7;
			container.addChild(iceRing);

			gsap.to(iceRing.scale, { x: 2 + i * 0.5, y: 2 + i * 0.5, duration: duration * 0.8, delay: i * 0.1, ease: 'power2.out' });
			gsap.to(iceRing, {
				alpha: 0,
				duration: duration * 0.5,
				delay: duration * 0.4 + i * 0.1,
				onComplete: () => { container.removeChild(iceRing); iceRing.destroy(); }
			});
		}

		// Frost crystal particles
		for (let i = 0; i < 12; i++) {
			const angle = (Math.PI * 2 * i) / 12;
			const crystal = new Graphics();
			crystal.rect(-1, -4, 2, 8);
			crystal.fill(0xcceeFF);
			crystal.rotation = angle;
			crystal.position.set(cx, cy);
			crystal.alpha = 0.9;
			container.addChild(crystal);

			const dist = 40 + Math.random() * 60;
			gsap.to(crystal, {
				x: cx + Math.cos(angle) * dist,
				y: cy + Math.sin(angle) * dist,
				alpha: 0,
				duration: duration * 0.7,
				delay: 0.1,
				ease: 'power2.out',
				onComplete: () => { container.removeChild(crystal); crystal.destroy(); }
			});
		}
	} catch { /* non-critical */ }
}

/**
 * Heat haze — fire distortion glow with animated embers.
 */
export function applyHeatHaze(cx: number, cy: number, radius = 60, duration = 0.8): void {
	if (isReducedMotion()) return;
	const container = getFilterContainer();
	if (!container) return;

	try {
		// Radial heat glow
		const glow = new Graphics();
		glow.circle(0, 0, radius);
		glow.fill({ color: 0xff5500, alpha: 0.15 });
		glow.position.set(cx, cy);
		glow.scale.set(0.5);
		glow.alpha = 0.8;
		container.addChild(glow);

		gsap.to(glow.scale, { x: 2, y: 2, duration: duration * 0.6, ease: 'power2.out' });
		gsap.to(glow, {
			alpha: 0,
			duration: duration * 0.4,
			delay: duration * 0.6,
			onComplete: () => { container.removeChild(glow); glow.destroy(); }
		});

		// Rising heat distortion lines
		for (let i = 0; i < 8; i++) {
			const line = new Graphics();
			const x = cx + (Math.random() - 0.5) * radius;
			line.rect(-1, 0, 2, 20 + Math.random() * 30);
			line.fill({ color: 0xff8800, alpha: 0.3 });
			line.position.set(x, cy);
			line.alpha = 0.6;
			container.addChild(line);

			gsap.to(line, {
				y: cy - 50 - Math.random() * 60,
				alpha: 0,
				duration: 0.6 + Math.random() * 0.4,
				delay: Math.random() * 0.3,
				ease: 'power1.out',
				onComplete: () => { container.removeChild(line); line.destroy(); }
			});
		}
	} catch { /* non-critical */ }
}

/**
 * Bloom pulse — bright flash at a point with additive glow.
 */
export function applyBloomPulse(cx: number, cy: number, intensity = 2, duration = 0.5): void {
	if (isReducedMotion()) return;
	const container = getFilterContainer();
	if (!container) return;

	try {
		const bloom = new Graphics();
		bloom.circle(0, 0, 30 * intensity);
		bloom.fill({ color: 0xffffff, alpha: 0.6 });
		bloom.position.set(cx, cy);
		bloom.scale.set(0.2);
		bloom.alpha = 1;
		container.addChild(bloom);

		gsap.to(bloom.scale, { x: intensity, y: intensity, duration: duration * 0.3, ease: 'power2.out' });
		gsap.to(bloom, {
			alpha: 0,
			duration: duration * 0.7,
			delay: duration * 0.3,
			ease: 'power2.in',
			onComplete: () => { container.removeChild(bloom); bloom.destroy(); }
		});

		// Secondary ring
		const ring = new Graphics();
		ring.circle(0, 0, 50 * intensity);
		ring.stroke({ width: 3, color: 0xffd700, alpha: 0.4 });
		ring.position.set(cx, cy);
		ring.scale.set(0.3);
		ring.alpha = 0.8;
		container.addChild(ring);

		gsap.to(ring.scale, { x: intensity * 1.5, y: intensity * 1.5, duration: duration * 0.5, ease: 'power2.out' });
		gsap.to(ring, {
			alpha: 0,
			duration: duration * 0.5,
			delay: duration * 0.3,
			onComplete: () => { container.removeChild(ring); ring.destroy(); }
		});
	} catch { /* non-critical */ }
}

/**
 * Godray — vertical light pillar for summon/divine effects.
 */
export function applyGodray(cx: number, cy: number, duration = 1.2): void {
	if (isReducedMotion()) return;
	const container = getFilterContainer();
	if (!container) return;

	try {
		const pillar = new Graphics();
		const h = window.innerHeight;
		pillar.rect(-20, -h, 40, h);
		pillar.fill({ color: 0xffd700, alpha: 0.12 });
		pillar.position.set(cx, cy);
		pillar.scale.set(0.3, 0);
		pillar.alpha = 0;
		container.addChild(pillar);

		const tl = gsap.timeline({
			onComplete: () => { container.removeChild(pillar); pillar.destroy(); }
		});
		tl.to(pillar, { alpha: 1, duration: 0.15 }, 0);
		tl.to(pillar.scale, { x: 1, y: 1, duration: 0.3, ease: 'power2.out' }, 0);
		tl.to(pillar.scale, { x: 2, duration: duration * 0.5, ease: 'power1.in' }, 0.3);
		tl.to(pillar, { alpha: 0, duration: duration * 0.3, ease: 'power2.in' }, duration * 0.7);

		// Side rays
		for (let i = 0; i < 6; i++) {
			const ray = new Graphics();
			const angle = (Math.PI * 2 * i) / 6;
			ray.rect(-2, 0, 4, 80 + Math.random() * 40);
			ray.fill({ color: 0xffd700, alpha: 0.08 });
			ray.rotation = angle;
			ray.position.set(cx, cy);
			ray.alpha = 0;
			container.addChild(ray);

			gsap.to(ray, { alpha: 0.5, duration: 0.2, delay: 0.1 + i * 0.05 });
			gsap.to(ray, {
				alpha: 0,
				duration: duration * 0.4,
				delay: duration * 0.5,
				onComplete: () => { container.removeChild(ray); ray.destroy(); }
			});
		}
	} catch { /* non-critical */ }
}

/**
 * Dissolve — dark vortex pulling inward for death/destroy effects.
 */
export function applyDissolve(cx: number, cy: number, duration = 0.6): void {
	if (isReducedMotion()) return;
	const container = getFilterContainer();
	if (!container) return;

	try {
		// Inward-spiraling particles
		for (let i = 0; i < 16; i++) {
			const angle = (Math.PI * 2 * i) / 16;
			const startDist = 60 + Math.random() * 40;
			const p = new Graphics();
			p.circle(0, 0, 2 + Math.random() * 3);
			p.fill(Math.random() > 0.5 ? 0x7b1fa2 : 0x4a0072);
			p.position.set(cx + Math.cos(angle) * startDist, cy + Math.sin(angle) * startDist);
			p.alpha = 0.8;
			container.addChild(p);

			gsap.to(p, {
				x: cx + (Math.random() - 0.5) * 10,
				y: cy + (Math.random() - 0.5) * 10,
				alpha: 0,
				duration: duration * 0.8,
				delay: Math.random() * 0.2,
				ease: 'power3.in',
				onComplete: () => { container.removeChild(p); p.destroy(); }
			});
		}

		// Dark flash
		const flash = new Graphics();
		flash.circle(0, 0, 40);
		flash.fill({ color: 0x220044, alpha: 0.5 });
		flash.position.set(cx, cy);
		flash.scale.set(1.5);
		flash.alpha = 0;
		container.addChild(flash);

		gsap.to(flash, { alpha: 0.7, duration: 0.15, delay: duration * 0.5 });
		gsap.to(flash, {
			alpha: 0,
			duration: 0.3,
			delay: duration * 0.6,
			onComplete: () => { container.removeChild(flash); flash.destroy(); }
		});
		gsap.to(flash.scale, { x: 0.1, y: 0.1, duration: duration * 0.4, delay: duration * 0.5, ease: 'power3.in' });
	} catch { /* non-critical */ }
}

/**
 * Lightning strike — jagged bolt + bright flash.
 */
export function applyLightningStrike(cx: number, cy: number, duration = 0.4): void {
	if (isReducedMotion()) return;
	const container = getFilterContainer();
	if (!container) return;

	try {
		// Jagged lightning bolt from top
		const bolt = new Graphics();
		bolt.moveTo(cx + (Math.random() - 0.5) * 40, 0);
		let bx = cx + (Math.random() - 0.5) * 40;
		const segments = 8;
		for (let i = 1; i <= segments; i++) {
			const t = i / segments;
			bx += (Math.random() - 0.5) * 60;
			bolt.lineTo(bx, cy * t);
		}
		bolt.stroke({ width: 3, color: 0xffd700, alpha: 0.9 });
		bolt.alpha = 1;
		container.addChild(bolt);

		// Second thinner bolt
		const bolt2 = new Graphics();
		bolt2.moveTo(cx + (Math.random() - 0.5) * 30, 0);
		let bx2 = cx + (Math.random() - 0.5) * 30;
		for (let i = 1; i <= segments; i++) {
			const t = i / segments;
			bx2 += (Math.random() - 0.5) * 40;
			bolt2.lineTo(bx2, cy * t);
		}
		bolt2.stroke({ width: 1.5, color: 0xffffff, alpha: 0.7 });
		bolt2.alpha = 1;
		container.addChild(bolt2);

		// Flash at impact
		const flash = new Graphics();
		flash.circle(0, 0, 25);
		flash.fill({ color: 0xffffff, alpha: 0.8 });
		flash.position.set(cx, cy);
		flash.alpha = 1;
		container.addChild(flash);

		// Fade all
		gsap.to(bolt, { alpha: 0, duration: duration * 0.6, delay: 0.05, onComplete: () => { container.removeChild(bolt); bolt.destroy(); } });
		gsap.to(bolt2, { alpha: 0, duration: duration * 0.5, delay: 0.08, onComplete: () => { container.removeChild(bolt2); bolt2.destroy(); } });
		gsap.to(flash, { alpha: 0, duration: duration * 0.4, ease: 'power2.in', onComplete: () => { container.removeChild(flash); flash.destroy(); } });
		gsap.to(flash.scale, { x: 3, y: 3, duration: duration * 0.3, ease: 'power2.out' });
	} catch { /* non-critical */ }
}

/**
 * Blood splash — red impact burst for damage/blood price effects.
 */
export function applyBloodSplash(cx: number, cy: number, duration = 0.5): void {
	if (isReducedMotion()) return;
	const container = getFilterContainer();
	if (!container) return;

	try {
		for (let i = 0; i < 10; i++) {
			const angle = Math.random() * Math.PI * 2;
			const dist = 20 + Math.random() * 50;
			const droplet = new Graphics();
			droplet.circle(0, 0, 2 + Math.random() * 4);
			droplet.fill(Math.random() > 0.3 ? 0xcc0000 : 0x880000);
			droplet.position.set(cx, cy);
			droplet.alpha = 0.9;
			container.addChild(droplet);

			gsap.to(droplet, {
				x: cx + Math.cos(angle) * dist,
				y: cy + Math.sin(angle) * dist + 20,
				alpha: 0,
				duration: 0.4 + Math.random() * 0.3,
				ease: 'power1.out',
				onComplete: () => { container.removeChild(droplet); droplet.destroy(); }
			});
		}
	} catch { /* non-critical */ }
}

/**
 * Clean up ALL active shader filters and effects.
 */
export function cleanupAllFilters(): void {
	for (const af of activeFilters) {
		try {
			const curr = Array.isArray(af.container.filters) ? af.container.filters : af.container.filters ? [af.container.filters] : [];
			af.container.filters = curr.filter((f: any) => f !== af.filter);
			if (af.timeline) af.timeline.kill();
		} catch { /* ignore */ }
	}
	activeFilters.length = 0;

	const fc = getFilterContainer();
	if (fc) {
		fc.removeChildren();
	}
}

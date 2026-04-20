import gsap from 'gsap';
import {
	spawnSlashTrail,
	spawnParticleBurst,
	spawnImpactRing,
	spawnEmbers,
	ELEMENT_PALETTES,
	type ParticleColor
} from './PixiParticleCanvas';

export interface AttackFXConfig {
	attackerEl: HTMLElement | null;
	targetEl: HTMLElement | null;
	damage: number;
	element?: string;
	onImpact?: () => void;
	onComplete?: () => void;
}

interface DamageTier {
	burstCount: number;
	trailCount: number;
	shakePx: number;
	emberCount: number;
	flash: 'none' | 'white' | 'gold';
}

function getDamageTier(damage: number): DamageTier {
	if (damage >= 30) return { burstCount: 80, trailCount: 50, shakePx: 15, emberCount: 15, flash: 'gold' };
	if (damage >= 15) return { burstCount: 60, trailCount: 40, shakePx: 10, emberCount: 10, flash: 'white' };
	if (damage >= 6)  return { burstCount: 40, trailCount: 30, shakePx: 6, emberCount: 6, flash: 'none' };
	return { burstCount: 20, trailCount: 20, shakePx: 3, emberCount: 4, flash: 'none' };
}

function getCenter(el: HTMLElement): { x: number; y: number } {
	const rect = el.getBoundingClientRect();
	return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function getDirection(src: { x: number; y: number }, tgt: { x: number; y: number }) {
	const dx = tgt.x - src.x;
	const dy = tgt.y - src.y;
	return { dx, dy };
}

export function playHeroAttackFX(config: AttackFXConfig): gsap.core.Timeline | null {
	const { attackerEl, targetEl, damage, element = 'neutral', onImpact, onComplete } = config;

	if (!attackerEl || !targetEl) {
		onImpact?.();
		onComplete?.();
		return null;
	}

	const palette: ParticleColor = ELEMENT_PALETTES[element] || ELEMENT_PALETTES.neutral;
	const tier = getDamageTier(damage);
	const src = getCenter(attackerEl);
	const tgt = getCenter(targetEl);
	const { dx, dy } = getDirection(src, tgt);

	const tl = gsap.timeline({
		onComplete: () => {
			gsap.set(attackerEl, { clearProps: 'all' });
			gsap.set(targetEl, { clearProps: 'all' });
			onComplete?.();
		}
	});

	// Phase 1: Windup (300ms)
	tl.to(attackerEl, {
		scale: 1.15,
		y: -8,
		duration: 0.3,
		ease: 'power2.out',
	});

	// Phase 2: Lunge (200ms)
	tl.to(attackerEl, {
		x: dx * 0.55,
		y: dy * 0.55,
		scale: 1.1,
		duration: 0.2,
		ease: 'power3.in',
		onStart: () => {
			spawnSlashTrail(src.x, src.y, tgt.x, tgt.y, tier.trailCount, palette);
		}
	});

	// Phase 3: Impact (100ms)
	tl.add(() => {
		onImpact?.();
		spawnParticleBurst(tgt.x, tgt.y, tier.burstCount, palette);
		spawnImpactRing(tgt.x, tgt.y, palette);

		// Screen shake on document body
		const shakeTl = gsap.timeline();
		const s = tier.shakePx;
		shakeTl.to(document.body, { x: -s, y: s * 0.5, duration: 0.04, ease: 'none' });
		shakeTl.to(document.body, { x: s, y: -s * 0.5, duration: 0.04, ease: 'none' });
		shakeTl.to(document.body, { x: -s * 0.6, y: s * 0.3, duration: 0.04, ease: 'none' });
		shakeTl.to(document.body, { x: s * 0.4, y: -s * 0.2, duration: 0.04, ease: 'none' });
		shakeTl.to(document.body, { x: 0, y: 0, duration: 0.06, ease: 'power2.out' });

		// Screen flash for heavy hits
		if (tier.flash !== 'none') {
			const flash = document.createElement('div');
			flash.style.cssText = `
				position: fixed; inset: 0; z-index: 9200; pointer-events: none;
				background: ${tier.flash === 'gold' ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.4)'};
			`;
			document.body.appendChild(flash);
			gsap.to(flash, {
				opacity: 0,
				duration: tier.flash === 'gold' ? 0.15 : 0.1,
				ease: 'power2.out',
				onComplete: () => flash.remove()
			});
		}
	});

	// Target recoil
	tl.to(targetEl, {
		scale: 0.92,
		x: dx > 0 ? 6 : -6,
		filter: 'brightness(2) saturate(0.5)',
		duration: 0.08,
		ease: 'none',
	}, '<');

	tl.to(targetEl, {
		scale: 1,
		x: 0,
		filter: 'none',
		duration: 0.2,
		ease: 'elastic.out(1.2, 0.4)',
	});

	// Phase 4: Attacker recoil (200ms)
	tl.to(attackerEl, {
		x: 0,
		y: 0,
		scale: 1,
		duration: 0.25,
		ease: 'back.out(1.7)',
	}, '-=0.15');

	// Phase 5: Aftermath — lingering embers
	tl.add(() => {
		spawnEmbers(tgt.x, tgt.y, tier.emberCount, palette);
	}, '-=0.1');

	// Floating damage number
	const dmgEl = document.createElement('div');
	dmgEl.textContent = `-${damage}`;
	dmgEl.style.cssText = `
		position: fixed;
		left: ${tgt.x}px;
		top: ${tgt.y}px;
		transform: translate(-50%, -50%);
		font-family: 'Impact', 'Arial Black', sans-serif;
		font-size: ${damage >= 15 ? '2.5rem' : '1.8rem'};
		font-weight: 900;
		color: ${damage >= 30 ? '#ffd700' : '#ff4444'};
		text-shadow: 0 0 8px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8);
		pointer-events: none;
		z-index: 9300;
		opacity: 0;
	`;
	document.body.appendChild(dmgEl);

	tl.fromTo(dmgEl,
		{ opacity: 0, y: 0, scale: 0.5 },
		{
			opacity: 1,
			y: -30,
			scale: 1.3,
			duration: 0.2,
			ease: 'back.out(2)',
		},
		'-=0.25'
	);
	tl.to(dmgEl, {
		y: -70,
		opacity: 0,
		scale: 0.8,
		duration: 0.5,
		ease: 'power2.in',
		onComplete: () => dmgEl.remove()
	});

	return tl;
}

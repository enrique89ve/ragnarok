/**
 * BattlecryVFX.ts
 *
 * GSAP-powered battlecry visual effects engine.
 * Each battlecry type has a dedicated timeline that tells the story
 * visually — no popups needed.
 *
 * Uses GSAP for timeline sequencing and DOM animation,
 * Pixi particle canvas for GPU particle bursts.
 * SpellCompositions for AAA shader + screen effects layered on top.
 */

import gsap from 'gsap';
import { spawnParticleBurst, spawnImpactRing, spawnEmbers, ELEMENT_PALETTES } from './PixiParticleCanvas';
import { cleanupAllFilters } from './ShaderVFX';
import { playComposition } from './SpellCompositions';

const VFX_CONTAINER_ID = 'battlecry-vfx-layer';
const MAX_ORPHAN_AGE_MS = 5000;

function getOrCreateContainer(): HTMLDivElement {
	let el = document.getElementById(VFX_CONTAINER_ID) as HTMLDivElement | null;
	if (!el) {
		el = document.createElement('div');
		el.id = VFX_CONTAINER_ID;
		Object.assign(el.style, {
			position: 'fixed', inset: '0', pointerEvents: 'none',
			zIndex: '9500', overflow: 'hidden'
		});
		document.body.appendChild(el);
	}
	startOrphanSweep(); // Lazy start — auto-stops when container is empty
	return el;
}

/**
 * Kill all active GSAP animations in the VFX layer and remove orphaned DOM nodes.
 * Call on component unmount or scene transitions.
 */
export function killAllVFX() {
	const container = document.getElementById(VFX_CONTAINER_ID);
	if (container) {
		gsap.killTweensOf(container.querySelectorAll('*'));
		container.innerHTML = '';
	}
	// Clean up GPU shader effects
	try { cleanupAllFilters(); } catch { /* non-critical */ }
}

// Periodic orphan sweep — removes children that have been in the container
// longer than MAX_ORPHAN_AGE_MS (safety net if a GSAP callback is interrupted).
let orphanSweepInterval: ReturnType<typeof setInterval> | null = null;

function startOrphanSweep() {
	if (orphanSweepInterval) return;
	orphanSweepInterval = setInterval(() => {
		const container = document.getElementById(VFX_CONTAINER_ID);
		if (!container || container.children.length === 0) {
			// Auto-stop sweep when no VFX are active (prevents memory leak)
			stopOrphanSweep();
			return;
		}
		const now = Date.now();
		Array.from(container.children).forEach(child => {
			const born = Number((child as HTMLElement).dataset.vfxBorn || '0');
			if (born && now - born > MAX_ORPHAN_AGE_MS) {
				child.remove();
			}
		});
	}, 2000);
}

// Orphan sweep starts lazily when VFX play, auto-stops when container is empty

export function stopOrphanSweep() {
	if (orphanSweepInterval) {
		clearInterval(orphanSweepInterval);
		orphanSweepInterval = null;
	}
}

function createDiv(styles: Partial<CSSStyleDeclaration>): HTMLDivElement {
	const div = document.createElement('div');
	Object.assign(div.style, { position: 'absolute', pointerEvents: 'none', ...styles });
	div.dataset.vfxBorn = String(Date.now());
	return div;
}

function cleanup(el: HTMLElement) {
	if (el.parentNode) el.parentNode.removeChild(el);
}

// ─── Screen Shake ─────────────────────────────────────────────
export function screenShake(intensity = 4, duration = 0.3) {
	const viewport = document.querySelector('.game-viewport') as HTMLElement;
	if (!viewport) return;
	const tl = gsap.timeline();
	const steps = Math.ceil(duration / 0.05);
	for (let i = 0; i < steps; i++) {
		const x = (Math.random() - 0.5) * intensity * 2;
		const y = (Math.random() - 0.5) * intensity * 2;
		tl.to(viewport, { x, y, duration: 0.05, ease: 'power1.inOut' });
	}
	tl.to(viewport, { x: 0, y: 0, duration: 0.1, ease: 'power2.out' });
}

// ─── Floating Damage Number ───────────────────────────────────
export function floatingNumber(x: number, y: number, value: number | string, color = '#ff4444', scale = 1) {
	const container = getOrCreateContainer();
	const el = createDiv({
		left: `${x}px`, top: `${y}px`,
		fontSize: `${28 * scale}px`, fontWeight: '900',
		color, fontFamily: 'Cinzel, serif',
		textShadow: `0 0 12px ${color}, 0 2px 6px rgba(0,0,0,0.9)`,
		transform: 'translate(-50%, -50%)',
		whiteSpace: 'nowrap',
		zIndex: '9600'
	});
	el.textContent = typeof value === 'number' ? (value > 0 ? `+${value}` : `${value}`) : `${value}`;
	container.appendChild(el);

	gsap.timeline()
		.fromTo(el, { scale: 0, opacity: 0 },
			{ scale: 1.4 * scale, opacity: 1, duration: 0.2, ease: 'back.out(3)' })
		.to(el, { scale: 1 * scale, duration: 0.15, ease: 'power2.out' })
		.to(el, { y: -60, opacity: 0, duration: 0.6, ease: 'power2.in', delay: 0.3 })
		.call(() => cleanup(el));
}

// ─── Staggered AoE Damage Numbers ────────────────────────────
function staggeredDamage(targets: { x: number; y: number }[], damage: number) {
	targets.forEach((t, i) => {
		gsap.delayedCall(i * 0.08, () => {
			floatingNumber(t.x, t.y, -damage, '#ff4444', 1);
			spawnParticleBurst(t.x, t.y, 15, ELEMENT_PALETTES.fire);
		});
	});
}

// ─── Shockwave Ring ───────────────────────────────────────────
function shockwaveRing(x: number, y: number, color: string, maxScale = 2.5, duration = 0.6) {
	const container = getOrCreateContainer();
	const ring = createDiv({
		left: `${x - 60}px`, top: `${y - 60}px`,
		width: '120px', height: '120px',
		borderRadius: '50%',
		border: `3px solid ${color}`,
		boxShadow: `0 0 20px ${color}, inset 0 0 10px ${color}`,
		zIndex: '9510'
	});
	container.appendChild(ring);

	gsap.timeline()
		.fromTo(ring, { scale: 0, opacity: 1 },
			{ scale: maxScale, opacity: 0, duration, ease: 'power2.out' })
		.call(() => cleanup(ring));
}

// ─── Ground Slam Effect ──────────────────────────────────────
function groundSlam(x: number, y: number) {
	const container = getOrCreateContainer();

	// Dust cloud
	const dust = createDiv({
		left: `${x - 80}px`, top: `${y - 15}px`,
		width: '160px', height: '30px',
		borderRadius: '50%',
		background: 'radial-gradient(ellipse, rgba(180,160,120,0.6) 0%, rgba(120,100,70,0.3) 50%, transparent 70%)',
		zIndex: '9505'
	});
	container.appendChild(dust);

	gsap.timeline()
		.fromTo(dust, { scaleX: 0.3, scaleY: 0.2, opacity: 0 },
			{ scaleX: 1.8, scaleY: 1, opacity: 0.8, duration: 0.25, ease: 'power2.out' })
		.to(dust, { scaleX: 2.5, scaleY: 0.5, opacity: 0, duration: 0.5, ease: 'power1.out' })
		.call(() => cleanup(dust));

	// Impact crack lines
	for (let i = 0; i < 6; i++) {
		const angle = (i / 6) * 360 + Math.random() * 30;
		const len = 30 + Math.random() * 40;
		const crack = createDiv({
			left: `${x}px`, top: `${y}px`,
			width: `${len}px`, height: '2px',
			background: 'linear-gradient(90deg, rgba(255,200,100,0.8), transparent)',
			transformOrigin: '0 50%',
			transform: `rotate(${angle}deg)`,
			zIndex: '9506'
		});
		container.appendChild(crack);

		gsap.timeline()
			.fromTo(crack, { scaleX: 0, opacity: 0.9 },
				{ scaleX: 1, opacity: 0.9, duration: 0.15, ease: 'power2.out', delay: 0.05 })
			.to(crack, { opacity: 0, duration: 0.4 })
			.call(() => cleanup(crack));
	}

	spawnParticleBurst(x, y, 25, { primary: '#d4a574', secondary: '#8b7355', glow: 'rgba(180,140,90,0.5)' });
	screenShake(6, 0.25);
}

// ─── Projectile Travel ───────────────────────────────────────
function projectile(
	sx: number, sy: number, tx: number, ty: number,
	palette: { primary: string; secondary: string; glow: string },
	onImpact?: () => void
) {
	const container = getOrCreateContainer();
	const orb = createDiv({
		left: `${sx}px`, top: `${sy}px`,
		width: '16px', height: '16px',
		borderRadius: '50%',
		background: `radial-gradient(circle, ${palette.primary} 0%, ${palette.secondary} 60%, transparent 100%)`,
		boxShadow: `0 0 16px ${palette.glow}, 0 0 32px ${palette.glow}`,
		transform: 'translate(-50%, -50%)',
		zIndex: '9520'
	});
	container.appendChild(orb);

	// Trail
	const trail = createDiv({
		left: `${sx}px`, top: `${sy}px`,
		width: '8px', height: '8px',
		borderRadius: '50%',
		background: palette.secondary,
		boxShadow: `0 0 10px ${palette.glow}`,
		transform: 'translate(-50%, -50%)',
		zIndex: '9519'
	});
	container.appendChild(trail);

	const dist = Math.sqrt((tx - sx) ** 2 + (ty - sy) ** 2);
	const speed = Math.max(0.25, Math.min(0.5, dist / 800));

	gsap.timeline()
		.to(orb, { left: tx, top: ty, duration: speed, ease: 'power2.in' })
		.to(trail, { left: tx, top: ty, duration: speed * 1.2, ease: 'power2.in' }, '<0.05')
		.call(() => {
			cleanup(orb);
			cleanup(trail);
			spawnParticleBurst(tx, ty, 30, palette);
			spawnImpactRing(tx, ty, palette);
			onImpact?.();
		});
}

// ─── Aura Pulse ──────────────────────────────────────────────
function auraPulse(x: number, y: number, color: string, pulses = 2) {
	const container = getOrCreateContainer();
	for (let p = 0; p < pulses; p++) {
		const aura = createDiv({
			left: `${x - 50}px`, top: `${y - 50}px`,
			width: '100px', height: '100px',
			borderRadius: '50%',
			background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
			zIndex: '9508'
		});
		container.appendChild(aura);

		gsap.timeline({ delay: p * 0.2 })
			.fromTo(aura, { scale: 0.3, opacity: 0 },
				{ scale: 1.8, opacity: 0.7, duration: 0.3, ease: 'power2.out' })
			.to(aura, { scale: 2.5, opacity: 0, duration: 0.4, ease: 'power1.out' })
			.call(() => cleanup(aura));
	}
}

// ─── Ice Crystals Converge ───────────────────────────────────
function iceConverge(x: number, y: number) {
	const container = getOrCreateContainer();
	const crystalChars = ['❄', '◇', '✦'];
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * Math.PI * 2;
		const radius = 100 + Math.random() * 50;
		const startX = x + Math.cos(angle) * radius;
		const startY = y + Math.sin(angle) * radius;

		const crystal = createDiv({
			left: `${startX}px`, top: `${startY}px`,
			fontSize: `${16 + Math.random() * 10}px`,
			color: '#aadcff',
			textShadow: '0 0 8px rgba(170,220,255,0.8)',
			transform: 'translate(-50%, -50%)',
			zIndex: '9515'
		});
		crystal.textContent = crystalChars[i % crystalChars.length];
		container.appendChild(crystal);

		gsap.timeline({ delay: i * 0.04 })
			.to(crystal, {
				left: x, top: y,
				scale: 0.5, opacity: 0,
				duration: 0.4, ease: 'power3.in'
			})
			.call(() => cleanup(crystal));
	}

	gsap.delayedCall(0.35, () => {
		spawnParticleBurst(x, y, 20, ELEMENT_PALETTES.ice);
		shockwaveRing(x, y, 'rgba(170,220,255,0.7)', 2, 0.5);
	});
}

// ─── Divine Shield Bubble ────────────────────────────────────
function divineShieldBubble(x: number, y: number) {
	const container = getOrCreateContainer();
	const bubble = createDiv({
		left: `${x - 45}px`, top: `${y - 55}px`,
		width: '90px', height: '110px',
		borderRadius: '50%',
		border: '3px solid rgba(255,215,0,0.8)',
		background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 50%, transparent 70%)',
		boxShadow: '0 0 20px rgba(255,215,0,0.4), inset 0 0 15px rgba(255,215,0,0.2)',
		zIndex: '9510'
	});
	container.appendChild(bubble);

	gsap.timeline()
		.fromTo(bubble, { scale: 0, opacity: 0 },
			{ scale: 1.2, opacity: 1, duration: 0.3, ease: 'back.out(2)' })
		.to(bubble, { scale: 1, duration: 0.15 })
		.to(bubble, { opacity: 0, duration: 0.8, delay: 0.5, ease: 'power1.in' })
		.call(() => cleanup(bubble));

	spawnParticleBurst(x, y, 15, { primary: '#ffd700', secondary: '#fff9c4', glow: 'rgba(255,215,0,0.6)' });
}

// ─── Portal / Rift Summon ────────────────────────────────────
function portalSummon(x: number, y: number) {
	const container = getOrCreateContainer();

	// Rift opening
	const rift = createDiv({
		left: `${x - 40}px`, top: `${y - 100}px`,
		width: '80px', height: '200px',
		background: 'linear-gradient(to bottom, transparent 0%, rgba(120,80,255,0.6) 30%, rgba(255,255,200,0.9) 50%, rgba(120,80,255,0.6) 70%, transparent 100%)',
		boxShadow: '0 0 40px rgba(120,80,255,0.5)',
		zIndex: '9509'
	});
	container.appendChild(rift);

	gsap.timeline()
		.fromTo(rift, { scaleX: 0, scaleY: 0, opacity: 0 },
			{ scaleX: 1, scaleY: 1, opacity: 1, duration: 0.3, ease: 'power2.out' })
		.to(rift, { scaleX: 0.3, opacity: 0, duration: 0.5, delay: 0.2, ease: 'power2.in' })
		.call(() => cleanup(rift));

	gsap.delayedCall(0.25, () => {
		spawnParticleBurst(x, y, 35, ELEMENT_PALETTES.lightning);
		spawnImpactRing(x, y, ELEMENT_PALETTES.lightning);
		groundSlam(x, y);
	});
}

// ─── Card Draw Whoosh ────────────────────────────────────────
function drawWhoosh(targetX: number, targetY: number, count: number) {
	const container = getOrCreateContainer();
	const deckX = window.innerWidth - 80;
	const deckY = window.innerHeight * 0.85;

	for (let i = 0; i < Math.min(count, 5); i++) {
		const card = createDiv({
			left: `${deckX}px`, top: `${deckY}px`,
			width: '40px', height: '56px',
			borderRadius: '4px',
			background: 'linear-gradient(135deg, #2a1a4a, #4a2a8a)',
			border: '1px solid rgba(255,215,0,0.5)',
			boxShadow: '0 0 10px rgba(100,80,200,0.5)',
			transform: 'translate(-50%, -50%)',
			zIndex: '9525'
		});
		container.appendChild(card);

		const midX = (deckX + targetX) / 2;
		const midY = Math.min(deckY, targetY) - 80 - i * 15;

		gsap.timeline({ delay: i * 0.12 })
			.to(card, {
				motionPath: { path: [{ x: midX - deckX, y: midY - deckY }, { x: targetX - deckX, y: targetY - deckY }], type: 'cubic' },
				duration: 0.4, ease: 'power2.inOut'
			})
			.to(card, { opacity: 0, scale: 0.5, duration: 0.15 })
			.call(() => cleanup(card));
	}

	gsap.delayedCall(0.15, () => {
		spawnParticleBurst(deckX, deckY, 10, { primary: '#ffd700', secondary: '#fff', glow: 'rgba(255,215,0,0.4)' });
	});
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API — called from AnimationLayer based on battlecry type
// ═══════════════════════════════════════════════════════════════

export function playAoeDamageVFX(
	sourceX: number, sourceY: number,
	targets: { x: number; y: number }[],
	damage: number
) {
	const tl = gsap.timeline();

	// 1. Shockwave from source
	tl.call(() => {
		shockwaveRing(sourceX, sourceY, 'rgba(255,80,40,0.8)', 3, 0.7);
		spawnParticleBurst(sourceX, sourceY, 50, ELEMENT_PALETTES.fire);
		screenShake(8, 0.4);
	});

	// 2. Staggered damage on each target
	tl.call(() => staggeredDamage(targets, damage), [], '+=0.15');

	return tl;
}

export function playTargetedDamageVFX(
	sourceX: number, sourceY: number,
	targetX: number, targetY: number,
	damage: number
) {
	return projectile(sourceX, sourceY, targetX, targetY, ELEMENT_PALETTES.fire, () => {
		floatingNumber(targetX, targetY, -damage, '#ff4444', 1.2);
		screenShake(5, 0.2);
	});
}

export function playHealVFX(x: number, y: number, amount: number) {
	auraPulse(x, y, 'rgba(100,220,100,0.4)', 2);
	spawnParticleBurst(x, y, 20, ELEMENT_PALETTES.nature);
	spawnEmbers(x, y - 20, 10, ELEMENT_PALETTES.nature);
	floatingNumber(x, y, `+${amount}`, '#4ade80', 1.1);
}

export function playBuffVFX(x: number, y: number, attack: number, health: number) {
	auraPulse(x, y, 'rgba(255,215,0,0.4)', 2);
	spawnParticleBurst(x, y, 25, { primary: '#ffd700', secondary: '#fff9c4', glow: 'rgba(255,215,0,0.6)' });

	const label = `+${attack}/+${health}`;
	floatingNumber(x, y, label, '#ffd700', 1.2);
}

export function playSummonVFX(x: number, y: number) {
	portalSummon(x, y);
}

export function playDrawVFX(x: number, y: number, count: number) {
	drawWhoosh(x, y, count);
}

export function playFreezeVFX(x: number, y: number) {
	iceConverge(x, y);
}

export function playDivineShieldVFX(x: number, y: number) {
	divineShieldBubble(x, y);
}

export function playMinionEntryVFX(x: number, y: number, rarity?: string) {
	const intensity = rarity === 'mythic' ? 10 : rarity === 'epic' ? 7 : 5;
	groundSlam(x, y);
	if (rarity === 'mythic' || rarity === 'epic') {
		shockwaveRing(x, y, rarity === 'mythic' ? 'rgba(255,215,0,0.7)' : 'rgba(160,80,255,0.7)', 2.5, 0.7);
	}
	screenShake(intensity, 0.2);
}

export function playDeathrattleVFX(x: number, y: number) {
	const container = getOrCreateContainer();

	// Dark vortex
	const vortex = createDiv({
		left: `${x - 50}px`, top: `${y - 50}px`,
		width: '100px', height: '100px',
		borderRadius: '50%',
		background: 'radial-gradient(circle, rgba(120,0,255,0.7) 0%, rgba(80,0,160,0.4) 40%, transparent 70%)',
		boxShadow: '0 0 40px rgba(120,0,255,0.5)',
		zIndex: '9510'
	});
	container.appendChild(vortex);

	gsap.timeline()
		.fromTo(vortex, { scale: 0, rotation: 0, opacity: 0 },
			{ scale: 1.8, rotation: 180, opacity: 0.9, duration: 0.6, ease: 'power2.out' })
		.to(vortex, { scale: 0, opacity: 0, rotation: 360, duration: 0.5, ease: 'power2.in' })
		.call(() => cleanup(vortex));

	// Skull rise
	const skull = createDiv({
		left: `${x}px`, top: `${y}px`,
		fontSize: '36px',
		transform: 'translate(-50%, -50%)',
		textShadow: '0 0 20px rgba(120,0,255,0.8), 0 0 40px rgba(80,0,160,0.6)',
		zIndex: '9515'
	});
	skull.textContent = '\u2620';
	container.appendChild(skull);

	gsap.timeline()
		.fromTo(skull, { scale: 0, opacity: 0, y: 0 },
			{ scale: 1.5, opacity: 1, duration: 0.3, ease: 'back.out(2)' })
		.to(skull, { y: -40, opacity: 0, scale: 1, duration: 0.6, delay: 0.3, ease: 'power2.in' })
		.call(() => cleanup(skull));

	spawnParticleBurst(x, y, 40, ELEMENT_PALETTES.shadow);
	spawnEmbers(x, y, 15, ELEMENT_PALETTES.shadow);
	shockwaveRing(x, y, 'rgba(120,0,255,0.6)', 2, 0.6);
	screenShake(4, 0.2);
}

// Generic battlecry dispatcher — called from AnimationLayer
// Layers SpellCompositions (shader + screen effects) ON TOP of existing VFX
export function playBattlecryVFX(
	effectType: string,
	sourceX: number, sourceY: number,
	targetX?: number, targetY?: number,
	value?: number,
	allTargets?: { x: number; y: number }[]
) {
	// Layer 1: AAA spell compositions (shader effects, screen tints, shockwaves)
	// These are additive — they enhance the base VFX below, wrapped in try/catch
	try {
		switch (effectType) {
			case 'aoe_damage': playComposition('FIRE_AOE', sourceX, sourceY); break;
			case 'damage': playComposition('TARGETED_DAMAGE', sourceX, sourceY, targetX, targetY); break;
			case 'heal': playComposition('NATURE_HEAL', targetX ?? sourceX, targetY ?? sourceY); break;
			case 'buff': case 'buff_adjacent': playComposition('BUFF_AURA', targetX ?? sourceX, targetY ?? sourceY); break;
			case 'summon': playComposition('DIVINE_SUMMON', targetX ?? sourceX, targetY ?? sourceY); break;
			case 'freeze': playComposition('FREEZE_SPELL', targetX ?? sourceX, targetY ?? sourceY); break;
			case 'divine_shield': playComposition('DIVINE_SUMMON', targetX ?? sourceX, targetY ?? sourceY); break;
			case 'deathrattle': playComposition('SHADOW_DEATH', sourceX, sourceY); break;
			case 'blood_price': playComposition('BLOOD_PRICE', sourceX, sourceY); break;
			case 'minion_entry': case 'mythic_entrance': playComposition('MINION_ENTRY', sourceX, sourceY); break;
			case 'lightning': case 'lightning_bolt': playComposition('LIGHTNING_STRIKE', sourceX, sourceY, targetX, targetY); break;
		}
	} catch { /* compositions are non-critical enhancement */ }

	// Layer 2: Original VFX (GSAP DOM + Pixi particles) — unchanged
	switch (effectType) {
		case 'aoe_damage':
			playAoeDamageVFX(sourceX, sourceY, allTargets || [], value || 0);
			break;
		case 'damage':
			if (targetX !== undefined && targetY !== undefined) {
				playTargetedDamageVFX(sourceX, sourceY, targetX, targetY, value || 0);
			} else {
				shockwaveRing(sourceX, sourceY, 'rgba(255,80,40,0.8)', 2, 0.5);
				spawnParticleBurst(sourceX, sourceY, 30, ELEMENT_PALETTES.fire);
				if (value) floatingNumber(sourceX, sourceY, -value, '#ff4444');
			}
			break;
		case 'heal':
			playHealVFX(targetX ?? sourceX, targetY ?? sourceY, value || 0);
			break;
		case 'buff':
		case 'buff_adjacent':
			playBuffVFX(targetX ?? sourceX, targetY ?? sourceY, value || 0, value || 0);
			break;
		case 'summon':
			playSummonVFX(targetX ?? sourceX, targetY ?? sourceY);
			break;
		case 'draw':
		case 'draw_both':
			playDrawVFX(sourceX, sourceY, value || 1);
			break;
		case 'freeze':
			playFreezeVFX(targetX ?? sourceX, targetY ?? sourceY);
			break;
		case 'divine_shield':
			playDivineShieldVFX(targetX ?? sourceX, targetY ?? sourceY);
			break;
		default:
			// Fallback: generic golden shockwave
			shockwaveRing(sourceX, sourceY, 'rgba(255,215,0,0.7)', 2.5, 0.6);
			spawnParticleBurst(sourceX, sourceY, 35, ELEMENT_PALETTES.lightning);
			spawnImpactRing(sourceX, sourceY, ELEMENT_PALETTES.lightning);
			break;
	}
}

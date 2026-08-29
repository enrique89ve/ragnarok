/**
 * PokerDramaVFX.ts
 *
 * GSAP-powered poker combat drama engine.
 * Every poker phase transition, betting action, and showdown moment
 * gets cinematic visual treatment — cards slam, screen shakes,
 * heroes react, and the battlefield breathes tension.
 *
 * Uses GSAP for timeline sequencing and DOM animation,
 * Pixi particle canvas for GPU particle bursts.
 */

import gsap from 'gsap';
import { spawnParticleBurst, spawnImpactRing, ELEMENT_PALETTES, type ParticleColor } from '../../animations/PixiParticleCanvas';
import {
	ARENA_VFX_LAYERS,
	ARENA_VFX_TARGETS,
	getArenaVfxCommunitySlot,
	getArenaVfxHeroTarget,
	getArenaVfxLayer,
	getArenaVfxSpellTrayCards,
	getArenaVfxTarget,
	getArenaVfxTargets,
	getArenaVfxWagerTargets,
} from '../arenaVfxTargets';
import { gameEffectCoordinator } from '@/game/effects/core/gameEffectCoordinator';
import { stampCardMotionClass } from '../../components/card/applyCardMotion';

const DRAMA_CONTAINER_ID = 'poker-drama-vfx-layer';
const MAX_ORPHAN_AGE_MS = 6000;

// Screen-point helper: the drama container fills the arena vfx layer
// (canvas-sized), so positions derived from its rect track the scaled
// 1920x1080 canvas instead of raw window fractions.
function getDramaContainerPoint(container: HTMLElement, yRatio = 0.5): { x: number; y: number } {
	const rect = container.getBoundingClientRect();
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height * yRatio,
	};
}

function getOrCreateContainer(): HTMLDivElement | null {
	const target = getArenaVfxLayer(ARENA_VFX_LAYERS.vfx);
	if (!target) return null;

	let el = document.getElementById(DRAMA_CONTAINER_ID) as HTMLDivElement | null;
	if (!el) {
		el = document.createElement('div');
		el.id = DRAMA_CONTAINER_ID;
		Object.assign(el.style, {
			// `position: absolute; inset: 0` — fills the layer-vfx mount.
			// Layer architecture: docs/POKER_ARENA_UI.md §Layers
			position: 'absolute', inset: '0', pointerEvents: 'none',
			overflow: 'hidden'
		});
	}
	if (el.parentElement !== target) {
		target.appendChild(el);
	}
	return el;
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

/* Helper — screen-shake target.  `.game-viewport` carries the inline
   `transform: translate(offsetX, offsetY) scale(scale)` set by
   GameViewport.tsx for responsive canvas scaling. GSAP animations on
   `x`/`y` overwrite the ENTIRE transform property, so shaking
   `.game-viewport` blows away the scale on first shake (canvas appears
   to "shift" and never restores correctly). The outer
   `.game-viewport-wrapper` has no transform of its own, so it is the
   correct shake target. */
function getShakeTarget(): HTMLElement | null {
	return getArenaVfxLayer(ARENA_VFX_LAYERS.viewportWrapper);
}

export function killAllPokerVFX() {
	const container = document.getElementById(DRAMA_CONTAINER_ID);
	if (container) {
		gsap.killTweensOf(container.querySelectorAll('*'));
		container.innerHTML = '';
	}
}

// Orphan sweep for poker VFX
let pokerOrphanInterval: ReturnType<typeof setInterval> | null = null;

export function startPokerOrphanSweep() {
	if (pokerOrphanInterval) clearInterval(pokerOrphanInterval);
	pokerOrphanInterval = setInterval(() => {
		const container = document.getElementById(DRAMA_CONTAINER_ID);
		if (!container || container.children.length === 0) return;
		const now = Date.now();
		Array.from(container.children).forEach(child => {
			const born = Number((child as HTMLElement).dataset.vfxBorn || '0');
			if (born && now - born > MAX_ORPHAN_AGE_MS) child.remove();
		});
	}, 2000);
}

export function stopPokerOrphanSweep() {
	if (pokerOrphanInterval) {
		clearInterval(pokerOrphanInterval);
		pokerOrphanInterval = null;
	}
}

// Suit → element color mapping for card impacts
const SUIT_PALETTES: Record<string, ParticleColor> = {
	spades:   { primary: '#a855f7', secondary: '#c084fc', glow: 'rgba(168,85,247,0.6)' },
	hearts:   { primary: '#ef4444', secondary: '#fca5a5', glow: 'rgba(239,68,68,0.6)' },
	diamonds: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	clubs:    { primary: '#22c55e', secondary: '#86efac', glow: 'rgba(34,197,94,0.6)' },
};

const GOLD_PALETTE: ParticleColor = { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' };
const RED_PALETTE: ParticleColor = { primary: '#ef4444', secondary: '#fca5a5', glow: 'rgba(239,68,68,0.6)' };
const WHITE_PALETTE: ParticleColor = { primary: '#ffffff', secondary: '#e2e8f0', glow: 'rgba(255,255,255,0.6)' };
const LIGHT_PALETTE: ParticleColor = ELEMENT_PALETTES.lightning || GOLD_PALETTE;

// ═══════════════════════════════════════════════════
// COMMUNITY CARD REVEAL ANIMATIONS
// ═══════════════════════════════════════════════════

/**
 * Animate community card deal — card flies from top, flips, slams onto table.
 * @param slotIndex - which community slot (0-4) the card lands in
 * @param suit - card suit for color-coded impact
 * @param value - card value for high-card flash
 * @param isRiver - if true, slow-mo river drama
 */
export function playCardDealVFX(
	slotIndex: number,
	suit: string,
	value: string,
	isRiver: boolean = false
) {
	const slot = getArenaVfxCommunitySlot(slotIndex);
	if (!slot) return;

	const rect = slot.getBoundingClientRect();
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;

	// Deal animation is GSAP-only: the legacy `.card-dealing` CSS class
	// (cardSlam keyframes) was removed to avoid double-animating the slot.
	// GSAP owns the scale bounce, table shake, particles and river slow-mo.
	const tl = gsap.timeline();

	const timeScale = isRiver ? 0.5 : 1;
	tl.timeScale(timeScale);

	// Card slam — scale bounce on the slot
	tl.fromTo(slot, {
		scale: 1.15,
		opacity: 0.7,
		y: -30
	}, {
		scale: 1,
		opacity: 1,
		y: 0,
		duration: 0.35,
		ease: 'back.out(2)'
	});

	// Table shake on impact — shake the WRAPPER (see getShakeTarget).
	const shakeTarget = getShakeTarget();
	if (shakeTarget) {
		const shakeIntensity = isRiver ? 4 : 2;
		tl.to(shakeTarget, {
			x: `random(-${shakeIntensity}, ${shakeIntensity})`,
			y: `random(-${shakeIntensity / 2}, ${shakeIntensity / 2})`,
			duration: 0.08,
			repeat: 3,
			yoyo: true,
			ease: 'none'
		}, '-=0.2');
		tl.set(shakeTarget, { x: 0, y: 0 });
	}

	// Particle impact at card position
	const palette = SUIT_PALETTES[suit] || GOLD_PALETTE;
	const color = palette.primary;
	spawnImpactRing(cx, cy, palette);

	// High card flash (A, K, Q face cards)
	const highCards = ['A', 'K', 'Q', 'J'];
	if (highCards.includes(value)) {
		const flash = createDiv({
			left: `${cx - 40}px`,
			top: `${cy - 40}px`,
			width: '80px',
			height: '80px',
			borderRadius: '50%',
			background: `radial-gradient(circle, ${color}44 0%, transparent 70%)`,
		});
		const container = getOrCreateContainer();
		if (!container) return;
		container.appendChild(flash);
		gsap.to(flash, {
			opacity: 0,
			scale: 2,
			duration: 0.5,
			onComplete: () => cleanup(flash)
		});
	}

	// River special — screen flash
	if (isRiver) {
		const flash = createDiv({
			inset: '0',
			background: 'rgba(255, 255, 255, 0.15)',
		});
		const container = getOrCreateContainer();
		if (!container) return;
		container.appendChild(flash);
		gsap.to(flash, {
			opacity: 0,
			duration: 0.6,
			onComplete: () => cleanup(flash)
		});

		// Extra particles for river
		spawnParticleBurst(cx, cy, 20, LIGHT_PALETTE);
	}
}

// Reveal scheduling (flop stagger, turn weight, river slow-mo) lives in
// the VisualEvent handler (vfx/handlers/pokerDramaHandlers.ts), which
// calls playCardDealVFX per communityCardRevealed event.


// ═══════════════════════════════════════════════════
// BETTING ACTION ANIMATIONS
// ═══════════════════════════════════════════════════

/**
 * ATTACK (raise) — hero lunges forward, gold flash
 */
export function playRaiseVFX(isPlayer: boolean) {
	const hero = getArenaVfxHeroTarget(isPlayer ? 'player' : 'opponent');
	if (!hero) return;

	const tl = gsap.timeline();

	// Hero lunge forward
	tl.to(hero, {
		y: isPlayer ? -8 : 8,
		scale: 1.03,
		duration: 0.2,
		ease: 'power2.out'
	});
	tl.to(hero, {
		y: 0,
		scale: 1,
		duration: 0.4,
		ease: 'power2.inOut'
	});

	// Gold flash behind hero
	const rect = hero.getBoundingClientRect();
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;
	spawnImpactRing(cx, cy, GOLD_PALETTE);

	// Dim opponent side slightly
	const otherHero = getArenaVfxHeroTarget(isPlayer ? 'opponent' : 'player');
	if (otherHero) {
		gsap.to(otherHero, {
			filter: 'brightness(0.85)',
			duration: 0.3,
			yoyo: true,
			repeat: 1
		});
	}
}

/**
 * COUNTER (re-raise) — THE BIG ONE.
 * Time dilation, pressure shake, hero slam forward, risk pulse.
 * Escalates with reraise level (1st, 2nd, 3rd+).
 */
export function playReraiseVFX(isPlayer: boolean, reraiseLevel: number = 1) {
	const container = getOrCreateContainer();
	if (!container) return;
	const shakeTarget = getShakeTarget();

	// --- Tension vignette ---
	const vignetteIntensity = Math.min(0.4 + reraiseLevel * 0.1, 0.7);
	const vignette = createDiv({
		inset: '0',
		background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
		zIndex: '1'
	});
	container.appendChild(vignette);
	gsap.fromTo(vignette,
		{ opacity: 0 },
		{ opacity: 1, duration: 0.3, yoyo: true, repeat: 1, repeatDelay: 0.6, onComplete: () => cleanup(vignette) }
	);

	// --- Pressure shake (low frequency, not damage-like) ---
	if (shakeTarget) {
		const shakeIntensity = Math.min(2 + reraiseLevel, 5);
		const shakeDuration = 0.15;
		const repeats = 2 + reraiseLevel;
		gsap.to(shakeTarget, {
			x: `random(-${shakeIntensity}, ${shakeIntensity})`,
			y: `random(-${shakeIntensity * 0.4}, ${shakeIntensity * 0.4})`,
			duration: shakeDuration,
			repeat: repeats,
			yoyo: true,
			ease: 'sine.inOut',
			onComplete: () => { gsap.set(shakeTarget, { x: 0, y: 0 }); }
		});
	}

	// --- Hero SLAM forward ---
	const hero = getArenaVfxHeroTarget(isPlayer ? 'player' : 'opponent');
	if (hero) {
		const tl = gsap.timeline();
		tl.to(hero, {
			y: isPlayer ? -16 : 16,
			scale: 1.08,
			duration: 0.15,
			ease: 'power3.out'
		});
		tl.to(hero, {
			y: 0,
			scale: 1,
			duration: 0.5,
			ease: 'elastic.out(1, 0.5)'
		});

		// Red/gold aura flash
		const rect = hero.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		spawnParticleBurst(cx, cy, 15, ELEMENT_PALETTES.fire);
		spawnImpactRing(cx, cy, RED_PALETTE);
	}

	// --- Opponent recoil ---
	const otherHero = getArenaVfxHeroTarget(isPlayer ? 'opponent' : 'player');
	if (otherHero) {
		gsap.to(otherHero, {
			y: isPlayer ? 4 : -4,
			filter: 'brightness(0.85)',
			duration: 0.2,
			yoyo: true,
			repeat: 1
		});
	}

	// --- Risk badge pulse ---
	const riskBadge = getArenaVfxTarget(ARENA_VFX_TARGETS.riskDisplay);
	if (riskBadge) {
		gsap.fromTo(riskBadge,
			{ scale: 1 },
			{ scale: 1.3, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }
		);
	}

	// --- Screen edge glow on 2nd+ reraise ---
	if (reraiseLevel >= 2) {
		const edgeGlow = createDiv({
			inset: '0',
			boxShadow: `inset 0 0 ${30 + reraiseLevel * 15}px rgba(239, 68, 68, ${0.15 + reraiseLevel * 0.05})`,
			zIndex: '2'
		});
		container.appendChild(edgeGlow);
		gsap.to(edgeGlow, {
			opacity: 0,
			duration: 1.2,
			onComplete: () => cleanup(edgeGlow)
		});
	}

	// --- Bass hit (procedural audio) ---
	playPressureBassHit(reraiseLevel);
}

/**
 * ENGAGE (call) — clash spark at center
 */
export function playCallVFX() {
	const container = getOrCreateContainer();
	if (!container) return;

	// Both heroes flash white briefly
	const heroes = [
		...getArenaVfxTargets(ARENA_VFX_TARGETS.playerHero),
		...getArenaVfxTargets(ARENA_VFX_TARGETS.opponentHero),
	];
	heroes.forEach(hero => {
		gsap.fromTo(hero,
			{ filter: 'brightness(1.6)' },
			{ filter: 'brightness(1)', duration: 0.2 }
		);
	});

	// Center clash spark — anchored to the arena canvas, not the window
	const center = getDramaContainerPoint(container);
	spawnParticleBurst(center.x, center.y, 15, LIGHT_PALETTE);
	spawnImpactRing(center.x, center.y, WHITE_PALETTE);
}

/**
 * DEFEND (check) — subtle shield tint
 */
export function playCheckVFX(isPlayer: boolean) {
	const hero = getArenaVfxHeroTarget(isPlayer ? 'player' : 'opponent');
	if (!hero) return;

	gsap.to(hero, {
		x: -3,
		filter: 'brightness(1.1) hue-rotate(-10deg)',
		duration: 0.15,
		yoyo: true,
		repeat: 1
	});
}

/**
 * BRACE (fold) — hero retreats, cards fly off
 */
export function playFoldVFX(isPlayer: boolean) {
	const hero = getArenaVfxHeroTarget(isPlayer ? 'player' : 'opponent');
	if (hero) {
		gsap.to(hero, {
			y: isPlayer ? 8 : -8,
			filter: 'brightness(0.7) grayscale(0.3)',
			duration: 0.4,
			ease: 'power2.in'
		});
		// Reset after
		gsap.to(hero, {
			y: 0,
			filter: 'brightness(1) grayscale(0)',
			duration: 0.6,
			delay: 0.5
		});
	}

	// Brighten the winner side
	const otherHero = getArenaVfxHeroTarget(isPlayer ? 'opponent' : 'player');
	if (otherHero) {
		gsap.fromTo(otherHero,
			{ filter: 'brightness(1.2)' },
			{ filter: 'brightness(1)', duration: 0.8, delay: 0.3 }
		);
	}
}


// ═══════════════════════════════════════════════════
// SHOWDOWN ANIMATIONS
// ═══════════════════════════════════════════════════

/**
 * Hand rank announcement — big Norse text slams onto screen.
 * Scaled by hand strength.
 */
export function playHandRankAnnouncement(
	rankName: string,
	rank: number,
	isWinner: boolean,
	isPlayer: boolean
) {
	if (!rankName || rank <= 1) return; // Don't announce High Card

	const container = getOrCreateContainer();
	if (!container) return;

	// Scale by rank (1-10)
	const fontSize = Math.min(2 + rank * 0.3, 5);
	const glowIntensity = Math.min(0.3 + rank * 0.1, 1);

	let color = '#e5e7eb';
	if (rank >= 3) color = '#38bdf8';
	if (rank >= 5) color = '#f5c542';
	if (rank >= 7) color = '#b7791f';
	if (rank >= 9) color = '#dc2626';

	const yPos = isPlayer ? '65%' : '35%';

	const text = createDiv({
		left: '50%',
		top: yPos,
		transform: 'translate(-50%, -50%) scale(1.5)',
		fontSize: `${fontSize}rem`,
		fontFamily: "'Cinzel', 'Georgia', serif",
		fontWeight: '900',
		color,
		textShadow: `0 0 ${20 * glowIntensity}px ${color}, 0 0 ${40 * glowIntensity}px ${color}88, 0 4px 8px rgba(0,0,0,0.8)`,
		letterSpacing: '4px',
		textTransform: 'uppercase',
		whiteSpace: 'nowrap',
		zIndex: '10',
		opacity: '0'
	});
	text.textContent = rankName;
	container.appendChild(text);

	const tl = gsap.timeline({ onComplete: () => cleanup(text) });

	// Slam in
	tl.to(text, {
		opacity: 1,
		scale: 1,
		duration: 0.3,
		ease: 'back.out(2)'
	});

	// Hold
	tl.to(text, { duration: 1.2 });

	// Fade out
	tl.to(text, {
		opacity: 0,
		y: isPlayer ? -20 : 20,
		duration: 0.4,
		ease: 'power2.in'
	});

	// Screen flash for strong hands
	if (rank >= 7) {
		const flash = createDiv({
			inset: '0',
			background: `radial-gradient(circle at 50% ${yPos}, ${color}22 0%, transparent 50%)`,
		});
		container.appendChild(flash);
		gsap.to(flash, {
			opacity: 0,
			duration: 0.8,
			delay: 0.2,
			onComplete: () => cleanup(flash)
		});
	}
}

/**
 * RAGNAROK special — Royal Flush cinematic
 */
export function playRagnarokVFX() {
	const container = getOrCreateContainer();
	if (!container) return;

	// White-out flash
	const whiteout = createDiv({
		inset: '0',
		background: 'rgba(255, 255, 255, 0.6)',
		zIndex: '20'
	});
	container.appendChild(whiteout);

	const tl = gsap.timeline();

	// Flash in
	tl.fromTo(whiteout,
		{ opacity: 0 },
		{ opacity: 1, duration: 0.15 }
	);

	// Hold white
	tl.to(whiteout, { duration: 0.5 });

	// Fade to reveal RAGNAROK text
	tl.to(whiteout, {
		opacity: 0,
		duration: 0.5,
		onComplete: () => cleanup(whiteout)
	});

	// RAGNAROK text
	const ragnarokText = createDiv({
		left: '50%',
		top: '50%',
		transform: 'translate(-50%, -50%) scale(3)',
		fontSize: '6rem',
		fontFamily: "'Cinzel', 'Georgia', serif",
		fontWeight: '900',
		color: '#ef4444',
		textShadow: '0 0 40px #ef4444, 0 0 80px #ef444488, 0 0 120px #ef444444, 0 6px 12px rgba(0,0,0,0.9)',
		letterSpacing: '12px',
		textTransform: 'uppercase',
		whiteSpace: 'nowrap',
		zIndex: '25',
		opacity: '0'
	});
	ragnarokText.textContent = 'RAGNAROK';
	container.appendChild(ragnarokText);

	tl.to(ragnarokText, {
		opacity: 1,
		scale: 1,
		duration: 0.4,
		ease: 'back.out(1.5)',
		delay: 0.3
	});

	// Hold
	tl.to(ragnarokText, { duration: 1.5 });

	// Fade away
	tl.to(ragnarokText, {
		opacity: 0,
		scale: 0.8,
		duration: 0.5,
		onComplete: () => cleanup(ragnarokText)
	});

	// Particle explosions — anchored to the arena canvas, not the window
	gameEffectCoordinator.scheduleSequence({
		owner: 'poker-renderer',
		lane: 'ragnarok-particles',
		key: 'ragnarok',
		priority: 'critical',
		delaysMs: [800, 1_000, 1_200],
		run: (stepIndex) => {
			const center = getDramaContainerPoint(container);
			if (stepIndex === 0) {
				spawnParticleBurst(center.x, center.y, 25, ELEMENT_PALETTES.fire);
				spawnImpactRing(center.x, center.y, RED_PALETTE);
			} else {
				const direction = stepIndex === 1 ? -1 : 1;
				spawnParticleBurst(center.x + direction * 100, center.y, 20, ELEMENT_PALETTES.fire);
			}
		},
	});

	// Heavy screen shake — wrapper, not viewport (see getShakeTarget)
	const shakeTarget = getShakeTarget();
	if (shakeTarget) {
		gsap.to(shakeTarget, {
			x: 'random(-6, 6)',
			y: 'random(-4, 4)',
			duration: 0.1,
			repeat: 8,
			yoyo: true,
			ease: 'none',
			delay: 0.8,
			onComplete: () => { gsap.set(shakeTarget, { x: 0, y: 0 }); }
		});
	}
}

/**
 * Showdown damage delivery — damage number flies from winner to loser
 */
/**
 * Lethal cue for killing blows. Keep it local to poker's VFX layer so it
 * cannot slow unrelated GSAP timelines or delay gameplay cleanup callbacks.
 */
function playLethalCue(container: HTMLElement) {
	gsap.fromTo(container,
		{ filter: 'contrast(1.25) saturate(1.35)' },
		{ filter: 'none', duration: 1.2, ease: 'power2.out' }
	);
}

export function playShowdownDamageVFX(
	damage: number,
	isPlayerWinner: boolean,
	handRankDiff: number,
	isLethal: boolean = false
) {
	const container = getOrCreateContainer();
	if (!container) return;

	const winner = getArenaVfxHeroTarget(isPlayerWinner ? 'player' : 'opponent');
	const loser = getArenaVfxHeroTarget(isPlayerWinner ? 'opponent' : 'player');
	if (!winner || !loser) return;

	const winRect = winner.getBoundingClientRect();
	const loseRect = loser.getBoundingClientRect();
	const startX = winRect.left + winRect.width / 2;
	const startY = winRect.top + winRect.height / 2;
	const endX = loseRect.left + loseRect.width / 2;
	const endY = loseRect.top + loseRect.height / 2;

	// Scale by hand gap
	const isCrushing = handRankDiff >= 5;
	const isSolid = handRankDiff >= 3;
	const dmgSize = isCrushing ? 4 : isSolid ? 3 : 2;
	const dmgColor = isCrushing ? '#fbbf24' : '#ef4444';

	// Flying damage number
	const dmgText = createDiv({
		left: `${startX}px`,
		top: `${startY}px`,
		fontSize: `${dmgSize}rem`,
		fontWeight: '900',
		fontFamily: "'Cinzel', 'Georgia', serif",
		color: dmgColor,
		textShadow: `0 0 15px ${dmgColor}, 0 4px 8px rgba(0,0,0,0.8)`,
		zIndex: '15',
		transform: 'translate(-50%, -50%)'
	});
	dmgText.textContent = `-${damage}`;
	container.appendChild(dmgText);

	const tl = gsap.timeline({ onComplete: () => cleanup(dmgText) });

	tl.to(dmgText, {
		left: endX,
		top: endY,
		duration: 0.5,
		ease: 'power2.in'
	});

	// Impact on loser
	tl.call(() => {
		const dmgPalette = isCrushing ? GOLD_PALETTE : RED_PALETTE;
		spawnImpactRing(endX, endY, dmgPalette);
		if (isCrushing) {
			spawnParticleBurst(endX, endY, 20, ELEMENT_PALETTES.fire);
		}
	});

	tl.to(dmgText, {
		opacity: 0,
		scale: 1.5,
		duration: 0.3
	});

	// Loser hero shake (scaled by gap)
	const shakeIntensity = isCrushing ? 8 : isSolid ? 5 : 3;
	const shakeDuration = isCrushing ? 0.4 : 0.25;
	gsap.to(loser, {
		x: `random(-${shakeIntensity}, ${shakeIntensity})`,
		duration: 0.06,
		repeat: Math.floor(shakeDuration / 0.06),
		yoyo: true,
		delay: 0.5,
		onComplete: () => { gsap.set(loser, { x: 0 }); }
	});

	// Lethal slow-motion — cinematic killing blow
	if (isLethal) {
		playLethalCue(container);
	}

	// Crushing win — screen flash
	if (isCrushing) {
		const flash = createDiv({
			inset: '0',
			background: `linear-gradient(${isPlayerWinner ? '0deg' : '180deg'}, ${dmgColor}22 0%, transparent 50%)`,
		});
		container.appendChild(flash);
		gsap.to(flash, {
			opacity: 0,
			duration: 0.6,
			delay: 0.5,
			onComplete: () => cleanup(flash)
		});
	}
}


// ═══════════════════════════════════════════════════
// PHASE BANNER DRAMA
// ═══════════════════════════════════════════════════

/**
 * Phase-specific screen effects triggered when a new phase banner shows
 */
export function playPhaseDramaVFX(phase: string) {
	const SHAKE_PHASES = new Set(['pre_flop', 'faith', 'foresight', 'destiny']);
	if (!SHAKE_PHASES.has(phase)) return;

	/*
	 * Horizontal slash line REMOVED.  Used to inject a `width: 100%` div
		 * into the old document-level VFX container, painting
	 * a 1920+ px coloured line straight across the screen. This is the
	 * "linea roja que traspasa la mesa" the user reported on every PRE_FLOP
	 * transition. If a phase-change accent is desired in the future, mount
	 * it INSIDE `.zone-board` (the table) — never the document-level VFX
	 * layer — and constrain to the table's dimensions.
	 */

	// Subtle screen shake (kept — it's vw-shake on the viewport itself,
	// not a foreign element injected outside the canvas).
	/* Screen shake target is the WRAPPER, not `.game-viewport`. The inner
	   .game-viewport carries the critical inline transform
	   `translate(offsetX, offsetY) scale(scale)` set by GameViewport.tsx for
	   responsive canvas scaling — and GSAP overwrites the entire transform
	   property when animating `x`/`y`, blowing away the scale on first
	   shake and never restoring it. Targeting `.game-viewport-wrapper`
	   (which has no transform of its own) is safe. */
	const shakeTarget = getShakeTarget();
	if (shakeTarget) {
		gsap.to(shakeTarget, {
			x: 'random(-2, 2)',
			duration: 0.08,
			repeat: 2,
			yoyo: true,
			ease: 'none',
			onComplete: () => { gsap.set(shakeTarget, { x: 0, y: 0 }); }
		});
	}
}


// ═══════════════════════════════════════════════════
// MOMENTUM / STREAK EFFECTS
// ═══════════════════════════════════════════════════

/**
 * Streak announcement — "DOMINATION" / "DEFIANCE" / "LAST STAND"
 */
export function playStreakAnnouncementVFX(
	text: string,
	color: string
) {
	const container = getOrCreateContainer();
	if (!container) return;

	const announcement = createDiv({
		left: '50%',
		top: '50%',
		transform: 'translate(-50%, -50%) scale(1.5)',
		fontSize: '3rem',
		fontFamily: "'Cinzel', 'Georgia', serif",
		fontWeight: '900',
		color,
		textShadow: `0 0 20px ${color}, 0 0 40px ${color}88, 0 4px 8px rgba(0,0,0,0.8)`,
		letterSpacing: '6px',
		textTransform: 'uppercase',
		whiteSpace: 'nowrap',
		zIndex: '15',
		opacity: '0'
	});
	announcement.textContent = text;
	container.appendChild(announcement);

	const tl = gsap.timeline({ onComplete: () => cleanup(announcement) });
	tl.to(announcement, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
	tl.to(announcement, { duration: 1 });
	tl.to(announcement, { opacity: 0, y: -30, duration: 0.4 });
}


// ═══════════════════════════════════════════════════
// HAND STRENGTH CHANGE FLASH
// ═══════════════════════════════════════════════════

/**
 * Flash effect when hand rank improves
 */
export function playHandImprovementVFX(tier: 'low' | 'mid' | 'high' | 'godly') {
	const colors: Record<string, string> = {
		low: '#e5e7eb',
		mid: '#38bdf8',
		high: '#f5c542',
		godly: '#b7791f',
	};
	const color = colors[tier] || '#e2e8f0';

	// Edge glow for high+ improvements
	if (tier === 'high' || tier === 'godly') {
		const container = getOrCreateContainer();
		if (!container) return;
		const glow = createDiv({
			inset: '0',
			boxShadow: `inset 0 0 40px ${color}33`,
		});
		container.appendChild(glow);
		gsap.to(glow, {
			opacity: 0,
			duration: 0.6,
			onComplete: () => cleanup(glow)
		});
	}

	// Rumble for godly hands — wrapper, not viewport (see getShakeTarget)
	if (tier === 'godly') {
		const shakeTarget = getShakeTarget();
		if (shakeTarget) {
			gsap.to(shakeTarget, {
				x: 'random(-1, 1)',
				duration: 0.06,
				repeat: 3,
				yoyo: true,
				ease: 'none',
				onComplete: () => { gsap.set(shakeTarget, { x: 0, y: 0 }); }
			});
		}
	}
}


// ═══════════════════════════════════════════════════
// AMBIENT TENSION
// ═══════════════════════════════════════════════════

/**
 * Set tension level on the viewport — controls ambient CSS variables
 */
export function setTensionLevel(level: 'low' | 'medium' | 'high' | 'allin') {
	const viewport = getArenaVfxLayer(ARENA_VFX_LAYERS.viewport);
	if (!viewport) return;

	viewport.dataset.tensionLevel = level;
}


// ═══════════════════════════════════════════════════
// PROCEDURAL AUDIO (Web Audio API)
// ═══════════════════════════════════════════════════

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
	try {
		if (!audioCtx) audioCtx = new AudioContext();
		return audioCtx;
	} catch {
		return null;
	}
}

/**
 * Deep bass hit for re-raise pressure
 */
function playPressureBassHit(level: number) {
	const ctx = getAudioCtx();
	if (!ctx) return;

	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.type = 'sine';
	osc.frequency.setValueAtTime(50 + level * 10, ctx.currentTime);
	osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.2);

	const volume = Math.min(0.15 + level * 0.05, 0.35);
	gain.gain.setValueAtTime(volume, ctx.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

	osc.start(ctx.currentTime);
	osc.stop(ctx.currentTime + 0.3);
}

/**
 * Card slam sound
 */
export function playCardSlamSound() {
	const ctx = getAudioCtx();
	if (!ctx) return;

	// Noise burst filtered low = thump
	const bufferSize = ctx.sampleRate * 0.05;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) {
		data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
	}

	const source = ctx.createBufferSource();
	source.buffer = buffer;

	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(200, ctx.currentTime);

	const gain = ctx.createGain();
	gain.gain.setValueAtTime(0.2, ctx.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

	source.connect(filter);
	filter.connect(gain);
	gain.connect(ctx.destination);
	source.start(ctx.currentTime);
}

/**
 * Steel clash for call action
 */
export function playClashSound() {
	const ctx = getAudioCtx();
	if (!ctx) return;

	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.type = 'triangle';
	osc.frequency.setValueAtTime(800, ctx.currentTime);
	osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);

	gain.gain.setValueAtTime(0.12, ctx.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

	osc.start(ctx.currentTime);
	osc.stop(ctx.currentTime + 0.15);
}

// ============================================================
// 3-Family VFX separation
// ============================================================
// Two new functions, one per non-default family. They are the
// activation animations for the family axis (commit feat(card-frame)
// family CSS). Both:
//   - Particle burst at the caster zone.
//   - Impact ring.
//   - One-shot vignette overlay (family palette).
//   - Stamp .is-casting / .is-activating on the right frame so the
//     per-family keyframe (added in CardFrame.css) plays.
// Wire-up lives at the VisualEvent boundary; gameplay slices only emit events.
// ============================================================

import type { PokerSpellEffectType } from '../../types/CardTypes';
import type { WagerType } from '../vfx/events';

const POKER_SPELL_PALETTES: Record<PokerSpellEffectType, ParticleColor> = {
	bluff_rune:       { primary: '#38bdf8', secondary: '#7dd3fc', glow: 'rgba(56,189,248,0.55)' },
	fate_peek:        { primary: '#38bdf8', secondary: '#e5e7eb', glow: 'rgba(56,189,248,0.55)' },
	stamina_shield:   { primary: '#38bdf8', secondary: '#7dd3fc', glow: 'rgba(56,189,248,0.55)' },
	hole_swap:        { primary: '#f5c542', secondary: '#b7791f', glow: 'rgba(245,197,66,0.5)' },
	echo_bet:         { primary: '#38bdf8', secondary: '#7dd3fc', glow: 'rgba(56,189,248,0.5)' },
	shadow_fold:      { primary: '#334155', secondary: '#111827', glow: 'rgba(51,65,85,0.55)' },
	run_twice:        { primary: '#38bdf8', secondary: '#e5e7eb', glow: 'rgba(56,189,248,0.45)' },
	river_rewrite:    { primary: '#38bdf8', secondary: '#7dd3fc', glow: 'rgba(56,189,248,0.55)' },
	norns_glimpse:    { primary: '#f5c542', secondary: '#f59e0b', glow: 'rgba(245,197,66,0.5)' },
	fold_curse:       { primary: '#dc2626', secondary: '#fca5a5', glow: 'rgba(220,38,38,0.55)' },
	blood_bet:        { primary: '#dc2626', secondary: '#fca5a5', glow: 'rgba(220,38,38,0.6)' },
	void_stare:       { primary: '#05070d', secondary: '#38bdf8', glow: 'rgba(56,189,248,0.4)' },
	all_in_aura:      { primary: '#f5c542', secondary: '#fde68a', glow: 'rgba(245,197,66,0.55)' },
	ragnarok_gambit:  { primary: '#dc2626', secondary: '#fca5a5', glow: 'rgba(220,38,38,0.6)' },
	destiny_override: { primary: '#f5c542', secondary: '#fef3c7', glow: 'rgba(245,197,66,0.55)' },
};

const WAGER_PALETTES: Record<WagerType, ParticleColor> = {
	showdown_win_armor:             { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	showdown_coin_flip:             { primary: '#facc15', secondary: '#fef9c3', glow: 'rgba(250,204,21,0.6)' },
	showdown_win_rank_damage:       { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	showdown_aoe_damage:            { primary: '#f59e0b', secondary: '#fcd34d', glow: 'rgba(245,158,11,0.6)' },
	showdown_hand_rank_draw:        { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	showdown_win_draw_and_damage:   { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	double_showdown_multiplier:     { primary: '#fde047', secondary: '#fef08a', glow: 'rgba(253,224,71,0.6)' },
	all_in_bonus_with_cost:         { primary: '#dc2626', secondary: '#fca5a5', glow: 'rgba(220,38,38,0.6)' },
	on_opponent_fold_heal:          { primary: '#84cc16', secondary: '#bef264', glow: 'rgba(132,204,22,0.6)' },
	fold_penalty_to_healing:        { primary: '#84cc16', secondary: '#bef264', glow: 'rgba(132,204,22,0.6)' },
	all_in_buff_minions:            { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	reveal_opponent_hole_cards:     { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	peek_next_community_card:       { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	hide_bet_actions:               { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	increase_min_bet:               { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	reduce_fold_penalty:            { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	double_blinds_bonus_multiplier: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	betting_round_damage:           { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	hand_rank_upgrade:              { primary: '#facc15', secondary: '#fef9c3', glow: 'rgba(250,204,21,0.6)' },
};

/**
 * Cast a poker spell. Indigo palette per effect type, scale-punch
 * keyframe on the spell tray frames, indigo vignette fade.
 */
export function playPokerSpellCast(
	effectType: PokerSpellEffectType,
	caster: 'player' | 'opponent'
): void {
	const container = getOrCreateContainer();
	if (!container) return;
	const palette = POKER_SPELL_PALETTES[effectType] || POKER_SPELL_PALETTES.bluff_rune;
	const burst = getDramaContainerPoint(container, caster === 'player' ? 0.75 : 0.25);

	spawnParticleBurst(burst.x, burst.y, 22, palette);
	spawnImpactRing(burst.x, burst.y, palette);

	getArenaVfxSpellTrayCards().forEach((el, index) => {
		stampCardMotionClass(el, 'is-casting', false);
		// Force reflow so the animation re-fires for repeat casts.
		void el.offsetWidth;
		stampCardMotionClass(el, 'is-casting', true);
		gameEffectCoordinator.schedule({
			owner: 'poker-renderer',
			lane: 'spell-state',
			key: `spell-cast:${index}`,
			priority: 'normal',
			delayMs: 1_500,
			run: () => stampCardMotionClass(el, 'is-casting', false),
		});
	});
}

/**
 * Activate a wager effect. Gold/amber palette, rotate-pulse keyframe
 * on the wager-bearing minion frame, gold vignette fade.
 */
export function playWagerActivate(
	wagerType: WagerType,
	side: 'player' | 'opponent'
): void {
	const container = getOrCreateContainer();
	if (!container) return;
	const palette = WAGER_PALETTES[wagerType] || WAGER_PALETTES.showdown_win_armor;
	const burst = getDramaContainerPoint(container, side === 'player' ? 0.7 : 0.3);

	spawnParticleBurst(burst.x, burst.y, 14, palette);
	spawnImpactRing(burst.x, burst.y, palette);

	const vignette = createDiv({
		inset: '0',
		background: `radial-gradient(ellipse at center, ${palette.primary}22 0%, transparent 55%)`,
		zIndex: '1',
	});
	container.appendChild(vignette);
	gsap.to(vignette, { opacity: 0, duration: 0.8, onComplete: () => cleanup(vignette) });

	getArenaVfxWagerTargets(side).forEach((el, index) => {
		stampCardMotionClass(el, 'is-activating', false);
		void el.offsetWidth;
		stampCardMotionClass(el, 'is-activating', true);
		gameEffectCoordinator.schedule({
			owner: 'poker-renderer',
			lane: 'wager-state',
			key: `wager-activate:${side}:${index}`,
			priority: 'normal',
			delayMs: 1_100,
			run: () => stampCardMotionClass(el, 'is-activating', false),
		});
	});
}

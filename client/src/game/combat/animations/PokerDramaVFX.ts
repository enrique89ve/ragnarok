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
	getArenaVfxTargets,
	getArenaVfxMinionCardElements,
	getArenaVfxWagerTargets,
} from '../arenaVfxTargets';
import { gameEffectCoordinator } from '@/game/effects/core/gameEffectCoordinator';
import { stampCardMotionClass } from '../../components/card/applyCardMotion';
import { cinemaReadingLane } from '../../poker/layout/boardOccupancy';
import {
	resolveCallClashEndpoints,
	resolvePokerVfxIntentForCall,
	resolvePokerVfxIntentForRaise,
	resolvePokerVfxIntentForSpell,
	resolvePokerVfxIntentForWager,
	type PokerVfxResolvedIntent,
} from './pokerVfxCatalog';
import {
	playCallClashVfx,
	playLocalPulseOnMinionRow,
	playPokerVfxIntent,
	playShowdownAoeWagerVfx,
} from './pokerVfxMotion';

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

function markCenterSlam(el: HTMLElement): HTMLElement {
	el.dataset.centerSlam = '1';
	return el;
}

function cinemaSlamAnchor(): { top: string; left: string; transform: string } {
	const lane = cinemaReadingLane();
	const centerY = lane.y + lane.height / 2;
	return {
		left: '50%',
		top: `${centerY}px`,
		transform: 'translate(-50%, -50%)',
	};
}

function createCinemaSlamPlate(title: string, accentColor: string): HTMLDivElement {
	const plate = document.createElement('div');
	plate.className = 'cinema-lane-plate cinema-lane-slam';
	plate.style.setProperty('--cinema-accent', accentColor);
	Object.assign(plate.style, {
		position: 'absolute',
		pointerEvents: 'none',
		opacity: '0',
		...cinemaSlamAnchor(),
	});

	const label = document.createElement('span');
	label.className = 'cinema-lane-slam__title';
	label.style.color = accentColor;
	label.style.textShadow = `0 0 16px ${accentColor}, 0 0 32px ${accentColor}88, 0 2px 4px rgba(0,0,0,0.85)`;
	label.textContent = title;
	plate.appendChild(label);
	markCenterSlam(plate);
	return plate;
}

export function dismissCenterSlams(): void {
	if (typeof document === 'undefined') return;
	const container = document.getElementById(DRAMA_CONTAINER_ID);
	if (!container) return;
	container.querySelectorAll<HTMLElement>('[data-center-slam]').forEach((node) => {
		gsap.killTweensOf(node);
		node.remove();
	});
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
	spades:   { primary: '#334155', secondary: '#e5e7eb', glow: 'rgba(51,65,85,0.55)' },
	hearts:   { primary: '#ef4444', secondary: '#fca5a5', glow: 'rgba(239,68,68,0.6)' },
	diamonds: { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' },
	clubs:    { primary: '#22c55e', secondary: '#86efac', glow: 'rgba(34,197,94,0.6)' },
};

const GOLD_PALETTE: ParticleColor = { primary: '#fbbf24', secondary: '#fde68a', glow: 'rgba(251,191,36,0.6)' };
const RED_PALETTE: ParticleColor = { primary: '#ef4444', secondary: '#fca5a5', glow: 'rgba(239,68,68,0.6)' };
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
 * ATTACK (raise) — hero lunge + stake travels to board pot sink (hourglass), not HUD chrome.
 */
export function playRaiseVFX(isPlayer: boolean, intent?: PokerVfxResolvedIntent) {
	const side = isPlayer ? 'player' : 'opponent';
	const hero = getArenaVfxHeroTarget(side);
	if (!hero) return;

	const resolved = intent ?? resolvePokerVfxIntentForRaise(side);

	const tl = gsap.timeline();
	tl.to(hero, {
		y: isPlayer ? -8 : 8,
		scale: 1.03,
		duration: 0.2,
		ease: 'power2.out',
	});
	tl.to(hero, {
		y: 0,
		scale: 1,
		duration: 0.4,
		ease: 'power2.inOut',
	});

	if (resolved.targetPoint) {
		playPokerVfxIntent(resolved);
	} else {
		const rect = hero.getBoundingClientRect();
		spawnImpactRing(rect.left + rect.width / 2, rect.top + rect.height / 2, GOLD_PALETTE);
	}
}

/**
 * COUNTER (re-raise) — THE BIG ONE.
 * Time dilation, pressure shake, hero slam forward, risk pulse.
 * Escalates with reraise level (1st, 2nd, 3rd+).
 */
export function playReraiseVFX(
	isPlayer: boolean,
	reraiseLevel: number = 1,
	intent?: PokerVfxResolvedIntent,
) {
	const side = isPlayer ? 'player' : 'opponent';
	const resolved = intent ?? resolvePokerVfxIntentForRaise(side);
	const shakeTarget = getShakeTarget();

	// Pressure shake only at high commitment — kept separate from stake motion.
	if (shakeTarget && reraiseLevel >= 3) {
		const shakeIntensity = Math.min(2 + reraiseLevel, 5);
		gsap.to(shakeTarget, {
			x: `random(-${shakeIntensity}, ${shakeIntensity})`,
			y: `random(-${shakeIntensity * 0.4}, ${shakeIntensity * 0.4})`,
			duration: 0.15,
			repeat: 2 + reraiseLevel,
			yoyo: true,
			ease: 'sine.inOut',
			onComplete: () => { gsap.set(shakeTarget, { x: 0, y: 0 }); },
		});
	}

	const hero = getArenaVfxHeroTarget(side);
	if (hero) {
		const tl = gsap.timeline();
		tl.to(hero, {
			y: isPlayer ? -16 : 16,
			scale: 1.08,
			duration: 0.15,
			ease: 'power3.out',
		});
		tl.to(hero, {
			y: 0,
			scale: 1,
			duration: 0.5,
			ease: 'elastic.out(1, 0.5)',
		});

		const rect = hero.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		spawnParticleBurst(cx, cy, 12, ELEMENT_PALETTES.fire);
		spawnImpactRing(cx, cy, GOLD_PALETTE);
	}

	playPokerVfxIntent(resolved, { stakeStrength: 'firm' });
	playPressureBassHit(reraiseLevel);
}

/**
 * ENGAGE (call) — dual travel-impact clash at the lane midpoint.
 */
export function playCallVFX(intent?: PokerVfxResolvedIntent) {
	const resolved = intent ?? resolvePokerVfxIntentForCall();

	const heroes = [
		...getArenaVfxTargets(ARENA_VFX_TARGETS.playerHero),
		...getArenaVfxTargets(ARENA_VFX_TARGETS.opponentHero),
	];
	heroes.forEach(hero => {
		gsap.fromTo(
			hero,
			{ filter: 'brightness(1.35)' },
			{ filter: 'brightness(1)', duration: 0.2 },
		);
	});

	const endpoints = resolveCallClashEndpoints();
	if (endpoints.center) {
		playCallClashVfx(endpoints, resolved.palette);
	}
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
	_isWinner: boolean,
	_isPlayer: boolean
) {
	if (!rankName || rank <= 1) return; // Don't announce High Card

	const container = getOrCreateContainer();
	if (!container) return;

	let color = '#e5e7eb';
	if (rank >= 3) color = '#38bdf8';
	if (rank >= 5) color = '#f5c542';
	if (rank >= 7) color = '#b7791f';
	if (rank >= 9) color = '#dc2626';

	const displayName = rankName.toUpperCase();
	const plate = createCinemaSlamPlate(displayName, color);
	const title = plate.querySelector('.cinema-lane-slam__title') as HTMLElement | null;
	if (title && displayName.length > 14) {
		title.classList.add('cinema-lane-slam__title--compact');
	}
	plate.style.zIndex = '10';
	container.appendChild(plate);

	const tl = gsap.timeline({ onComplete: () => cleanup(plate) });
	gsap.set(plate, { opacity: 0, scale: 1.06 });

	tl.to(plate, {
		opacity: 1,
		scale: 1,
		duration: 0.3,
		ease: 'back.out(2)',
	});

	tl.to(plate, { duration: 3 });

	tl.to(plate, {
		opacity: 0,
		scale: 0.96,
		duration: 0.4,
		ease: 'power2.in',
	});

	// Screen flash for strong hands
	if (rank >= 7) {
		const flash = createDiv({
			inset: '0',
			background: `radial-gradient(circle at 50% 50%, ${color}22 0%, transparent 50%)`,
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

	const flash = createDiv({
		inset: '0',
		background: 'radial-gradient(circle at 50% 50%, rgba(220,38,38,0.45) 0%, rgba(245,197,66,0.18) 28%, transparent 62%)',
		zIndex: '20',
	});
	container.appendChild(flash);

	markCenterSlam(flash);
	const flashTl = gsap.timeline();
	flashTl.fromTo(flash, { opacity: 0 }, { opacity: 1, duration: 0.12 });
	flashTl.to(flash, {
		opacity: 0,
		duration: 0.28,
		onComplete: () => cleanup(flash),
	}, 0.2);

	// RAGNAROK text — same 3.7s window as the other center titles
	const ragnarokPlate = createCinemaSlamPlate('RAGNAROK', '#dc2626');
	const ragnarokTitle = ragnarokPlate.querySelector('.cinema-lane-slam__title') as HTMLElement;
	if (ragnarokTitle) {
		ragnarokTitle.style.letterSpacing = '0.18em';
	}
	ragnarokPlate.style.zIndex = '25';
	container.appendChild(ragnarokPlate);

	gsap.set(ragnarokPlate, { scale: 1.15 });
	const textTl = gsap.timeline({ onComplete: () => cleanup(ragnarokPlate) });
	textTl.to(ragnarokPlate, {
		opacity: 1,
		scale: 1,
		duration: 0.3,
		ease: 'back.out(1.5)',
	});
	textTl.to(ragnarokPlate, { duration: 3 });
	textTl.to(ragnarokPlate, {
		opacity: 0,
		scale: 0.92,
		duration: 0.4,
	});

	// Heavy screen shake — wrapper, not viewport (see getShakeTarget)
	const shakeTarget = getShakeTarget();
	if (shakeTarget) {
		gsap.to(shakeTarget, {
			x: 'random(-6, 6)',
			y: 'random(-4, 4)',
			duration: 0.1,
			repeat: 4,
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

	const loseRect = loser.getBoundingClientRect();
	const endX = loseRect.left + loseRect.width / 2;
	const endY = loseRect.top + loseRect.height / 2;

	const isCrushing = handRankDiff >= 5;
	const isSolid = handRankDiff >= 3;
	const dmgColor = isCrushing ? '#fbbf24' : '#ef4444';

	const dmgPalette = isCrushing ? GOLD_PALETTE : RED_PALETTE;
	spawnImpactRing(endX, endY, dmgPalette);
	if (isCrushing) {
		spawnParticleBurst(endX, endY, 20, ELEMENT_PALETTES.fire);
	}

	const shakeIntensity = isCrushing ? 8 : isSolid ? 5 : 3;
	const shakeDuration = isCrushing ? 0.4 : 0.25;
	gsap.to(loser, {
		x: `random(-${shakeIntensity}, ${shakeIntensity})`,
		duration: 0.06,
		repeat: Math.floor(shakeDuration / 0.06),
		yoyo: true,
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
	const SHAKE_PHASES = new Set(['destiny']);
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

	const announcement = createCinemaSlamPlate(text, color);
	container.appendChild(announcement);

	gsap.set(announcement, { scale: 1.15 });
	const tl = gsap.timeline({ onComplete: () => cleanup(announcement) });
	tl.to(announcement, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
	tl.to(announcement, { duration: 3 });
	tl.to(announcement, { opacity: 0, y: -8, duration: 0.4 });
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
	const color = colors[tier] || '#e5e7eb';
	const glow = tier === 'godly' || tier === 'high' ? 16 : 8;

	for (let slotIndex = 0; slotIndex < 5; slotIndex += 1) {
		const slot = getArenaVfxCommunitySlot(slotIndex);
		if (!slot) continue;
		gsap.fromTo(slot, {
			boxShadow: `0 0 0px ${color}`,
		}, {
			boxShadow: `0 0 ${glow}px ${color}`,
			duration: 0.16,
			yoyo: true,
			repeat: 1,
			onComplete: () => { gsap.set(slot, { boxShadow: 'none' }); },
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

/**
 * Cast a poker spell — travel-impact from caster hero to spell tray + frame glow.
 */
export function playPokerSpellCast(
	effectType: PokerSpellEffectType,
	caster: 'player' | 'opponent',
	intent?: PokerVfxResolvedIntent,
): void {
	const resolved = intent ?? resolvePokerVfxIntentForSpell(effectType, caster);
	if (resolved.sourcePoint || resolved.targetPoint) {
		playPokerVfxIntent(resolved, { seed: `spell-${effectType}` });
	} else {
		const container = getOrCreateContainer();
		if (container) {
			const burst = getDramaContainerPoint(container, caster === 'player' ? 0.75 : 0.25);
			spawnParticleBurst(burst.x, burst.y, 8, resolved.palette);
			spawnImpactRing(burst.x, burst.y, resolved.palette);
		}
	}

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
			delayMs: 640,
			run: () => stampCardMotionClass(el, 'is-casting', false),
		});
	});
}

/**
 * Activate a wager effect on the minion that carries it.
 * The pulse stays on that frame. The board does not dim.
 */
export function playWagerActivate(
	wagerType: WagerType,
	side: 'player' | 'opponent',
	intent?: PokerVfxResolvedIntent,
): void {
	const resolved = intent ?? resolvePokerVfxIntentForWager(wagerType, side);
	if (wagerType === 'showdown_aoe_damage') {
		playShowdownAoeWagerVfx(resolved, side);
	} else if (wagerType === 'all_in_buff_minions') {
		playLocalPulseOnMinionRow(side, resolved.palette);
		if (resolved.sourcePoint) {
			playPokerVfxIntent(resolved, { seed: `wager-${wagerType}` });
		}
	} else if (resolved.targetPoint) {
		playPokerVfxIntent(resolved, { seed: `wager-${wagerType}` });
	} else {
		const container = getOrCreateContainer();
		if (container) {
			const burst = getDramaContainerPoint(container, side === 'player' ? 0.7 : 0.3);
			spawnParticleBurst(burst.x, burst.y, 6, resolved.palette);
			spawnImpactRing(burst.x, burst.y, resolved.palette);
		}
	}

	const wagerFrames = wagerType === 'all_in_buff_minions'
		? getArenaVfxMinionCardElements(side)
		: resolved.sourceInstanceId
			? (() => {
				const el = document.querySelector<HTMLElement>(
					`[data-instance-id="${resolved.sourceInstanceId}"]`,
				);
				return el ? [el] : getArenaVfxWagerTargets(side);
			})()
			: getArenaVfxWagerTargets(side);

	wagerFrames.forEach((el, index) => {
		stampCardMotionClass(el, 'is-activating', false);
		void el.offsetWidth;
		stampCardMotionClass(el, 'is-activating', true);
		gameEffectCoordinator.schedule({
			owner: 'poker-renderer',
			lane: 'wager-state',
			key: `wager-activate:${side}:${index}`,
			priority: 'normal',
			delayMs: 600,
			run: () => stampCardMotionClass(el, 'is-activating', false),
		});
	});
}

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

const DRAMA_CONTAINER_ID = 'poker-drama-vfx-layer';
const MAX_ORPHAN_AGE_MS = 6000;

function getOrCreateContainer(): HTMLDivElement {
	let el = document.getElementById(DRAMA_CONTAINER_ID) as HTMLDivElement | null;
	if (!el) {
		el = document.createElement('div');
		el.id = DRAMA_CONTAINER_ID;
		Object.assign(el.style, {
			position: 'fixed', inset: '0', pointerEvents: 'none',
			zIndex: '9400', overflow: 'hidden'
		});
		document.body.appendChild(el);
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
	const slots = document.querySelectorAll('.community-slot');
	const slot = slots[slotIndex] as HTMLElement | undefined;
	if (!slot) return;

	const rect = slot.getBoundingClientRect();
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;

	// Add slam class for CSS impact
	slot.classList.add('card-dealing');

	const tl = gsap.timeline({
		onComplete: () => slot.classList.remove('card-dealing')
	});

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

	// Table shake on impact — move the viewport slightly
	const viewport = document.querySelector('.game-viewport') as HTMLElement;
	if (viewport) {
		const shakeIntensity = isRiver ? 4 : 2;
		tl.to(viewport, {
			x: `random(-${shakeIntensity}, ${shakeIntensity})`,
			y: `random(-${shakeIntensity / 2}, ${shakeIntensity / 2})`,
			duration: 0.08,
			repeat: 3,
			yoyo: true,
			ease: 'none'
		}, '-=0.2');
		tl.set(viewport, { x: 0, y: 0 });
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

/**
 * Animate flop reveal — 3 staggered card slams
 */
export function playFlopRevealVFX(cards: Array<{ suit: string; value: string }>) {
	cards.forEach((card, i) => {
		setTimeout(() => {
			playCardDealVFX(i, card.suit, card.value, false);
		}, i * 200);
	});
}

/**
 * Animate turn reveal — single card with extra weight
 */
export function playTurnRevealVFX(card: { suit: string; value: string }) {
	playCardDealVFX(3, card.suit, card.value, false);
}

/**
 * Animate river reveal — slow-mo dramatic card
 */
export function playRiverRevealVFX(card: { suit: string; value: string }) {
	playCardDealVFX(4, card.suit, card.value, true);
}


// ═══════════════════════════════════════════════════
// BETTING ACTION ANIMATIONS
// ═══════════════════════════════════════════════════

/**
 * ATTACK (raise) — hero lunges forward, gold flash
 */
export function playRaiseVFX(isPlayer: boolean) {
	const selector = isPlayer
		? '[data-hero-role="player"]'
		: '[data-hero-role="opponent"]';
	const hero = document.querySelector(selector) as HTMLElement;
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
	const otherSelector = isPlayer
		? '[data-hero-role="opponent"]'
		: '[data-hero-role="player"]';
	const otherHero = document.querySelector(otherSelector) as HTMLElement;
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
	const viewport = document.querySelector('.game-viewport') as HTMLElement;

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
	if (viewport) {
		const shakeIntensity = Math.min(2 + reraiseLevel, 5);
		const shakeDuration = 0.15;
		const repeats = 2 + reraiseLevel;
		gsap.to(viewport, {
			x: `random(-${shakeIntensity}, ${shakeIntensity})`,
			y: `random(-${shakeIntensity * 0.4}, ${shakeIntensity * 0.4})`,
			duration: shakeDuration,
			repeat: repeats,
			yoyo: true,
			ease: 'sine.inOut',
			onComplete: () => { gsap.set(viewport, { x: 0, y: 0 }); }
		});
	}

	// --- Hero SLAM forward ---
	const heroSelector = isPlayer
		? '[data-hero-role="player"]'
		: '[data-hero-role="opponent"]';
	const hero = document.querySelector(heroSelector) as HTMLElement;
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
	const otherSelector = isPlayer
		? '[data-hero-role="opponent"]'
		: '[data-hero-role="player"]';
	const otherHero = document.querySelector(otherSelector) as HTMLElement;
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
	const riskBadge = document.querySelector('.risk-display, .pot-display') as HTMLElement;
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
	// Both heroes flash white briefly
	const heroes = document.querySelectorAll('[data-hero-role]');
	heroes.forEach(hero => {
		gsap.fromTo(hero,
			{ filter: 'brightness(1.6)' },
			{ filter: 'brightness(1)', duration: 0.2 }
		);
	});

	// Center clash spark
	const vw = window.innerWidth / 2;
	const vh = window.innerHeight / 2;
	spawnParticleBurst(vw, vh, 15, LIGHT_PALETTE);
	spawnImpactRing(vw, vh, WHITE_PALETTE);
}

/**
 * DEFEND (check) — subtle shield tint
 */
export function playCheckVFX(isPlayer: boolean) {
	const selector = isPlayer
		? '[data-hero-role="player"]'
		: '[data-hero-role="opponent"]';
	const hero = document.querySelector(selector) as HTMLElement;
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
	const selector = isPlayer
		? '[data-hero-role="player"]'
		: '[data-hero-role="opponent"]';
	const hero = document.querySelector(selector) as HTMLElement;
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
	const otherSelector = isPlayer
		? '[data-hero-role="opponent"]'
		: '[data-hero-role="player"]';
	const otherHero = document.querySelector(otherSelector) as HTMLElement;
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

	// Scale by rank (1-10)
	const fontSize = Math.min(2 + rank * 0.3, 5);
	const glowIntensity = Math.min(0.3 + rank * 0.1, 1);

	// Color by tier
	let color = '#e2e8f0'; // white (low)
	if (rank >= 3) color = '#60a5fa'; // blue (mid)
	if (rank >= 5) color = '#a855f7'; // purple (strong)
	if (rank >= 7) color = '#fbbf24'; // gold (powerful)
	if (rank >= 9) color = '#ef4444'; // red (devastating)

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

	// Particle explosions
	setTimeout(() => {
		const cx = window.innerWidth / 2;
		const cy = window.innerHeight / 2;
		spawnParticleBurst(cx, cy, 25, ELEMENT_PALETTES.fire);
		spawnImpactRing(cx, cy, RED_PALETTE);
		setTimeout(() => spawnParticleBurst(cx - 100, cy, 20, ELEMENT_PALETTES.fire), 200);
		setTimeout(() => spawnParticleBurst(cx + 100, cy, 20, ELEMENT_PALETTES.fire), 400);
	}, 800);

	// Heavy screen shake
	const viewport = document.querySelector('.game-viewport') as HTMLElement;
	if (viewport) {
		gsap.to(viewport, {
			x: 'random(-6, 6)',
			y: 'random(-4, 4)',
			duration: 0.1,
			repeat: 8,
			yoyo: true,
			ease: 'none',
			delay: 0.8,
			onComplete: () => { gsap.set(viewport, { x: 0, y: 0 }); }
		});
	}
}

/**
 * Showdown damage delivery — damage number flies from winner to loser
 */
/**
 * Lethal slow-motion — when the showdown damage is a killing blow,
 * the entire GSAP global timeline slows to 0.35x for 1.2s, then
 * ramps back to 1x. Creates a cinematic "last hit" feeling.
 */
function lethalSlowMotion() {
	gsap.globalTimeline.timeScale(0.35);
	gsap.delayedCall(1.2, () => {
		gsap.to(gsap.globalTimeline, { timeScale: 1, duration: 0.4, ease: 'power2.out' });
	});
}

export function playShowdownDamageVFX(
	damage: number,
	isPlayerWinner: boolean,
	handRankDiff: number,
	isLethal: boolean = false
) {
	const container = getOrCreateContainer();

	const winnerSelector = isPlayerWinner
		? '[data-hero-role="player"]'
		: '[data-hero-role="opponent"]';
	const loserSelector = isPlayerWinner
		? '[data-hero-role="opponent"]'
		: '[data-hero-role="player"]';

	const winner = document.querySelector(winnerSelector) as HTMLElement;
	const loser = document.querySelector(loserSelector) as HTMLElement;
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
		lethalSlowMotion();
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
	const container = getOrCreateContainer();

	const configs: Record<string, { color: string; burstElement: string }> = {
		pre_flop: { color: '#ef4444', burstElement: 'fire' },
		faith: { color: '#8b5cf6', burstElement: 'ice' },
		foresight: { color: '#22c55e', burstElement: 'grass' },
		destiny: { color: '#fbbf24', burstElement: 'fire' }
	};

	const config = configs[phase];
	if (!config) return;

	// Horizontal slash line
	const slash = createDiv({
		left: '0',
		top: '50%',
		width: '100%',
		height: '2px',
		background: `linear-gradient(90deg, transparent 0%, ${config.color}88 20%, ${config.color} 50%, ${config.color}88 80%, transparent 100%)`,
		transform: 'translateY(-50%)',
		zIndex: '5'
	});
	container.appendChild(slash);

	gsap.fromTo(slash,
		{ scaleX: 0 },
		{
			scaleX: 1,
			duration: 0.3,
			ease: 'power2.out',
			onComplete: () => {
				gsap.to(slash, {
					opacity: 0,
					duration: 0.5,
					delay: 1.2,
					onComplete: () => cleanup(slash)
				});
			}
		}
	);

	// Subtle screen shake
	const viewport = document.querySelector('.game-viewport') as HTMLElement;
	if (viewport) {
		gsap.to(viewport, {
			x: 'random(-2, 2)',
			duration: 0.08,
			repeat: 2,
			yoyo: true,
			ease: 'none',
			onComplete: () => { gsap.set(viewport, { x: 0, y: 0 }); }
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
		low: '#e2e8f0',
		mid: '#60a5fa',
		high: '#a855f7',
		godly: '#fbbf24'
	};
	const color = colors[tier] || '#e2e8f0';

	// Edge glow for high+ improvements
	if (tier === 'high' || tier === 'godly') {
		const container = getOrCreateContainer();
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

	// Rumble for godly hands
	if (tier === 'godly') {
		const viewport = document.querySelector('.game-viewport') as HTMLElement;
		if (viewport) {
			gsap.to(viewport, {
				x: 'random(-1, 1)',
				duration: 0.06,
				repeat: 3,
				yoyo: true,
				ease: 'none',
				onComplete: () => { gsap.set(viewport, { x: 0, y: 0 }); }
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
	const viewport = document.querySelector('.game-viewport') as HTMLElement;
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

/**
 * PokerDramaVFX.ts
 *
 * Zero-overlap Poker VFX choreography facade:
 * - All 2D energy/particles/flashes/blasts render inside PixiParticleCanvas (PixiJS v8)
 * - All DOM gestures/slams/pulses use CSS classes scheduled via gameEffectCoordinator
 * - All camera shake flows through the single CSS channel `triggerArenaShake`
 * - All audio flows through the centralized `proceduralAudio` engine (respecting volume/mute)
 *
 * Zero GSAP imports, zero duplicate AudioContext, zero DOM flash divs.
 */

import {
	spawnArcaneVortex,
	spawnArenaFlash,
	spawnBidirectionalSwapArcs,
	spawnDiamondShards,
	spawnDrainStream,
	spawnImpactRing,
	spawnMagicTunnel,
	spawnParticleBurst,
	spawnRisingAura,
	spawnRunePulse,
	spawnShieldDome,
	spawnShowdownBlast,
	spawnSparkBurst,
	spawnStarburstBloom,
	spawnTranslucentRibbon,
	spawnTravelingGlowRing,
	triggerEmotionalImpulse,
	ELEMENT_PALETTES,
	type ParticleColor,
} from '../../animations/PixiParticleCanvas';
import { proceduralAudio } from '../../audio/proceduralAudio';
import {
	ARENA_VFX_LAYERS,
	ARENA_VFX_TARGETS,
	getArenaVfxCommunitySlot,
	getArenaVfxHeroTarget,
	getArenaVfxHoleCardsTarget,
	getArenaVfxLayer,
	getArenaVfxMinionCardElements,
	getArenaVfxSpellTrayCards,
	getArenaVfxStaminaTarget,
	getArenaVfxTargets,
	getArenaVfxWagerTargets,
	getElementCenter,
} from '../arenaVfxTargets';
import { gameEffectCoordinator } from '@/game/effects/core/gameEffectCoordinator';
import { stampCardMotionClass } from '../../components/card/applyCardMotion';
import { cinemaReadingLane } from '../../poker/layout/boardOccupancy';
import { triggerArenaShake } from '../vfx/arenaShake';
import { vfxOrchestrationDirector } from '../vfx/vfxOrchestrationDirector';
import { releaseHeroVisualHp } from '../vfx/visualVitalsHold';
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
import type { PokerSpellEffectType } from '../../types/CardTypes';
import type { WagerType } from '../vfx/events';

const DRAMA_CONTAINER_ID = 'poker-drama-vfx-layer';
const MAX_ORPHAN_AGE_MS = 6000;
const CENTER_SLAM_DURATION_MS = 3700;

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
			position: 'absolute',
			inset: '0',
			pointerEvents: 'none',
			overflow: 'hidden',
		});
	}
	if (el.parentElement !== target) {
		target.appendChild(el);
	}
	return el;
}

function cleanup(el: HTMLElement): void {
	if (el.parentNode) el.parentNode.removeChild(el);
}

function stampCssGesture(
	el: HTMLElement | null,
	className: string,
	durationMs: number,
	key: string,
): void {
	if (!el) return;
	if (el.classList.contains(className)) {
		el.classList.remove(className);
		// Re-add on next animation frame instead of forcing a synchronous `offsetWidth` reflow
		if (typeof requestAnimationFrame === 'function') {
			requestAnimationFrame(() => el.classList.add(className));
		} else {
			el.classList.add(className);
		}
	} else {
		el.classList.add(className);
	}
	gameEffectCoordinator.schedule({
		owner: 'poker-drama-dom',
		lane: 'gesture',
		key,
		priority: 'normal',
		delayMs: durationMs,
		run: () => el.classList.remove(className),
	});
}

function markCenterSlam(el: HTMLElement): HTMLElement {
	el.dataset.centerSlam = '1';
	el.dataset.vfxBorn = String(Date.now());
	return el;
}

function cinemaSlamAnchor(): { top: string; left: string; transform: string } {
	const lane = cinemaReadingLane();
	const centerY = lane.y + lane.height / 2;
	return {
		left: `${lane.x + lane.width / 2}px`,
		top: `${centerY}px`,
		transform: 'translate(-50%, -50%)',
	};
}

function createCinemaSlamPlate(title: string, accentColor: string): HTMLDivElement {
	const plate = document.createElement('div');
	plate.className = 'cinema-lane-plate cinema-lane-slam cinema-lane-slam--active';
	plate.style.setProperty('--cinema-accent', accentColor);
	Object.assign(plate.style, {
		position: 'absolute',
		pointerEvents: 'none',
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

function mountCinemaSlam(plate: HTMLDivElement, key: string): void {
	const container = getOrCreateContainer();
	if (!container) return;
	container.appendChild(plate);
	gameEffectCoordinator.schedule({
		owner: 'poker-drama-dom',
		lane: 'center-slam',
		key,
		priority: 'critical',
		delayMs: CENTER_SLAM_DURATION_MS + 40,
		run: () => cleanup(plate),
	});
}

export function dismissCenterSlams(): void {
	if (typeof document === 'undefined') return;
	gameEffectCoordinator.cancelOwnerLane('poker-drama-dom', 'center-slam');
	const container = document.getElementById(DRAMA_CONTAINER_ID);
	if (!container) return;
	container.querySelectorAll<HTMLElement>('[data-center-slam]').forEach((node) => {
		node.remove();
	});
}

export function killAllPokerVFX(): void {
	gameEffectCoordinator.cancelOwner('poker-drama-dom');
	gameEffectCoordinator.cancelOwner('poker-vfx-dom');
	const container = document.getElementById(DRAMA_CONTAINER_ID);
	if (container) {
		container.innerHTML = '';
	}
}

let pokerOrphanInterval: ReturnType<typeof setInterval> | null = null;

export function startPokerOrphanSweep(): void {
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

export function stopPokerOrphanSweep(): void {
	if (pokerOrphanInterval) {
		clearInterval(pokerOrphanInterval);
		pokerOrphanInterval = null;
	}
}

const SUIT_PALETTES: Record<string, ParticleColor> = {
	spades:   { primary: '#38bdf8', secondary: '#e5e7eb', glow: 'rgba(56,189,248,0.55)' },
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

export function playCardDealVFX(
	slotIndex: number,
	suit: string,
	value: string,
	isRiver = false,
): void {
	const slot = getArenaVfxCommunitySlot(slotIndex);
	if (!slot) return;

	const rect = slot.getBoundingClientRect();
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;

	stampCssGesture(
		slot,
		isRiver ? 'vfx-card-deal-slam--river' : 'vfx-card-deal-slam',
		isRiver ? 660 : 360,
		`deal-slot:${slotIndex}`,
	);

	triggerArenaShake(isRiver ? 'heavy' : 'mild');

	const palette = SUIT_PALETTES[suit] || GOLD_PALETTE;
	spawnImpactRing(cx, cy, palette, isRiver ? 'luminous' : 'standard');

	if (['A', 'K', 'Q', 'J'].includes(value)) {
		spawnRunePulse(cx, cy, palette, 420, 1.35);
	}

	if (isRiver) {
		spawnArenaFlash('#f5c542', 0.16, 420);
		spawnParticleBurst(cx, cy, 22, LIGHT_PALETTE, `river-slot-${slotIndex}`);
		triggerEmotionalImpulse('climax', 0.65);
	}
}

// ═══════════════════════════════════════════════════
// BETTING ACTION ANIMATIONS
// ═══════════════════════════════════════════════════

export function playRaiseVFX(
	isPlayer: boolean,
	intent?: PokerVfxResolvedIntent,
	amount?: number,
): void {
	const side = isPlayer ? 'player' : 'opponent';
	const hero = getArenaVfxHeroTarget(side);
	if (!hero) return;

	const resolved = intent ?? resolvePokerVfxIntentForRaise(side);
	stampCssGesture(
		hero,
		isPlayer ? 'vfx-hero-raise-player' : 'vfx-hero-raise-opponent',
		480,
		`hero-raise:${side}`,
	);

	if (resolved.targetPoint) {
		playPokerVfxIntent(resolved, { amount });
	} else {
		const rect = hero.getBoundingClientRect();
		spawnImpactRing(rect.left + rect.width / 2, rect.top + rect.height / 2, GOLD_PALETTE);
	}
}

export function playReraiseVFX(
	isPlayer: boolean,
	reraiseLevel = 1,
	intent?: PokerVfxResolvedIntent,
	amount?: number,
): void {
	const side = isPlayer ? 'player' : 'opponent';
	const resolved = intent ?? resolvePokerVfxIntentForRaise(side);

	const hero = getArenaVfxHeroTarget(side);
	if (hero) {
		stampCssGesture(
			hero,
			isPlayer ? 'vfx-hero-reraise-player' : 'vfx-hero-reraise-opponent',
			560,
			`hero-reraise:${side}`,
		);
		const rect = hero.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		spawnParticleBurst(cx, cy, 14, ELEMENT_PALETTES.fire);
		spawnImpactRing(cx, cy, GOLD_PALETTE, 'luminous');
	}

	playPokerVfxIntent(resolved, {
		stakeStrength: 'firm',
		reraiseLevel,
		amount,
	});
	playPressureBassHit(reraiseLevel);
}

export function playCallVFX(intent?: PokerVfxResolvedIntent): void {
	const resolved = intent ?? resolvePokerVfxIntentForCall();
	const heroes = [
		...getArenaVfxTargets(ARENA_VFX_TARGETS.playerHero),
		...getArenaVfxTargets(ARENA_VFX_TARGETS.opponentHero),
	];
	heroes.forEach((hero, index) => {
		stampCssGesture(hero, 'vfx-hero-clash-flash', 240, `hero-clash:${index}`);
	});

	const endpoints = resolveCallClashEndpoints();
	if (endpoints.center) {
		playCallClashVfx(endpoints, resolved.palette);
	}
}

export function playCheckVFX(isPlayer: boolean): void {
	const side = isPlayer ? 'player' : 'opponent';
	const hero = getArenaVfxHeroTarget(side);
	stampCssGesture(hero, 'vfx-hero-defend', 280, `hero-defend:${side}`);
}

export function playFoldVFX(isPlayer: boolean): void {
	const side = isPlayer ? 'player' : 'opponent';
	const otherSide = isPlayer ? 'opponent' : 'player';
	const hero = getArenaVfxHeroTarget(side);
	const otherHero = getArenaVfxHeroTarget(otherSide);

	stampCssGesture(
		hero,
		isPlayer ? 'vfx-hero-fold-player' : 'vfx-hero-fold-opponent',
		900,
		`hero-fold:${side}`,
	);
	stampCssGesture(otherHero, 'vfx-hero-clash-flash', 320, `hero-fold-win:${otherSide}`);
}

// ═══════════════════════════════════════════════════
// SHOWDOWN ANIMATIONS
// ═══════════════════════════════════════════════════

export function playHandRankAnnouncement(
	rankName: string,
	rank: number,
	_isWinner: boolean,
	_isPlayer: boolean,
): void {
	if (!rankName || rank <= 1) return;

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
	mountCinemaSlam(plate, `hand-rank:${displayName}`);

	if (rank >= 7) {
		spawnArenaFlash(color, 0.16, 480);
	}
}

export function playRagnarokVFX(): void {
	spawnArenaFlash('#dc2626', 0.32, 460);

	const ragnarokPlate = createCinemaSlamPlate('RAGNAROK', '#dc2626');
	const ragnarokTitle = ragnarokPlate.querySelector('.cinema-lane-slam__title') as HTMLElement | null;
	if (ragnarokTitle) {
		ragnarokTitle.style.letterSpacing = '0.18em';
	}
	ragnarokPlate.style.zIndex = '25';
	mountCinemaSlam(ragnarokPlate, 'ragnarok');
	triggerArenaShake('lethal');
}

export function playShowdownDamageVFX(
	damage: number,
	isPlayerWinner: boolean,
	handRankDiff: number,
	isLethal = false,
	onImpact?: () => void,
): void {
	const winnerSide = isPlayerWinner ? 'player' : 'opponent';
	const loserSide = isPlayerWinner ? 'opponent' : 'player';
	const winner = getArenaVfxHeroTarget(winnerSide);
	const loser = getArenaVfxHeroTarget(loserSide);
	if (!winner || !loser) {
		releaseHeroVisualHp(loserSide, 'showdown-impact');
		onImpact?.();
		return;
	}

	const winRect = winner.getBoundingClientRect();
	const loseRect = loser.getBoundingClientRect();
	const startX = winRect.left + winRect.width / 2;
	const startY = winRect.top + winRect.height / 2;
	const endX = loseRect.left + loseRect.width / 2;
	const endY = loseRect.top + loseRect.height / 2;

	const isCrushing = handRankDiff >= 5 || damage >= 25;
	const dmgPalette = isCrushing ? GOLD_PALETTE : RED_PALETTE;
	vfxOrchestrationDirector.triggerCriticalSpotlight(isLethal || isCrushing ? 820 : 620);

	spawnShowdownBlast(startX, startY, endX, endY, dmgPalette, {
		travelMs: 360,
		heavy: isCrushing || isLethal,
		onImpact: () => {
			releaseHeroVisualHp(loserSide, 'showdown-impact');
			stampCssGesture(loser, 'vfx-hero-hit-recoil', 320, `showdown-recoil:${loserSide}`);
			triggerArenaShake(isLethal || isCrushing ? 'lethal' : damage >= 12 ? 'heavy' : 'mild');
			triggerEmotionalImpulse(isLethal || isCrushing ? 'shock' : 'climax', isLethal ? 1.0 : 0.78);

			if (isLethal) {
				const container = getOrCreateContainer();
				stampCssGesture(container, 'vfx-lethal-cue', 900, 'lethal-cue');
			}

			try {
				proceduralAudio.play(isCrushing || isLethal ? 'damage_hero' : 'damage');
			} catch {
				// Audio unavailable in headless environments
			}
			onImpact?.();
		},
	});
}

// ═══════════════════════════════════════════════════
// PHASE BANNER DRAMA
// ═══════════════════════════════════════════════════

export function playPhaseDramaVFX(phase: string): void {
	const SHAKE_PHASES = new Set(['destiny']);
	if (!SHAKE_PHASES.has(phase)) return;
	triggerArenaShake('mild');
}

// ═══════════════════════════════════════════════════
// MOMENTUM / STREAK EFFECTS
// ═══════════════════════════════════════════════════

export function playStreakAnnouncementVFX(text: string, color: string): void {
	const announcement = createCinemaSlamPlate(text, color);
	mountCinemaSlam(announcement, `streak:${text}`);
}

// ═══════════════════════════════════════════════════
// HAND STRENGTH CHANGE FLASH
// ═══════════════════════════════════════════════════

export function playHandImprovementVFX(tier: 'low' | 'mid' | 'high' | 'godly'): void {
	const colors: Record<string, string> = {
		low: '#e5e7eb',
		mid: '#38bdf8',
		high: '#f5c542',
		godly: '#b7791f',
	};
	const color = colors[tier] || '#e5e7eb';
	const glow = tier === 'godly' || tier === 'high' ? '16px' : '8px';

	for (let slotIndex = 0; slotIndex < 5; slotIndex += 1) {
		const slot = getArenaVfxCommunitySlot(slotIndex);
		if (!slot) continue;
		slot.style.setProperty('--vfx-improve-color', color);
		slot.style.setProperty('--vfx-improve-glow', glow);
		stampCssGesture(slot, 'vfx-slot-improve', 340, `improve-slot:${slotIndex}`);
	}

	if (tier === 'godly') {
		triggerArenaShake('mild');
	}
}

// ═══════════════════════════════════════════════════
// AMBIENT TENSION
// ═══════════════════════════════════════════════════

export function setTensionLevel(level: 'low' | 'medium' | 'high' | 'allin'): void {
	const viewport = getArenaVfxLayer(ARENA_VFX_LAYERS.viewport);
	if (!viewport) return;
	viewport.dataset.tensionLevel = level;
}

// ═══════════════════════════════════════════════════
// CENTRALIZED AUDIO CUES (delegated to proceduralAudio)
// ═══════════════════════════════════════════════════

function playPressureBassHit(level: number): void {
	try {
		proceduralAudio.play(level >= 2 ? 'norse_horn' : 'attack_prepare');
	} catch {
		// Audio unavailable in headless environments
	}
}

export function playCardSlamSound(): void {
	try {
		proceduralAudio.play('card_play');
	} catch {
		// Audio unavailable in headless environments
	}
}

export function playClashSound(): void {
	try {
		proceduralAudio.play('sword_clash');
	} catch {
		// Audio unavailable in headless environments
	}
}

// ============================================================
// 3-Family VFX separation — 4 Spatial Poker Spell Signatures
// ============================================================

export function playPokerSpellCast(
	effectType: PokerSpellEffectType,
	caster: 'player' | 'opponent',
	intent?: PokerVfxResolvedIntent,
): void {
	const resolved = intent ?? resolvePokerVfxIntentForSpell(effectType, caster);
	const foe: 'player' | 'opponent' = caster === 'player' ? 'opponent' : 'player';
	const { sourcePoint, targetPoint, palette, signature } = resolved;

	if (effectType === 'hole_swap' && sourcePoint && targetPoint) {
		// Bidirectional crossed translucent ribbons between player & opponent hole cards
		spawnBidirectionalSwapArcs(sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y, palette, 420);
		spawnStarburstBloom(sourcePoint.x, sourcePoint.y, palette, 1.0, 320);
		spawnStarburstBloom(targetPoint.x, targetPoint.y, palette, 1.0, 320);
	} else if (effectType === 'run_twice') {
		// Staggered translucent ribbon sweep across all 5 community card slots
		const slots = [0, 1, 2, 3, 4]
			.map(idx => getArenaVfxCommunitySlot(idx))
			.filter((el): el is HTMLElement => el !== null);
		if (sourcePoint) spawnRunePulse(sourcePoint.x, sourcePoint.y, palette, 360, 1.3);
		if (slots.length >= 2) {
			const firstPt = getElementCenter(slots[0], 0.5);
			const lastPt = getElementCenter(slots[slots.length - 1], 0.5);
			spawnTranslucentRibbon(firstPt.x, firstPt.y, lastPt.x, lastPt.y, palette, {
				strands: 3,
				durationMs: 420,
				lingerMs: 460,
				arcFactor: 0.12,
			});
		}
		gameEffectCoordinator.scheduleSequence({
			owner: 'poker-drama-dom',
			lane: 'spell-sweep',
			key: `run-twice:${caster}`,
			priority: 'normal',
			delaysMs: slots.map((_, i) => i * 75),
			run: (i) => {
				const slot = slots[i];
				if (!slot) return;
				const pt = getElementCenter(slot, 0.5);
				spawnRunePulse(pt.x, pt.y, palette, 360, 1.15);
				spawnDiamondShards(pt.x, pt.y, 6, palette, undefined, `run-twice-${i}`);
				spawnParticleBurst(pt.x, pt.y, 8, palette, `run-twice-${i}`);
			},
		});
	} else if (effectType === 'ragnarok_gambit') {
		// Macro board eruption from center outward via translucent ribbons to both hole-card pairs
		const center = sourcePoint ?? targetPoint;
		if (center) {
			vfxOrchestrationDirector.triggerCriticalSpotlight(740);
			spawnRunePulse(center.x, center.y, palette, 540, 2.2);
			spawnStarburstBloom(center.x, center.y, palette, 1.8, 460);
			spawnImpactRing(center.x, center.y, palette, 'luminous');
			spawnArenaFlash(palette.primary, 0.24, 380);
			triggerArenaShake('heavy');
			for (const owner of ['player', 'opponent'] as const) {
				const holeEl = getArenaVfxHoleCardsTarget(owner);
				if (holeEl) {
					const pt = getElementCenter(holeEl, 0.5);
					spawnTranslucentRibbon(center.x, center.y, pt.x, pt.y, palette, {
						strands: 3,
						durationMs: 340,
						lingerMs: 460,
					});
					spawnTravelingGlowRing(center.x, center.y, pt.x, pt.y, palette, 320);
				}
			}
		}
	} else if (effectType === 'blood_bet') {
		// 2-beat causal story: (1) crimson stamina drain on caster rail -> (2) hostile blast to opponent hero
		const casterRail = getArenaVfxStaminaTarget(caster);
		if (casterRail) {
			const railPt = getElementCenter(casterRail, 0.5);
			spawnDrainStream(railPt.x, railPt.y, 12, palette, 1, `blood-bet-drain:${caster}`);
		}
		if (sourcePoint && targetPoint) {
			spawnShowdownBlast(sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y, palette, {
				travelMs: 320,
				heavy: false,
				onImpact: () => {
					triggerArenaShake('mild');
					stampCssGesture(getArenaVfxHeroTarget(foe), 'vfx-hero-hit-recoil', 280, `blood-bet:${foe}`);
				},
			});
		}
	} else if (signature === 'curse' && sourcePoint && targetPoint) {
		// Hostile spectral teal-violet translucent ribbon + arcane vortex on opponent stamina rail
		const cursePalette: ParticleColor = {
			primary: palette.primary,
			secondary: '#00f0d8',
			glow: palette.glow,
		};
		spawnRunePulse(sourcePoint.x, sourcePoint.y, cursePalette, 320, 1.2);
		spawnMagicTunnel(sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y, cursePalette, {
			rings: 7,
			durationMs: 340,
		});
		spawnTravelingGlowRing(sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y, cursePalette, 340, () => {
			spawnArcaneVortex(targetPoint.x, targetPoint.y, cursePalette, 540);
			spawnDrainStream(targetPoint.x, targetPoint.y, 14, cursePalette, 1, `curse:${effectType}`);
			spawnSparkBurst(targetPoint.x, targetPoint.y, 10, cursePalette, `curse-sparks:${effectType}`);
			triggerEmotionalImpulse('dread', 0.65);
		});
	} else if (signature === 'ward') {
		// Beneficial / protective ward — translucent ribbon + iridescent SpellShield dome, zero recoil
		if (resolved.motion === 'stake-to-pot') {
			playPokerVfxIntent(resolved, { seed: `spell-${effectType}`, stakeStrength: 'firm' });
		} else if (sourcePoint && targetPoint) {
			spawnTranslucentRibbon(sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y, palette, {
				strands: 2,
				durationMs: 300,
				lingerMs: 420,
			});
			spawnTravelingGlowRing(sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y, palette, 300, () => {
				spawnShieldDome(targetPoint.x, targetPoint.y, {
					primary: '#38bdf8',
					secondary: '#e879f9',
					glow: 'rgba(56,189,248,0.65)',
				});
				spawnRisingAura(targetPoint.x, targetPoint.y, 12, palette, `ward:${effectType}`);
				spawnRunePulse(targetPoint.x, targetPoint.y, palette, 420, 1.3);
			});
		} else if (targetPoint) {
			spawnShieldDome(targetPoint.x, targetPoint.y);
			spawnRisingAura(targetPoint.x, targetPoint.y, 12, palette, `ward:${effectType}`);
		}
	} else if (signature === 'prophecy' && sourcePoint && targetPoint) {
		// LoR-style cerulean-cyan braided prophecy ribbon gliding to revealed/scried cards
		const prophecyPalette: ParticleColor = {
			primary: '#00d4ff',
			secondary: '#bae6fd',
			glow: 'rgba(0,212,255,0.6)',
		};
		spawnRunePulse(sourcePoint.x, sourcePoint.y, prophecyPalette, 300, 1.15);
		spawnMagicTunnel(sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y, prophecyPalette, {
			rings: 8,
			durationMs: 360,
		});
		spawnTravelingGlowRing(sourcePoint.x, sourcePoint.y, targetPoint.x, targetPoint.y, prophecyPalette, 360, () => {
			spawnStarburstBloom(targetPoint.x, targetPoint.y, prophecyPalette, 1.1, 360);
			spawnRunePulse(targetPoint.x, targetPoint.y, prophecyPalette, 480, 1.45);
		});
	} else if (sourcePoint || targetPoint) {
		if (sourcePoint) {
			spawnRunePulse(sourcePoint.x, sourcePoint.y, palette, 360, 1.25);
		}
		playPokerVfxIntent(resolved, { seed: `spell-${effectType}` });
	} else {
		const container = getOrCreateContainer();
		if (container) {
			const burst = getDramaContainerPoint(container, caster === 'player' ? 0.75 : 0.25);
			spawnParticleBurst(burst.x, burst.y, 10, palette);
			spawnImpactRing(burst.x, burst.y, palette, 'luminous');
		}
	}

	getArenaVfxSpellTrayCards().forEach((el, index) => {
		stampCardMotionClass(el, 'is-casting', false);
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
 * Stamina rail 2D VFX anchored directly to `.hero-stamina-rail`.
 */
export function playStaminaVfx(
	side: 'player' | 'opponent',
	reason: 'bet' | 'raise' | 'defend' | 'fold' | 'fold_curse' | 'shield_absorbed' | 'spell_cost' | 'spell_drain',
): void {
	const rail = getArenaVfxStaminaTarget(side);
	if (!rail) return;
	const pt = getElementCenter(rail, 0.5);

	switch (reason) {
		case 'bet':
		case 'raise': {
			// Keep stamina VFX strictly anchored on the stamina rail so it never
			// competes with the directional Hero -> Opposing Arena Zone beam.
			spawnDrainStream(pt.x, pt.y, 8, GOLD_PALETTE, 1, `sta-bet:${side}`);
			return;
		}
		case 'defend': {
			const recoverPalette: ParticleColor = {
				primary: '#38bdf8',
				secondary: '#fde68a',
				glow: 'rgba(56,189,248,0.55)',
			};
			spawnRisingAura(pt.x, pt.y, 10, recoverPalette, `sta-defend:${side}`);
			spawnStarburstBloom(pt.x, pt.y, recoverPalette, 0.9, 320);
			try {
				proceduralAudio.play('mana_fill');
			} catch {
				// Audio unavailable
			}
			return;
		}
		case 'shield_absorbed': {
			const shieldPalette: ParticleColor = {
				primary: '#38bdf8',
				secondary: '#e879f9',
				glow: 'rgba(56,189,248,0.65)',
			};
			spawnShieldDome(pt.x, pt.y, shieldPalette, 520);
			spawnRunePulse(pt.x, pt.y, shieldPalette, 420, 1.35);
			try {
				proceduralAudio.play('sword_clash');
			} catch {
				// Audio unavailable
			}
			return;
		}
		case 'fold_curse': {
			spawnArcaneVortex(pt.x, pt.y, { primary: '#ef4444', secondary: '#8b5cf6', glow: 'rgba(239,68,68,0.6)' }, 520);
			spawnDrainStream(pt.x, pt.y, 16, RED_PALETTE, 1, `sta-curse:${side}`);
			spawnSparkBurst(pt.x, pt.y, 10, RED_PALETTE, `sta-curse-spark:${side}`);
			return;
		}
		case 'fold':
		case 'spell_cost':
		case 'spell_drain': {
			spawnDrainStream(pt.x, pt.y, 10, RED_PALETTE, 1, `sta-loss:${side}`);
			return;
		}
		default: {
			const exhaustive: never = reason;
			return exhaustive;
		}
	}
}

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
			spawnParticleBurst(burst.x, burst.y, 8, resolved.palette);
			spawnImpactRing(burst.x, burst.y, resolved.palette, 'luminous');
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

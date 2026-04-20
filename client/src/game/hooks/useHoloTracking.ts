import { useCallback, useRef, useEffect, RefObject } from 'react';

/**
 * Holographic mouse tracking hook.
 * Sets CSS custom properties on the card element for gradient positioning.
 * Uses spring-based smoothing for organic motion.
 *
 * Supports two modes:
 *   1. Ref-based: pass a cardRef, handlers use ref.current
 *   2. Refless: pass no ref, handlers use e.currentTarget (for grids)
 */

interface HoloHandlers {
	onMouseMove: (e: React.MouseEvent) => void;
	onMouseLeave: (e: React.MouseEvent) => void;
}

interface SpringState {
	px: number; py: number;
	cx: number; cy: number;
	bgX: number; bgY: number;
	fromCenter: number;
}

const SPRING_STIFFNESS = 0.066;
const SPRING_DAMPING = 0.25;

function springLerp(current: number, target: number, velocity: number): [number, number] {
	const force = (target - current) * SPRING_STIFFNESS;
	const newVelocity = (velocity + force) * (1 - SPRING_DAMPING);
	return [current + newVelocity, newVelocity];
}

function applyHoloVars(el: HTMLElement, s: SpringState): void {
	el.style.setProperty('--pointer-x', `${s.px}%`);
	el.style.setProperty('--pointer-y', `${s.py}%`);
	el.style.setProperty('--rotate-x', `${-(s.cx / 3.5)}deg`);
	el.style.setProperty('--rotate-y', `${s.cy / 3.5}deg`);
	el.style.setProperty('--bg-x', `${s.bgX}%`);
	el.style.setProperty('--bg-y', `${s.bgY}%`);
	el.style.setProperty('--pointer-from-center', `${s.fromCenter}`);
	el.style.setProperty('--pointer-from-left', `${s.px / 100}`);
	el.style.setProperty('--pointer-from-top', `${s.py / 100}`);
}

function resetHoloVars(el: HTMLElement): void {
	el.classList.remove('holo-active');
	el.style.setProperty('--pointer-x', '50%');
	el.style.setProperty('--pointer-y', '50%');
	el.style.setProperty('--rotate-x', '0deg');
	el.style.setProperty('--rotate-y', '0deg');
	el.style.setProperty('--bg-x', '50%');
	el.style.setProperty('--bg-y', '50%');
	el.style.setProperty('--pointer-from-center', '0');
	el.style.setProperty('--pointer-from-left', '0.5');
	el.style.setProperty('--pointer-from-top', '0.5');
}

/** Instant apply without spring (for non-ref grids where spring tracking isn't practical) */
function applyHoloVarsInstant(el: HTMLElement, e: React.MouseEvent): void {
	const rect = el.getBoundingClientRect();
	const px = ((e.clientX - rect.left) / rect.width) * 100;
	const py = ((e.clientY - rect.top) / rect.height) * 100;
	const cx = px - 50;
	const cy = py - 50;
	const fromCenter = Math.min(Math.sqrt(cx * cx + cy * cy) / 50, 1);

	el.style.setProperty('--pointer-x', `${px}%`);
	el.style.setProperty('--pointer-y', `${py}%`);
	el.style.setProperty('--rotate-x', `${-(cx / 3.5)}deg`);
	el.style.setProperty('--rotate-y', `${cy / 3.5}deg`);
	el.style.setProperty('--bg-x', `${37 + (cx / 50) * 13}%`);
	el.style.setProperty('--bg-y', `${37 + (cy / 50) * 13}%`);
	el.style.setProperty('--pointer-from-center', `${fromCenter}`);
	el.style.setProperty('--pointer-from-left', `${px / 100}`);
	el.style.setProperty('--pointer-from-top', `${py / 100}`);

	if (!el.classList.contains('holo-active')) {
		el.classList.add('holo-active');
	}
}

export function useHoloTracking(cardRef?: RefObject<HTMLDivElement | null>): HoloHandlers {
	const targetRef = useRef<SpringState>({ px: 50, py: 50, cx: 0, cy: 0, bgX: 50, bgY: 50, fromCenter: 0 });
	const currentRef = useRef<SpringState>({ px: 50, py: 50, cx: 0, cy: 0, bgX: 50, bgY: 50, fromCenter: 0 });
	const velocityRef = useRef({ px: 0, py: 0, cx: 0, cy: 0, bgX: 0, bgY: 0, fromCenter: 0 });
	const frameRef = useRef<number>(0);
	const activeRef = useRef(false);

	const tick = useCallback(() => {
		if (!activeRef.current || !cardRef?.current) return;

		const t = targetRef.current;
		const c = currentRef.current;
		const v = velocityRef.current;

		[c.px, v.px] = springLerp(c.px, t.px, v.px);
		[c.py, v.py] = springLerp(c.py, t.py, v.py);
		[c.cx, v.cx] = springLerp(c.cx, t.cx, v.cx);
		[c.cy, v.cy] = springLerp(c.cy, t.cy, v.cy);
		[c.bgX, v.bgX] = springLerp(c.bgX, t.bgX, v.bgX);
		[c.bgY, v.bgY] = springLerp(c.bgY, t.bgY, v.bgY);
		[c.fromCenter, v.fromCenter] = springLerp(c.fromCenter, t.fromCenter, v.fromCenter);

		applyHoloVars(cardRef.current, c);

		const totalVelocity = Math.abs(v.px) + Math.abs(v.py) + Math.abs(v.cx) + Math.abs(v.cy);
		if (totalVelocity > 0.01 || activeRef.current) {
			frameRef.current = requestAnimationFrame(tick);
		}
	}, [cardRef]);

	useEffect(() => {
		return () => {
			if (frameRef.current) cancelAnimationFrame(frameRef.current);
		};
	}, []);

	const onMouseMove = useCallback((e: React.MouseEvent) => {
		const el = cardRef?.current ?? (e.currentTarget as HTMLElement);
		if (!el) return;

		// Refless mode — no spring, instant apply (grid cards)
		if (!cardRef) {
			applyHoloVarsInstant(el, e);
			return;
		}

		// Ref mode — spring-based
		const rect = el.getBoundingClientRect();
		const px = ((e.clientX - rect.left) / rect.width) * 100;
		const py = ((e.clientY - rect.top) / rect.height) * 100;
		const cx = px - 50;
		const cy = py - 50;

		targetRef.current = {
			px, py, cx, cy,
			bgX: 37 + (cx / 50) * 13,
			bgY: 37 + (cy / 50) * 13,
			fromCenter: Math.min(Math.sqrt(cx * cx + cy * cy) / 50, 1),
		};

		if (!activeRef.current) {
			activeRef.current = true;
			el.classList.add('holo-active');
			frameRef.current = requestAnimationFrame(tick);
		}
	}, [cardRef, tick]);

	const onMouseLeave = useCallback((e: React.MouseEvent) => {
		const el = cardRef?.current ?? (e.currentTarget as HTMLElement);
		if (!el) return;

		if (!cardRef) {
			resetHoloVars(el);
			return;
		}

		activeRef.current = false;
		// Spring back to center
		targetRef.current = { px: 50, py: 50, cx: 0, cy: 0, bgX: 50, bgY: 50, fromCenter: 0 };
		// Keep ticking to animate return
		frameRef.current = requestAnimationFrame(tick);
		// Delay class removal so the return animation plays
		setTimeout(() => {
			if (!activeRef.current && cardRef.current) {
				resetHoloVars(cardRef.current);
			}
		}, 400);
	}, [cardRef, tick]);

	return { onMouseMove, onMouseLeave };
}

export type HoloTier = 'holo-rare' | 'holo-epic' | 'holo-mythic';

/**
 * Returns the holo tier for a card's rarity, respecting the cardQuality setting.
 * - 'low': no holographic effects
 * - 'medium': cap at rare tier (no epic/mythic holo)
 * - 'high': full holo tiers
 */
export function getHoloTier(rarity?: string, quality?: 'low' | 'medium' | 'high'): HoloTier | null {
	if (!rarity) return null;
	// Lazy-read quality from settingsStore if not passed explicitly
	const q = quality ?? _getCardQuality();
	if (q === 'low') return null;
	switch (rarity.toLowerCase()) {
		case 'mythic': return q === 'medium' ? 'holo-rare' : 'holo-mythic';
		case 'epic': return q === 'medium' ? 'holo-rare' : 'holo-epic';
		case 'rare': return 'holo-rare';
		default: return null;
	}
}

/** Lazy accessor so we don't import settingsStore at module top level */
function _getCardQuality(): 'low' | 'medium' | 'high' {
	try {
		// Dynamic import avoidance — use getState() directly
		const { useSettingsStore } = require('../stores/settingsStore');
		return useSettingsStore.getState().cardQuality ?? 'high';
	} catch {
		return 'high';
	}
}

export { applyHoloVarsInstant as applyHoloVars, resetHoloVars };

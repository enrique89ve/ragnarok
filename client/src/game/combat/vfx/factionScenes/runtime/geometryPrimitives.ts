/**
 * geometryPrimitives.ts
 *
 * Shared, lightweight math, color-ramp, and procedural PixiJS v8 polygon
 * drawing primitives used across all faction VFX scenes.
 */

import type { FillGradient, Graphics } from 'pixi.js';
import type { ViewportPoint } from '../types';

export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

export function easeInOutQuad(t: number): number {
	return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function lerpRgb(a: number, b: number, t: number): number {
	const c = clamp(t, 0, 1);
	const ar = (a >> 16) & 0xff;
	const ag = (a >> 8) & 0xff;
	const ab = a & 0xff;
	const br = (b >> 16) & 0xff;
	const bg = (b >> 8) & 0xff;
	const bb = b & 0xff;
	return (Math.round(ar + (br - ar) * c) << 16)
		| (Math.round(ag + (bg - ag) * c) << 8)
		| Math.round(ab + (bb - ab) * c);
}

export function rgbToRgbaString(hex: number, alpha: number): string {
	const r = (hex >> 16) & 0xff;
	const g = (hex >> 8) & 0xff;
	const b = hex & 0xff;
	return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

/**
 * Fills a smooth closed organic contour using quadratic midpoint interpolation.
 */
export function fillSmoothClosedContour(
	g: Graphics,
	pts: readonly ViewportPoint[],
	fill: FillGradient | number,
	alpha: number,
): void {
	const n = pts.length;
	if (n < 3 || alpha <= 0.01) return;
	const firstMidX = (pts[n - 1].x + pts[0].x) * 0.5;
	const firstMidY = (pts[n - 1].y + pts[0].y) * 0.5;
	g.moveTo(firstMidX, firstMidY);
	for (let i = 0; i < n; i += 1) {
		const curr = pts[i];
		const next = pts[(i + 1) % n];
		g.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) * 0.5, (curr.y + next.y) * 0.5);
	}
	g.closePath();
	if (typeof fill === 'number') {
		g.fill({ color: fill, alpha });
	} else {
		g.fill({ fill, alpha });
	}
}

/**
 * Returns a progressive slice of a polyline according to normalized `progress` (0..1).
 */
export function slicePolylineByProgress(
	points: readonly ViewportPoint[],
	progress: number,
): ViewportPoint[] {
	const segCount = points.length - 1;
	if (segCount <= 0) return [];
	const exact = clamp(progress, 0, 1) * segCount;
	const whole = Math.floor(exact);
	const frac = exact - whole;
	if (whole <= 0 && frac <= 0.01) return [];

	const out: ViewportPoint[] = [points[0]];
	for (let i = 1; i <= whole && i < points.length; i += 1) {
		out.push(points[i]);
	}
	if (whole < segCount && frac > 0) {
		const a = points[whole];
		const b = points[whole + 1];
		out.push({ x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac });
	}
	return out;
}

/**
 * Fills a tapered fracture polygon along `pts` starting at `rootHalfW` and
 * narrowing smoothly down to a 0px hairline needle tip.
 */
export function fillTaperedFissure(
	g: Graphics,
	pts: readonly ViewportPoint[],
	rootHalfW: number,
	color: number,
	alpha: number,
	offsetX = 0,
	offsetY = 0,
): void {
	if (pts.length < 2 || rootHalfW <= 0.05 || alpha <= 0.01) return;

	const leftSide: ViewportPoint[] = [];
	const rightSide: ViewportPoint[] = [];
	const lastIdx = pts.length - 1;

	for (let i = 0; i <= lastIdx; i += 1) {
		const p = pts[i];
		const prev = pts[Math.max(0, i - 1)];
		const next = pts[Math.min(lastIdx, i + 1)];
		const dx = next.x - prev.x;
		const dy = next.y - prev.y;
		const len = Math.max(1, Math.hypot(dx, dy));
		const nx = -dy / len;
		const ny = dx / len;

		const u = i / lastIdx;
		const hw = rootHalfW * Math.pow(Math.max(0, 1 - u), 1.35);
		const cx = p.x + offsetX;
		const cy = p.y + offsetY;
		leftSide.push({ x: cx + nx * hw, y: cy + ny * hw });
		rightSide.push({ x: cx - nx * hw, y: cy - ny * hw });
	}

	g.moveTo(leftSide[0].x, leftSide[0].y);
	for (let i = 1; i < leftSide.length; i += 1) g.lineTo(leftSide[i].x, leftSide[i].y);
	for (let i = rightSide.length - 1; i >= 0; i -= 1) g.lineTo(rightSide[i].x, rightSide[i].y);
	g.closePath();
	g.fill({ color, alpha });
}

export interface ThreeStopColorRamp {
	readonly core: number;
	readonly mid: number;
	readonly outer: number;
}

/**
 * Fills a Riot-style 3-stop distance-based thermal/color gradient along a fissure:
 * bright hot epicenter -> saturated midtone -> cooled dark outer tip.
 */
export function fillGradientFissureSeam(
	g: Graphics,
	pts: readonly ViewportPoint[],
	rootHalfW: number,
	ramp: ThreeStopColorRamp,
	peakAlpha: number,
): void {
	if (pts.length < 2 || rootHalfW <= 0.1 || peakAlpha <= 0.01) return;
	const lastIdx = pts.length - 1;

	for (let i = 0; i < lastIdx; i += 1) {
		const a = pts[i];
		const b = pts[i + 1];
		const u0 = i / lastIdx;
		const u1 = (i + 1) / lastIdx;
		const uMid = (u0 + u1) * 0.5;

		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len = Math.max(1, Math.hypot(dx, dy));
		const nx = -dy / len;
		const ny = dx / len;

		const hw0 = rootHalfW * Math.pow(Math.max(0, 1 - u0), 1.45);
		const hw1 = rootHalfW * Math.pow(Math.max(0, 1 - u1), 1.45);
		if (hw0 <= 0.05 && hw1 <= 0.05) continue;

		const color = uMid < 0.42
			? lerpRgb(ramp.core, ramp.mid, uMid / 0.42)
			: lerpRgb(ramp.mid, ramp.outer, (uMid - 0.42) / 0.58);
		const segAlpha = peakAlpha * Math.pow(Math.max(0, 1 - uMid), 1.6);
		if (segAlpha <= 0.015) continue;

		g.moveTo(a.x + nx * hw0, a.y + ny * hw0);
		g.lineTo(b.x + nx * hw1, b.y + ny * hw1);
		g.lineTo(b.x - nx * hw1, b.y - ny * hw1);
		g.lineTo(a.x - nx * hw0, a.y - ny * hw0);
		g.closePath();
		g.fill({ color, alpha: segAlpha });
	}
}

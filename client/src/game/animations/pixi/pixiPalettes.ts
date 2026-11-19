/**
 * pixiPalettes.ts
 *
 * Shared color palettes, Norse realm ambient configs, reduced-motion guards,
 * and deterministic easing / Bezier helpers for the PixiJS v8 2D VFX engine.
 */

export interface ParticleColor {
	primary: string;
	secondary: string;
	glow: string;
}

export interface ParticleDirection {
	readonly x: number;
	readonly y: number;
}

export interface RealmParticleConfig {
	colors: number[];
	count: number;
	sizeRange: [number, number];
	driftY: number;
	driftX: number;
	lifetime: [number, number];
	opacity: number;
	sway: number;
}

export const ELEMENT_PALETTES: Record<string, ParticleColor> = {
	fire:      { primary: '#ff5500', secondary: '#ffd700', glow: 'rgba(255,85,0,0.6)' },
	ice:       { primary: '#00ccff', secondary: '#b3e5fc', glow: 'rgba(0,204,255,0.6)' },
	lightning: { primary: '#ffd700', secondary: '#fff9c4', glow: 'rgba(255,215,0,0.6)' },
	shadow:    { primary: '#7b1fa2', secondary: '#ce93d8', glow: 'rgba(123,31,162,0.6)' },
	nature:    { primary: '#4caf50', secondary: '#a5d6a7', glow: 'rgba(76,175,80,0.6)' },
	water:     { primary: '#38bdf8', secondary: '#bae6fd', glow: 'rgba(56,189,248,0.6)' },
	light:     { primary: '#f5c542', secondary: '#fef9c3', glow: 'rgba(245,197,66,0.6)' },
	dark:      { primary: '#7b1fa2', secondary: '#c084fc', glow: 'rgba(123,31,162,0.6)' },
	electric:  { primary: '#facc15', secondary: '#fef08a', glow: 'rgba(250,204,21,0.6)' },
	grass:     { primary: '#22c55e', secondary: '#86efac', glow: 'rgba(34,197,94,0.6)' },
	neutral:   { primary: '#cd7f32', secondary: '#f0e68c', glow: 'rgba(205,127,50,0.6)' },
};

export const REALM_CONFIGS: Record<string, RealmParticleConfig> = {
	niflheim:      { colors: [0x88ccff, 0xcceeff, 0xffffff], count: 22, sizeRange: [2, 5], driftY: 36, driftX: 18, lifetime: [4, 7], opacity: 0.55, sway: 28 },
	muspelheim:    { colors: [0xff5500, 0xff8800, 0xffcc00], count: 24, sizeRange: [2, 5], driftY: -54, driftX: 12, lifetime: [3, 6], opacity: 0.65, sway: 20 },
	alfheim:       { colors: [0x88dd55, 0xffee88, 0xaaffaa], count: 18, sizeRange: [2, 5], driftY: 16, driftX: 8, lifetime: [5, 8], opacity: 0.45, sway: 42 },
	jotunheim:     { colors: [0xddddff, 0xffffff, 0xaaccee], count: 14, sizeRange: [3, 6], driftY: 14, driftX: 24, lifetime: [6, 10], opacity: 0.38, sway: 48 },
	helheim:       { colors: [0x6622aa, 0x44cc66, 0x884488], count: 18, sizeRange: [2, 5], driftY: -22, driftX: 28, lifetime: [3, 6], opacity: 0.48, sway: 56 },
	svartalfheim:  { colors: [0xff6600, 0xcc4400, 0xffaa22], count: 15, sizeRange: [2, 4], driftY: -44, driftX: 18, lifetime: [2, 5], opacity: 0.55, sway: 16 },
	asgard:        { colors: [0xffd700, 0xffee88, 0xffffff], count: 18, sizeRange: [2, 5], driftY: -30, driftX: 8, lifetime: [4, 7], opacity: 0.48, sway: 24 },
	vanaheim:      { colors: [0x44aa44, 0x88cc44, 0xaadd66], count: 18, sizeRange: [2, 5], driftY: 10, driftX: 10, lifetime: [5, 8], opacity: 0.42, sway: 48 },
	ginnungagap:   { colors: [0x8888ff, 0xffffff, 0x4466cc], count: 10, sizeRange: [3, 7], driftY: 6, driftX: 6, lifetime: [8, 12], opacity: 0.28, sway: 64 },
	midgard:       { colors: [0xccbbaa, 0xaa9988, 0xddccbb], count: 10, sizeRange: [2, 4], driftY: 6, driftX: 6, lifetime: [6, 10], opacity: 0.22, sway: 32 },
};

export function resolveElementPalette(element?: string): ParticleColor {
	if (!element) return ELEMENT_PALETTES.neutral;
	const key = element.toLowerCase();
	return ELEMENT_PALETTES[key] ?? ELEMENT_PALETTES.neutral;
}

export function hexToNum(hex: string): number {
	const clean = hex.replace('#', '');
	const parsed = parseInt(clean.length === 3
		? clean.split('').map(c => c + c).join('')
		: clean.slice(0, 6), 16);
	return Number.isNaN(parsed) ? 0xf5c542 : parsed;
}

export function pickColor(palette: ParticleColor, next: () => number = Math.random): number {
	return next() > 0.45 ? hexToNum(palette.primary) : hexToNum(palette.secondary);
}

export function prefersReducedMotion(): boolean {
	return typeof window !== 'undefined'
		&& typeof window.matchMedia === 'function'
		&& window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function reducedParticleCount(count: number): number {
	return prefersReducedMotion() ? Math.max(1, Math.ceil(count * 0.25)) : count;
}

export function motionDuration(seconds: number): number {
	return prefersReducedMotion() ? Math.max(0.05, seconds * 0.25) : Math.max(0.05, seconds);
}

export function easeOutCubic(t: number): number {
	const inv = 1 - t;
	return 1 - inv * inv * inv;
}

export function easeOutQuad(t: number): number {
	const inv = 1 - t;
	return 1 - inv * inv;
}

export function easeInCubic(t: number): number {
	return t * t * t;
}

export function quadraticBezier(
	p0x: number,
	p0y: number,
	cx: number,
	cy: number,
	p1x: number,
	p1y: number,
	t: number,
): { x: number; y: number } {
	const inv = 1 - t;
	return {
		x: inv * inv * p0x + 2 * inv * t * cx + t * t * p1x,
		y: inv * inv * p0y + 2 * inv * t * cy + t * t * p1y,
	};
}

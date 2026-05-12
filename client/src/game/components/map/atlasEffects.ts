import type { MapPoint, MapRealmId } from './types';

export type AtlasEffectType = 'none' | 'snow' | 'embers' | 'sparkles' | 'petals' | 'mist';

export interface AtlasEffectPreset {
	type: AtlasEffectType;
	x: number;
	y: number;
	radius: number;
	density: number;
	speed: number;
	sway: number;
	size: number;
	opacity: number;
	colors?: readonly string[];
}

export const ATLAS_EFFECT_TYPES: readonly AtlasEffectType[] = [
	'none',
	'snow',
	'embers',
	'sparkles',
	'petals',
	'mist',
];

export type EffectStylePreset = Omit<AtlasEffectPreset, 'type' | 'x' | 'y' | 'radius'>;

export const ATLAS_EFFECT_LIBRARY: Record<Exclude<AtlasEffectType, 'none'>, EffectStylePreset> = {
	snow: {
		density: 35,
		speed: 22,
		sway: 32,
		size: 36,
		opacity: 0.7,
		colors: ['#ffffff', '#cfeaff', '#a8d8ff'],
	},
	embers: {
		density: 30,
		speed: 28,
		sway: 18,
		size: 28,
		opacity: 0.8,
		colors: ['#ff5500', '#ff8800', '#ffcc44'],
	},
	sparkles: {
		density: 25,
		speed: 14,
		sway: 40,
		size: 26,
		opacity: 0.7,
		colors: ['#fff6c2', '#a4f1c6', '#7ec8ff'],
	},
	petals: {
		density: 22,
		speed: 18,
		sway: 48,
		size: 38,
		opacity: 0.65,
		colors: ['#ffc0e0', '#f6c4a0', '#fff0c2'],
	},
	mist: {
		density: 18,
		speed: 10,
		sway: 60,
		size: 64,
		opacity: 0.45,
		colors: ['#bfd5ff', '#d4d8ff', '#ffffff'],
	},
};

const DEFAULT_RADIUS = 12;

function noneStyle(): EffectStylePreset {
	return { density: 0, speed: 0, sway: 0, size: 0, opacity: 0 };
}

export function createEffectPreset(type: AtlasEffectType, anchor: { x: number; y: number; radius?: number }): AtlasEffectPreset {
	const radius = anchor.radius ?? DEFAULT_RADIUS;
	if (type === 'none') {
		return { type: 'none', x: anchor.x, y: anchor.y, radius, ...noneStyle() };
	}
	return { type, x: anchor.x, y: anchor.y, radius, ...ATLAS_EFFECT_LIBRARY[type] };
}

export function sampleCirclePoint(
	cx: number,
	cy: number,
	radius: number,
	rng: () => number = Math.random,
): MapPoint {
	const r = Math.sqrt(rng()) * radius;
	const theta = rng() * Math.PI * 2;
	return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
}

export function serializeEffectsAsTsConstant(effects: Record<MapRealmId, AtlasEffectPreset>): string {
	const realmIds: readonly MapRealmId[] = [
		'asgard',
		'midgard',
		'jotunheim',
		'niflheim',
		'muspelheim',
		'helheim',
		'alfheim',
		'svartalfheim',
		'vanaheim',
	];

	const fmt = (n: number) => Number(n.toFixed(2));
	const formatPreset = (preset: AtlasEffectPreset): string => {
		const anchor = `x: ${fmt(preset.x)}, y: ${fmt(preset.y)}, radius: ${fmt(preset.radius)}`;
		if (preset.type === 'none') return `{ type: 'none', ${anchor}, density: 0, speed: 0, sway: 0, size: 0, opacity: 0 }`;
		const colors = preset.colors ? `, colors: [${preset.colors.map(c => `'${c}'`).join(', ')}]` : '';
		return `{ type: '${preset.type}', ${anchor}, density: ${preset.density}, speed: ${preset.speed}, sway: ${preset.sway}, size: ${preset.size}, opacity: ${preset.opacity}${colors} }`;
	};

	const entries = realmIds.map(id => `\t${id}: ${formatPreset(effects[id])},`).join('\n');

	return `export const REALM_EFFECTS: Record<MapRealmId, AtlasEffectPreset> = {\n${entries}\n};`;
}

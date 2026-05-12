import type { AtlasEffectPreset } from '../atlasEffects';
import type { MapRealmId } from '../types';

export const REALM_EFFECTS: Readonly<Record<MapRealmId, AtlasEffectPreset>> = Object.freeze({
	asgard: { type: 'none', x: 57.6, y: 25.2, radius: 12, density: 0, speed: 0, sway: 0, size: 0, opacity: 0 },
	midgard: { type: 'none', x: 53.7, y: 49.4, radius: 12, density: 0, speed: 0, sway: 0, size: 0, opacity: 0 },
	jotunheim: { type: 'none', x: 28, y: 25.3, radius: 12, density: 0, speed: 0, sway: 0, size: 0, opacity: 0 },
	niflheim: { type: 'snow', x: 95, y: 0, radius: 14, density: 75, speed: 22, sway: 93, size: 32, opacity: 0.85, colors: ['#ffffff', '#cfeaff', '#a8d8ff'] },
	muspelheim: { type: 'none', x: 22, y: 55.7, radius: 12, density: 0, speed: 0, sway: 0, size: 0, opacity: 0 },
	helheim: { type: 'none', x: 84.9, y: 53.4, radius: 12, density: 0, speed: 0, sway: 0, size: 0, opacity: 0 },
	alfheim: { type: 'none', x: 34.6, y: 76.2, radius: 12, density: 0, speed: 0, sway: 0, size: 0, opacity: 0 },
	svartalfheim: { type: 'none', x: 56, y: 75.8, radius: 12, density: 0, speed: 0, sway: 0, size: 0, opacity: 0 },
	vanaheim: { type: 'none', x: 70.6, y: 80.7, radius: 12, density: 0, speed: 0, sway: 0, size: 0, opacity: 0 },
});

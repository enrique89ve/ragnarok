import {
	Compass,
	Crown,
	Flame,
	Hammer,
	MountainSnow,
	Skull,
	Snowflake,
	Sparkles,
	Sprout,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MapRealmId } from './types';

/** Existing realm art is optional: Midgard and Svartalfheim currently have no dedicated image. */
export const REALM_ART_URLS: Partial<Record<MapRealmId, string>> = {
	asgard: '/art/realms/asgard.webp',
	jotunheim: '/art/realms/jotunheim.webp',
	niflheim: '/art/realms/niflheim.webp',
	muspelheim: '/art/realms/muspelheim.webp',
	helheim: '/art/realms/helheim.webp',
	alfheim: '/art/realms/alfheim.webp',
	vanaheim: '/art/realms/vanaheim.webp',
};

/** Region icons carry meaning at a glance; the rune remains as the lore accent. */
export const REALM_SYMBOLS: Record<MapRealmId, LucideIcon> = {
	asgard: Crown,
	midgard: Compass,
	jotunheim: MountainSnow,
	niflheim: Snowflake,
	muspelheim: Flame,
	helheim: Skull,
	alfheim: Sparkles,
	svartalfheim: Hammer,
	vanaheim: Sprout,
};

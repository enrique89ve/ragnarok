import type { MapRealmId } from '../types';

export const MAP_REALM_IDS = [
	'asgard',
	'midgard',
	'jotunheim',
	'niflheim',
	'muspelheim',
	'helheim',
	'alfheim',
	'svartalfheim',
	'vanaheim',
] as const satisfies readonly MapRealmId[];

export function isMapRealmId(id: string): id is MapRealmId {
	return MAP_REALM_IDS.includes(id as MapRealmId);
}

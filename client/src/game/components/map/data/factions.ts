import type { FactionId } from '../../../pvp/pvpData';
import type { MapRealmId } from '../types';

export const FACTION_HOME_REALMS: Readonly<Record<FactionId, MapRealmId>> = Object.freeze({
	aesir: 'asgard',
	vanir: 'vanaheim',
	jotun: 'jotunheim',
	helheim: 'helheim',
	muspell: 'muspelheim',
});

export function getFactionHomeRealm(factionId: FactionId): MapRealmId {
	return FACTION_HOME_REALMS[factionId];
}

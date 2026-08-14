import type { AtlasDataAdapter } from './adapter';
import { CAMPAIGN_ARCS } from './data/campaignArcs';
import { MAP_REALM_IDS, isMapRealmId } from './data/realmIds';
import { buildRealmCardSections, getRealmShiftSummary } from './queries/cardMatching';
import type { MapCardSection, MapRealmId, MapRealmLegend } from './types';

/**
 * Derived map services: the legend, realm lookups, card sections and
 * faction-home mapping computed from a single `AtlasDataAdapter`.
 *
 * Everything is derived inside the factory (no module-level state), so a
 * migrated host can create as many isolated service instances as it needs.
 */
export interface AtlasServices {
	realms: readonly MapRealmLegend[];
	getRealmById(realmId: MapRealmId): MapRealmLegend;
	getCardSections(realmId: MapRealmId): readonly MapCardSection[];
	getFactionHomeRealm(factionId: string): MapRealmId;
}

export function createAtlasServices(data: AtlasDataAdapter): AtlasServices {
	const realmById = new Map<MapRealmId, MapRealmLegend>();
	const realms = MAP_REALM_IDS.map(realmId => {
		const campaignRealm = data.realms.find(realm => realm.id === realmId);
		if (!campaignRealm) throw new Error(`Missing campaign realm theory for ${realmId}`);

		const legend: MapRealmLegend = {
			id: realmId,
			name: campaignRealm.name,
			description: campaignRealm.description,
			runeSymbol: campaignRealm.runeSymbol,
			environmentEffect: campaignRealm.environmentEffect,
			environmentDescription: campaignRealm.environmentDescription,
			campaignArc: CAMPAIGN_ARCS[realmId],
			connections: campaignRealm.connections.filter(isMapRealmId),
			color: campaignRealm.color,
			glow: campaignRealm.glow,
			realmShift: getRealmShiftSummary(realmId, data),
		};
		realmById.set(realmId, legend);
		return legend;
	});

	const cardSectionsCache = new Map<MapRealmId, readonly MapCardSection[]>();

	return {
		realms,
		getRealmById(realmId) {
			return realmById.get(realmId) ?? realms[0];
		},
		getCardSections(realmId) {
			const cached = cardSectionsCache.get(realmId);
			if (cached) return cached;

			const sections = buildRealmCardSections(realmId, data);
			cardSectionsCache.set(realmId, sections);
			return sections;
		},
		getFactionHomeRealm(factionId) {
			return data.factionHomeRealms[factionId];
		},
	};
}

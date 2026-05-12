import { CAMPAIGN_ARCS } from '../data/campaignArcs';
import { MAP_REALM_IDS, isMapRealmId } from '../data/realmIds';
import type { MapCardSection, MapRealmId, MapRealmLegend } from '../types';
import { buildRealmCardSections, getCampaignRealm, getRealmShiftSummary } from './cardMatching';

function toMapRealmLegend(realmId: MapRealmId): MapRealmLegend {
	const campaignRealm = getCampaignRealm(realmId);

	return {
		id: realmId,
		name: campaignRealm.name,
		description: campaignRealm.description,
		runeSymbol: campaignRealm.runeSymbol,
		environmentEffect: campaignRealm.environmentEffect,
		environmentDescription: campaignRealm.environmentDescription,
		campaignArc: CAMPAIGN_ARCS[realmId],
		connections: campaignRealm.connections.filter(isMapRealmId),
		color: campaignRealm.color,
		glow: campaignRealm.glowColor,
		realmShift: getRealmShiftSummary(realmId),
	};
}

export const MAP_REALMS: readonly MapRealmLegend[] = MAP_REALM_IDS.map(toMapRealmLegend);

export function getMapRealmById(id: MapRealmId): MapRealmLegend {
	return MAP_REALMS.find(realm => realm.id === id) ?? MAP_REALMS[0];
}

const realmCardSectionsCache = new Map<MapRealmId, readonly MapCardSection[]>();

export function getMapRealmCardSections(realmId: MapRealmId): readonly MapCardSection[] {
	const cachedSections = realmCardSectionsCache.get(realmId);
	if (cachedSections) return cachedSections;

	const sections = buildRealmCardSections(realmId);
	realmCardSectionsCache.set(realmId, sections);
	return sections;
}

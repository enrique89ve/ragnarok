export { REALM_EFFECTS } from './data/effects';
export { REALM_PATHS } from './data/paths';
export { REALM_POLYGONS } from './data/polygons';
export type { RealmPolygon, PolygonContour, PolygonVertex } from './data/polygons';
export { MAP_REALM_IDS, isMapRealmId } from './data/realmIds';
export { CAMPAIGN_ARCS } from './data/campaignArcs';
export { REALM_CARD_MATCHERS } from './data/cardMatchers';
export type { RealmCardMatcher } from './data/cardMatchers';
export { whichRealm, samplePointInRealm, realmBounds, pointInPolygon, sampleInPolygon } from './queries/polygonOps';

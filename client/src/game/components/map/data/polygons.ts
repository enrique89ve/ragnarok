import type { MapRealmId } from '../types';

export interface PolygonVertex {
	x: number;
	y: number;
}

export type PolygonContour = ReadonlyArray<PolygonVertex>;

export interface RealmPolygon {
	contours: ReadonlyArray<PolygonContour>;
}

const EMPTY_POLYGON: RealmPolygon = Object.freeze({ contours: Object.freeze([]) });

export const REALM_POLYGONS: Readonly<Record<MapRealmId, RealmPolygon>> = Object.freeze({
	asgard: EMPTY_POLYGON,
	midgard: EMPTY_POLYGON,
	jotunheim: EMPTY_POLYGON,
	niflheim: EMPTY_POLYGON,
	muspelheim: EMPTY_POLYGON,
	helheim: EMPTY_POLYGON,
	alfheim: EMPTY_POLYGON,
	svartalfheim: EMPTY_POLYGON,
	vanaheim: EMPTY_POLYGON,
});

import { REALM_POLYGONS, type PolygonContour, type PolygonVertex, type RealmPolygon } from '../data/polygons';
import type { MapPoint, MapRealmId } from '../types';

const REALM_HIT_TEST_ORDER: readonly MapRealmId[] = [
	'asgard', 'midgard', 'jotunheim', 'niflheim', 'muspelheim',
	'helheim', 'alfheim', 'svartalfheim', 'vanaheim',
];

export interface PolygonBounds {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

const EMPTY_BOUNDS: PolygonBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

export function isPolygonEmpty(polygon: RealmPolygon): boolean {
	return polygon.contours.length === 0 || polygon.contours.every(contour => contour.length < 3);
}

export function pointInContour(point: MapPoint, contour: PolygonContour): boolean {
	if (contour.length < 3) return false;
	let inside = false;
	for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
		const xi = contour[i].x;
		const yi = contour[i].y;
		const xj = contour[j].x;
		const yj = contour[j].y;
		const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
		if (intersect) inside = !inside;
	}
	return inside;
}

export function pointInPolygon(point: MapPoint, polygon: RealmPolygon): boolean {
	let inside = false;
	for (const contour of polygon.contours) {
		if (pointInContour(point, contour)) inside = !inside;
	}
	return inside;
}

export function polygonBounds(polygon: RealmPolygon): PolygonBounds {
	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;
	let found = false;

	for (const contour of polygon.contours) {
		for (const v of contour) {
			if (v.x < minX) minX = v.x;
			if (v.x > maxX) maxX = v.x;
			if (v.y < minY) minY = v.y;
			if (v.y > maxY) maxY = v.y;
			found = true;
		}
	}

	if (!found) return { ...EMPTY_BOUNDS };
	return { minX, maxX, minY, maxY };
}

export function polygonCentroid(polygon: RealmPolygon): MapPoint | null {
	const main = polygon.contours[0];
	if (!main || main.length === 0) return null;

	let sumX = 0;
	let sumY = 0;
	for (const v of main) {
		sumX += v.x;
		sumY += v.y;
	}
	return { x: sumX / main.length, y: sumY / main.length };
}

const MAX_SAMPLE_ATTEMPTS = 48;

export function sampleInPolygon(polygon: RealmPolygon, rng: () => number = Math.random): MapPoint | null {
	if (isPolygonEmpty(polygon)) return null;
	const bounds = polygonBounds(polygon);
	const width = bounds.maxX - bounds.minX;
	const height = bounds.maxY - bounds.minY;
	if (width <= 0 || height <= 0) return null;

	for (let i = 0; i < MAX_SAMPLE_ATTEMPTS; i++) {
		const point: MapPoint = {
			x: bounds.minX + rng() * width,
			y: bounds.minY + rng() * height,
		};
		if (pointInPolygon(point, polygon)) return point;
	}

	return polygonCentroid(polygon);
}

export function contourToSvgPath(contour: PolygonContour, close = true): string {
	if (contour.length < 2) return '';
	const head = `M${contour[0].x.toFixed(2)},${contour[0].y.toFixed(2)}`;
	const tail = contour.slice(1).map(v => `L${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');
	return `${head} ${tail}${close ? ' Z' : ''}`;
}

export function polygonToSvgPath(polygon: RealmPolygon): string {
	return polygon.contours.map(c => contourToSvgPath(c, true)).join(' ');
}

export function findRealmAtPoint(
	point: MapPoint,
	polygons: Readonly<Record<MapRealmId, RealmPolygon>>,
	order: readonly MapRealmId[],
): MapRealmId | null {
	for (let i = order.length - 1; i >= 0; i--) {
		const realmId = order[i];
		if (pointInPolygon(point, polygons[realmId])) return realmId;
	}
	return null;
}

/** Look up which realm contains a point, using the saved REALM_POLYGONS data.
 *  Intended for gameplay queries like "where is the player?", "which realm is the treasure in?",
 *  or "what spawn region should this event use?".
 *  Returns null if the point doesn't fall in any painted realm.
 */
export function whichRealm(point: MapPoint): MapRealmId | null {
	return findRealmAtPoint(point, REALM_POLYGONS, REALM_HIT_TEST_ORDER);
}

/** Returns a random point inside the named realm, using the saved REALM_POLYGONS data.
 *  Useful for spawning entities (treasure, enemies, events) within a specific territory.
 *  Returns null if the realm has no painted territory yet.
 */
export function samplePointInRealm(realmId: MapRealmId, rng: () => number = Math.random): MapPoint | null {
	return sampleInPolygon(REALM_POLYGONS[realmId], rng);
}

/** Returns the bounding box (%) of a realm's painted territory.
 *  Useful for camera focus, region overlays, AABB filters.
 */
export function realmBounds(realmId: MapRealmId): PolygonBounds {
	return polygonBounds(REALM_POLYGONS[realmId]);
}

export function serializePolygonsAsTsConstant(polygons: Readonly<Record<MapRealmId, RealmPolygon>>): string {
	const realms: readonly MapRealmId[] = [
		'asgard', 'midgard', 'jotunheim', 'niflheim', 'muspelheim',
		'helheim', 'alfheim', 'svartalfheim', 'vanaheim',
	];
	const fmt = (n: number) => Number(n.toFixed(2));
	const formatVertex = (v: PolygonVertex) => `{ x: ${fmt(v.x)}, y: ${fmt(v.y)} }`;
	const formatContour = (c: PolygonContour) => `[\n\t\t\t${c.map(formatVertex).join(',\n\t\t\t')},\n\t\t]`;
	const formatPolygon = (p: RealmPolygon) => {
		if (p.contours.length === 0) return '{ contours: [] }';
		return `{ contours: [\n\t\t${p.contours.map(formatContour).join(',\n\t\t')},\n\t] }`;
	};

	const body = realms.map(r => `\t${r}: ${formatPolygon(polygons[r])},`).join('\n');
	return `export const REALM_POLYGONS: Readonly<Record<MapRealmId, RealmPolygon>> = Object.freeze({\n${body}\n});`;
}

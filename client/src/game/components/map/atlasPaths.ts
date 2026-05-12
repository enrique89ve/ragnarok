import type { MapPoint, MapRealmId } from './types';

export type PathEntityType = 'raven' | 'eagle' | 'comet' | 'rune';
export type PathLoopMode = 'loop' | 'pingpong' | 'once';

export interface PathWaypoint {
	x: number;
	y: number;
}

export interface AtlasPath {
	id: string;
	realmId: MapRealmId;
	entity: PathEntityType;
	waypoints: PathWaypoint[];
	duration: number;
	loopMode: PathLoopMode;
	spawnCount: number;
	scale: number;
	opacity: number;
	color?: string;
}

export const PATH_ENTITY_TYPES: readonly PathEntityType[] = ['raven', 'eagle', 'comet', 'rune'];
export const PATH_LOOP_MODES: readonly PathLoopMode[] = ['loop', 'pingpong', 'once'];

export const PATH_ENTITY_DEFAULTS: Record<PathEntityType, Pick<AtlasPath, 'duration' | 'spawnCount' | 'scale' | 'opacity' | 'color'>> = {
	raven: { duration: 14, spawnCount: 3, scale: 1.0, opacity: 0.9, color: '#0d0d18' },
	eagle: { duration: 18, spawnCount: 1, scale: 1.6, opacity: 0.95, color: '#3a2a14' },
	comet: { duration: 6, spawnCount: 1, scale: 0.8, opacity: 1.0, color: '#cfe7ff' },
	rune: { duration: 10, spawnCount: 2, scale: 1.0, opacity: 0.85, color: '#ffd866' },
};

export type WaypointShape = 'circle' | 'diamond' | 'star' | 'hexagon';

export interface WaypointStyle {
	shape: WaypointShape;
	color: string;
	label: string;
}

export const ENTITY_WAYPOINT_STYLE: Record<PathEntityType, WaypointStyle> = {
	raven: { shape: 'circle', color: '#5b6cff', label: 'R' },
	eagle: { shape: 'diamond', color: '#ffb347', label: 'E' },
	comet: { shape: 'star', color: '#4dd0e1', label: 'C' },
	rune: { shape: 'hexagon', color: '#c77dff', label: 'U' },
};

export function createPath(realmId: MapRealmId, entity: PathEntityType = 'raven'): AtlasPath {
	const defaults = PATH_ENTITY_DEFAULTS[entity];
	return {
		id: `${realmId}-${entity}-${Date.now().toString(36)}`,
		realmId,
		entity,
		waypoints: [
			{ x: 20, y: 50 },
			{ x: 50, y: 30 },
			{ x: 80, y: 50 },
		],
		duration: defaults.duration,
		loopMode: 'loop',
		spawnCount: defaults.spawnCount,
		scale: defaults.scale,
		opacity: defaults.opacity,
		color: defaults.color,
	};
}

interface CatmullSample {
	point: MapPoint;
	tangent: MapPoint;
}

export function sampleCatmullRom(waypoints: readonly PathWaypoint[], t: number, closed = false): CatmullSample {
	if (waypoints.length === 0) return { point: { x: 0, y: 0 }, tangent: { x: 1, y: 0 } };
	if (waypoints.length === 1) return { point: { ...waypoints[0] }, tangent: { x: 1, y: 0 } };
	if (waypoints.length === 2) {
		const a = waypoints[0];
		const b = waypoints[1];
		return {
			point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
			tangent: { x: b.x - a.x, y: b.y - a.y },
		};
	}

	const n = waypoints.length;
	const segCount = closed ? n : n - 1;
	const tt = Math.max(0, Math.min(0.99999, t));
	const segIdx = Math.floor(tt * segCount);
	const segT = tt * segCount - segIdx;

	const getPoint = (i: number): PathWaypoint => {
		if (closed) return waypoints[((i % n) + n) % n];
		if (i < 0) return waypoints[0];
		if (i >= n) return waypoints[n - 1];
		return waypoints[i];
	};

	const p0 = getPoint(segIdx - 1);
	const p1 = getPoint(segIdx);
	const p2 = getPoint(segIdx + 1);
	const p3 = getPoint(segIdx + 2);

	const t2 = segT * segT;
	const t3 = t2 * segT;

	const x = 0.5 * (
		(-t3 + 2 * t2 - segT) * p0.x +
		(3 * t3 - 5 * t2 + 2) * p1.x +
		(-3 * t3 + 4 * t2 + segT) * p2.x +
		(t3 - t2) * p3.x
	);
	const y = 0.5 * (
		(-t3 + 2 * t2 - segT) * p0.y +
		(3 * t3 - 5 * t2 + 2) * p1.y +
		(-3 * t3 + 4 * t2 + segT) * p2.y +
		(t3 - t2) * p3.y
	);

	const dx = 0.5 * (
		(-3 * t2 + 4 * segT - 1) * p0.x +
		(9 * t2 - 10 * segT) * p1.x +
		(-9 * t2 + 8 * segT + 1) * p2.x +
		(3 * t2 - 2 * segT) * p3.x
	);
	const dy = 0.5 * (
		(-3 * t2 + 4 * segT - 1) * p0.y +
		(9 * t2 - 10 * segT) * p1.y +
		(-9 * t2 + 8 * segT + 1) * p2.y +
		(3 * t2 - 2 * segT) * p3.y
	);

	return { point: { x, y }, tangent: { x: dx, y: dy } };
}

export function buildSvgPath(waypoints: readonly PathWaypoint[], samples = 64, closed = false): string {
	if (waypoints.length < 2) return '';

	const points: MapPoint[] = [];
	for (let i = 0; i <= samples; i++) {
		const t = i / samples;
		points.push(sampleCatmullRom(waypoints, t, closed).point);
	}

	return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

export function serializePathsAsTsConstant(paths: readonly AtlasPath[]): string {
	const fmt = (n: number) => Number(n.toFixed(2));
	const entries = paths.map(path => {
		const wp = path.waypoints
			.map(w => `\t\t{ x: ${fmt(w.x)}, y: ${fmt(w.y)} }`)
			.join(',\n');
		const color = path.color ? `, color: '${path.color}'` : '';
		return [
			'\t{',
			`\t\tid: '${path.id}',`,
			`\t\trealmId: '${path.realmId}',`,
			`\t\tentity: '${path.entity}',`,
			`\t\twaypoints: [\n${wp}\n\t\t],`,
			`\t\tduration: ${fmt(path.duration)}, loopMode: '${path.loopMode}', spawnCount: ${path.spawnCount},`,
			`\t\tscale: ${fmt(path.scale)}, opacity: ${fmt(path.opacity)}${color},`,
			'\t}',
		].join('\n');
	}).join(',\n');

	return `export const REALM_PATHS: AtlasPath[] = [\n${entries}\n];`;
}

import {
	POKER_VIEWPORT_LAYOUT,
	POKER_VIEWPORT_ZONE_IDS,
	type PokerViewportZone,
	type PokerViewportZoneId,
} from './pokerViewportLayout';

/** Axis-aligned box in the 1920×1080 arena. */
export interface BoardRect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface BoardOccupant {
	readonly id: string;
	readonly label: string;
	readonly rect: BoardRect;
	/** `always` is on screen during every other window. */
	readonly windows: readonly string[];
	/** Members of one group never render together. */
	readonly exclusiveGroup?: string;
	/** Background plate. Cards sitting on it are not a collision. */
	readonly plate?: boolean;
}

export interface BoardOverlap {
	readonly a: string;
	readonly b: string;
	readonly window: string;
	readonly intersection: BoardRect;
}

const PLATES = new Set<PokerViewportZoneId>(['battlefield', 'vfxFocus', 'wagerActivation']);

/** Pairs that share pixels on purpose: a card tucked on its hero, the timer seated on the ribbon. */
const DESIGNED_OVERLAPS = new Set([
	'bettingControls|playerHand',
	'centerTitle|playerBattlefieldCards',
	'heroActionStamp|playerHero',
	'heroActionStamp|playerHeroCards',
	'hourglass|topHud',
	'opponentHero|opponentHeroCards',
	'playerHero|playerHeroCards',
]);

function zoneRect(zone: PokerViewportZone, anchor: 'top-left' | 'center-top'): BoardRect {
	const x = anchor === 'center-top' ? zone.x - zone.width / 2 : zone.x;
	return { x, y: zone.y, width: zone.width, height: zone.height };
}

/** Matches `--poker-cinema-lane-height` in poker/styles/canvas.css. */
export const CINEMA_LANE_HEIGHT = 60;
/** Matches `--poker-cinema-lane-lift` in poker/styles/canvas.css. */
export const CINEMA_LANE_LIFT = 40;

/**
 * Center-title lane: centred on the player minion row (the open middle of
 * the table) and on the battlefield's horizontal axis. Titles are transient,
 * so sitting over the player's row is designed; they must never clip the
 * opponent row's stat gems or reach the community cards.
 * Mirrors `--poker-cinema-lane-*` in poker/styles/canvas.css.
 */
export function cinemaReadingLane(
	layout: typeof POKER_VIEWPORT_LAYOUT = POKER_VIEWPORT_LAYOUT,
): BoardRect {
	const { playerBattlefieldCards: row } = layout.zones;
	return {
		x: row.x,
		y: Math.round(row.y + (row.height - CINEMA_LANE_HEIGHT) / 2 - CINEMA_LANE_LIFT),
		width: row.width,
		height: CINEMA_LANE_HEIGHT,
	};
}

function showdownBadge(canvasWidth: number, canvasHeight: number, edge: 'top' | 'bottom'): BoardRect {
	const width = Math.min(Math.round(canvasWidth * 0.44), 620);
	const height = 148;
	const x = Math.round((canvasWidth - width) / 2);
	const y = edge === 'top'
		? Math.round(canvasHeight * 0.25)
		: Math.round(canvasHeight * 0.75) - height;
	return { x, y, width, height };
}

/**
 * Every board piece and every timed notice, in arena coordinates.
 * Center titles share one cinema slot, so a phase banner and a realm
 * title are one occupant: they never render together.
 */
export function boardOccupants(): readonly BoardOccupant[] {
	const layout = POKER_VIEWPORT_LAYOUT;
	const { width, height } = layout.reference;
	const zones = layout.zones;
	const occupants: BoardOccupant[] = POKER_VIEWPORT_ZONE_IDS.map((id) => {
		const zone = zones[id];
		const windows = id === 'attackModeBanner'
			? ['attack-target']
			: id === 'feedbackStack'
				? ['feedback']
				: ['always'];
		return {
			id,
			label: zone.label,
			rect: zoneRect(zone, id === 'hourglass' ? 'center-top' : 'top-left'),
			windows,
			plate: PLATES.has(id),
		};
	});

	const readout = cinemaReadingLane(layout);
	occupants.push({
		id: 'centerTitle',
		label: 'Center title (phase, realm, matchup, slam)',
		rect: readout,
		windows: ['cinema'],
		exclusiveGroup: 'cinema',
	});
	occupants.push({
		id: 'showdownVerdict',
		label: 'Showdown verdict',
		rect: showdownBadge(width, height, 'bottom'),
		windows: ['cinema'],
		exclusiveGroup: 'cinema',
	});
	occupants.push({
		id: 'heroActionStamp',
		label: 'Hero action stamp',
		rect: zoneRect(zones.playerHero, 'top-left'),
		windows: ['poker-action'],
	});
	return occupants;
}

function intersection(a: BoardRect, b: BoardRect): BoardRect | null {
	const x = Math.max(a.x, b.x);
	const y = Math.max(a.y, b.y);
	const right = Math.min(a.x + a.width, b.x + b.width);
	const bottom = Math.min(a.y + a.height, b.y + b.height);
	const width = right - x;
	const height = bottom - y;
	if (width <= 0 || height <= 0) return null;
	return { x, y, width, height };
}

function sharedWindow(a: BoardOccupant, b: BoardOccupant): string | null {
	if (a.exclusiveGroup && a.exclusiveGroup === b.exclusiveGroup) return null;
	const aAlways = a.windows.includes('always');
	const bAlways = b.windows.includes('always');
	if (aAlways && bAlways) return 'always';
	if (aAlways) return b.windows.find((window) => window !== 'always') ?? 'always';
	if (bAlways) return a.windows.find((window) => window !== 'always') ?? 'always';
	return a.windows.find((window) => b.windows.includes(window)) ?? null;
}

function pairKey(a: string, b: string): string {
	return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Pairs whose boxes intersect while both can be on screen. */
export function findBoardOverlaps(
	occupants: readonly BoardOccupant[] = boardOccupants(),
): readonly BoardOverlap[] {
	const hits: BoardOverlap[] = [];
	for (let i = 0; i < occupants.length; i += 1) {
		const left = occupants[i];
		if (!left || left.plate) continue;
		for (let j = i + 1; j < occupants.length; j += 1) {
			const right = occupants[j];
			if (!right || right.plate) continue;
			if (DESIGNED_OVERLAPS.has(pairKey(left.id, right.id))) continue;
			const window = sharedWindow(left, right);
			if (!window) continue;
			const shared = intersection(left.rect, right.rect);
			if (!shared) continue;
			const [a, b] = left.id < right.id ? [left.id, right.id] : [right.id, left.id];
			hits.push({ a, b, window, intersection: shared });
		}
	}
	hits.sort((left, right) => pairKey(left.a, left.b).localeCompare(pairKey(right.a, right.b)));
	return hits;
}

export function boardGridRequested(): boolean {
	if (typeof window === 'undefined') return false;
	return new URLSearchParams(window.location.search).get('boardGrid') === '1';
}

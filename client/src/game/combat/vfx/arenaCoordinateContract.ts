/**
 * Canonical 1920x1080 Arena Coordinate Contract.
 *
 * Single source of truth for spatial VFX targets derived directly from
 * `POKER_VIEWPORT_LAYOUT`. Eliminates magic `50% / 50%` anchors (which landed
 * inside `playerBattlefieldCards`) and guarantees directional ownership:
 *
 * - Player hostile pressure (`ATTACK` / `COUNTER_ATTACK`) -> `opponentFront`
 *   (strictly inside `opponentBattlefieldCards`, never on friendly cards or clock)
 * - Opponent hostile pressure -> `playerFront`
 * - Mutual clash / pot focal point (`ENGAGE`, `echo_bet`, `all_in_aura`) ->
 *   `clashCenter` (the empty corridor strictly between enemy row bottom `419`
 *   and player row top `475`)
 */

import {
	POKER_VIEWPORT_LAYOUT,
	type PokerViewportZone,
} from '../../poker/layout/pokerViewportLayout';
import {
	ARENA_CANVAS_SIZE,
	getArenaVfxCoordinateLayer,
	getArenaVfxMinionCardElements,
	getElementCenter,
	type ArenaVfxOwner,
	type QueryRoot,
} from '../arenaVfxTargets';

export interface ArenaCoordPoint {
	readonly x: number;
	readonly y: number;
}

function zoneCenter(zone: PokerViewportZone): ArenaCoordPoint {
	return {
		x: Math.round(zone.x + zone.width / 2),
		y: Math.round(zone.y + zone.height / 2),
	};
}

const { zones } = POKER_VIEWPORT_LAYOUT;

const OPP_ROW_BOTTOM = zones.opponentBattlefieldCards.y + zones.opponentBattlefieldCards.height;
const PLAYER_ROW_TOP = zones.playerBattlefieldCards.y;
const FIELD_CENTER_X = Math.round(
	zones.opponentBattlefieldCards.x + zones.opponentBattlefieldCards.width / 2,
);

export const ARENA_COORDINATE_CONTRACT = {
	canvas: ARENA_CANVAS_SIZE,
	playerHero: zoneCenter(zones.playerHero),
	opponentHero: zoneCenter(zones.opponentHero),
	playerFront: zoneCenter(zones.playerBattlefieldCards),
	opponentFront: zoneCenter(zones.opponentBattlefieldCards),
	/** Exact neutral corridor between enemy row bottom (419) and player row top (475). */
	clashCenter: {
		x: FIELD_CENTER_X,
		y: Math.round((OPP_ROW_BOTTOM + PLAYER_ROW_TOP) / 2),
	},
	communityCenter: zoneCenter(zones.communityCards),
	playerHoleCards: zoneCenter(zones.playerHeroCards),
	opponentHoleCards: zoneCenter(zones.opponentHeroCards),
	playerStamina: {
		x: Math.max(8, zones.playerHero.x - 12),
		y: Math.round(zones.playerHero.y + zones.playerHero.height * 0.45),
	},
	opponentStamina: {
		x: Math.max(8, zones.opponentHero.x - 12),
		y: Math.round(zones.opponentHero.y + zones.opponentHero.height * 0.45),
	},
} as const;

export type ArenaSemanticAnchor = Exclude<keyof typeof ARENA_COORDINATE_CONTRACT, 'canvas'>;

/**
 * Returns the canonical enemy zone target for an actor's offensive pressure
 * (e.g. player Raise/Counter-Attack targets `opponentFront`, never friendly cards).
 */
export function hostileFrontAnchorFor(attacker: ArenaVfxOwner): ArenaCoordPoint {
	return attacker === 'player'
		? ARENA_COORDINATE_CONTRACT.opponentFront
		: ARENA_COORDINATE_CONTRACT.playerFront;
}

/**
 * Converts a canonical 1920x1080 contract point into physical viewport
 * coordinates relative to `#arena-layer-vfx` so Pixi/DOM callers share one space.
 */
export function arenaContractPointToViewport(
	point: ArenaCoordPoint,
	root?: QueryRoot | null,
): ArenaCoordPoint | null {
	const layer = getArenaVfxCoordinateLayer(root);
	if (!layer) return null;
	const rect = layer.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) return null;
	return {
		x: rect.left + (point.x / ARENA_CANVAS_SIZE.width) * rect.width,
		y: rect.top + (point.y / ARENA_CANVAS_SIZE.height) * rect.height,
	};
}

export function resolveContractViewportPoint(
	anchor: ArenaSemanticAnchor,
	root?: QueryRoot | null,
): ArenaCoordPoint | null {
	return arenaContractPointToViewport(ARENA_COORDINATE_CONTRACT[anchor], root);
}

export interface HostileArenaCardTarget {
	readonly point: ArenaCoordPoint;
	readonly element: HTMLElement | null;
	readonly instanceId: string | null;
}

export interface HostileArenaZoneTarget extends HostileArenaCardTarget {
	readonly hasCards: boolean;
	readonly opposingCardCount: number;
	/** Additional distinct opposing cards in rotation order for escalated/overdrive formation echoes. */
	readonly echoTargets: readonly HostileArenaCardTarget[];
}

const hostileZoneCursor: Record<ArenaVfxOwner, number> = {
	player: 0,
	opponent: 0,
};

export function resetHostileArenaZoneCursor(): void {
	hostileZoneCursor.player = 0;
	hostileZoneCursor.opponent = 0;
}

/**
 * Resolves a directional target inside the opposing battlefield arena zone:
 * - Player acting -> Opponent's top battlefield row (`opponentFront`, y=235..419)
 * - Opponent acting -> Player's bottom battlefield row (`playerFront`, y=475..659)
 *
 * When cards occupy that hostile zone, rotates cleanly left-to-right across
 * distinct cards so consecutive actions never pile onto the same card.
 * When empty, falls back to the canonical zone center with `hasCards: false`
 * so the VFX stays subtle.
 */
export function resolveHostileArenaZoneTarget(
	attacker: ArenaVfxOwner,
	root?: QueryRoot | null,
): HostileArenaZoneTarget | null {
	const defender: ArenaVfxOwner = attacker === 'player' ? 'opponent' : 'player';
	const cards = getArenaVfxMinionCardElements(defender, root)
		.map((element) => {
			const rect = element.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return null;
			return {
				element,
				instanceId: element.getAttribute('data-instance-id'),
				point: getElementCenter(element, 0.5),
			};
		})
		.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
		.sort((a, b) => a.point.x - b.point.x);

	if (cards.length > 0) {
		const idx = hostileZoneCursor[attacker] % cards.length;
		hostileZoneCursor[attacker] = (idx + 1) % cards.length;
		const chosen = cards[idx];
		const echoTargets: HostileArenaCardTarget[] = [];
		for (let offset = 1; offset < Math.min(3, cards.length); offset += 1) {
			const next = cards[(idx + offset) % cards.length];
			echoTargets.push({
				point: next.point,
				element: next.element,
				instanceId: next.instanceId,
			});
		}
		return {
			point: chosen.point,
			element: chosen.element,
			instanceId: chosen.instanceId,
			hasCards: true,
			opposingCardCount: cards.length,
			echoTargets,
		};
	}

	const fallback = arenaContractPointToViewport(hostileFrontAnchorFor(attacker), root);
	if (!fallback) return null;
	return {
		point: fallback,
		element: null,
		instanceId: null,
		hasCards: false,
		opposingCardCount: 0,
		echoTargets: [],
	};
}

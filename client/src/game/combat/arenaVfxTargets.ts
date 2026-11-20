export const ARENA_VFX_LAYER_ATTRIBUTE = 'data-vfx-layer' as const;
export const ARENA_VFX_TARGET_ATTRIBUTE = 'data-vfx-target' as const;
export const ARENA_VFX_SLOT_INDEX_ATTRIBUTE = 'data-vfx-slot-index' as const;
export const ARENA_VFX_OWNER_ATTRIBUTE = 'data-vfx-owner' as const;

export const ARENA_VFX_LAYERS = {
	vfx: 'arena-vfx',
	modal: 'arena-modal',
	viewport: 'game-viewport',
	viewportWrapper: 'game-viewport-wrapper',
} as const;

export const ARENA_CANVAS_SIZE = {
	width: 1920,
	height: 1080,
} as const;

export const ARENA_VFX_TARGETS = {
	playerHero: 'player-hero',
	opponentHero: 'opponent-hero',
	playerStamina: 'player-stamina',
	opponentStamina: 'opponent-stamina',
	playerHoleCards: 'player-hole-cards',
	opponentHoleCards: 'opponent-hole-cards',
	heroPowerBadge: 'hero-power-badge',
	communitySlot: 'community-slot',
	riskDisplay: 'risk-display',
	/** Board-center stake sink (hourglass / pot focal point) — not the HUD stakes chip. */
	stakeSink: 'stake-sink',
	playerMinion: 'player-minion',
	opponentMinion: 'opponent-minion',
	spellTrayCard: 'spell-tray-card',
	wagerMinion: 'wager-minion',
} as const;

export type ArenaVfxLayer = typeof ARENA_VFX_LAYERS[keyof typeof ARENA_VFX_LAYERS];
export type ArenaVfxTarget = typeof ARENA_VFX_TARGETS[keyof typeof ARENA_VFX_TARGETS];
export type ArenaVfxOwner = 'player' | 'opponent';
export type ArenaVfxLayerProps = Record<typeof ARENA_VFX_LAYER_ATTRIBUTE, ArenaVfxLayer>;
export type ArenaVfxTargetProps = Record<typeof ARENA_VFX_TARGET_ATTRIBUTE, ArenaVfxTarget>;
export type ArenaVfxCommunitySlotProps = ArenaVfxTargetProps & Record<typeof ARENA_VFX_SLOT_INDEX_ATTRIBUTE, string>;
export type ArenaVfxWagerMinionProps = ArenaVfxTargetProps & Record<typeof ARENA_VFX_OWNER_ATTRIBUTE, ArenaVfxOwner>;

export type QueryRoot = Document | Element;

/** Active poker arena subtree — avoids duplicate `data-vfx-target` hits elsewhere in the document. */
let boundArenaVfxQueryRoot: QueryRoot | null = null;

// ── Layout-Reflow-Free Anchor Rect Cache ────────────────────────────────────
interface CachedElementRect {
	readonly rect: DOMRect;
	readonly gen: number;
	readonly ts: number;
}

const ELEMENT_RECT_TTL_MS = 100;
const rectCache = new WeakMap<Element, CachedElementRect>();
let layoutGeneration = 0;
let windowListenersAttached = false;
let observedLayer: HTMLElement | null = null;
let layerResizeObserver: ResizeObserver | null = null;

export function invalidateArenaRectCache(): void {
	layoutGeneration += 1;
}

function ensureWindowLayoutListeners(): void {
	if (windowListenersAttached || typeof window === 'undefined') return;
	windowListenersAttached = true;
	window.addEventListener('resize', invalidateArenaRectCache, { passive: true });
	window.addEventListener('scroll', invalidateArenaRectCache, { passive: true, capture: true });
}

/**
 * Observes the arena VFX coordinate layer with a single `ResizeObserver` so
 * `getArenaLocalPoint` and `getElementCenter` avoid forced synchronous layout
 * reflows during combat bursts.
 */
export function observeArenaCoordinateLayer(layer: HTMLElement | null): void {
	if (observedLayer === layer) return;
	if (layerResizeObserver) {
		layerResizeObserver.disconnect();
		layerResizeObserver = null;
	}
	observedLayer = layer;
	invalidateArenaRectCache();

	if (!layer || typeof ResizeObserver === 'undefined') return;
	if (typeof Element !== 'undefined' && !(layer instanceof Element)) return;

	ensureWindowLayoutListeners();
	layerResizeObserver = new ResizeObserver(() => {
		invalidateArenaRectCache();
	});
	layerResizeObserver.observe(layer);
}

function getCachedRect(element: Element, ttlMs: number): DOMRect {
	// Plain mock objects in Node/Vitest bypass the WeakMap cache
	if (typeof Element === 'undefined' || !(element instanceof Element)) {
		return element.getBoundingClientRect();
	}
	ensureWindowLayoutListeners();
	const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
	const cached = rectCache.get(element);
	if (
		cached
		&& cached.gen === layoutGeneration
		&& cached.rect.width > 0
		&& cached.rect.height > 0
		&& (ttlMs === Infinity || now - cached.ts <= ttlMs)
	) {
		return cached.rect;
	}
	const rect = element.getBoundingClientRect();
	if (rect.width > 0 && rect.height > 0) {
		rectCache.set(element, { rect, gen: layoutGeneration, ts: now });
	}
	return rect;
}

export function bindArenaVfxQueryRoot(root: QueryRoot | null): void {
	boundArenaVfxQueryRoot = root;
	invalidateArenaRectCache();
}

export function getBoundArenaVfxQueryRoot(): QueryRoot | null {
	return boundArenaVfxQueryRoot;
}

export function arenaVfxLayerProps(layer: ArenaVfxLayer): ArenaVfxLayerProps {
	return { [ARENA_VFX_LAYER_ATTRIBUTE]: layer } as ArenaVfxLayerProps;
}

export function arenaVfxTargetProps(target: ArenaVfxTarget): ArenaVfxTargetProps {
	return { [ARENA_VFX_TARGET_ATTRIBUTE]: target } as ArenaVfxTargetProps;
}

export function arenaVfxCommunitySlotProps(slotIndex: number): ArenaVfxCommunitySlotProps {
	return {
		...arenaVfxTargetProps(ARENA_VFX_TARGETS.communitySlot),
		[ARENA_VFX_SLOT_INDEX_ATTRIBUTE]: String(slotIndex),
	} as ArenaVfxCommunitySlotProps;
}

export function arenaVfxWagerMinionProps(owner: ArenaVfxOwner): ArenaVfxWagerMinionProps {
	return {
		...arenaVfxTargetProps(ARENA_VFX_TARGETS.wagerMinion),
		[ARENA_VFX_OWNER_ATTRIBUTE]: owner,
	} as ArenaVfxWagerMinionProps;
}

export function arenaVfxLayerSelector(layer: ArenaVfxLayer): string {
	return `[${ARENA_VFX_LAYER_ATTRIBUTE}="${layer}"]`;
}

export function arenaVfxTargetSelector(target: ArenaVfxTarget): string {
	return `[${ARENA_VFX_TARGET_ATTRIBUTE}="${target}"]`;
}

function getQueryRoot(root?: QueryRoot | null): QueryRoot | null {
	if (root) return root;
	if (boundArenaVfxQueryRoot) return boundArenaVfxQueryRoot;
	if (typeof document === 'undefined') return null;
	return document;
}

/** Coordinate space for Pixi/DOM VFX — the full-size layer, not nested overlays. */
export function getArenaVfxCoordinateLayer(root?: QueryRoot | null): HTMLElement | null {
	const queryRoot = getQueryRoot(root);
	if (!queryRoot) return null;
	const byId = queryRoot.querySelector<HTMLElement>('#arena-layer-vfx');
	if (byId) return byId;
	return queryRoot.querySelector<HTMLElement>(arenaVfxLayerSelector(ARENA_VFX_LAYERS.vfx));
}

export function getArenaVfxLayer(layer: ArenaVfxLayer, root?: QueryRoot | null): HTMLElement | null {
	return getQueryRoot(root)?.querySelector<HTMLElement>(arenaVfxLayerSelector(layer)) ?? null;
}

/** Convert physical viewport coordinates into the arena's 1920x1080 space. */
export function getArenaLocalPoint(
	point: { x: number; y: number },
	layer: HTMLElement,
): { x: number; y: number } | null {
	const rect = getCachedRect(layer, Infinity);
	if (rect.width <= 0 || rect.height <= 0) return null;

	return {
		x: (point.x - rect.left) * (ARENA_CANVAS_SIZE.width / rect.width),
		y: (point.y - rect.top) * (ARENA_CANVAS_SIZE.height / rect.height),
	};
}

export function getArenaVfxTarget(target: ArenaVfxTarget, root?: QueryRoot | null): HTMLElement | null {
	const queryRoot = getQueryRoot(root);
	if (!queryRoot) return null;
	if (target === ARENA_VFX_TARGETS.riskDisplay) {
		return queryRoot.querySelector<HTMLElement>(
			`${arenaVfxTargetSelector(target)}.hud-status-pot`,
		) ?? queryRoot.querySelector<HTMLElement>(arenaVfxTargetSelector(target));
	}
	return queryRoot.querySelector<HTMLElement>(arenaVfxTargetSelector(target)) ?? null;
}

export function getArenaVfxTargets(target: ArenaVfxTarget, root?: QueryRoot | null): HTMLElement[] {
	const queryRoot = getQueryRoot(root);
	if (!queryRoot) return [];
	return Array.from(queryRoot.querySelectorAll<HTMLElement>(arenaVfxTargetSelector(target)));
}

export function getArenaVfxHeroTarget(owner: ArenaVfxOwner, root?: QueryRoot | null): HTMLElement | null {
	return getArenaVfxTarget(
		owner === 'player' ? ARENA_VFX_TARGETS.playerHero : ARENA_VFX_TARGETS.opponentHero,
		root
	);
}

/** The portrait/frame is the impact receiver; the semantic hero wrapper also contains HUD overlays. */
export function getArenaVfxHeroSurfaceTarget(owner: ArenaVfxOwner, root?: QueryRoot | null): HTMLElement | null {
	const hero = getArenaVfxHeroTarget(owner, root);
	return hero?.querySelector<HTMLElement>('.hero-card-wrapper') ?? hero;
}

export function getArenaVfxStaminaTarget(owner: ArenaVfxOwner, root?: QueryRoot | null): HTMLElement | null {
	return getArenaVfxTarget(
		owner === 'player' ? ARENA_VFX_TARGETS.playerStamina : ARENA_VFX_TARGETS.opponentStamina,
		root,
	) ?? getArenaVfxHeroSurfaceTarget(owner, root);
}

export function getArenaVfxHoleCardsTarget(owner: ArenaVfxOwner, root?: QueryRoot | null): HTMLElement | null {
	return getArenaVfxTarget(
		owner === 'player' ? ARENA_VFX_TARGETS.playerHoleCards : ARENA_VFX_TARGETS.opponentHoleCards,
		root,
	) ?? getArenaVfxHeroTarget(owner, root);
}

export function getArenaVfxHeroPowerTarget(root?: QueryRoot | null): HTMLElement | null {
	return getArenaVfxTarget(ARENA_VFX_TARGETS.heroPowerBadge, root)
		?? getArenaVfxHeroSurfaceTarget('player', root);
}

export function getArenaVfxNextUnrevealedCommunitySlot(root?: QueryRoot | null): HTMLElement | null {
	const slots = getArenaVfxTargets(ARENA_VFX_TARGETS.communitySlot, root);
	if (slots.length === 0) return null;
	const faceDown = slots.find(slot =>
		slot.querySelector('[data-face="down"]') !== null
		|| slot.classList.contains('face-down')
		|| slot.classList.contains('empty'),
	);
	return faceDown ?? getArenaVfxCommunitySlot(4, root) ?? slots[slots.length - 1] ?? null;
}

export function getArenaVfxMinionFieldTarget(owner: ArenaVfxOwner, root?: QueryRoot | null): HTMLElement | null {
	return getArenaVfxTarget(
		owner === 'player' ? ARENA_VFX_TARGETS.playerMinion : ARENA_VFX_TARGETS.opponentMinion,
		root
	);
}

export function getArenaVfxCommunitySlot(slotIndex: number, root?: QueryRoot | null): HTMLElement | null {
	const slots = getArenaVfxTargets(ARENA_VFX_TARGETS.communitySlot, root);
	return slots.find(slot => slot.getAttribute(ARENA_VFX_SLOT_INDEX_ATTRIBUTE) === String(slotIndex)) ?? slots[slotIndex] ?? null;
}

export function getArenaVfxSpellTrayCards(root?: QueryRoot | null): HTMLElement[] {
	return getArenaVfxTargets(ARENA_VFX_TARGETS.spellTrayCard, root);
}

export function getArenaVfxWagerTargets(owner: ArenaVfxOwner, root?: QueryRoot | null): HTMLElement[] {
	return getArenaVfxTargets(ARENA_VFX_TARGETS.wagerMinion, root)
		.filter(element => element.getAttribute(ARENA_VFX_OWNER_ATTRIBUTE) === owner);
}

/** Minion cards currently rendered inside a player's battlefield row. */
export function getArenaVfxMinionCardElements(
	owner: ArenaVfxOwner,
	root?: QueryRoot | null,
): HTMLElement[] {
	const field = getArenaVfxMinionFieldTarget(owner, root);
	if (!field) return [];
	return Array.from(field.querySelectorAll<HTMLElement>('[data-instance-id]'));
}

export function minionCardCenterPoints(
	owner: ArenaVfxOwner,
	root?: QueryRoot | null,
	yRatio = 0.5,
): Array<{ readonly element: HTMLElement; readonly x: number; readonly y: number }> {
	return getArenaVfxMinionCardElements(owner, root).map(element => {
		const center = getElementCenter(element, yRatio);
		return { element, x: center.x, y: center.y };
	});
}

function hasTargetIdentity(element: HTMLElement, targetId: string): boolean {
	return element.getAttribute('data-instance-id') === targetId || element.getAttribute('data-card-id') === targetId;
}

export function getArenaVfxCombatantTarget(targetId: string, root?: QueryRoot | null): HTMLElement | null {
	if (targetId === ARENA_VFX_TARGETS.playerHero) return getArenaVfxHeroTarget('player', root);
	if (targetId === ARENA_VFX_TARGETS.opponentHero) return getArenaVfxHeroTarget('opponent', root);

	const queryRoot = getQueryRoot(root);
	if (!queryRoot) return null;

	const minionTargetSelectors = [
		arenaVfxTargetSelector(ARENA_VFX_TARGETS.playerMinion),
		arenaVfxTargetSelector(ARENA_VFX_TARGETS.opponentMinion),
	];
	const candidates = queryRoot.querySelectorAll<HTMLElement>('[data-instance-id], [data-card-id]');
	for (const candidate of candidates) {
		if (!hasTargetIdentity(candidate, targetId)) continue;
		if (minionTargetSelectors.some(selector => candidate.matches(selector) || candidate.closest(selector))) {
			return candidate;
		}
	}
	return null;
}

export function getElementCenter(element: Element, yRatio = 0.5): { x: number; y: number } {
	const rect = getCachedRect(element, ELEMENT_RECT_TTL_MS);
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height * yRatio,
	};
}

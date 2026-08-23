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

export const ARENA_VFX_TARGETS = {
	playerHero: 'player-hero',
	opponentHero: 'opponent-hero',
	communitySlot: 'community-slot',
	riskDisplay: 'risk-display',
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
	if (typeof document === 'undefined') return null;
	return document;
}

export function getArenaVfxLayer(layer: ArenaVfxLayer, root?: QueryRoot | null): HTMLElement | null {
	return getQueryRoot(root)?.querySelector<HTMLElement>(arenaVfxLayerSelector(layer)) ?? null;
}

export function getArenaVfxTarget(target: ArenaVfxTarget, root?: QueryRoot | null): HTMLElement | null {
	return getQueryRoot(root)?.querySelector<HTMLElement>(arenaVfxTargetSelector(target)) ?? null;
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
	const rect = element.getBoundingClientRect();
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height * yRatio,
	};
}

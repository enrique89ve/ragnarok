/**
 * Dev-only semantic snapshot for browser smoke gates (arena VFX).
 * No gameplay authority — mirrors the last presentation beats for agents/CI.
 */

export type ArenaVfxQaBeat = Readonly<{
	readonly at: number;
	readonly source: 'bettingAction' | 'wagerActivated' | 'spellCast' | 'combatImpact';
	readonly detail: string;
	readonly motion?: string;
}>;

export type ArenaVfxQaSnapshot = Readonly<{
	readonly protocol: 'ragnarok-arena-vfx-qa-v1';
	readonly beats: readonly ArenaVfxQaBeat[];
	readonly bettingPanelVisible: boolean;
	readonly vfxLayerPresent: boolean;
}>;

type ArenaVfxQaGlobal = typeof globalThis & {
	__RAGNAROK_ARENA_VFX_QA__?: ArenaVfxQaSnapshot;
};

const MAX_BEATS = 24;

function qaGlobal(): ArenaVfxQaGlobal {
	return globalThis as ArenaVfxQaGlobal;
}

function isDevSurface(): boolean {
	return typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
}

function readDomFlags(): Pick<ArenaVfxQaSnapshot, 'bettingPanelVisible' | 'vfxLayerPresent'> {
	if (typeof document === 'undefined') {
		return { bettingPanelVisible: false, vfxLayerPresent: false };
	}
	return {
		bettingPanelVisible: Boolean(document.querySelector('[data-zone="betting-panel"]')),
		vfxLayerPresent: Boolean(document.querySelector('[data-vfx-layer="arena-vfx"]')),
	};
}

const beats: ArenaVfxQaBeat[] = [];

export function publishArenaVfxBeat(
	beat: Omit<ArenaVfxQaBeat, 'at'> & { readonly at?: number },
): void {
	if (!isDevSurface()) return;
	beats.push({
		at: beat.at ?? Date.now(),
		source: beat.source,
		detail: beat.detail,
		motion: beat.motion,
	});
	if (beats.length > MAX_BEATS) beats.splice(0, beats.length - MAX_BEATS);
	const dom = readDomFlags();
	qaGlobal().__RAGNAROK_ARENA_VFX_QA__ = Object.freeze({
		protocol: 'ragnarok-arena-vfx-qa-v1',
		beats: Object.freeze([...beats]),
		...dom,
	});
}

export function refreshArenaVfxQaDom(): void {
	if (!isDevSurface() || beats.length === 0) return;
	const dom = readDomFlags();
	qaGlobal().__RAGNAROK_ARENA_VFX_QA__ = Object.freeze({
		protocol: 'ragnarok-arena-vfx-qa-v1',
		beats: Object.freeze([...beats]),
		...dom,
	});
}

export function readArenaVfxQaSnapshot(): ArenaVfxQaSnapshot | null {
	return qaGlobal().__RAGNAROK_ARENA_VFX_QA__ ?? null;
}

export function clearArenaVfxQaSnapshot(): void {
	beats.length = 0;
	delete qaGlobal().__RAGNAROK_ARENA_VFX_QA__;
}
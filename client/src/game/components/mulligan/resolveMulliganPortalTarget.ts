import {
	ARENA_VFX_LAYER_ATTRIBUTE,
	ARENA_VFX_LAYERS,
	getArenaVfxLayer,
	type QueryRoot,
} from '../../combat/arenaVfxTargets';

/** Opening hand portals to the viewport wrapper; later mulligans stay in `#arena-layer-modal`. */
export function resolveMulliganPortalTarget(
	arenaRoot: QueryRoot | null,
	useFullscreenViewport: boolean,
): HTMLElement | null {
	if (useFullscreenViewport) {
		const host = arenaRoot instanceof HTMLElement ? arenaRoot : null;
		const fromArena = host?.closest<HTMLElement>(
			`[${ARENA_VFX_LAYER_ATTRIBUTE}="${ARENA_VFX_LAYERS.viewportWrapper}"]`,
		);
		return fromArena ?? getArenaVfxLayer(ARENA_VFX_LAYERS.viewportWrapper);
	}
	return arenaRoot ? getArenaVfxLayer(ARENA_VFX_LAYERS.modal, arenaRoot) : null;
}
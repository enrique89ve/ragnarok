/**
 * Opening-hand presentation is LoL-weighted in local/single only.
 * P2P keeps authority paths (mulligan wire, first strike, poker clock)
 * on the full arena from poker_combat — no deferred chunk handoff or iris gate.
 */

export function shouldDeferArenaChunkPrefetch(isPeerMatch: boolean, openingGate: boolean): boolean {
	return !isPeerMatch && openingGate;
}

export function shouldUseOpeningHandMulliganHost(isPeerMatch: boolean, openingGate: boolean): boolean {
	return !isPeerMatch && openingGate;
}

export function shouldMulliganSnapEntrance(isPeerMatch: boolean): boolean {
	return !isPeerMatch;
}
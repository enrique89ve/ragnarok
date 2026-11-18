/** Ranked / P2P VS splash — enough time for poker-entry approval UI. */
export const VS_DURATION_RANKED_MS = 3800;
export const VS_MIN_DURATION_RANKED_MS = 3400;

/** Local single / AI — hold the aurora plate ~3–4s before mulligan. */
export const VS_DURATION_SINGLE_MS = 3800;
export const VS_MIN_DURATION_SINGLE_MS = 3000;

export const VS_ENTER_DELAY_MS = 320;
export const VS_EXIT_LEAD_MS = 620;

export function resolveVsScreenDurationMs(
	durationMs: number,
	minDurationMs: number,
): number {
	return Math.max(minDurationMs, durationMs);
}
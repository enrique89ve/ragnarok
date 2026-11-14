/** Shared LoL-style opening-hand timing (one snappy deal beat). */
export const MULLIGAN_LOL = {
	dealStaggerS: 0.03,
	dealTravelS: 0.22,
	flipRevealOffsetS: 0.03,
	actionSettleS: 0.22,
	flipMs: 180,
	primingHandoffMs: 70,
	ghostStaggerMs: 28,
	ghostEnterMs: 200,
	approachFadeS: 0.12,
} as const;

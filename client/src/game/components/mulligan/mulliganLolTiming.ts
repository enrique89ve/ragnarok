import type { CSSProperties } from 'react';

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
	/** Chamber iris that reveals the arena once the hand is committed. */
	irisOpenMs: 480,
} as const;

/** Opening hand in local single — readable instantly, no ghost-deal layering. */
export const MULLIGAN_OPENING_SNAP = {
	dealStaggerS: 0.02,
	dealTravelS: 0.1,
	flipRevealOffsetS: 0,
	actionSettleS: 0.04,
	primingHandoffMs: 0,
} as const;

export type MulliganDealTiming = {
	dealStaggerS: number;
	dealTravelS: number;
	flipRevealOffsetS: number;
	actionSettleS: number;
	primingHandoffMs: number;
};

/** Pins `.mulligan-chamber--iris` to `MULLIGAN_LOL.irisOpenMs`. */
export const mulliganIrisDurationStyle = {
	'--mulligan-iris-ms': `${MULLIGAN_LOL.irisOpenMs}ms`,
} as CSSProperties;

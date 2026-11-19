/**
 * Canon art + class names for VS → opening mulligan → poker arena handoff.
 * CSS tokens live in openingHandBackdrop.css (keep path in sync).
 */
export const OPENING_HAND_PLATE_COLOR = '#05070d' as const;

/** Fullscreen plate for VS screen and mulligan chamber (WebP @ 1920×1080). */
export const OPENING_HAND_BACKDROP_PATH = '/art/chess/opening-hand-aurora-ruins-v1.webp' as const;

export const OPENING_HAND_BACKDROP_CLASSES = {
	layer: 'opening-hand-backdrop-layer',
	vs: 'opening-hand-backdrop-layer--vs',
	chamber: 'opening-hand-backdrop-layer--chamber',
} as const;
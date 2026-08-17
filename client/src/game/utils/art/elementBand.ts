/**
 * Element → tint band lookup.
 *
 * Two-stop gradient anchors per NorseElement. Single source of truth
 * for any chrome that paints an element-tinted band (frame footer
 * gradient, holo overlay color cue, lab swatches, etc.).
 *
 * Keys mirror the canonical NORSE_ELEMENTS union in
 * `client/src/game/types/NorseTypes.ts` — a missing key is a compile
 * error via the `Record<NorseElement, ElementBand>` type.
 *
 * Shared element-band palette for card presentation surfaces.
 * during the <CardFrame> unification (2026-06-11). The dev lab now
 * re-imports from here.
 */

import type { NorseElement } from '../../types/NorseTypes';

export interface ElementBand {
	from: string;
	to: string;
	label: string;
}

export const ELEMENT_BAND: Record<NorseElement, ElementBand> = {
	fire:     { from: '#ff7a30', to: '#c43a16', label: 'Fire' },
	water:    { from: '#4aa8ff', to: '#1c4f8a', label: 'Water' },
	grass:    { from: '#7cc16c', to: '#2f5a23', label: 'Earth' },
	electric: { from: '#f6e356', to: '#7a5b12', label: 'Wind' },
	light:    { from: '#ffe27a', to: '#a07c12', label: 'Holy' },
	dark:     { from: '#a06bff', to: '#3a1a6a', label: 'Shadow' },
	ice:      { from: '#9bd6e8', to: '#3a6f8a', label: 'Ice' },
	neutral:  { from: '#b0b4be', to: '#5a5e6a', label: 'Neutral' },
};

/**
 * Safe lookup with neutral fallback. Use when the element value comes
 * from a wire payload or user-authored field that may not match the
 * canonical union.
 */
export function getElementBand(element: NorseElement | string | undefined): ElementBand {
	if (!element) return ELEMENT_BAND.neutral;
	return (ELEMENT_BAND as Record<string, ElementBand | undefined>)[element] ?? ELEMENT_BAND.neutral;
}

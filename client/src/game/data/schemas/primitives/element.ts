/**
 * Element canon — derived from docs/ElementWeaknessSystem.md.
 *
 * Seven elements:
 *   - Cycle:   fire ↔ earth ↔ wind ↔ water ↔ fire
 *   - Special: holy ↔ shadow (mutual)
 *   - Sink:    neutral (no interactions)
 *
 * The STRONG_AGAINST matrix is *data*, not logic. Combat code looks up a piece's
 * element and reads the array — never branches on element names.
 */
import { z } from 'zod';

export const ELEMENTS = [
	'fire',
	'water',
	'wind',
	'earth',
	'holy',
	'shadow',
	'neutral',
] as const;
export type Element = (typeof ELEMENTS)[number];
export const ElementSchema = z.enum(ELEMENTS);

/**
 * Per ElementWeaknessSystem.md "Combat Buff System": when attacker's element is
 * strong against defender's element, attacker gains +2 atk / +2 hp / +20 armor.
 * Holy and Shadow are mutually strong (per the doc table).
 */
export const STRONG_AGAINST: Readonly<Record<Element, readonly Element[]>> = {
	fire: ['earth'],
	earth: ['wind'],
	wind: ['water'],
	water: ['fire'],
	holy: ['shadow'],
	shadow: ['holy'],
	neutral: [],
};

export const isStrongAgainst = (attacker: Element, defender: Element): boolean =>
	STRONG_AGAINST[attacker].includes(defender);

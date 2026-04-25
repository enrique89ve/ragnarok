/**
 * Card type canon — what role does the card play in the engine?
 *
 * Source: client/src/game/data/cardJson/schema.ts (CardTypeSchema).
 * Each type pairs with a distinct subset of fields (attack, durability, armor, etc.)
 * — those constraints belong to the discriminated union in card.schema.ts, not here.
 */
import { z } from 'zod';

export const CARD_TYPES = [
	'minion',
	'spell',
	'weapon',
	'hero',
	'secret',
	'location',
] as const;
export type CardType = (typeof CARD_TYPES)[number];
export const CardTypeSchema = z.enum(CARD_TYPES);

/**
 * Faction canon — Norse mythology allegiances + cross-cutting categories.
 *
 * Source: faction values used by Norse / Greek / cross-mythology cards.
 */
import { z } from 'zod';

export const FACTIONS = [
	'aesir',
	'vanir',
	'jotnar',
	'mystical beings',
	'pets',
] as const;
export type Faction = (typeof FACTIONS)[number];
export const FactionSchema = z.enum(FACTIONS);

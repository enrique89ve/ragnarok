/**
 * Faction canon — Norse mythology allegiances + cross-cutting categories.
 *
 * Source: docs/NFT_ART_PROTOCOL.md §2.1 + observed values in metadata.json.
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

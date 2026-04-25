/**
 * Card distribution sets.
 *
 * Orthogonal to rarity. Set answers "where did this card come from?",
 * rarity answers "how scarce is it within its set?".
 *
 *  - 'starter' : starter pool, infinite supply, never on-chain. Every player has these
 *                from day one. Identical combat rules to genesis cards; differs only in
 *                meta layers (XP curve, eitr economy, marketplace, pack pools, NFT ownership).
 *  - 'genesis' : the single sealed NFT collection. Finite supply locked at
 *                Genesis ceremony (see docs/GENESIS_RUNBOOK.md). Mintable on Hive.
 */
import { z } from 'zod';

export const SETS = ['starter', 'genesis'] as const;
export type Set = (typeof SETS)[number];
export const SetSchema = z.enum(SETS);

// ── Meta-layer rules per set (data, not logic) ─────────────────────────────
//
// Combat-engine code MUST NOT branch on `set`; it lives in stats and effects.
// Meta-layer code (XP, economy, marketplace, packs) reads these flags.

export interface SetRules {
	readonly collectible: boolean;
	readonly onChain: boolean;
	readonly mintable: boolean;
	readonly participatesInPacks: boolean;
	readonly participatesInEitr: boolean;
}

export const SET_RULES = {
	starter: {
		collectible: false,
		onChain: false,
		mintable: false,
		participatesInPacks: false,
		participatesInEitr: false,
	},
	genesis: {
		collectible: true,
		onChain: true,
		mintable: true, // until Genesis seal; afterwards supply is fixed but each existing token remains mintable-from-pool
		participatesInPacks: true,
		participatesInEitr: true,
	},
} as const satisfies Record<Set, SetRules>;

export const setRules = (s: Set): SetRules => SET_RULES[s];

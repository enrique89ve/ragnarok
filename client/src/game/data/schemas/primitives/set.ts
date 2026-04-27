/**
 * Card distribution set — authoring intent.
 *
 * `set` is what a card AUTHOR declares in the source file (`'starter'` or
 * `'genesis'`). It is OPTIONAL on input. The canonical post-validation
 * discriminator is `category` (`'token' | 'starter' | 'genesis'`) which is
 * computed and stamped at the registry boundary by `validateCardRegistry`.
 *
 * Capabilities matrix (onChain, mintable, inPacks, deckLimit, etc.) lives in
 * `shared/schemas/cardCategory.ts` as `CARD_CATEGORY_TABLE`. That is the
 * single source of truth for "what does this kind of card behave like".
 *
 * Definitions:
 *  - 'starter' : free off-chain card distributed via StarterPackCeremony to
 *                every new player. Infinite supply, never on-chain.
 *  - 'genesis' : sealed NFT collection. Finite supply locked at the Genesis
 *                ceremony (see `docs/GENESIS_RUNBOOK.md`).
 */
import { z } from 'zod';

export const SETS = ['starter', 'genesis'] as const;
export type Set = (typeof SETS)[number];
export const SetSchema = z.enum(SETS);

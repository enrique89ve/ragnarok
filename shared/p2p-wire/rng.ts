/**
 * RNG and IdGen contracts for the P2P symmetric-replay model.
 *
 * Why this file exists: in the host-authoritative model the host is the
 * single source of randomness — but the host's gameState must still be
 * reproducible by the host itself across reloads, and convergence with the
 * client (post-init flip) requires that every random draw and every
 * generated id be a function of `matchSeed` alone, never of `Math.random` or
 * `uuidv4`. Functions that consume randomness or generate identities live
 * in the initial-state and (future) replay paths; their signatures must
 * declare those dependencies as parameters, not pull them from globals.
 *
 * The brands below let the type system distinguish a seeded source from an
 * ambient one. Code that operates inside the P2P boundary takes `SeededRng`
 * / `SeededIdGen`; code that operates in local-play / AI / fallback paths
 * takes the unbranded `() => number` / `() => string` and is free to pass
 * `crypto.getRandomValues` / `crypto.randomUUID`. The brand is one-way: a
 * `SeededRng` is assignable to `() => number`, but a `() => number` is not
 * assignable to `SeededRng` without an explicit constructor.
 *
 * Implementation lives in `client/src/game/utils/seededRng.ts` (mulberry32 +
 * sha256) and is the only place where `SeededRng` / `SeededIdGen` values
 * are minted. Brands cannot be forged from outside that module without
 * casting, which is the point.
 */

declare const SEEDED_RNG_BRAND: unique symbol;
declare const SEEDED_ID_GEN_BRAND: unique symbol;

/**
 * A pseudo-random number generator that has been seeded by `matchSeed`
 * (commit-reveal output of two peers' salts). Returns a number in `[0, 1)`.
 * Two `SeededRng` instances minted from the same seed produce identical
 * sequences in the same order — that is the determinism guarantee.
 */
export type SeededRng = (() => number) & { readonly [SEEDED_RNG_BRAND]: true };

/**
 * A deterministic id generator. `() => string` shape, but every call
 * advances an internal counter so the n-th call from one peer matches the
 * n-th call from the other peer (given the same `matchSeed` and the same
 * `namespace`). Use one `SeededIdGen` per logical id stream — sharing a
 * generator across two unrelated streams (e.g., `player-deck` and
 * `opponent-deck`) would couple their orderings.
 */
export type SeededIdGen = (() => string) & { readonly [SEEDED_ID_GEN_BRAND]: true };

/**
 * Internal helper for the implementation module to mint a branded value
 * from a plain function. Importers outside `seededRng.ts` should never call
 * this — they consume the brand, not produce it.
 */
export function brandSeededRng(fn: () => number): SeededRng {
	return fn as SeededRng;
}

export function brandSeededIdGen(fn: () => string): SeededIdGen {
	return fn as SeededIdGen;
}

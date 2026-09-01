/**
 * Cards-side RNG bound to `${matchSeed}:cards` for the duration of one
 * `applyGameCommand`. Single-player (no matchSeed) falls back to cryptoRng.
 *
 * Nesting is a stack: a nested `withCardsRng` restores the previous stream
 * so executeSpell → executeBattlecry → executeDeathrattle share one stream
 * when they omit an explicit rng.
 */
import { cryptoIdGen, cryptoRng, withDeterministicIdGen, withDeterministicRng } from './seededRng';

let activeRng: (() => number) | null = null;
let activeIdGen: (() => string) | null = null;

/** Drop-in for `cryptoRng()` on the cards command path. */
export function cardsRng(): number {
	return (activeRng ?? cryptoRng)();
}

/** Function handle to pass into helpers that take `rng: () => number`. */
export function getCardsRng(): () => number {
	return activeRng ?? cryptoRng;
}

/** Drop-in for `cryptoIdGen()` on a canonical cards command path. */
export function cardsIdGen(): string {
	return (activeIdGen ?? cryptoIdGen)();
}

/** Function handle for helpers that materialize card instances. */
export function getCardsIdGen(): () => string {
	return activeIdGen ?? cryptoIdGen;
}

export function withCardsRng<T>(rng: () => number, run: () => T): T {
	const prev = activeRng;
	activeRng = rng;
	try {
		return withDeterministicRng(rng, run);
	} finally {
		activeRng = prev;
	}
}

/**
 * Bind peer-visible instance ids for one logical command. The stack mirrors
 * `withCardsRng`, so nested deathrattle/spell helpers share the same stream and
 * restore the caller's generator when they return.
 */
export function withCardsIdGen<T>(idGen: () => string, run: () => T): T {
	const prev = activeIdGen;
	activeIdGen = idGen;
	try {
		return withDeterministicIdGen(idGen, run);
	} finally {
		activeIdGen = prev;
	}
}

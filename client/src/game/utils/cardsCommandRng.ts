/**
 * Cards-side RNG bound to `${matchSeed}:cards` for the duration of one
 * `applyGameCommand`. Single-player (no matchSeed) falls back to cryptoRng.
 *
 * Nesting is a stack: a nested `withCardsRng` restores the previous stream
 * so executeSpell → executeBattlecry → executeDeathrattle share one stream
 * when they omit an explicit rng.
 */
import { cryptoRng } from './seededRng';

let activeRng: (() => number) | null = null;

/** Drop-in for `cryptoRng()` on the cards command path. */
export function cardsRng(): number {
	return (activeRng ?? cryptoRng)();
}

/** Function handle to pass into helpers that take `rng: () => number`. */
export function getCardsRng(): () => number {
	return activeRng ?? cryptoRng;
}

export function withCardsRng<T>(rng: () => number, run: () => T): T {
	const prev = activeRng;
	activeRng = rng;
	try {
		return run();
	} finally {
		activeRng = prev;
	}
}

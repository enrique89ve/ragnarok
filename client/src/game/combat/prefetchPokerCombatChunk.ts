/** Presentation-only warm-up for the lazy poker arena chunk. No gameplay state. */

type PrefetchMode = 'immediate' | 'deferred';

let pokerCombatChunkPrefetch: Promise<unknown> | null = null;
let deferredUntilFlush = false;

function startPokerCombatChunkPrefetch(): void {
	if (pokerCombatChunkPrefetch !== null) return;
	pokerCombatChunkPrefetch = import('./RagnarokCombatArena');
}

/** Begin parse/compile as soon as called (VS, mid-match combat, P2P). */
export function prefetchPokerCombatChunk(): void {
	deferredUntilFlush = false;
	startPokerCombatChunkPrefetch();
}

/** Hold parse until {@link flushPokerCombatChunkPrefetch} — opening-hand mulligan window. */
export function prefetchPokerCombatChunkDeferred(): void {
	if (pokerCombatChunkPrefetch !== null) return;
	deferredUntilFlush = true;
}

/** Release a deferred prefetch or no-op when already started. */
export function flushPokerCombatChunkPrefetch(): void {
	if (!deferredUntilFlush && pokerCombatChunkPrefetch !== null) return;
	deferredUntilFlush = false;
	startPokerCombatChunkPrefetch();
}

/** @internal test reset */
export function resetPokerCombatChunkPrefetchForTests(): void {
	pokerCombatChunkPrefetch = null;
	deferredUntilFlush = false;
}

/** Resolve when the arena module finished loading (waits until a prefetch starts). */
export function whenPokerCombatChunkReady(): Promise<void> {
	if (pokerCombatChunkPrefetch !== null) {
		return pokerCombatChunkPrefetch.then(() => undefined);
	}
	return new Promise<void>(resolve => {
		const tick = (): void => {
			if (pokerCombatChunkPrefetch !== null) {
				pokerCombatChunkPrefetch.then(() => resolve(undefined));
				return;
			}
			if (typeof requestAnimationFrame === 'function') {
				requestAnimationFrame(tick);
			} else {
				setTimeout(tick, 16);
			}
		};
		tick();
	});
}

/** @internal tests */
export function getPokerCombatChunkPrefetchStateForTests(): {
	started: boolean;
	deferred: boolean;
} {
	return {
		started: pokerCombatChunkPrefetch !== null,
		deferred: deferredUntilFlush,
	};
}
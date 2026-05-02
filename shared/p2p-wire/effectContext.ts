/**
 * EffectContext — the deterministic environment in which a card effect (or
 * any state transition produced by a player command) is executed.
 *
 * Why this exists: in the P2P symmetric-replay model, both peers must reach
 * the same `newStateHash` after applying the same command to the same
 * `prevStateHash`. Anything an effect implementation reads from "the
 * environment" — RNG, current Hive block, who triggered the effect — has to
 * be present in the function signature, not pulled from a module-level
 * global, or the two peers will diverge silently.
 *
 * Today the AS dispatcher (`assembly/effects/effectInterpreter.ts`) reads
 * `state.rngState` for `applyRandomDamage` (line 543) and nothing else from
 * the environment. This type captures the full set of environment fields a
 * future effect could legitimately depend on, so adding one is a typed
 * change to the signature instead of a hidden coupling.
 *
 * This commit defines the type only. Wiring it through `applyAction` /
 * `executeEffect` is a separate change.
 */

/** Caller perspective. Used by effects whose semantics depend on whose turn
 * triggered them (e.g. a "your hero takes 1 damage at end of turn" effect).
 * Both peers compute identical results because both observe the same
 * `caller` for the same `commandId`. */
export type EffectCaller = 'player' | 'opponent';

export interface EffectContext {
	/** sha256 of (saltA + saltB) from the commit-reveal seed exchange.
	 * Stable for the full match. Both peers have identical bytes once the
	 * handshake completes. */
	readonly matchSeed: string;

	/** UUID of the wire envelope that triggered the command currently being
	 * applied. Effects that derive RNG from `(matchSeed, commandId, nonce)`
	 * stay deterministic across reorderings of unrelated commands — moving
	 * envelope A before B will not desync the RNG drawn for B's effects. */
	readonly commandId: string;

	/** Monotonic counter advanced by each RNG draw *within* the same
	 * command. A single command can fan out to multiple effects (e.g.
	 * battlecry + on-summon trigger), each consuming one or more RNG values.
	 * The triple `(matchSeed, commandId, rngCounter)` uniquely identifies
	 * every random draw in the match. */
	readonly rngCounter: number;

	/** Hive block-id at the moment the match anchored. Effects that gate on
	 * "after block X" (rare, but supported by the protocol) read this — not
	 * `Date.now()` or the live chain head, both of which break determinism. */
	readonly blockRef: string;

	/** Whose action triggered this effect. */
	readonly caller: EffectCaller;
}

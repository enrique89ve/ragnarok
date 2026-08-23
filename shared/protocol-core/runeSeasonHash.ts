import type { RagnarokRuntimeConfig } from '../runtimeConfig';
import { canonicalStringify } from './hash';
import { fnv1a } from './broadcast-utils';

/**
 * Season identity is the boundary that resets RUNE/Eitr economics.
 * One knob: seasonStart. Stage keeps environments isolated. Changing
 * seasonStart yields a new season id; NFTs/packs/XP are unaffected
 * because they are not season-scoped. resetEpoch/protocolId are storage
 * and environment concerns (they wipe or separate everything via the
 * storage namespace) and deliberately do NOT participate in season
 * identity — one concept, one trigger. See docs/RUNE.md.
 */
export type RuneSeasonIdInput = Pick<
	RagnarokRuntimeConfig,
	'stage' | 'seasonStart'
>;

function seasonBoundaryCanonical(input: RuneSeasonIdInput): string {
	return canonicalStringify({
		stage: input.stage,
		seasonStart: input.seasonStart,
	});
}

const seasonIdCache = new Map<string, string>();

/**
 * Deterministic, synchronous season id derived from the runtime config.
 *
 * Non-cryptographic (FNV-1a, same primitive as card/pack UIDs). It is an
 * identifier, not a commitment: same config always yields the same season id
 * on both client and server, and any boundary change yields a new id. Kept
 * synchronous because season ids are consumed from sync call sites (source-key
 * builders, route defaults, read-model defaults).
 *
 * The derivation is computed once per season boundary and memoized: the runtime
 * config is static for the lifetime of a deployment, so the id is stable and
 * repeated call sites never re-run the hash.
 */
export function deriveRuneSeasonId(input: RuneSeasonIdInput): string {
	const canonical = seasonBoundaryCanonical(input);
	const cached = seasonIdCache.get(canonical);
	if (cached !== undefined) return cached;
	const seasonId = fnv1a(canonical);
	seasonIdCache.set(canonical, seasonId);
	return seasonId;
}

export function isRuneSeasonId(value: string): boolean {
	return /^[0-9a-f]{16}$/.test(value);
}

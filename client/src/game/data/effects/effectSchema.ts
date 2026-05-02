/**
 * Effect schema canon — single source of truth for the parameterized effect
 * shape consumed by the WASM `executeEffect` dispatcher
 * (`assembly/effects/effectInterpreter.ts`).
 *
 * Why this exists: today `BattlecryEffect`, `DeathrattleEffect`, `SpellEffect`
 * in `client/src/game/types.ts` are typed as `{ type: string; [key: string]: any }`.
 * That permits any string as the dispatcher key, so a typo in a card definition
 * (`type: 'damge'`) silently falls into the WASM's "unknown pattern → no-op"
 * branch and the bug only surfaces at game time. This schema enumerates the
 * 20 patterns the dispatcher actually handles and validates the surrounding
 * fields, so a malformed card fails at registry boot — not in the middle of
 * a ranked match.
 *
 * Boundary: this is the TS-side shape (what cards declare in
 * `cardRegistry/sets/...`). The exporter `client/src/game/engine/cardDataExporter.ts`
 * translates this shape into the AS `EffectDef` (`assembly/types/GameState.ts`)
 * before crossing into the WASM. Field renames live there (`type` → `pattern`).
 */

import { z } from 'zod';

// ── Canonical pattern table ────────────────────────────────────────────────
//
// The 20 patterns dispatched by `executeEffect`
// (`assembly/effects/effectInterpreter.ts:37-56`). Adding a pattern requires:
//   1. A new branch in the AS dispatcher.
//   2. A new entry here.
// Removing a pattern is the inverse. The AS dispatcher silently drops unknown
// patterns; this enum is what makes the contract checked at boot.

export const EFFECT_PATTERNS = [
	'damage',
	'aoe_damage',
	'heal',
	'buff',
	'buff_adjacent',
	'draw',
	'summon',
	'destroy',
	'transform',
	'gain_armor',
	'grant_keyword',
	'set_stats',
	'freeze',
	'silence',
	'modify_mana',
	'return_to_hand',
	'copy_to_hand',
	'damage_all',
	'random_damage',
	'conditional',
] as const;

export type EffectPattern = (typeof EFFECT_PATTERNS)[number];

// ── Surrounding-field enums ────────────────────────────────────────────────
//
// These mirror the string literals the AS dispatcher branches on. Listing
// them here makes typos fail-fast in `cardRegistry/sets/`. Where the AS
// dispatcher accepts a free-form `targetType` (e.g. minion `instanceId`
// passed at runtime), `targetType` is matched against the union AND, failing
// that, accepted as an arbitrary string at the dispatcher level — so the
// schema only enforces the well-known *enum* shape and lets unknown strings
// pass through (they will be treated as a runtime target id).

const TARGET_TYPE_ENUM = z.enum([
	// Heroes
	'hero',
	// Minion groups
	'all_minions',
	'all_friendly',
	'all_enemy',
	'enemy_minion',
	'friendly_minion',
	'any_minion',
	// Modifiers / source-relative
	'random',
	'self',
	'adjacent',
	'aoe',
	'any',
	// modify_mana subcommands
	'gain',
	'gain_max',
	'set',
]);

const KEYWORD_ENUM = z.enum([
	'taunt',
	'charge',
	'rush',
	'divine_shield',
	'stealth',
	'windfury',
	'lifesteal',
	'poisonous',
]);

// `targetType` is permissive: enum-or-arbitrary-string, because runtime
// instanceIds get passed in this slot. Boot-time validation only catches
// typos in literals; runtime ids are not enumerable here.
const TargetTypeSchema = z.union([TARGET_TYPE_ENUM, z.string().min(1)]);

// `condition` is similarly permissive: the AS interpreter currently knows a
// handful (`combo`, `if_damaged`, `if_hand_empty`, `if_board_empty`) and
// treats unknown conditions as `false` — which is the right default for
// forward-compat with new conditions added to AS. So we accept any string.
const ConditionSchema = z.string().min(1);

// ── Effect schema ──────────────────────────────────────────────────────────
//
// Mirror of the AS `EffectDef` class (`assembly/types/GameState.ts:66-86`)
// expressed as the TS-side declarative shape (uses `type` instead of
// `pattern` — the exporter renames at the WASM boundary).
//
// All fields except `type` are optional because the AS dispatcher reads only
// the fields each pattern needs. Tightening per-pattern shapes (one
// discriminated branch per pattern) is a follow-up commit; here we lock
// down the dispatcher key and surrounding types without breaking any
// existing card.

export const EffectSchema = z.object({
	type: z.enum(EFFECT_PATTERNS),
	value: z.number().int().optional(),
	value2: z.number().int().optional(),
	targetType: TargetTypeSchema.optional(),
	condition: ConditionSchema.optional(),
	keywords: z.array(KEYWORD_ENUM).optional(),
	cardId: z.number().int().nonnegative().optional(),
	count: z.number().int().nonnegative().optional(),
	requiresTarget: z.boolean().optional(),
});

export type Effect = z.infer<typeof EffectSchema>;

// ── Legacy type aliases ────────────────────────────────────────────────────
//
// Historical synonyms used by older card definitions that map 1-to-1 to a
// canonical pattern WITHOUT field translation. Only safe-by-construction
// renames go here — anything that requires shifting fields (e.g.
// `heal_hero` → `heal` + `targetType: 'hero'`) is NOT a simple alias and
// belongs to a future per-pattern migration.
//
// Why aliases live in the canon (and not in the exporter): the alias must
// be applied identically on every node that hashes / verifies effects —
// otherwise two clients with different mappings would diverge under the
// P2P symmetric-replay model. Centralising here gives a single source of
// truth that the exporter, the registry hash, and any future indexer all
// consume.
//
// Audit baseline (2026-05-02): registry has 2429 cards, 1289 effects, 809
// pre-alias failures. These three aliases recover 26 effects — small but
// proven correct. The remaining ~780 are distinct mechanics, not synonyms.

export const LEGACY_TYPE_ALIASES: Readonly<Record<string, EffectPattern>> = {
	deal_damage: 'damage',
	damage_all_enemies: 'damage_all',
	damage_random: 'random_damage',
};

/** Returns the canonical EffectPattern for a legacy type string, or the
 * input unchanged when no alias applies. Pure; safe to call repeatedly. */
export function canonicalizeEffectType(rawType: string): string {
	const alias = LEGACY_TYPE_ALIASES[rawType];
	return alias ?? rawType;
}

// ── Result-style parser ────────────────────────────────────────────────────
//
// Returns a discriminated result rather than throwing, so call sites in the
// boot path can aggregate errors across the registry instead of crashing on
// the first malformed card. Applies legacy aliases before validation so a
// rename never looks like a failure.

export type EffectParseResult =
	| { ok: true; effect: Effect }
	| { ok: false; reason: string };

export function parseEffect(input: unknown): EffectParseResult {
	const candidate = applyLegacyAlias(input);
	const parsed = EffectSchema.safeParse(candidate);
	if (parsed.success) return { ok: true, effect: parsed.data };
	const firstIssue = parsed.error.issues[0];
	const path = firstIssue.path.length === 0 ? '<root>' : firstIssue.path.join('.');
	return { ok: false, reason: `${path}: ${firstIssue.message}` };
}

function applyLegacyAlias(input: unknown): unknown {
	if (!input || typeof input !== 'object') return input;
	const obj = input as Record<string, unknown>;
	const rawType = obj.type;
	if (typeof rawType !== 'string') return input;
	const canonical = canonicalizeEffectType(rawType);
	if (canonical === rawType) return input;
	return { ...obj, type: canonical };
}

/**
 * Registry hash — deterministic fingerprint of the card registry's
 * gameplay-affecting fields.
 *
 * Why this exists: in the P2P symmetric-replay model, both peers must run
 * identical card data through identical engines for state-hash convergence
 * to hold. The handshake (and `match_anchor` on Hive) carry a
 * `registry_hash` so a stale or tampered registry is rejected before the
 * first command crosses the wire — preventing the "looks like cheating
 * but is really a version skew" failure mode.
 *
 * What goes into the hash: only the fields the WASM engine consumes
 * (mirrored from `cardDataExporter.ts`). Art URIs, flavor text, and
 * presentation metadata are NOT included — those can drift between peers
 * without affecting gameplay determinism.
 *
 * What is *not* this: it isn't `engine_hash` (the WASM bytecode hash —
 * `getWasmHash()` from `wasmLoader.ts`). The two are independent:
 * - `engine_hash` changes when the AS dispatcher logic changes.
 * - `registry_hash` changes when card data changes.
 * Both must match between peers; mismatch on either is a hard abort.
 */

import type { CardData, BattlecryEffect, DeathrattleEffect, SpellEffect } from '../../types';
import { canonicalStringify, sha256Hash } from '../../../data/blockchain/hashUtils';
import { parseEffect } from './effectSchema';

// Keys are short to keep the canonical JSON compact — the hash is what
// matters, not the readability of the pre-image. Order is fixed by sorting
// the JSON output (canonicalStringify), so renaming a key is a breaking
// change for any anchored registry_hash.
interface EffectFingerprint {
	t: string;        // effect.type (validated against EffectSchema)
	v: number;        // effect.value
	v2: number;       // effect.value2
	tt: string;       // effect.targetType
	c: string;        // effect.condition
	k: readonly string[]; // effect.keywords (sorted)
	ci: number;       // effect.cardId
	n: number;        // effect.count
}

interface CardFingerprint {
	id: number;
	name: string;
	type: string;
	manaCost: number;
	attack: number;
	health: number;
	heroClass: string;
	rarity: string;
	race: string;
	heroId: string;
	armorSlot: string;
	overload: number;
	spellDamage: number;
	keywords: readonly string[];        // sorted
	battlecry: EffectFingerprint | null;
	deathrattle: EffectFingerprint | null;
	spellEffect: EffectFingerprint | null;
}

function fingerprintEffect(
	effect: BattlecryEffect | DeathrattleEffect | SpellEffect | undefined | null,
): EffectFingerprint | null {
	if (!effect) return null;
	const parsed = parseEffect(effect);
	if (!parsed.ok) return null; // Skip malformed — same policy as the exporter
	return {
		t: parsed.effect.type,
		v: parsed.effect.value ?? 0,
		v2: parsed.effect.value2 ?? 0,
		tt: parsed.effect.targetType ?? '',
		c: parsed.effect.condition ?? '',
		k: [...(parsed.effect.keywords ?? [])].sort(),
		ci: parsed.effect.cardId ?? 0,
		n: parsed.effect.count ?? 0,
	};
}

function readNumber(card: CardData, key: string, fallback = 0): number {
	const value = (card as unknown as Record<string, unknown>)[key];
	return typeof value === 'number' ? value : fallback;
}

function readString(card: CardData, key: string, fallback = ''): string {
	const value = (card as unknown as Record<string, unknown>)[key];
	return typeof value === 'string' ? value : fallback;
}

function fingerprintCard(card: CardData): CardFingerprint {
	const overloadObj = (card as unknown as { overload?: { amount?: number } }).overload;
	const overloadAmount = (overloadObj && typeof overloadObj.amount === 'number') ? overloadObj.amount : 0;
	const heroClass = readString(card, 'heroClass') || readString(card, 'class') || 'neutral';

	return {
		id: readNumber(card, 'id'),
		name: readString(card, 'name'),
		type: readString(card, 'type'),
		manaCost: readNumber(card, 'manaCost'),
		attack: readNumber(card, 'attack'),
		health: readNumber(card, 'health') || readNumber(card, 'durability'),
		heroClass,
		rarity: readString(card, 'rarity', 'free'),
		race: readString(card, 'race'),
		heroId: readString(card, 'heroId'),
		armorSlot: readString(card, 'armorSlot'),
		overload: overloadAmount,
		spellDamage: readNumber(card, 'spellDamage'),
		keywords: [...(card.keywords ?? [])].sort(),
		battlecry: fingerprintEffect((card as unknown as { battlecry?: BattlecryEffect }).battlecry),
		deathrattle: fingerprintEffect((card as unknown as { deathrattle?: DeathrattleEffect }).deathrattle),
		spellEffect: fingerprintEffect((card as unknown as { spellEffect?: SpellEffect }).spellEffect),
	};
}

/**
 * Compute the deterministic SHA-256 fingerprint of a card registry.
 *
 * Both peers in a P2P match must derive the same `registry_hash` from their
 * locally loaded registry; mismatch at handshake time blocks the match
 * before any command is exchanged. The hash is also published in the Hive
 * `match_anchor` op, so a peer that swaps registries mid-match leaves
 * verifiable evidence of the divergence.
 */
export async function computeRegistryHash(cards: readonly CardData[]): Promise<string> {
	const fingerprints = cards.map(fingerprintCard).sort((a, b) => a.id - b.id);
	return sha256Hash(canonicalStringify(fingerprints));
}

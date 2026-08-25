/** Pure, turn-scoped hash for the canonical Poker combat projection. */

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { Hash256Schema, type Hash256 } from '@shared/p2p-wire/integrity';
import { canonicalStringify } from '@shared/protocol-core/hash';

import type { PokerCombatState } from '../types/PokerCombatTypes';
import { canonicalizePokerCombatState } from './phaseBoundaryProjection';

const ENCODER = new TextEncoder();
const POKER_STATE_HASH_VERSION = 1 as const;

export function computePokerCombatStateHash(state: PokerCombatState | null): Hash256 | null {
	const projection = canonicalizePokerCombatState(state);
	if (projection === null) return null;
	const digest = bytesToHex(sha256(ENCODER.encode(canonicalStringify([
		'ragnarok-poker-state',
		POKER_STATE_HASH_VERSION,
		projection,
	]))));
	return Hash256Schema.parse(digest);
}

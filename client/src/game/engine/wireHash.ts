/**
 * wireHash.ts — shared helpers for `prevStateHash` on P2P envelopes.
 *
 * Both the cards send-path (`useWireSync.wrappedDispatchGameCommand`) and the
 * chess send-path (`chessWireSender`) need the same hash discipline:
 *
	*   1. Canonicalize the local state into the canonical player's perspective (so both
 *      peers serialize the SAME bytes regardless of who's sending).
 *   2. Run the WASM-canonical SHA-256 over the canonical serialization.
 *   3. Apply the documented failure-mode policy on edge cases (pre-init,
 *      eager-load race, unexpected throw) — return `''` and let the
 *      receiver's "missing prev hash" branch retry.
 *
 * Lifting these here keeps `useWireSync.ts` and `chessWireSender.ts` from
 * forking the policy and gives TD-27c-chess a single import surface.
 */

import { computeStateHashSync } from './engineBridge';
import { isWasmReady } from './wasmInterface';
import { debug } from '../config/debugConfig';
import type { GameState } from '../types';

/**
 * Flip an ego-centric game state into the opposite role perspective. The
 * canonical wire frame names the first side `player`, independent of which
 * browser is the transport host. Role ids are normalized after the swap;
 * otherwise an equivalent state would hash differently just because its
 * player objects were exchanged.
 *
 * Used both for UI rendering on the joiner side and for canonicalizing state
 * before hashing so the canonical bytes match.
 */
export function flipGameState(state: GameState): GameState {
	const flippedMulligan = state.mulligan
		? {
			...state.mulligan,
			playerSelections: state.mulligan.opponentSelections ?? {},
			opponentSelections: state.mulligan.playerSelections ?? {},
			playerReady: (state.mulligan as { opponentReady?: boolean }).opponentReady ?? false,
			opponentReady: (state.mulligan as { playerReady?: boolean }).playerReady ?? false,
		}
		: state.mulligan;
	return {
		...state,
		players: {
			player: { ...state.players.opponent, id: 'player' },
			opponent: { ...state.players.player, id: 'opponent' },
		},
		currentTurn: state.currentTurn === 'player' ? 'opponent' : 'player',
		winner: state.winner === 'player' ? 'opponent' : state.winner === 'opponent' ? 'player' : state.winner,
		mulligan: flippedMulligan,
	};
}

/**
 * Compute the WASM-canonical state hash for `prevStateHash` on outgoing
 * cards envelopes. Two named expected failures return `''` (the receiver's
 * existing missing-prev-state-hash branch treats empty as "retry later");
 * a genuinely-unexpected serializer crash is caught defensively so the sync
 * click handler doesn't blow up React's render tree.
 *
 *   state === null     → pre-init lifecycle. Caller hashes before any state
 *                        exists. Receiver retries when state arrives.
 *   !isWasmReady()     → race during eager WASM load. Cleared once WASM
 *                        finishes initializing.
 *   thrown otherwise   → unexpected. Logged at warn so telemetry surfaces
 *                        the bug, return '' to fail-safe rather than crash.
 *
 * Perspective: the peer whose local state is not the canonical player frame
 * (!isCardsAuthority) flips before hashing so both peers compute the same
 * canonical bytes. Mirrors the canonicalization done by periodic hash checks.
 */
export function computeCardsPrevStateHash(state: GameState | null, isCardsAuthority: boolean): string {
	if (!state) return '';
	if (!isWasmReady()) return '';
	try {
		const canonical = isCardsAuthority ? state : flipGameState(state);
		return computeStateHashSync(canonical);
	} catch (err) {
		debug.warn('[wireHash] prev cards-state hash failed unexpectedly', err);
		return '';
	}
}

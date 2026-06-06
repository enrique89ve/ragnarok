import type { ChessCommandEnvelope } from '../../../../shared/p2p-wire/chess';
import type { CompactPokerAction } from '../../../../shared/p2p-wire/combat';
import type { DeckCardClaim } from '../../../../shared/protocol-core/deckVerification';
import type { ServerSignedChallenge } from '@shared/p2pAvailability';
import type { PackagedMatchResult } from '../../data/blockchain/types';
import type { GameCommandEnvelope } from '../hooks/p2pEnvelope';
import type { GameState } from '../types';
import type { ArmySelection } from '../types/ChessTypes';

/**
 * Application-level P2P payloads accepted by `peerStore.send`.
 *
 * This centralizes the wire catalog without extracting a sender: call sites
 * keep their current logic, while TypeScript rejects malformed envelopes before
 * they reach the transport buffer.
 */
export type WireMessage =
	| { type: 'init'; gameState: GameState; isHost: boolean; matchId?: string }
	| GameCommandEnvelope
	| { type: 'gameState'; gameState: GameState }
	| { type: 'opponentDisconnected' }
	| { type: 'ping' }
	| { type: 'pong' }
	| {
			type: 'deck_verify';
			hiveAccount: string;
			protocolVersion: 2;
			claims: readonly DeckCardClaim[];
		}
	| { type: 'seed_commit'; commitment: string }
	| { type: 'seed_reveal'; salt: string; hiveUsername?: string }
	| { type: 'army_announcement'; army: ArmySelection }
	| { type: 'result_propose'; result: PackagedMatchResult; hash: string; broadcasterSig: string; proposalId: string }
	| { type: 'result_countersign'; counterpartySig: string; proposalId: string }
	| { type: 'result_reject'; reason: string }
	| { type: 'version_check'; buildHash: string }
	| { type: 'wasm_hash_check'; wasmHash: string }
	| { type: 'hash_check'; stateHash: string; chessStateHash: string; chessMoveCount: number; turnNumber: number }
	| { type: 'hash_mismatch'; turnNumber: number; myHash: string }
	| { type: 'poker_action'; playerId: string; action: string; hpCommitment?: number; compact?: CompactPokerAction; turnId?: string; decisionId: string; sentAtMs?: number }
	| { type: 'poker_turn_started'; combatId: string; turnId: string; phase: string; activePlayerId: string; actionsThisRound: number; durationMs: number; remainingMs?: number; sentAtMs: number }
	| ChessCommandEnvelope
	// ── Phase 0 protocol-v2 envelopes (ADR 0004 §Decision.6) ─────────────
	// Schema/wire only at this stage — handlers land in issues 02 / 06 / 03.
	// Inner `action: unknown` on `action_envelope` is intentional: the per-
	// action schema is owned by issue 03 (signed-transcript builder) and
	// must not be narrowed here.
	| {
		type: 'session_authorize';
		matchId: string;
		ephemeralPubkey: string;
		hiveSig: string;
		matchChallenge?: ServerSignedChallenge;
	}
	| { type: 'session_renewal'; matchId: string; newPubkey: string; hiveSig: string }
	| { type: 'session_resumed'; matchId: string; lastSeenStateHash: string }
	| { type: 'state_sync_request'; matchId: string; fromTurn: number }
	| { type: 'action_envelope'; matchId: string; seq: number; prevHash: string; action: unknown; sig: string };

export interface HeartbeatMessage {
	readonly type: 'heartbeat';
	readonly t: number;
}

export type P2PMessage = WireMessage | HeartbeatMessage;

import type { ChessCommandEnvelope } from '../../../../shared/p2p-wire/chess';
import type { CompactPokerAction, PokerActionOrigin } from '../../../../shared/p2p-wire/combat';
import type { TransitionReceiptMessage } from '../../../../shared/p2p-wire/integrity';
import type {
	PhaseCheckpointProposal,
	PhaseCheckpointServerMessage,
} from '../../../../shared/p2p-wire/phaseCheckpoint';
import type { PokerTurnNotaryServerMessage } from '../../../../shared/p2p-wire/pokerTimeNotary';
import type { DeckCardClaim } from '../../../../shared/protocol-core/deckVerification';
import type { ServerSignedChallenge } from '@shared/p2pAvailability';
import type { PackagedMatchResult } from '../../data/blockchain/types';
import type { GameCommandEnvelope } from '../hooks/p2pEnvelope';
import type { ArmySelection } from '../types/ChessTypes';
import type { GameStateWirePayload } from './stateFrameCodec';
import type { MatchAcceptanceProof } from '../../../../shared/p2pMatchAcceptance';
import type { P2PBattleReadyProof } from './battleReady';

/**
 * Challenge shape allowed inside `session_authorize`.
 *
 * `P2PMatchTicket` is a relay-handshake credential, not a game-wire credential.
 * Always build this via `stripRelayMatchTicketFromSessionChallenge()` before
 * signing/sending; TypeScript is structurally typed, so this alias documents
 * the intended shape while the runtime schema remains the hard boundary.
 */
export type SessionAuthorizeChallenge = Omit<ServerSignedChallenge, 'matchTicket'>;

/**
 * Application-level P2P payloads accepted by `peerStore.send`.
 *
 * This centralizes the wire catalog without extracting a sender: call sites
 * keep their current logic, while TypeScript rejects malformed envelopes before
 * they reach the transport buffer.
 */
export type WireMessage =
	| ({ type: 'init'; isHost: boolean; matchId?: string } & GameStateWirePayload)
	| GameCommandEnvelope
	| ({ type: 'gameState' } & GameStateWirePayload)
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
	| {
			type: 'cards_deck';
			heroClass: string;
			heroId?: string;
			cardIds: readonly number[];
			nftLevels: readonly { cardId: number; level: number }[];
		}
	| { type: 'result_propose'; result: PackagedMatchResult; hash: string; broadcasterSig: string; proposalId: string }
	| { type: 'result_countersign'; counterpartySig: string; proposalId: string }
	| { type: 'result_reject'; reason: string }
	| { type: 'version_check'; buildHash: string }
	| { type: 'wasm_hash_check'; wasmHash: string }
	| ({ type: 'battle_ready_v1' } & P2PBattleReadyProof)
	| { type: 'hash_check'; stateHash: string; chessStateHash: string; chessMoveCount: number; turnNumber: number }
	| { type: 'poker_hash_check'; pokerStateHash: string; phase: 'pre_flop' | 'faith' | 'foresight' | 'destiny'; turnId: string; actionsThisRound: number }
	| { type: 'hash_mismatch'; turnNumber: number; myHash: string }
	| { type: 'poker_action'; playerId: string; action: string; origin: PokerActionOrigin; hpCommitment?: number; compact?: CompactPokerAction; turnId: string; decisionId: string; sentAtMs?: number }
	| { type: 'poker_turn_started'; combatId: string; turnId: string; phase: string; activePlayerId: string; actionsThisRound: number; durationMs: number; remainingMs?: number; sentAtMs: number }
	| ChessCommandEnvelope
	| TransitionReceiptMessage
	| PhaseCheckpointProposal
	| PhaseCheckpointServerMessage
	| PokerTurnNotaryServerMessage
	// ── Phase 0 protocol-v2 envelopes (ADR 0004 §Decision.6) ─────────────
	// Schema/wire only at this stage — handlers land in issues 02 / 06 / 03.
	// Inner `action: unknown` on `action_envelope` is intentional: the per-
	// action schema is owned by issue 03 (signed-transcript builder) and
	// must not be narrowed here.
	| {
		type: 'session_authorize';
		matchId: string;
		ephemeralPubkey: string;
		hiveSig?: string;
		acceptance?: MatchAcceptanceProof;
		matchChallenge?: SessionAuthorizeChallenge;
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

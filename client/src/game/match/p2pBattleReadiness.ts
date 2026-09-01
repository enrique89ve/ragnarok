import type { P2PConnectionState } from '../stores/peerStore';
import type { ArmySelection } from '../types/ChessTypes';
import type { P2PMatchTicket } from '@shared/p2pAvailability';
import { compareBattleReadyProofs, type P2PBattleReadyProof } from '../p2p/battleReady';

export type P2PBattleReadinessInput = {
	readonly activeMatchKind: 'peer' | 'other' | null;
	readonly serverMatchCommitted: boolean;
	readonly localAcceptanceVerified: boolean;
	readonly remoteAcceptanceVerified: boolean;
	readonly matchTicket: P2PMatchTicket | null;
	readonly expectedRoomId: string | null;
	readonly expectedPeerId: string | null;
	readonly connectionState: P2PConnectionState;
	readonly remotePeerId: string | null;
	readonly matchId: string | null;
	readonly matchSeed: string | null;
	readonly opponentArmy: ArmySelection | null;
	readonly p2pInitApplied: boolean;
	readonly expectedRemoteLoadoutHash?: string | null;
	readonly localBattleReady: P2PBattleReadyProof | null;
	readonly remoteBattleReady: P2PBattleReadyProof | null;
	readonly now?: number;
};

export type P2PBattleReadiness =
	| { readonly ready: false; readonly reason: string }
	| { readonly ready: true };

export function computeP2PBattleReadiness(input: P2PBattleReadinessInput): P2PBattleReadiness {
	if (input.activeMatchKind !== 'peer') return { ready: false, reason: 'P2P match context is not active' };
	if (input.serverMatchCommitted) {
		if (!input.localAcceptanceVerified) return { ready: false, reason: 'Local match acceptance is not verified' };
		if (!input.remoteAcceptanceVerified) return { ready: false, reason: 'Opponent match acceptance is not verified' };
		if (!input.matchTicket || !input.expectedRoomId || !input.expectedPeerId) {
			return { ready: false, reason: 'Valid relay ticket is required' };
		}
	}
	if (input.matchTicket) {
		if (input.expectedRoomId && input.matchTicket.roomId !== input.expectedRoomId) {
			return { ready: false, reason: 'Relay ticket does not match this room' };
		}
		if (input.expectedPeerId && input.matchTicket.peerId !== input.expectedPeerId) {
			return { ready: false, reason: 'Relay ticket does not match this peer' };
		}
		if (input.matchTicket.expiresAt <= (input.now ?? Date.now())) {
			return { ready: false, reason: 'Relay ticket has expired' };
		}
	}
	if (!input.matchId) return { ready: false, reason: 'P2P match identity is incomplete' };
	if (input.serverMatchCommitted && input.matchId !== input.expectedRoomId) {
		return { ready: false, reason: 'Match identity does not match the committed room' };
	}
	if (input.connectionState !== 'connected') return { ready: false, reason: 'P2P connection is not established' };
	if (!input.remotePeerId || !input.matchSeed) {
		return { ready: false, reason: 'P2P identity and seed are incomplete' };
	}
	if (!input.opponentArmy) return { ready: false, reason: 'Opponent loadout is not available' };
	if (!input.p2pInitApplied) return { ready: false, reason: 'P2P initial state has not been applied' };
	if (!input.localBattleReady) return { ready: false, reason: 'Local battle-ready proof is not complete' };
	if (!input.remoteBattleReady) return { ready: false, reason: 'Opponent battle-ready proof is not complete' };
	// `undefined` is possible while the handshake is still being assembled
	// (the field is optional for legacy/direct callers). It is still an
	// unavailable commitment, never evidence that the remote loadout is safe.
	if (input.expectedRemoteLoadoutHash == null) {
		return { ready: false, reason: 'Opponent loadout commitment is not available' };
	}
	const proofComparison = compareBattleReadyProofs(input.localBattleReady, input.remoteBattleReady, {
		expectedRemoteLoadoutHash: input.expectedRemoteLoadoutHash,
	});
	if (!proofComparison.ok) return { ready: false, reason: proofComparison.reason };
	return { ready: true };
}

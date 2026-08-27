import type { P2PConnectionState } from '../stores/peerStore';
import type { ArmySelection } from '../types/ChessTypes';
import type { P2PMatchTicket } from '@shared/p2pAvailability';

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
	readonly now?: number;
};

export type P2PBattleReadiness =
	| { readonly ready: false; readonly reason: string }
	| { readonly ready: true };

export function computeP2PBattleReadiness(input: P2PBattleReadinessInput): P2PBattleReadiness {
	if (input.activeMatchKind !== 'peer') return { ready: false, reason: 'P2P match context is not active' };
	if (!input.serverMatchCommitted) return { ready: false, reason: 'Match offer has not been committed' };
	if (!input.localAcceptanceVerified) return { ready: false, reason: 'Local match acceptance is not verified' };
	if (!input.remoteAcceptanceVerified) return { ready: false, reason: 'Opponent match acceptance is not verified' };
	if (!input.matchTicket || !input.expectedRoomId || !input.expectedPeerId) {
		return { ready: false, reason: 'Valid relay ticket is required' };
	}
	if (input.matchTicket.roomId !== input.expectedRoomId || input.matchTicket.peerId !== input.expectedPeerId) {
		return { ready: false, reason: 'Relay ticket does not match this peer and room' };
	}
	if (input.matchId !== input.expectedRoomId) {
		return { ready: false, reason: 'Match identity does not match the committed room' };
	}
	if (input.matchTicket.expiresAt <= (input.now ?? Date.now())) {
		return { ready: false, reason: 'Relay ticket has expired' };
	}
	if (input.connectionState !== 'connected') return { ready: false, reason: 'P2P connection is not established' };
	if (!input.remotePeerId || !input.matchId || !input.matchSeed) {
		return { ready: false, reason: 'P2P identity and seed are incomplete' };
	}
	if (!input.opponentArmy) return { ready: false, reason: 'Opponent loadout is not available' };
	if (!input.p2pInitApplied) return { ready: false, reason: 'P2P initial state has not been applied' };
	return { ready: true };
}

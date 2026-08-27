import type { P2PMatchTicket, ServerSignedChallenge } from '../../shared/p2pAvailability';

export type P2PActiveMatch = {
	readonly offerId: string;
	readonly player1: string;
	readonly player2: string;
	readonly player1Username?: string;
	readonly player2Username?: string;
	readonly createdAt: number;
	readonly player1MatchChallenge: ServerSignedChallenge | null;
	readonly player2MatchChallenge: ServerSignedChallenge | null;
	readonly player1MatchTicket: P2PMatchTicket;
	readonly player2MatchTicket: P2PMatchTicket;
	readonly player1QueueTokenHash: string;
	readonly player2QueueTokenHash: string;
};

export type P2PMatchPeerView = {
	readonly isHost: boolean;
	readonly opponentPeerId: string;
	readonly username?: string;
	readonly matchChallenge: ServerSignedChallenge | null;
	readonly opponentMatchChallenge: ServerSignedChallenge | null;
	readonly matchTicket: P2PMatchTicket;
	readonly queueTokenHash: string;
};

export function getP2PMatchPeerView(match: P2PActiveMatch, peerId: string): P2PMatchPeerView | null {
	if (match.player1 === peerId) {
		return {
			isHost: true,
			opponentPeerId: match.player2,
			...(match.player1Username ? { username: match.player1Username } : {}),
			matchChallenge: match.player1MatchChallenge,
			opponentMatchChallenge: match.player2MatchChallenge,
			matchTicket: match.player1MatchTicket,
			queueTokenHash: match.player1QueueTokenHash,
		};
	}

	if (match.player2 === peerId) {
		return {
			isHost: false,
			opponentPeerId: match.player1,
			...(match.player2Username ? { username: match.player2Username } : {}),
			matchChallenge: match.player2MatchChallenge,
			opponentMatchChallenge: match.player1MatchChallenge,
			matchTicket: match.player2MatchTicket,
			queueTokenHash: match.player2QueueTokenHash,
		};
	}

	return null;
}

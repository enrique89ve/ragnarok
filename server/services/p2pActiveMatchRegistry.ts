import {
	getP2PMatchPeerView,
	type P2PActiveMatch,
	type P2PMatchPeerView,
} from './p2pMatchmakingView';

type ActiveMatchTicketAccess =
	| {
			readonly ok: true;
			readonly matchId: string;
			readonly match: P2PActiveMatch;
			readonly peerView: P2PMatchPeerView;
	  }
	| { readonly ok: false; readonly reason: 'not_found' | 'peer_not_in_match' | 'ticket_mismatch' | 'expired' };

const activeMatches = new Map<string, P2PActiveMatch>();
const activeMatchIdsByPeerId = new Map<string, string>();
const activeMatchExpiryTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const P2P_ACTIVE_MATCH_TTL_MS = 5 * 60 * 1000;

export function registerP2PActiveMatch(matchId: string, match: P2PActiveMatch): void {
	activeMatches.set(matchId, match);
	activeMatchIdsByPeerId.set(match.player1, matchId);
	activeMatchIdsByPeerId.set(match.player2, matchId);
	const existingTimer = activeMatchExpiryTimers.get(matchId);
	if (existingTimer) clearTimeout(existingTimer);
	const expiryTimer = setTimeout(() => removeP2PActiveMatch(matchId), P2P_ACTIVE_MATCH_TTL_MS);
	expiryTimer.unref?.();
	activeMatchExpiryTimers.set(matchId, expiryTimer);
}

export function removeP2PActiveMatch(matchId: string): void {
	const match = activeMatches.get(matchId);
	if (match) {
		if (activeMatchIdsByPeerId.get(match.player1) === matchId) activeMatchIdsByPeerId.delete(match.player1);
		if (activeMatchIdsByPeerId.get(match.player2) === matchId) activeMatchIdsByPeerId.delete(match.player2);
	}
	activeMatches.delete(matchId);
	const expiryTimer = activeMatchExpiryTimers.get(matchId);
	if (expiryTimer) clearTimeout(expiryTimer);
	activeMatchExpiryTimers.delete(matchId);
}

export function releaseP2PActiveMatchPeer(peerId: string): void {
	activeMatchIdsByPeerId.delete(peerId);
}

export function getP2PActiveMatchById(matchId: string): P2PActiveMatch | undefined {
	return activeMatches.get(matchId);
}

export function getP2PActiveMatchIdForPeer(peerId: string): string | undefined {
	return activeMatchIdsByPeerId.get(peerId);
}

export function hasP2PActiveMatchPeer(peerId: string, matchId: string): boolean {
	return activeMatchIdsByPeerId.get(peerId) === matchId;
}

export function getP2PActiveMatchCount(): number {
	return activeMatches.size;
}

export function clearP2PActiveMatches(): void {
	for (const timer of activeMatchExpiryTimers.values()) clearTimeout(timer);
	activeMatchExpiryTimers.clear();
	activeMatches.clear();
	activeMatchIdsByPeerId.clear();
}

export function sweepP2PActiveMatches(now = Date.now()): void {
	for (const [matchId, match] of activeMatches.entries()) {
		if (now - match.createdAt > P2P_ACTIVE_MATCH_TTL_MS) removeP2PActiveMatch(matchId);
	}
}

export function verifyP2PActiveMatchTicket(input: {
	readonly roomId: string;
	readonly peerId: string;
	readonly token: string;
	readonly now?: number;
}): ActiveMatchTicketAccess {
	const match = getP2PActiveMatchById(input.roomId);
	if (!match) return { ok: false, reason: 'not_found' };
	const peerView = getP2PMatchPeerView(match, input.peerId);
	if (!peerView) return { ok: false, reason: 'peer_not_in_match' };
	if (peerView.matchTicket.token !== input.token) return { ok: false, reason: 'ticket_mismatch' };
	if (peerView.matchTicket.expiresAt <= (input.now ?? Date.now())) {
		removeP2PActiveMatch(input.roomId);
		return { ok: false, reason: 'expired' };
	}
	return { ok: true, matchId: input.roomId, match, peerView };
}

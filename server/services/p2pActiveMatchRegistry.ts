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
const terminalCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
const releasedPeersByMatchId = new Map<string, Set<string>>();
const terminalAtByMatchId = new Map<string, number>();

/**
 * A match is not queue state.  Keep its authority binding alive while the
 * ticket is still valid; this cap only prevents an abandoned in-memory match
 * from living forever if neither peer sends an explicit leave/terminal event.
 */
export const P2P_ACTIVE_MATCH_SAFETY_TTL_MS = 24 * 60 * 60 * 1000;
export const P2P_ACTIVE_MATCH_TERMINAL_RETENTION_MS = 10 * 60 * 1000;

// Compatibility name for callers that used the old queue-lifetime constant.
// New code should use P2P_ACTIVE_MATCH_SAFETY_TTL_MS explicitly.
export const P2P_ACTIVE_MATCH_TTL_MS = P2P_ACTIVE_MATCH_SAFETY_TTL_MS;

function clearTerminalCleanupTimer(matchId: string): void {
	const timer = terminalCleanupTimers.get(matchId);
	if (!timer) return;
	clearTimeout(timer);
	terminalCleanupTimers.delete(matchId);
}

function scheduleTerminalCleanup(matchId: string, terminalAt: number): void {
	clearTerminalCleanupTimer(matchId);
	const delayMs = Math.max(0, terminalAt + P2P_ACTIVE_MATCH_TERMINAL_RETENTION_MS - Date.now());
	const timer = setTimeout(() => {
		terminalCleanupTimers.delete(matchId);
		if (terminalAtByMatchId.get(matchId) !== terminalAt) return;
		if (Date.now() < terminalAt + P2P_ACTIVE_MATCH_TERMINAL_RETENTION_MS) {
			scheduleTerminalCleanup(matchId, terminalAt);
			return;
		}
		removeP2PActiveMatch(matchId);
	}, delayMs);
	timer.unref?.();
	terminalCleanupTimers.set(matchId, timer);
}

export function registerP2PActiveMatch(matchId: string, match: P2PActiveMatch): void {
	activeMatches.set(matchId, match);
	activeMatchIdsByPeerId.set(match.player1, matchId);
	activeMatchIdsByPeerId.set(match.player2, matchId);
	releasedPeersByMatchId.delete(matchId);
	terminalAtByMatchId.delete(matchId);
	clearTerminalCleanupTimer(matchId);
	const existingTimer = activeMatchExpiryTimers.get(matchId);
	if (existingTimer) clearTimeout(existingTimer);
	const expiryTimer = setTimeout(() => removeP2PActiveMatch(matchId), P2P_ACTIVE_MATCH_SAFETY_TTL_MS);
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
	releasedPeersByMatchId.delete(matchId);
	terminalAtByMatchId.delete(matchId);
	clearTerminalCleanupTimer(matchId);
	const expiryTimer = activeMatchExpiryTimers.get(matchId);
	if (expiryTimer) clearTimeout(expiryTimer);
	activeMatchExpiryTimers.delete(matchId);
}

export function releaseP2PActiveMatchPeer(peerId: string): void {
	const matchId = activeMatchIdsByPeerId.get(peerId);
	if (!matchId) return;
	activeMatchIdsByPeerId.delete(peerId);
	const releasedPeers = releasedPeersByMatchId.get(matchId) ?? new Set<string>();
	releasedPeers.add(peerId);
	releasedPeersByMatchId.set(matchId, releasedPeers);
}

/** Mark a match terminal while retaining its signed binding briefly for audit/retry. */
export function markP2PActiveMatchTerminal(matchId: string, terminalAt = Date.now()): boolean {
	if (!activeMatches.has(matchId)) return false;
	terminalAtByMatchId.set(matchId, terminalAt);
	scheduleTerminalCleanup(matchId, terminalAt);
	return true;
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
	for (const timer of terminalCleanupTimers.values()) clearTimeout(timer);
	activeMatchExpiryTimers.clear();
	terminalCleanupTimers.clear();
	activeMatches.clear();
	activeMatchIdsByPeerId.clear();
	releasedPeersByMatchId.clear();
	terminalAtByMatchId.clear();
}

export function sweepP2PActiveMatches(now = Date.now()): void {
	for (const [matchId, match] of activeMatches.entries()) {
		const terminalAt = terminalAtByMatchId.get(matchId);
		if (terminalAt !== undefined && now - terminalAt >= P2P_ACTIVE_MATCH_TERMINAL_RETENTION_MS) {
			removeP2PActiveMatch(matchId);
			continue;
		}
		if (now - match.createdAt >= P2P_ACTIVE_MATCH_SAFETY_TTL_MS) removeP2PActiveMatch(matchId);
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
	if (!hasP2PActiveMatchPeer(input.peerId, input.roomId)) {
		return { ok: false, reason: 'peer_not_in_match' };
	}
	const peerView = getP2PMatchPeerView(match, input.peerId);
	if (!peerView) return { ok: false, reason: 'peer_not_in_match' };
	if (peerView.matchTicket.token !== input.token) return { ok: false, reason: 'ticket_mismatch' };
	if (peerView.matchTicket.expiresAt <= (input.now ?? Date.now())) {
		removeP2PActiveMatch(input.roomId);
		return { ok: false, reason: 'expired' };
	}
	return { ok: true, matchId: input.roomId, match, peerView };
}

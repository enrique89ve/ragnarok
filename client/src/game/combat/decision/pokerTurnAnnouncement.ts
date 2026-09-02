export interface PokerTurnAnnouncementInput {
	readonly turnId: string | null | undefined;
	readonly announcedTurnId: string | null;
	readonly transportConnected: boolean;
}

export interface PokerTurnAnnouncementDecision {
	readonly shouldSend: boolean;
	readonly nextAnnouncedTurnId: string | null;
}

/**
 * A turn proposal is idempotent at the server notary (same peer + identity
 * returns the pending/committed result). Keep retry traffic below the relay's
 * checkpoint bucket while still recovering when one browser misses the first
 * proposal during a VPN/NAT reconnect.
 */
export const POKER_TURN_PROPOSAL_RETRY_INTERVAL_MS = 2_000;

export function shouldRetryPokerTurnProposal(input: {
	readonly transportConnected: boolean;
	readonly turnId: string | null | undefined;
	readonly notaryCommitted: boolean;
	readonly lastSentTurnId: string | null;
	readonly lastSentAtMs: number | null;
	readonly nowMs: number;
}): boolean {
	if (!input.transportConnected || !input.turnId || input.notaryCommitted) return false;
	if (input.lastSentTurnId !== input.turnId || input.lastSentAtMs === null) return true;
	return input.nowMs - input.lastSentAtMs >= POKER_TURN_PROPOSAL_RETRY_INTERVAL_MS;
}

/**
 * Transport loss invalidates the local announcement knowledge. On reconnect
 * the current turn must be announced again, even when its turnId did not
 * change while the peer was away.
 */
export function resolvePokerTurnAnnouncement(
	input: PokerTurnAnnouncementInput,
): PokerTurnAnnouncementDecision {
	if (!input.transportConnected) {
		return { shouldSend: false, nextAnnouncedTurnId: null };
	}
	if (!input.turnId || input.announcedTurnId === input.turnId) {
		return { shouldSend: false, nextAnnouncedTurnId: input.announcedTurnId };
	}
	return { shouldSend: true, nextAnnouncedTurnId: input.announcedTurnId };
}

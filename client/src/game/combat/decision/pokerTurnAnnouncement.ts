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

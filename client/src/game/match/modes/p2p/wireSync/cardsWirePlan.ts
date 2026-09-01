/**
 * Local cards action plan for the symmetric cards-apply contract.
 *
 * Both peers apply locally and send `game_command`. Forward `gameState` dumps
 * are off. Recovery uses signed command/transcript replay; no peer-authored
 * snapshot is accepted as gameplay authority.
 */
export type CardsLocalActionPlan = {
	readonly sendEnvelope: boolean;
	readonly applyLocal: boolean;
	readonly broadcastSnapshot: boolean;
};

export type CardsLocalApplyStatus = 'applied' | 'rejected' | 'ignored' | 'missing';

/**
 * A P2P envelope is canonical only when the local reducer committed the same
 * command. Local/single-player callers retain their historical callback
 * behavior, but a peer match must never append a transcript leaf for a
 * rejected or missing local apply.
 */
export function shouldCommitLocalCardsAction(input: {
	readonly isP2PMatch: boolean;
	readonly localApplyStatus: CardsLocalApplyStatus;
}): boolean {
	return !input.isP2PMatch || input.localApplyStatus === 'applied';
}

export function planCardsLocalAction(input: {
	readonly connected: boolean;
	readonly broadcastsCardsState: boolean;
	/** A disconnected P2P match must fail closed; local/single-player may still act. */
	readonly isP2PMatch?: boolean;
}): CardsLocalActionPlan {
	return {
		sendEnvelope: input.connected,
		applyLocal: input.connected || !input.isP2PMatch,
		broadcastSnapshot: input.connected && input.broadcastsCardsState,
	};
}

export function planCardsMismatchRecovery(input: {
	readonly sendsCardsRecoverySnapshot: boolean;
}): { readonly sendSnapshot: boolean } {
	return { sendSnapshot: input.sendsCardsRecoverySnapshot };
}

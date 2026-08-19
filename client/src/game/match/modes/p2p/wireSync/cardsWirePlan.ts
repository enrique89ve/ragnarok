/**
 * Local cards action plan for OPEN-8.
 *
 * Both peers apply locally and send `game_command`. Forward `gameState`
 * dumps are off; the transport host still sends a snapshot on
 * `hash_mismatch` recovery.
 */
export type CardsLocalActionPlan = {
	readonly sendEnvelope: boolean;
	readonly applyLocal: boolean;
	readonly broadcastSnapshot: boolean;
};

export function planCardsLocalAction(input: {
	readonly connected: boolean;
	readonly broadcastsCardsState: boolean;
}): CardsLocalActionPlan {
	return {
		sendEnvelope: input.connected,
		applyLocal: true,
		broadcastSnapshot: input.connected && input.broadcastsCardsState,
	};
}

export function planCardsMismatchRecovery(input: {
	readonly sendsCardsRecoverySnapshot: boolean;
}): { readonly sendSnapshot: boolean } {
	return { sendSnapshot: input.sendsCardsRecoverySnapshot };
}

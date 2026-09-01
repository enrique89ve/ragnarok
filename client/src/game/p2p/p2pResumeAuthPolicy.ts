/**
 * Decide whether a saved P2P match may re-enter the wire handshake.
 *
 * A full reload destroys the in-memory ephemeral session key. Rejoining the
 * relay without replacing that key would leave the UI connected but unable to
 * authorize a single gameplay envelope. Until the active runtime exposes the
 * approved renewal ceremony, this must be an explicit local blocker.
 */
export const P2P_RESUME_AUTH_BLOCKER =
	'Saved P2P match recovery is unavailable after a full reload in this testnet phase. Leave the match and start a new one.';

export type P2PResumeAuthPolicy =
	| { readonly kind: 'continue' }
	| { readonly kind: 'blocked'; readonly reason: typeof P2P_RESUME_AUTH_BLOCKER };

export function resolveP2PResumeAuthPolicy(input: {
	readonly hardReloadResume: boolean;
	readonly renewalAvailable: boolean;
}): P2PResumeAuthPolicy {
	if (!input.hardReloadResume || input.renewalAvailable) {
		return { kind: 'continue' };
	}
	return { kind: 'blocked', reason: P2P_RESUME_AUTH_BLOCKER };
}

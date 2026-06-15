import type { ServerSignedChallenge } from '@shared/p2pAvailability';
import type { SessionAuthorizeChallenge } from './messages';

export function stripRelayMatchTicketFromSessionChallenge(
	challenge: ServerSignedChallenge,
): SessionAuthorizeChallenge {
	return {
		from: challenge.from,
		to: challenge.to,
		peerId: challenge.peerId,
		timestamp: challenge.timestamp,
		expiresAt: challenge.expiresAt,
		nonce: challenge.nonce,
		sigAlg: challenge.sigAlg,
		serverSig: challenge.serverSig,
	};
}

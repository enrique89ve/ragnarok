/**
 * Resolves a P2P match — peer opponent, Match XP + ranked RUNE
 * (MATCH_ECONOMY.p2pRanked) plus ELO ranking. Unlike single/campaign, this resolver does NOT mint
 * identity: matchId and matchSeed come from the handshake (commit-reveal
 * output of two peers' salts; sorted-peer-ids derivation), so both peers
 * resolve to byte-identical MatchContext.matchId / matchSeed values
 * — which is required for symmetric replay.
 *
 * Wire-level validation lives upstream in shared/p2p-wire/. By the
 * time this resolver runs, every handshake field is guaranteed
 * well-formed; the resolver is a pure rearrangement, not a validator.
 */

import { MATCH_ECONOMY, modeEconomyToReward } from '../../economy';
import type { MatchContext } from '../../types';

export interface P2PHandshake {
	matchId: string;
	matchSeed: string;
	remotePeerId: string;
	myRole: 'first-mover' | 'second-mover';
	opponentUsername: string | null;
}

export function resolveP2P(handshake: P2PHandshake): MatchContext {
	return {
		matchId: handshake.matchId,
		matchSeed: handshake.matchSeed,
		opponent: {
			kind: 'peer',
			peerId: handshake.remotePeerId,
			myRole: handshake.myRole,
			opponentUsername: handshake.opponentUsername,
		},
		reward: modeEconomyToReward(MATCH_ECONOMY.p2pRanked),
	};
}

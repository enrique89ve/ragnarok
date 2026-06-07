/**
 * Resolves a Single match — AI opponent, practice rewards (no XP/runas,
 * no ranking). The local player picks difficulty + deck source before
 * this is called; the resolver itself is pure (input args → MatchContext).
 *
 * matchId / matchSeed: supplied by the route/setup boundary through
 * MatchIdentityFactory. Local play does not need cross-peer determinism,
 * but matchSeed is still useful for seeded chess piece IDs and deterministic
 * local replay debugging, so it is always present and non-empty.
 */

import type { Difficulty } from '../../../campaign/campaignTypes';
import { MATCH_ECONOMY, modeEconomyToReward } from '../../economy';
import type { AiStyle, MatchContext, MatchIdentity } from '../../types';

export interface SingleResolveArgs {
	identity: MatchIdentity;
	difficulty: Difficulty;
	style?: AiStyle;
	deckSource: 'warband' | 'default';
}

export function resolveSingle(args: SingleResolveArgs): MatchContext {
	return {
		...args.identity,
		opponent: {
			kind: 'ai',
			style: args.style,
			difficulty: args.difficulty,
			deckSource: args.deckSource,
		},
		reward: modeEconomyToReward(MATCH_ECONOMY.practice),
	};
}

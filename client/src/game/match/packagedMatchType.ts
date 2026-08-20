/**
 * Packaged matchType for the local result envelope.
 *
 * Ranking in MatchContext is a *projected* reward channel. Packaging as
 * `ranked` is only legal with dual-signed match_anchor evidence (ADR 0007).
 * Inferring ranked from a live WebSocket is the leak this module closes.
 */

import type { MatchContext } from './types';

export type PackagedMatchType = 'casual' | 'ranked' | 'tournament';

export function derivePackagedMatchType(input: {
	readonly ctx: MatchContext | null;
	readonly hasDualSignedAnchor: boolean;
}): PackagedMatchType {
	if (!input.ctx) return 'casual';
	if (input.ctx.reward.ranking.kind !== 'elo') return 'casual';
	if (!input.hasDualSignedAnchor) return 'casual';
	return 'ranked';
}

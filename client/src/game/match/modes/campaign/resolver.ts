/**
 * Resolves a Campaign match — scripted opponent (mission + boss rules
 * + scripted deck), first-clear RUNE from MATCH_ECONOMY.campaign,
 * no ranking.
 *
 * Returns a Result because the missionId may not exist in the registry
 * (`getMission` returns null for unknown ids). Callers — menu / mission
 * picker / deep-link handlers — MUST handle the failure case rather
 * than getting a thrown error during navigation.
 *
 * matchId / matchSeed are supplied by the setup boundary through
 * MatchIdentityFactory so this resolver remains input -> output.
 */

import { getMission } from '../../../campaign';
import type { Difficulty } from '../../../campaign/campaignTypes';
import { MATCH_ECONOMY, modeEconomyToReward } from '../../economy';
import type { MatchContext, MatchIdentity } from '../../types';

export interface CampaignResolveArgs {
	identity: MatchIdentity;
	missionId: string;
	difficulty: Difficulty;
	localRunId: string | null;
}

export type CampaignResolveResult =
	| { ok: true; ctx: MatchContext }
	| { ok: false; reason: 'mission_not_found' };

export function resolveCampaign(args: CampaignResolveArgs): CampaignResolveResult {
	const found = getMission(args.missionId);
	if (!found) return { ok: false, reason: 'mission_not_found' };

	return {
		ok: true,
		ctx: {
			...args.identity,
			opponent: {
				kind: 'scripted',
				script: {
					kind: 'campaign-mission',
					mission: found.mission,
					chapter: found.chapter,
					difficulty: args.difficulty,
					localRunId: args.localRunId,
				},
			},
			reward: modeEconomyToReward(MATCH_ECONOMY.campaign),
		},
	};
}

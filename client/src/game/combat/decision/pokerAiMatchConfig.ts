/**
 * Poker AI config from MatchContext.
 *
 * Single (practice / Quick Match) pays no economy and uses SmartAI's default
 * config. Campaign uses the mission's authored aiProfile plus difficulty.
 * P2P never runs local poker AI — this still returns undefined so a stray
 * call cannot pick up a leftover campaignStore mission.
 */

import type { SmartAIConfigShape } from '../../campaign/campaignTypes';
import { profileToSmartAIConfig } from '../../campaign/campaignTypes';
import { deriveCampaignMatch } from '../../match/derived';
import type { MatchContext } from '../../match/types';
import { CombatPhase } from '../../types/PokerCombatTypes';

export function derivePokerAiConfigFromMatch(
	ctx: MatchContext | null | undefined,
): SmartAIConfigShape | undefined {
	if (!ctx) return undefined;
	if (ctx.opponent.kind === 'ai' || ctx.opponent.kind === 'peer') return undefined;

	const campaign = deriveCampaignMatch(ctx);
	if (!campaign) return undefined;
	return profileToSmartAIConfig(campaign.mission.aiProfile, campaign.difficulty);
}

export function escalatePokerAiConfigForPhase(
	config: SmartAIConfigShape | undefined,
	phase: CombatPhase,
): SmartAIConfigShape | undefined {
	if (!config) return undefined;

	const phaseEsc =
		phase === CombatPhase.DESTINY ? 0.30 :
		phase === CombatPhase.FORESIGHT ? 0.15 :
		0;
	if (phaseEsc === 0) return config;

	return {
		aggressiveness: clamp01(config.aggressiveness + phaseEsc),
		bluffFrequency: clamp01(config.bluffFrequency + phaseEsc * 0.5),
		tightness: clamp01(config.tightness - phaseEsc * 0.4),
	};
}

function clamp01(n: number): number {
	return Math.max(0, Math.min(1, n));
}

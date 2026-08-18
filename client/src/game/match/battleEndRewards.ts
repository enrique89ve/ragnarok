/**
 * Battle-end connector: Match XP and RUNE fire together, from different tables.
 * Campaign and P2P call this once. Persist policy stays outside this module.
 */

import { calculateMatchXp } from '@shared/protocol-core/xpEconomy';
import {
	getCampaignFirstClearRuneReward,
	getRuneEconomy,
} from '@shared/protocol-core/runeEconomy';
import type { RewardChannel } from './types';

export type BattleEndResult = 'victory' | 'defeat' | 'draw';

export type BattleEndRewardProjection = {
	readonly matchXp: number;
	readonly rune: number;
	readonly runeSource: 'none' | 'p2p_ranked' | 'campaign_first_clear';
};

export function projectBattleEndRewards(input: {
	readonly reward: RewardChannel;
	readonly result: BattleEndResult;
	readonly runtimeStage?: string;
	readonly campaign?: {
		readonly missionId: string;
		readonly isFirstClear: boolean;
	};
}): BattleEndRewardProjection {
	return {
		matchXp: projectMatchXp(input.reward, input.result),
		rune: projectRune(input),
		runeSource: input.reward.rune.kind === 'projected' ? input.reward.rune.source : 'none',
	};
}

function projectMatchXp(reward: RewardChannel, result: BattleEndResult): number {
	if (reward.matchXp.kind === 'none') return 0;
	return calculateMatchXp({
		result,
		multiplier: reward.matchXp.multiplier,
	});
}

function projectRune(input: {
	readonly reward: RewardChannel;
	readonly result: BattleEndResult;
	readonly runtimeStage?: string;
	readonly campaign?: {
		readonly missionId: string;
		readonly isFirstClear: boolean;
	};
}): number {
	if (input.reward.rune.kind === 'none') return 0;

	if (input.reward.rune.source === 'p2p_ranked') {
		const economy = getRuneEconomy(input.runtimeStage ?? 'testnet');
		return input.result === 'victory' ? economy.p2pWinRune : economy.p2pLossRune;
	}

	if (input.result !== 'victory' || !input.campaign?.isFirstClear) return 0;
	return getCampaignFirstClearRuneReward(input.campaign.missionId);
}

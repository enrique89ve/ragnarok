/**
 * Per-mode reward configuration. Match XP share and RUNE source are
 * independent. `modeEconomyToReward` translates them into RewardChannel.
 */

import type { RewardChannel, RuneRewardSource } from './types';

export const POOL_REWARDS = 1.0;

const SINGLE_MATCH_XP_SHARE = 0;
const CAMPAIGN_MATCH_XP_SHARE = POOL_REWARDS * 0.10;
const P2P_MATCH_XP_SHARE = POOL_REWARDS * 1.00;

export interface ModeEconomy {
	matchXpShare: number;
	rune: 'none' | RuneRewardSource;
	ranking: 'none' | 'elo';
}

export const MATCH_ECONOMY = {
	single: {
		matchXpShare: SINGLE_MATCH_XP_SHARE,
		rune: 'none',
		ranking: 'none',
	},
	campaign: {
		matchXpShare: CAMPAIGN_MATCH_XP_SHARE,
		rune: 'campaign_first_clear',
		ranking: 'none',
	},
	p2pRanked: {
		matchXpShare: P2P_MATCH_XP_SHARE,
		rune: 'p2p_ranked',
		ranking: 'elo',
	},
} as const satisfies Record<string, ModeEconomy>;

export type ModeKey = keyof typeof MATCH_ECONOMY;

for (const [key, econ] of Object.entries(MATCH_ECONOMY)) {
	if (!Number.isFinite(econ.matchXpShare) || econ.matchXpShare < 0) {
		throw new Error(
			`[match/economy] MATCH_ECONOMY.${key}.matchXpShare must be ` +
			`a non-negative finite number, got ${econ.matchXpShare}.`,
		);
	}
}
if (!Number.isFinite(POOL_REWARDS) || POOL_REWARDS <= 0) {
	throw new Error(
		`[match/economy] POOL_REWARDS must be a positive finite number, ` +
		`got ${POOL_REWARDS}.`,
	);
}

export function modeEconomyToReward(econ: ModeEconomy): RewardChannel {
	return {
		matchXp:
			econ.matchXpShare > 0
				? { kind: 'percentage', multiplier: econ.matchXpShare }
				: { kind: 'none' },
		rune:
			econ.rune === 'none'
				? { kind: 'none' }
				: { kind: 'projected', source: econ.rune },
		ranking:
			econ.ranking === 'elo'
				? { kind: 'elo' }
				: { kind: 'none' },
	};
}

export function getEconomyFootprint(): number {
	return Object.values(MATCH_ECONOMY).reduce(
		(sum, mode) => sum + mode.matchXpShare,
		0,
	);
}

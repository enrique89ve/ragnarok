export type RuneEmissionCaps = {
	totalCap: number;
	p2pCap: number;
	campaignCap: number;
};

export type P2PMatchCapacity = {
	runePerMatch: number;
	maxMatchesAtCap: number;
	avgMatchesPerTargetAccount: number;
	avgParticipationsPerTargetAccount: number;
};

export const TESTNET_RUNE_ECONOMY = {
	phase: 'testnet',
	totalCap: 2_200_000,
	targetAccounts: 20_000,
	p2pCap: 2_000_000,
	campaignCap: 200_000,
	p2pWinRune: 2,
	p2pLossRune: 0,
	maxP2PRunePerAccount: 100,
	maxCampaignRunePerAccount: 10,
	campaignStageRuneRewards: [2, 2, 2, 2, 1, 1],
} as const;

export const RUNE_WIN_RANKED = TESTNET_RUNE_ECONOMY.p2pWinRune;
export const RUNE_LOSS_RANKED = TESTNET_RUNE_ECONOMY.p2pLossRune;

export function getRuneEmissionCaps(economy = TESTNET_RUNE_ECONOMY): RuneEmissionCaps {
	return {
		totalCap: economy.totalCap,
		p2pCap: economy.p2pCap,
		campaignCap: economy.campaignCap,
	};
}

export function getP2PMatchCapacity(economy = TESTNET_RUNE_ECONOMY): P2PMatchCapacity {
	const caps = getRuneEmissionCaps(economy);
	const runePerMatch = economy.p2pWinRune + economy.p2pLossRune;
	const maxMatchesAtCap = runePerMatch > 0 ? Math.floor(caps.p2pCap / runePerMatch) : 0;

	return {
		runePerMatch,
		maxMatchesAtCap,
		avgMatchesPerTargetAccount: Math.floor(maxMatchesAtCap / economy.targetAccounts),
		avgParticipationsPerTargetAccount: Math.floor((maxMatchesAtCap * 2) / economy.targetAccounts),
	};
}

export function getCampaignStageRuneTotal(economy = TESTNET_RUNE_ECONOMY): number {
	return economy.campaignStageRuneRewards.reduce((total, reward) => total + reward, 0);
}

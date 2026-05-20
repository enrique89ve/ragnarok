export type RuneEmissionCaps = {
	totalCap: number;
	p2pCap: number;
	campaignCap: number;
	dailyQuestCap: number;
};

export type RuneLedgerDirection = 'credit' | 'debit';

export type RuneSourceType =
	| 'p2p_ranked'
	| 'campaign_first_clear'
	| 'rune_exchange'
	| 'reward_claim'
	| 'daily_quest_claim';

export type P2PRankedRuneRole = 'winner' | 'loser';

export type RuneLedgerEntry = {
	entryId: string;
	seasonId: string;
	account: string;
	direction: RuneLedgerDirection;
	sourceType: RuneSourceType;
	sourceKey: string;
	amount: number;
	balanceBefore: number;
	balanceAfter: number;
	trxId: string;
	blockNum: number;
	timestamp: number;
};

export type RuneLedgerEntryQuery = {
	seasonId: string;
	direction?: RuneLedgerDirection;
	sourceType?: RuneSourceType;
	account?: string;
	sourceKeyPrefix?: string;
};

export type RuneLedgerTotalQuery = RuneLedgerEntryQuery;

export type P2PMatchCapacity = {
	runePerMatch: number;
	maxMatchesAtCap: number;
	avgMatchesPerTargetAccount: number;
	avgParticipationsPerTargetAccount: number;
};

export type RuneCreditCapInput = {
	requestedAmount: number;
	accountEarned: number;
	globalEarned: number;
	accountCap: number;
	globalCap: number;
};

export type RuneBalanceTraceInput = {
	balanceBefore: number;
	direction: RuneLedgerDirection;
	amount: number;
};

export type RuneBalanceTrace = {
	balanceBefore: number;
	balanceAfter: number;
};

export type SeasonScoreInput = {
	finalElo: number;
	campaignRuneEarned: number;
	p2pRuneEarned: number;
	dailyQuestRuneEarned: number;
};

export type RuneExchangeQuoteInput = {
	packType: string;
	quantity: number;
};

export type RuneExchangeQuote = {
	packType: string;
	quantity: number;
	runeCost: number;
	totalCost: number;
	accountLimit: number;
	globalPackCap: number;
};

export type RuneExchangeFulfillment = {
	seasonId: string;
	account: string;
	sourceKey: string;
	packType: string;
	quantity: number;
	totalCost: number;
	trxId: string;
	blockNum: number;
	timestamp: number;
};

export interface RuneExchangeAdapter {
	getQuote(input: RuneExchangeQuoteInput): RuneExchangeQuote | null;
	getGlobalMinted(input: { packType: string }): Promise<number>;
	fulfill(input: RuneExchangeFulfillment): Promise<void>;
}

export const TESTNET_RUNE_ECONOMY = {
	phase: 'testnet',
	seasonId: 'S01',
	totalCap: 2_600_000,
	targetAccounts: 20_000,
	p2pCap: 2_000_000,
	campaignCap: 200_000,
	dailyQuestCap: 400_000,
	p2pWinRune: 2,
	p2pLossRune: 0,
	maxP2PRunePerAccount: 100,
	maxCampaignRunePerAccount: 10,
	maxDailyQuestRunePerAccount: 20,
	dailyQuestRunePerSlot: 2,
	dailyQuestSlotsPerDay: 3,
	maxRuneScoreBonusInput: 130,
	runeScoreBonusMultiplier: 0.5,
	maxRuneExchangeSpendPerOp: 50,
	campaignStageRuneRewards: [2, 2, 2, 2, 1, 1],
} as const;

export const MAINNET_RUNE_ECONOMY = {
	phase: 'mainnet',
	seasonId: 'M01',
	totalCap: 1_000_000,
	targetAccounts: 50_000,
	p2pCap: 600_000,
	campaignCap: 100_000,
	dailyQuestCap: 300_000,
	p2pWinRune: 1,
	p2pLossRune: 0,
	maxP2PRunePerAccount: 500,
	maxCampaignRunePerAccount: 50,
	maxDailyQuestRunePerAccount: 100,
	dailyQuestRunePerSlot: 1,
	dailyQuestSlotsPerDay: 3,
	maxRuneScoreBonusInput: 1000,
	runeScoreBonusMultiplier: 0.1,
	maxRuneExchangeSpendPerOp: 100,
	campaignStageRuneRewards: [1, 1, 1, 1, 1, 1],
} as const;

export const RUNE_WIN_RANKED = TESTNET_RUNE_ECONOMY.p2pWinRune;
export const RUNE_LOSS_RANKED = TESTNET_RUNE_ECONOMY.p2pLossRune;
export const TESTNET_RUNE_SEASON_ID = TESTNET_RUNE_ECONOMY.seasonId;

export function getRuneEconomy(phase: 'testnet' | 'mainnet' | string = 'testnet') {
	return phase === 'mainnet' ? MAINNET_RUNE_ECONOMY : TESTNET_RUNE_ECONOMY;
}

export function getRuneEmissionCaps(economy = TESTNET_RUNE_ECONOMY): RuneEmissionCaps {
	return {
		totalCap: economy.totalCap,
		p2pCap: economy.p2pCap,
		campaignCap: economy.campaignCap,
		dailyQuestCap: economy.dailyQuestCap,
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

export function calculateSeasonRuneEarned(
	input: Pick<SeasonScoreInput, 'campaignRuneEarned' | 'p2pRuneEarned' | 'dailyQuestRuneEarned'>,
	economy = TESTNET_RUNE_ECONOMY,
): number {
	return Math.min(input.campaignRuneEarned, economy.maxCampaignRunePerAccount)
		+ Math.min(input.p2pRuneEarned, economy.maxP2PRunePerAccount)
		+ Math.min(input.dailyQuestRuneEarned, economy.maxDailyQuestRunePerAccount);
}

export function calculateRuneScoreBonus(
	seasonRuneEarned: number,
	economy = TESTNET_RUNE_ECONOMY,
): number {
	return Math.floor(
		Math.min(seasonRuneEarned, economy.maxRuneScoreBonusInput)
			* economy.runeScoreBonusMultiplier,
	);
}

export function calculateSeasonScore(
	input: SeasonScoreInput,
	economy = TESTNET_RUNE_ECONOMY,
): number {
	const seasonRuneEarned = calculateSeasonRuneEarned(input, economy);
	return input.finalElo + calculateRuneScoreBonus(seasonRuneEarned, economy);
}

export function createRuneLedgerEntryId(input: {
	seasonId: string;
	direction: RuneLedgerDirection;
	sourceType: RuneSourceType;
	sourceKey: string;
}): string {
	return `${input.seasonId}:${input.direction}:${input.sourceType}:${input.sourceKey}`;
}

export function calculateRuneBalanceTrace(input: RuneBalanceTraceInput): RuneBalanceTrace {
	const delta = input.direction === 'credit' ? input.amount : -input.amount;
	return {
		balanceBefore: input.balanceBefore,
		balanceAfter: input.balanceBefore + delta,
	};
}

export function createP2PRankedMatchSourceKey(
	matchId: string,
	seasonId = TESTNET_RUNE_SEASON_ID,
): string {
	return `p2p:${seasonId}:${matchId}`;
}

export function createP2PRankedMatchSourceKeyPrefix(
	matchId: string,
	seasonId = TESTNET_RUNE_SEASON_ID,
): string {
	return `${createP2PRankedMatchSourceKey(matchId, seasonId)}:`;
}

export function createP2PRankedRuneSourceKey(
	matchId: string,
	role: P2PRankedRuneRole,
	account: string,
	seasonId = TESTNET_RUNE_SEASON_ID,
): string {
	return `${createP2PRankedMatchSourceKey(matchId, seasonId)}:${role}:${account}`;
}

export function createCampaignFirstClearRuneSourceKey(
	account: string,
	campaignId: string,
	missionId: string,
	seasonId = TESTNET_RUNE_SEASON_ID,
): string {
	return `campaign:${seasonId}:${account}:${campaignId}:${missionId}`;
}

export function createRewardClaimRuneSourceKey(
	account: string,
	rewardId: string,
	seasonId = TESTNET_RUNE_SEASON_ID,
): string {
	return `reward:${seasonId}:${account}:${rewardId}`;
}

export function createRuneExchangeSourceKey(
	account: string,
	trxId: string,
	packType: string,
	quantity: number,
	seasonId = TESTNET_RUNE_SEASON_ID,
): string {
	return `pack:${seasonId}:${account}:${trxId}:${packType}:${quantity}`;
}

export function createDailyQuestRuneSourceKey(
	account: string,
	ymdUtc: string,
	slot: number,
	seasonId = TESTNET_RUNE_SEASON_ID,
): string {
	return `daily_quest:${seasonId}:${account}:${ymdUtc}:${slot}`;
}

export function getCampaignFirstClearRuneReward(
	missionId: string,
	economy = TESTNET_RUNE_ECONOMY,
): number {
	const missionOrdinal = getMissionOrdinal(missionId);
	if (missionOrdinal === null) return 0;
	return economy.campaignStageRuneRewards[missionOrdinal - 1] ?? 0;
}

export function calculateCappedRuneCredit(input: RuneCreditCapInput): number {
	const requested = Math.max(0, input.requestedAmount);
	const accountRemaining = Math.max(0, input.accountCap - input.accountEarned);
	const globalRemaining = Math.max(0, input.globalCap - input.globalEarned);
	return Math.min(requested, accountRemaining, globalRemaining);
}

function getMissionOrdinal(missionId: string): number | null {
	const match = /-(\d+)$/.exec(missionId);
	if (!match) return null;
	const ordinal = Number(match[1]);
	return Number.isInteger(ordinal) && ordinal > 0 ? ordinal : null;
}

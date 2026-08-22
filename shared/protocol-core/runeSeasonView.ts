import {
	getRuneEconomy,
	type RuneLedgerEntry,
	type RuneSourceType,
} from './runeEconomy';

export type RuneSeasonCreditSource =
	| 'p2p_ranked'
	| 'campaign_first_clear'
	| 'daily_quest_claim'
	| 'reward_claim';

export type RuneSeasonEarnedBySource = {
	readonly p2p_ranked: number;
	readonly campaign_first_clear: number;
	readonly daily_quest_claim: number;
	readonly reward_claim: number;
};

export type RuneSeasonProjection = {
	readonly seasonId: string;
	readonly balance: number;
	readonly credits: number;
	readonly debits: number;
	readonly lastBlock: number;
	readonly earnedBySource: RuneSeasonEarnedBySource;
	readonly spentOnExchange: number;
};

type MutableEarnedBySource = {
	p2p_ranked: number;
	campaign_first_clear: number;
	daily_quest_claim: number;
	reward_claim: number;
};

export type RuneSeasonAccountView = RuneSeasonProjection & {
	readonly account: string;
};

export type RuneSeasonAccountQuery = {
	readonly account: string;
	readonly seasonId: string;
};

export type RuneSeasonLedgerReader = {
	readonly getRuneLedgerEntries: (
		query: Pick<RuneSeasonAccountQuery, 'account' | 'seasonId'>,
	) => Promise<readonly RuneLedgerEntry[]>;
};

const EMPTY_EARNED: RuneSeasonEarnedBySource = {
	p2p_ranked: 0,
	campaign_first_clear: 0,
	daily_quest_claim: 0,
	reward_claim: 0,
};

export function getActiveRuneSeasonId(stage: string = 'testnet'): string {
	return getRuneEconomy(stage).seasonId;
}

export function projectRuneSeasonAccount(
	entries: readonly RuneLedgerEntry[],
	query: RuneSeasonAccountQuery,
): RuneSeasonAccountView {
	return {
		account: query.account,
		...projectRuneSeason(entriesForSeasonAccount(entries, query), query.seasonId),
	};
}

export async function readRuneSeasonAccount(
	reader: RuneSeasonLedgerReader,
	query: RuneSeasonAccountQuery,
): Promise<RuneSeasonAccountView> {
	const entries = await reader.getRuneLedgerEntries(query);
	return projectRuneSeasonAccount(entries, query);
}

export function projectRuneSeason(
	entries: readonly RuneLedgerEntry[],
	seasonId: string,
): RuneSeasonProjection {
	return {
		seasonId,
		...tallyRuneLedgerEntries(entriesForSeason(entries, seasonId)),
	};
}

export function tallyRuneLedgerEntries(entries: readonly RuneLedgerEntry[]): {
	credits: number;
	debits: number;
	balance: number;
	lastBlock: number;
	earnedBySource: RuneSeasonEarnedBySource;
	spentOnExchange: number;
} {
	let credits = 0;
	let debits = 0;
	let lastBlock = 0;
	let spentOnExchange = 0;
	let earnedBySource: MutableEarnedBySource = { ...EMPTY_EARNED };

	for (const entry of entries) {
		lastBlock = Math.max(lastBlock, entry.blockNum);
		if (entry.direction === 'credit') {
			credits += entry.amount;
			earnedBySource = addCredit(earnedBySource, entry.sourceType, entry.amount);
			continue;
		}
		debits += entry.amount;
		if (entry.sourceType === 'rune_exchange') {
			spentOnExchange += entry.amount;
		}
	}

	return {
		credits,
		debits,
		balance: credits - debits,
		lastBlock,
		earnedBySource,
		spentOnExchange,
	};
}

function entriesForSeason(
	entries: readonly RuneLedgerEntry[],
	seasonId: string,
): RuneLedgerEntry[] {
	return entries.filter(entry => entry.seasonId === seasonId);
}

function entriesForSeasonAccount(
	entries: readonly RuneLedgerEntry[],
	query: RuneSeasonAccountQuery,
): RuneLedgerEntry[] {
	return entries.filter(
		entry => entry.account === query.account && entry.seasonId === query.seasonId,
	);
}

const CREDIT_SOURCE_KEYS: Readonly<Partial<Record<RuneSourceType, keyof MutableEarnedBySource>>> = {
	p2p_ranked: 'p2p_ranked',
	campaign_first_clear: 'campaign_first_clear',
	daily_quest_claim: 'daily_quest_claim',
	reward_claim: 'reward_claim',
};

function addCredit(
	earned: MutableEarnedBySource,
	sourceType: RuneSourceType,
	amount: number,
): MutableEarnedBySource {
	const key = CREDIT_SOURCE_KEYS[sourceType];
	if (key === undefined) return earned;
	return { ...earned, [key]: earned[key] + amount };
}

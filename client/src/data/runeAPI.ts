const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;

export type RuneDirection = 'credit' | 'debit';
export type RuneSourceType =
	| 'p2p_ranked'
	| 'campaign_first_clear'
	| 'reward_claim'
	| 'daily_quest_claim'
	| 'rune_exchange';

export type RuneStateSnapshot = {
	seasonId: string;
	totalCap: number;
	p2pCap: number;
	campaignCap: number;
	dailyQuestCap: number;
	activeBalanceTotal: number;
	ledgerCreditTotal: number;
	ledgerDebitTotal: number;
	ledgerActiveTotal: number;
	balanceDrift: number;
	p2pCreditTotal: number;
	campaignCreditTotal: number;
	rewardClaimCreditTotal: number;
	dailyQuestCreditTotal: number;
	runeExchangeDebitTotal: number;
	lastBlock: number;
	generatedAt: string;
};

export type RuneLedgerEntryView = {
	entryId: string;
	seasonId: string;
	account: string;
	direction: RuneDirection;
	sourceType: RuneSourceType;
	sourceKey: string;
	amount: number;
	balanceBefore: number;
	balanceAfter: number;
	trxId: string;
	blockNum: number;
	timestamp: number;
};

export type AccountRuneSummary = {
	account: string;
	runeBalance: number;
	credits: number;
	debits: number;
	drift: number;
	lastBlock: number;
	indexed: boolean;
};

export type RuneLedgerQuery = {
	seasonId?: string;
	account?: string;
	direction?: RuneDirection;
	sourceType?: RuneSourceType;
	limit?: number;
	offset?: number;
};

export type RuneBalancesQuery = {
	seasonId?: string;
	limit?: number;
	offset?: number;
};

const RUNE_DIRECTIONS: readonly RuneDirection[] = ['credit', 'debit'];
const RUNE_SOURCE_TYPES: readonly RuneSourceType[] = [
	'p2p_ranked',
	'campaign_first_clear',
	'reward_claim',
	'daily_quest_claim',
	'rune_exchange',
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string {
	const value = record[key];
	if (typeof value !== 'string') throw new Error(`RUNE API: ${key} must be a string`);
	return value;
}

function readNumber(record: Record<string, unknown>, key: string): number {
	const value = record[key];
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`RUNE API: ${key} must be a finite number`);
	}
	return value;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
	const value = record[key];
	if (typeof value !== 'boolean') throw new Error(`RUNE API: ${key} must be a boolean`);
	return value;
}

function readSuccess(record: Record<string, unknown>): void {
	if (record.success !== true) throw new Error('RUNE API: response was not successful');
}

function parseRuneDirection(value: unknown): RuneDirection {
	if (RUNE_DIRECTIONS.includes(value as RuneDirection)) return value as RuneDirection;
	throw new Error('RUNE API: invalid ledger direction');
}

function parseRuneSourceType(value: unknown): RuneSourceType {
	if (RUNE_SOURCE_TYPES.includes(value as RuneSourceType)) return value as RuneSourceType;
	throw new Error('RUNE API: invalid ledger source type');
}

function parseRuneState(value: unknown): RuneStateSnapshot {
	if (!isRecord(value)) throw new Error('RUNE API: state response must be an object');
	readSuccess(value);

	return {
		seasonId: readString(value, 'seasonId'),
		totalCap: readNumber(value, 'totalCap'),
		p2pCap: readNumber(value, 'p2pCap'),
		campaignCap: readNumber(value, 'campaignCap'),
		dailyQuestCap: readNumber(value, 'dailyQuestCap'),
		activeBalanceTotal: readNumber(value, 'activeBalanceTotal'),
		ledgerCreditTotal: readNumber(value, 'ledgerCreditTotal'),
		ledgerDebitTotal: readNumber(value, 'ledgerDebitTotal'),
		ledgerActiveTotal: readNumber(value, 'ledgerActiveTotal'),
		balanceDrift: readNumber(value, 'balanceDrift'),
		p2pCreditTotal: readNumber(value, 'p2pCreditTotal'),
		campaignCreditTotal: readNumber(value, 'campaignCreditTotal'),
		rewardClaimCreditTotal: readNumber(value, 'rewardClaimCreditTotal'),
		dailyQuestCreditTotal: readNumber(value, 'dailyQuestCreditTotal'),
		runeExchangeDebitTotal: readNumber(value, 'runeExchangeDebitTotal'),
		lastBlock: readNumber(value, 'lastBlock'),
		generatedAt: readString(value, 'generatedAt'),
	};
}

function parseRuneLedgerEntry(value: unknown): RuneLedgerEntryView {
	if (!isRecord(value)) throw new Error('RUNE API: ledger entry must be an object');

	return {
		entryId: readString(value, 'entryId'),
		seasonId: readString(value, 'seasonId'),
		account: readString(value, 'account'),
		direction: parseRuneDirection(value.direction),
		sourceType: parseRuneSourceType(value.sourceType),
		sourceKey: readString(value, 'sourceKey'),
		amount: readNumber(value, 'amount'),
		balanceBefore: readNumber(value, 'balanceBefore'),
		balanceAfter: readNumber(value, 'balanceAfter'),
		trxId: readString(value, 'trxId'),
		blockNum: readNumber(value, 'blockNum'),
		timestamp: readNumber(value, 'timestamp'),
	};
}

function parseAccountSummary(value: unknown): AccountRuneSummary {
	if (!isRecord(value)) throw new Error('RUNE API: account summary must be an object');

	return {
		account: readString(value, 'account'),
		runeBalance: readNumber(value, 'runeBalance'),
		credits: readNumber(value, 'credits'),
		debits: readNumber(value, 'debits'),
		drift: readNumber(value, 'drift'),
		lastBlock: readNumber(value, 'lastBlock'),
		indexed: readBoolean(value, 'indexed'),
	};
}

function parseRuneLedgerResponse(value: unknown): { entries: RuneLedgerEntryView[]; total: number; limit: number; offset: number } {
	if (!isRecord(value)) throw new Error('RUNE API: ledger response must be an object');
	readSuccess(value);
	if (!Array.isArray(value.entries)) throw new Error('RUNE API: entries must be an array');

	return {
		entries: value.entries.map(parseRuneLedgerEntry),
		total: readNumber(value, 'total'),
		limit: readNumber(value, 'limit'),
		offset: readNumber(value, 'offset'),
	};
}

function parseRuneBalancesResponse(value: unknown): { accounts: AccountRuneSummary[]; total: number; limit: number; offset: number } {
	if (!isRecord(value)) throw new Error('RUNE API: balances response must be an object');
	readSuccess(value);
	if (!Array.isArray(value.accounts)) throw new Error('RUNE API: accounts must be an array');

	return {
		accounts: value.accounts.map(parseAccountSummary),
		total: readNumber(value, 'total'),
		limit: readNumber(value, 'limit'),
		offset: readNumber(value, 'offset'),
	};
}

function parseRuneAccountResponse(value: unknown): AccountRuneSummary {
	if (!isRecord(value)) throw new Error('RUNE API: account response must be an object');
	readSuccess(value);
	if (isRecord(value.account)) return parseAccountSummary(value.account);

	const account = typeof value.account === 'string'
		? value.account
		: readString(value, 'username');

	return {
		account,
		runeBalance: readNumber(value, 'runeBalance'),
		credits: readNumber(value, 'credits'),
		debits: readNumber(value, 'debits'),
		drift: readNumber(value, 'drift'),
		lastBlock: readNumber(value, 'lastBlock'),
		indexed: readBoolean(value, 'indexed'),
	};
}

function appendQuery(path: string, query: Record<string, string | number | undefined>): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined) continue;
		params.set(key, String(value));
	}

	const queryString = params.toString();
	return queryString ? `${path}?${queryString}` : path;
}

async function fetchRuneJSON(path: string, signal?: AbortSignal): Promise<unknown> {
	const response = await fetch(`${API_BASE}${path}`, { signal });
	const payload = await response.json() as unknown;
	if (!response.ok) {
		const error = isRecord(payload) && typeof payload.error === 'string'
			? payload.error
			: `RUNE API ${path}: ${response.status}`;
		throw new Error(error);
	}
	return payload;
}

export async function fetchRuneState(seasonId = 'S01', signal?: AbortSignal): Promise<RuneStateSnapshot> {
	const payload = await fetchRuneJSON(appendQuery('/api/chain/rune/state', { seasonId }), signal);
	return parseRuneState(payload);
}

export async function fetchRuneLedger(query: RuneLedgerQuery = {}, signal?: AbortSignal) {
	const payload = await fetchRuneJSON(appendQuery('/api/chain/rune/ledger', query), signal);
	return parseRuneLedgerResponse(payload);
}

export async function fetchRuneBalances(query: RuneBalancesQuery = {}, signal?: AbortSignal) {
	const payload = await fetchRuneJSON(appendQuery('/api/chain/rune/balances', query), signal);
	return parseRuneBalancesResponse(payload);
}

export async function fetchRuneAccount(username: string, seasonId = 'S01', signal?: AbortSignal): Promise<AccountRuneSummary> {
	const payload = await fetchRuneJSON(
		appendQuery(`/api/chain/player/${encodeURIComponent(username)}/rune`, { seasonId }),
		signal,
	);
	return parseRuneAccountResponse(payload);
}

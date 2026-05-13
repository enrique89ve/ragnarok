// Eitr API client (mirror of runeAPI.ts per ADR 0001).
// Eitr is non-transferable, season-scoped, replay-derived.
// No TokenBalance scalar — balance derived from ledger queries server-side.

const API_BASE = import.meta.env.VITE_API_URL
	|| (typeof window !== 'undefined' ? window.location.origin : '');

export type EitrDirection = 'credit' | 'debit';
export type EitrSourceType = 'burn' | 'forge_commit' | 'forge_refund';

export type EitrStateSnapshot = {
	seasonId: string;
	ledgerCreditTotal: number;
	ledgerDebitTotal: number;
	ledgerActiveTotal: number;
	burnCreditTotal: number;
	forgeCommitDebitTotal: number;
	forgeRefundCreditTotal: number;
	lastBlock: number;
	generatedAt: string;
};

export type EitrLedgerEntryView = {
	entryId: string;
	seasonId: string;
	account: string;
	direction: EitrDirection;
	sourceType: EitrSourceType;
	sourceKey: string;
	amount: number;
	balanceBefore: number;
	balanceAfter: number;
	trxId: string;
	blockNum: number;
	timestamp: number;
};

export type AccountEitrSummary = {
	account: string;
	eitrBalance: number;
	credits: number;
	debits: number;
	lastBlock: number;
	indexed: boolean;
};

export type EitrLedgerQuery = {
	seasonId?: string;
	account?: string;
	direction?: EitrDirection;
	sourceType?: EitrSourceType;
	limit?: number;
	offset?: number;
};

export type EitrBalancesQuery = {
	seasonId?: string;
	limit?: number;
	offset?: number;
};

const EITR_DIRECTIONS: readonly EitrDirection[] = ['credit', 'debit'];
const EITR_SOURCE_TYPES: readonly EitrSourceType[] = ['burn', 'forge_commit', 'forge_refund'];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string {
	const value = record[key];
	if (typeof value !== 'string') throw new Error(`Eitr API: ${key} must be a string`);
	return value;
}

function readNumber(record: Record<string, unknown>, key: string): number {
	const value = record[key];
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`Eitr API: ${key} must be a finite number`);
	}
	return value;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
	const value = record[key];
	if (typeof value !== 'boolean') throw new Error(`Eitr API: ${key} must be a boolean`);
	return value;
}

function readSuccess(record: Record<string, unknown>): void {
	if (record.success !== true) throw new Error('Eitr API: response was not successful');
}

function parseEitrDirection(value: unknown): EitrDirection {
	if (EITR_DIRECTIONS.includes(value as EitrDirection)) return value as EitrDirection;
	throw new Error('Eitr API: invalid ledger direction');
}

function parseEitrSourceType(value: unknown): EitrSourceType {
	if (EITR_SOURCE_TYPES.includes(value as EitrSourceType)) return value as EitrSourceType;
	throw new Error('Eitr API: invalid ledger sourceType');
}

function parseEitrState(value: unknown): EitrStateSnapshot {
	if (!isRecord(value)) throw new Error('Eitr API: state response must be an object');
	readSuccess(value);

	return {
		seasonId: readString(value, 'seasonId'),
		ledgerCreditTotal: readNumber(value, 'ledgerCreditTotal'),
		ledgerDebitTotal: readNumber(value, 'ledgerDebitTotal'),
		ledgerActiveTotal: readNumber(value, 'ledgerActiveTotal'),
		burnCreditTotal: readNumber(value, 'burnCreditTotal'),
		forgeCommitDebitTotal: readNumber(value, 'forgeCommitDebitTotal'),
		forgeRefundCreditTotal: readNumber(value, 'forgeRefundCreditTotal'),
		lastBlock: readNumber(value, 'lastBlock'),
		generatedAt: readString(value, 'generatedAt'),
	};
}

function parseEitrLedgerEntry(value: unknown): EitrLedgerEntryView {
	if (!isRecord(value)) throw new Error('Eitr API: ledger entry must be an object');

	return {
		entryId: readString(value, 'entryId'),
		seasonId: readString(value, 'seasonId'),
		account: readString(value, 'account'),
		direction: parseEitrDirection(value.direction),
		sourceType: parseEitrSourceType(value.sourceType),
		sourceKey: readString(value, 'sourceKey'),
		amount: readNumber(value, 'amount'),
		balanceBefore: readNumber(value, 'balanceBefore'),
		balanceAfter: readNumber(value, 'balanceAfter'),
		trxId: readString(value, 'trxId'),
		blockNum: readNumber(value, 'blockNum'),
		timestamp: readNumber(value, 'timestamp'),
	};
}

function parseAccountSummary(value: unknown): AccountEitrSummary {
	if (!isRecord(value)) throw new Error('Eitr API: account summary must be an object');

	return {
		account: readString(value, 'account'),
		eitrBalance: readNumber(value, 'eitrBalance'),
		credits: readNumber(value, 'credits'),
		debits: readNumber(value, 'debits'),
		lastBlock: readNumber(value, 'lastBlock'),
		indexed: readBoolean(value, 'indexed'),
	};
}

function parseEitrLedgerResponse(value: unknown): { entries: EitrLedgerEntryView[]; total: number; limit: number; offset: number } {
	if (!isRecord(value)) throw new Error('Eitr API: ledger response must be an object');
	readSuccess(value);
	if (!Array.isArray(value.entries)) throw new Error('Eitr API: entries must be an array');

	return {
		entries: value.entries.map(parseEitrLedgerEntry),
		total: readNumber(value, 'total'),
		limit: readNumber(value, 'limit'),
		offset: readNumber(value, 'offset'),
	};
}

function parseEitrBalancesResponse(value: unknown): { accounts: AccountEitrSummary[]; total: number; limit: number; offset: number } {
	if (!isRecord(value)) throw new Error('Eitr API: balances response must be an object');
	readSuccess(value);
	if (!Array.isArray(value.accounts)) throw new Error('Eitr API: accounts must be an array');

	return {
		accounts: value.accounts.map(parseAccountSummary),
		total: readNumber(value, 'total'),
		limit: readNumber(value, 'limit'),
		offset: readNumber(value, 'offset'),
	};
}

// /api/chain/player/:u/eitr returns the summary fields at the top level
// (not under a nested `account` field) — match runeAPI behavior.
function parseEitrAccountResponse(value: unknown): AccountEitrSummary {
	if (!isRecord(value)) throw new Error('Eitr API: account response must be an object');
	readSuccess(value);

	const account = typeof value.account === 'string'
		? value.account
		: readString(value, 'username');

	return {
		account,
		eitrBalance: readNumber(value, 'eitrBalance'),
		credits: readNumber(value, 'credits'),
		debits: readNumber(value, 'debits'),
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

async function fetchEitrJSON(path: string, signal?: AbortSignal): Promise<unknown> {
	const response = await fetch(`${API_BASE}${path}`, { signal });
	const payload = await response.json() as unknown;
	if (!response.ok) {
		const error = isRecord(payload) && typeof payload.error === 'string'
			? payload.error
			: `Eitr API ${path}: ${response.status}`;
		throw new Error(error);
	}
	return payload;
}

export async function fetchEitrState(seasonId = 'S01', signal?: AbortSignal): Promise<EitrStateSnapshot> {
	const payload = await fetchEitrJSON(appendQuery('/api/chain/eitr/state', { seasonId }), signal);
	return parseEitrState(payload);
}

export async function fetchEitrLedger(query: EitrLedgerQuery = {}, signal?: AbortSignal) {
	const payload = await fetchEitrJSON(appendQuery('/api/chain/eitr/ledger', query), signal);
	return parseEitrLedgerResponse(payload);
}

export async function fetchEitrBalances(query: EitrBalancesQuery = {}, signal?: AbortSignal) {
	const payload = await fetchEitrJSON(appendQuery('/api/chain/eitr/balances', query), signal);
	return parseEitrBalancesResponse(payload);
}

export async function fetchEitrAccount(username: string, seasonId = 'S01', signal?: AbortSignal): Promise<AccountEitrSummary> {
	const payload = await fetchEitrJSON(
		appendQuery(`/api/chain/player/${encodeURIComponent(username)}/eitr`, { seasonId }),
		signal,
	);
	return parseEitrAccountResponse(payload);
}

// Test-only exports — re-exported with explicit names so tests can hit pure
// parsers without going through fetch. Production code MUST NOT import these.
export const parseEitrStateForTest = parseEitrState;
export const parseEitrLedgerEntryForTest = parseEitrLedgerEntry;
export const parseAccountSummaryForTest = parseAccountSummary;

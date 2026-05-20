import type { RagnarokRuntimeConfig } from '../runtimeConfig';
import type {
	RuneLedgerDirection,
	RuneLedgerEntry,
	RuneSourceType,
} from './runeEconomy';

export type RuneSeason0SmokeAction =
	| 'daily_quest_claim'
	| 'campaign_result'
	| 'rune_exchange'
	| 'pack_burn'
	| 'match_result';

export type RuneSeason0SmokeStatus = 'applied' | 'ignored' | 'rejected';

export type RuneSeason0SmokeOperation = {
	readonly action: RuneSeason0SmokeAction;
	readonly customJsonId: string;
	readonly status: RuneSeason0SmokeStatus;
	readonly trxId: string;
	readonly sourceKeys?: readonly string[];
	readonly reason?: string;
};

export type RuneSeason0SmokeAccountSummary = {
	readonly account: string;
	readonly runeBalance: number;
	readonly credits: number;
	readonly debits: number;
	readonly drift: number;
	readonly lastBlock: number;
	readonly indexed: boolean;
};

export type RuneSeason0SmokeRuntime = Pick<
	RagnarokRuntimeConfig,
	'stage' | 'protocolId' | 'collectionId' | 'resetEpoch' | 'resettable'
>;

export type RuneSeason0SmokeInput = {
	readonly account: string;
	readonly runtime: RuneSeason0SmokeRuntime;
	readonly apiSummary: RuneSeason0SmokeAccountSummary;
	readonly ledgerEntries: readonly RuneLedgerEntry[];
	readonly operations: readonly RuneSeason0SmokeOperation[];
	readonly openedPackUids: readonly string[];
	readonly revealedCardUids: readonly string[];
};

export type RuneSeason0SmokeCheckKey =
	| 'daily_quest_credit'
	| 'campaign_first_clear_credit'
	| 'rune_exchange_debit'
	| 'pack_opening_result'
	| 'insufficient_balance_rejection'
	| 'api_balance_parity'
	| 'p2p_result_only_no_credit';

export type RuneSeason0SmokeCheck = {
	readonly key: RuneSeason0SmokeCheckKey;
	readonly passed: boolean;
	readonly detail: string;
};

export type RuneSeason0SmokeEvidence = {
	readonly version: 1;
	readonly account: string;
	readonly runtime: RuneSeason0SmokeRuntime;
	readonly customJsonIds: readonly string[];
	readonly sourceKeys: readonly string[];
	readonly apiSummary: RuneSeason0SmokeAccountSummary;
	readonly ledgerEntries: readonly RuneLedgerEntry[];
	readonly operations: readonly RuneSeason0SmokeOperation[];
	readonly openedPackUids: readonly string[];
	readonly revealedCardUids: readonly string[];
	readonly checks: readonly RuneSeason0SmokeCheck[];
};

type LedgerTotals = {
	readonly credits: number;
	readonly debits: number;
	readonly balance: number;
};

export function buildRuneSeason0SmokeEvidence(input: RuneSeason0SmokeInput): RuneSeason0SmokeEvidence {
	const ledgerEntries = input.ledgerEntries.filter(entry => entry.account === input.account);
	const checks = buildChecks({ ...input, ledgerEntries });

	return {
		version: 1,
		account: input.account,
		runtime: input.runtime,
		customJsonIds: unique(input.operations.map(operation => operation.customJsonId)),
		sourceKeys: unique([
			...ledgerEntries.map(entry => entry.sourceKey),
			...input.operations.flatMap(operation => [...(operation.sourceKeys ?? [])]),
		]),
		apiSummary: input.apiSummary,
		ledgerEntries,
		operations: [...input.operations],
		openedPackUids: [...input.openedPackUids],
		revealedCardUids: [...input.revealedCardUids],
		checks,
	};
}

export function isRuneSeason0SmokeEvidencePassing(evidence: RuneSeason0SmokeEvidence): boolean {
	return evidence.checks.every(check => check.passed);
}

function buildChecks(input: RuneSeason0SmokeInput): RuneSeason0SmokeCheck[] {
	const totals = calculateLedgerTotals(input.ledgerEntries);

	return [
		hasLedgerMovement(input.ledgerEntries, 'credit', 'daily_quest_claim', 'daily_quest_credit'),
		hasLedgerMovement(input.ledgerEntries, 'credit', 'campaign_first_clear', 'campaign_first_clear_credit'),
		hasLedgerMovement(input.ledgerEntries, 'debit', 'rune_exchange', 'rune_exchange_debit'),
		{
			key: 'pack_opening_result',
			passed: hasApplied(input.operations, 'pack_burn')
				&& input.openedPackUids.length > 0
				&& input.revealedCardUids.length > 0,
			detail: `${input.openedPackUids.length} pack(s), ${input.revealedCardUids.length} card(s)`,
		},
		{
			key: 'insufficient_balance_rejection',
			passed: input.operations.some(operation =>
				operation.action === 'rune_exchange'
				&& operation.status === 'rejected'
				&& operation.reason?.toLowerCase().includes('insufficient') === true),
			detail: 'spend-without-balance rejection is present',
		},
		{
			key: 'api_balance_parity',
			passed: input.apiSummary.credits === totals.credits
				&& input.apiSummary.debits === totals.debits
				&& input.apiSummary.runeBalance === totals.balance
				&& input.apiSummary.drift === 0,
			detail: `api=${input.apiSummary.runeBalance}, ledger=${totals.balance}`,
		},
		{
			key: 'p2p_result_only_no_credit',
			passed: input.operations.some(operation =>
				operation.action === 'match_result'
				&& operation.status === 'rejected'
				&& operation.reason?.includes('match_anchor') === true)
				&& !input.ledgerEntries.some(entry => entry.sourceType === 'p2p_ranked'),
			detail: 'result-only ranked match did not create p2p_ranked RUNE',
		},
	];
}

function hasLedgerMovement(
	entries: readonly RuneLedgerEntry[],
	direction: RuneLedgerDirection,
	sourceType: RuneSourceType,
	key: RuneSeason0SmokeCheckKey,
): RuneSeason0SmokeCheck {
	const amount = entries
		.filter(entry => entry.direction === direction && entry.sourceType === sourceType)
		.reduce((total, entry) => total + entry.amount, 0);

	return {
		key,
		passed: amount > 0,
		detail: `${direction} ${sourceType}: ${amount}`,
	};
}

function calculateLedgerTotals(entries: readonly RuneLedgerEntry[]): LedgerTotals {
	let credits = 0;
	let debits = 0;
	for (const entry of entries) {
		if (entry.direction === 'credit') credits += entry.amount;
		if (entry.direction === 'debit') debits += entry.amount;
	}

	return {
		credits,
		debits,
		balance: credits - debits,
	};
}

function hasApplied(
	operations: readonly RuneSeason0SmokeOperation[],
	action: RuneSeason0SmokeAction,
): boolean {
	return operations.some(operation => operation.action === action && operation.status === 'applied');
}

function unique(values: readonly string[]): string[] {
	return [...new Set(values.filter(value => value.trim().length > 0))];
}

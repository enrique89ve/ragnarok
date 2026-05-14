import { Router, type Request, type Response } from 'express';
import {
	getAllTokenBalances,
	getBlockCursor,
	getRuneAccountSummaries,
	getRuneBalanceTotal,
	getRuneLedgerEntries,
	getRuneSeasonStats,
} from '../services/chainState';
import {
	TESTNET_RUNE_ECONOMY,
	TESTNET_RUNE_SEASON_ID,
	type RuneLedgerDirection,
	type RuneSourceType,
} from '../../shared/protocol-core/types';

type ValidationResult<T> =
	| { status: 'valid'; value: T }
	| { status: 'invalid'; code: number; error: string };

type RuneLedgerFilters = {
	seasonId: string;
	account?: string;
	direction?: RuneLedgerDirection;
	sourceType?: RuneSourceType;
	limit: number;
	offset: number;
};

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const RUNE_DIRECTIONS: readonly RuneLedgerDirection[] = ['credit', 'debit'];
const RUNE_SOURCE_TYPES: readonly RuneSourceType[] = [
	'p2p_ranked',
	'campaign_first_clear',
	'reward_claim',
	'daily_quest_claim',
	'rune_exchange',
];
const RUNE_ACCOUNT_RE = /^[a-z][a-z0-9._-]{2,31}$/;

const router = Router();

function getSingleQueryValue(value: unknown): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value === 'string') return value;
	if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
	return undefined;
}

function validateSeasonId(value: unknown): ValidationResult<string> {
	const raw = getSingleQueryValue(value) ?? TESTNET_RUNE_SEASON_ID;
	if (!/^[A-Za-z0-9_-]{1,32}$/.test(raw)) {
		return { status: 'invalid', code: 400, error: 'Invalid seasonId' };
	}
	return { status: 'valid', value: raw };
}

function validateOptionalAccount(value: unknown): ValidationResult<string | undefined> {
	const raw = getSingleQueryValue(value);
	if (raw === undefined || raw.length === 0) return { status: 'valid', value: undefined };
	if (!RUNE_ACCOUNT_RE.test(raw)) {
		return { status: 'invalid', code: 400, error: 'Invalid account' };
	}
	return { status: 'valid', value: raw };
}

function validateOptionalDirection(value: unknown): ValidationResult<RuneLedgerDirection | undefined> {
	const raw = getSingleQueryValue(value);
	if (raw === undefined || raw.length === 0) return { status: 'valid', value: undefined };
	if (!RUNE_DIRECTIONS.includes(raw as RuneLedgerDirection)) {
		return { status: 'invalid', code: 400, error: 'Invalid direction' };
	}
	return { status: 'valid', value: raw as RuneLedgerDirection };
}

function validateOptionalSourceType(value: unknown): ValidationResult<RuneSourceType | undefined> {
	const raw = getSingleQueryValue(value);
	if (raw === undefined || raw.length === 0) return { status: 'valid', value: undefined };
	if (!RUNE_SOURCE_TYPES.includes(raw as RuneSourceType)) {
		return { status: 'invalid', code: 400, error: 'Invalid sourceType' };
	}
	return { status: 'valid', value: raw as RuneSourceType };
}

function validateInteger(value: unknown, fallback: number, min: number, max: number, field: string): ValidationResult<number> {
	const raw = getSingleQueryValue(value);
	if (raw === undefined || raw.length === 0) return { status: 'valid', value: fallback };
	if (!/^\d+$/.test(raw)) {
		return { status: 'invalid', code: 400, error: `Invalid ${field}` };
	}

	const parsed = Number(raw);
	if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
		return { status: 'invalid', code: 400, error: `${field} must be between ${min} and ${max}` };
	}
	return { status: 'valid', value: parsed };
}

function parseLedgerFilters(req: Request): ValidationResult<RuneLedgerFilters> {
	const seasonId = validateSeasonId(req.query.seasonId);
	if (seasonId.status === 'invalid') return seasonId;

	const account = validateOptionalAccount(req.query.account);
	if (account.status === 'invalid') return account;

	const direction = validateOptionalDirection(req.query.direction);
	if (direction.status === 'invalid') return direction;

	const sourceType = validateOptionalSourceType(req.query.sourceType);
	if (sourceType.status === 'invalid') return sourceType;

	const limit = validateInteger(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT, 'limit');
	if (limit.status === 'invalid') return limit;

	const offset = validateInteger(req.query.offset, 0, 0, 1_000_000, 'offset');
	if (offset.status === 'invalid') return offset;

	return {
		status: 'valid',
		value: {
			seasonId: seasonId.value,
			account: account.value,
			direction: direction.value,
			sourceType: sourceType.value,
			limit: limit.value,
			offset: offset.value,
		},
	};
}

function sendInvalid<T>(res: Response, result: Extract<ValidationResult<T>, { status: 'invalid' }>): void {
	res.status(result.code).json({ success: false, error: result.error });
}

router.get('/state', (req: Request, res: Response) => {
	const seasonId = validateSeasonId(req.query.seasonId);
	if (seasonId.status === 'invalid') {
		sendInvalid(res, seasonId);
		return;
	}

	const runeStats = getRuneSeasonStats(seasonId.value);
	const ledgerActiveTotal = runeStats.ledgerCreditTotal - runeStats.ledgerDebitTotal;
	const activeBalanceTotal = getRuneBalanceTotal();

	res.json({
		success: true,
		seasonId: seasonId.value,
		totalCap: TESTNET_RUNE_ECONOMY.totalCap,
		p2pCap: TESTNET_RUNE_ECONOMY.p2pCap,
		campaignCap: TESTNET_RUNE_ECONOMY.campaignCap,
		dailyQuestCap: TESTNET_RUNE_ECONOMY.dailyQuestCap,
		activeBalanceTotal,
		ledgerCreditTotal: runeStats.ledgerCreditTotal,
		ledgerDebitTotal: runeStats.ledgerDebitTotal,
		ledgerActiveTotal,
		balanceDrift: activeBalanceTotal - ledgerActiveTotal,
		p2pCreditTotal: runeStats.p2pCreditTotal,
		campaignCreditTotal: runeStats.campaignCreditTotal,
		rewardClaimCreditTotal: runeStats.rewardClaimCreditTotal,
		dailyQuestCreditTotal: runeStats.dailyQuestCreditTotal,
		runeExchangeDebitTotal: runeStats.runeExchangeDebitTotal,
		lastBlock: getBlockCursor(),
		generatedAt: new Date().toISOString(),
	});
});

router.get('/ledger', (req: Request, res: Response) => {
	const filters = parseLedgerFilters(req);
	if (filters.status === 'invalid') {
		sendInvalid(res, filters);
		return;
	}

	const entries = getRuneLedgerEntries({
		seasonId: filters.value.seasonId,
		account: filters.value.account,
		direction: filters.value.direction,
		sourceType: filters.value.sourceType,
	}).sort((left, right) =>
		right.blockNum - left.blockNum
		|| right.timestamp - left.timestamp
		|| right.entryId.localeCompare(left.entryId),
	);
	const page = entries.slice(filters.value.offset, filters.value.offset + filters.value.limit);

	res.json({
		success: true,
		seasonId: filters.value.seasonId,
		entries: page,
		total: entries.length,
		limit: filters.value.limit,
		offset: filters.value.offset,
	});
});

router.get('/balances', (req: Request, res: Response) => {
	const seasonId = validateSeasonId(req.query.seasonId);
	if (seasonId.status === 'invalid') {
		sendInvalid(res, seasonId);
		return;
	}

	const limit = validateInteger(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT, 'limit');
	if (limit.status === 'invalid') {
		sendInvalid(res, limit);
		return;
	}

	const offset = validateInteger(req.query.offset, 0, 0, 1_000_000, 'offset');
	if (offset.status === 'invalid') {
		sendInvalid(res, offset);
		return;
	}

	const result = getAllTokenBalances(limit.value, offset.value);
	const accountNames = result.balances.map(balance => balance.account);
	const accounts = getRuneAccountSummaries(accountNames, seasonId.value);

	res.json({
		success: true,
		seasonId: seasonId.value,
		accounts,
		total: result.total,
		limit: limit.value,
		offset: offset.value,
	});
});

export default router;

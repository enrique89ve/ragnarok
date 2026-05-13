import { Router, type Request, type Response } from 'express';
import {
	getBlockCursor,
	getEitrAccountSummaries,
	getEitrLedgerEntries,
	getEitrSeasonStats,
} from '../services/chainState';
import {
	TESTNET_EITR_SEASON_ID,
	type EitrLedgerDirection,
	type EitrSourceType,
} from '../../shared/protocol-core/types';

type ValidationResult<T> =
	| { status: 'valid'; value: T }
	| { status: 'invalid'; code: number; error: string };

type EitrLedgerFilters = {
	seasonId: string;
	account?: string;
	direction?: EitrLedgerDirection;
	sourceType?: EitrSourceType;
	limit: number;
	offset: number;
};

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const EITR_DIRECTIONS: readonly EitrLedgerDirection[] = ['credit', 'debit'];
const EITR_SOURCE_TYPES: readonly EitrSourceType[] = [
	'burn',
	'forge_commit',
	'forge_refund',
];
const EITR_ACCOUNT_RE = /^[a-z][a-z0-9._-]{2,31}$/;

const router = Router();

function getSingleQueryValue(value: unknown): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value === 'string') return value;
	if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
	return undefined;
}

function validateSeasonId(value: unknown): ValidationResult<string> {
	const raw = getSingleQueryValue(value) ?? TESTNET_EITR_SEASON_ID;
	if (!/^[A-Za-z0-9_-]{1,32}$/.test(raw)) {
		return { status: 'invalid', code: 400, error: 'Invalid seasonId' };
	}
	return { status: 'valid', value: raw };
}

function validateOptionalAccount(value: unknown): ValidationResult<string | undefined> {
	const raw = getSingleQueryValue(value);
	if (raw === undefined || raw.length === 0) return { status: 'valid', value: undefined };
	if (!EITR_ACCOUNT_RE.test(raw)) {
		return { status: 'invalid', code: 400, error: 'Invalid account' };
	}
	return { status: 'valid', value: raw };
}

function validateOptionalDirection(value: unknown): ValidationResult<EitrLedgerDirection | undefined> {
	const raw = getSingleQueryValue(value);
	if (raw === undefined || raw.length === 0) return { status: 'valid', value: undefined };
	if (!EITR_DIRECTIONS.includes(raw as EitrLedgerDirection)) {
		return { status: 'invalid', code: 400, error: 'Invalid direction' };
	}
	return { status: 'valid', value: raw as EitrLedgerDirection };
}

function validateOptionalSourceType(value: unknown): ValidationResult<EitrSourceType | undefined> {
	const raw = getSingleQueryValue(value);
	if (raw === undefined || raw.length === 0) return { status: 'valid', value: undefined };
	if (!EITR_SOURCE_TYPES.includes(raw as EitrSourceType)) {
		return { status: 'invalid', code: 400, error: 'Invalid sourceType' };
	}
	return { status: 'valid', value: raw as EitrSourceType };
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

function parseLedgerFilters(req: Request): ValidationResult<EitrLedgerFilters> {
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

	const stats = getEitrSeasonStats(seasonId.value);
	const ledgerActiveTotal = stats.ledgerCreditTotal - stats.ledgerDebitTotal;

	res.json({
		success: true,
		seasonId: seasonId.value,
		ledgerCreditTotal: stats.ledgerCreditTotal,
		ledgerDebitTotal: stats.ledgerDebitTotal,
		ledgerActiveTotal,
		burnCreditTotal: stats.burnCreditTotal,
		forgeCommitDebitTotal: stats.forgeCommitDebitTotal,
		forgeRefundCreditTotal: stats.forgeRefundCreditTotal,
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

	const entries = getEitrLedgerEntries({
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

	// Eitr has no TokenBalance scalar — derive the account set from ledger entries
	// in this season. Sort by eitrBalance desc, then paginate.
	const allEntries = getEitrLedgerEntries({ seasonId: seasonId.value });
	const accountSet = new Set<string>();
	for (const entry of allEntries) accountSet.add(entry.account);
	const accountList = [...accountSet];

	const summaries = getEitrAccountSummaries(accountList, seasonId.value);
	summaries.sort((a, b) => b.eitrBalance - a.eitrBalance || a.account.localeCompare(b.account));

	const page = summaries.slice(offset.value, offset.value + limit.value);

	res.json({
		success: true,
		seasonId: seasonId.value,
		accounts: page,
		total: summaries.length,
		limit: limit.value,
		offset: offset.value,
	});
});

export default router;

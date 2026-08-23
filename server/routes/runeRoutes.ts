import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
	getAllTokenBalances,
	getBlockCursor,
	getRuneAccountSummaries,
	getRuneBalanceTotal,
	getRuneLedgerEntries,
	getRuneSeasonStats,
} from '../services/chainState';
import { deriveRuneSeasonId } from '../../shared/protocol-core/runeSeasonHash';
import { getRuneEconomy } from '../../shared/protocol-core/runeEconomy';
import { getRagnarokServerRuntimeConfig } from '../services/runtimeConfig';
import { createQueryValidationMiddleware } from '../middleware/validation';

const RUNE_DIRECTIONS = ['credit', 'debit'] as const;
const RUNE_SOURCE_TYPES = [
	'p2p_ranked',
	'campaign_first_clear',
	'reward_claim',
	'daily_quest_claim',
	'rune_exchange',
] as const;

function activeSeasonId(): string {
	return deriveRuneSeasonId(getRagnarokServerRuntimeConfig());
}

function activeRuneEconomy() {
	return getRuneEconomy(getRagnarokServerRuntimeConfig().stage);
}

const SeasonIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,32}$/).default(activeSeasonId());
const AccountSchema = z.string().regex(/^[a-z][a-z0-9._-]{2,31}$/);
const LimitSchema = z.coerce.number().int().min(1).max(200).default(50);
const OffsetSchema = z.coerce.number().int().min(0).max(1_000_000).default(0);

const SeasonIdQuerySchema = z.object({
	seasonId: SeasonIdSchema,
});

const LedgerQuerySchema = z.object({
	seasonId: SeasonIdSchema,
	account: AccountSchema.optional(),
	direction: z.enum(RUNE_DIRECTIONS).optional(),
	sourceType: z.enum(RUNE_SOURCE_TYPES).optional(),
	limit: LimitSchema,
	offset: OffsetSchema,
});

const BalancesQuerySchema = z.object({
	seasonId: SeasonIdSchema,
	limit: LimitSchema,
	offset: OffsetSchema,
});

const router = Router();

// ---------------------------------------------------------------------------
// GET /state — global economy overview
// ---------------------------------------------------------------------------
router.get('/state', createQueryValidationMiddleware(SeasonIdQuerySchema), (req: Request, res: Response) => {
	const { seasonId } = req.query as unknown as z.infer<typeof SeasonIdQuerySchema>;

	const runeStats = getRuneSeasonStats(seasonId);
	const ledgerActiveTotal = runeStats.ledgerCreditTotal - runeStats.ledgerDebitTotal;
	const activeBalanceTotal = getRuneBalanceTotal(seasonId);
	const economy = activeRuneEconomy();

	res.json({
		success: true,
		seasonId,
		totalCap: economy.totalCap,
		p2pCap: economy.p2pCap,
		campaignCap: economy.campaignCap,
		dailyQuestCap: economy.dailyQuestCap,
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

// ---------------------------------------------------------------------------
// GET /ledger — granular transaction history
// ---------------------------------------------------------------------------
router.get('/ledger', createQueryValidationMiddleware(LedgerQuerySchema), (req: Request, res: Response) => {
	const query = req.query as unknown as z.infer<typeof LedgerQuerySchema>;

	const entries = getRuneLedgerEntries({
		seasonId: query.seasonId,
		account: query.account,
		direction: query.direction,
		sourceType: query.sourceType,
	}).sort((left, right) =>
		right.blockNum - left.blockNum
		|| right.timestamp - left.timestamp
		|| right.entryId.localeCompare(left.entryId),
	);
	const page = entries.slice(query.offset, query.offset + query.limit);

	res.json({
		success: true,
		seasonId: query.seasonId,
		entries: page,
		total: entries.length,
		limit: query.limit,
		offset: query.offset,
	});
});

// ---------------------------------------------------------------------------
// GET /balances — leaderboard-style balance view
// ---------------------------------------------------------------------------
router.get('/balances', createQueryValidationMiddleware(BalancesQuerySchema), (req: Request, res: Response) => {
	const query = req.query as unknown as z.infer<typeof BalancesQuerySchema>;

	const result = getAllTokenBalances(query.seasonId, query.limit, query.offset);
	const accountNames = result.balances.map(balance => balance.account);
	const accounts = getRuneAccountSummaries(accountNames, query.seasonId);

	res.json({
		success: true,
		seasonId: query.seasonId,
		accounts,
		total: result.total,
		limit: query.limit,
		offset: query.offset,
	});
});

export default router;

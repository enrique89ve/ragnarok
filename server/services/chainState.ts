/**
 * chainState.ts — In-memory global chain state with JSON file persistence.
 *
 * Same pattern as matchmakingRoutes.ts (JSON file + in-memory Maps).
 * Stores player ELO, card ownership, match history, and sync cursors
 * derived from replaying Hive custom_json ops.
 *
 * On server startup: loads from the configured/runtime chain-state file
 * During operation: writes debounced every 30s
 * On shutdown: final flush
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import type {
	CampaignProgressRecord,
	CampaignSubmissionRecord,
	DuatClaimRecord,
	PackAsset,
	PackSupplyRecord,
	RuneLedgerEntry,
	RuneLedgerEntryQuery,
	RuneLedgerTotalQuery,
	EitrLedgerEntry,
	EitrLedgerEntryQuery,
	EitrLedgerTotalQuery,
	ForgeCommitRecord,
	MarketListing,
	MarketOffer,
} from '../../shared/protocol-core/types';
import {
	isDuatAcquisitionProvenance,
	type AcquisitionProvenance,
} from '../../shared/protocol-core/acquisitionProvenance';
import { getRagnarokRuntimePhase } from '../../shared/runtimeConfig';
import { getRagnarokServerRuntimeConfig } from './runtimeConfig';

const DEFAULT_ELO_RATING = 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerRecord {
	username: string;
	elo: number;
	wins: number;
	losses: number;
	lastMatchAt: number;
}

export interface CardRecord {
	uid: string;
	cardId: number;
	owner: string;
	rarity: string;
	level: number;
	xp: number;
	edition?: string;
	foil?: string;
	mintSource?: 'genesis' | 'pack' | 'reward' | 'replica' | 'merge' | 'forge';
	mintTrxId?: string;
	mintBlockNum?: number;
	lastTransferBlock?: number;
	originDna?: string;
	instanceDna?: string;
	parentInstanceDna?: string;
	generation?: number;
	replicaCount?: number;
	mergedFrom?: string[];
	acquisition?: AcquisitionProvenance;
}

export interface MatchRecord {
	matchId: string;
	winner: string;
	loser: string;
	winnerEloBefore: number;
	winnerEloAfter: number;
	loserEloBefore: number;
	loserEloAfter: number;
	cardFingerprint: string;
	timestamp: number;
	blockNum: number;
}

// ---------------------------------------------------------------------------
// Protocol-core state (persisted alongside legacy state)
// ---------------------------------------------------------------------------

export interface GenesisStateRecord {
	version: string;
	sealed: boolean;
	sealBlock: number;
	packSupply: Record<string, number>;
	rewardSupply: Record<string, number>;
}

export interface SupplyCounterRecord {
	key: string;
	pool: 'pack' | 'reward';
	cap: number;
	minted: number;
}

export interface MatchAnchorStateRecord {
	matchId: string;
	playerA: string;
	playerB: string;
	pubkeyA?: string;
	pubkeyB?: string;
	deckHashA?: string;
	deckHashB?: string;
	engineHash?: string;
	// Mirrors MatchAnchorRecord.cardRegistryHash (ADR 0004 §Decision.2).
	// Persisted alongside engineHash so the anchor↔result cross-check has
	// both pinned values. Optional for backward-read compat with anchors
	// written before this field existed.
	cardRegistryHash?: string;
	dualAnchored: boolean;
	timestamp: number;
}

export interface PackCommitStateRecord {
	trxId: string;
	account: string;
	packType: string;
	quantity: number;
	saltCommit: string;
	commitBlock: number;
	revealed: boolean;
}

export interface TokenBalanceRecord {
	account: string;
	RUNE: number;
}

export interface QueueStateRecord {
	mode: string;
	elo: number;
	peerId: string;
	deckHash: string;
	timestamp: number;
	blockNum: number;
}

export interface RuneAccountSummary {
	account: string;
	runeBalance: number;
	credits: number;
	debits: number;
	drift: number;
	lastBlock: number;
	indexed: boolean;
}

export interface RuneSeasonStats {
	ledgerCreditTotal: number;
	ledgerDebitTotal: number;
	p2pCreditTotal: number;
	campaignCreditTotal: number;
	rewardClaimCreditTotal: number;
	dailyQuestCreditTotal: number;
	runeExchangeDebitTotal: number;
}

export interface EitrAccountSummary {
	account: string;
	eitrBalance: number;   // derived: credits - debits (no scalar TokenBalance.Eitr)
	credits: number;
	debits: number;
	lastBlock: number;
	indexed: boolean;
}

export interface EitrSeasonStats {
	ledgerCreditTotal: number;
	ledgerDebitTotal: number;
	burnCreditTotal: number;
	forgeCommitDebitTotal: number;
	forgeRefundCreditTotal: number;
}

interface SerializedState {
	players: [string, PlayerRecord][];
	cards: [string, CardRecord][];
	matches: MatchRecord[];
	knownAccounts: string[];
	syncCursors: [string, number][];
	lastSyncedAt: number;
	playerNonces: [string, number][];
	// PR 2B: global block cursor + protocol-core state
	lastIrreversibleBlockProcessed?: number;
	genesis?: GenesisStateRecord | null;
	supplyCounters?: [string, SupplyCounterRecord][];
	tokenBalances?: [string, TokenBalanceRecord][];
	matchAnchors?: [string, MatchAnchorStateRecord][];
	packCommits?: [string, PackCommitStateRecord][];
	rewardClaims?: string[];
	duatClaims?: [string, DuatClaimRecord][];
	campaignNonces?: [string, number][];
	campaignSubmissions?: [string, CampaignSubmissionRecord][];
	campaignProgress?: [string, CampaignProgressRecord][];
	runeLedger?: [string, RuneLedgerEntry][];
	eitrLedger?: [string, EitrLedgerEntry][];
	forgeCommits?: [string, ForgeCommitRecord][];
	packs?: [string, PackAsset][];
	packSupply?: [string, PackSupplyRecord][];
	slashedAccounts?: string[];
	marketListings?: [string, ListingRecord][];
	marketOffers?: [string, OfferRecord][];
	// Sync status
	inSync?: boolean;
	headBlock?: number;
	irreversibleBlock?: number;
	syncTargetBlock?: number;
}

// ---------------------------------------------------------------------------
// Chain-state persistence contract (input boundary only)
// ---------------------------------------------------------------------------

const NonNegativeInt = z.number().int().nonnegative().finite();
const IntNumber = z.number().finite();
const SafeString = z.string();
const Timestamp = z.number().finite().nonnegative();
const Pair = <T>(value: z.ZodType<T>) => z.tuple([SafeString, value]);
const AcquisitionProvenanceSchema = z.custom<AcquisitionProvenance>(
	value => value === undefined || isDuatAcquisitionProvenance(value),
	'invalid acquisition provenance',
);

const PlayerRecordSchema = z.object({
	username: z.string(),
	elo: NonNegativeInt,
	wins: NonNegativeInt,
	losses: NonNegativeInt,
	lastMatchAt: Timestamp,
}).passthrough();

const CardRecordSchema = z.object({
	uid: z.string(),
	cardId: NonNegativeInt,
	owner: z.string(),
	rarity: z.string(),
	level: NonNegativeInt,
	xp: NonNegativeInt,
	edition: z.string().optional(),
	foil: z.string().optional(),
	mintSource: z.enum(['genesis', 'pack', 'reward', 'replica', 'merge', 'forge']).optional(),
	mintTrxId: z.string().optional(),
	mintBlockNum: IntNumber.optional(),
	lastTransferBlock: IntNumber.optional(),
	originDna: z.string().optional(),
	instanceDna: z.string().optional(),
	parentInstanceDna: z.string().optional(),
	generation: NonNegativeInt.optional(),
	replicaCount: NonNegativeInt.optional(),
	mergedFrom: z.array(z.string()).optional(),
	acquisition: AcquisitionProvenanceSchema.optional(),
}).passthrough();

const MatchRecordSchema = z.object({
	matchId: z.string(),
	winner: z.string(),
	loser: z.string(),
	winnerEloBefore: NonNegativeInt,
	winnerEloAfter: NonNegativeInt,
	loserEloBefore: NonNegativeInt,
	loserEloAfter: NonNegativeInt,
	cardFingerprint: z.string(),
	timestamp: Timestamp,
	blockNum: NonNegativeInt,
}).passthrough();

const GenesisStateSchema = z.object({
	version: z.string(),
	sealed: z.boolean(),
	sealBlock: NonNegativeInt,
	packSupply: z.record(NonNegativeInt),
	rewardSupply: z.record(NonNegativeInt),
}).passthrough();

const SupplyCounterRecordSchema = z.object({
	key: z.string(),
	pool: z.enum(['pack', 'reward']),
	cap: NonNegativeInt,
	minted: NonNegativeInt,
}).passthrough();

const TokenBalanceRecordSchema = z.object({
	account: z.string(),
	RUNE: IntNumber,
}).passthrough();

const MatchAnchorStateRecordSchema = z.object({
	matchId: z.string(),
	playerA: z.string(),
	playerB: z.string(),
	pubkeyA: z.string().optional(),
	pubkeyB: z.string().optional(),
	deckHashA: z.string().optional(),
	deckHashB: z.string().optional(),
	engineHash: z.string().optional(),
	cardRegistryHash: z.string().optional(),
	dualAnchored: z.boolean(),
	timestamp: Timestamp,
}).passthrough();

const PackCommitStateRecordSchema = z.object({
	trxId: z.string(),
	account: z.string(),
	packType: z.string(),
	quantity: NonNegativeInt,
	saltCommit: z.string(),
	commitBlock: NonNegativeInt,
	revealed: z.boolean(),
}).passthrough();

const ForgeCommitStateRecordSchema = z.object({
	trxId: z.string(),
	account: z.string(),
	rarity: z.string(),
	saltCommit: z.string(),
	commitBlock: NonNegativeInt,
	debitAmount: NonNegativeInt,
	revealed: z.boolean(),
}).passthrough();

const DuatClaimRecordSchema = z.object({
	account: z.string(),
	duatRaw: IntNumber,
	packsEarned: NonNegativeInt,
	blockNum: NonNegativeInt,
	trxId: z.string(),
}).passthrough();

const CampaignSubmissionRecordSchema = z.object({
	submissionKey: z.string(),
	account: z.string(),
	campaignId: z.string(),
	missionId: z.string(),
	difficulty: z.enum(['normal', 'heroic', 'mythic']),
	nonce: NonNegativeInt,
	localRunId: z.string(),
	localStartedAt: Timestamp,
	rulesetHash: z.string(),
	seed: z.string(),
	turnCount: NonNegativeInt,
	stars: NonNegativeInt,
	transcriptRoot: z.string(),
	transcriptCid: z.string().optional(),
	finalStateHash: z.string(),
	status: z.enum(['queued', 'consumed', 'rejected']),
	rejectionReason: z.string().optional(),
	trxId: z.string(),
	blockNum: NonNegativeInt,
	timestamp: Timestamp,
}).passthrough();

const CampaignProgressRecordSchema = z.object({
	account: z.string(),
	campaignId: z.string(),
	missionId: z.string(),
	bestDifficulty: z.enum(['normal', 'heroic', 'mythic']),
	bestTurns: NonNegativeInt,
	bestStars: NonNegativeInt,
	completedAtBlock: NonNegativeInt,
	completedTrxId: z.string(),
	status: z.literal('verified'),
}).passthrough();

const RuneLedgerEntrySchema = z.object({
	entryId: z.string(),
	seasonId: z.string(),
	account: z.string(),
	direction: z.enum(['credit', 'debit']),
	sourceType: z.enum(['p2p_ranked', 'campaign_first_clear', 'rune_exchange', 'reward_claim', 'daily_quest_claim']),
	sourceKey: z.string(),
	amount: IntNumber,
	balanceBefore: IntNumber,
	balanceAfter: IntNumber,
	trxId: z.string(),
	blockNum: NonNegativeInt,
	timestamp: Timestamp,
}).passthrough();

const EitrLedgerEntrySchema = z.object({
	entryId: z.string(),
	seasonId: z.string(),
	account: z.string(),
	direction: z.enum(['credit', 'debit']),
	sourceType: z.enum(['burn', 'forge_commit', 'forge_refund']),
	sourceKey: z.string(),
	amount: IntNumber,
	balanceBefore: IntNumber,
	balanceAfter: IntNumber,
	trxId: z.string(),
	blockNum: NonNegativeInt,
	timestamp: Timestamp,
}).passthrough();

const PackAssetSchema = z.object({
	uid: z.string(),
	packType: z.string(),
	dna: z.string(),
	owner: z.string(),
	sealed: z.boolean(),
	mintTrxId: z.string(),
	mintBlockNum: NonNegativeInt,
	lastTransferBlock: NonNegativeInt,
	cardCount: NonNegativeInt,
	edition: z.string(),
	acquisition: AcquisitionProvenanceSchema.optional(),
}).passthrough();

const PackSupplyRecordSchema = z.object({
	packType: z.string(),
	minted: NonNegativeInt,
	burned: NonNegativeInt,
	cap: NonNegativeInt,
}).passthrough();

const MarketListingSchema = z.object({
	listingId: z.string(),
	nftUid: z.string(),
	nftType: z.enum(['card', 'pack']),
	seller: z.string(),
	price: z.number().finite(),
	currency: z.enum(['HIVE', 'HBD']),
	listedBlock: NonNegativeInt,
	listedTrxId: z.string(),
	active: z.boolean(),
}).passthrough();

const MarketOfferSchema = z.object({
	offerId: z.string(),
	nftUid: z.string(),
	buyer: z.string(),
	price: z.number().finite(),
	currency: z.enum(['HIVE', 'HBD']),
	offeredBlock: NonNegativeInt,
	offeredTrxId: z.string(),
	status: z.enum(['pending', 'accepted', 'rejected', 'expired']),
	paymentTrxId: z.string().optional(),
}).passthrough();

const ChainStateContractSchema = z.object({
	players: z.array(Pair(PlayerRecordSchema)).catch([]).default([]),
	cards: z.array(Pair(CardRecordSchema)).catch([]).default([]),
	matches: z.array(MatchRecordSchema).catch([]).default([]),
	knownAccounts: z.array(z.string()).catch([]).default([]),
	syncCursors: z.array(Pair(NonNegativeInt)).catch([]).default([]),
	lastSyncedAt: Timestamp.default(0).catch(0),
	playerNonces: z.array(Pair(NonNegativeInt)).catch([]).default([]),
	lastIrreversibleBlockProcessed: NonNegativeInt.default(0).catch(0),
	genesis: GenesisStateSchema.nullable().catch(null).default(null),
	supplyCounters: z.array(Pair(SupplyCounterRecordSchema)).catch([]).default([]),
	tokenBalances: z.array(Pair(TokenBalanceRecordSchema)).catch([]).default([]),
	matchAnchors: z.array(Pair(MatchAnchorStateRecordSchema)).catch([]).default([]),
	packCommits: z.array(Pair(PackCommitStateRecordSchema)).catch([]).default([]),
	rewardClaims: z.array(z.string()).catch([]).default([]),
	duatClaims: z.array(Pair(DuatClaimRecordSchema)).catch([]).default([]),
	campaignNonces: z.array(Pair(NonNegativeInt)).catch([]).default([]),
	campaignSubmissions: z.array(Pair(CampaignSubmissionRecordSchema)).catch([]).default([]),
	campaignProgress: z.array(Pair(CampaignProgressRecordSchema)).catch([]).default([]),
	runeLedger: z.array(Pair(RuneLedgerEntrySchema)).catch([]).default([]),
	eitrLedger: z.array(Pair(EitrLedgerEntrySchema)).catch([]).default([]),
	forgeCommits: z.array(Pair(ForgeCommitStateRecordSchema)).catch([]).default([]),
	packs: z.array(Pair(PackAssetSchema)).catch([]).default([]),
	packSupply: z.array(Pair(PackSupplyRecordSchema)).catch([]).default([]),
	slashedAccounts: z.array(z.string()).catch([]).default([]),
	marketListings: z.array(Pair(MarketListingSchema)).catch([]).default([]),
	marketOffers: z.array(Pair(MarketOfferSchema)).catch([]).default([]),
	inSync: z.boolean().default(false).catch(false),
	headBlock: NonNegativeInt.default(0).catch(0),
	irreversibleBlock: NonNegativeInt.default(0).catch(0),
	syncTargetBlock: NonNegativeInt.default(0).catch(0),
});

type ChainStateContract = z.infer<typeof ChainStateContractSchema>;

function parseChainStatePayload(raw: string, initialBlockCursor: number): ChainStateContract {
	let payload: unknown;
	try {
		payload = JSON.parse(raw);
	} catch (err) {
		console.warn('[chainState] Invalid JSON in state file, using defaults:', err);
		return normalizeChainStatePayload(undefined, initialBlockCursor, true);
	}

	return normalizeChainStatePayload(payload, initialBlockCursor, false);
}

function normalizeChainStatePayload(
	payload: unknown,
	initialBlockCursor: number,
	fromJson = false,
): ChainStateContract {
	const result = ChainStateContractSchema.safeParse(payload);
	if (!result.success) {
		if (fromJson) {
			console.warn('[chainState] Invalid persisted state contract, using defaults:', result.error.flatten().formErrors);
		} else {
			console.warn('[chainState] Invalid import state contract, using defaults:', result.error.flatten().formErrors);
		}
		return emptyChainState(initialBlockCursor);
	}
	const data = result.data;
	return {
		...data,
		lastIrreversibleBlockProcessed: Math.max(data.lastIrreversibleBlockProcessed ?? initialBlockCursor, initialBlockCursor),
		syncTargetBlock: data.syncTargetBlock ?? data.irreversibleBlock ?? data.lastIrreversibleBlockProcessed,
	};
}

function emptyChainState(initialBlockCursor: number): ChainStateContract {
	return {
		players: [],
		cards: [],
		matches: [],
		knownAccounts: [],
		syncCursors: [],
		lastSyncedAt: 0,
		playerNonces: [],
		lastIrreversibleBlockProcessed: initialBlockCursor,
		genesis: null,
		supplyCounters: [],
		tokenBalances: [],
		matchAnchors: [],
		packCommits: [],
		rewardClaims: [],
		duatClaims: [],
		campaignNonces: [],
		campaignSubmissions: [],
		campaignProgress: [],
		runeLedger: [],
		eitrLedger: [],
		forgeCommits: [],
		packs: [],
		packSupply: [],
		slashedAccounts: [],
		marketListings: [],
		marketOffers: [],
		inSync: false,
		headBlock: 0,
		irreversibleBlock: 0,
		syncTargetBlock: initialBlockCursor,
	};
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const players = new Map<string, PlayerRecord>();
const cards = new Map<string, CardRecord>();
const matches: MatchRecord[] = [];
const knownAccounts = new Set<string>();
const syncCursors = new Map<string, number>();
const playerNonces = new Map<string, number>();
let lastSyncedAt = 0;

// PR 2B: global block cursor + protocol-core state
let lastIrreversibleBlockProcessed = 0;
let genesisState: GenesisStateRecord | null = null;
const supplyCounters = new Map<string, SupplyCounterRecord>();
const tokenBalances = new Map<string, TokenBalanceRecord>();
const matchAnchors = new Map<string, MatchAnchorStateRecord>();
const packCommits = new Map<string, PackCommitStateRecord>();
const rewardClaims = new Set<string>();
const duatClaims = new Map<string, DuatClaimRecord>();
const campaignNonces = new Map<string, number>();
const campaignSubmissions = new Map<string, CampaignSubmissionRecord>();
const campaignProgress = new Map<string, CampaignProgressRecord>();
const runeLedger = new Map<string, RuneLedgerEntry>();
const eitrLedger = new Map<string, EitrLedgerEntry>();
const forgeCommits = new Map<string, ForgeCommitRecord>();
const packs = new Map<string, PackAsset>();
const packSupply = new Map<string, PackSupplyRecord>();
const slashedAccounts = new Set<string>();
const queueEntries = new Map<string, QueueStateRecord>();

// Sync health
let _inSync = false;
let _headBlock = 0;
let _irreversibleBlock = 0;
let _syncTargetBlock = 0;

// Marketplace state (v1.2)
export type ListingRecord = MarketListing;
export type OfferRecord = MarketOffer;

const marketListings = new Map<string, ListingRecord>();
const marketOffers = new Map<string, OfferRecord>();

const MAX_MATCHES = 10000;
const STATE_FILE_ENV = 'RAGNAROK_CHAIN_STATE_FILE';
const INDEX_START_BLOCK_ENV = 'RAGNAROK_INDEX_START_BLOCK';
const STATE_FILE_MODE = 0o600;
const STATE_DIR_MODE = 0o700;
const SAVE_INTERVAL_MS = 30_000;
const QUEUE_STATE_EXPIRY_MS = 10 * 60 * 1000;

let _saveTimer: ReturnType<typeof setInterval> | null = null;
let _dirty = false;

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export function getStateFilePath(): string {
	const configuredPath = process.env[STATE_FILE_ENV]?.trim();
	if (!configuredPath) {
		return getDefaultStateFilePath();
	}
	if (configuredPath.includes('\0')) {
		console.warn('[chainState] Invalid state file path, ignoring null-byte configuration');
		return getDefaultStateFilePath();
	}
	return path.resolve(process.cwd(), configuredPath);
}

function getDefaultStateFilePath(): string {
	const runtime = getRagnarokServerRuntimeConfig();
	const phase = getRagnarokRuntimePhase(runtime);
	const filenameByPhase: Record<ReturnType<typeof getRagnarokRuntimePhase>, string> = {
		local: 'chain-state.local.json',
		'qa-season-0': 'chain-state.qa-season-0.json',
		'alfa-testnet': 'chain-state.alfa-testnet.json',
		'closed-beta': 'chain-state.closed-beta.json',
		'generic-testnet': 'chain-state.testnet.json',
		mainnet: 'chain-state.mainnet.json',
	};
	return path.join(process.cwd(), 'data', filenameByPhase[phase]);
}

function ensureDataDir(): void {
	const dir = path.dirname(getStateFilePath());
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true, mode: STATE_DIR_MODE });
	}
}

function assertStateFileWritable(): void {
	ensureDataDir();
	const stateFile = getStateFilePath();
	const dir = path.dirname(stateFile);
	fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);

	if (fs.existsSync(stateFile)) {
		fs.accessSync(stateFile, fs.constants.R_OK | fs.constants.W_OK);
	}

	const probeFile = path.join(dir, `.chain-state-write-check-${process.pid}-${Date.now()}.tmp`);
	const fd = fs.openSync(probeFile, 'w', STATE_FILE_MODE);
	fs.closeSync(fd);
	fs.unlinkSync(probeFile);
}

function getConfiguredInitialBlockCursor(): number {
	const startBlock = getConfiguredIndexStartBlock();

	if (startBlock < 1) return 0;
	return startBlock - 1;
}

function getConfiguredIndexStartBlock(): number {
	const raw = process.env[INDEX_START_BLOCK_ENV];
	const startBlock = raw
		? Number(raw)
		: getRagnarokServerRuntimeConfig().indexStartBlock;

	if (!Number.isInteger(startBlock) || startBlock < 1) {
		console.warn(`[chainState] Ignoring invalid ${INDEX_START_BLOCK_ENV}=${String(raw ?? startBlock)}`);
		return 1;
	}

	return startBlock;
}

function getStateFileDisplayPath(stateFile = getStateFilePath()): string {
	const relative = path.relative(process.cwd(), stateFile);
	if (!relative || relative.startsWith('..')) return stateFile;
	return relative;
}

function getCurrentBlocksBehind(): number {
	return Math.max(0, _syncTargetBlock - lastIrreversibleBlockProcessed);
}

export function loadState(): void {
	try {
		const initialBlockCursor = getConfiguredInitialBlockCursor();
		const stateFile = getStateFilePath();
		if (!fs.existsSync(stateFile)) {
			lastIrreversibleBlockProcessed = initialBlockCursor;
			_syncTargetBlock = initialBlockCursor;
			console.log(`[chainState] Initialized: file=${getStateFileDisplayPath(stateFile)}, blockCursor=${lastIrreversibleBlockProcessed}, indexStartBlock=${getConfiguredIndexStartBlock()}`);
			return;
		}
		const raw = fs.readFileSync(stateFile, 'utf8');
		const data = parseChainStatePayload(raw, initialBlockCursor);

		players.clear();
		for (const [k, v] of data.players ?? []) players.set(k, v);

		cards.clear();
		for (const [k, v] of data.cards ?? []) cards.set(k, v);

		matches.length = 0;
		matches.push(...(data.matches ?? []));

		knownAccounts.clear();
		for (const a of data.knownAccounts ?? []) knownAccounts.add(a);

		syncCursors.clear();
		for (const [k, v] of data.syncCursors ?? []) syncCursors.set(k, v);

		playerNonces.clear();
		for (const [k, v] of data.playerNonces ?? []) playerNonces.set(k, v);

		lastSyncedAt = data.lastSyncedAt ?? 0;

		// PR 2B: protocol-core state
		lastIrreversibleBlockProcessed = Math.max(
			data.lastIrreversibleBlockProcessed ?? initialBlockCursor,
			initialBlockCursor,
		);
		genesisState = data.genesis ?? null;

		supplyCounters.clear();
		for (const [k, v] of data.supplyCounters ?? []) supplyCounters.set(k, v);

		tokenBalances.clear();
		for (const [k, v] of data.tokenBalances ?? []) tokenBalances.set(k, v);

		matchAnchors.clear();
		for (const [k, v] of data.matchAnchors ?? []) matchAnchors.set(k, v);

		packCommits.clear();
		for (const [k, v] of data.packCommits ?? []) packCommits.set(k, v);

		rewardClaims.clear();
		for (const c of data.rewardClaims ?? []) rewardClaims.add(c);

		duatClaims.clear();
		for (const [k, v] of data.duatClaims ?? []) duatClaims.set(k, v);

		campaignNonces.clear();
		for (const [k, v] of data.campaignNonces ?? []) campaignNonces.set(k, v);

		campaignSubmissions.clear();
		for (const [k, v] of data.campaignSubmissions ?? []) campaignSubmissions.set(k, v);

		campaignProgress.clear();
		for (const [k, v] of data.campaignProgress ?? []) campaignProgress.set(k, v);

		runeLedger.clear();
		for (const [k, v] of data.runeLedger ?? []) runeLedger.set(k, v);
		eitrLedger.clear();
		for (const [k, v] of data.eitrLedger ?? []) eitrLedger.set(k, v);
		forgeCommits.clear();
		for (const [k, v] of data.forgeCommits ?? []) forgeCommits.set(k, v);

		packs.clear();
		for (const [k, v] of data.packs ?? []) packs.set(k, v);

		packSupply.clear();
		for (const [k, v] of data.packSupply ?? []) packSupply.set(k, v);

		slashedAccounts.clear();
		for (const a of data.slashedAccounts ?? []) slashedAccounts.add(a);

		marketListings.clear();
		for (const [k, v] of data.marketListings ?? []) marketListings.set(k, v);

		marketOffers.clear();
		for (const [k, v] of data.marketOffers ?? []) marketOffers.set(k, v);

		_inSync = data.inSync ?? false;
		_headBlock = data.headBlock ?? 0;
		_irreversibleBlock = data.irreversibleBlock ?? 0;
		_syncTargetBlock = data.syncTargetBlock ?? data.irreversibleBlock ?? data.lastIrreversibleBlockProcessed;

		console.log(`[chainState] Loaded: file=${getStateFileDisplayPath(stateFile)}, ${players.size} players, ${cards.size} cards, ${matches.length} matches, blockCursor=${lastIrreversibleBlockProcessed}, target=${_syncTargetBlock}, blocksBehind=${getCurrentBlocksBehind()}, inSync=${_inSync}`);
	} catch (err) {
		console.warn('[chainState] Failed to load state:', err);
	}
}

export function saveState(): void {
	if (!_dirty) return;
	try {
		ensureDataDir();
		const data = exportState();
		const stateFile = getStateFilePath();
		const tmpFile = `${stateFile}.tmp`;
		fs.writeFileSync(tmpFile, JSON.stringify(data), { encoding: 'utf8', mode: STATE_FILE_MODE });
		fs.renameSync(tmpFile, stateFile);
		_dirty = false;
	} catch (err) {
		console.warn('[chainState] Failed to save state:', err);
	}
}

export function exportState(): SerializedState {
	return {
		players: [...players.entries()],
		cards: [...cards.entries()],
		matches,
		knownAccounts: [...knownAccounts],
		syncCursors: [...syncCursors.entries()],
		lastSyncedAt,
		playerNonces: [...playerNonces.entries()],
		// PR 2B: protocol-core state
		lastIrreversibleBlockProcessed,
		genesis: genesisState,
		supplyCounters: [...supplyCounters.entries()],
		tokenBalances: [...tokenBalances.entries()],
		matchAnchors: [...matchAnchors.entries()],
		packCommits: [...packCommits.entries()],
		rewardClaims: [...rewardClaims],
		duatClaims: [...duatClaims.entries()],
		campaignNonces: [...campaignNonces.entries()],
		campaignSubmissions: [...campaignSubmissions.entries()],
		campaignProgress: [...campaignProgress.entries()],
		runeLedger: [...runeLedger.entries()],
		eitrLedger: [...eitrLedger.entries()],
		forgeCommits: [...forgeCommits.entries()],
		packs: [...packs.entries()],
		packSupply: [...packSupply.entries()],
		slashedAccounts: [...slashedAccounts],
		marketListings: [...marketListings.entries()],
		marketOffers: [...marketOffers.entries()],
		inSync: _inSync,
		headBlock: _headBlock,
		irreversibleBlock: _irreversibleBlock,
		syncTargetBlock: _syncTargetBlock,
	};
}

export function importState(data: SerializedState): void {
	const normalized = normalizeChainStatePayload(data, lastIrreversibleBlockProcessed, false);

	players.clear();
	for (const [k, v] of normalized.players ?? []) players.set(k, v);

	cards.clear();
	for (const [k, v] of normalized.cards ?? []) cards.set(k, v);

	matches.length = 0;
	matches.push(...(normalized.matches ?? []));

	knownAccounts.clear();
	for (const a of normalized.knownAccounts ?? []) knownAccounts.add(a);

	syncCursors.clear();
	for (const [k, v] of normalized.syncCursors ?? []) syncCursors.set(k, v);

	playerNonces.clear();
	for (const [k, v] of normalized.playerNonces ?? []) playerNonces.set(k, v);

	lastSyncedAt = normalized.lastSyncedAt ?? 0;

	lastIrreversibleBlockProcessed = normalized.lastIrreversibleBlockProcessed;
	genesisState = normalized.genesis ?? null;

	supplyCounters.clear();
	for (const [k, v] of normalized.supplyCounters ?? []) supplyCounters.set(k, v);

	tokenBalances.clear();
	for (const [k, v] of normalized.tokenBalances ?? []) tokenBalances.set(k, v);

	matchAnchors.clear();
	for (const [k, v] of normalized.matchAnchors ?? []) matchAnchors.set(k, v);

	packCommits.clear();
	for (const [k, v] of normalized.packCommits ?? []) packCommits.set(k, v);

	rewardClaims.clear();
	for (const c of normalized.rewardClaims ?? []) rewardClaims.add(c);

	duatClaims.clear();
	for (const [k, v] of normalized.duatClaims ?? []) duatClaims.set(k, v);

	campaignNonces.clear();
	for (const [k, v] of normalized.campaignNonces ?? []) campaignNonces.set(k, v);

	campaignSubmissions.clear();
	for (const [k, v] of normalized.campaignSubmissions ?? []) campaignSubmissions.set(k, v);

	campaignProgress.clear();
	for (const [k, v] of normalized.campaignProgress ?? []) campaignProgress.set(k, v);

	runeLedger.clear();
	for (const [k, v] of normalized.runeLedger ?? []) runeLedger.set(k, v);
	eitrLedger.clear();
	for (const [k, v] of normalized.eitrLedger ?? []) eitrLedger.set(k, v);
	forgeCommits.clear();
	for (const [k, v] of normalized.forgeCommits ?? []) forgeCommits.set(k, v);

	packs.clear();
	for (const [k, v] of normalized.packs ?? []) packs.set(k, v);

	packSupply.clear();
	for (const [k, v] of normalized.packSupply ?? []) packSupply.set(k, v);

	slashedAccounts.clear();
	for (const a of normalized.slashedAccounts ?? []) slashedAccounts.add(a);

	marketListings.clear();
	for (const [k, v] of normalized.marketListings ?? []) marketListings.set(k, v);

	marketOffers.clear();
	for (const [k, v] of normalized.marketOffers ?? []) marketOffers.set(k, v);

	_inSync = normalized.inSync ?? false;
	_headBlock = normalized.headBlock ?? 0;
	_irreversibleBlock = normalized.irreversibleBlock ?? 0;
	_syncTargetBlock = normalized.syncTargetBlock ?? normalized.irreversibleBlock ?? normalized.lastIrreversibleBlockProcessed;

	_dirty = false;
	console.log(`[chainState] Imported: ${players.size} players, ${cards.size} cards, blockCursor=${lastIrreversibleBlockProcessed}, target=${_syncTargetBlock}, blocksBehind=${getCurrentBlocksBehind()}, inSync=${_inSync}`);
}

function markDirty(): void {
	_dirty = true;
}

export function startPersistence(): void {
	if (_saveTimer) return;
	assertStateFileWritable();
	_saveTimer = setInterval(saveState, SAVE_INTERVAL_MS);
}

export function stopPersistence(): void {
	if (_saveTimer) {
		clearInterval(_saveTimer);
		_saveTimer = null;
	}
	saveState();
}

// ---------------------------------------------------------------------------
// ELO calculation (same formula as client matchResultPackager.ts)
// ---------------------------------------------------------------------------

const ELO_K = 32;

function computeEloDelta(playerElo: number, opponentElo: number, isWinner: boolean): number {
	const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
	const actual = isWinner ? 1 : 0;
	return Math.round(ELO_K * (actual - expected));
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export function getPlayer(username: string): PlayerRecord | undefined {
	return players.get(username);
}

export function getOrCreatePlayer(username: string): PlayerRecord {
	let p = players.get(username);
	if (!p) {
		p = { username, elo: DEFAULT_ELO_RATING, wins: 0, losses: 0, lastMatchAt: 0 };
		players.set(username, p);
		markDirty();
	}
	return p;
}

export function getLeaderboard(limit: number, offset: number): { players: PlayerRecord[]; total: number } {
	const sorted = [...players.values()]
		.filter(p => p.wins + p.losses > 0)
		.sort((a, b) => b.elo - a.elo);
	return {
		players: sorted.slice(offset, offset + limit),
		total: sorted.length,
	};
}

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

export function recordMatch(
	matchId: string,
	winner: string,
	loser: string,
	cardFingerprint: string,
	timestamp: number,
	blockNum: number,
): void {
	if (matches.some(m => m.matchId === matchId)) return;

	const wp = getOrCreatePlayer(winner);
	const lp = getOrCreatePlayer(loser);

	const winnerDelta = computeEloDelta(wp.elo, lp.elo, true);
	const loserDelta = computeEloDelta(lp.elo, wp.elo, false);

	const record: MatchRecord = {
		matchId,
		winner,
		loser,
		winnerEloBefore: wp.elo,
		winnerEloAfter: Math.max(0, wp.elo + winnerDelta),
		loserEloBefore: lp.elo,
		loserEloAfter: Math.max(0, lp.elo + loserDelta),
		cardFingerprint,
		timestamp,
		blockNum,
	};

	wp.elo = record.winnerEloAfter;
	wp.wins += 1;
	wp.lastMatchAt = timestamp;

	lp.elo = record.loserEloAfter;
	lp.losses += 1;
	lp.lastMatchAt = timestamp;

	matches.push(record);
	if (matches.length > MAX_MATCHES) {
		matches.splice(0, matches.length - MAX_MATCHES);
	}

	markDirty();
}

export function getMatchHistory(username: string, limit: number): MatchRecord[] {
	return matches
		.filter(m => m.winner === username || m.loser === username)
		.sort((a, b) => b.timestamp - a.timestamp)
		.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export function getCard(uid: string): CardRecord | undefined {
	return cards.get(uid);
}

export function putCard(card: CardRecord): void {
	cards.set(card.uid, card);
	markDirty();
}

export function deleteCard(uid: string): void {
	cards.delete(uid);
	markDirty();
}

export function getCardsByOwner(owner: string): CardRecord[] {
	const result: CardRecord[] = [];
	for (const card of cards.values()) {
		if (card.owner === owner) result.push(card);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Nonces (anti-replay for match_result)
// ---------------------------------------------------------------------------

export function advanceNonce(account: string, nonce: number): boolean {
	const current = playerNonces.get(account) ?? 0;
	if (nonce <= current) return false;
	playerNonces.set(account, nonce);
	markDirty();
	return true;
}

// ---------------------------------------------------------------------------
// Known accounts
// ---------------------------------------------------------------------------

export function registerAccount(username: string): boolean {
	if (knownAccounts.has(username)) return false;
	knownAccounts.add(username);
	markDirty();
	return true;
}

export function getKnownAccounts(): string[] {
	return [...knownAccounts];
}

export function getKnownAccountCount(): number {
	return knownAccounts.size;
}

export function isAccountKnown(username: string): boolean {
	return knownAccounts.has(username);
}

// ---------------------------------------------------------------------------
// Sync cursors
// ---------------------------------------------------------------------------

export function getSyncCursor(account: string): number {
	return syncCursors.get(account) ?? -1;
}

export function setSyncCursor(account: string, index: number): void {
	syncCursors.set(account, index);
	lastSyncedAt = Date.now();
	markDirty();
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function getStats(): {
	totalPlayers: number;
	totalCards: number;
	totalMatches: number;
	knownAccounts: number;
	lastSyncedAt: number;
	lastIrreversibleBlockProcessed: number;
	indexStartBlock: number;
	inSync: boolean;
	headBlock: number;
	irreversibleBlock: number;
	syncTargetBlock: number;
	blocksBehind: number;
	stateFile: string;
	stateFileConfigured: boolean;
	progressBlocks: number;
	progressTargetBlocks: number;
	progressPercent: number;
} {
	const indexStartBlock = getConfiguredIndexStartBlock();
	const blocksBehind = getCurrentBlocksBehind();
	const progressTargetBlocks = Math.max(0, _syncTargetBlock - indexStartBlock + 1);
	const progressBlocks = progressTargetBlocks === 0
		? 0
		: Math.min(progressTargetBlocks, Math.max(0, lastIrreversibleBlockProcessed - indexStartBlock + 1));
	const progressPercent = progressTargetBlocks === 0
		? 0
		: Number(((progressBlocks / progressTargetBlocks) * 100).toFixed(2));
	return {
		totalPlayers: players.size,
		totalCards: cards.size,
		totalMatches: matches.length,
		knownAccounts: knownAccounts.size,
		lastSyncedAt,
		lastIrreversibleBlockProcessed,
		indexStartBlock,
		inSync: _inSync,
		headBlock: _headBlock,
		irreversibleBlock: _irreversibleBlock,
		syncTargetBlock: _syncTargetBlock,
		blocksBehind,
		stateFile: getStateFilePath(),
		stateFileConfigured: Boolean(process.env[STATE_FILE_ENV]?.trim()),
		progressBlocks,
		progressTargetBlocks,
		progressPercent,
	};
}

export function setSyncStatus(
	lastBlock: number,
	irreversibleBlock: number,
	headBlock: number,
	inSync: boolean,
	syncTargetBlock = irreversibleBlock,
): void {
	lastIrreversibleBlockProcessed = lastBlock;
	_irreversibleBlock = irreversibleBlock;
	_headBlock = headBlock;
	_inSync = inSync;
	_syncTargetBlock = syncTargetBlock;
	markDirty();
}

// ---------------------------------------------------------------------------
// PR 2B: Global block cursor
// ---------------------------------------------------------------------------

export function getBlockCursor(): number {
	return lastIrreversibleBlockProcessed;
}

export function setBlockCursor(blockNum: number): void {
	lastIrreversibleBlockProcessed = blockNum;
	markDirty();
}

// ---------------------------------------------------------------------------
// PR 2B: Protocol-core state accessors
// ---------------------------------------------------------------------------

export function getGenesisState(): GenesisStateRecord | null { return genesisState; }
export function setGenesisState(g: GenesisStateRecord | null): void { genesisState = g; markDirty(); }

export function getSupplyCounter(key: string): SupplyCounterRecord | undefined { return supplyCounters.get(key); }
export function setSupplyCounter(key: string, r: SupplyCounterRecord): void { supplyCounters.set(key, r); markDirty(); }

export function getTokenBalance(account: string): TokenBalanceRecord | undefined { return tokenBalances.get(account); }
export function setTokenBalance(account: string, b: TokenBalanceRecord): void { tokenBalances.set(account, b); markDirty(); }
export function getRuneBalanceTotal(): number {
	let total = 0;
	for (const balance of tokenBalances.values()) {
		total += balance.RUNE;
	}
	return total;
}

export function getRuneLedgerEntry(entryId: string): RuneLedgerEntry | undefined {
	return runeLedger.get(entryId);
}

export function setRuneLedgerEntry(entry: RuneLedgerEntry): void {
	runeLedger.set(entry.entryId, entry);
	markDirty();
}

export function getRuneLedgerEntries(query: RuneLedgerEntryQuery): RuneLedgerEntry[] {
	const entries: RuneLedgerEntry[] = [];
	for (const entry of runeLedger.values()) {
		if (!matchesRuneLedgerQuery(entry, query)) continue;
		entries.push(entry);
	}
	return entries;
}

export function getRuneLedgerTotal(query: RuneLedgerTotalQuery): number {
	let total = 0;
	for (const entry of runeLedger.values()) {
		if (!matchesRuneLedgerQuery(entry, query)) continue;
		total += entry.amount;
	}
	return total;
}

function matchesRuneLedgerQuery(entry: RuneLedgerEntry, query: RuneLedgerEntryQuery | RuneLedgerTotalQuery): boolean {
	if (entry.seasonId !== query.seasonId) return false;
	if (query.direction !== undefined && entry.direction !== query.direction) return false;
	if (query.sourceType !== undefined && entry.sourceType !== query.sourceType) return false;
	if (query.account !== undefined && entry.account !== query.account) return false;
	if (query.sourceKeyPrefix !== undefined && !entry.sourceKey.startsWith(query.sourceKeyPrefix)) return false;
	return true;
}

// ---------------------------------------------------------------------------
// Eitr ledger (canonical per docs/adr/0001-eitr-v1-canonical.md)
// ---------------------------------------------------------------------------

export function getEitrLedgerEntry(entryId: string): EitrLedgerEntry | undefined {
	return eitrLedger.get(entryId);
}

export function setEitrLedgerEntry(entry: EitrLedgerEntry): void {
	eitrLedger.set(entry.entryId, entry);
	markDirty();
}

export function getEitrLedgerEntries(query: EitrLedgerEntryQuery): EitrLedgerEntry[] {
	const entries: EitrLedgerEntry[] = [];
	for (const entry of eitrLedger.values()) {
		if (!matchesEitrLedgerQuery(entry, query)) continue;
		entries.push(entry);
	}
	return entries;
}

export function getEitrLedgerTotal(query: EitrLedgerTotalQuery): number {
	let total = 0;
	for (const entry of eitrLedger.values()) {
		if (!matchesEitrLedgerQuery(entry, query)) continue;
		total += entry.amount;
	}
	return total;
}

function matchesEitrLedgerQuery(entry: EitrLedgerEntry, query: EitrLedgerEntryQuery | EitrLedgerTotalQuery): boolean {
	if (entry.seasonId !== query.seasonId) return false;
	if (query.direction !== undefined && entry.direction !== query.direction) return false;
	if (query.sourceType !== undefined && entry.sourceType !== query.sourceType) return false;
	if (query.account !== undefined && entry.account !== query.account) return false;
	if (query.sourceKeyPrefix !== undefined && !entry.sourceKey.startsWith(query.sourceKeyPrefix)) return false;
	return true;
}

export function getEitrSeasonStats(seasonId: string): EitrSeasonStats {
	const stats: EitrSeasonStats = {
		ledgerCreditTotal: 0,
		ledgerDebitTotal: 0,
		burnCreditTotal: 0,
		forgeCommitDebitTotal: 0,
		forgeRefundCreditTotal: 0,
	};

	for (const entry of eitrLedger.values()) {
		if (entry.seasonId !== seasonId) continue;

		if (entry.direction === 'credit') {
			stats.ledgerCreditTotal += entry.amount;
			if (entry.sourceType === 'burn') stats.burnCreditTotal += entry.amount;
			if (entry.sourceType === 'forge_refund') stats.forgeRefundCreditTotal += entry.amount;
			continue;
		}

		stats.ledgerDebitTotal += entry.amount;
		if (entry.sourceType === 'forge_commit') stats.forgeCommitDebitTotal += entry.amount;
	}

	return stats;
}

export function getEitrAccountSummary(account: string, seasonId: string): EitrAccountSummary {
	return getEitrAccountSummaries([account], seasonId)[0];
}

export function getEitrAccountSummaries(accounts: readonly string[], seasonId: string): EitrAccountSummary[] {
	const tallies = new Map<string, { credits: number; debits: number; lastBlock: number }>();
	for (const account of accounts) {
		tallies.set(account, { credits: 0, debits: 0, lastBlock: 0 });
	}

	if (tallies.size > 0) {
		for (const entry of eitrLedger.values()) {
			if (entry.seasonId !== seasonId) continue;
			const tally = tallies.get(entry.account);
			if (!tally) continue;

			if (entry.direction === 'credit') {
				tally.credits += entry.amount;
			} else {
				tally.debits += entry.amount;
			}
			tally.lastBlock = Math.max(tally.lastBlock, entry.blockNum);
		}
	}

	return accounts.map(account => {
		const tally = tallies.get(account) ?? { credits: 0, debits: 0, lastBlock: 0 };
		return {
			account,
			eitrBalance: tally.credits - tally.debits,
			credits: tally.credits,
			debits: tally.debits,
			lastBlock: tally.lastBlock,
			indexed: isAccountKnown(account),
		};
	});
}

// ---------------------------------------------------------------------------
// Forge commits (ADR 0001 §3 commit-reveal forge)
// ---------------------------------------------------------------------------

export function getForgeCommit(trxId: string): ForgeCommitRecord | undefined {
	return forgeCommits.get(trxId);
}

export function setForgeCommit(commit: ForgeCommitRecord): void {
	forgeCommits.set(commit.trxId, commit);
	markDirty();
}

export function getUnrevealedForgeCommitsBefore(deadlineBlock: number): ForgeCommitRecord[] {
	const out: ForgeCommitRecord[] = [];
	for (const commit of forgeCommits.values()) {
		if (!commit.revealed && commit.commitBlock <= deadlineBlock) out.push(commit);
	}
	return out;
}

export function getRuneSeasonStats(seasonId: string): RuneSeasonStats {
	const stats: RuneSeasonStats = {
		ledgerCreditTotal: 0,
		ledgerDebitTotal: 0,
		p2pCreditTotal: 0,
		campaignCreditTotal: 0,
		rewardClaimCreditTotal: 0,
		dailyQuestCreditTotal: 0,
		runeExchangeDebitTotal: 0,
	};

	for (const entry of runeLedger.values()) {
		if (entry.seasonId !== seasonId) continue;

		if (entry.direction === 'credit') {
			stats.ledgerCreditTotal += entry.amount;
			if (entry.sourceType === 'p2p_ranked') stats.p2pCreditTotal += entry.amount;
			if (entry.sourceType === 'campaign_first_clear') stats.campaignCreditTotal += entry.amount;
			if (entry.sourceType === 'reward_claim') stats.rewardClaimCreditTotal += entry.amount;
			if (entry.sourceType === 'daily_quest_claim') stats.dailyQuestCreditTotal += entry.amount;
			continue;
		}

		stats.ledgerDebitTotal += entry.amount;
		if (entry.sourceType === 'rune_exchange') stats.runeExchangeDebitTotal += entry.amount;
	}

	return stats;
}

export function getLastRuneBlock(account: string, seasonId: string): number {
	const entries = getRuneLedgerEntries({ seasonId, account });
	return entries.reduce((lastBlock, entry) => Math.max(lastBlock, entry.blockNum), 0);
}

export function getRuneAccountSummary(account: string, seasonId: string): RuneAccountSummary {
	return getRuneAccountSummaries([account], seasonId)[0];
}

export function getRuneAccountSummaries(accounts: readonly string[], seasonId: string): RuneAccountSummary[] {
	const tallies = new Map<string, { credits: number; debits: number; lastBlock: number }>();
	for (const account of accounts) {
		tallies.set(account, { credits: 0, debits: 0, lastBlock: 0 });
	}

	if (tallies.size > 0) {
		for (const entry of runeLedger.values()) {
			if (entry.seasonId !== seasonId) continue;
			const tally = tallies.get(entry.account);
			if (!tally) continue;

			if (entry.direction === 'credit') {
				tally.credits += entry.amount;
			} else {
				tally.debits += entry.amount;
			}
			tally.lastBlock = Math.max(tally.lastBlock, entry.blockNum);
		}
	}

	return accounts.map(account => {
		const tally = tallies.get(account) ?? { credits: 0, debits: 0, lastBlock: 0 };
		const runeBalance = getTokenBalance(account)?.RUNE ?? 0;
		const projectedBalance = tally.credits - tally.debits;

		return {
			account,
			runeBalance,
			credits: tally.credits,
			debits: tally.debits,
			drift: runeBalance - projectedBalance,
			lastBlock: tally.lastBlock,
			indexed: isAccountKnown(account),
		};
	});
}

export function getPackAsset(uid: string): PackAsset | undefined {
	return packs.get(uid);
}

export function setPackAsset(pack: PackAsset): void {
	packs.set(pack.uid, pack);
	markDirty();
}

export function deletePackAsset(uid: string): void {
	packs.delete(uid);
	markDirty();
}

export function getPackAssetsByOwner(owner: string): PackAsset[] {
	const result: PackAsset[] = [];
	for (const pack of packs.values()) {
		if (pack.owner === owner) result.push(pack);
	}
	return result;
}

export function getPackSupplyRecord(packType: string): PackSupplyRecord | undefined {
	return packSupply.get(packType);
}

export function setPackSupplyRecord(record: PackSupplyRecord): void {
	packSupply.set(record.packType, record);
	markDirty();
}

export function getMatchAnchor(matchId: string): MatchAnchorStateRecord | undefined { return matchAnchors.get(matchId); }
export function setMatchAnchor(matchId: string, a: MatchAnchorStateRecord): void { matchAnchors.set(matchId, a); markDirty(); }

export function getPackCommit(trxId: string): PackCommitStateRecord | undefined { return packCommits.get(trxId); }
export function setPackCommit(trxId: string, c: PackCommitStateRecord): void { packCommits.set(trxId, c); markDirty(); }
export function getUnrevealedCommitsBefore(deadlineBlock: number): PackCommitStateRecord[] {
	return [...packCommits.values()].filter(c => !c.revealed && c.commitBlock + 200 <= deadlineBlock);
}

export function hasRewardClaim(key: string): boolean { return rewardClaims.has(key); }
export function addRewardClaim(key: string): void { rewardClaims.add(key); markDirty(); }
export function getDuatClaim(account: string): DuatClaimRecord | undefined { return duatClaims.get(account); }
export function setDuatClaim(claim: DuatClaimRecord): void { duatClaims.set(claim.account, claim); markDirty(); }

export function advanceCampaignNonce(account: string, nonce: number): boolean {
	const current = campaignNonces.get(account) ?? 0;
	if (nonce <= current) return false;
	campaignNonces.set(account, nonce);
	markDirty();
	return true;
}

export function getCampaignSubmission(submissionKey: string): CampaignSubmissionRecord | undefined {
	return campaignSubmissions.get(submissionKey);
}

export function setCampaignSubmission(submission: CampaignSubmissionRecord): void {
	campaignSubmissions.set(submission.submissionKey, submission);
	markDirty();
}

export function getCampaignProgress(
	account: string,
	campaignId: string,
	missionId: string,
): CampaignProgressRecord | undefined {
	return campaignProgress.get(`${account}:${campaignId}:${missionId}`);
}

export function setCampaignProgress(progress: CampaignProgressRecord): void {
	campaignProgress.set(`${progress.account}:${progress.campaignId}:${progress.missionId}`, progress);
	markDirty();
}

export function isSlashed(account: string): boolean { return slashedAccounts.has(account); }
export function addSlashed(account: string): void { slashedAccounts.add(account); markDirty(); }

function isFreshQueueEntry(entry: QueueStateRecord, now = Date.now()): boolean {
	return now - entry.timestamp <= QUEUE_STATE_EXPIRY_MS;
}

function pruneExpiredQueueEntries(now = Date.now()): void {
	let pruned = false;
	for (const [account, entry] of queueEntries) {
		if (isFreshQueueEntry(entry, now)) continue;
		queueEntries.delete(account);
		pruned = true;
	}
	if (pruned) markDirty();
}

export function getQueueEntry(account: string): QueueStateRecord | undefined {
	const entry = queueEntries.get(account);
	if (!entry) return undefined;
	if (isFreshQueueEntry(entry)) return entry;

	queueEntries.delete(account);
	markDirty();
	return undefined;
}

export function setQueueEntry(account: string, data: QueueStateRecord): void {
	pruneExpiredQueueEntries();
	if (!isFreshQueueEntry(data)) {
		queueEntries.delete(account);
		markDirty();
		return;
	}
	queueEntries.set(account, data);
	markDirty();
}
export function deleteQueueEntryFn(account: string): void { queueEntries.delete(account); markDirty(); }

// ---------------------------------------------------------------------------
// Marketplace (v1.2)
// ---------------------------------------------------------------------------

export function getMarketListing(listingId: string): ListingRecord | undefined { return marketListings.get(listingId); }
export function putMarketListing(listing: ListingRecord): void { marketListings.set(listing.listingId, listing); markDirty(); }
export function deleteMarketListing(listingId: string): void { marketListings.delete(listingId); markDirty(); }

export function getActiveListings(
	sort: 'price_asc' | 'price_desc' | 'recent' = 'recent',
	currency?: 'HIVE' | 'HBD',
	limit = 50,
	offset = 0,
): { listings: ListingRecord[]; total: number } {
	let active = [...marketListings.values()].filter(l => l.active);
	if (currency) active = active.filter(l => l.currency === currency);
	if (sort === 'price_asc') active.sort((a, b) => a.price - b.price);
	else if (sort === 'price_desc') active.sort((a, b) => b.price - a.price);
	else active.sort((a, b) => b.listedBlock - a.listedBlock);
	return { listings: active.slice(offset, offset + limit), total: active.length };
}

export function getListingsByNft(nftUid: string): ListingRecord[] {
	return [...marketListings.values()].filter(l => l.nftUid === nftUid && l.active);
}

export function getMarketOffer(offerId: string): OfferRecord | undefined { return marketOffers.get(offerId); }
export function putMarketOffer(offer: OfferRecord): void { marketOffers.set(offer.offerId, offer); markDirty(); }
export function deleteMarketOffer(offerId: string): void { marketOffers.delete(offerId); markDirty(); }

export function getOffersByNft(nftUid: string): OfferRecord[] {
	return [...marketOffers.values()].filter(o => o.nftUid === nftUid && o.status === 'pending');
}

export function getOffersByBuyer(buyer: string): OfferRecord[] {
	return [...marketOffers.values()].filter(o => o.buyer === buyer);
}

export function getListingsBySeller(seller: string): ListingRecord[] {
	return [...marketListings.values()].filter(l => l.seller === seller && l.active);
}

// ---------------------------------------------------------------------------
// Explorer-specific aggregated queries
// ---------------------------------------------------------------------------

export function getExplorerStats(): {
	totalPlayers: number;
	totalNfts: number;
	totalMatches: number;
	totalListings: number;
	totalOffers: number;
	uniqueOwners: number;
	lastBlock: number;
} {
	const owners = new Set<string>();
	for (const card of cards.values()) owners.add(card.owner);
	return {
		totalPlayers: players.size,
		totalNfts: cards.size,
		totalMatches: matches.length,
		totalListings: [...marketListings.values()].filter(l => l.active).length,
		totalOffers: [...marketOffers.values()].filter(o => o.status === 'pending').length,
		uniqueOwners: owners.size,
		lastBlock: lastIrreversibleBlockProcessed,
	};
}

export function getNftsByRarity(rarity: string, limit: number, offset: number): { nfts: CardRecord[]; total: number } {
	const filtered = rarity
		? [...cards.values()].filter(c => c.rarity === rarity)
		: [...cards.values()];
	return { nfts: filtered.slice(offset, offset + limit), total: filtered.length };
}

export function getNftByUid(uid: string): CardRecord | undefined {
	return cards.get(uid);
}

export function getUserNftCounts(username: string): { total: number; byRarity: Record<string, number> } {
	const userCards = getCardsByOwner(username);
	const byRarity: Record<string, number> = {};
	for (const c of userCards) {
		byRarity[c.rarity] = (byRarity[c.rarity] ?? 0) + 1;
	}
	return { total: userCards.length, byRarity };
}

export function getAllSupplyCounters(): SupplyCounterRecord[] {
	return [...supplyCounters.values()];
}

export function getAllTokenBalances(limit: number, offset: number): { balances: TokenBalanceRecord[]; total: number } {
	const all = [...tokenBalances.values()].sort((a, b) => b.RUNE - a.RUNE);
	return { balances: all.slice(offset, offset + limit), total: all.length };
}

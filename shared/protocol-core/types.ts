/**
 * Ragnarok Protocol Core — Type Definitions
 *
 * These types define the pure protocol layer. No IndexedDB, no HiveEvents,
 * no browser/Node dependencies. Both client and server implement the
 * StateAdapter interface to plug their storage into the shared core.
 *
 * Spec: docs/RAGNAROK_PROTOCOL_V1.md
 * Tests: client/src/data/blockchain/protocolConformance.test.ts
 */

import type { RuneLedgerEntry, RuneLedgerEntryQuery, RuneLedgerTotalQuery } from './runeEconomy';
import type { EitrLedgerEntry, EitrLedgerEntryQuery, EitrLedgerTotalQuery } from './eitrEconomy';
import {
	RAGNAROK_PROTOCOL_IDS,
	RAGNAROK_RUNTIME_CONFIGS,
	type RagnarokRuntimeConfig,
} from '../runtimeConfig';

export {
	RUNE_LOSS_RANKED,
	RUNE_WIN_RANKED,
	TESTNET_RUNE_SEASON_ID,
	TESTNET_RUNE_ECONOMY,
	calculateCappedRuneCredit,
	calculateRuneBalanceTrace,
	calculateRuneScoreBonus,
	calculateSeasonRuneEarned,
	calculateSeasonScore,
	createCampaignFirstClearRuneSourceKey,
	createDailyQuestRuneSourceKey,
	createP2PRankedMatchSourceKey,
	createP2PRankedMatchSourceKeyPrefix,
	createP2PRankedRuneSourceKey,
	createRewardClaimRuneSourceKey,
	createRuneExchangeSourceKey,
	createRuneLedgerEntryId,
	getCampaignFirstClearRuneReward,
	getCampaignStageRuneTotal,
	getP2PMatchCapacity,
	getRuneEmissionCaps,
	type P2PMatchCapacity,
	type P2PRankedRuneRole,
	type RuneEmissionCaps,
	type RuneCreditCapInput,
	type RuneLedgerEntryQuery,
	type RuneLedgerDirection,
	type RuneLedgerEntry,
	type RuneLedgerTotalQuery,
	type RuneExchangeAdapter,
	type RuneExchangeFulfillment,
	type RuneExchangeQuote,
	type RuneExchangeQuoteInput,
	type RuneBalanceTrace,
	type RuneBalanceTraceInput,
	type RuneSourceType,
	type SeasonScoreInput,
} from './runeEconomy';

export {
	EITR_DISSOLVE_VALUES,
	EITR_FORGE_COSTS,
	TESTNET_EITR_SEASON_ID,
	createBurnEitrSourceKey,
	createEitrLedgerEntryId,
	createForgeCommitEitrSourceKey,
	createForgeRefundEitrSourceKey,
	getEitrDissolveValue,
	getEitrForgeCost,
	type EitrLedgerDirection,
	type EitrLedgerEntry,
	type EitrLedgerEntryQuery,
	type EitrLedgerTotalQuery,
	type EitrRarity,
	type EitrSourceType,
} from './eitrEconomy';

// ============================================================
// Protocol Constants
// ============================================================

export const RAGNAROK_ADMIN_ACCOUNT = RAGNAROK_RUNTIME_CONFIGS.mainnet.adminAccount;
export { RAGNAROK_PROTOCOL_IDS };
export type { RagnarokRuntimeConfig };
export const TRANSFER_COOLDOWN_BLOCKS = 10;
export const PACK_REVEAL_DEADLINE_BLOCKS = 200;
export const PACK_ENTROPY_DELAY_BLOCKS = 20;
export const MAX_CARD_LEVEL = 3;
export const ELO_K_FACTOR = 32;
export const ELO_FLOOR = 100;
export const HIVE_USERNAME_RE = /^[a-z][a-z0-9.-]{2,15}$/;

// v1.1: Pack NFT + DNA Lineage constants
export const ATOMIC_TRANSFER_AMOUNT = '0.001 HIVE';
export const MAX_REPLICAS_PER_CARD = 3;
export const MAX_GENERATION = 3;
export const REPLICA_COOLDOWN_BLOCKS = 100;

export {
	PACK_DEFINITIONS,
	PACK_DEFINITION_LIST,
	PACK_KEYS,
	PACK_RUNE_COSTS,
	PACK_SIZES,
	ADMIN_MINTABLE_PACK_KEYS,
	ACTIVE_HBD_PACK_SALE_SCENARIO_KEY,
		HBD_CURRENCY_CODE,
		HBD_PACK_SALE_SCENARIOS,
		HBD_PRICE_LOCALE,
		MAX_HBD_PACK_PURCHASE_QUANTITY,
		HBD_PACK_PURCHASE_MEMO_PREFIX,
		PUBLIC_PACK_KEYS,
	RUNE_REDEEMABLE_PACK_KEYS,
	TESTNET_RUNE_PACK_POOL,
		buildHbdPackPurchaseMemo,
		createHbdPackPurchaseMemoChecksum,
		formatHbdPrice,
		formatHbdThousandths,
		formatHbdTransferAmount,
		getActiveHbdPackSaleScenario,
		getHbdPackPurchaseQuote,
		getPackDefinition,
	getHbdPackSaleScenarioTotals,
	getHbdPackPriceThousandths,
	getPackRuneCost,
		getRuneExchangePackQuote,
		getRunePackPoolAllocations,
		getRunePackPoolTotals,
		isPackKey,
		isRuneRedeemablePackKey,
		normalizePackKey,
		parseHbdPackPurchaseMemo,
	type CanonicalPackDefinition,
		type HbdPackSaleScenario,
		type HbdPackSaleScenarioKey,
		type HbdPackSaleScenarioTotals,
		type HbdPackPurchaseQuote,
		type HbdPackPurchaseQuoteInput,
		type HbdPackPurchaseMemoInput,
		type ParsedHbdPackPurchaseMemo,
	type PackAcquisition,
	type PackCategory,
	type PackKey,
	type AdminMintablePackKey,
	type PublicPackKey,
	type RunePackPoolAllocation,
	type RunePackPoolConfig,
	type RuneRedeemablePackKey,
} from './packCatalog';

// ============================================================
// Canonical Op Actions (v1.0 base + v1.1/v1.2 extensions)
// ============================================================

export const CANONICAL_ACTIONS = [
	'genesis',
	'seal',
	'mint_batch',
	'pack_commit',
	'pack_reveal',
	// Eitr canonical forge per ADR 0001 §3
	'forge_commit',
	'forge_reveal',
	'reward_claim',
	'daily_quest_claim',
	'card_transfer',
	'burn',
	'level_up',
	'queue_join',
	'queue_leave',
	'match_anchor',
	'match_result',
	'campaign_result',
	'rune_exchange',
	'slash_evidence',
	'pack_purchase',
	// v1.1: Pack NFTs
	'pack_mint',
	'pack_distribute',
	'pack_transfer',
	'pack_burn',
	// v1.1: DNA Lineage
	'card_replicate',
	'card_merge',
	// v1.2: Marketplace (NFTLox-inspired)
	'market_list',
	'market_unlist',
	'market_buy',
	'market_offer',
	'market_accept',
	'market_reject',
	// v1.2: DUAT Airdrop
	'duat_airdrop_claim',
	'duat_airdrop_finalize',
] as const;

export type CanonicalAction = typeof CANONICAL_ACTIONS[number];

export const CANONICAL_ACTION_SET: ReadonlySet<string> = new Set(CANONICAL_ACTIONS);

export function isCanonicalAction(value: unknown): value is CanonicalAction {
	return typeof value === 'string' && CANONICAL_ACTION_SET.has(value);
}

// Legacy op that is NOT a canonical alias (valid only pre-seal)
export type LegacyAction = 'legacy_pack_open';

export type ProtocolAction = CanonicalAction | LegacyAction;

// ============================================================
// Authority Requirements
// ============================================================

export const ACTIVE_AUTH_OPS: ReadonlySet<CanonicalAction> = new Set([
	'card_transfer', 'burn', 'seal', 'mint_batch',
	'pack_purchase',
	'pack_mint', 'pack_distribute', 'pack_transfer', 'pack_burn',
	'card_replicate', 'card_merge',
	// Marketplace: buy requires active (bundles HIVE transfer)
	'market_buy', 'market_accept',
	// DUAT: finalize is admin-only active auth
	'duat_airdrop_finalize',
]);

export const POSTING_AUTH_OPS: ReadonlySet<CanonicalAction> = new Set([
	'queue_join', 'queue_leave', 'match_anchor', 'match_result', 'campaign_result',
	'rune_exchange',
	'pack_commit', 'pack_reveal', 'reward_claim', 'daily_quest_claim', 'level_up',
	'forge_commit', 'forge_reveal',
	// Marketplace: listing/offers use posting key
	'market_list', 'market_unlist', 'market_offer', 'market_reject',
	// DUAT: claim uses posting key (user claims own packs)
	'duat_airdrop_claim',
]);

// ============================================================
// Raw Hive Op (input from chain)
// ============================================================

export interface RawHiveOp {
	customJsonId: string;        // e.g. "ragnarok-cards" or "rp_mint"
	json: string;                // raw JSON payload string
	broadcaster: string;         // account that signed the op
	trxId: string;               // transaction id
	blockNum: number;            // block number
	timestamp: number;           // unix ms
	requiredPostingAuths: string[];
	requiredAuths: string[];     // active auth signers
}

// ============================================================
// Normalized Protocol Op (after normalization)
// ============================================================

export interface ProtocolOp {
	action: ProtocolAction;
	payload: Record<string, unknown>;
	broadcaster: string;
	trxId: string;
	blockNum: number;
	timestamp: number;
	usedActiveAuth: boolean;
}

// ============================================================
// Replay Context (per-op environment, not stored state)
// ============================================================

export interface ReplayContext {
	lastIrreversibleBlock: number;
	getBlockId: (blockNum: number) => Promise<string | null>;
}

// ============================================================
// Op Result
// ============================================================

export type OpResult =
	| { status: 'applied' }
	| { status: 'rejected'; reason: string }
	| { status: 'ignored' };  // unknown op, already applied (idempotent), etc.

// ============================================================
// Protocol State — abstract interface
//
// Both client (IndexedDB) and server (in-memory Maps) implement this.
// The protocol core calls these methods; it never touches storage directly.
// ============================================================

export interface CardAsset {
	uid: string;
	cardId: number;
	owner: string;
	rarity: string;
	level: number;
	xp: number;
	edition: string;
	foil?: string;
	mintSource: 'genesis' | 'pack' | 'reward' | 'replica' | 'merge' | 'forge';
	mintTrxId: string;
	mintBlockNum: number;
	lastTransferBlock: number;
	// v1.1: DNA Lineage
	originDna?: string;          // Genotype — same for all copies of this card template
	instanceDna?: string;        // Phenotype — unique to THIS specific copy
	parentInstanceDna?: string;  // If replica, points to parent
	generation?: number;         // 0 = original, 1+ = replica depth
	replicaCount?: number;       // How many replicas minted FROM this instance
	mergedFrom?: string[];       // If merged, UIDs of the two source cards
}

// v1.1: Pack NFT — a sealed, tradeable pack with deterministic DNA
export interface PackAsset {
	uid: string;                 // "pack_{trxId}:{index}"
	packType: string;            // 'starter' | 'standard' | 'premium' | 'mythic' | 'mega'
	dna: string;                 // sha256(mintTrxId + ":" + index + ":" + packType)
	owner: string;               // Current Hive account
	sealed: boolean;             // true = unopened
	mintTrxId: string;
	mintBlockNum: number;
	lastTransferBlock: number;
	cardCount: number;           // Cards inside (5, 7, or 15)
	edition: string;
}

// v1.1: Companion transfer in same Hive transaction (atomic anchoring)
export interface CompanionTransfer {
	from: string;
	to: string;
	amount: string;              // e.g. "0.001 HIVE"
	memo: string;
}

// v1.1: Pack supply tracking
export interface PackSupplyRecord {
	packType: string;
	minted: number;
	burned: number;
	cap: number;                 // 0 = unlimited
}

export interface GenesisRecord {
	version: string;
	sealed: boolean;
	sealBlock: number;
	packSupply: Record<string, number>;   // rarity → cap
	rewardSupply: Record<string, number>; // rarity → cap
}

export interface EloRecord {
	account: string;
	elo: number;
	wins: number;
	losses: number;
}

export interface MatchAnchorRecord {
	matchId: string;
	playerA: string;
	playerB: string;
	pubkeyA?: string;
	pubkeyB?: string;
	deckHashA?: string;
	deckHashB?: string;
	engineHash?: string;
	// Dual hash anchoring (ADR 0004 §Decision.2): the WASM engine pins the
	// dispatcher bytecode, the card registry pins the data the dispatcher
	// consumes. A peer running an older registry would otherwise diverge
	// invisibly. Optional in the type for backward-read compatibility with
	// pre-Phase-0 anchors persisted before this field landed; new anchors
	// MUST populate it. Server cross-checks `(engineHash, cardRegistryHash)`
	// at match_result ingest and rejects with `anchor_mismatch` on disagree.
	cardRegistryHash?: string;
	dualAnchored: boolean;
	timestamp: number;
}

export interface PackCommitRecord {
	trxId: string;
	account: string;
	packType: string;
	quantity: number;
	saltCommit: string;
	commitBlock: number;
	revealed: boolean;
}

// Forge commit per ADR 0001 §3 — mirror of PackCommitRecord with the Eitr cost
// captured so refund-on-exhaustion at reveal can credit the original amount.
export interface ForgeCommitRecord {
	trxId: string;
	account: string;
	rarity: string;
	saltCommit: string;
	commitBlock: number;
	debitAmount: number;
	revealed: boolean;
}

export interface TokenBalance {
	account: string;
	RUNE: number;
}

export interface SupplyRecord {
	key: string;        // rarity name or "card:{id}"
	pool: 'pack' | 'reward';
	cap: number;
	minted: number;
}

// ============================================================
// Campaign Submissions + Progress
// ============================================================

export type CampaignDifficulty = 'normal' | 'heroic' | 'mythic';

export type CampaignSubmissionStatus =
	| 'queued'
	| 'consumed'
	| 'rejected';

export interface CampaignRegistryMission {
	id: string;
	campaignId: string;
	chapterId: string;
	prerequisiteIds: string[];
	allowedDifficulties: CampaignDifficulty[];
	starThresholds: { threeStar: number; twoStar: number };
}

export interface CampaignRegistryProvider {
	getRegistryHash(): string;
	getCampaignId(): string;
	getMission(missionId: string): CampaignRegistryMission | null;
}

export interface CampaignSubmissionRecord {
	submissionKey: string;
	account: string;
	campaignId: string;
	missionId: string;
	difficulty: CampaignDifficulty;
	nonce: number;
	localRunId: string;
	localStartedAt: number;
	rulesetHash: string;
	seed: string;
	turnCount: number;
	stars: number;
	transcriptRoot: string;
	transcriptCid?: string;
	finalStateHash: string;
	status: CampaignSubmissionStatus;
	rejectionReason?: string;
	trxId: string;
	blockNum: number;
	timestamp: number;
}

export interface CampaignProgressRecord {
	account: string;
	campaignId: string;
	missionId: string;
	bestDifficulty: CampaignDifficulty;
	bestTurns: number;
	bestStars: number;
	completedAtBlock: number;
	completedTrxId: string;
	status: 'verified';
}

// ============================================================
// State Adapter — storage abstraction
//
// The protocol core calls these. Client implements with IndexedDB,
// server implements with in-memory Maps.
// ============================================================

export interface StateAdapter {
	// Genesis
	getGenesis(): Promise<GenesisRecord | null>;
	putGenesis(genesis: GenesisRecord): Promise<void>;

	// Cards
	getCard(uid: string): Promise<CardAsset | null>;
	putCard(card: CardAsset): Promise<void>;
	deleteCard(uid: string): Promise<void>;
	getCardsByOwner(owner: string): Promise<CardAsset[]>;

	// Supply
	getSupply(key: string, pool: 'pack' | 'reward'): Promise<SupplyRecord | null>;
	putSupply(record: SupplyRecord): Promise<void>;

	// Nonces
	advanceNonce(account: string, nonce: number): Promise<boolean>;

	// ELO
	getElo(account: string): Promise<EloRecord>;
	putElo(record: EloRecord): Promise<void>;

	// Tokens
	getTokenBalance(account: string): Promise<TokenBalance>;
	putTokenBalance(balance: TokenBalance): Promise<void>;
	getRuneBalanceTotal(): Promise<number>;
	getRuneLedgerEntry(entryId: string): Promise<RuneLedgerEntry | null>;
	putRuneLedgerEntry(entry: RuneLedgerEntry): Promise<void>;
	getRuneLedgerEntries(query: RuneLedgerEntryQuery): Promise<RuneLedgerEntry[]>;
	getRuneLedgerTotal(query: RuneLedgerTotalQuery): Promise<number>;

	// Eitr ledger (canonical per docs/adr/0001-eitr-v1-canonical.md)
	getEitrLedgerEntry(entryId: string): Promise<EitrLedgerEntry | null>;
	putEitrLedgerEntry(entry: EitrLedgerEntry): Promise<void>;
	getEitrLedgerEntries(query: EitrLedgerEntryQuery): Promise<EitrLedgerEntry[]>;
	getEitrLedgerTotal(query: EitrLedgerTotalQuery): Promise<number>;

	// Match anchors
	getMatchAnchor(matchId: string): Promise<MatchAnchorRecord | null>;
	putMatchAnchor(anchor: MatchAnchorRecord): Promise<void>;

	// Pack commits (v1 new flow)
	getPackCommit(trxId: string): Promise<PackCommitRecord | null>;
	putPackCommit(commit: PackCommitRecord): Promise<void>;
	getUnrevealedCommitsBefore(deadlineBlock: number): Promise<PackCommitRecord[]>;

	// Forge commits (per ADR 0001 §3 — commit-reveal forge)
	getForgeCommit(trxId: string): Promise<ForgeCommitRecord | null>;
	putForgeCommit(commit: ForgeCommitRecord): Promise<void>;
	getUnrevealedForgeCommitsBefore(deadlineBlock: number): Promise<ForgeCommitRecord[]>;

	// Reward claims
	hasRewardClaim(account: string, rewardId: string): Promise<boolean>;
	putRewardClaim(account: string, rewardId: string, blockNum: number): Promise<void>;

	// Campaign progress
	advanceCampaignNonce(account: string, nonce: number): Promise<boolean>;
	getCampaignSubmission(submissionKey: string): Promise<CampaignSubmissionRecord | null>;
	putCampaignSubmission(submission: CampaignSubmissionRecord): Promise<void>;
	getCampaignProgress(account: string, campaignId: string, missionId: string): Promise<CampaignProgressRecord | null>;
	putCampaignProgress(progress: CampaignProgressRecord): Promise<void>;

	// Slash state
	isSlashed(account: string): Promise<boolean>;
	slash(account: string, reason: string, blockNum: number): Promise<void>;

	// Queue
	getQueueEntry(account: string): Promise<{ timestamp: number } | null>;
	putQueueEntry(account: string, data: { mode: string; elo: number; peerId: string; deckHash: string; timestamp: number; blockNum: number }): Promise<void>;
	deleteQueueEntry(account: string): Promise<void>;

	// v1.1: Pack NFTs
	getPack(uid: string): Promise<PackAsset | null>;
	putPack(pack: PackAsset): Promise<void>;
	deletePack(uid: string): Promise<void>;
	getPacksByOwner(owner: string): Promise<PackAsset[]>;
	getPackSupply(packType: string): Promise<PackSupplyRecord | null>;
	putPackSupply(record: PackSupplyRecord): Promise<void>;

	// v1.1: Companion transfer lookup (atomic anchoring)
	getCompanionTransfer(trxId: string): Promise<CompanionTransfer | null>;
	setTrxSiblings(trxId: string, ops: unknown[]): void;

	// v1.2: DUAT Airdrop
	getDuatClaim(account: string): Promise<DuatClaimRecord | null>;
	putDuatClaim(claim: DuatClaimRecord): Promise<void>;

	// v1.2: Marketplace
	getListing(listingId: string): Promise<MarketListing | null>;
	getListingByNft(nftUid: string): Promise<MarketListing | null>;
	putListing(listing: MarketListing): Promise<void>;
	deleteListing(listingId: string): Promise<void>;
	getOffer(offerId: string): Promise<MarketOffer | null>;
	getOffersByNft(nftUid: string): Promise<MarketOffer[]>;
	putOffer(offer: MarketOffer): Promise<void>;
}

// ============================================================
// Signature Verifier — abstracted for testability
// ============================================================

export interface SignatureVerifier {
	/**
	 * Verify a detached signature against an anchored public key.
	 * Returns true if the signature over `message` was produced by `pubkey`.
	 */
	verifyAnchored(pubkey: string, message: string, signatureHex: string): Promise<boolean>;

	/**
	 * Legacy: verify against current chain posting keys (pre-v1 matches only).
	 */
	verifyCurrentKey(account: string, message: string, signatureHex: string): Promise<boolean>;
}

// ============================================================
// Card Data Provider — abstracted for isomorphic use
// ============================================================

export interface CardDataProvider {
	getCardById(id: number): {
		name: string;
		type: string;
		rarity: string;
		race?: string;
		collectible?: boolean;
		set?: string;
	} | null;
	getCollectibleIdsInRanges(ranges: readonly [number, number][]): number[];
}

// ============================================================
// Reward Definition
// ============================================================

export interface RewardDefinition {
	id: string;
	condition: { type: string; value: number };
	cards: Array<{ cardId: number; rarity: string; foil?: string }>;
	runeBonus: number;
}

export interface RewardProvider {
	getRewardById(id: string): RewardDefinition | null;
}

// ============================================================
// v1.2: Marketplace Types (NFTLox-inspired)
// ============================================================

export type MarketCurrency = 'HIVE' | 'HBD';

export interface MarketListing {
	listingId: string;          // Deterministic: fnv1a("ragnarok:list:{nftUid}:{blockNum}")
	nftUid: string;             // Card or pack UID
	nftType: 'card' | 'pack';
	seller: string;             // Hive account
	price: number;              // Amount in currency units
	currency: MarketCurrency;
	listedBlock: number;
	listedTrxId: string;
	active: boolean;
}

export interface MarketOffer {
	offerId: string;            // Deterministic: fnv1a("ragnarok:offer:{nftUid}:{buyer}:{blockNum}")
	nftUid: string;
	buyer: string;
	price: number;
	currency: MarketCurrency;
	offeredBlock: number;
	offeredTrxId: string;
	status: 'pending' | 'accepted' | 'rejected' | 'expired';
	paymentTrxId?: string;      // Cross-referenced HIVE transfer for verification
}

// v1.2: DUAT Airdrop claim record
export interface DuatClaimRecord {
	account: string;
	duatRaw: number;
	packsEarned: number;
	blockNum: number;
	trxId: string;
}

export interface DuatEntitlement {
	account: string;
	duatRaw: number | null;
	packsEarned: number;
}

export interface DuatEntitlementProvider {
	getDuatEntitlement(account: string): Promise<DuatEntitlement | null>;
}

// DUAT airdrop formula constants (calibrated)
export const DUAT_SCALE = 5.346668;
export const DUAT_BASE_PACKS = 1;
export const DUAT_MAX_PACKS = 500;
export const DUAT_PRECISION = 1000;
export const DUAT_CLAIM_WINDOW_BLOCKS = 2_592_000; // ~90 days at 3s blocks

export function calculateDuatPacks(duatRaw: number): number {
	const display = duatRaw / DUAT_PRECISION;
	if (display <= 0) return 0;
	const packs = Math.floor(Math.min(DUAT_MAX_PACKS, DUAT_BASE_PACKS + Math.log2(display) * DUAT_SCALE));
	return Math.max(0, packs);
}

// Marketplace state adapter extension
export interface MarketStateAdapter {
	getListing(listingId: string): Promise<MarketListing | null>;
	getListingByNft(nftUid: string): Promise<MarketListing | null>;
	putListing(listing: MarketListing): Promise<void>;
	deleteListing(listingId: string): Promise<void>;
	getOffer(offerId: string): Promise<MarketOffer | null>;
	getOffersByNft(nftUid: string): Promise<MarketOffer[]>;
	putOffer(offer: MarketOffer): Promise<void>;
	deleteOffer(offerId: string): Promise<void>;
}

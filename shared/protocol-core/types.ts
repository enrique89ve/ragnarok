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

// ============================================================
// Protocol Constants
// ============================================================

export const RAGNAROK_ADMIN_ACCOUNT = 'ragnarok';
export const TRANSFER_COOLDOWN_BLOCKS = 10;
export const PACK_REVEAL_DEADLINE_BLOCKS = 200;
export const PACK_ENTROPY_DELAY_BLOCKS = 20;
export const MAX_CARD_LEVEL = 3;
export const ELO_K_FACTOR = 32;
export const ELO_FLOOR = 100;
export const RUNE_WIN_RANKED = 10;
export const RUNE_LOSS_RANKED = 3;
export const HIVE_USERNAME_RE = /^[a-z][a-z0-9.-]{2,15}$/;

// v1.1: Pack NFT + DNA Lineage constants
export const ATOMIC_TRANSFER_AMOUNT = '0.001 HIVE';
export const MAX_REPLICAS_PER_CARD = 3;
export const MAX_GENERATION = 3;
export const REPLICA_COOLDOWN_BLOCKS = 100;
export const PACK_SIZES: Record<string, number> = {
	starter: 5, booster: 5, standard: 5, premium: 7, mythic: 7, mega: 15,
};

// ============================================================
// Canonical Op Actions (19 total — v1.0 base + v1.1 extensions)
// ============================================================

export type CanonicalAction =
	| 'genesis'
	| 'seal'
	| 'mint_batch'
	| 'pack_commit'
	| 'pack_reveal'
	| 'reward_claim'
	| 'card_transfer'
	| 'burn'
	| 'level_up'
	| 'queue_join'
	| 'queue_leave'
	| 'match_anchor'
	| 'match_result'
	| 'slash_evidence'
	// v1.1: Pack NFTs
	| 'pack_mint'
	| 'pack_distribute'
	| 'pack_transfer'
	| 'pack_burn'
	// v1.1: DNA Lineage
	| 'card_replicate'
	| 'card_merge'
	// v1.2: Marketplace (NFTLox-inspired)
	| 'market_list'
	| 'market_unlist'
	| 'market_buy'
	| 'market_offer'
	| 'market_accept'
	| 'market_reject'
	// v1.2: DUAT Airdrop
	| 'duat_airdrop_claim'
	| 'duat_airdrop_finalize';

// Legacy op that is NOT a canonical alias (valid only pre-seal)
export type LegacyAction = 'legacy_pack_open';

export type ProtocolAction = CanonicalAction | LegacyAction;

// ============================================================
// Authority Requirements
// ============================================================

export const ACTIVE_AUTH_OPS: ReadonlySet<CanonicalAction> = new Set([
	'card_transfer', 'burn', 'seal', 'mint_batch',
	'pack_mint', 'pack_distribute', 'pack_transfer', 'pack_burn',
	'card_replicate', 'card_merge',
	// Marketplace: buy requires active (bundles HIVE transfer)
	'market_buy', 'market_accept',
	// DUAT: finalize is admin-only active auth
	'duat_airdrop_finalize',
]);

export const POSTING_AUTH_OPS: ReadonlySet<CanonicalAction> = new Set([
	'queue_join', 'queue_leave', 'match_anchor', 'match_result',
	'pack_commit', 'pack_reveal', 'reward_claim', 'level_up',
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
	mintSource: 'genesis' | 'pack' | 'reward' | 'replica' | 'merge';
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

	// Match anchors
	getMatchAnchor(matchId: string): Promise<MatchAnchorRecord | null>;
	putMatchAnchor(anchor: MatchAnchorRecord): Promise<void>;

	// Pack commits (v1 new flow)
	getPackCommit(trxId: string): Promise<PackCommitRecord | null>;
	putPackCommit(commit: PackCommitRecord): Promise<void>;
	getUnrevealedCommitsBefore(deadlineBlock: number): Promise<PackCommitRecord[]>;

	// Reward claims
	hasRewardClaim(account: string, rewardId: string): Promise<boolean>;
	putRewardClaim(account: string, rewardId: string, blockNum: number): Promise<void>;

	// Slash state
	isSlashed(account: string): Promise<boolean>;
	slash(account: string, reason: string, blockNum: number): Promise<void>;

	// Queue
	getQueueEntry(account: string): Promise<{ timestamp: number } | null>;
	putQueueEntry(account: string, data: { mode: string; elo: number; timestamp: number; blockNum: number }): Promise<void>;
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
	getCardById(id: number): { name: string; type: string; rarity: string; race?: string; collectible?: boolean } | null;
	getCollectibleIdsInRanges(ranges: [number, number][]): number[];
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

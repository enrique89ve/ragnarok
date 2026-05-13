/**
 * Ragnarok Protocol Core — Op Application
 *
 * Pure state-transition functions. No I/O, no events, no storage coupling.
 * All storage access goes through the StateAdapter interface.
 *
 * Each handler returns OpResult: applied, rejected(reason), or ignored.
 */

import type {
	ProtocolOp, OpResult, ReplayContext, StateAdapter,
	CardDataProvider, RewardProvider, SignatureVerifier,
	CardAsset, GenesisRecord, EloRecord, PackAsset,
	MarketListing, MarketOffer, ProtocolAction, RewardDefinition,
	CampaignDifficulty, CampaignProgressRecord, CampaignRegistryProvider, CampaignSubmissionRecord,
	RuneExchangeAdapter, RuneLedgerEntry, DuatEntitlementProvider,
} from './types';
import {
	RAGNAROK_ADMIN_ACCOUNT, TRANSFER_COOLDOWN_BLOCKS, MAX_CARD_LEVEL,
	ELO_K_FACTOR, ELO_FLOOR, RUNE_WIN_RANKED, RUNE_LOSS_RANKED,
	HIVE_USERNAME_RE, ATOMIC_TRANSFER_AMOUNT, PACK_SIZES,
	MAX_REPLICAS_PER_CARD, MAX_GENERATION, REPLICA_COOLDOWN_BLOCKS,
	PACK_ENTROPY_DELAY_BLOCKS, PACK_REVEAL_DEADLINE_BLOCKS,
	DUAT_CLAIM_WINDOW_BLOCKS,
	getPackDefinition,
	TESTNET_RUNE_ECONOMY,
	TESTNET_RUNE_SEASON_ID,
	TESTNET_EITR_SEASON_ID,
	calculateCappedRuneCredit,
	createBurnEitrSourceKey,
	createCampaignFirstClearRuneSourceKey,
	createEitrLedgerEntryId,
	createForgeCommitEitrSourceKey,
	createForgeRefundEitrSourceKey,
	createP2PRankedRuneSourceKey,
	createRewardClaimRuneSourceKey,
	createRuneExchangeSourceKey,
	createRuneLedgerEntryId,
	calculateRuneBalanceTrace,
	getCampaignFirstClearRuneReward,
	getEitrDissolveValue,
	getEitrForgeCost,
} from './types';
import type { ForgeCommitRecord } from './types';
import { classifyCard } from '../schemas/cardCategory';
import { verifyPoW, POW_CONFIG } from './pow';
import { canonicalStringify, sha256Hash } from './hash';
import { fnv1a } from './broadcast-utils';
import { getEconomicLevelForXP, getEconomicXPPerWin } from './cardProgression';
import {
	PACK_ID_RANGES, lcgNext, deriveLegacyPackSeed, pickLegacyPackCardIds,
} from './packDraw';

// ============================================================
// Dependencies injected at init, not imported
// ============================================================

export interface ProtocolCoreDeps {
	state: StateAdapter;
	cards: CardDataProvider;
	rewards: RewardProvider;
	campaigns: CampaignRegistryProvider;
	sigs: SignatureVerifier;
	runeExchange: RuneExchangeAdapter;
	duat: DuatEntitlementProvider;
}

type OpHandler = (op: ProtocolOp, ctx: ReplayContext, deps: ProtocolCoreDeps) => Promise<OpResult>;

type MintBatchCardPayload = {
	uid?: string;
	nft_id?: string;
	card_id: number | string;
	rarity: string;
};

type MatchParticipants = {
	p1: string;
	p2: string;
};

type MatchResultDetails = MatchParticipants & {
	isCompact: boolean;
	winner: string;
	loser: string | null;
	nonce: number;
	matchType: string;
	matchId: string;
	counterparty: string;
	cardHex?: string;
	compactHash?: string;
	seed: string;
	version: number;
};

type SignaturePair = {
	broadcasterSig: string;
	counterpartySig: string;
};

type MarketNftAsset =
	| { nftType: 'card'; asset: CardAsset }
	| { nftType: 'pack'; asset: PackAsset };

type RuneExchangeDetails = {
	packType: string;
	quantity: number;
	runeCost: number;
	totalCost: number;
	accountLimit: number;
	globalPackCap: number;
	sourceKey: string;
	entryId: string;
};

const IGNORE_RESULT: OpResult = { status: 'ignored' };
const GAME_ACTIONS_REQUIRING_SLASH_CHECK = new Set<ProtocolAction>([
	'match_anchor', 'match_result', 'campaign_result', 'queue_join',
]);
const RARITY_CARD_CAPS: Record<string, number> = {
	common: 2000,
	rare: 1000,
	epic: 500,
	mythic: 250,
};

const OP_HANDLERS: Record<ProtocolAction, OpHandler> = {
	genesis: (op, _ctx, deps) => applyGenesis(op, deps),
	seal: (op, _ctx, deps) => applySeal(op, deps),
	mint_batch: (op, _ctx, deps) => applyMintBatch(op, deps),
	card_transfer: (op, _ctx, deps) => applyCardTransfer(op, deps),
	burn: (op, _ctx, deps) => applyBurn(op, deps),
	level_up: (op, _ctx, deps) => applyLevelUp(op, deps),
	match_anchor: (op, _ctx, deps) => applyMatchAnchor(op, deps),
	match_result: (op, ctx, deps) => applyMatchResult(op, ctx, deps),
	campaign_result: (op, _ctx, deps) => applyCampaignResult(op, deps),
	rune_exchange: (op, _ctx, deps) => applyRuneExchange(op, deps),
	queue_join: (op, _ctx, deps) => applyQueueJoin(op, deps),
	queue_leave: (op, _ctx, deps) => applyQueueLeave(op, deps),
	reward_claim: (op, _ctx, deps) => applyRewardClaim(op, deps),
	slash_evidence: async () => IGNORE_RESULT,
	pack_commit: (op, _ctx, deps) => applyPackCommit(op, deps),
	pack_reveal: (op, ctx, deps) => applyPackReveal(op, ctx, deps),
	forge_commit: (op, _ctx, deps) => applyForgeCommit(op, deps),
	forge_reveal: (op, ctx, deps) => applyForgeReveal(op, ctx, deps),
	legacy_pack_open: (op, _ctx, deps) => applyLegacyPackOpen(op, deps),
	pack_mint: (op, ctx, deps) => applyPackMint(op, ctx, deps),
	pack_distribute: (op, _ctx, deps) => applyPackDistribute(op, deps),
	pack_transfer: (op, _ctx, deps) => applyPackTransfer(op, deps),
	pack_burn: (op, ctx, deps) => applyPackBurn(op, ctx, deps),
	card_replicate: (op, _ctx, deps) => applyCardReplicate(op, deps),
	card_merge: (op, _ctx, deps) => applyCardMerge(op, deps),
	duat_airdrop_claim: (op, _ctx, deps) => applyDuatAirdropClaim(op, deps),
	duat_airdrop_finalize: (op, _ctx, deps) => applyDuatAirdropFinalize(op, deps),
	market_list: (op, _ctx, deps) => applyMarketList(op, deps),
	market_unlist: (op, _ctx, deps) => applyMarketUnlist(op, deps),
	market_buy: (op, _ctx, deps) => applyMarketBuy(op, deps),
	market_offer: (op, _ctx, deps) => applyMarketOffer(op, deps),
	market_accept: (op, _ctx, deps) => applyMarketAccept(op, deps),
	market_reject: (op, _ctx, deps) => applyMarketReject(op, deps),
};

// ============================================================
// Main dispatch
// ============================================================

export async function applyOp(
	op: ProtocolOp,
	ctx: ReplayContext,
	deps: ProtocolCoreDeps,
): Promise<OpResult> {
	// Finality gate: reject ops from blocks beyond LIB
	if (op.blockNum > ctx.lastIrreversibleBlock) {
		return IGNORE_RESULT; // not yet irreversible
	}

	const slashResult = await validateSlashedAction(op, deps);
	if (slashResult) {
		return slashResult;
	}

	return OP_HANDLERS[op.action]?.(op, ctx, deps) ?? IGNORE_RESULT;
}

function reject(reason: string): OpResult {
	return { status: 'rejected', reason };
}

function readOptionalPayloadNumber(payload: Record<string, unknown>, key: string): number | null {
	if (!(key in payload)) return null;

	const value = Number(payload[key]);
	return Number.isFinite(value) ? value : Number.NaN;
}

async function validateSlashedAction(
	op: ProtocolOp,
	deps: ProtocolCoreDeps,
): Promise<OpResult | null> {
	if (!GAME_ACTIONS_REQUIRING_SLASH_CHECK.has(op.action)) {
		return null;
	}

	return await deps.state.isSlashed(op.broadcaster)
		? reject('account is slashed')
		: null;
}

function isOpResult(value: OpResult | unknown): value is OpResult {
	return typeof value === 'object'
		&& value !== null
		&& 'status' in value;
}

type NewRuneLedgerEntry = Omit<RuneLedgerEntry, 'balanceBefore' | 'balanceAfter'>;

async function putRuneLedgerEntryAndBalance(
	deps: ProtocolCoreDeps,
	entry: NewRuneLedgerEntry,
): Promise<OpResult | null> {
	const balance = await deps.state.getTokenBalance(entry.account);
	const trace = calculateRuneBalanceTrace({
		balanceBefore: balance.RUNE,
		direction: entry.direction,
		amount: entry.amount,
	});
	if (trace.balanceAfter < 0) {
		return reject('insufficient RUNE balance');
	}

	const currentRuneBalanceTotal = await deps.state.getRuneBalanceTotal();
	const projectedRuneBalanceTotal = currentRuneBalanceTotal - balance.RUNE + trace.balanceAfter;
	if (
		currentRuneBalanceTotal > TESTNET_RUNE_ECONOMY.totalCap
		|| projectedRuneBalanceTotal > TESTNET_RUNE_ECONOMY.totalCap
	) {
		return reject('RUNE active balance cap exceeded');
	}

	if (entry.direction === 'credit' && entry.amount > 0) {
		const totalCredited = await deps.state.getRuneLedgerTotal({
			seasonId: entry.seasonId,
			direction: 'credit',
		});
		if (totalCredited + entry.amount > TESTNET_RUNE_ECONOMY.totalCap) {
			return reject('RUNE total emission cap exceeded');
		}
	}

	await deps.state.putRuneLedgerEntry({ ...entry, ...trace });
	await deps.state.putTokenBalance({ ...balance, RUNE: trace.balanceAfter });
	return null;
}

// ============================================================
// genesis
// ============================================================

async function applyGenesis(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	if (op.broadcaster !== RAGNAROK_ADMIN_ACCOUNT) return reject('not admin account');

	const existing = await deps.state.getGenesis();
	if (existing) return { status: 'ignored' }; // already applied

	const packSupply = (op.payload.supply as Record<string, unknown>)?.pack_supply as Record<string, number>
		?? op.payload.card_supply_caps as Record<string, number>
		?? op.payload.card_distribution as Record<string, number>;
	const rewardSupply = (op.payload.supply as Record<string, unknown>)?.reward_supply as Record<string, number>
		?? {};

	if (!packSupply) return reject('missing supply definition');

	const genesis: GenesisRecord = {
		version: String(op.payload.version ?? '1'),
		sealed: false,
		sealBlock: 0,
		packSupply,
		rewardSupply,
	};

	await deps.state.putGenesis(genesis);

	// Initialize pack supply counters
	for (const [rarity, cap] of Object.entries(packSupply)) {
		await deps.state.putSupply({ key: rarity, pool: 'pack', cap, minted: 0 });
	}
	// Initialize reward supply counters
	for (const [rarity, cap] of Object.entries(rewardSupply)) {
		if (cap > 0) {
			await deps.state.putSupply({ key: rarity, pool: 'reward', cap, minted: 0 });
		}
	}

	return { status: 'applied' };
}

// ============================================================
// seal
// ============================================================

async function applySeal(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	if (op.broadcaster !== RAGNAROK_ADMIN_ACCOUNT) return reject('not admin account');

	const genesis = await deps.state.getGenesis();
	if (!genesis) return reject('no genesis');
	if (genesis.sealed) return { status: 'ignored' }; // already sealed

	await deps.state.putGenesis({ ...genesis, sealed: true, sealBlock: op.blockNum });
	return { status: 'applied' };
}

// ============================================================
// mint_batch
// ============================================================

async function applyMintBatch(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	if (op.broadcaster !== RAGNAROK_ADMIN_ACCOUNT) return reject('not admin account');

	const genesis = await deps.state.getGenesis();
	if (!genesis) return reject('no genesis');
	if (genesis.sealed) return reject('minting sealed');

	const to = op.payload.to as string;
	const cards = op.payload.cards as MintBatchCardPayload[] | undefined;
	if (!to || !Array.isArray(cards)) return reject('missing to or cards');

	let applied = false;
	for (let i = 0; i < cards.length; i++) {
		applied = await mintBatchCard(op, to, cards[i], i, deps) || applied;
	}

	return applied ? { status: 'applied' } : { status: 'ignored' };
}

async function mintBatchCard(
	op: ProtocolOp,
	to: string,
	card: MintBatchCardPayload,
	index: number,
	deps: ProtocolCoreDeps,
): Promise<boolean> {
	const mintContext = await getMintBatchContext(op, card, index, deps);
	if (!mintContext) return false;

	await deps.state.putCard({
		uid: mintContext.uid,
		cardId: mintContext.cardId,
		owner: to,
		rarity: mintContext.rarity,
		level: 1,
		xp: 0,
		edition: 'alpha',
		mintSource: 'genesis',
		mintTrxId: op.trxId,
		mintBlockNum: op.blockNum,
		lastTransferBlock: op.blockNum,
	});

	if (mintContext.supplyRecord) {
		await deps.state.putSupply({ ...mintContext.supplyRecord, minted: mintContext.supplyRecord.minted + 1 });
	}

	await deps.state.putSupply({
		key: mintContext.cardKey,
		pool: 'pack',
		cap: mintContext.perCardCap,
		minted: mintContext.cardMinted + 1,
	});
	return true;
}

async function getMintBatchContext(
	op: ProtocolOp,
	card: MintBatchCardPayload,
	index: number,
	deps: ProtocolCoreDeps,
): Promise<{
	uid: string;
	cardId: number;
	rarity: string;
	cardKey: string;
	cardMinted: number;
	perCardCap: number;
	supplyRecord: Awaited<ReturnType<StateAdapter['getSupply']>>;
} | null> {
	const cardId = getMintBatchCardId(card);
	if (!cardId) return null;

	const uid = card.uid ?? card.nft_id ?? `card_${fnv1a(`ragnarok:card:${op.trxId}:${cardId}:${index}`)}`;
	if (!uid) return null;

	const cardDef = deps.cards.getCardById(cardId);
	if (!cardDef || await deps.state.getCard(uid)) return null;

	const rarity = card.rarity || cardDef.rarity || 'common';
	const supplyRecord = await deps.state.getSupply(rarity, 'pack');
	if (supplyRecord && supplyRecord.minted >= supplyRecord.cap) return null;

	const cardKey = `card:${cardId}`;
	const cardSupply = await deps.state.getSupply(cardKey, 'pack');
	const cardMinted = cardSupply?.minted ?? 0;
	const perCardCap = RARITY_CARD_CAPS[rarity.toLowerCase()] ?? 2000;
	if (cardMinted >= perCardCap) return null;

	return {
		uid,
		cardId,
		rarity,
		cardKey,
		cardMinted,
		perCardCap,
		supplyRecord,
	};
}

function getMintBatchCardId(card: MintBatchCardPayload): number {
	return typeof card.card_id === 'number'
		? card.card_id
		: parseInt(String(card.card_id), 10) || 0;
}

// ============================================================
// card_transfer
// ============================================================

async function applyCardTransfer(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const cards = op.payload.cards as Array<{ nft_id?: string; card_uid?: string; to?: string }> | undefined;
	if (Array.isArray(cards)) {
		let anyApplied = false;
		for (const entry of cards) {
			const nftId = (entry.nft_id ?? entry.card_uid) as string;
			const to = (entry.to ?? op.payload.to) as string;
			const result = await transferSingle(op, nftId, to, deps);
			if (result.status === 'applied') anyApplied = true;
		}
		return anyApplied ? { status: 'applied' } : { status: 'ignored' };
	}

	const nftId = (op.payload.nft_id ?? op.payload.card_uid) as string;
	const to = op.payload.to as string;
	return transferSingle(op, nftId, to, deps);
}

async function transferSingle(
	op: ProtocolOp, nftId: string, to: string, deps: ProtocolCoreDeps,
): Promise<OpResult> {
	if (typeof nftId !== 'string' || typeof to !== 'string') return reject('missing nft_id or to');
	if (!HIVE_USERNAME_RE.test(to)) return reject(`invalid destination: "${to}"`);
	if (to === op.broadcaster) return reject('cannot transfer to self');

	const card = await deps.state.getCard(nftId);
	if (!card) return reject(`card ${nftId} not found`);
	if (card.owner !== op.broadcaster) return reject(`card ${nftId} not owned by broadcaster`);

	if (card.lastTransferBlock && (op.blockNum - card.lastTransferBlock) < TRANSFER_COOLDOWN_BLOCKS) {
		return reject(`card ${nftId} transfer cooldown`);
	}

	const nonce = Number(op.payload.nonce ?? 0);
	if (nonce > 0) {
		const nonceOk = await deps.state.advanceNonce(op.broadcaster, nonce);
		if (!nonceOk) return reject(`nonce ${nonce} not higher than last seen`);
	}

	await deps.state.putCard({ ...card, owner: to, lastTransferBlock: op.blockNum });
	return { status: 'applied' };
}

// ============================================================
// burn
// ============================================================

async function applyBurn(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	// Type-guarded extraction of nft_id (per hive-payload-canon: payload enters as unknown).
	const rawNftId = op.payload.nft_id ?? op.payload.card_uid;
	if (typeof rawNftId !== 'string' || rawNftId.length === 0) {
		return reject('missing nft_id');
	}
	const nftId = rawNftId;

	const card = await deps.state.getCard(nftId);
	if (!card) return { status: 'ignored' };
	if (card.owner !== op.broadcaster) return reject('not owner');

	// Category gate: only genesis NFTs are dissolve-eligible per ADR 0001 §5.
	// Starter cards are off-chain and never reach here; tokens are not collectible.
	const cardDef = deps.cards.getCardById(card.cardId);
	if (!cardDef) return reject('card definition missing');
	const category = classifyCard({ set: cardDef.set, collectible: cardDef.collectible });
	if (category !== 'genesis') return reject('not a genesis card');

	const rarity = card.rarity.toLowerCase();
	const eitrAmount = getEitrDissolveValue(rarity);
	if (eitrAmount <= 0) return reject(`no eitr value for rarity: ${rarity}`);

	// Pre-check supply: a genesis card must have a corresponding pack_supply record.
	// If absent, the chain state is corrupt — refuse rather than destroy the uid.
	const supply = await deps.state.getSupply(rarity, 'pack');
	if (!supply) return reject('genesis supply missing for rarity');

	const sourceKey = createBurnEitrSourceKey({
		seasonId: TESTNET_EITR_SEASON_ID,
		account: op.broadcaster,
		trxId: op.trxId,
		uid: nftId,
	});
	const entryId = createEitrLedgerEntryId({
		seasonId: TESTNET_EITR_SEASON_ID,
		direction: 'credit',
		sourceType: 'burn',
		sourceKey,
	});

	// Idempotency: re-applying the same burn op is a no-op.
	const existing = await deps.state.getEitrLedgerEntry(entryId);
	if (existing) return { status: 'ignored' };

	// Atomic intent: ledger → supply → deleteCard (in this order).
	// If a crash interrupts after ledger write but before deleteCard, replay
	// will see the entry exist and ignore — the card stays alive, no double-credit.
	const balanceBefore = await getEitrBalanceFor(deps, op.broadcaster);
	await deps.state.putEitrLedgerEntry({
		entryId,
		seasonId: TESTNET_EITR_SEASON_ID,
		account: op.broadcaster,
		direction: 'credit',
		sourceType: 'burn',
		sourceKey,
		amount: eitrAmount,
		balanceBefore,
		balanceAfter: balanceBefore + eitrAmount,
		trxId: op.trxId,
		blockNum: op.blockNum,
		timestamp: op.timestamp,
	});
	await deps.state.putSupply({ ...supply, minted: Math.max(0, supply.minted - 1) });
	await deps.state.deleteCard(nftId);

	return { status: 'applied' };
}

// Compute current Eitr balance for an account in the active season:
// credits minus debits, mirroring how server-side stats derive it.
async function getEitrBalanceFor(deps: ProtocolCoreDeps, account: string): Promise<number> {
	const credits = await deps.state.getEitrLedgerTotal({
		seasonId: TESTNET_EITR_SEASON_ID,
		account,
		direction: 'credit',
	});
	const debits = await deps.state.getEitrLedgerTotal({
		seasonId: TESTNET_EITR_SEASON_ID,
		account,
		direction: 'debit',
	});
	return credits - debits;
}

// ============================================================
// level_up
// ============================================================

async function applyLevelUp(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	let nftId: string;
	let newLevel: number;

	if (typeof op.payload.d === 'string' && op.payload.v === 1) {
		const parts = (op.payload.d as string).split(':');
		if (parts.length < 3) return reject('malformed compact level_up');
		nftId = parts[0];
		newLevel = parseInt(parts[2], 16);
	} else {
		nftId = (op.payload.nft_id ?? op.payload.cardUid) as string;
		newLevel = Number(op.payload.new_level ?? 0);
	}

	if (!nftId || !newLevel || newLevel <= 0) return reject('invalid level_up fields');
	if (newLevel > MAX_CARD_LEVEL) return reject(`level exceeds cap: ${newLevel} > ${MAX_CARD_LEVEL}`);

	const card = await deps.state.getCard(nftId);
	if (!card) return { status: 'ignored' };
	if (card.owner !== op.broadcaster) return reject('not owner');
	if (newLevel <= card.level) return { status: 'ignored' }; // idempotent

	// Validate against chain-derived XP
	const derivedLevel = getEconomicLevelForXP(card.rarity, card.xp);
	if (newLevel > derivedLevel) {
		return reject(`level overclaim: ${newLevel} > derived ${derivedLevel} (xp=${card.xp})`);
	}

	await deps.state.putCard({ ...card, level: newLevel });
	return { status: 'applied' };
}

// ============================================================
// match_anchor
// ============================================================

async function applyMatchAnchor(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const matchId = op.payload.match_id as string;
	if (!matchId) return reject('missing match_id');

	// PoW required
	const powResult = await verifyPowField(op);
	if (powResult) return powResult;

	const existing = await deps.state.getMatchAnchor(matchId);
	if (existing?.dualAnchored) return { status: 'ignored' }; // already anchored

	const playerA = (op.payload.player_a as string) ?? op.broadcaster;
	const playerB = (op.payload.player_b as string) ?? '';

	if (!existing) {
		await deps.state.putMatchAnchor({
			matchId,
			playerA,
			playerB,
			pubkeyA: op.payload.pubkey_a as string | undefined,
			pubkeyB: op.payload.pubkey_b as string | undefined,
			deckHashA: op.payload.deck_hash_a as string | undefined,
			deckHashB: op.payload.deck_hash_b as string | undefined,
			engineHash: op.payload.engine_hash as string | undefined,
			cardRegistryHash: op.payload.card_registry_hash as string | undefined,
			dualAnchored: !!(op.payload.sig_a && op.payload.sig_b),
			timestamp: op.timestamp,
		});
		return { status: 'applied' };
	}

	// Second anchor — complete dual-sig
	const isA = op.broadcaster === existing.playerA;
	const isB = op.broadcaster === existing.playerB;
	if (!isA && !isB) return reject('broadcaster not a participant');

	const updated = { ...existing, dualAnchored: true };
	if (isA) updated.deckHashA = op.payload.deck_hash as string ?? existing.deckHashA;
	if (isB) updated.deckHashB = op.payload.deck_hash as string ?? existing.deckHashB;

	await deps.state.putMatchAnchor(updated);
	return { status: 'applied' };
}

// ============================================================
// match_result
// ============================================================

async function applyMatchResult(
	op: ProtocolOp, ctx: ReplayContext, deps: ProtocolCoreDeps,
): Promise<OpResult> {
	const genesis = await deps.state.getGenesis();
	if (!genesis) return reject('no genesis');

	const details = parseMatchResultDetails(op);
	if (isOpResult(details)) return details;

	const participantResult = validateMatchResultParticipants(op, details);
	if (participantResult) return participantResult;

	const nonceAndPowResult = await validateMatchResultNonceAndPow(op, details.nonce, deps);
	if (nonceAndPowResult) return nonceAndPowResult;

	const compactHashResult = await validateCompactMatchHash(op, details);
	if (compactHashResult) return compactHashResult;

	const signatureResult = await validateRankedMatchSignatures(op, details, genesis, deps);
	if (signatureResult) return signatureResult;

	const settlementResult = await applyRankedMatchSettlement(op, details, deps);
	if (settlementResult) return settlementResult;

	await applyWinnerCardXp(details, deps);

	return { status: 'applied' };
}

function parseMatchResultDetails(op: ProtocolOp): MatchResultDetails | OpResult {
	const isCompact = typeof op.payload.m === 'string';
	const payloadFields = extractMatchResultPayloadFields(op, isCompact);
	if (!payloadFields.winner) return reject('missing winner');
	const participants = getMatchParticipants(op, isCompact, payloadFields.winner, payloadFields.loser);
	if (isOpResult(participants)) return participants;
	return {
		...participants,
		...payloadFields,
		counterparty: op.broadcaster === participants.p1 ? participants.p2 : participants.p1,
	};
}

function extractMatchResultPayloadFields(
	op: ProtocolOp,
	isCompact: boolean,
): Omit<MatchResultDetails, keyof MatchParticipants | 'counterparty'> {
	const matchIdValue = isCompact ? op.payload.m : op.payload.matchId;
	return {
		isCompact,
		winner: (isCompact ? op.payload.w : op.payload.winnerId) as string,
		loser: (isCompact ? op.payload.l : null) as string | null,
		nonce: Number(isCompact ? op.payload.n : op.payload.result_nonce ?? 0),
		matchType: isCompact ? 'ranked' : ((op.payload.matchType as string) ?? 'casual'),
		matchId: typeof matchIdValue === 'string' ? matchIdValue : '',
		cardHex: isCompact ? op.payload.c as string | undefined : undefined,
		compactHash: isCompact ? op.payload.ch as string | undefined : undefined,
		seed: ((isCompact ? op.payload.s : op.payload.seed) as string | undefined) ?? '',
		version: Number(isCompact ? op.payload.v : 0),
	};
}

function getMatchParticipants(
	op: ProtocolOp,
	isCompact: boolean,
	winner: string,
	loser: string | null,
): MatchParticipants | OpResult {
	if (isCompact) {
		return { p1: winner, p2: loser ?? '' };
	}

	const pl1 = op.payload.player1 as Record<string, unknown> | undefined;
	const pl2 = op.payload.player2 as Record<string, unknown> | undefined;
	if (!pl1 || !pl2) return reject('missing player data');

	return {
		p1: pl1.hiveUsername as string,
		p2: pl2.hiveUsername as string,
	};
}

function validateMatchResultParticipants(
	op: ProtocolOp,
	details: MatchResultDetails,
): OpResult | null {
	if (!details.p1 || !details.p2 || details.p1 === details.p2) {
		return reject('self-play or empty username');
	}

	if (op.broadcaster !== details.p1 && op.broadcaster !== details.p2) {
		return reject('broadcaster not a participant');
	}

	return details.winner !== details.p1 && details.winner !== details.p2
		? reject('winner must be a match participant')
		: null;
}

async function validateMatchResultNonceAndPow(
	op: ProtocolOp,
	nonce: number,
	deps: ProtocolCoreDeps,
): Promise<OpResult | null> {
	const nonceOk = await deps.state.advanceNonce(op.broadcaster, nonce);
	if (!nonceOk) {
		return reject(`nonce ${nonce} not higher than last seen`);
	}

	return verifyPowField(op, POW_CONFIG.MATCH_RESULT);
}

async function validateCompactMatchHash(
	op: ProtocolOp,
	details: MatchResultDetails,
): Promise<OpResult | null> {
	if (!details.isCompact || !details.compactHash || !details.cardHex) {
		return null;
	}

	const chInput = {
		m: op.payload.m,
		w: details.winner,
		l: details.loser ?? '',
		n: details.nonce,
		s: details.seed,
		v: details.version,
		c: details.cardHex,
	};
	const expectedCh = await sha256Hash(canonicalStringify(chInput));
	return expectedCh !== details.compactHash
		? reject(`compact hash mismatch: expected=${expectedCh}, got=${details.compactHash}`)
		: null;
}

async function validateRankedMatchSignatures(
	op: ProtocolOp,
	details: MatchResultDetails,
	genesis: GenesisRecord,
	deps: ProtocolCoreDeps,
): Promise<OpResult | null> {
	if (details.matchType !== 'ranked') {
		return null;
	}

	const signatures = extractMatchResultSignatures(op, details.isCompact);
	if (isOpResult(signatures)) return signatures;

	const anchor = details.matchId
		? await deps.state.getMatchAnchor(details.matchId)
		: null;
	// TODO(adr-0004-issue-01): cross-check (engineHash, cardRegistryHash) on
	// the match_result payload against the values pinned in `anchor`. Reject
	// with `anchor_mismatch` when either disagrees. Deferred to keep this
	// issue schema/wire only — match_result does not yet carry the engine
	// or registry hash on its payload, so the cross-check has no source
	// fields to compare today. Implement once match_result is extended in a
	// follow-up issue.
	const sigMessage = details.isCompact
		? `${details.matchId}:${details.winner}:${details.loser ?? ''}:${details.nonce}`
		: `${details.matchId}:${details.winner}`;

	let bValid: boolean;
	let cValid: boolean;
	if (anchor?.pubkeyA && anchor?.pubkeyB) {
		const bKey = op.broadcaster === anchor.playerA ? anchor.pubkeyA : anchor.pubkeyB;
		const cKey = op.broadcaster === anchor.playerA ? anchor.pubkeyB : anchor.pubkeyA;
		[bValid, cValid] = await Promise.all([
			deps.sigs.verifyAnchored(bKey, sigMessage, signatures.broadcasterSig),
			deps.sigs.verifyAnchored(cKey, sigMessage, signatures.counterpartySig),
		]);
	} else if (!genesis.sealed) {
		[bValid, cValid] = await Promise.all([
			deps.sigs.verifyCurrentKey(op.broadcaster, sigMessage, signatures.broadcasterSig),
			deps.sigs.verifyCurrentKey(details.counterparty, sigMessage, signatures.counterpartySig),
		]);
	} else {
		return reject('post-seal ranked match requires match_anchor with pinned pubkeys');
	}

	if (!bValid) return reject(`broadcaster signature failed for ${op.broadcaster}`);
	return !cValid
		? reject(`counterparty signature failed for ${details.counterparty}`)
		: null;
}

function extractMatchResultSignatures(
	op: ProtocolOp,
	isCompact: boolean,
): SignaturePair | OpResult {
	if (isCompact) {
		const sig = op.payload.sig as { b?: string; c?: string } | undefined;
		if (!sig?.b || !sig?.c) return reject('ranked match missing dual signatures');
		return { broadcasterSig: sig.b, counterpartySig: sig.c };
	}

	const sigs = op.payload.signatures as { broadcaster?: string; counterparty?: string } | undefined;
	if (!sigs?.broadcaster || !sigs?.counterparty) {
		return reject('ranked match missing dual signatures');
	}

	return {
		broadcasterSig: sigs.broadcaster,
		counterpartySig: sigs.counterparty,
	};
}

async function applyRankedMatchSettlement(
	op: ProtocolOp,
	details: MatchResultDetails,
	deps: ProtocolCoreDeps,
): Promise<OpResult | null> {
	if (details.matchType !== 'ranked' || !details.p2) {
		return null;
	}
	if (!details.matchId) {
		return reject('missing match id');
	}

	const loserAccount = details.winner === details.p1 ? details.p2 : details.p1;
	const sourceKey = createP2PRankedRuneSourceKey(details.matchId);
	const entryId = createRuneLedgerEntryId({
		seasonId: TESTNET_RUNE_SEASON_ID,
		direction: 'credit',
		sourceType: 'p2p_ranked',
		sourceKey,
	});
	const existingRuneEntry = await deps.state.getRuneLedgerEntry(entryId);
	if (existingRuneEntry) {
		return existingRuneEntry.account === details.winner
			? { status: 'ignored' }
			: reject('p2p ranked rune source already credited to a different account');
	}

	const winnerElo = await deps.state.getElo(details.winner);
	const loserElo = await deps.state.getElo(loserAccount);
	const expected = 1 / (1 + Math.pow(10, (loserElo.elo - winnerElo.elo) / 400));
	const newWinnerElo = Math.round(winnerElo.elo + ELO_K_FACTOR * (1 - expected));
	const newLoserElo = Math.max(
		Math.round(loserElo.elo + ELO_K_FACTOR * (0 - (1 - expected))),
		ELO_FLOOR,
	);

	await deps.state.putElo({ ...winnerElo, elo: newWinnerElo, wins: winnerElo.wins + 1 });
	await deps.state.putElo({ ...loserElo, elo: newLoserElo, losses: loserElo.losses + 1 });

	const accountEarned = await deps.state.getRuneLedgerTotal({
		seasonId: TESTNET_RUNE_SEASON_ID,
		direction: 'credit',
		sourceType: 'p2p_ranked',
		account: details.winner,
	});
	const globalEarned = await deps.state.getRuneLedgerTotal({
		seasonId: TESTNET_RUNE_SEASON_ID,
		direction: 'credit',
		sourceType: 'p2p_ranked',
	});
	const winnerRune = calculateCappedRuneCredit({
		requestedAmount: RUNE_WIN_RANKED,
		accountEarned,
		globalEarned,
		accountCap: TESTNET_RUNE_ECONOMY.maxP2PRunePerAccount,
		globalCap: TESTNET_RUNE_ECONOMY.p2pCap,
	});
	const ledgerResult = await putRuneLedgerEntryAndBalance(deps, {
		entryId,
		seasonId: TESTNET_RUNE_SEASON_ID,
		account: details.winner,
		direction: 'credit',
		sourceType: 'p2p_ranked',
		sourceKey,
		amount: winnerRune,
		trxId: op.trxId,
		blockNum: op.blockNum,
		timestamp: op.timestamp,
	});
	if (ledgerResult) return ledgerResult;

	const loserBal = await deps.state.getTokenBalance(loserAccount);
	await deps.state.putTokenBalance({ ...loserBal, RUNE: loserBal.RUNE + RUNE_LOSS_RANKED });

	return null;
}

async function applyWinnerCardXp(
	details: MatchResultDetails,
	deps: ProtocolCoreDeps,
): Promise<void> {
	if (!details.cardHex || !details.winner) {
		return;
	}

	const winnerCardIds = new Set(decodeCardIds(details.cardHex));
	const winnerNFTs = await deps.state.getCardsByOwner(details.winner);
	for (const nft of winnerNFTs) {
		if (!winnerCardIds.has(nft.cardId)) continue;
		const xpGain = getEconomicXPPerWin(nft.rarity);
		if (xpGain <= 0) continue;
		await deps.state.putCard({ ...nft, xp: nft.xp + xpGain });
	}
}

// ============================================================
// campaign_result
// ============================================================

interface CampaignResultPayloadFields {
	campaignId: string;
	missionId: string;
	difficulty: CampaignDifficulty;
	nonce: number;
	localRunId: string;
	localStartedAt: number;
	rulesetHash: string;
	transcriptRoot: string;
	transcriptCid?: string;
	finalStateHash: string;
	turnCount: number;
}

function readStringField(
	payload: Record<string, unknown>,
	key: string,
): string | OpResult {
	const value = payload[key];
	if (typeof value !== 'string' || value.length === 0) {
		return reject(`missing ${key}`);
	}
	return value;
}

function readPositiveIntegerField(
	payload: Record<string, unknown>,
	key: string,
): number | OpResult {
	const value = payload[key];
	if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
		return reject(`invalid ${key}`);
	}
	return value;
}

function readCampaignDifficulty(value: string): CampaignDifficulty | OpResult {
	if (value === 'normal' || value === 'heroic' || value === 'mythic') return value;
	return reject(`invalid difficulty: ${value}`);
}

function parseCampaignResultPayload(op: ProtocolOp): CampaignResultPayloadFields | OpResult {
	const campaignId = readStringField(op.payload, 'cid');
	if (isOpResult(campaignId)) return campaignId;

	const missionId = readStringField(op.payload, 'm');
	if (isOpResult(missionId)) return missionId;

	const difficultyRaw = readStringField(op.payload, 'd');
	if (isOpResult(difficultyRaw)) return difficultyRaw;

	const difficulty = readCampaignDifficulty(difficultyRaw);
	if (isOpResult(difficulty)) return difficulty;

	const nonce = readPositiveIntegerField(op.payload, 'n');
	if (isOpResult(nonce)) return nonce;

	const localRunId = readStringField(op.payload, 'rid');
	if (isOpResult(localRunId)) return localRunId;

	const localStartedAt = readPositiveIntegerField(op.payload, 'lst');
	if (isOpResult(localStartedAt)) return localStartedAt;

	const rulesetHash = readStringField(op.payload, 'rh');
	if (isOpResult(rulesetHash)) return rulesetHash;

	const transcriptRoot = readStringField(op.payload, 'tr');
	if (isOpResult(transcriptRoot)) return transcriptRoot;

	const finalStateHash = readStringField(op.payload, 'fh');
	if (isOpResult(finalStateHash)) return finalStateHash;

	const turnCount = readPositiveIntegerField(op.payload, 't');
	if (isOpResult(turnCount)) return turnCount;

	const transcriptCidValue = op.payload.tc;
	const transcriptCid = typeof transcriptCidValue === 'string' && transcriptCidValue.length > 0
		? transcriptCidValue
		: undefined;

	return {
		campaignId,
		missionId,
		difficulty,
		nonce,
		localRunId,
		localStartedAt,
		rulesetHash,
		transcriptRoot,
		transcriptCid,
		finalStateHash,
		turnCount,
	};
}

function getCampaignSubmissionKey(
	account: string,
	campaignId: string,
	missionId: string,
	difficulty: CampaignDifficulty,
	nonce: number,
): string {
	return `${account}:${campaignId}:${missionId}:${difficulty}:${nonce}`;
}

function calculateCampaignStars(
	turnCount: number,
	thresholds: { threeStar: number; twoStar: number },
): number {
	if (turnCount <= thresholds.threeStar) return 3;
	if (turnCount <= thresholds.twoStar) return 2;
	return 1;
}

async function deriveCampaignSeed(args: {
	account: string;
	campaignId: string;
	missionId: string;
	difficulty: CampaignDifficulty;
	nonce: number;
	localRunId: string;
	localStartedAt: number;
	rulesetHash: string;
}): Promise<string> {
	return sha256Hash(canonicalStringify({
		account: args.account,
		campaignId: args.campaignId,
		difficulty: args.difficulty,
		domain: 'ragnarok:campaign:v1',
		localRunId: args.localRunId,
		localStartedAt: args.localStartedAt,
		missionId: args.missionId,
		nonce: args.nonce,
		rulesetHash: args.rulesetHash,
	}));
}

async function applyCampaignResult(
	op: ProtocolOp,
	deps: ProtocolCoreDeps,
): Promise<OpResult> {
	const parsed = parseCampaignResultPayload(op);
	if (isOpResult(parsed)) return parsed;

	const registryHash = deps.campaigns.getRegistryHash();
	const registryCampaignId = deps.campaigns.getCampaignId();
	if (parsed.campaignId !== registryCampaignId) {
		return reject(`campaign id mismatch: expected=${registryCampaignId}`);
	}

	if (parsed.rulesetHash !== registryHash) {
		return reject(`campaign ruleset hash mismatch: expected=${registryHash}`);
	}

	const mission = deps.campaigns.getMission(parsed.missionId);
	if (!mission) return reject(`unknown campaign mission: ${parsed.missionId}`);
	if (mission.campaignId !== parsed.campaignId) {
		return reject(`mission ${parsed.missionId} does not belong to campaign ${parsed.campaignId}`);
	}
	if (!mission.allowedDifficulties.includes(parsed.difficulty)) {
		return reject(`difficulty not allowed for ${parsed.missionId}: ${parsed.difficulty}`);
	}

	for (const prerequisiteId of mission.prerequisiteIds) {
		const progress = await deps.state.getCampaignProgress(op.broadcaster, parsed.campaignId, prerequisiteId);
		if (!progress) {
			return reject(`campaign prerequisite not met: ${prerequisiteId}`);
		}
	}

	const submissionKey = getCampaignSubmissionKey(
		op.broadcaster,
		parsed.campaignId,
		parsed.missionId,
		parsed.difficulty,
		parsed.nonce,
	);
	if (await deps.state.getCampaignSubmission(submissionKey)) {
		return { status: 'ignored' };
	}

	const nonceOk = await deps.state.advanceCampaignNonce(op.broadcaster, parsed.nonce);
	if (!nonceOk) {
		return reject(`campaign nonce ${parsed.nonce} not higher than last seen`);
	}

	const seed = await deriveCampaignSeed({
		account: op.broadcaster,
		campaignId: parsed.campaignId,
		missionId: parsed.missionId,
		difficulty: parsed.difficulty,
		nonce: parsed.nonce,
		localRunId: parsed.localRunId,
		localStartedAt: parsed.localStartedAt,
		rulesetHash: parsed.rulesetHash,
	});

	const stars = calculateCampaignStars(parsed.turnCount, mission.starThresholds);
	const submission: CampaignSubmissionRecord = {
		submissionKey,
		account: op.broadcaster,
		campaignId: parsed.campaignId,
		missionId: parsed.missionId,
		difficulty: parsed.difficulty,
		nonce: parsed.nonce,
		localRunId: parsed.localRunId,
		localStartedAt: parsed.localStartedAt,
		rulesetHash: parsed.rulesetHash,
		seed,
		turnCount: parsed.turnCount,
		stars,
		transcriptRoot: parsed.transcriptRoot,
		transcriptCid: parsed.transcriptCid,
		finalStateHash: parsed.finalStateHash,
		status: 'queued',
		trxId: op.trxId,
		blockNum: op.blockNum,
		timestamp: op.timestamp,
	};

	await deps.state.putCampaignSubmission(submission);
	return { status: 'applied' };
}

function decodeCardIds(hex: string): number[] {
	const ids: number[] = [];
	for (let i = 0; i + 4 <= hex.length; i += 4) {
		ids.push(parseInt(hex.slice(i, i + 4), 16));
	}
	return ids;
}

// ============================================================
// queue_join
// ============================================================

async function applyQueueJoin(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	// PoW required
	const powResult = await verifyPowField(op, POW_CONFIG.QUEUE_JOIN);
	if (powResult) return powResult;

	const QUEUE_EXPIRY_MS = 10 * 60 * 1000;
	const existing = await deps.state.getQueueEntry(op.broadcaster);
	if (existing && (op.timestamp - existing.timestamp) <= QUEUE_EXPIRY_MS) {
		return { status: 'ignored' }; // still active
	}
	if (existing) {
		await deps.state.deleteQueueEntry(op.broadcaster);
	}

	const chainElo = await deps.state.getElo(op.broadcaster);
	await deps.state.putQueueEntry(op.broadcaster, {
		mode: (op.payload.mode as string) ?? 'ranked',
		elo: chainElo.elo,
		peerId: (op.payload.peer_id as string) ?? '',
		deckHash: (op.payload.deck_hash as string) ?? '',
		timestamp: op.timestamp,
		blockNum: op.blockNum,
	});

	return { status: 'applied' };
}

// ============================================================
// queue_leave
// ============================================================

async function applyQueueLeave(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	await deps.state.deleteQueueEntry(op.broadcaster);
	return { status: 'applied' };
}

// ============================================================
// reward_claim
// ============================================================

async function applyRewardClaim(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const rewardId = op.payload.reward_id as string;
	if (!rewardId) return reject('missing reward_id');

	const genesis = await deps.state.getGenesis();
	if (!genesis) return reject('no genesis');

	if (rewardId.startsWith('campaign:')) {
		return applyCampaignRewardClaim(op, rewardId, deps);
	}

	const reward = deps.rewards.getRewardById(rewardId);
	if (!reward) return reject(`unknown reward: ${rewardId}`);

	if (await deps.state.hasRewardClaim(op.broadcaster, rewardId)) {
		return { status: 'ignored' }; // already claimed
	}

	const elo = await deps.state.getElo(op.broadcaster);
	if (!checkRewardCondition(reward.condition, elo)) {
		return reject(`condition not met for ${rewardId}`);
	}

	const runeResult = await applyRewardRuneBonus(op, reward, deps);
	if (runeResult) return runeResult;
	await mintRewardCards(op, rewardId, reward, deps);

	await deps.state.putRewardClaim(op.broadcaster, rewardId, op.blockNum);
	return { status: 'applied' };
}

async function applyCampaignRewardClaim(
	op: ProtocolOp,
	rewardId: string,
	deps: ProtocolCoreDeps,
): Promise<OpResult> {
	const [, campaignId, missionId] = rewardId.split(':');
	if (!campaignId || !missionId) {
		return reject('campaign reward id must be campaign:{campaignId}:{missionId}');
	}

	const alreadyClaimed = await deps.state.hasRewardClaim(op.broadcaster, rewardId);
	const progress = await deps.state.getCampaignProgress(op.broadcaster, campaignId, missionId);
	if (!progress) {
		return alreadyClaimed
			? { status: 'ignored' }
			: reject(`campaign reward condition not met for ${campaignId}:${missionId}`);
	}

	const runeResult = await applyCampaignFirstClearRuneCredit(op, progress, deps);
	if (runeResult) return runeResult;
	if (alreadyClaimed) {
		return { status: 'ignored' };
	}

	await deps.state.putRewardClaim(op.broadcaster, rewardId, op.blockNum);
	return { status: 'applied' };
}

async function applyCampaignFirstClearRuneCredit(
	op: ProtocolOp,
	progress: CampaignProgressRecord,
	deps: ProtocolCoreDeps,
): Promise<OpResult | null> {
	const requestedAmount = getCampaignFirstClearRuneReward(progress.missionId);
	if (requestedAmount <= 0) {
		return null;
	}

	const sourceKey = createCampaignFirstClearRuneSourceKey(
		progress.account,
		progress.campaignId,
		progress.missionId,
	);
	const entryId = createRuneLedgerEntryId({
		seasonId: TESTNET_RUNE_SEASON_ID,
		direction: 'credit',
		sourceType: 'campaign_first_clear',
		sourceKey,
	});
	const existingRuneEntry = await deps.state.getRuneLedgerEntry(entryId);
	if (existingRuneEntry) {
		return existingRuneEntry.account === progress.account
			? null
			: reject('campaign first-clear rune source already credited to a different account');
	}

	const accountEarned = await deps.state.getRuneLedgerTotal({
		seasonId: TESTNET_RUNE_SEASON_ID,
		direction: 'credit',
		sourceType: 'campaign_first_clear',
		account: progress.account,
	});
	const globalEarned = await deps.state.getRuneLedgerTotal({
		seasonId: TESTNET_RUNE_SEASON_ID,
		direction: 'credit',
		sourceType: 'campaign_first_clear',
	});
	const runeAmount = calculateCappedRuneCredit({
		requestedAmount,
		accountEarned,
		globalEarned,
		accountCap: TESTNET_RUNE_ECONOMY.maxCampaignRunePerAccount,
		globalCap: TESTNET_RUNE_ECONOMY.campaignCap,
	});

	const ledgerResult = await putRuneLedgerEntryAndBalance(deps, {
		entryId,
		seasonId: TESTNET_RUNE_SEASON_ID,
		account: progress.account,
		direction: 'credit',
		sourceType: 'campaign_first_clear',
		sourceKey,
		amount: runeAmount,
		trxId: op.trxId,
		blockNum: op.blockNum,
		timestamp: op.timestamp,
	});
	if (ledgerResult) return ledgerResult;

	return null;
}

async function mintRewardCards(
	op: ProtocolOp,
	rewardId: string,
	reward: RewardDefinition,
	deps: ProtocolCoreDeps,
): Promise<void> {
	for (let i = 0; i < reward.cards.length; i++) {
		const rc = reward.cards[i];
		const uid = `reward-${rewardId}-${op.broadcaster}-${i}`;
		if (await deps.state.getCard(uid)) continue;

		const supply = await deps.state.getSupply(rc.rarity, 'reward');
		if (supply && supply.minted >= supply.cap) continue;

		const cardKey = `card:${rc.cardId}`;
		const cardSupply = await deps.state.getSupply(cardKey, 'reward');
		const cardMinted = cardSupply?.minted ?? 0;
		const cap = supply?.cap ?? Infinity;
		if (cardMinted >= cap) continue;

		await deps.state.putCard({
			uid,
			cardId: rc.cardId,
			owner: op.broadcaster,
			rarity: rc.rarity,
			level: 1,
			xp: 0,
			edition: 'alpha',
			mintSource: 'reward',
			mintTrxId: op.trxId,
			mintBlockNum: op.blockNum,
			lastTransferBlock: op.blockNum,
		});

		if (supply) {
			await deps.state.putSupply({ ...supply, minted: supply.minted + 1 });
		}

		await deps.state.putSupply({ key: cardKey, pool: 'reward', cap, minted: cardMinted + 1 });
	}
}

async function applyRewardRuneBonus(
	op: ProtocolOp,
	reward: RewardDefinition,
	deps: ProtocolCoreDeps,
): Promise<OpResult | null> {
	if (reward.runeBonus <= 0) {
		return null;
	}

	const sourceKey = createRewardClaimRuneSourceKey(op.broadcaster, reward.id);
	const entryId = createRuneLedgerEntryId({
		seasonId: TESTNET_RUNE_SEASON_ID,
		direction: 'credit',
		sourceType: 'reward_claim',
		sourceKey,
	});
	const existingEntry = await deps.state.getRuneLedgerEntry(entryId);
	if (existingEntry) {
		return existingEntry.account === op.broadcaster
			? null
			: reject('reward claim rune source already credited to a different account');
	}

	const ledgerResult = await putRuneLedgerEntryAndBalance(deps, {
		entryId,
		seasonId: TESTNET_RUNE_SEASON_ID,
		account: op.broadcaster,
		direction: 'credit',
		sourceType: 'reward_claim',
		sourceKey,
		amount: reward.runeBonus,
		trxId: op.trxId,
		blockNum: op.blockNum,
		timestamp: op.timestamp,
	});
	if (ledgerResult) return ledgerResult;
	return null;
}

function checkRewardCondition(
	condition: { type: string; value: number },
	elo: EloRecord,
): boolean {
	switch (condition.type) {
		case 'wins_milestone': return elo.wins >= condition.value;
		case 'elo_milestone': return elo.elo >= condition.value;
		case 'matches_played': return (elo.wins + elo.losses) >= condition.value;
		default: return false;
	}
}

// ============================================================
// rune_exchange
// ============================================================

async function applyRuneExchange(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const genesis = await deps.state.getGenesis();
	if (!genesis?.sealed) return reject('rune_exchange requires sealed genesis');

	const details = parseRuneExchangeDetails(op, deps.runeExchange);
	if (isOpResult(details)) return details;

	const existingEntry = await deps.state.getRuneLedgerEntry(details.entryId);
	if (existingEntry) {
		if (existingEntry.account !== op.broadcaster) {
			return reject('rune_exchange source already spent by a different account');
		}

		await deps.runeExchange.fulfill({
			seasonId: TESTNET_RUNE_SEASON_ID,
			account: op.broadcaster,
			sourceKey: details.sourceKey,
			packType: details.packType,
			quantity: details.quantity,
			totalCost: existingEntry.amount,
			trxId: op.trxId,
			blockNum: op.blockNum,
			timestamp: op.timestamp,
		});
		return { status: 'ignored' };
	}

	const balance = await deps.state.getTokenBalance(op.broadcaster);
	if (balance.RUNE < details.totalCost) {
		return reject('insufficient RUNE balance');
	}

	const limitResult = await validateRuneExchangeLimits(op.broadcaster, details, deps);
	if (limitResult) return limitResult;

	const ledgerResult = await putRuneLedgerEntryAndBalance(deps, {
		entryId: details.entryId,
		seasonId: TESTNET_RUNE_SEASON_ID,
		account: op.broadcaster,
		direction: 'debit',
		sourceType: 'rune_exchange',
		sourceKey: details.sourceKey,
		amount: details.totalCost,
		trxId: op.trxId,
		blockNum: op.blockNum,
		timestamp: op.timestamp,
	});
	if (ledgerResult) return ledgerResult;
	await deps.runeExchange.fulfill({
		seasonId: TESTNET_RUNE_SEASON_ID,
		account: op.broadcaster,
		sourceKey: details.sourceKey,
		packType: details.packType,
		quantity: details.quantity,
		totalCost: details.totalCost,
		trxId: op.trxId,
		blockNum: op.blockNum,
		timestamp: op.timestamp,
	});

	return { status: 'applied' };
}

function parseRuneExchangeDetails(
	op: ProtocolOp,
	runeExchange: RuneExchangeAdapter,
): RuneExchangeDetails | OpResult {
	const packTypeValue = op.payload.pack_type ?? op.payload.packType;
	if (typeof packTypeValue !== 'string') {
		return reject('missing pack_type');
	}

	const quantity = Number(op.payload.quantity ?? 1);
	if (!Number.isInteger(quantity) || quantity < 1) {
		return reject('quantity must be a positive integer');
	}

	const quote = runeExchange.getQuote({ packType: packTypeValue, quantity });
	if (!quote) {
		return reject(`invalid rune_exchange pack_type: ${packTypeValue}`);
	}
	if (quote.totalCost > TESTNET_RUNE_ECONOMY.maxRuneExchangeSpendPerOp) {
		return reject('rune_exchange spend exceeds per-op cap');
	}

	const sourceKey = createRuneExchangeSourceKey(
		op.broadcaster,
		op.trxId,
		quote.packType,
		quote.quantity,
	);
	const entryId = createRuneLedgerEntryId({
		seasonId: TESTNET_RUNE_SEASON_ID,
		direction: 'debit',
		sourceType: 'rune_exchange',
		sourceKey,
	});

	return {
		packType: quote.packType,
		quantity: quote.quantity,
		runeCost: quote.runeCost,
		totalCost: quote.totalCost,
		accountLimit: quote.accountLimit,
		globalPackCap: quote.globalPackCap,
		sourceKey,
		entryId,
	};
}

async function validateRuneExchangeLimits(
	account: string,
	details: RuneExchangeDetails,
	deps: ProtocolCoreDeps,
): Promise<OpResult | null> {
	const redeemedQuantity = await getRedeemedRuneExchangeQuantity(account, details.packType, deps);
	if (redeemedQuantity + details.quantity > details.accountLimit) {
		return reject(`rune_exchange account limit reached for ${details.packType}`);
	}

	const minted = await deps.runeExchange.getGlobalMinted({ packType: details.packType });
	if (minted + details.quantity > details.globalPackCap) {
		return reject(`rune_exchange pack cap reached for ${details.packType}`);
	}

	return null;
}

async function getRedeemedRuneExchangeQuantity(
	account: string,
	packType: string,
	deps: ProtocolCoreDeps,
): Promise<number> {
	const entries = await deps.state.getRuneLedgerEntries({
		seasonId: TESTNET_RUNE_SEASON_ID,
		direction: 'debit',
		sourceType: 'rune_exchange',
		account,
		sourceKeyPrefix: `pack:${TESTNET_RUNE_SEASON_ID}:${account}:`,
	});

	let quantity = 0;
	for (const entry of entries) {
		const parsed = parseRuneExchangeSourceKey(entry.sourceKey);
		if (parsed?.packType !== packType) continue;
		quantity += parsed.quantity;
	}
	return quantity;
}

function parseRuneExchangeSourceKey(sourceKey: string): { packType: string; quantity: number } | null {
	const parts = sourceKey.split(':');
	if (parts.length !== 6 || parts[0] !== 'pack') return null;
	const quantity = Number(parts[5]);
	if (!Number.isInteger(quantity) || quantity < 1) return null;
	return { packType: parts[4], quantity };
}

// ============================================================
// pack_commit (v1 new flow)
// ============================================================

async function applyPackCommit(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const genesis = await deps.state.getGenesis();
	if (!genesis) return reject('no genesis');

	const saltCommit = op.payload.salt_commit as string;
	const packType = (op.payload.pack_type as string) ?? 'standard';
	const quantity = Math.min(Number(op.payload.quantity ?? 1), 10);
	const packDefinition = getPackDefinition(packType);

	if (!saltCommit) return reject('missing salt_commit');
	if (!packDefinition?.isActive) return reject(`invalid pack_type: ${packType}`);
	if (packDefinition.key === 'starter') return reject('starter is a signed one-time claim, not a repeatable pack open');

	const existing = await deps.state.getPackCommit(op.trxId);
	if (existing) return { status: 'ignored' }; // idempotent

	await deps.state.putPackCommit({
		trxId: op.trxId,
		account: op.broadcaster,
		packType,
		quantity,
		saltCommit,
		commitBlock: op.blockNum,
		revealed: false,
	});

	return { status: 'applied' };
}

// ============================================================
// pack_reveal (v1 new flow)
// ============================================================

async function applyPackReveal(
	op: ProtocolOp, ctx: ReplayContext, deps: ProtocolCoreDeps,
): Promise<OpResult> {
	const commitTrxId = op.payload.commit_trx_id as string;
	const userSalt = op.payload.user_salt as string;
	if (!commitTrxId || !userSalt) return reject('missing commit_trx_id or user_salt');

	const commit = await deps.state.getPackCommit(commitTrxId);
	if (!commit) return reject('no matching pack_commit');
	if (commit.revealed) return { status: 'ignored' }; // already revealed
	if (commit.account !== op.broadcaster) return reject('not the committer');
	if (commit.packType === 'starter') return reject('starter is a signed one-time claim, not a repeatable pack open');

	// Verify salt
	const expectedSaltCommit = await sha256Hash(userSalt);
	if (expectedSaltCommit !== commit.saltCommit) {
		return reject('salt does not match commitment');
	}

	// Entropy block must be irreversible
	const entropyBlock = commit.commitBlock + PACK_ENTROPY_DELAY_BLOCKS;
	if (entropyBlock > ctx.lastIrreversibleBlock) {
		return reject('entropy block not yet irreversible');
	}

	// Deadline check
	const deadline = commit.commitBlock + PACK_REVEAL_DEADLINE_BLOCKS;
	if (op.blockNum > deadline) {
		return reject('reveal past deadline — auto-finalize should have occurred');
	}

	const entropyBlockId = await ctx.getBlockId(entropyBlock);
	if (!entropyBlockId) return reject('entropy block id unavailable');

	const seed = await sha256Hash(`${userSalt}${commitTrxId}${entropyBlockId}1`);

	// Mark revealed
	await deps.state.putPackCommit({ ...commit, revealed: true });

	// Deterministic card draw from seed against pack_supply
	await drawPackCards(seed, commit.packType, commit.quantity, commit.account, op.trxId, op.blockNum, deps);

	return { status: 'applied' };
}

// ============================================================
// Shared pack card draw (used by reveal + auto-finalize)
// ============================================================

// PACK_SIZES imported from ./types; PACK_ID_RANGES + lcgNext imported from ./packDraw

async function drawPackCards(
	seedHex: string,
	packType: string,
	quantity: number,
	owner: string,
	trxId: string,
	blockNum: number,
	deps: ProtocolCoreDeps,
): Promise<number> {
	const ranges = PACK_ID_RANGES[packType] ?? PACK_ID_RANGES.standard;
	const mintableIds = deps.cards.getCollectibleIdsInRanges(ranges);
	if (mintableIds.length === 0) return 0;

	const cardCount = (PACK_SIZES[packType] ?? 5) * quantity;

	// Use first 8 chars of SHA-256 seed as LCG starting point
	let s = parseInt(seedHex.slice(0, 8), 16) || 1;
	s = Math.max(s, 1);

	let minted = 0;
	for (let i = 0; i < cardCount; i++) {
		const uid = `${trxId}:${i}`;
		const existing = await deps.state.getCard(uid);
		if (existing) continue;
		let mintContext: {
			cardId: number;
			rarity: string;
			supply: Awaited<ReturnType<StateAdapter['getSupply']>>;
			cardKey: string;
			cardMinted: number;
			perCardCap: number;
		} | null = null;

		for (let attempts = 0; attempts < mintableIds.length; attempts++) {
			s = lcgNext(s);
			const cardId = mintableIds[s % mintableIds.length];
			const cardDef = deps.cards.getCardById(cardId);
			if (!cardDef) continue;

			const rarity = cardDef.rarity || 'common';
			const supply = await deps.state.getSupply(rarity, 'pack');
			if (supply && supply.minted >= supply.cap) continue;

			const cardKey = `card:${cardId}`;
			const cardSupply = await deps.state.getSupply(cardKey, 'pack');
			const cardMinted = cardSupply?.minted ?? 0;
			const perCardCap = cardSupply?.cap ?? (RARITY_CARD_CAPS[rarity.toLowerCase()] ?? 2000);
			if (cardMinted >= perCardCap) continue;

			mintContext = { cardId, rarity, supply, cardKey, cardMinted, perCardCap };
			break;
		}
		if (!mintContext) break;

		await deps.state.putCard({
			uid,
			cardId: mintContext.cardId,
			owner,
			rarity: mintContext.rarity,
			level: 1,
			xp: 0,
			edition: 'alpha',
			mintSource: 'pack',
			mintTrxId: trxId,
			mintBlockNum: blockNum,
			lastTransferBlock: blockNum,
		});

		if (mintContext.supply) {
			await deps.state.putSupply({ ...mintContext.supply, minted: mintContext.supply.minted + 1 });
		}
		await deps.state.putSupply({
			key: mintContext.cardKey,
			pool: 'pack',
			cap: mintContext.perCardCap,
			minted: mintContext.cardMinted + 1,
		});
		minted++;
	}

	return minted;
}

// ============================================================
// Auto-finalize expired pack commits
//
// Called by the block scanner after each block. Checks for any
// unrevealed commits whose deadline has passed and finalizes
// them with the deterministic forfeit seed.
//
// Spec formula: seed = sha256(commit_trx_id + entropy_block_id + "forfeit")
// ============================================================

export async function autoFinalizeExpiredCommits(
	currentBlock: number,
	ctx: ReplayContext,
	deps: ProtocolCoreDeps,
): Promise<number> {
	// Only finalize commits whose deadline block <= currentBlock AND currentBlock <= LIB
	if (currentBlock > ctx.lastIrreversibleBlock) return 0;

	const expired = await deps.state.getUnrevealedCommitsBefore(currentBlock);
	let finalized = 0;

	for (const commit of expired) {
		const deadline = commit.commitBlock + PACK_REVEAL_DEADLINE_BLOCKS;
		if (currentBlock < deadline) continue; // not yet expired

		const entropyBlock = commit.commitBlock + PACK_ENTROPY_DELAY_BLOCKS;
		if (entropyBlock > ctx.lastIrreversibleBlock) continue; // entropy not yet irreversible

		const entropyBlockId = await ctx.getBlockId(entropyBlock);
		if (!entropyBlockId) continue; // RPC unavailable — retry later

		// Forfeit seed: no user salt (they never revealed it)
		const forfeitSeed = await sha256Hash(`${commit.trxId}${entropyBlockId}forfeit`);

		// Mark as revealed (auto-finalized)
		await deps.state.putPackCommit({ ...commit, revealed: true });

		// Draw cards with forfeit seed
		await drawPackCards(
			forfeitSeed, commit.packType, commit.quantity,
			commit.account, `${commit.trxId}:forfeit`, commit.commitBlock,
			deps,
		);

		finalized++;
	}

	return finalized;
}

// ============================================================
// forge_commit / forge_reveal (ADR 0001 §3)
// ============================================================

async function applyForgeCommit(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const genesis = await deps.state.getGenesis();
	if (!genesis) return reject('no genesis');

	const rawRarity = op.payload.rarity;
	const rawSaltCommit = op.payload.salt_commit;
	if (typeof rawRarity !== 'string') return reject('missing rarity');
	if (typeof rawSaltCommit !== 'string' || rawSaltCommit.length === 0) {
		return reject('missing salt_commit');
	}
	const rarity = rawRarity.toLowerCase();
	const cost = getEitrForgeCost(rarity);
	if (cost <= 0) return reject(`invalid rarity: ${rarity}`);

	const existing = await deps.state.getForgeCommit(op.trxId);
	if (existing) return { status: 'ignored' };

	const balance = await getEitrBalanceFor(deps, op.broadcaster);
	if (balance < cost) return reject('insufficient Eitr');

	const supply = await deps.state.getSupply(rarity, 'pack');
	if (!supply) return reject('genesis supply missing for rarity');

	const sourceKey = createForgeCommitEitrSourceKey({
		seasonId: TESTNET_EITR_SEASON_ID,
		account: op.broadcaster,
		trxId: op.trxId,
	});
	const entryId = createEitrLedgerEntryId({
		seasonId: TESTNET_EITR_SEASON_ID,
		direction: 'debit',
		sourceType: 'forge_commit',
		sourceKey,
	});

	// Ledger debit → commit record (in this order, idempotent recovery on crash).
	await deps.state.putEitrLedgerEntry({
		entryId,
		seasonId: TESTNET_EITR_SEASON_ID,
		account: op.broadcaster,
		direction: 'debit',
		sourceType: 'forge_commit',
		sourceKey,
		amount: cost,
		balanceBefore: balance,
		balanceAfter: balance - cost,
		trxId: op.trxId,
		blockNum: op.blockNum,
		timestamp: op.timestamp,
	});
	await deps.state.putForgeCommit({
		trxId: op.trxId,
		account: op.broadcaster,
		rarity,
		saltCommit: rawSaltCommit,
		commitBlock: op.blockNum,
		debitAmount: cost,
		revealed: false,
	});

	return { status: 'applied' };
}

async function applyForgeReveal(op: ProtocolOp, ctx: ReplayContext, deps: ProtocolCoreDeps): Promise<OpResult> {
	const rawCommitTrxId = op.payload.commit_trx_id;
	const rawUserSalt = op.payload.user_salt;
	if (typeof rawCommitTrxId !== 'string' || typeof rawUserSalt !== 'string') {
		return reject('missing commit_trx_id or user_salt');
	}

	const commit = await deps.state.getForgeCommit(rawCommitTrxId);
	if (!commit) return reject('no matching forge_commit');
	if (commit.revealed) return { status: 'ignored' };
	if (commit.account !== op.broadcaster) return reject('not the committer');

	const expectedSaltCommit = await sha256Hash(rawUserSalt);
	if (expectedSaltCommit !== commit.saltCommit) return reject('salt does not match commitment');

	const entropyBlock = commit.commitBlock + PACK_ENTROPY_DELAY_BLOCKS;
	if (entropyBlock > ctx.lastIrreversibleBlock) return reject('entropy block not yet irreversible');

	const deadline = commit.commitBlock + PACK_REVEAL_DEADLINE_BLOCKS;
	if (op.blockNum > deadline) return reject('reveal past deadline — auto-finalize should have occurred');

	const entropyBlockId = await ctx.getBlockId(entropyBlock);
	if (!entropyBlockId) return reject('entropy block id unavailable');

	const seed = await sha256Hash(`${rawUserSalt}${rawCommitTrxId}${entropyBlockId}forge`);
	await deps.state.putForgeCommit({ ...commit, revealed: true });

	const minted = await drawForgeCard(seed, commit, op.broadcaster, op.trxId, op.blockNum, deps);
	if (minted) return { status: 'applied' };

	// Exhaustion → refund Eitr (credit reversal).
	await creditForgeRefund(commit, op, deps);
	return { status: 'applied' };
}

// Draw a single card_id for forge: iterate available cards in the rarity,
// skipping per-card caps. Returns true on successful mint.
async function drawForgeCard(
	seedHex: string,
	commit: ForgeCommitRecord,
	owner: string,
	trxId: string,
	blockNum: number,
	deps: ProtocolCoreDeps,
): Promise<boolean> {
	// Forge draws from the full collectible pool; per-card and rarity filters happen inline.
	const allRanges: readonly [number, number][] = [
		[1000, 2999], [3000, 3999], [4000, 4999], [5000, 5999], [6000, 6999],
		[7000, 7999], [8000, 8999], [20000, 29799], [30001, 30410], [31001, 31999], [50000, 50376],
	];
	const mintableIds = deps.cards.getCollectibleIdsInRanges(allRanges);
	if (mintableIds.length === 0) return false;

	let s = parseInt(seedHex.slice(0, 8), 16) || 1;
	s = Math.max(s, 1);

	for (let attempts = 0; attempts < mintableIds.length; attempts++) {
		s = lcgNext(s);
		const cardId = mintableIds[s % mintableIds.length];
		const cardDef = deps.cards.getCardById(cardId);
		if (!cardDef) continue;
		if ((cardDef.rarity || 'common').toLowerCase() !== commit.rarity) continue;

		const rarity = commit.rarity;
		const rarSupply = await deps.state.getSupply(rarity, 'pack');
		if (!rarSupply || rarSupply.minted >= rarSupply.cap) continue;

		const cardKey = `card:${cardId}`;
		const cardSupply = await deps.state.getSupply(cardKey, 'pack');
		const cardMinted = cardSupply?.minted ?? 0;
		const perCardCap = cardSupply?.cap ?? 2000;
		if (cardMinted >= perCardCap) continue;

		const uid = `forge:${trxId}`;
		await deps.state.putCard({
			uid,
			cardId,
			owner,
			rarity,
			level: 1,
			xp: 0,
			edition: 'alpha',
			mintSource: 'forge',
			mintTrxId: trxId,
			mintBlockNum: blockNum,
			lastTransferBlock: blockNum,
		});
		await deps.state.putSupply({ ...rarSupply, minted: rarSupply.minted + 1 });
		await deps.state.putSupply({
			key: cardKey, pool: 'pack', cap: perCardCap, minted: cardMinted + 1,
		});
		return true;
	}
	return false;
}

async function creditForgeRefund(commit: ForgeCommitRecord, op: ProtocolOp, deps: ProtocolCoreDeps): Promise<void> {
	const sourceKey = createForgeRefundEitrSourceKey({
		seasonId: TESTNET_EITR_SEASON_ID,
		account: commit.account,
		revealTrxId: op.trxId,
	});
	const entryId = createEitrLedgerEntryId({
		seasonId: TESTNET_EITR_SEASON_ID,
		direction: 'credit',
		sourceType: 'forge_refund',
		sourceKey,
	});
	const balanceBefore = await getEitrBalanceFor(deps, commit.account);
	await deps.state.putEitrLedgerEntry({
		entryId,
		seasonId: TESTNET_EITR_SEASON_ID,
		account: commit.account,
		direction: 'credit',
		sourceType: 'forge_refund',
		sourceKey,
		amount: commit.debitAmount,
		balanceBefore,
		balanceAfter: balanceBefore + commit.debitAmount,
		trxId: op.trxId,
		blockNum: op.blockNum,
		timestamp: op.timestamp,
	});
}

// Auto-finalize unrevealed forge commits past deadline.
// Mirrors autoFinalizeExpiredCommits for pack — forfeit seed makes the outcome
// deterministic regardless of whether the player ever broadcasts the reveal.
export async function autoFinalizeExpiredForgeCommits(
	currentBlock: number,
	ctx: ReplayContext,
	deps: ProtocolCoreDeps,
): Promise<number> {
	if (currentBlock > ctx.lastIrreversibleBlock) return 0;

	const expired = await deps.state.getUnrevealedForgeCommitsBefore(currentBlock);
	let finalized = 0;

	for (const commit of expired) {
		const deadline = commit.commitBlock + PACK_REVEAL_DEADLINE_BLOCKS;
		if (currentBlock < deadline) continue;

		const entropyBlock = commit.commitBlock + PACK_ENTROPY_DELAY_BLOCKS;
		if (entropyBlock > ctx.lastIrreversibleBlock) continue;

		const entropyBlockId = await ctx.getBlockId(entropyBlock);
		if (!entropyBlockId) continue;

		const forfeitSeed = await sha256Hash(`${commit.trxId}${entropyBlockId}forfeit`);
		await deps.state.putForgeCommit({ ...commit, revealed: true });

		const forfeitTrxId = `${commit.trxId}:forfeit`;
		const minted = await drawForgeCard(
			forfeitSeed, commit, commit.account, forfeitTrxId, commit.commitBlock, deps,
		);
		if (!minted) {
			// Refund using a synthetic op for ledger trace
			const syntheticOp: ProtocolOp = {
				...({} as ProtocolOp),
				broadcaster: commit.account,
				trxId: forfeitTrxId,
				blockNum: commit.commitBlock + PACK_REVEAL_DEADLINE_BLOCKS,
				timestamp: 0,
				action: 'forge_reveal',
				payload: {},
				usedActiveAuth: false,
			};
			await creditForgeRefund(commit, syntheticOp, deps);
		}

		finalized++;
	}

	return finalized;
}

// ============================================================
// legacy_pack_open (pre-seal only, txid-seeded LCG)
// ============================================================

async function applyLegacyPackOpen(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const genesis = await deps.state.getGenesis();
	if (!genesis) return reject('no genesis');

	// Legacy pack_open is only valid BEFORE seal (v1 activation boundary)
	if (genesis.sealed) return reject('legacy pack_open rejected after seal');

	const packType = (op.payload.pack_type as string) ?? 'standard';
	const packDefinition = getPackDefinition(packType);
	if (packDefinition?.key === 'starter') return reject('starter is a signed one-time claim, not a legacy pack open');
	const quantity = Math.min(Number(op.payload.quantity ?? 1), 10);
	const seed = deriveLegacyPackSeed(op.trxId);
	const ranges = PACK_ID_RANGES[packType] ?? PACK_ID_RANGES.standard;
	const mintableIds = deps.cards.getCollectibleIdsInRanges(ranges);
	if (mintableIds.length === 0) return reject('no mintable cards for pack type');

	const cardIds = pickLegacyPackCardIds(seed, packType, quantity, mintableIds);
	const applied = await mintLegacyPackCards(op, cardIds, deps);
	return applied ? { status: 'applied' } : { status: 'ignored' };
}

async function mintLegacyPackCards(
	op: ProtocolOp,
	cardIds: number[],
	deps: ProtocolCoreDeps,
): Promise<boolean> {
	let applied = false;
	for (let i = 0; i < cardIds.length; i++) {
		const uid = `${op.trxId}-${i}`;
		if (await deps.state.getCard(uid)) continue;

		const cardDef = deps.cards.getCardById(cardIds[i]);
		if (!cardDef) continue;

		const rarity = cardDef.rarity || 'common';
		const supply = await deps.state.getSupply(rarity, 'pack');
		if (supply && supply.minted >= supply.cap) continue;

		await deps.state.putCard({
			uid,
			cardId: cardIds[i],
			owner: op.broadcaster,
			rarity,
			level: 1,
			xp: 0,
			edition: 'alpha',
			mintSource: 'pack',
			mintTrxId: op.trxId,
			mintBlockNum: op.blockNum,
			lastTransferBlock: op.blockNum,
		});

		if (supply) {
			await deps.state.putSupply({ ...supply, minted: supply.minted + 1 });
		}

		applied = true;
	}

	return applied;
}

// ============================================================
// v1.1: pack_mint — Create sealed pack NFTs into admin inventory
// ============================================================

async function applyPackMint(op: ProtocolOp, _ctx: ReplayContext, deps: ProtocolCoreDeps): Promise<OpResult> {
	if (op.broadcaster !== RAGNAROK_ADMIN_ACCOUNT) return reject('not admin account');

	const genesis = await deps.state.getGenesis();
	if (!genesis?.sealed) return reject('pack_mint requires sealed genesis');

	const packType = op.payload.pack_type as string;
	const quantity = Number(op.payload.quantity ?? 1);
	const packDefinition = getPackDefinition(packType);

	if (!packDefinition?.adminMintable || !PACK_SIZES[packType]) return reject(`invalid pack_type: ${packType}`);
	if (quantity < 1 || quantity > 10) return reject('quantity must be 1-10');

	for (let i = 0; i < quantity; i++) {
		const uid = `pack_${op.trxId}:${i}`;
		const dna = await sha256Hash(`${op.trxId}:${i}:${packType}`);

		const pack: PackAsset = {
			uid, packType, dna, owner: RAGNAROK_ADMIN_ACCOUNT, sealed: true,
			mintTrxId: op.trxId, mintBlockNum: op.blockNum,
			lastTransferBlock: op.blockNum,
			cardCount: PACK_SIZES[packType], edition: 'alpha',
		};
		await deps.state.putPack(pack);

		const supply = await deps.state.getPackSupply(packType);
		if (supply) {
			if (supply.cap > 0 && supply.minted >= supply.cap) return reject('pack supply cap reached');
			await deps.state.putPackSupply({ ...supply, minted: supply.minted + 1 });
		} else {
			await deps.state.putPackSupply({ packType, minted: 1, burned: 0, cap: 0 });
		}
	}

	return { status: 'applied' };
}

// ============================================================
// v1.1: pack_distribute — Admin distributes packs to players (atomic)
// ============================================================

async function applyPackDistribute(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	if (op.broadcaster !== RAGNAROK_ADMIN_ACCOUNT) return reject('not admin account');

	const packUids = op.payload.pack_uids as string[];
	const to = op.payload.to as string;
	if (!Array.isArray(packUids) || packUids.length === 0) return reject('missing pack_uids');
	if (!HIVE_USERNAME_RE.test(to)) return reject(`invalid recipient: ${to}`);

	// Atomic transfer validation
	const companion = await deps.state.getCompanionTransfer(op.trxId);
	if (!companion) return reject('missing atomic HIVE transfer');
	if (companion.amount !== ATOMIC_TRANSFER_AMOUNT) return reject('wrong atomic transfer amount');
	if (companion.to !== to) return reject('atomic transfer recipient mismatch');

	for (const uid of packUids) {
		const pack = await deps.state.getPack(uid);
		if (!pack) return reject(`pack ${uid} not found`);
		if (!pack.sealed) return reject(`pack ${uid} already opened`);
		if (pack.owner !== RAGNAROK_ADMIN_ACCOUNT) return reject(`pack ${uid} not in admin inventory`);

		await deps.state.putPack({ ...pack, owner: to, lastTransferBlock: op.blockNum });
	}

	return { status: 'applied' };
}

// ============================================================
// v1.1: pack_transfer — Admin-only sealed pack transfer (atomic)
//
// Restricted to RAGNAROK_ADMIN_ACCOUNT. Player-to-player pack transfers
// are NOT supported — packs are non-tradeable between players. Admin
// distribution at scale uses pack_distribute; this op handles one-off
// admin moves (treasury rebalancing, manual airdrops outside an event).
// ============================================================

async function applyPackTransfer(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	if (op.broadcaster !== RAGNAROK_ADMIN_ACCOUNT) return reject('pack_transfer restricted to admin');
	const packUid = op.payload.pack_uid as string;
	const to = op.payload.to as string;
	if (!packUid || !to) return reject('missing pack_uid or to');
	if (!HIVE_USERNAME_RE.test(to)) return reject(`invalid recipient: ${to}`);
	if (to === op.broadcaster) return reject('cannot transfer to self');

	const pack = await deps.state.getPack(packUid);
	if (!pack) return reject(`pack ${packUid} not found`);
	if (!pack.sealed) return reject('cannot transfer opened pack');
	if (pack.owner !== op.broadcaster) return reject('not pack owner');

	if (pack.lastTransferBlock && (op.blockNum - pack.lastTransferBlock) < TRANSFER_COOLDOWN_BLOCKS) {
		return reject('pack transfer cooldown');
	}

	// Atomic transfer validation
	const companion = await deps.state.getCompanionTransfer(op.trxId);
	if (!companion) return reject('missing atomic HIVE transfer');
	if (companion.amount !== ATOMIC_TRANSFER_AMOUNT) return reject('wrong atomic transfer amount');
	if (companion.to !== to) return reject('atomic transfer recipient mismatch');

	await deps.state.putPack({ ...pack, owner: to, lastTransferBlock: op.blockNum });
	return { status: 'applied' };
}

// ============================================================
// v1.1: pack_burn — Open pack (burn NFT, derive cards)
// ============================================================

async function applyPackBurn(op: ProtocolOp, ctx: ReplayContext, deps: ProtocolCoreDeps): Promise<OpResult> {
	const packUid = op.payload.pack_uid as string;
	const salt = op.payload.salt as string;
	if (!packUid || !salt) return reject('missing pack_uid or salt');

	const pack = await deps.state.getPack(packUid);
	if (!pack) return reject(`pack ${packUid} not found`);
	if (!pack.sealed) return reject('pack already opened');
	if (pack.owner !== op.broadcaster) return reject('not pack owner');

	// Entropy block must be irreversible
	const entropyBlock = op.blockNum + PACK_ENTROPY_DELAY_BLOCKS;
	if (entropyBlock > ctx.lastIrreversibleBlock) return { status: 'ignored' };

	const entropyBlockId = await ctx.getBlockId(entropyBlock);
	if (!entropyBlockId) return { status: 'ignored' };

	// Derive cards from pack DNA + burn entropy
	const seed = await sha256Hash(`${pack.dna}|${op.trxId}|${entropyBlockId}`);
	const cardCount = pack.cardCount;
	const idRanges = PACK_ID_RANGES[pack.packType] ?? PACK_ID_RANGES['standard'];
	const collectibleIds = deps.cards.getCollectibleIdsInRanges(idRanges);

	if (collectibleIds.length === 0) return reject('no collectible cards in range');

	let rng = Math.max(parseInt(seed.slice(0, 8), 16) || 1, 1);
	for (let i = 0; i < cardCount; i++) {
		rng = lcgNext(rng);
		const cardId = collectibleIds[rng % collectibleIds.length];
		const cardData = deps.cards.getCardById(cardId);
		const rarity = cardData?.rarity ?? 'common';

		const originDna = await sha256Hash(`${cardId}|${pack.edition}|${rarity}|${pack.mintTrxId}`);
		const instanceDna = await sha256Hash(`${originDna}|genesis|${op.trxId}|${i}`);

		const asset: CardAsset = {
			uid: `${op.trxId}:${i}`, cardId, owner: op.broadcaster, rarity,
			level: 1, xp: 0, edition: pack.edition, foil: 'standard',
			mintSource: 'pack', mintTrxId: op.trxId, mintBlockNum: op.blockNum,
			lastTransferBlock: 0,
			originDna, instanceDna, generation: 0, replicaCount: 0,
		};
		await deps.state.putCard(asset);
		rng = lcgNext(rng);
	}

	// Delete pack and update supply
	await deps.state.deletePack(packUid);
	const supply = await deps.state.getPackSupply(pack.packType);
	if (supply) {
		await deps.state.putPackSupply({ ...supply, burned: supply.burned + 1 });
	}

	return { status: 'applied' };
}

// ============================================================
// v1.1: card_replicate — Clone a card with DNA lineage
// ============================================================

async function applyCardReplicate(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const sourceUid = op.payload.source_uid as string;
	if (!sourceUid) return reject('missing source_uid');

	const source = await deps.state.getCard(sourceUid);
	if (!source) return reject(`source card ${sourceUid} not found`);
	if (source.owner !== op.broadcaster) return reject('not owner of source card');

	const gen = source.generation ?? 0;
	if (gen >= MAX_GENERATION) return reject(`max generation reached: ${gen}`);

	const replicas = source.replicaCount ?? 0;
	if (replicas >= MAX_REPLICAS_PER_CARD) return reject(`max replicas reached: ${replicas}`);

	if (source.lastTransferBlock && (op.blockNum - source.lastTransferBlock) < REPLICA_COOLDOWN_BLOCKS) {
		return reject('replica cooldown');
	}

	const originDna = source.originDna ?? await sha256Hash(`${source.cardId}|${source.edition}|${source.rarity}|genesis`);
	const parentDna = source.instanceDna ?? await sha256Hash(`${originDna}|genesis|${source.mintTrxId}|0`);
	const instanceDna = await sha256Hash(`${originDna}|${parentDna}|${op.trxId}|0`);

	const foil = (op.payload.foil as string) || source.foil || 'standard';

	const replica: CardAsset = {
		uid: `${op.trxId}:replica:0`,
		cardId: source.cardId,
		owner: op.broadcaster,
		rarity: source.rarity,
		edition: source.edition,
		foil,
		level: 1, xp: 0,
		mintSource: 'replica',
		mintTrxId: op.trxId,
		mintBlockNum: op.blockNum,
		lastTransferBlock: 0,
		originDna,
		instanceDna,
		parentInstanceDna: parentDna,
		generation: gen + 1,
		replicaCount: 0,
	};

	// Update source replicaCount
	await deps.state.putCard({ ...source, replicaCount: replicas + 1 });
	await deps.state.putCard(replica);

	return { status: 'applied' };
}

// ============================================================
// v1.1: card_merge — Combine two same-origin cards
// ============================================================

async function applyCardMerge(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const sourceUids = op.payload.source_uids as [string, string];
	const mergeCards = await loadMergeCards(sourceUids, op.broadcaster, deps);
	if (isOpResult(mergeCards)) return mergeCards;

	const [cardA, cardB] = mergeCards;
	const lineage = await resolveMergeLineage(cardA, cardB, op.trxId);
	if (isOpResult(lineage)) return lineage;

	const mergedLevel = Math.min(MAX_CARD_LEVEL, Math.max(cardA.level, cardB.level) + 1);

	const merged: CardAsset = {
		uid: `${op.trxId}:merge:0`,
		cardId: cardA.cardId,
		owner: op.broadcaster,
		rarity: cardA.rarity,
		edition: cardA.edition,
		foil: 'ascended',
		level: mergedLevel,
		xp: (cardA.xp || 0) + (cardB.xp || 0),
		mintSource: 'merge',
		mintTrxId: op.trxId,
		mintBlockNum: op.blockNum,
		lastTransferBlock: 0,
		originDna: lineage.originDna,
		instanceDna: lineage.mergedDna,
		parentInstanceDna: lineage.dnaA,
		generation: 0,
		replicaCount: 0,
		mergedFrom: [cardA.uid, cardB.uid],
	};

	// Burn both sources, create merged
	await deps.state.deleteCard(cardA.uid);
	await deps.state.deleteCard(cardB.uid);
	await deps.state.putCard(merged);

	return { status: 'applied' };
}

async function loadMergeCards(
	sourceUids: [string, string],
	owner: string,
	deps: ProtocolCoreDeps,
): Promise<[CardAsset, CardAsset] | OpResult> {
	if (!Array.isArray(sourceUids) || sourceUids.length !== 2) {
		return reject('source_uids must be array of exactly 2');
	}

	const [cardA, cardB] = await Promise.all([
		deps.state.getCard(sourceUids[0]),
		deps.state.getCard(sourceUids[1]),
	]);
	if (!cardA) return reject(`card ${sourceUids[0]} not found`);
	if (!cardB) return reject(`card ${sourceUids[1]} not found`);
	if (cardA.owner !== owner) return reject(`card ${sourceUids[0]} not owned by broadcaster`);
	if (cardB.owner !== owner) return reject(`card ${sourceUids[1]} not owned by broadcaster`);
	if (cardA.cardId !== cardB.cardId) return reject('cards must be same template (cardId)');
	if ((cardA.replicaCount ?? 0) > 0) return reject(`card ${sourceUids[0]} has active replicas`);
	if ((cardB.replicaCount ?? 0) > 0) return reject(`card ${sourceUids[1]} has active replicas`);

	return [cardA, cardB];
}

async function resolveMergeLineage(
	cardA: CardAsset,
	cardB: CardAsset,
	trxId: string,
): Promise<{ originDna: string; dnaA: string; mergedDna: string } | OpResult> {
	const originA = await getCardOriginDna(cardA);
	const originB = await getCardOriginDna(cardB);
	if (originA !== originB) {
		return reject('cards must share the same originDna to merge');
	}

	const dnaA = await getCardInstanceDna(cardA, originA);
	const dnaB = await getCardInstanceDna(cardB, originA);
	return {
		originDna: originA,
		dnaA,
		mergedDna: await sha256Hash(`${dnaA}|${dnaB}|merge|${trxId}`),
	};
}

function getCardOriginDna(card: CardAsset): Promise<string> {
	return card.originDna
		? Promise.resolve(card.originDna)
		: sha256Hash(`${card.cardId}|${card.edition}|${card.rarity}|genesis`);
}

function getCardInstanceDna(card: CardAsset, originDna: string): Promise<string> {
	return card.instanceDna
		? Promise.resolve(card.instanceDna)
		: sha256Hash(`${originDna}|genesis|${card.mintTrxId}|0`);
}

// ============================================================
// v1.2: DUAT Airdrop handlers
// ============================================================

async function applyDuatAirdropClaim(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const account = op.broadcaster;

	// Genesis must exist
	const genesis = await deps.state.getGenesis();
	if (!genesis) return reject('no genesis');

	// Within claim window (90 days from seal)
	if (genesis.sealBlock > 0 && op.blockNum > genesis.sealBlock + DUAT_CLAIM_WINDOW_BLOCKS) {
		return reject('duat claim window expired');
	}

	// Not already claimed
	const existing = await deps.state.getDuatClaim(account);
	if (existing) return reject('duat already claimed');

	// Snapshot membership is resolved through an injected provider. The server
	// provider reads the frozen snapshot; the browser provider lazy-loads the
	// public snapshot only when a DUAT lookup/replay path needs it.
	const entitlement = await deps.duat.getDuatEntitlement(account);
	if (!entitlement) return reject('account not in duat snapshot');
	const { packsEarned } = entitlement;
	if (packsEarned <= 0) return reject('invalid duat entitlement');

	// Legacy clients may still include derived fields in the custom_json. They
	// are accepted only when they match the canonical entitlement.
	const payloadDuatRaw = readOptionalPayloadNumber(op.payload, 'duat_balance');
	if (Number.isNaN(payloadDuatRaw)) return reject('invalid duat_balance');
	if (payloadDuatRaw !== null && entitlement.duatRaw !== null && payloadDuatRaw !== entitlement.duatRaw) {
		return reject(`duat balance mismatch: snapshot ${entitlement.duatRaw}, claimed ${payloadDuatRaw}`);
	}

	const payloadPacksEarned = readOptionalPayloadNumber(op.payload, 'packs_earned');
	if (Number.isNaN(payloadPacksEarned)) return reject('invalid packs_earned');
	if (payloadPacksEarned !== null && payloadPacksEarned !== packsEarned) {
		return reject(`pack count mismatch: expected ${packsEarned}, got ${payloadPacksEarned}`);
	}

	// Mint sealed packs
	for (let i = 0; i < packsEarned; i++) {
		const packUid = `duat_${op.trxId}:${i}`;
		const dna = await sha256Hash(`${packUid}:${account}:${packsEarned}`);
		await deps.state.putPack({
			uid: packUid,
			packType: 'standard',
			dna,
			owner: account,
			sealed: true,
			mintTrxId: op.trxId,
			mintBlockNum: op.blockNum,
			lastTransferBlock: op.blockNum,
			cardCount: 5,
			edition: 'alpha',
		});
	}

	// Record claim
	await deps.state.putDuatClaim({
		account,
		duatRaw: entitlement.duatRaw ?? 0,
		packsEarned,
		blockNum: op.blockNum,
		trxId: op.trxId,
	});

	return { status: 'applied' };
}

async function applyDuatAirdropFinalize(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	if (op.broadcaster !== RAGNAROK_ADMIN_ACCOUNT) return reject('not admin');

	const genesis = await deps.state.getGenesis();
	if (!genesis) return reject('no genesis');

	// Must be past claim window
	if (genesis.sealBlock > 0 && op.blockNum <= genesis.sealBlock + DUAT_CLAIM_WINDOW_BLOCKS) {
		return reject('claim window not yet expired');
	}

	// Finalization is recorded but unclaimed packs are handled off-chain
	// (admin mints treasury packs in a separate batch)
	return { status: 'applied' };
}

// ============================================================
// v1.2: Marketplace handlers
// ============================================================

async function applyMarketList(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const nftUid = op.payload.nft_uid as string;
	const nftType = op.payload.nft_type as 'card' | 'pack';
	const price = Number(op.payload.price ?? 0);
	const currency = (op.payload.currency as string || 'HIVE').toUpperCase() as 'HIVE' | 'HBD';

	if (!nftUid || !nftType) return reject('missing nft_uid or nft_type');
	if (price <= 0) return reject('price must be positive');
	if (currency !== 'HIVE' && currency !== 'HBD') return reject('currency must be HIVE or HBD');

	// Verify ownership
	if (nftType === 'card') {
		const card = await deps.state.getCard(nftUid);
		if (!card) return reject(`card ${nftUid} not found`);
		if (card.owner !== op.broadcaster) return reject('not card owner');
	} else {
		const pack = await deps.state.getPack(nftUid);
		if (!pack) return reject(`pack ${nftUid} not found`);
		if (pack.owner !== op.broadcaster) return reject('not pack owner');
	}

	// Check no active listing already exists for this NFT
	const existing = await deps.state.getListingByNft(nftUid);
	if (existing && existing.active) return reject('NFT already listed');

	const listing: MarketListing = {
		listingId: `list_${op.trxId}`,
		nftUid,
		nftType,
		seller: op.broadcaster,
		price,
		currency,
		listedBlock: op.blockNum,
		listedTrxId: op.trxId,
		active: true,
	};

	await deps.state.putListing(listing);
	return { status: 'applied' };
}

async function applyMarketUnlist(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const listingId = op.payload.listing_id as string;
	if (!listingId) return reject('missing listing_id');

	const listing = await deps.state.getListing(listingId);
	if (!listing) return reject('listing not found');
	if (!listing.active) return reject('listing already inactive');
	if (listing.seller !== op.broadcaster) return reject('not listing owner');

	listing.active = false;
	await deps.state.putListing(listing);
	return { status: 'applied' };
}

async function applyMarketBuy(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const listingId = op.payload.listing_id as string;
	const paymentTrxId = op.payload.payment_trx_id as string;
	if (!listingId) return reject('missing listing_id');

	const listing = await deps.state.getListing(listingId);
	if (!listing) return reject('listing not found');
	if (!listing.active) return reject('listing not active');
	if (listing.seller === op.broadcaster) return reject('cannot buy own listing');

	const paymentResult = await verifyCompanionPayment(
		op,
		paymentTrxId,
		op.broadcaster,
		listing.seller,
		listing.price,
		listing.currency,
		deps,
	);
	if (paymentResult) return paymentResult;

	const nft = await loadOwnedMarketNft(listing.nftUid, listing.nftType, listing.seller, 'seller no longer owns', deps);
	if (isOpResult(nft)) return nft;
	await transferMarketNft(nft, op.broadcaster, op.blockNum, deps);

	// Deactivate listing
	listing.active = false;
	await deps.state.putListing(listing);

	await rejectPendingOffers(listing.nftUid, deps);

	return { status: 'applied' };
}

async function applyMarketOffer(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const nftUid = op.payload.nft_uid as string;
	const price = Number(op.payload.price ?? 0);
	const currency = (op.payload.currency as string || 'HIVE').toUpperCase() as 'HIVE' | 'HBD';

	if (!nftUid) return reject('missing nft_uid');
	if (price <= 0) return reject('offer price must be positive');
	if (currency !== 'HIVE' && currency !== 'HBD') return reject('currency must be HIVE or HBD');

	// Verify NFT exists
	const card = await deps.state.getCard(nftUid);
	const pack = card ? null : await deps.state.getPack(nftUid);
	if (!card && !pack) return reject('NFT not found');

	const owner = card ? card.owner : pack!.owner;
	if (owner === op.broadcaster) return reject('cannot offer on own NFT');

	const offer: MarketOffer = {
		offerId: `offer_${op.trxId}`,
		nftUid,
		buyer: op.broadcaster,
		price,
		currency,
		offeredBlock: op.blockNum,
		offeredTrxId: op.trxId,
		status: 'pending',
	};

	await deps.state.putOffer(offer);
	return { status: 'applied' };
}

async function applyMarketAccept(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const offerId = op.payload.offer_id as string;
	const paymentTrxId = op.payload.payment_trx_id as string;
	if (!offerId) return reject('missing offer_id');

	const offer = await deps.state.getOffer(offerId);
	if (!offer) return reject('offer not found');
	if (offer.status !== 'pending') return reject('offer not pending');

	const nft = await loadAnyMarketNft(offer.nftUid, deps);
	if (isOpResult(nft)) return nft;
	if (nft.asset.owner !== op.broadcaster) return reject('not NFT owner');

	const paymentResult = await verifyCompanionPayment(
		op,
		paymentTrxId,
		offer.buyer,
		op.broadcaster,
		offer.price,
		offer.currency,
		deps,
	);
	if (paymentResult) return paymentResult;

	await transferMarketNft(nft, offer.buyer, op.blockNum, deps);

	// Mark offer accepted
	offer.status = 'accepted';
	offer.paymentTrxId = paymentTrxId;
	await deps.state.putOffer(offer);

	// Deactivate any active listing for this NFT
	const listing = await deps.state.getListingByNft(offer.nftUid);
	if (listing && listing.active) {
		listing.active = false;
		await deps.state.putListing(listing);
	}

	await rejectPendingOffers(offer.nftUid, deps, offerId);

	return { status: 'applied' };
}

async function verifyCompanionPayment(
	op: ProtocolOp,
	paymentTrxId: string,
	expectedSender: string,
	expectedRecipient: string,
	expectedAmount: number,
	expectedCurrency: 'HIVE' | 'HBD',
	deps: ProtocolCoreDeps,
): Promise<OpResult | null> {
	const lookupTrxId = paymentTrxId || op.trxId;
	const companion = await deps.state.getCompanionTransfer(lookupTrxId);
	if (!companion) {
		return reject(paymentTrxId ? 'payment transfer not found' : 'missing payment transfer');
	}

	if (companion.from !== expectedSender) {
		return reject('payment sender mismatch');
	}

	if (companion.to !== expectedRecipient) {
		return reject('payment recipient mismatch');
	}

	const [amountText = '', currency = ''] = companion.amount.trim().split(/\s+/);
	const amount = parseFloat(amountText);
	if (!Number.isFinite(amount)) {
		return reject('payment amount invalid');
	}
	if (currency.toUpperCase() !== expectedCurrency) {
		return reject('payment currency mismatch');
	}
	return amount < expectedAmount
		? reject(`payment insufficient: ${amount} < ${expectedAmount}`)
		: null;
}

async function loadOwnedMarketNft(
	nftUid: string,
	nftType: 'card' | 'pack',
	owner: string,
	missingOwnerPrefix: string,
	deps: ProtocolCoreDeps,
): Promise<MarketNftAsset | OpResult> {
	if (nftType === 'card') {
		const card = await deps.state.getCard(nftUid);
		if (!card) return reject('listed card no longer exists');
		return card.owner !== owner
			? reject(`${missingOwnerPrefix} card`)
			: { nftType: 'card', asset: card };
	}

	const pack = await deps.state.getPack(nftUid);
	if (!pack) return reject('listed pack no longer exists');
	return pack.owner !== owner
		? reject(`${missingOwnerPrefix} pack`)
		: { nftType: 'pack', asset: pack };
}

async function loadAnyMarketNft(
	nftUid: string,
	deps: ProtocolCoreDeps,
): Promise<MarketNftAsset | OpResult> {
	const card = await deps.state.getCard(nftUid);
	if (card) {
		return { nftType: 'card', asset: card };
	}

	const pack = await deps.state.getPack(nftUid);
	return pack
		? { nftType: 'pack', asset: pack }
		: reject('NFT no longer exists');
}

async function transferMarketNft(
	nft: MarketNftAsset,
	newOwner: string,
	blockNum: number,
	deps: ProtocolCoreDeps,
): Promise<void> {
	if (nft.nftType === 'card') {
		await deps.state.putCard({
			...nft.asset,
			owner: newOwner,
			lastTransferBlock: blockNum,
		});
		return;
	}

	await deps.state.putPack({
		...nft.asset,
		owner: newOwner,
		lastTransferBlock: blockNum,
	});
}

async function rejectPendingOffers(
	nftUid: string,
	deps: ProtocolCoreDeps,
	excludedOfferId?: string,
): Promise<void> {
	const pendingOffers = await deps.state.getOffersByNft(nftUid);
	for (const offer of pendingOffers) {
		if (offer.status !== 'pending' || offer.offerId === excludedOfferId) continue;
		await deps.state.putOffer({ ...offer, status: 'rejected' });
	}
}

async function applyMarketReject(op: ProtocolOp, deps: ProtocolCoreDeps): Promise<OpResult> {
	const offerId = op.payload.offer_id as string;
	if (!offerId) return reject('missing offer_id');

	const offer = await deps.state.getOffer(offerId);
	if (!offer) return reject('offer not found');
	if (offer.status !== 'pending') return reject('offer not pending');

	// Only NFT owner can reject
	const card = await deps.state.getCard(offer.nftUid);
	const pack = card ? null : await deps.state.getPack(offer.nftUid);
	const owner = card ? card.owner : pack?.owner;
	if (owner !== op.broadcaster) return reject('not NFT owner');

	offer.status = 'rejected';
	await deps.state.putOffer(offer);
	return { status: 'applied' };
}

// ============================================================
// PoW verification helper
// ============================================================

async function verifyPowField(
	op: ProtocolOp,
	config = POW_CONFIG.MATCH_START,
): Promise<OpResult | null> {
	const pow = op.payload.pow as { nonces?: number[] } | undefined;
	if (!pow?.nonces) return reject(`${op.action} missing required PoW`);

	const payloadForPow = { ...op.payload };
	delete payloadForPow.pow;

	const payloadHash = await sha256Hash(canonicalStringify(payloadForPow));
	const valid = await verifyPoW(payloadHash, { nonces: pow.nonces }, config);
	if (!valid) return reject(`${op.action} PoW verification failed`);

	return null; // PoW valid, continue
}

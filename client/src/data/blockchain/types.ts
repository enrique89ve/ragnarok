import type { HiveCardAsset } from '../schemas/HiveTypes';

export type BlockchainActionType =
	| 'match_result'
	| 'level_up'
	| 'card_transfer'
	| 'nft_mint';

export type TransactionStatus =
	| 'queued'
	| 'ready'
	| 'submitting'
	| 'confirmed'
	| 'failed'
	| 'expired';

export interface TransactionEntry<T = unknown> {
	id: string;
	actionType: BlockchainActionType;
	status: TransactionStatus;
	payload: T;
	hash: string;
	createdAt: number;
	updatedAt: number;
	retryCount: number;
	maxRetries: number;
	error: string | null;
	trxId: string | null;
	blockNum: number | null;
	expiresAt: number;
}

export interface MatchPlayerData {
	username: string;
	heroClass: string;
	heroId: string;
	finalHp: number;
	damageDealt: number;
	pokerHandsWon: number;
	cardsUsed: number[];
}

export interface EloChange {
	before: number;
	after: number;
	delta: number;
}

export interface PackagedMatchResult {
	matchId: string;
	timestamp: number;
	matchType: 'ranked' | 'casual' | 'tournament';
	winner: MatchPlayerData;
	loser: MatchPlayerData;
	duration: number;
	totalRounds: number;
	eloChanges: {
		winner: EloChange;
		loser: EloChange;
	};
	xpRewards: CardXPReward[];
	runeRewards: { winner: number; loser: number };
	seed: string;
	hash: string;
	version: number;
	result_nonce: number; // monotonic per-account nonce — prevents re-broadcasting old results
	signatures?: { broadcaster: string; counterparty: string };
	transcriptRoot?: string;
	transcriptCID?: string;
}

export interface PackagedMatchResultOnChain {
	m: string;
	w: string;
	l: string;
	n: number;
	h: string;
	s: string;
	v: number;
	c?: string;  // hex-encoded winner card IDs (4 hex chars each, sorted)
	ch?: string; // sha256(canonical({m,w,l,n,s,v,c})) — verifiable by replay engine
	sig?: { b: string; c: string };
	tr?: string; // transcript Merkle root (SHA-256, 64 hex)
	tc?: string; // transcript IPFS CID (content-addressed, retrievable)
}

export interface CardXPReward {
	cardUid: string;
	cardId: number;
	xpBefore: number;
	xpGained: number;
	xpAfter: number;
	levelBefore: number;
	levelAfter: number;
	didLevelUp: boolean;
}

export interface CardXPConfig {
	rarity: string;
	xpPerWin: number;
	xpPerMvp: number;
	maxLevel: number;
	thresholds: number[];
}

export type XPConfigMap = Record<string, CardXPConfig>;

export interface CardLevelBonus {
	level: number;
	attackBonus: number;
	healthBonus: number;
}

export interface NFTAttribute {
	trait_type: string;
	value: string | number;
	display_type?: 'number' | 'boost_number' | 'boost_percentage';
}

export interface NFTMetadata {
	uid: string;
	cardId: number;
	templateVersion: number;
	name: string;
	type: string;
	rarity: string;
	heroClass: string;
	stats: {
		attack?: number;
		health?: number;
		manaCost?: number;
	};
	keywords: string[];
	description: string;
	edition: 'alpha' | 'beta' | 'promo';
	foil: 'standard' | 'gold';
	mintNumber: number;
	maxSupply: number;
	mintedAt: number;
	mintedBy: string;
	hash: string;
	image: string;
	artPath?: string;
	externalUrl: string;
	race: string;
	set: string;
	flavorText: string;
	collectible: boolean;
	collection: {
		name: string;
		family: string;
	};
	attributes: NFTAttribute[];
	provenance?: {
		signer: string;
		trxId: string;
		blockNum: number;
		timestamp: number;
		txUrl: string;
		blockUrl: string;
	};
}

export interface MutableCardState {
	uid: string;
	ownerId: string;
	xp: number;
	level: number;
	lastTransferBlock: number | null;
}

export interface CardUidMapping {
	uid: string;
	cardId: number;
}

export interface MintInfo {
	uid: string;
	edition: 'alpha' | 'beta' | 'promo';
	foil: 'standard' | 'gold';
	mintNumber: number;
	maxSupply: number;
	mintedBy: string;
}

export interface MatchPackagerInput {
	matchId: string;
	matchType: 'ranked' | 'casual' | 'tournament';
	playerUsername: string;
	opponentUsername: string;
	playerHeroId: string;
	opponentHeroId: string;
	startTime: number;
	seed: string;
	playerCardUids: CardUidMapping[];
	opponentCardUids: CardUidMapping[];
	playerEloBefore: number;
	opponentEloBefore: number;
}

export const TX_EXPIRY_MS = 24 * 60 * 60 * 1000;
export const MAX_QUEUE_SIZE = 200;
export const DEFAULT_MAX_RETRIES = 3;
export const MATCH_RESULT_VERSION = 1;

export type { HiveCardAsset };

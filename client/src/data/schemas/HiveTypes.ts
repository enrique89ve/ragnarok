/**
 * Hive Data Types - On-Chain Items
 *
 * Architecture: Hive L1 only, no Hive Engine, no server.
 * All data derived from chain replay (custom_json with id "ragnarok-cards").
 * Stored locally in IndexedDB, queried via HiveDataLayer Zustand store.
 *
 * Canonical op format:
 *   custom_json id = "ragnarok-cards"
 *   json = { "app": "ragnarok-cards", "action": "<action>", ... }
 *
 * Legacy format (backward compat, read-only):
 *   custom_json id = "rp_<action>"
 */

import { isStarterEntitlementCardId } from '@shared/schemas/starterEntitlement';

export const RAGNAROK_APP_ID = 'ragnarok-cards';

export type CardOwnershipSource =
  | 'nft' // Genesis card with Hive L1 identity.
  | 'starter'; // Universal off-chain starter entitlement.

export const STARTER_UID_PREFIX = 'starter-';
export const STARTER_ENTITLEMENT_OWNER_ID = 'starter-entitlement';

export function getStarterUid(cardId: number): string {
  return `${STARTER_UID_PREFIX}${cardId}`;
}

/**
 * Chain-level `custom_json` op id used at broadcast time.
 *
 * The canonical post-genesis form is the single id `'ragnarok-cards'` with
 * the action name carried inside the payload (`{ app, action, ... }`). The
 * `rp_*` variants are the pre-genesis legacy form, kept here because
 * `HiveSync.broadcastCustomJson` still routes by them today; the long-term
 * goal (separate phase) is to migrate every broadcast site to the canonical
 * `'ragnarok-cards'` id and let the action live entirely in the payload.
 *
 * Canonical action names (`'mint_batch'`, `'pack_commit'`, …) are the source
 * of truth for the protocol layer — see `CanonicalAction` /  `LegacyAction`
 * in `shared/protocol-core/types.ts`.
 */
export type RagnarokTransactionType =
  | 'ragnarok-cards'
  | 'rp_genesis'
  | 'rp_mint'
  | 'rp_seal'
  | 'rp_team_submit'
  | 'rp_match_result'
  | 'rp_card_transfer'
  | 'rp_pack_open'
  | 'rp_level_up'
  | 'rp_queue_join'
  | 'rp_queue_leave'
  | 'rp_reward_claim'
  | 'rp_slash_evidence'
  // v1.1
  | 'rp_pack_mint'
  | 'rp_pack_distribute'
  | 'rp_pack_transfer'
  | 'rp_pack_burn'
  | 'rp_card_replicate'
  | 'rp_card_merge'
  | 'rp_save_state';

export interface HiveUserRecord {
  hiveUsername: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  lastLogin: number;
  accountTier: 'free' | 'spellbook' | 'champion';
}

export interface HivePlayerStats {
  odinsEloRating: number;
  totalGamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  longestWinStreak: number;
  totalDamageDealt: number;
  totalHeroesDefeated: number;
  totalPokerHandsWon: number;
  favoriteHeroId?: string;
  favoriteFaction: 'norse' | 'greek' | 'egyptian' | 'japanese' | null;
  seasonRank: number;
  seasonPoints: number;
  lastMatchTimestamp: number;
}

export interface HiveMatchResult {
  matchId: string;
  timestamp: number;
  blockNum?: number;
  trxId?: string;
  player1: {
    hiveUsername: string;
    heroIds: string[];
    kingId: string;
    finalHp: number;
    damageDealt: number;
    pokerHandsWon: number;
  };
  player2: {
    hiveUsername: string;
    heroIds: string[];
    kingId: string;
    finalHp: number;
    damageDealt: number;
    pokerHandsWon: number;
  };
  winnerId: string;
  matchType: 'ranked' | 'casual' | 'tournament';
  duration: number;
  totalRounds: number;
  seed: string;
}

export interface ProvenanceStamp {
	from: string;
	to: string;
	trxId: string;
	block: number;
	timestamp?: number;
	txUrl?: string;
	blockUrl?: string;
	signer?: string;
}

export interface CompactedProvenance {
	totalTransfers: number;
	firstMint: ProvenanceStamp;
	compactedAt: number;
	compactedCount: number;
}

export interface OfficialMint {
	signer: string;
	trxId: string;
	blockNum: number;
	timestamp: number;
	txUrl: string;
	blockUrl: string;
}

export interface HiveCardAsset {
  uid: string;
  cardId: number;
  ownerId: string;
  /** Present only for economic assets. Local/dev catalog records leave this unset. */
  ownershipSource?: CardOwnershipSource;
  edition: 'alpha' | 'beta' | 'promo';
  foil: 'standard' | 'gold';
  rarity: string;
  level: number;
  xp: number;
  lastTransferBlock?: number;
  lastTransferTrxId?: string;
  mintBlockNum?: number;
  mintTrxId?: string;
  name: string;
  type: string;
  race?: string;
  image?: string;
  artPath?: string;
  provenanceChain?: ProvenanceStamp[];
  compactedProvenance?: CompactedProvenance;
  officialMint?: OfficialMint;
}

export function isStarterEntitlementAsset(
  card: Pick<HiveCardAsset, 'uid' | 'ownerId' | 'cardId'> & { ownershipSource?: CardOwnershipSource },
): boolean {
  if (!isStarterEntitlementCardId(card.cardId)) return false;
  return card.ownershipSource === 'starter'
    || card.uid.startsWith(STARTER_UID_PREFIX)
    || card.ownerId === STARTER_ENTITLEMENT_OWNER_ID;
}

export interface HiveTokenBalance {
  hiveUsername: string;
  RUNE: number;
  VALKYRIE: number;
  SEASON_POINTS: number;
  lastClaimTimestamp: number;
}

export interface HiveTransaction {
  trxId: string;
  type: RagnarokTransactionType;
  payload: Record<string, unknown>;
  timestamp: number;
  status: 'pending' | 'broadcasted' | 'confirmed' | 'failed';
  blockNum?: number;
  errorMessage?: string;
}

export interface HiveGameState {
  user: HiveUserRecord | null;
  stats: HivePlayerStats | null;
  cardCollection: HiveCardAsset[];
  packCollection: import('../../../../shared/protocol-core/types').PackAsset[];
  tokenBalance: HiveTokenBalance | null;
  recentMatches: HiveMatchResult[];
  pendingTransactions: HiveTransaction[];
}

export const DEFAULT_PLAYER_STATS: HivePlayerStats = {
  odinsEloRating: 1000,
  totalGamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  winStreak: 0,
  longestWinStreak: 0,
  totalDamageDealt: 0,
  totalHeroesDefeated: 0,
  totalPokerHandsWon: 0,
  favoriteHeroId: undefined,
  favoriteFaction: null,
  seasonRank: 0,
  seasonPoints: 0,
  lastMatchTimestamp: 0,
};

export const DEFAULT_TOKEN_BALANCE: HiveTokenBalance = {
  hiveUsername: '',
  RUNE: 0,
  VALKYRIE: 0,
  SEASON_POINTS: 0,
  lastClaimTimestamp: 0,
};


/**
 * HiveDataLayer - Central Data Store for P2E
 *
 * Zustand store for the 5 core on-chain items:
 * 1. User Records
 * 2. Player Stats
 * 3. Match Results
 * 4. Card Ownership
 * 5. Token Balances
 *
 * Architecture: Zero-cost, fully client-side. No server, no PostgreSQL.
 * Data is derived from Hive L1 chain replay into IndexedDB.
 * This store reads from IndexedDB and provides reactive state to React.
 * See HIVE_INTEGRATION_BLUEPRINT.md and docs/HIVE_BLOCKCHAIN_BLUEPRINT.md.
 *
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  HiveUserRecord,
  HivePlayerStats,
  HiveMatchResult,
  HiveCardAsset,
  HiveTokenBalance,
  HiveTransaction,
  HiveGameState,
  DEFAULT_PLAYER_STATS,
  DEFAULT_TOKEN_BALANCE,
} from './schemas/HiveTypes';
import { signHiveMessage } from './HiveAuth';

interface HiveDataStore extends HiveGameState {
  setUser: (user: HiveUserRecord) => void;
  updateStats: (stats: Partial<HivePlayerStats>) => void;
  recordMatchResult: (match: HiveMatchResult, opponentElo?: number) => void;
  addCard: (card: HiveCardAsset) => void;
  removeCard: (cardUid: string) => void;
  addPack: (pack: HiveGameState['packCollection'][0]) => void;
  removePack: (packUid: string) => void;
  updateTokenBalance: (balance: Partial<HiveTokenBalance>) => void;
  addTransaction: (tx: HiveTransaction) => void;
  updateTransaction: (trxId: string, updates: Partial<HiveTransaction>) => void;
  getSerializableState: () => HiveGameState;
  loadFromHive: (state: Partial<HiveGameState>) => void;
  logout: () => void;
}

// Register on globalThis so game-engine can access without circular import
export const useHiveDataStore = create<HiveDataStore>()(
  persist(
    (set, get) => ({
      user: null,
      stats: null,
      cardCollection: [],
      packCollection: [],
      tokenBalance: null,
      recentMatches: [],
      pendingTransactions: [],

      setUser: (user) => set({
        user,
        stats: get().stats || { ...DEFAULT_PLAYER_STATS },
        tokenBalance: get().tokenBalance || { ...DEFAULT_TOKEN_BALANCE, hiveUsername: user.hiveUsername },
      }),

      updateStats: (statsUpdate) => set((state) => ({
        stats: state.stats
          ? { ...state.stats, ...statsUpdate }
          : { ...DEFAULT_PLAYER_STATS, ...statsUpdate },
      })),

      recordMatchResult: (match, opponentElo?) => set((state) => {
        const isWinner = match.winnerId === state.user?.hiveUsername;
        const currentStats = state.stats || DEFAULT_PLAYER_STATS;

        const newWinStreak = isWinner ? currentStats.winStreak + 1 : 0;

        const resolvedOpponentElo = opponentElo ?? DEFAULT_PLAYER_STATS.odinsEloRating;
        const eloChange = calculateEloChange(currentStats.odinsEloRating, resolvedOpponentElo, isWinner);

        const playerData = match.player1.hiveUsername === state.user?.hiveUsername
          ? match.player1
          : match.player2;
        
        return {
          recentMatches: [match, ...state.recentMatches].slice(0, 100),
          stats: {
            ...currentStats,
            totalGamesPlayed: currentStats.totalGamesPlayed + 1,
            wins: isWinner ? currentStats.wins + 1 : currentStats.wins,
            losses: isWinner ? currentStats.losses : currentStats.losses + 1,
            winStreak: newWinStreak,
            longestWinStreak: Math.max(newWinStreak, currentStats.longestWinStreak),
            odinsEloRating: Math.max(0, currentStats.odinsEloRating + eloChange),
            totalDamageDealt: currentStats.totalDamageDealt + playerData.damageDealt,
            totalPokerHandsWon: currentStats.totalPokerHandsWon + playerData.pokerHandsWon,
            lastMatchTimestamp: match.timestamp,
          },
        };
      }),

      addCard: (card) => set((state) => ({
        cardCollection: [...state.cardCollection, card],
      })),

      removeCard: (cardUid) => set((state) => ({
        cardCollection: state.cardCollection.filter((c) => c.uid !== cardUid),
      })),

      addPack: (pack) => set((state) => ({
        packCollection: [...(state.packCollection ?? []), pack],
      })),

      removePack: (packUid) => set((state) => ({
        packCollection: (state.packCollection ?? []).filter((p) => p.uid !== packUid),
      })),

      updateTokenBalance: (balanceUpdate) => set((state) => ({
        tokenBalance: state.tokenBalance
          ? { ...state.tokenBalance, ...balanceUpdate }
          : { ...DEFAULT_TOKEN_BALANCE, ...balanceUpdate },
      })),

      addTransaction: (tx) => set((state) => ({
        pendingTransactions: [...state.pendingTransactions, tx],
      })),

      updateTransaction: (trxId, updates) => set((state) => ({
        pendingTransactions: state.pendingTransactions.map((tx) =>
          tx.trxId === trxId ? { ...tx, ...updates } : tx
        ),
      })),

      getSerializableState: () => {
        const state = get();
        return {
          user: state.user,
          stats: state.stats,
          cardCollection: state.cardCollection,
          packCollection: state.packCollection ?? [],
          tokenBalance: state.tokenBalance,
          recentMatches: state.recentMatches,
          pendingTransactions: state.pendingTransactions,
        };
      },

      loadFromHive: (hiveState) => set((state) => ({
        user: hiveState.user ?? state.user,
        stats: hiveState.stats ?? state.stats,
        cardCollection: hiveState.cardCollection ?? state.cardCollection,
        packCollection: hiveState.packCollection ?? state.packCollection ?? [],
        tokenBalance: hiveState.tokenBalance ?? state.tokenBalance,
        recentMatches: hiveState.recentMatches ?? state.recentMatches,
        pendingTransactions: [],
      })),

      logout: () => set({
        user: null,
        stats: null,
        cardCollection: [],
        packCollection: [],
        tokenBalance: null,
        recentMatches: [],
        pendingTransactions: [],
      }),
    }),
    {
      name: 'ragnarok-hive-data',
      partialize: (state) => ({
        user: state.user,
        stats: state.stats,
        cardCollection: state.cardCollection,
        packCollection: state.packCollection ?? [],
        tokenBalance: state.tokenBalance,
        recentMatches: state.recentMatches.slice(0, 20),
      }),
    }
  )
);

function calculateEloChange(playerElo: number, opponentElo: number, isWinner: boolean): number {
  const K = 32;
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actualScore = isWinner ? 1 : 0;
  return Math.round(K * (actualScore - expectedScore));
}

export const generateMatchId = (): string => {
  return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateCardUid = (): string => {
  return `C-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

// ─── Session authorization (ADR 0004 §Decision.3) ─────────────────────────
//
// Sibling helper to the generators above (top-level functions, not store
// methods — the call is effectful and triggers a Hive Keychain prompt).
// One prompt per match is the budget; mid-match signing uses the in-process
// SessionKey with zero further prompts. The signed buffer is exchanged via
// the `session_authorize` wire message (see `useWireSync.ts`).

const SESSION_AUTHORIZE_PREFIX = 'ragnarok session_authorize';

export function buildSessionAuthorizeMessage(
  matchId: string,
  ephemeralPubkey: string,
): string {
  return `${SESSION_AUTHORIZE_PREFIX} | ${matchId} | ${ephemeralPubkey}`;
}

/**
 * Prompt the user (via Hive Keychain) to sign the ephemeral session pubkey
 * with their Hive Active key, binding the match-scoped key to their on-chain
 * identity. Returns the base58 Hive signature.
 *
 * Confidence:
 *   - Message format is canonical and verbatim — Hive Keychain `signBuffer`
 *     signs the bytes as provided (MEDIUM per issue 02 confidence note).
 *   - Active key is required: this signature gates entry to a match and
 *     should not be reusable from a leaked Posting key.
 */
export async function signSessionAuthorize(
  matchId: string,
  ephemeralPubkey: string,
): Promise<string> {
  if (!matchId || !ephemeralPubkey) {
    throw new Error('signSessionAuthorize: matchId and ephemeralPubkey required');
  }
  const message = buildSessionAuthorizeMessage(matchId, ephemeralPubkey);
  const result = await signHiveMessage(message, {
    keyType: 'Active',
    title: 'Authorize session key',
  });
  if (!result.success || !result.signature) {
    throw new Error(`Hive Keychain sign rejected: ${result.error ?? 'unknown error'}`);
  }
  return result.signature;
}

// ─── Action log access (ADR 0004 §Decision.6, issue 04) ───────────────────
//
// Per ADR's Keychain prompt budget: this fires exactly ONCE per match (at
// session_authorize time) AND once per reload (session_renewal — issue 06).
// The returned Hive sig is HKDF-input for the per-match AES-GCM key used
// by `client/src/game/protocol/actionLog.ts` to encrypt the IndexedDB log,
// so XSS reading IndexedDB cannot decrypt without the Hive key.

const ACTION_LOG_ACCESS_PREFIX = 'ragnarok action-log-access';

export function buildActionLogAccessMessage(matchId: string): string {
  return `${ACTION_LOG_ACCESS_PREFIX} | ${matchId}`;
}

/**
 * Hive Active signature over `'ragnarok action-log-access | <matchId>'`.
 * The signature bytes are the IKM for HKDF — they never leave the client,
 * never appear in any wire message, and never decrypt anything off-device.
 * The Hive Active key never leaves Hive Keychain.
 */
export async function signActionLogAccess(matchId: string): Promise<string> {
  if (!matchId) throw new Error('signActionLogAccess: matchId required');
  const message = buildActionLogAccessMessage(matchId);
  const result = await signHiveMessage(message, {
    keyType: 'Active',
    title: 'Authorize action log access',
  });
  if (!result.success || !result.signature) {
    throw new Error(`Hive Keychain sign rejected: ${result.error ?? 'unknown error'}`);
  }
  return result.signature;
}

// Expose on globalThis so game-engine can access without circular chunk dependency
(globalThis as any).__ragnarokHiveDataStore = useHiveDataStore;

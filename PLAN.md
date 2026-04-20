# Plan: Thin Chain Indexer + Global State API

## Problem
The client-side replay engine only syncs ONE account at a time. This means:
- No global leaderboard (would need to scan every player)
- No opponent ELO lookup (defaults to 1000)
- No server-side deck verification (P2P exchange only)
- Matchmaking is FIFO, not ELO-based

## Solution: Server-Side Chain Indexer
A lightweight server-side indexer that polls Hive RPC for ALL known players, builds global state in memory (with JSON file persistence), and serves REST endpoints. Zero new dependencies — same patterns as `matchmakingRoutes.ts`.

## Architecture

```
Hive Public RPC (free, 3 nodes)
        │
        ▼
  Server-Side Indexer (chainIndexer.ts)
  - Polls known accounts every 30s (staggered)
  - Processes ragnarok-cards / rp_* / ragnarok_level_up ops
  - Builds global ELO, card ownership, match history
        │
        ▼
  In-Memory State + JSON File Persistence
  (data/chain-state.json, same pattern as matchmaking queue)
        │
        ▼
  Express Routes (/api/chain/*)
  - GET /leaderboard
  - GET /player/:username
  - GET /player/:username/cards
  - POST /verify-deck
        │
        ▼
  Client API (chainAPI.ts)
  - Thin fetch wrapper
  - Used by matchmaking for ELO-based matching
  - Used by P2P for deck verification
```

## Batches

### Batch 1: Server-Side Chain State Store
**New file: `server/services/chainState.ts`**

In-memory state with JSON file persistence (same pattern as matchmaking queue):

```typescript
interface ChainState {
  players: Map<string, PlayerRecord>    // username → elo, wins, losses
  cards: Map<string, CardRecord>        // uid → cardId, owner, rarity, level, xp
  matches: MatchRecord[]                // recent matches (capped at 10000)
  knownAccounts: Set<string>            // accounts to poll
  syncCursors: Map<string, number>      // account → lastHistoryIndex
  lastSyncedAt: number
}

interface PlayerRecord {
  username: string
  elo: number
  wins: number
  losses: number
  lastMatchAt: number
}

interface CardRecord {
  uid: string
  cardId: number
  owner: string
  rarity: string
  level: number
  xp: number
}

interface MatchRecord {
  matchId: string
  winner: string
  loser: string
  winnerEloBefore: number
  winnerEloAfter: number
  loserEloBefore: number
  loserEloAfter: number
  cardFingerprint: string  // the `c` field
  timestamp: number
  blockNum: number
}
```

Functions:
- `loadState()` — read from `data/chain-state.json` on startup
- `saveState()` — write to `data/chain-state.json` (debounced, every 30s)
- `getPlayer(username)` → PlayerRecord | undefined
- `getLeaderboard(limit, offset)` → PlayerRecord[]
- `getCardsByOwner(username)` → CardRecord[]
- `getMatchHistory(username, limit)` → MatchRecord[]
- `registerAccount(username)` — add to knownAccounts for polling

### Batch 2: Server-Side Chain Indexer
**New file: `server/services/chainIndexer.ts`**

Port of `client/src/data/blockchain/replayEngine.ts` for Node.js (uses `fetch` — available in Node 18+). Differences from client:
- Uses `node:crypto` for sha256 instead of `crypto.subtle`
- Writes to in-memory `chainState` instead of IndexedDB
- Polls ALL known accounts (staggered to avoid burst)
- ELO computed server-side from win/loss sequence

Op processing (simplified from replayRules.ts — only the ops we need):

| Op | Server Action |
|----|--------------|
| `rp_match_result` | Extract winner/loser from compact format, compute ELO delta, decode `c` field for card XP, record match, auto-discover both players |
| `rp_mint` | Record card ownership |
| `rp_card_transfer` | Update card owner |
| `rp_burn` | Delete card |
| `rp_level_up` | Update card level |
| `rp_pack_open` | Deterministic mint (same LCG as client) |
| `rp_queue_join` | Auto-discover player account |

ELO calculation (server-side, same formula as client):
```
K = 32
expected = 1 / (1 + 10^((opponentElo - playerElo) / 400))
delta = K * (actualScore - expected)
```

Polling strategy:
- `startIndexer()` — called on server startup
- Every 30s: pick next account from `knownAccounts` (round-robin)
- Each account synced at most once per 60s
- New accounts discovered from match_result ops (both winner and loser)
- Bootstrap: `ragnarok` account always polled first (genesis, mints, packs)

Account staggering for N accounts:
```
interval = max(2000, 30000 / N)  // e.g., 50 accounts = 600ms apart
```

### Batch 3: Express REST Routes
**New file: `server/routes/chainRoutes.ts`**

Endpoints:

```
GET  /api/chain/leaderboard?limit=100&offset=0
  → Top players sorted by ELO
  → Response: { players: PlayerRecord[], total: number }

GET  /api/chain/player/:username
  → Player profile (elo, wins, losses, recent matches)
  → If unknown account: register for indexing, return defaults
  → Response: { player: PlayerRecord, matches: MatchRecord[] }

GET  /api/chain/player/:username/elo
  → Lightweight ELO-only endpoint (for matchmaking)
  → Response: { username, elo, confidence: 'indexed' | 'default' }

GET  /api/chain/player/:username/cards
  → Cards owned by player
  → Response: { cards: CardRecord[], total: number }

POST /api/chain/verify-deck
  → Body: { username: string, cardIds: number[] }
  → Check if player owns cards with those template IDs
  → Response: { verified: boolean, owned: number[], missing: number[] }

POST /api/chain/register
  → Body: { username: string }
  → Register account for indexing
  → Response: { registered: boolean }

GET  /api/chain/status
  → Indexer health: accounts tracked, sync progress, last sync time
  → Response: { accounts, syncedAccounts, lastSyncAt, matches, cards }
```

**Mount in `server/routes.ts`:**
```typescript
const chainRoutes = (await import("./routes/chainRoutes")).default;
app.use('/api/chain', chainRoutes);
```

### Batch 4: Upgrade Matchmaking to ELO-Based
**Modify: `server/routes/matchmakingRoutes.ts`**

Current: FIFO queue (first come, first matched).
New: ELO-proximity matching.

Changes to `QueuedPlayer`:
```typescript
interface QueuedPlayer {
  peerId: string;
  username?: string;    // NEW — Hive username for ELO lookup
  elo?: number;         // NEW — cached ELO at queue time
  timestamp: number;
}
```

Changes to `POST /queue`:
- Accept optional `{ peerId, username }` body
- If username provided: look up ELO from chainState
- When matching: prefer opponents within ±200 ELO
- If no close match after 30s: expand to ±500
- If no close match after 60s: match anyone (current behavior)
- Fallback: if no username, behave as before (FIFO)

### Batch 5: Client API + Integration
**New file: `client/src/data/chainAPI.ts`**

Thin fetch wrapper:
```typescript
export async function fetchPlayerElo(username: string): Promise<{ elo: number; confidence: string }>
export async function fetchLeaderboard(limit?: number): Promise<PlayerRecord[]>
export async function fetchPlayerCards(username: string): Promise<CardRecord[]>
export async function verifyDeck(username: string, cardIds: number[]): Promise<{ verified: boolean; missing: number[] }>
export async function registerAccount(username: string): Promise<void>
```

**Wire into existing code:**

1. **Matchmaking** (`client/src/game/stores/matchmakingStore.ts` or `MultiplayerLobby.tsx`):
   - On queue join: call `registerAccount(username)` + pass username to `POST /api/matchmaking/queue`
   - Response now includes opponent ELO for display

2. **P2P connection** (`client/src/game/hooks/useP2PSync.ts`):
   - After seed exchange, host calls `verifyDeck(opponentUsername, opponentCardIds)`
   - If deck invalid: disconnect with reason

3. **BlockchainSubscriber** (`client/src/game/subscribers/BlockchainSubscriber.ts`):
   - After match ends: call `registerAccount` for both players (ensures indexer tracks them)

### Batch 6: TypeScript Check
- `npm run check` → 0 errors
- Verify server starts cleanly with `npm run dev`

## What This Does NOT Include (Future)
- Leaderboard UI page (this plan builds the API only)
- HafSQL integration (can be swapped in as a data source later)
- Tournament brackets / season system
- Full signature verification in the indexer

## Zero New Dependencies
- Uses `fetch` (Node 18+ built-in)
- Uses `node:crypto` (built-in)
- Uses `fs` JSON persistence (same pattern as matchmaking)
- All in-memory Maps (same pattern as mockBlockchainRoutes)

## Disk Usage
- `data/chain-state.json`: ~1KB per player, ~500 bytes per match
- 1000 players + 10000 matches ≈ 6MB
- Loaded into memory on startup (< 50ms)

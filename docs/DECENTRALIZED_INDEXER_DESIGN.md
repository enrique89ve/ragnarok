# Decentralized Indexer Design — "Light HAF"

> Every game client reads from a shared off-chain index. No servers. No scanning millions of blocks. One lightweight DB on IPFS that anyone can verify.

## The Problem

HAF (Hive Application Framework) gives you marine-precision data retrieval by downloading the entire Hive blockchain into PostgreSQL. But it requires running a full Hive node (~500GB+). That's overkill for a single game.

We need the **precision** of HAF (know exactly where every piece of data lives) without the **weight** (no full node, no PostgreSQL, no server).

## The Solution: Op Log Index on IPFS

A lightweight, append-only index that maps every Ragnarok game operation to its exact on-chain location. Think of it as a phone book for the blockchain — instead of scanning millions of blocks, you look up exactly what you need.

```
Player wins match
    ↓
match_result broadcast to Hive (on-chain, permanent, immutable)
    ↓
WoT operator extracts the op metadata and appends it to the index:
  { player: "bob", action: "match_result", trxId: "abc123", block: 95000000, ... }
    ↓
Updated index published to IPFS (new CID)
    ↓
Game clients fetch index, query locally — zero chain scanning
    ↓
If raw op data needed, ONE precise API call using the trxId
```

### What the Index Stores

Each entry is ~150 bytes of metadata pointing to an immutable on-chain transaction:

```typescript
interface IndexEntry {
  // Who
  player: string;                    // Hive username
  counterparty?: string;             // opponent, recipient, etc.

  // What
  action: CanonicalAction;           // 'match_result' | 'card_transfer' | 'mint' | ...

  // Where (on-chain locator)
  trxId: string;                     // Hive transaction ID
  blockNum: number;                  // Block number (irreversible)
  opIndexInBlock: number;            // Position within block

  // When
  timestamp: number;                 // Unix seconds

  // Derived state (pre-computed so clients don't have to)
  derived?: {
    eloAfter?: number;               // Player's ELO after this match
    cardId?: number;                  // Card involved
    cardUid?: string;                 // NFT UID involved
    winner?: string;                  // Match winner
    supplyAfter?: number;            // Supply counter after mint
  };
}
```

### What the Index Does NOT Store

- Card definitions (shipped with the game binary)
- Art assets (shipped with the game binary)
- Replay rules (shipped with the game binary, sealed at genesis)
- Raw transaction payloads (those live on Hive — fetch by trxId if needed)

The index is a **table of contents**, not a database. The blockchain is the database.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HIVE BLOCKCHAIN                           │
│  (immutable ledger — all ragnarok-cards custom_json ops)     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ WoT Operator │  ×3-5 independent operators
                    │   Nodes      │  (scan recent blocks, extract ops)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    IPFS      │  Pinned index files
                    │  (Pinata /   │  Content-addressed, immutable chunks
                    │   self-host) │  Latest root → IPNS or on-chain CID
                    └──────┬──────┘
                           │
              ┌────────────▼────────────────┐
              │      GAME CLIENTS            │
              │  (download index on launch,  │
              │   cache in IndexedDB,        │
              │   query locally)             │
              └─────────────────────────────┘
```

## Data Flow

### Writing (Player → Chain → Index)

```
1. Player action (play card, win match, transfer NFT, etc.)
2. Player's game client broadcasts custom_json to Hive via Keychain
3. Op enters Hive mempool → included in block → becomes irreversible (LIB)
4. WoT operator nodes detect the new irreversible block
5. Operator filters block for ragnarok-cards ops
6. Operator appends IndexEntry for each relevant op
7. Operator publishes updated index chunk to IPFS → new CID
8. Designated publisher posts CID update to @ragnarok-index (rotation-based)
```

### Reading (Client → Index → Optional Chain Verification)

```
1. Client resolves latest index CID (from on-chain pointer or peer)
2. Client fetches snapshots FIRST (leaderboard, supply — instant usability)
3. Client fetches only the chunks newer than its local cache (background)
4. Client merges new entries into local IndexedDB
5. Client queries locally:
   - "My match history" → filter by player === myUsername
   - "Top 100 ELO" → read pre-computed leaderboard snapshot
   - "Card ownership" → filter by action === 'card_transfer' | 'mint', latest per cardUid
   - "Supply counters" → read pre-computed supply snapshot
6. If client needs raw op payload → ONE Hive API call: get_transaction(trxId)
```

### Zero-Ping Scenarios

| Player action | Index lookup | Hive API calls |
|---|---|---|
| View leaderboard | Local query over cached index | 0 |
| View my collection | Local query + personal account scan | 1 |
| View opponent's stats | Local query (or P2P exchange) | 0 |
| Play a match | Broadcast result via Keychain | 1 (write only) |
| Trade a card | Broadcast transfer via Keychain | 1 (write only) |
| Open a pack | Broadcast pack_burn via Keychain | 1 (write only) |
| View match replay | Fetch raw op by trxId from index | 1 |
| Check card supply | Local query over cached index | 0 |

## Index File Format

### Chunked NDJSON

The index is split into time-based chunks for incremental sync:

```
/ragnarok-index/
  manifest.json           ← root manifest with chunk list + state summary
  chunks/
    chunk-000000-010000.ndjson.gz    ← blocks 0-10,000
    chunk-010001-020000.ndjson.gz    ← blocks 10,001-20,000
    chunk-020001-030000.ndjson.gz    ← blocks 20,001-30,000
    ...
    chunk-095001-095500.ndjson.gz    ← latest partial chunk
  compacted/
    compacted-000000-090000.ndjson.gz  ← merged old chunks (periodic)
  snapshots/
    leaderboard.json      ← pre-computed top 1000 ELO (updated each chunk)
    supply.json            ← current supply counters per card/rarity
    genesis.json           ← genesis state (sealed block, initial supply)
```

### Manifest Structure

```typescript
interface IndexManifest {
  version: 1;

  // Chain state
  lastBlock: number;              // Latest irreversible block indexed
  lastBlockTimestamp: number;
  totalOps: number;               // Total ragnarok-cards ops indexed

  // Chunks (newest first for fast delta sync)
  chunks: Array<{
    file: string;                 // "chunks/chunk-095001-095500.ndjson.gz"
    blockRange: [number, number]; // [95001, 95500]
    opCount: number;              // How many entries in this chunk
    sha256: string;               // Content hash for verification
  }>;

  // Compacted archives (old chunks merged for fast bootstrap)
  compacted?: Array<{
    file: string;                 // "compacted/compacted-000000-090000.ndjson.gz"
    blockRange: [number, number];
    opCount: number;
    sha256: string;
  }>;

  // Pre-computed snapshots (loaded FIRST for instant usability)
  snapshots: {
    leaderboard: string;          // CID or relative path
    supply: string;
    genesis: string;
  };

  // Operator attestations
  attestations: Array<{
    operator: string;             // Hive username
    stateHash: string;            // SHA-256 of full index state
    signature: string;            // Hive signature of stateHash
    block: number;                // Block this attestation covers through
    timestamp: number;            // When attestation was produced
  }>;

  // Designated publisher for this chunk cycle
  publisher: string;              // Hive username of current CID publisher
  publisherRotation: string[];    // Ordered list of operators for rotation
}
```

### Why NDJSON (Newline-Delimited JSON)

- **Streamable**: Parse line-by-line, don't need entire file in memory
- **Append-friendly**: New entries = new lines, no rewriting
- **Gzip-friendly**: Repetitive JSON keys compress extremely well (~10:1)
- **Browser-native**: No special parser needed — `split('\n').map(JSON.parse)`

### Size Estimates

| Scenario | Entries | Raw size | Gzipped |
|---|---|---|---|
| Year 1 (1,000 players, moderate activity) | ~50,000 ops | ~7.5 MB | ~750 KB |
| Year 3 (10,000 players, heavy activity) | ~500,000 ops | ~75 MB | ~7.5 MB |
| Year 5 (50,000 players) | ~2,000,000 ops | ~300 MB | ~30 MB |

Even at massive scale, the compressed index is smaller than a single card art batch. Trivially hostable on IPFS.

## WoT Operator Network

### Who Are Operators?

Operators are community members who run a lightweight indexer process that:
1. Scans recent Hive blocks for `ragnarok-cards` ops
2. Appends entries to the index
3. Publishes updated chunks to IPFS
4. Attests to the state hash with their Hive signature

### Operator Requirements

- **Hardware**: Any machine with internet (laptop, Raspberry Pi, VPS — no special infra)
- **Software**: Open-source indexer binary (ships with the game repo, ~50KB)
- **Hive account**: For signing attestations
- **IPFS pinning**: Either self-hosted IPFS node or Pinata/web3.storage account
- **No full Hive node needed**: Operators use public RPC endpoints, same as everyone else

### Cold Start Bootstrap

Genesis signers (the 2-of-3 multisig who broadcast genesis) are automatically the first operators. No WoT vouching needed — they're already the most trusted accounts in the system. This solves the chicken-and-egg problem of "who vouches for the first operator."

```
Genesis ceremony:
  1. @ragnarok-genesis broadcasts genesis + seal     (existing flow)
  2. Genesis signers are auto-registered as operators (new: indexer_bootstrap op)
  3. First operator begins scanning from genesis block
  4. Community members join via WoT vouching
```

### Joining as an Operator

Uses the existing WoT (Web of Trust) system from the treasury:

```
1. Candidate announces intention via custom_json:
   { action: "indexer_register", account: "alice" }

2. Existing operators vouch for candidate:
   - Top-150 Hive witnesses can self-vouch (join directly)
   - Non-witnesses need 3+ vouches from existing operators

3. Once accepted, candidate begins producing attestations
   - Must agree with majority within 5 blocks or gets flagged
   - 3 consecutive disagreements → automatic removal

4. Revenue share begins (see Incentives below)
```

### Operator Liveness

Operators must produce an attestation at least once per 24 hours:

```
- Active: produced valid attestation within 24h → included in quorum + revenue
- Stale: missed 1 heartbeat → warning, still counted
- Inactive: missed 3 consecutive heartbeats → removed from quorum denominator
- Revenue share increases per-operator as inactive operators drop out
```

### Minimum Operator Floor

If fewer than 3 operators are active, the system enters **degraded mode**:
- Clients fall back to personal scan + bundled snapshot
- Index still works but isn't consensus-verified
- Warning banner shown in game: "Index verification degraded — operators needed"
- Higher revenue share incentivizes new operators to join

### Consensus

Deterministic replay means all honest operators MUST produce identical state. Disagreement = bug or malice.

```
Block N processed by 5 operators:

  Operator A: stateHash = "abc123" ✓
  Operator B: stateHash = "abc123" ✓
  Operator C: stateHash = "abc123" ✓
  Operator D: stateHash = "abc123" ✓
  Operator E: stateHash = "xyz789" ✗ ← divergent, flagged

Canonical state = "abc123" (4/5 = 80% agreement, exceeds 60% threshold)
Operator E: warned, must re-sync or face removal
```

**Quorum thresholds** (reusing treasury constants):
- **60%** for state confirmation (normal operation)
- **80%** for protocol parameter changes
- **3+ vouches** for new operator admission

### Designated Publisher Rotation

To prevent split-brain (operators at different blocks publishing different CIDs):

```
- One operator per chunk boundary posts the canonical CID
- Other operators post attestation-only (signature + stateHash, no CID)
- Rotation order determined by sorted Hive username
- If designated publisher misses deadline (30 min past chunk boundary),
  next operator in rotation takes over
- Client reads latest CID from @ragnarok-index, verifies 60%+ attestations match
```

### Incentives

Pack sales generate revenue. A percentage goes to the operator pool:

```typescript
const OPERATOR_REVENUE_SHARE = 0.05; // 5% of pack sale revenue

// Distribution: equal split among active operators
// "Active" = produced valid attestation within last 24 hours
// Paid out monthly via Hive transfer from treasury
// Revenue per operator increases as inactive operators drop out
```

| Monthly pack revenue | Operator pool (5%) | Per operator (5 active) | Per operator (3 active) |
|---|---|---|---|
| $1,000 | $50 | $10 | $17 |
| $10,000 | $500 | $100 | $167 |
| $100,000 | $5,000 | $1,000 | $1,667 |

Operators also earn reputation in the WoT system, which carries weight in treasury governance.

### Slashing

If an operator produces a provably incorrect index entry (points to a trxId that doesn't contain the claimed op):

1. Any client can submit slash evidence via custom_json
2. Other operators verify the evidence
3. If confirmed (60% quorum): operator removed, WoT reputation penalized
4. Operator must re-register and get re-vouched to return

### Anti-Censorship

If all operators collude to omit a player's ops:

1. Player's personal scan (`get_account_history`) still returns their own ops — censorship only affects the shared index
2. Client cross-checks: "my personal scan shows 50 wins, index shows 45" → 5 entries missing → flag
3. Player submits **inclusion proof** via custom_json: lists missing trxIds publicly
4. Any community member can spin up a competing operator (code is open source) that includes the missing entries

## CID Publication (How Clients Find the Latest Index)

### Option 1: On-Chain Pointer (Recommended)

A dedicated Hive account (`@ragnarok-index`) posts the latest CID:

```json
{
  "action": "index_update",
  "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  "block": 95500,
  "stateHash": "abc123...",
  "attestations": 4
}
```

Clients scan `@ragnarok-index` account history (tiny account, only index updates) to get the latest CID. One API call, instant.

**Who posts?** The designated publisher for that chunk rotation cycle. The account's posting authority is shared among all active WoT operators (Hive supports multi-account posting auth).

### Option 2: Game Binary Bundle (Fallback)

Each game release ships with the latest index snapshot:
- `public/index-snapshot.json.gz` (~750KB compressed)
- Client uses this if IPFS is unreachable or `@ragnarok-index` has no updates yet

### Option 3: Hive Account Fallback

If IPFS gateways are unreachable, client reads recent ops directly from `@ragnarok-index` account history. The `index_update` ops contain enough metadata (block range, stateHash) to reconstruct recent state without full NDJSON chunks.

### Option 4: P2P Relay (Emergency)

When two players connect for a match, the player with fresher index data streams missing chunks to the other via WebRTC data channel. Uses existing PeerJS infrastructure.

### Resolution Priority

```
1. @ragnarok-index on-chain CID (freshest, 1 API call)
2. IPFS gateway fetch (content-addressed, verifiable)
3. Hive account fallback (index_update ops as mini-index)
4. HafSQL public API (zero infrastructure, queries hafsql-api.mahdiyari.info) [v1.2]
5. Bundled snapshot (shipped with game, always available)
6. P2P peer exchange (WebRTC relay from connected players)
```

## Client Integration

### First Launch (New Player)

```
1. Game loads
2. Check @ragnarok-index for latest CID               ← 1 API call
3. Fetch manifest.json from IPFS gateway               ← 1 HTTP request
4. Fetch snapshots FIRST (leaderboard + supply)        ← 2 small HTTP requests
   → Leaderboard and supply are now usable instantly
5. Fetch gzipped chunks in background (parallel)       ← N HTTP requests (~750KB total)
6. Decompress + parse NDJSON into IndexedDB
7. Personal scan: get_account_history(myUsername)       ← 1 API call
8. Done. Total: ~3 API calls + N small HTTP fetches
```

### Returning Player

```
1. Game loads
2. Read local IndexedDB — has cached index up to block X
3. Check @ragnarok-index for latest CID               ← 1 API call
4. Compare manifest.lastBlock vs local block X
5. Fetch updated snapshots (leaderboard + supply)      ← 2 small HTTP requests
6. Fetch only NEW chunks since block X (background)    ← 1-2 HTTP requests
7. Merge into local IndexedDB
8. Personal scan for own recent ops                    ← 1 API call
9. Done. Total: ~2 API calls + 2-4 HTTP fetches
```

### During Gameplay

```
- Broadcast ops via Keychain                           ← writes only, no reads
- Query leaderboard: local IndexedDB                   ← 0 API calls
- Query opponent stats: local IndexedDB or P2P         ← 0 API calls
- Verify card ownership: local IndexedDB               ← 0 API calls
- View match replay: fetch raw op by trxId             ← 1 API call (on demand)
```

### Optimistic Local Updates

When the client broadcasts an op (e.g., match_result), it immediately applies the expected state change to local IndexedDB before the operator confirms it:

```
1. Player wins match → broadcast match_result via Keychain
2. Client computes expected ELO delta locally (K=32, same formula)
3. Client updates local leaderboard entry optimistically
4. Next index sync either confirms (hashes match) or corrects (operator computed different due to concurrent matches)
```

This eliminates the "I just won but leaderboard didn't update" problem.

## Client-Side IndexedDB Schema

Extends the existing `replayDB.ts` with global index stores:

```typescript
// New stores added to existing IndexedDB (version bump)
const GLOBAL_STORES = {
  // All indexed ops (the phone book)
  'global_ops': {
    keyPath: ['trxId', 'opIndexInBlock'],
    indexes: {
      'by_player': 'player',
      'by_action': 'action',
      'by_block': 'blockNum',
      'by_player_action': ['player', 'action'],
      'by_counterparty': 'counterparty',
    }
  },

  // Pre-computed leaderboard (updated from snapshots)
  'global_leaderboard': {
    keyPath: 'username',
    // Sorted by ELO descending in snapshot
  },

  // Supply counters (updated from snapshots)
  'global_supply': {
    keyPath: 'key',  // e.g., "common:minted", "rare:cap"
  },

  // Index sync metadata
  'index_sync': {
    keyPath: 'key',  // 'lastBlock', 'lastCid', 'lastSyncAt'
  },
};
```

### Query Examples

```typescript
// Top 100 leaderboard
const top100 = await db.getAll('global_leaderboard');
// Already sorted in snapshot, just slice

// My match history
const myMatches = await db.getAllFromIndex(
  'global_ops', 'by_player_action',
  IDBKeyRange.only(['myUsername', 'match_result'])
);

// Card ownership (latest transfer per UID)
const cardOps = await db.getAllFromIndex(
  'global_ops', 'by_player_action',
  IDBKeyRange.only(['myUsername', 'card_transfer'])
);
// + filter for mint, reward_claim actions
// Group by cardUid, take latest

// Total supply of mythic cards
const supply = await db.get('global_supply', 'mythic:minted');
```

## Operator Indexer Process

The operator binary is a lightweight Node.js script (~50KB):

```
┌─────────────────────────────────────────────────┐
│              Operator Indexer                     │
│                                                   │
│  1. Read cursor from local state                  │
│  2. Fetch blocks [cursor+1 ... LIB] from Hive    │
│     (get_ops_in_block, 50 per batch)              │
│  3. Filter for ragnarok-cards custom_json         │
│  4. Validate via protocol-core applyOp()          │
│  5. Append IndexEntry to current chunk            │
│  6. Update pre-computed snapshots                 │
│  7. If chunk boundary reached:                    │
│     a. Finalize chunk → gzip → pin to IPFS        │
│     b. Update manifest.json                       │
│     c. Compute stateHash                          │
│     d. Sign with Hive key                         │
│     e. If designated publisher: post CID          │
│        Else: post attestation only                │
│  8. Advance cursor, repeat                        │
│  9. Heartbeat: post attestation every 24h min     │
│                                                   │
│  Poll interval: 10 seconds                        │
│  Chunk boundary: every 10,000 blocks (~8.3 hours) │
│  Compaction: merge chunks older than 30 days       │
│  Attestation: every chunk finalization             │
└─────────────────────────────────────────────────┘
```

### Chunk Compaction

Old chunks are periodically merged to prevent bootstrap bloat:

```
Before compaction (year 3, returning player offline 6 months):
  → 525 granular chunks to download (~7.5MB each = ~3.9GB)

After compaction:
  → 5 compacted archives + 25 recent granular chunks (~200MB total)

Rule: Chunks older than 30 days get merged into compacted archives.
Compacted archives cover 100,000 blocks each (~3.5 days).
Recent chunks stay granular for fine-grained delta sync.
```

### Reused Components

The operator reuses existing protocol-core code with zero modifications:

| Component | Source | Used For |
|---|---|---|
| `applyOp()` | `shared/protocol-core/apply.ts` | Validate every op |
| `normalizeAction()` | `shared/protocol-core/normalize.ts` | Canonical action names |
| `StateAdapter` interface | `shared/protocol-core/types.ts` | State tracking |
| ELO calculation | `shared/protocol-core/elo.ts` | Derived ELO in entries |
| Supply tracking | `shared/protocol-core/supply.ts` | Derived supply counters |
| Op schemas (Zod) | `shared/protocol-core/opSchemas.ts` | Runtime validation |

The operator is essentially `server/services/chainIndexer.ts` repackaged as a standalone process that writes to IPFS instead of `chainState.json`.

## What Gets Deleted

Once the decentralized indexer is live, these server components become unnecessary:

| File | Purpose | Replacement |
|---|---|---|
| `server/services/chainIndexer.ts` | Server-side block scanner | WoT operator process |
| `server/services/chainState.ts` | In-memory state + JSON persistence | IPFS index + client IndexedDB |
| `server/services/serverStateAdapter.ts` | StateAdapter backed by chainState | Operator's own StateAdapter |
| `server/routes/chainRoutes.ts` | REST endpoints (leaderboard, player, cards) | Client-side IndexedDB queries |
| `server/routes/matchmakingRoutes.ts` | WebSocket matchmaking queue | On-chain queue_join/leave + P2P |
| `server/routes/socialRoutes.ts` | Friend presence heartbeats | PeerJS presence probing |
| `server/routes/tournamentRoutes.ts` | Tournament bracket management | On-chain tournament ops |
| `server/routes/mockBlockchainRoutes.ts` | Dev-only mock | Keep for dev only |
| `server/routes.ts` | Express route mounting | Eliminated |
| `server/storage.ts` | Database interface | Eliminated |

### What Stays (Dev/Testing Only)

- `server/` directory remains for local development and testing
- `ENABLE_CHAIN_INDEXER` env var already gates the indexer — keep it off in production
- Mock blockchain routes useful for offline development

## Security Model

### Trust Assumptions

1. **Hive blockchain is honest** — blocks signed by elected witnesses, irreversible after 2/3+ confirmation
2. **Replay rules are deterministic** — same ops → same state, always (sealed at genesis, can't change)
3. **Majority of operators are honest** — 60% quorum for state confirmation
4. **IPFS content addressing is sound** — CID = hash of content, can't serve wrong data for a CID

### Attack Vectors & Mitigations

| Attack | Mitigation |
|---|---|
| Operator publishes fake entries | Entries reference on-chain trxIds — anyone can verify. Cross-operator stateHash consensus catches divergence before clients see it. |
| Operator omits entries (censorship) | Multiple independent operators; personal scan cross-check detects missing ops; inclusion proofs on-chain. |
| IPFS gateway serves stale data | Client checks manifest.lastBlock against known LIB; multiple gateway fallback. |
| All operators collude | State hash is deterministically verifiable — any client can replay and check. Personal scan still works for own data. |
| Sybil operators | WoT vouching requires existing operator endorsement; genesis signers bootstrap trust. |
| Client trusts corrupt index | Background spot-check: randomly verify 1% of entries against chain. |
| Split brain (operators at different blocks) | Designated publisher rotation; attestation-only for non-publishers; 30-min failover timeout. |
| IPFS unreachable | 6-tier resolution: on-chain CID → IPFS gateway → Hive fallback → HafSQL → bundled snapshot → P2P relay. |
| Operator attrition (<3 active) | Degraded mode: personal scan + bundled snapshot; increasing revenue share incentivizes new operators. |
| Race condition (play match, check leaderboard) | Optimistic local ELO update; reconcile on next index sync. |

### Verification Tiers

Clients can choose their trust level:

```
Tier 1 (Fast, trust operators):
  Download index, use immediately. No chain verification.
  Good for: casual players, leaderboard browsing.

Tier 2 (Balanced, spot-check):
  Download index, randomly verify 1% of entries against chain.
  If any fail → fall back to Tier 3.
  Good for: regular players, moderate trust.

Tier 3 (Paranoid, full verify):
  Download index, verify ALL entries for your account against chain.
  Verify opponent's entries before ranked matches.
  Good for: competitive players, high-stakes tournaments.
```

## IPFS Cost Model

### Pinning

Each operator pins via Pinata, web3.storage, or self-hosted IPFS node:

| Year | Index size (gzipped) | Pinning cost/mo | Bandwidth cost/mo (50K players) |
|---|---|---|---|
| 1 | ~750 KB | Free tier | Free tier |
| 3 | ~7.5 MB | Free tier | ~$5 |
| 5 | ~30 MB | ~$1 | ~$20 |

### Bandwidth Optimization

- Clients cache aggressively — only fetch new chunks since last sync
- Public IPFS gateways (`ipfs.io`, `dweb.link`, `cloudflare-ipfs.com`) distribute load
- WebRTC P2P relay between connected players reduces gateway hits
- Compacted archives reduce total chunk count for bootstrap

Budget is covered by the 5% operator revenue share at even modest pack sale volumes.

## Migration Path

### Phase 1: Build the Operator Indexer

Extract `chainIndexer.ts` logic into standalone process:
- Read blocks from Hive RPC (same `get_ops_in_block` API)
- Filter for ragnarok-cards ops
- Apply protocol-core validation
- Output NDJSON chunks + manifest
- Compute state hash per chunk
- Publish to IPFS (pluggable: Pinata, local IPFS, or file output)
- Post CID to @ragnarok-index (when designated publisher)

**Deliverable**: Open-source `operator/` directory that anyone can `npm start`.

### Phase 2: Client Index Consumer

Add index consumption to game client:
- Fetch manifest from IPFS (via CID from @ragnarok-index)
- Download snapshots first (instant leaderboard + supply)
- Download + cache chunks in IndexedDB (background)
- Replace all `chainRoutes.ts` API calls with local IndexedDB queries
- Optimistic local updates after own broadcasts
- Personal scan via `get_account_history` for own account (already exists)

**Deliverable**: Game works with zero server dependency.

### Phase 3: WoT Operator Network

- Genesis signers auto-registered as first operators (cold start solved)
- Operator registration via custom_json
- WoT vouching (reuse treasury system)
- Multi-operator attestation + designated publisher rotation
- 24h heartbeat liveness requirement
- Revenue share from pack sales (5%, increases per-operator as count drops)
- Slashing for provably incorrect entries
- Anti-censorship: personal scan cross-check + inclusion proofs

**Deliverable**: Decentralized, incentivized operator network.

### Phase 4: Eliminate Server Routes

- Remove matchmaking server → on-chain queue + P2P connect
- Remove social server → PeerJS presence
- Remove tournament server → on-chain bracket ops
- Server directory becomes dev-only tooling

**Deliverable**: Fully serverless production deployment.

## Comparison

| | HAF | Centralized Server | Light HAF (This Design) |
|---|---|---|---|
| Full Hive node | Required (~500GB) | No | No |
| PostgreSQL | Required | No | No |
| Server infra | Dedicated | Yes | No (operators volunteer) |
| Query capability | Full SQL | REST endpoints | Client-side IndexedDB |
| Data freshness | Real-time | ~10s polling | ~10s (operator) + IPFS propagation |
| Decentralized | No (single instance) | No (single server) | Yes (N operators, M clients) |
| Cost | $50-200/mo server | $10-50/mo server | ~Free (IPFS pinning + RC) |
| Single point of failure | HAF server | Game server | None |
| Trust model | Trust the HAF operator | Trust the server | Verify via chain (trustless) |
| Offline capable | No | No | Yes (cached index) |
| New player bootstrap | Instant (server query) | Instant (server query) | ~2s (fetch snapshots from IPFS) |
| Censorship resistant | No | No | Yes (personal scan + inclusion proofs) |
| Survives operator attrition | N/A | N/A | Yes (degraded mode + bundled snapshot) |

## Summary

The decentralized indexer gives Ragnarok Cards the data precision of HAF with none of the infrastructure burden. Every game client becomes self-sufficient — reading from a shared, community-maintained index that's verifiable against the immutable Hive blockchain.

No servers. No databases. No single point of failure. Just the chain, the index, and the players.

```
Hive Blockchain (source of truth, immutable)
        ↓
WoT Operators (extract, validate, publish — incentivized via 5% revenue)
        ↓
IPFS Index (shared phone book, content-addressed, ~750KB year 1)
        ↓
Game Clients (download snapshots first, chunks in background, query locally)
        ↓
P2P Exchange (real-time data between players, WebRTC relay fallback)
```

The chain is the ledger. The index is the table of contents. The operators are the librarians. The players are the readers. No one entity controls access to the truth.

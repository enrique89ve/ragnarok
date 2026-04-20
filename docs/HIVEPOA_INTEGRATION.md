# HivePoA Integration Spec — Ragnarok Game Indexer

**Status**: Design complete, ready for HivePoA team implementation
**Date**: 2026-03-19
**Authors**: theycallmedan, Claude Opus 4.6
**For**: HivePoA / SPK Network development team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [What Ragnarok Has Built](#3-what-ragnarok-has-built)
4. [What HivePoA Needs to Build](#4-what-hivepoa-needs-to-build)
5. [Operator SDK Spec](#5-operator-sdk-spec)
6. [Transcript Relay Spec](#6-transcript-relay-spec)
7. [On-Chain Operator Registry](#7-on-chain-operator-registry)
8. [Revenue Distribution](#8-revenue-distribution)
9. [IPFS Optimization Recommendations](#9-ipfs-optimization-recommendations)
10. [Security Model](#10-security-model)
11. [Timeline & Priorities](#11-timeline--priorities)

---

## 1. Executive Summary

Ragnarok: Norse Mythos Card Game is a fully decentralized TCG on Hive L1 with:
- 2,400+ NFT cards, on-chain marketplace, pack commit-reveal
- Client-side chain replay (zero server dependency)
- P2P multiplayer via WebRTC (no game server)
- WoT operator model for decentralized indexing

**The missing piece**: Our WoT operators currently perform manual IPFS uploads and CID publishing. HivePoA can automate this, making the indexer truly zero-maintenance.

**What we need from HivePoA:**

| Component | Lines of Code | Priority |
|-----------|--------------|----------|
| Operator SDK (npm package) | ~300 | **P0 — Genesis blocker** |
| Transcript relay endpoint | ~150 | **P1 — Post-launch** |
| On-chain operator registry | ~200 | **P1 — Post-launch** |
| Revenue distribution | ~100 | **P2 — When marketplace active** |

**Total: ~750 lines of new code on HivePoA side.**

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HIVE LAYER 1                              │
│  custom_json ops: mint, transfer, match_result, market_*    │
│  Native transfers: 0.001 HIVE atomic companions             │
│  CID pointer: @ragnarok-index account                       │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌──────────────────────────────────┐
│  WoT OPERATOR        │    │  GAME CLIENT (Browser)           │
│  (indexer binary)     │    │                                  │
│                       │    │  ┌─ Tier 1: On-chain CID        │
│  Scans blocks         │    │  ├─ Tier 2: IPFS gateway        │
│  Builds NDJSON chunks │    │  ├─ Tier 3: HafSQL fallback     │
│  Computes ELO/supply  │    │  ├─ Tier 4: Bundled snapshot    │
│  Writes manifest      │    │  ├─ Tier 5: P2P peer relay      │
│         │             │    │  └─ Tier 6: Personal scan        │
│         ▼             │    │                                  │
│  ┌─────────────┐      │    │  IndexedDB: 4 stores, 5 indexes │
│  │ HivePoA SDK │◄─────┤    │  Local queries: zero API calls  │
│  │             │      │    │                                  │
│  │ uploadChunk │      │    └──────────────────────────────────┘
│  │ publishCID  │      │
│  │ heartbeat   │      │
│  └──────┬──────┘      │
│         │             │
└─────────┼─────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────┐
│                     HIVEPOA / IPFS                            │
│                                                              │
│  Pin chunks to IPFS (self-hosted or Pinata/NFT.Storage)     │
│  Broadcast CID to @ragnarok-index                            │
│  Store transcript bundles (30-day TTL, then prune)          │
│  Operator registry (WoT vouching)                           │
│  Revenue tracking (5% of pack sales to operators)           │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. What Ragnarok Has Built

### Operator Binary (`operator/indexer.ts` — 520 lines)

**Input**: Hive blockchain via 3 public RPC nodes
**Processing**: Scan blocks → normalize ops → compute ELO/supply → build NDJSON
**Output**: Chunk files + manifest + snapshots written to local disk

```
operator/
└── indexer.ts          # Standalone Node.js binary
    ├── Block scanner   # get_ops_in_block RPC calls
    ├── Op normalizer   # Legacy rp_* → canonical actions
    ├── ELO engine      # K=32, floor=1000
    ├── Chunk writer    # NDJSON, 10K blocks per chunk
    ├── Snapshot writer # Leaderboard (top 1000) + supply counters
    └── Manifest writer # JSON with chunk list + attestations
```

**What operator does NOT do (needs HivePoA):**
- Upload chunks to IPFS
- Publish manifest CID to @ragnarok-index account
- Sign attestations cryptographically
- Run transcript relay endpoint
- Heartbeat/aliveness proof

### Client Sync (`client/src/data/indexer/` — 800 lines)

6-tier resolution with automatic failover:

```
Tier 1: @ragnarok-index custom_json → extract CID          (~500ms)
Tier 2: IPFS gateway fetch manifest + chunks                (~2-10s)
Tier 3: HafSQL API scan (free, zero infrastructure)         (~5-15s)
Tier 4: Bundled JSON snapshot (shipped with game)            (~10ms)
Tier 5: P2P peer exchange via WebRTC                         (variable)
Tier 6: Personal account scan via Hive RPC                   (~5-30s)
```

Client stores everything in IndexedDB (`ragnarok-index-v1`, 4 stores):
- `global_ops` — full op log with 5 indexes
- `global_leaderboard` — ELO rankings
- `global_supply` — per-card mint counts
- `index_sync` — cursor metadata

**All queries are local** — zero API calls after sync.

### Transcript Pipeline (NEW — just built)

```
Match ends → TranscriptBuilder serializes NDJSON
           → pinTranscript() tries operator relay
           → Falls back to local IndexedDB cache
           → CID embedded in match_result on L1
           → Operators pin for 30 days → unpin (prune)
```

### Protocol Core (`shared/protocol-core/` — 1,246 lines)

29 canonical ops, 192 conformance tests:
- NFT lifecycle: mint, transfer, burn, replicate, merge
- Pack system: commit-reveal, deterministic DNA
- Marketplace: list, buy, offer, accept, reject (6 ops)
- Match: anchor, result (dual-signed)
- Airdrop: DUAT claim, finalize

---

## 4. What HivePoA Needs to Build

### Overview

| # | Component | What It Does | Effort |
|---|-----------|-------------|--------|
| 1 | **Operator SDK** | npm package wrapping IPFS upload + CID publish + heartbeat | ~300 lines |
| 2 | **Transcript Relay** | HTTP endpoint for match transcript pin/fetch | ~150 lines |
| 3 | **Operator Registry** | 3 custom_json ops for WoT operator management | ~200 lines |
| 4 | **Revenue Tracker** | Monitor pack sales, compute 5% operator share | ~100 lines |

---

## 5. Operator SDK Spec

### Package: `@ragnarok/hivepoa-operator`

```typescript
import { HivePoAOperator } from '@ragnarok/hivepoa-operator';

const operator = new HivePoAOperator({
  account: 'my-operator-account',
  postingKey: process.env.HIVE_POSTING_KEY,
  ipfsEndpoint: 'http://localhost:5001',  // Local IPFS node
  // OR pinningService: { provider: 'pinata', apiKey: '...' }
});
```

### Methods Required

#### `uploadChunk(ndjson: string, blockRange: [number, number]): Promise<string>`

Upload a single NDJSON chunk to IPFS. Returns CID.

```typescript
const cid = await operator.uploadChunk(
  fs.readFileSync('chunks/chunk-000090000-000099999.ndjson', 'utf8'),
  [90000, 99999]
);
// Returns: "bafkreie..."
```

Implementation:
1. `ipfs.add(Buffer.from(ndjson))` → get CID
2. Pin the CID (`ipfs.pin.add(cid)`)
3. Return CID string

#### `publishManifest(manifest: IndexManifest, signature: string): Promise<string>`

Broadcast manifest CID to @ragnarok-index Hive account. Returns trxId.

```typescript
const trxId = await operator.publishManifest(manifest, signature);
// Broadcasts custom_json:
// {
//   id: 'ragnarok-cards',
//   json: {
//     action: 'index_update',
//     cid: manifest.latestCID,
//     block: manifest.lastBlock,
//     stateHash: attestation.stateHash,
//     attestations: manifest.attestations
//   }
// }
```

Implementation:
1. Upload manifest JSON to IPFS → get manifest CID
2. Build `custom_json` payload with CID + stateHash
3. Sign with operator's posting key
4. Broadcast to Hive via RPC

#### `heartbeat(stateHash: string): Promise<string>`

Prove operator is alive and agrees with current state. Returns trxId.

```typescript
const trxId = await operator.heartbeat(stateHash);
// Broadcasts custom_json:
// {
//   id: 'ragnarok-cards',
//   json: {
//     action: 'operator_heartbeat',
//     operator: 'my-account',
//     stateHash,
//     block: currentBlock,
//     timestamp: Date.now()
//   }
// }
```

Should be called every 24 hours. Client health checks consider operators stale after 48h without heartbeat.

#### `uploadTranscript(bundle: TranscriptBundle): Promise<string>`

Pin a match transcript to IPFS. Returns CID.

```typescript
const cid = await operator.uploadTranscript(transcriptBundle);
// Just ipfs.add(JSON.stringify(bundle)) → pin → return CID
```

Transcripts are small (5-50KB). Operators unpin after 30 days.

### Integration Point in Existing Operator Binary

Replace manual steps in `operator/indexer.ts`:

```typescript
// BEFORE (manual):
writeChunkToDisk(chunk);
writeManifest(outputDir, chunks, lastBlock, totalOps, account);
// Then operator manually: ipfs add ./output/ && hive broadcast ...

// AFTER (with HivePoA SDK):
import { HivePoAOperator } from '@ragnarok/hivepoa-operator';
const hivePoA = new HivePoAOperator({ account, postingKey, ipfsEndpoint });

// In chunk finalization:
const chunkCID = await hivePoA.uploadChunk(ndjsonContent, [blockStart, blockEnd]);
chunk.cid = chunkCID;

// In manifest write:
const trxId = await hivePoA.publishManifest(manifest, signature);
console.log('Published manifest:', trxId);

// Every 24h (cron or timer):
await hivePoA.heartbeat(computeStateHash(chunks, lastBlock));
```

---

## 6. Transcript Relay Spec

### Endpoint: `/api/transcript`

Operators run this HTTP endpoint alongside their indexer binary.

#### `POST /api/transcript`

Pin a match transcript.

```
Request:
  Content-Type: application/json
  Body: TranscriptBundle (JSON)

Response:
  200 OK
  { "cid": "bafkreie...", "pinned": true }

  400 Bad Request
  { "error": "Invalid transcript: missing merkleRoot" }

  413 Payload Too Large
  { "error": "Transcript exceeds 100KB limit" }
```

Validation:
- Bundle must have `version`, `matchId`, `merkleRoot`, `moves` fields
- `moves` must be valid NDJSON (each line parseable as JSON)
- Max size: 100KB (prevents abuse — typical transcripts are 5-50KB)
- No auth required (transcripts are public, verifiable via merkleRoot on-chain)

#### `GET /api/transcript/:cid`

Fetch a pinned transcript.

```
Response:
  200 OK
  Content-Type: application/json
  Body: TranscriptBundle

  404 Not Found
  { "error": "Transcript not found or expired" }
```

Implementation:
1. Check local cache first (in-memory LRU or disk)
2. If not cached: `ipfs.cat(cid)` → parse → validate → cache → return
3. If IPFS fails: return 404

### Client Already Calls This

In `client/src/data/blockchain/transcriptIPFS.ts`:

```typescript
// pinTranscript() already tries:
const resp = await fetch('/api/transcript', { method: 'POST', body: json });

// fetchTranscript() already tries:
const resp = await fetch(`/api/transcript/${cid}`);
```

The client falls back to local IndexedDB storage if the relay is unavailable.

---

## 7. On-Chain Operator Registry

Three new `custom_json` actions for HivePoA governance:

### `operator_register`

```json
{
  "id": "ragnarok-cards",
  "json": {
    "action": "operator_register",
    "operator": "my-account",
    "endpoint": "https://my-operator.example.com",
    "ipfsNodeId": "QmPeer..."
  }
}
```

**Auth**: Posting key of `operator` account
**Validation**:
- Account must be a top-150 Hive witness OR have 3+ vouches from existing operators
- Endpoint must respond to `GET /api/health` within 10s
- One registration per account

### `operator_deregister`

```json
{
  "id": "ragnarok-cards",
  "json": {
    "action": "operator_deregister",
    "operator": "my-account",
    "reason": "voluntary"
  }
}
```

**Auth**: Posting key of `operator` account (voluntary) OR 2-of-3 genesis signers (forced removal)
**Forced removal triggers**: Stale >7 days, 3+ failed signature verifications, WoT revocation

### `operator_heartbeat`

```json
{
  "id": "ragnarok-cards",
  "json": {
    "action": "operator_heartbeat",
    "operator": "my-account",
    "stateHash": "a1b2c3...",
    "block": 90000,
    "timestamp": 1710900000000
  }
}
```

**Auth**: Posting key of `operator` account
**Frequency**: Every 24 hours
**Stale threshold**: 48 hours without heartbeat → marked inactive
**Auto-removal**: 7 days without heartbeat → deregistered

### Client Health Calculation

The client already computes health from operator data:

```
healthy:       3+ active operators, 60%+ agree on stateHash (within 24h)
degraded:      <3 operators OR <60% quorum
snapshot-only: 0 active operators, using bundled snapshot
offline:       No index available at all
```

---

## 8. Revenue Distribution

### Model

WoT operators earn **5% of pack sales revenue**.

Already defined in our codebase:
```typescript
// shared/indexer-types.ts
export const OPERATOR_REVENUE_SHARE = 0.05; // 5% of pack sale HIVE
```

### How It Works

1. HivePoA monitors `market_buy` ops where `nftType === 'pack'`
2. For each pack sale: `operatorShare = price * 0.05`
3. Split equally among active operators (heartbeat within 48h)
4. Distribute monthly via native HIVE transfer from @ragnarok-treasury

### Example

```
Pack sold for 10 HIVE
  → 0.5 HIVE to operator pool
  → 3 active operators
  → 0.167 HIVE each (accumulated monthly)

100 packs sold in Month 1 at avg 8 HIVE = 800 HIVE total sales
  → 40 HIVE operator pool
  → 3 operators → 13.3 HIVE each (~$4-8 at typical HIVE prices)
  → Plus: operators earn Hive RC from their own activity
```

---

## 9. IPFS Optimization Recommendations

Based on deep research into production IPFS systems (Ceramic, The Graph, Bluesky AT Protocol):

### What We Have (Already Optimal)

| Decision | Why It's Right |
|----------|---------------|
| NDJSON chunk format | Human-debuggable, adequate at our scale (~15KB/chunk) |
| On-chain CID pointer | Faster than IPNS (500ms vs 11s), trust-anchored, free |
| 6-tier resolution | Most resilient fallback chain in any Web3 game |
| Block-range chunk naming | Enables delta sync without manifest comparison |
| IndexedDB client queries | Zero API calls, works offline |

### Recommended Upgrades

#### 1. gzip Compression on Chunks (Easy Win)

```
Before: chunk-000090000-000099999.ndjson    (~15KB)
After:  chunk-000090000-000099999.ndjson.gz (~4KB, 75% reduction)
```

We already have `fflate` in our dependencies. Operator compresses before upload, client decompresses after fetch. Browser `DecompressionStream` handles gzip natively.

**Effort**: ~20 lines in operator + ~10 lines in client sync

#### 2. CAR File for Initial Sync (Medium Win)

First-time players currently make N individual gateway requests (one per chunk). A single CAR file bundles everything:

```
Before: 50 IPFS gateway requests for 50 chunks (~25-50s)
After:  1 request for genesis.car containing all chunks (~3-5s)
```

Use `@ipld/car` to create CAR. Ship a "genesis CAR" CID that clients fetch on first sync.

**Effort**: ~50 lines in operator + ~30 lines in client

#### 3. Multi-Provider Pinning (Resilience)

Each operator should pin to their own IPFS node. With 3-5 operators, we get 3-5x redundancy without paying Pinata. If operators go down, NFT.Storage provides perpetual backup (Filecoin endowment).

**Effort**: Configuration, no code changes

### NOT Recommended (Overkill at Current Scale)

| Technology | Why Not |
|-----------|---------|
| Prolly Trees | Only needed for player-specific range queries across operators. Our flat chunks work fine. |
| DAG-CBOR | Only saves ~20-30% vs JSON at our chunk sizes. Not worth the debugging complexity loss. |
| IPNS | 11s median resolution. Our on-chain CID pointer is 20x faster. |
| AI/RAG | Fixed schema, deterministic queries. RAG adds latency and non-determinism. |
| zstd compression | marginal improvement over gzip at 15KB chunks. Browser support still spotty. |

---

## 10. Security Model

### Trust Model

```
NFT ownership   → Hive L1 (trustless, immutable)
Match results   → Hive L1 + dual signatures (trustless)
Index data      → WoT operators (trust-but-verify)
Transcripts     → IPFS + Merkle root on L1 (verifiable)
```

### Attack Mitigations

| Attack | Mitigation |
|--------|-----------|
| **Operator publishes wrong ELO** | Client can verify by replaying match_result ops from L1 |
| **Operator omits ops from index** | Other operators catch the discrepancy (stateHash mismatch) |
| **Operator pins garbage transcript** | merkleRoot on L1 verifies transcript integrity |
| **Operator goes offline** | 5 other tiers of resolution (IPFS gateway, HafSQL, snapshot, P2P, personal scan) |
| **All operators collude** | Client falls back to bundled snapshot + direct L1 replay (slower but trustless) |
| **IPFS gateway censors CID** | Multiple gateways + operator relay + local cache |
| **Transcript spam (pin abuse)** | 100KB max per transcript, Hive RC natural rate limit |

### Key Insight

The indexer is an **optimization layer**, not a trust layer. If every operator disappeared tomorrow, the game still works — clients replay the chain directly (just slower). HivePoA makes it fast and convenient, not possible.

---

## 11. Timeline & Priorities

### Phase 1: Genesis Launch (Week 1-2)

**HivePoA delivers:**
- [ ] Operator SDK (`uploadChunk`, `publishManifest`) — npm package
- [ ] At least 1 operator running with SDK integrated

**Ragnarok delivers:**
- [x] Operator binary (built)
- [x] Client 6-tier sync (built)
- [x] Transcript pipeline (built)
- [ ] Genesis ceremony (pending accounts)

### Phase 2: Post-Launch (Week 3-4)

**HivePoA delivers:**
- [ ] Transcript relay endpoint (`/api/transcript`)
- [ ] Operator registry (3 custom_json ops)
- [ ] Heartbeat system

**Ragnarok delivers:**
- [ ] Wire transcript relay into existing client code (already tries it)
- [ ] 3+ operators running with heartbeat

### Phase 3: Marketplace Active (Month 2+)

**HivePoA delivers:**
- [ ] Revenue tracking from `market_buy` ops
- [ ] Monthly HIVE distribution to operators

**Ragnarok delivers:**
- [ ] Marketplace UI wired to on-chain ops (built)
- [ ] Pack sales generating revenue

### Phase 4: Scale (Month 3+)

- gzip chunk compression
- CAR file for initial sync
- Prolly Tree (if player-specific queries needed)
- Operator rotation automation

---

## Appendix A: Data Formats

### IndexEntry (one per op, ~150 bytes)

```typescript
{
  player: string;           // Hive username
  counterparty?: string;    // Other party (opponent, recipient)
  action: string;           // Canonical action name
  trxId: string;            // Hive transaction ID
  blockNum: number;
  opIndexInBlock: number;
  timestamp: number;        // Block timestamp
  derived?: {               // Pre-computed derived data
    winner?: string;
    loser?: string;
    eloAfter?: number;
    cardUid?: string;
    cardId?: number;
    runeChange?: number;
    transcriptCID?: string;
  }
}
```

### IndexManifest (one per publish, ~2KB)

```typescript
{
  version: 1;
  lastBlock: number;
  lastBlockTimestamp: number;
  totalOps: number;
  chunks: [{
    file: string;           // "chunks/chunk-000090000-000099999.ndjson"
    blockRange: [number, number];
    opCount: number;
    sha256: string;         // Integrity check
  }];
  snapshots: {
    leaderboard: string;    // "snapshots/leaderboard.json"
    supply: string;
    genesis: string;
  };
  attestations: [{
    operator: string;
    stateHash: string;
    signature: string;
    block: number;
    timestamp: number;
  }];
  publisher: string;
  publisherRotation: string[];
  transcriptCIDs?: string[];  // Recent match transcripts for pinning
}
```

### TranscriptBundle (one per match, 5-50KB)

```typescript
{
  version: 1;
  matchId: string;
  seed: string;
  merkleRoot: string;       // SHA-256, verifiable against L1
  moveCount: number;
  createdAt: number;
  moves: string;            // NDJSON (one JSON line per move)
}
```

---

## Appendix B: Existing Codebase References

| File | Lines | Purpose |
|------|-------|---------|
| `operator/indexer.ts` | 520 | WoT operator binary |
| `client/src/data/indexer/indexSync.ts` | 300 | Client 6-tier resolution |
| `client/src/data/indexer/indexDB.ts` | 200 | IndexedDB stores |
| `client/src/data/indexer/indexQueries.ts` | 150 | Local query API |
| `shared/indexer-types.ts` | 120 | Shared types |
| `client/src/data/blockchain/transcriptBuilder.ts` | 175 | Merkle transcript |
| `client/src/data/blockchain/transcriptIPFS.ts` | 150 | Transcript pin/fetch |
| `shared/protocol-core/apply.ts` | 1,246 | Deterministic replay engine |
| `docs/DECENTRALIZED_INDEXER_DESIGN.md` | 800 | Full design document |

---

## Appendix C: Quick Start for HivePoA Developer

```bash
# 1. Clone the game repo
git clone https://github.com/Dhenz14/norse-mythos-card-game
cd norse-mythos-card-game

# 2. Run the operator binary locally
npx tsx operator/indexer.ts --output ./index-output --start-block 0

# 3. See what it produces
ls index-output/
# → chunks/chunk-000000000-000009999.ndjson
# → snapshots/leaderboard.json
# → snapshots/supply.json
# → manifest.json

# 4. Your SDK needs to: upload those files to IPFS + publish CID to Hive
# That's it. Everything else is built.
```

---

*This document is the complete integration spec. No other documents needed. All types, formats, and APIs are defined above. Questions → @theycallmedan on Hive.*

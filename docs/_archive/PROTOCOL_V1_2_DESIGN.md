# Ragnarok Protocol v1.2 — Marketplace, Broadcast Hardening & NFTLox Integration

**Status**: Implemented — ready for genesis
**Date**: 2026-03-19
**Authors**: Claude Opus 4.6, informed by NFTLox SDK/Playground protocol audit
**Affects**: `protocol-core/`, `HiveSync.ts`, `genesisAdmin.ts`, `indexSync.ts`, `normalize.ts`
**Depends on**: Protocol v1.0 (frozen), Protocol v1.1 (atomic transfers, pack NFTs, DNA lineage)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [NFTLox Audit — Patterns Extracted](#2-nftlox-audit--patterns-extracted)
3. [Upgrade 1: BuildResult\<T\> Broadcast Pattern](#3-upgrade-1-buildresultt-broadcast-pattern)
4. [Upgrade 2: Operation Size Estimation & Auto-Batching](#4-upgrade-2-operation-size-estimation--auto-batching)
5. [Upgrade 3: Input Sanitization Layer](#5-upgrade-3-input-sanitization-layer)
6. [Upgrade 4: Deterministic UID Generation](#6-upgrade-4-deterministic-uid-generation)
7. [Upgrade 5: Structured Transfer Memos](#7-upgrade-5-structured-transfer-memos)
8. [Upgrade 6: Mint Session Crash Recovery](#8-upgrade-6-mint-session-crash-recovery)
9. [Upgrade 7: HafSQL Fallback Indexer](#9-upgrade-7-hafsql-fallback-indexer)
10. [Upgrade 8: On-Chain Marketplace Protocol](#10-upgrade-8-on-chain-marketplace-protocol)
11. [Card Visual Design Overhaul](#11-card-visual-design-overhaul)
12. [Architecture Diagram](#12-architecture-diagram)
13. [Security Analysis](#13-security-analysis)
14. [Migration & Backward Compatibility](#14-migration--backward-compatibility)
15. [File Manifest](#15-file-manifest)
16. [Future: Seed/Instance Genesis Model](#16-future-seedinstance-genesis-model)
17. [Integration Vision: Norse Mythos × NFTLox × HivePoA](#17-integration-vision-norse-mythos--nftlox--hivepoa)

---

## 1. Executive Summary

Protocol v1.2 extracts eight production-grade patterns from the [NFTLox SDK](https://github.com/enrique89ve/nftlox-sdk) and [NFTLox Playground](https://github.com/enrique89ve/nftlox-playground), and adds a professional card visual overhaul. The NFTLox protocol is a Hive L1 `custom_json` NFT system with a Seed/Instance model, deterministic IDs, built-in marketplace, and HafSQL indexing. We adopt their best patterns while preserving our unique advantages (client-side replay, anti-cheat, pack commit-reveal, WASM verification).

| Upgrade | Impact | Risk | Effort | Source |
|---------|--------|------|--------|--------|
| **BuildResult\<T\>** | Better UX — all errors at once, not just first | None | 1 file | NFTLox PayloadBuilder |
| **Size Estimation + Batching** | Prevents silent broadcast failures on oversized payloads | None | 1 file, wired to HiveSync | NFTLox estimateOperationSize |
| **Input Sanitization** | Defense-in-depth — strips HTML + control chars before chain | None | Wired to broadcastCustomJson | NFTLox sanitize() |
| **Deterministic UIDs** | Eliminates double-mint bugs on retry/double-click | Low | 1 file | NFTLox FNV-1a IDs |
| **Structured Transfer Memos** | Self-describing transfers on any Hive explorer | None | Wired to transferCard | NFTLox memo format |
| **Mint Session Recovery** | Genesis ceremony survives browser crash | None | 1 file | NFTLox session persistence |
| **HafSQL Fallback** | Zero-infrastructure indexer when IPFS is unreachable | Low | 1 endpoint added | NFTLox HafSQL client |
| **Marketplace Protocol** | Trustless on-chain listing/buying/offers | Medium | 6 new ops | NFTLox marketplace |
| **Card Visual Overhaul** | Professional TCG quality (SVG icons, emblems, rarity gem) | None | 3 files | Pokemon/HS/MTG research |

**What we take from NFTLox**: Broadcast patterns, marketplace ops, HafSQL, deterministic IDs.
**What we keep that NFTLox lacks**: Client-side chain replay, PoW anti-spam, dual-sig match verification, pack commit-reveal, WASM hash checks, provenance stamps, 170 conformance tests.

---

## 2. NFTLox Audit — Patterns Extracted

### NFTLox Architecture (for reference)

NFTLox is a three-tier NFT protocol on Hive:

```
SDK (payload factory)  →  Indexer (HafSQL + Elysia)  →  Playground (web UI)
```

**Key differences from our architecture:**

| Aspect | NFTLox | Ragnarok |
|--------|--------|----------|
| **Scope** | Payload factory (~1,500 lines) | Full replay engine + UI (~15,000+ lines) |
| **State** | External indexer required | Client-side chain replay (zero server) |
| **Mint model** | Seed (template) → Instance (copy) | Single-phase mint with editions |
| **Packs** | None | Sealed pack NFTs with commit-reveal |
| **Anti-cheat** | None (relies on Hive RC) | PoW, dual-sig, nonces, WASM hash |
| **Provenance** | Indexer-side only | Self-describing stamps on NFT object |
| **Marketplace** | Built-in (6 ops) | P2P trade (now: on-chain marketplace) |
| **Lines of code** | ~1,500 | ~15,000+ blockchain layer |

### Patterns We Adopted

1. **PayloadBuilder with BuildResult\<T\>** — structured errors/warnings instead of throw-or-succeed
2. **estimateOperationSize + splitIntoBatches** — pre-validate size, auto-chunk large payloads
3. **sanitize()** — HTML entity + control char stripping before broadcast
4. **FNV-1a deterministic IDs** — same inputs → same UID → automatic dedup
5. **Structured transfer memos** — `ragnarok:action:uid:cardId:edition:dna`
6. **MintingSession persistence** — localStorage tracking for crash recovery
7. **HafSQL as fallback indexer** — zero infrastructure, queries public API
8. **Marketplace protocol** — 6 ops: list, unlist, buy, offer, accept, reject

### Patterns We Declined

- **Seed/Instance two-phase mint**: Valuable but deferred to v1.3 (requires genesis ceremony redesign). Documented in §16.
- **Non-deterministic instance DNA**: NFTLox uses `Math.random()` + `Date.now()` — not reproducible from chain replay. We keep SHA-256 deterministic DNA.
- **External indexer dependency**: NFTLox requires a running indexer for any state query. We keep our client-side replay engine.

---

## 3. Upgrade 1: BuildResult\<T\> Broadcast Pattern

**Problem**: Current `HiveSync.broadcast*()` methods return `{ success, trxId?, error? }`. If validation fails, only the first error is reported. UI can't show all invalid fields at once.

**Solution**: `BuildResult<T>` container with typed error array:

```typescript
interface ValidationError {
  field: string;
  message: string;
  code: 'required' | 'invalid' | 'too_long' | 'duplicate' | 'unauthorized' | 'supply_exceeded';
}

interface BuildResult<T> {
  success: boolean;
  payload?: T;
  operation?: HiveCustomJsonOp;
  errors: ValidationError[];
  warnings: string[];
  generatedId?: string;
  estimatedBytes?: number;
}
```

**Usage**:
```typescript
import { buildSuccess, buildFailure, validationError } from 'shared/protocol-core';

// Success case
return buildSuccess(payload, operation, { generatedId: uid, estimatedBytes: 1234 });

// Failure case — all errors at once
return buildFailure([
  validationError('to', 'Invalid Hive username', 'invalid'),
  validationError('cards', 'Empty card array', 'required'),
]);
```

**File**: `shared/protocol-core/broadcast-utils.ts`

---

## 4. Upgrade 2: Operation Size Estimation & Auto-Batching

**Problem**: Hive custom_json has an 8KB limit. Large mint batches or pack distributions can silently fail if the serialized payload exceeds this.

**Solution**: Pre-broadcast size validation + intelligent auto-splitting.

```typescript
// Estimate bytes (accurate UTF-8 measurement)
estimatePayloadBytes(payload)  → number

// Validate before broadcast
validatePayloadSize(payload)   → { valid: boolean, bytes: number, maxBytes: 8192 }

// Auto-split into batches that fit
splitIntoBatches(items, wrapBatch, maxBytes?)  → T[][]

// Progress estimation
estimateBatchCount(items, wrapBatch)  → number
```

**Wired into `broadcastCustomJson()`**: Every broadcast now checks payload size BEFORE calling Keychain. Oversized payloads return an error with byte counts and a suggestion to split.

**Example — Genesis mint batching**:
```typescript
const batches = splitIntoBatches(
  allCards,
  (batch) => ({ p: 'ragnarok-cards', action: 'mint_batch', to: 'ragnarok', cards: batch }),
);
// batches[0] = first 50 cards, batches[1] = next 50, etc.
// Each batch guaranteed to fit in one custom_json op
```

**Constants**:
- `HIVE_MAX_CUSTOM_JSON_BYTES = 8,192` (Hive hard limit)
- `HIVE_MAX_TX_BYTES = 65,536` (transaction limit)
- `JSON_ENVELOPE_OVERHEAD = 120` (wrapper fields)

---

## 5. Upgrade 3: Input Sanitization Layer

**Problem**: Raw user input (memos, card names in custom payloads) could contain HTML entities, control characters, or injection payloads. Our Zod schemas validate structure but don't sanitize content.

**Solution**: Defense-in-depth sanitization before broadcast:

```typescript
sanitizeString(input)   → strips HTML entities (&<>"') + control chars (\x00-\x1F)
sanitizePayload(obj)    → shallow sanitize all string fields in object
isValidHiveUsername(u)   → regex validation (/^[a-z][a-z0-9.-]{2,15}$/)
```

**Wired into `broadcastCustomJson()`**: Every payload is sanitized before JSON serialization. This runs BEFORE Zod validation (which happens on the replay side), creating a two-layer defense:

```
User Input → sanitizePayload() → JSON.stringify() → Keychain → Chain
                                                        ↓
Chain → normalizeRawOp() → Zod.parse() → applyOp() → State
```

---

## 6. Upgrade 4: Deterministic UID Generation

**Problem**: Current card UIDs use `crypto.randomUUID()`. If the same mint operation is broadcast twice (network retry, user double-click), two different UIDs are generated, creating duplicate cards.

**Solution**: Deterministic UIDs from input parameters. Same inputs → same UID → automatic dedup by the replay engine.

### FNV-1a Hash (Non-Cryptographic)

```typescript
fnv1a(input: string): string  // 64-bit effective (two-pass 32-bit with different seeds)
```

Same algorithm as NFTLox. Non-cryptographic is fine here — we need collision avoidance, not security. The replay engine rejects duplicate UIDs regardless.

### Card UID Generation

```typescript
generateDeterministicCardUid(collectionId, cardId, editionNumber)
// → "card_a1b2c3d4e5f6a1b2"
// Input: "ragnarok:card:ragnarok-alpha:20001:42"
```

### Pack UID Generation

```typescript
generateDeterministicPackUid(collectionId, packType, mintIndex)
// → "pack_f6e5d4c3b2a1f6e5"
```

### DNA Generation (Cryptographic)

```typescript
generateOriginDna(collectionId, cardId)     → SHA-256, first 16 chars (genotype)
generateInstanceDna(originDna, trxId, idx)  → SHA-256, first 16 chars (phenotype)
```

DNA is SHA-256 because it serves as a cryptographic identity, not just a dedup key.

### Art ID Validation

```typescript
validateArtId(artId)  → boolean (max 14 chars, /^[a-zA-Z0-9-]{1,14}$/)
```

Prevents duplicate mints of the same artwork in a collection.

---

## 7. Upgrade 5: Structured Transfer Memos

**Problem**: Card transfers include a generic freeform `memo` field. On Hive explorers (PeakD, HiveScan), these are opaque — users can't tell what was transferred without parsing the custom_json.

**Solution**: Self-describing structured memos:

```
ragnarok:transfer:card_a1b2c3d4:20001:alpha:f6e5d4c3
         ↑action   ↑uid         ↑cardId ↑edition ↑dna(8)
```

### Format

```typescript
buildTransferMemo({
  action: 'transfer' | 'gift' | 'trade' | 'pack_transfer',
  uid: string,
  cardId?: number,
  edition?: string,
  instanceDna?: string,  // first 8 chars only
})
// → "ragnarok:transfer:card_a1b2c3d4:20001:alpha:f6e5d4c3"
```

### Parsing

```typescript
parseTransferMemo("ragnarok:transfer:card_a1b2c3d4:20001:alpha:f6e5d4c3")
// → { protocol: 'ragnarok', action: 'transfer', uid: 'card_a1b2c3d4', cardId: 20001, edition: 'alpha', dnaPrefix: 'f6e5d4c3' }
```

**Wired into `HiveSync.transferCard()`**: Auto-generates structured memo when caller doesn't provide one.

---

## 8. Upgrade 6: Mint Session Crash Recovery

**Problem**: The genesis ceremony mints thousands of cards in batches. If the browser crashes mid-ceremony, there is no way to resume — the admin must manually figure out which batches succeeded and which didn't.

**Solution**: localStorage-persisted session tracking with per-batch status.

### Data Model

```typescript
interface MintSessionBatch {
  batchNumber: number;
  status: 'pending' | 'broadcasting' | 'confirmed' | 'failed';
  cardCount: number;
  trxId?: string;
  error?: string;
  timestamp?: number;
}

interface MintSession {
  sessionId: string;
  status: 'created' | 'genesis_pending' | 'minting' | 'sealing' | 'complete' | 'failed';
  createdAt: number;
  updatedAt: number;
  collectionId: string;
  totalCards: number;
  batches: MintSessionBatch[];
  genesisTrxId?: string;
  sealTrxId?: string;
}
```

### API

```typescript
saveMintSession(session)     // Persist to localStorage
loadMintSession()            // Recover after crash
clearMintSession()           // Cleanup after success
getNextPendingBatch(session) // Find where to resume
getSessionProgress(session)  // { completed: 12, total: 47, percentage: 25 }
```

### Recovery Flow

```
1. Admin opens /admin → Genesis Command Center
2. System checks: loadMintSession()
3. If session exists with status 'minting':
   a. Show "Resume session? 12/47 batches complete (25%)"
   b. Admin clicks Resume
   c. getNextPendingBatch() → batch #13
   d. Continue minting from batch #13
4. If no session: start fresh
```

**Storage key**: `ragnarok_mint_session`

---

## 9. Upgrade 7: HafSQL Fallback Indexer

**Problem**: The decentralized indexer has a 5-tier resolution priority (on-chain CID → IPFS → Hive fallback → bundled snapshot → P2P). If all 5 tiers fail, the indexer goes offline. Before v1.2, there was no way to recover.

**Solution**: Add HafSQL as tier-6 — a free, public Hive API that indexes all `custom_json` operations by ID.

### What is HafSQL?

[HafSQL](https://hafsql-api.mahdiyari.info) is a public Hive API that provides SQL-like queries over blockchain operations. It requires zero infrastructure — we just query it as a REST endpoint. NFTLox uses it as their primary indexer.

### Resolution Priority (Updated)

```
1. @ragnarok-index on-chain CID     (freshest, authoritative)
2. IPFS gateway fetch                (content-addressed, verified)
3. Hive account fallback             (index_update ops as mini-index)
4. HafSQL public API [NEW]           (zero-infrastructure fallback)
5. Bundled snapshot                   (shipped with game client)
6. P2P peer exchange                  (WebRTC relay)
```

### Implementation

```typescript
const HAFSQL_ENDPOINTS = ['https://hafsql-api.mahdiyari.info'];

async function fetchFromHafSQL(fromBlock: number, limit: number): Promise<IndexEntry[]>
// Queries: GET /operations/custom_json/ragnarok-cards?from_block={n}&limit={n}
// Returns: parsed IndexEntry[] with player, action, blockNum, timestamp
```

**Trigger**: When CID resolution returns null (no on-chain pointer found), HafSQL is tried before falling back to bundled snapshot.

### Health Status Mapping

```
IPFS + CID = 'healthy'
IPFS without quorum = 'degraded'
HafSQL only = 'degraded'       ← new
Bundled snapshot = 'snapshot-only'
Nothing works = 'offline'
```

---

## 10. Upgrade 8: On-Chain Marketplace Protocol

**Problem**: Current trading uses a server-mediated P2P trade system (`tradeStore.ts` + `tradeRoutes.ts`). This requires a running server and doesn't provide trustless settlement.

**Solution**: Six new on-chain ops for a fully decentralized marketplace, directly inspired by NFTLox's marketplace protocol.

### New Canonical Actions (6)

| Action | Auth | Description |
|--------|------|-------------|
| `market_list` | Posting | List a card or pack for sale with price |
| `market_unlist` | Posting | Remove a listing |
| `market_buy` | **Active** | Purchase a listed NFT (cross-references payment tx) |
| `market_offer` | Posting | Make a purchase offer on any NFT |
| `market_accept` | **Active** | Accept a pending offer (cross-references payment tx) |
| `market_reject` | Posting | Reject a pending offer |

### Why Active Key for buy/accept?

Buy and accept ops bundle a native HIVE transfer (the payment) in the same transaction. Active key is required for HIVE transfers on Hive L1. The `payment_trx_id` cross-reference allows the replay engine to verify both the custom_json AND the HIVE payment exist.

### Data Model

```typescript
interface MarketListing {
  listingId: string;          // Deterministic: fnv1a("ragnarok:list:{nftUid}:{blockNum}")
  nftUid: string;             // Card or pack UID
  nftType: 'card' | 'pack';
  seller: string;
  price: number;
  currency: 'HIVE' | 'HBD';
  listedBlock: number;
  listedTrxId: string;
  active: boolean;
}

interface MarketOffer {
  offerId: string;            // Deterministic: fnv1a("ragnarok:offer:{nftUid}:{buyer}:{blockNum}")
  nftUid: string;
  buyer: string;
  price: number;
  currency: 'HIVE' | 'HBD';
  offeredBlock: number;
  offeredTrxId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  paymentTrxId?: string;      // Cross-referenced for verification
}
```

### Marketplace State Adapter

```typescript
interface MarketStateAdapter {
  getListing(listingId): Promise<MarketListing | null>;
  getListingByNft(nftUid): Promise<MarketListing | null>;
  putListing(listing): Promise<void>;
  deleteListing(listingId): Promise<void>;
  getOffer(offerId): Promise<MarketOffer | null>;
  getOffersByNft(nftUid): Promise<MarketOffer[]>;
  putOffer(offer): Promise<void>;
  deleteOffer(offerId): Promise<void>;
}
```

### Buy Flow (Trustless Settlement)

```
1. Seller broadcasts market_list (Posting key)
   → Replay engine creates MarketListing (active=true)

2. Buyer sees listing in UI

3. Buyer broadcasts market_buy (Active key)
   → Transaction bundles: custom_json + HIVE transfer (payment)
   → Replay engine verifies:
     a. Listing exists and is active
     b. Buyer ≠ seller
     c. payment_trx_id references a valid HIVE transfer
     d. Transfer amount ≥ listing price
     e. Transfer recipient = seller
   → If all checks pass:
     a. Card/pack ownership transferred to buyer
     b. Listing deactivated
     c. All pending offers on this NFT auto-rejected
```

### Offer Flow

```
1. Buyer broadcasts market_offer (Posting key)
   → Replay engine creates MarketOffer (status='pending')

2. Seller reviews offers in UI

3a. Seller broadcasts market_accept (Active key)
    → Transaction bundles: custom_json (no HIVE transfer — buyer already sent)
    → Actually: buyer's offer INCLUDES a companion transfer
    → Replay engine verifies payment, transfers ownership

3b. Seller broadcasts market_reject (Posting key)
    → Offer marked rejected
```

### HiveSync Methods (6 new)

```typescript
hiveSync.marketList(nftUid, nftType, price, currency?)
hiveSync.marketUnlist(listingId)
hiveSync.marketBuy(listingId, paymentTrxId)
hiveSync.marketOffer(nftUid, price, currency?)
hiveSync.marketAcceptOffer(offerId, paymentTrxId)
hiveSync.marketRejectOffer(offerId)
```

### Legacy Prefix Mapping

```
rp_market_list   → market_list
rp_market_unlist → market_unlist
rp_market_buy    → market_buy
rp_market_offer  → market_offer
rp_market_accept → market_accept
rp_market_reject → market_reject
```

---

## 11. Card Visual Design Overhaul

Separate from protocol changes, v1.2 includes a professional card visual upgrade based on deep research into Pokemon TCG, Hearthstone, and Magic: The Gathering card design standards.

### Changes

| Element | Before | After |
|---------|--------|-------|
| **Keyword icons** | Unicode emoji (⚔️🛡️🔥) | 50+ custom SVG pictograms |
| **Stat badges** | CSS gradient circles/diamond | SVG-shaped emblems (hexagonal ATK, shield HP, crystal mana) |
| **Rarity indicator** | Name color + glow only | Dedicated faceted gem (rare=blue, epic=purple, mythic=gold) |
| **Name banner** | Flat rectangle | Dimensional ribbon with scroll-end ornaments |
| **Race/tribe** | Tooltip only | Visible text line on card face |

### SVG Icon System

**File**: `client/src/game/components/ui/CardIconsSVG.tsx` (~500 lines)

- 50+ inline SVG icons (zero HTTP requests, perfect scaling)
- Each icon: `1em × 1em`, inherits `currentColor`, renders crisp at 14-32px
- `KEYWORD_ICON_MAP` lookup: keyword string → React SVG component
- Applied to: SimpleCard keyword badges, badge tooltips, UnifiedCardTooltip

### SVG Stat Emblems

- **Mana**: Diamond crystal with inner rune detail (SVG `<polygon>` + `<linearGradient>`)
- **Attack**: Hexagonal gold emblem (6-point shape, gold gradient, golden border)
- **Health**: Shield-shaped red emblem (heraldic shield path, red gradient, rose border)
- All use `drop-shadow` filter for depth — no CSS `box-shadow` tricks

### Rarity Gem

- Centered below name banner, rotated 45° diamond
- Common/basic: no gem (clean look)
- Rare: blue crystal with blue glow
- Epic: purple crystal with purple glow
- Mythic: gold crystal with pulsing golden glow animation

---

## 12. Architecture Diagram

### Broadcast Flow (v1.2)

```
User Action
    │
    ▼
sanitizePayload()          ← Strip HTML entities + control chars
    │
    ▼
validatePayloadSize()      ← Check < 8KB, reject with byte count
    │
    ▼
JSON.stringify()
    │
    ▼
Hive Keychain              ← Signs with Active or Posting key
    │
    ▼
Hive Blockchain (L1)       ← custom_json op, irreversible after ~1 min
    │
    ▼
normalizeRawOp()           ← Legacy rp_* mapping, auth check
    │
    ▼
Zod.parse()                ← Schema validation (opSchemas.ts)
    │
    ▼
applyOp()                  ← Deterministic state transition
    │
    ▼
StateAdapter               ← IndexedDB (client) or Maps (server)
```

### Index Resolution (v1.2, 6 tiers)

```
resolveLatestCID()
    │
    ├─ [1] @ragnarok-index on-chain CID → IPFS gateway fetch
    │      ↓ success: 'healthy'
    │
    ├─ [2] IPFS without quorum → fetch chunks anyway
    │      ↓ success: 'degraded'
    │
    ├─ [3] Hive account fallback → index_update ops
    │      ↓ success: 'degraded'
    │
    ├─ [4] HafSQL public API  ← NEW
    │      GET /operations/custom_json/ragnarok-cards
    │      ↓ success: 'degraded'
    │
    ├─ [5] Bundled snapshot → shipped with game
    │      ↓ success: 'snapshot-only'
    │
    └─ [6] P2P peer exchange → WebRTC relay
           ↓ nothing: 'offline'
```

### Marketplace Flow

```
Seller                          Buyer
  │                               │
  │ market_list(nftUid, price)    │
  │─────────────►Chain            │
  │                               │
  │              Listing Active   │
  │                               │
  │                               │ market_buy(listingId, paymentTrxId)
  │              Chain◄───────────│
  │                               │ (bundles HIVE transfer to seller)
  │                               │
  │   Replay engine verifies:     │
  │   ✓ listing active            │
  │   ✓ payment ≥ price           │
  │   ✓ recipient = seller        │
  │                               │
  │   NFT ownership → buyer       │
  │   Listing deactivated         │
  │   Pending offers auto-rejected│
```

---

## 13. Security Analysis

### New Attack Surfaces

| Attack | Mitigation |
|--------|-----------|
| **Oversized payload broadcast** | `validatePayloadSize()` rejects before Keychain (never reaches chain) |
| **HTML injection in memos** | `sanitizeString()` strips entities + control chars before broadcast |
| **Double-mint on retry** | Deterministic UIDs: same inputs → same UID → replay engine dedup |
| **Marketplace shill bidding** | `market_buy` cross-references companion HIVE transfer — no payment = no sale |
| **Marketplace front-running** | Block ordering is canonical; first valid buy in block wins |
| **HafSQL data poisoning** | HafSQL is read-only fallback; canonical state comes from client replay engine |
| **Mint session tampering** | Session is local progress tracking only; chain state is authoritative |

### Unchanged Security Properties

All v1.0 and v1.1 security properties remain:

- PoW anti-spam on match results
- Dual-signature match verification
- Nonce anti-replay protection
- 10-block transfer cooldown
- 20-block pack entropy delay
- Per-card supply caps (250/500/1K/2K)
- WASM binary hash verification in P2P
- Slash evidence for provable cheating

---

## 14. Migration & Backward Compatibility

### Protocol Ops

- All 19 v1.0/v1.1 ops unchanged
- 6 new marketplace ops added (26 total canonical actions)
- Legacy `rp_market_*` prefixes mapped in `normalize.ts`
- Readers that don't support v1.2 will simply ignore marketplace ops (`status: 'ignored'`)

### Broadcast Changes

- `broadcastCustomJson()` now sanitizes + size-validates — purely additive, no behavior change for valid payloads
- `transferCard()` accepts optional `cardId` and `edition` params for structured memos — backward compatible (old callers still work)

### Deterministic UIDs

- New UID generators are **not yet wired into `applyMintBatch()`** — this is a v1.3 change
- Currently exported as utilities for genesis tooling
- Existing random UIDs remain valid; deterministic UIDs will be required for new mints post-v1.3

### Card Visuals

- Pure frontend change — zero protocol impact
- SVG icons are additive (emoji fallback preserved)
- CSS changes affect `SimpleCard.css` only

---

## 15. File Manifest

### New Files

| File | Purpose |
|------|---------|
| `shared/protocol-core/broadcast-utils.ts` | BuildResult, batching, sanitization, deterministic UIDs, memos, session recovery |
| `client/src/game/components/ui/CardIconsSVG.tsx` | 50+ Norse-themed SVG keyword icons + stat emblem shapes |

### Modified Files

| File | Changes |
|------|---------|
| `shared/protocol-core/types.ts` | +6 marketplace actions, +MarketListing, +MarketOffer, +MarketStateAdapter |
| `shared/protocol-core/normalize.ts` | +6 marketplace legacy mappings, +6 known actions |
| `shared/protocol-core/index.ts` | +broadcast-utils barrel exports |
| `client/src/data/HiveSync.ts` | +sanitization, +size validation, +structured memos, +6 marketplace methods |
| `client/src/data/indexer/indexSync.ts` | +HafSQL fallback tier, +fetchFromHafSQL() |
| `client/src/game/components/SimpleCard.tsx` | +SVG keyword icons, +SVG stat emblems, +rarity gem, +tribe line |
| `client/src/game/components/SimpleCard.css` | +SVG emblem styles, +rarity gem, +tribe line, +banner upgrade |
| `client/src/game/components/ui/UnifiedCardTooltip.tsx` | +SvgIcon field on KEYWORD_DEFINITIONS |

---

## 16. Future: Seed/Instance Genesis Model

**Status**: Deferred to v1.3

The most architecturally significant NFTLox pattern — Seed/Instance two-phase minting — is deferred because it requires redesigning the genesis ceremony.

### Current Model (v1.0)

```
Genesis → mint_batch(2000 copies of card #20001) → 2000 CardAssets in IndexedDB
```

Genesis requires potentially millions of ops (2,242 card designs × average ~1,000 copies = ~2.2M mint ops).

### Seed/Instance Model (v1.3 proposal)

```
Genesis → mint_seed(card #20001, maxSupply=2000) → 1 SeedAsset in IndexedDB
Later  → distribute_instance(seed #20001, to: 'player1') → 1 CardAsset
```

Genesis shrinks to ~2,242 seed mints. Instances are spawned on demand (pack opening, reward claiming, marketplace).

### Benefits

- **Genesis ceremony**: ~2,242 ops instead of ~2.2M (1,000x reduction)
- **Lazy minting**: No upfront chain cost for all copies
- **Supply enforcement**: Seed tracks `distributed` counter — trivial cap check
- **Card as template**: Seeds are the canonical "card design" — instances are the "physical cards"
- **allCards.ts mapping**: Our card registry already IS a seed collection conceptually

### Why Deferred

- Requires new `mint_seed` and `distribute_instance` ops in protocol-core
- Requires new `SeedAsset` type and IndexedDB store
- Genesis ceremony, admin panel, and pack opening all need updates
- Needs careful migration plan for existing v1.0/v1.1 `mint_batch` ops
- Conformance test suite needs extension

### Recommendation

Implement Seed/Instance in v1.3 alongside the genesis ceremony. The deterministic UID utilities from v1.2 (`generateDeterministicCardUid`, `generateOriginDna`) are already designed to work with this model.

---

## 17. Integration Vision: Norse Mythos × NFTLox × HivePoA

This section addresses the three-layer architecture proposed by external collaborators, clarifies which layer owns what, and identifies genuine gaps to fill.

### The Three-Layer Model

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: Frontend — Norse Mythos Card Game             │
│  React/Vite client, 100% stateless, zero server         │
│  Owns: Game UI, combat, chess, campaign, deck builder   │
│  Runs: Client-side chain replay (IndexedDB)             │
│  Status: ✅ BUILT                                       │
└─────────────────────┬───────────────────────────────────┘
                      │ reads chain → replays → renders
┌─────────────────────▼───────────────────────────────────┐
│  LAYER 2: Protocol Rules — Ragnarok Protocol Core       │
│  Shared TypeScript module (client + server + operator)   │
│  Owns: 26 canonical ops, state transitions, supply caps │
│  Owns: ELO, nonces, PoW, dual-sig, pack DNA, slashing  │
│  Integrates: NFTLox broadcast patterns (v1.2)           │
│  Status: ✅ BUILT (protocol-core/, 1,246 lines)         │
│                                                          │
│  NOTE: This is NOT NFTLox SDK. This is our own engine.  │
│  NFTLox contributed PATTERNS (§2), not a dependency.     │
└─────────────────────┬───────────────────────────────────┘
                      │ reads Hive L1 blocks
┌─────────────────────▼───────────────────────────────────┐
│  LAYER 1: Storage & Indexing — Hive L1 + IPFS + WoT    │
│  Hive blockchain: custom_json ops (permanent, ordered)   │
│  IPFS: Op-log index chunks (content-addressed)           │
│  WoT operators: Volunteer block scanners (paid 5%)       │
│  HafSQL: Public API fallback (zero infrastructure)       │
│  SPK Network: Decentralized storage (future, §17.3)     │
│  Status: ✅ Hive + IPFS + WoT built, SPK = future      │
└─────────────────────────────────────────────────────────┘
```

### 17.1 Pre-Battle Ownership Verification (Current State)

**What we have today:**

```
1. Players connect via WebRTC (PeerJS)
2. Both clients exchange `deck_verify` message on connection
   → Contains: array of card UIDs in deck
3. Each client checks UIDs against local IndexedDB
   → replayDB.getCard(uid) → verify owner matches player
4. Server fallback: POST /verify-deck (counts copies per card)
5. If verification fails → match refuses to start
```

**What the friend proposes:** "One request per phase — check if player has new data."

**Gap identified:** Our current check happens ONCE at match start. If a player transfers a card mid-match (unlikely but possible since matches can last 10+ minutes), the verification becomes stale.

**Proposed enhancement (v1.3):**

```
Pre-match: Full deck verification (existing)
Per-round: Lightweight ownership heartbeat
  → Each player's client re-checks: "do I still own my deck cards?"
  → If any card was transferred away during match:
    a. Game continues with remaining cards (graceful degradation)
    b. Match result includes ownership_warning flag
    c. Replay engine can reject match_result if deck was invalid
```

This is low-priority because:

- Transferring cards during your own match is self-sabotage
- Active key is required for transfers (can't happen accidentally)
- Match duration is typically 5-15 minutes

### 17.2 Anti-Multi-Accounting

**The real problem:** A player creates 5 Hive accounts, plays against themselves to farm ELO/RUNE rewards, or runs multiple accounts in tournaments.

**Current mitigations:**

| Defense                          | How it works                                                     |
| -------------------------------- | ---------------------------------------------------------------- |
| **Hive account creation cost**   | 3 HIVE (~$1.50) per account — not free                           |
| **Hive Resource Credits**        | Each account needs HP delegated to broadcast ops                 |
| **ELO system**                   | Self-play converges to zero sum (winner gains = loser loses)     |
| **PoW on match results**         | CPU cost per match result broadcast                              |
| **Dual-signature**               | Both players must sign match result — can't fake opponent sig    |

**Gaps:**

1. **IP/fingerprint correlation**: Not currently tracked (privacy-preserving design)
2. **Behavioral detection**: Same play patterns across accounts not analyzed
3. **Tournament sybil attacks**: Swiss pairing could match alt accounts

**Proposed anti-sybil measures (v1.3):**

```
Passive detection (no privacy violation):
  → Match result includes timing signatures (ms between actions)
  → Replay engine flags statistically improbable patterns:
    a. Two accounts always queue within 5s of each other
    b. One account always concedes to the other
    c. Identical deck compositions across "different" accounts
  → Flagged accounts enter review queue (not auto-banned)

Active deterrence:
  → Ranked matches require minimum account age (e.g., 30 days on Hive)
  → Tournament entry requires minimum match history (e.g., 20 ranked games)
  → Suspicious accounts can be challenged to prove humanity (sign unique message)
```

### 17.3 SPK Network Integration (Future)

**What SPK Network offers:**

[SPK Network](https://spk.network) is a decentralized storage and compute layer for Hive. It provides:

- **IPFS pinning with incentives** — nodes earn tokens for hosting content
- **Decentralized CDN** — content served from nearest node
- **Smart contract-like execution** — Breakaway consensus modules

**How it maps to our architecture:**

| Current Layer                | SPK Replacement          | Benefit                                |
| ---------------------------- | ------------------------ | -------------------------------------- |
| WoT operator IPFS pinning   | SPK incentivized pinning | Operators don't need to self-host IPFS |
| Art asset CDN (GitHub Pages) | SPK decentralized CDN    | Art survives GitHub takedown           |
| Post-match validation (none) | SPK Breakaway module     | Third-party match result verification  |

**Post-battle SPK validation concept:**

```
1. Match ends → both clients sign match_result
2. match_result broadcast to Hive L1 (existing flow)
3. NEW: SPK Breakaway module picks up match_result
4. Module replays match transcript against protocol-core rules
5. Module publishes verification attestation to Hive
6. If attestation = "invalid":
   → match_result flagged for community review
   → slash_evidence can be submitted using attestation as proof
```

**Why this matters:** Currently, match validation relies on both players being honest (dual-sig) plus community-submitted slash evidence. SPK adds an automated third-party verifier — like a referee that watches every game replay.

**Status:** Conceptual. SPK Network's Breakaway consensus is not yet production-ready. When it launches, this becomes a natural integration point.

### 17.4 Relationship to NFTLox

To be crystal clear about the collaboration model:

```
NFTLox SDK → We extracted 8 patterns (v1.2, this document)
NFTLox Indexer → We added HafSQL as tier-4 fallback
NFTLox Marketplace → We adopted their 6-op design

We are NOT:
  ✗ Dependent on NFTLox for chain replay (we have protocol-core)
  ✗ Using NFTLox SDK as a runtime dependency (we built our own)
  ✗ Routing game state through their indexer (we replay locally)

We ARE:
  ✓ Grateful for their open-source patterns
  ✓ Using their HafSQL infrastructure as a fallback tier
  ✓ Compatible with their marketplace op format
  ✓ Open to deeper integration if their indexer matures
```

**Potential future collaboration:**
- NFTLox Elysia indexer could serve as an additional resolution tier (tier-4b)
- Their Seed/Instance model could inform our v1.3 genesis redesign
- Cross-game NFT interoperability if both protocols standardize on `custom_json` envelope format
- Shared WoT operator infrastructure (one operator serves both games)

### 17.5 The "Holy Grail" Claim

The friend's conclusion: *"A game that literally cannot be shut down or censored because it doesn't depend on any web server."*

**Current reality check:**

| Component | Decentralized? | Single point of failure? |
|-----------|---------------|--------------------------|
| Game logic (protocol-core) | ✅ Open source, runs in browser | None — any client can replay |
| Card data (allCards.ts) | ✅ Shipped with client | None — bundled in build |
| Chain state (Hive L1) | ✅ 100+ block producers | None — Hive is DPoS with witnesses |
| Index (IPFS + WoT) | ✅ Volunteer operators | Degrades gracefully (6 tiers) |
| Art assets | ⚠️ GitHub Pages CDN | **Yes** — GitHub could takedown |
| Matchmaking | ⚠️ Optional Express server | **Yes** — but P2P direct connect works |
| Game client hosting | ⚠️ GitHub Pages / Vercel | **Yes** — but downloadable as static files |

**To reach true "Holy Grail" status, remaining work:**

1. **Art on IPFS/SPK**: Move 2,700+ webp files to content-addressed storage
2. **Client on IPFS**: Host the built game client itself on IPFS (users access via CID)
3. **P2P matchmaking**: Replace server queue with on-chain `queue_join`/`queue_leave` (already built, just needs UI)
4. **SPK CDN**: Replace GitHub Pages with SPK decentralized CDN

Items 1-2 are achievable today. Items 3-4 depend on SPK maturity. The game is already **95% decentralized** — the remaining 5% is asset hosting.

# Hive L1 NFT Stamps: Self-Describing Provenance Chain

## The Core Idea

Every NFT card carries its **complete ownership history** as an array of cryptographic stamps embedded directly on the card object. No API calls, no server queries, no chain replays needed after initial sync. The card itself is the proof.

```
Card "Fenrir, World-Ender" (UID: rk_alpha_00001)
├── Stamp 0: MINT     @ragnarok → @player1   trxId: aef8c...  block: 81234567
├── Stamp 1: TRANSFER @player1  → @player2   trxId: b7d2f...  block: 81240100
└── Stamp 2: TRANSFER @player2  → @player3   trxId: c9e3a...  block: 81255000
                                                    ↑
                                          clickable link to hivehub.dev
                                          shows the signed op on-chain
```

The current owner is always the `to` field of the last stamp. The full chain of custody is right there on the object. Each stamp links directly to an immutable Hive L1 transaction that anyone can verify with one click.

---

## Why Stamps?

### The Problem

Traditional NFT ownership verification requires one of:

1. **Full chain replay** — Download and replay every `custom_json` op ever broadcast. Correct but slow on first sync. O(all ops ever).
2. **Server API query** — Ask a centralized indexer "who owns this card?" Fast but introduces trust and a single point of failure.
3. **On-demand chain scan** — Search the blockchain for all ops referencing a specific card UID. Slow and expensive per lookup.

### The Solution: Self-Describing NFTs

Embed the answer directly on the NFT object. After initial chain replay populates the stamps, the client stores the card in IndexedDB with its full provenance. From that point forward:

- **Zero API calls** to verify ownership
- **Zero chain queries** to see transfer history
- **One click** to verify any stamp on a block explorer
- **Offline-capable** — provenance is local data

Each stamp is ~120 bytes. A card traded 100 times carries ~12KB of provenance. A card traded 1,000 times carries ~120KB. The storage cost is negligible compared to the value of trustless, instant verification.

---

## Architecture

### Data Model

```typescript
interface ProvenanceStamp {
  from: string;       // Hive username of sender ('' for mint)
  to: string;         // Hive username of recipient
  trxId: string;      // Hive transaction ID (40-char hex)
  block: number;      // Hive block number
  timestamp?: number; // Unix timestamp (optional, from block)
}

interface HiveCardAsset {
  uid: string;                        // Unique NFT identifier (e.g. "rk_alpha_00001")
  cardId: number;                     // Game card definition ID
  ownerId: string;                    // Current owner (redundant with last stamp, kept for O(1) lookup)
  edition: 'alpha' | 'beta' | 'promo';
  foil: 'standard' | 'gold';
  rarity: string;
  level: number;
  xp: number;

  // Quick-access fields (last stamp shortcut)
  mintTrxId?: string;
  mintBlockNum?: number;
  lastTransferTrxId?: string;
  lastTransferBlock?: number;

  // The stamp chain — full provenance history
  provenanceChain?: ProvenanceStamp[];

  // Game metadata
  name: string;
  type: string;
  race?: string;
  image?: string;
}
```

### How Stamps Are Created

Stamps are populated by the **deterministic replay engine** (`replayRules.ts`) as it processes Hive `custom_json` operations. Every client running the replay engine produces identical stamp chains — this is guaranteed by the deterministic rules locked at genesis.

#### On Mint (pack open, reward claim, admin mint)

```typescript
provenanceChain: [{
  from: '',              // empty = this is the genesis/mint stamp
  to: recipientUsername,
  trxId: op.trxId,
  block: op.blockNum,
  timestamp: op.timestamp
}]
```

#### On Transfer

```typescript
provenanceChain: [
  ...existingChain,
  {
    from: previousOwner,
    to: newOwner,
    trxId: op.trxId,
    block: op.blockNum,
    timestamp: op.timestamp
  }
]
```

The replay engine appends — never modifies — stamps. The chain is append-only, mirroring the append-only nature of the blockchain itself.

### Storage

Cards with their stamp chains live in **IndexedDB** (browser-local, per-user). The `replayDB.ts` schema stores `HiveCardAsset` objects as plain values in the `cards` object store, keyed by `uid`. Adding `provenanceChain` required no schema migration — it's just another field on the stored object.

```
IndexedDB: ragnarok-chain-replay (v6)
└── cards (object store, keyPath: uid)
    ├── rk_alpha_00001: { uid, cardId, ownerId, provenanceChain: [...], ... }
    ├── rk_alpha_00002: { uid, cardId, ownerId, provenanceChain: [...], ... }
    └── ...
```

---

## Verification Flow

### Scenario: "Does @player3 really own Fenrir?"

```
1. Client looks up card in local IndexedDB
   → provenanceChain shows 3 stamps
   → Last stamp: { to: "@player3", trxId: "c9e3a..." }

2. User clicks trxId link → hivehub.dev/tx/c9e3a...
   → Hive explorer shows the signed custom_json:
     {
       "app": "ragnarok-cards",
       "action": "card_transfer",
       "card_uid": "rk_alpha_00001",
       "to": "player3"
     }
   → Signed by @player2's Active key ✓
   → Block 81255000, irreversible ✓

3. Ownership verified. No API. No server. Just a link click.
```

### Scenario: "Is this card authentic?"

```
1. Check stamp 0 (mint stamp):
   → from: '' (mint), to: "@player1", trxId: "aef8c..."

2. Click trxId → hivehub.dev/tx/aef8c...
   → Shows mint operation signed by @ragnarok (the game account)
   → cardId matches the Fenrir card definition
   → Block 81234567, irreversible ✓

3. Card is authentic — minted by the official game account.
```

### Scenario: Fraud Attempt

An attacker modifies their local IndexedDB to fake ownership:

```
1. Attacker changes ownerId to their username
2. Attacker adds a fake stamp with a made-up trxId

3. Defense Layer 1 — Link verification:
   → Fake trxId doesn't exist on hivehub.dev
   → Anyone can see it's fabricated

4. Defense Layer 2 — P2P WASM hash check:
   → Opponent's replay engine has the real state
   → SHA-256 state hashes don't match
   → Cheat detected, match rejected

5. Defense Layer 3 — Chain replay:
   → Any client replaying the chain from genesis
     will derive the correct owner
   → Attacker's local changes are irrelevant
```

---

## Transfer Flow

### How a Transfer Creates a New Stamp

```
User Journey:
1. Owner opens Collection → clicks card → "Send to Friend"
2. SendCardModal.tsx renders:
   - Recipient field (Hive username)
   - Optional memo
   - Double-confirm safety (two clicks required)
3. On confirm: hiveSync.transferCard(cardUid, recipient, memo)

Under the Hood:
4. Hive Keychain pops up → user signs with Active key
5. custom_json broadcast to Hive:
   {
     "app": "ragnarok-cards",
     "action": "card_transfer",
     "card_uid": "rk_alpha_00001",
     "to": "player3",
     "memo": "Thanks for the trade!"
   }
6. Transaction confirmed → block number assigned
7. All clients replaying the chain see the op
8. Replay engine appends stamp to card's provenanceChain
9. Card's ownerId updated to new owner
10. Previous owner's IndexedDB: card removed
11. New owner's IndexedDB: card appears with full stamp history
```

### Security Guarantees

| Layer | Protection |
|-------|-----------|
| **Hive Active Key** | Only the current owner can sign a transfer. Private key never leaves Keychain. |
| **Irreversible Blocks** | After ~60 seconds, Hive blocks are irreversible. Stamps are permanent. |
| **Deterministic Replay** | Every client derives identical state from the same chain data. No ambiguity. |
| **WASM Hash Check** | P2P opponents verify state hashes match. Tampered local state is detected. |
| **Supply Caps** | Replay rules enforce per-card mint limits (250 mythic, 500 epic, 1,000 rare, 2,000 common). Can't mint past cap. |

---

## Comparison to Other Systems

### vs Bitcoin Ordinals

| | Hive Stamps | Bitcoin Ordinals |
|---|---|---|
| **Ownership tracking** | Event sourcing (replay ops) | UTXO tracking (inscribed satoshis) |
| **Transfer mechanism** | `custom_json` signed by owner | Bitcoin transaction moving the sat |
| **Provenance storage** | On the NFT object (local) | On-chain UTXO graph |
| **Verification** | Click explorer link | Trace UTXO ancestry |
| **Cost per transfer** | Free (Hive resource credits) | Bitcoin transaction fee ($1-50+) |
| **Metadata** | Rich JSON (level, XP, match history) | Limited (witness data) |
| **Speed** | 3 seconds (Hive block time) | 10 minutes (Bitcoin block time) |

### vs Ethereum ERC-721

| | Hive Stamps | ERC-721 |
|---|---|---|
| **State model** | Event sourcing → derived state | Contract state (mapping owner → tokenId) |
| **Provenance** | Embedded on NFT object | Requires event log query |
| **Transfer cost** | Free | Gas fee ($5-100+) |
| **Client dependency** | Browser IndexedDB | RPC node or Infura/Alchemy |
| **Offline capable** | Yes (after initial sync) | No |

### vs Splinterlands (also on Hive)

| | Ragnarok Stamps | Splinterlands |
|---|---|---|
| **Chain** | Hive L1 | Hive L1 |
| **State derivation** | Client-side replay | Server-side (centralized) |
| **Provenance** | Full stamp chain on card | Server database |
| **Verification** | Trustless (any client can replay) | Trust Splinterlands servers |
| **Offline** | Yes | No |

The key differentiator: Ragnarok cards are **self-describing**. The NFT object itself contains everything needed to verify its authenticity and ownership history. No server trust required.

---

## Anti-Spam Defenses

Hive is feeless (resource credits regenerate), so stamp bloat from spam trading is a real attack vector. Three layers of defense:

### Layer 1: Transfer Cooldown (10 blocks / ~30 seconds)

The replay engine rejects any transfer of a card that was transferred fewer than 10 blocks ago:

```typescript
const TRANSFER_COOLDOWN_BLOCKS = 10;

if (existing.lastTransferBlock && (op.blockNum - existing.lastTransferBlock) < TRANSFER_COOLDOWN_BLOCKS) {
    rejectOp(op, `card ${nftId} transfer cooldown (${TRANSFER_COOLDOWN_BLOCKS} blocks)`);
    return;
}
```

This limits any single card to ~2 transfers per minute maximum, killing ping-pong spam while allowing legitimate rapid re-trading. The cooldown is enforced deterministically by every replay engine — no server needed.

### Layer 2: Stamp Compaction (50 recent stamps max)

When the stamp chain exceeds 50 entries, older stamps are compressed into a summary:

```typescript
interface CompactedProvenance {
    totalTransfers: number;     // lifetime count
    firstMint: ProvenanceStamp; // original mint stamp (preserved forever)
    compactedAt: number;        // block number where compaction occurred
    compactedCount: number;     // how many stamps were compacted
}
```

The card keeps its 50 most recent stamps (full detail with explorer links) plus a compact summary of everything before. The mint stamp is always preserved — you can always verify authenticity.

**Storage after compaction:**

| Lifetime Transfers | Stamp Chain Size | Notes |
|-------------------|-----------------|-------|
| 1-50 | ~120 bytes per stamp | No compaction needed |
| 100 | ~6 KB | 50 recent + summary |
| 1,000 | ~6 KB | Same — always 50 recent |
| 10,000 | ~6 KB | Same — always 50 recent |
| 1,000,000 | ~6 KB | Same — always 50 recent |

**Max card size is capped at ~6KB regardless of how many times it trades.** The full history remains on-chain (immutable Hive ops) — the compaction only affects local storage.

### Layer 3: Hive Resource Credits (Natural Rate Limiting)

Each `custom_json` op costs RC (resource credits). RC regenerates over ~5 days based on HIVE POWER staked:

| Account HP | Approx RC/day | Transfers/day |
|-----------|--------------|---------------|
| 5 HP (new account) | ~150 ops | ~150 |
| 50 HP (casual) | ~1,500 ops | ~1,500 |
| 500 HP (whale) | ~15,000 ops | ~15,000 |

Even a whale spamming 15,000 transfers/day only adds 15,000 stamps — and with compaction, each card stores at most 50 recent stamps locally. The attack costs real money (HIVE POWER) and achieves nothing.

---

## Batch Transfers

Multiple cards can be transferred in a single `custom_json` op, saving RC and reducing chain bloat:

```typescript
// Single transfer (existing)
hiveSync.transferCard('rk_alpha_00001', 'player2');

// Batch transfer (new)
hiveSync.transferCards(
    ['rk_alpha_00001', 'rk_alpha_00002', 'rk_alpha_00003'],
    'player2'
);
```

On-chain payload for batch:
```json
{
    "app": "ragnarok-cards",
    "action": "card_transfer",
    "cards": [
        { "card_uid": "rk_alpha_00001" },
        { "card_uid": "rk_alpha_00002" },
        { "card_uid": "rk_alpha_00003" }
    ],
    "to": "player2"
}
```

The replay engine processes each card in the batch independently — if one fails validation (wrong owner, cooldown), the others still succeed. Hive `custom_json` supports up to 4KB per op, enough for ~50 cards per batch.

---

## Scalability Analysis

### Storage Cost Per Card (With Compaction)

| Transfers | Stamp Chain Size | Total Card Size |
|-----------|-----------------|-----------------|
| 1 (mint only) | ~120 bytes | ~500 bytes |
| 10 | ~1.2 KB | ~1.6 KB |
| 50 | ~6 KB | ~6.5 KB |
| 100+ | ~6 KB (capped) | ~6.5 KB |

### Storage Cost Per Player

| Collection Size | Avg Transfers/Card | IndexedDB Size |
|----------------|-------------------|----------------|
| 100 cards | 3 | ~200 KB |
| 500 cards | 5 | ~1.5 MB |
| 2,000 cards | 50+ | ~13 MB (capped) |
| 10,000 cards | 50+ | ~65 MB (capped) |

IndexedDB supports gigabytes of storage. With compaction, even extreme collectors with heavily-traded cards stay well within limits.

### Chain Replay Cost

Initial sync (first time a client connects):

| Total Chain Ops | Replay Time | Notes |
|----------------|------------|-------|
| 10,000 | < 1 second | Early launch |
| 100,000 | ~3 seconds | Growing player base |
| 1,000,000 | ~15 seconds | Mature game |
| 10,000,000 | ~2 minutes | Large-scale (show loading screen) |

After initial sync, the client only processes new ops (incremental). The stamp chain means post-sync ownership lookups are O(1) — just read the card object.

### Network Impact

- **Zero ongoing API calls** for ownership verification
- **Zero chain queries** after initial sync
- Server indexer is optional convenience (leaderboard, cross-account queries)
- Each player is their own "node" — stores and verifies their own collection

---

## Implementation Files

| File | Role |
|------|------|
| `client/src/data/schemas/HiveTypes.ts` | `ProvenanceStamp` interface, `HiveCardAsset.provenanceChain` field |
| `client/src/data/blockchain/replayRules.ts` | Stamp creation in `applyMint`, `applyPackOpen`, `applyRewardClaim`, `applyCardTransfer` |
| `client/src/data/blockchain/replayEngine.ts` | Chain replay engine — fetches ops, feeds to rules |
| `client/src/data/blockchain/replayDB.ts` | IndexedDB storage (v6, 13 object stores) |
| `client/src/data/blockchain/explorerLinks.ts` | `getTransactionUrl(trxId)`, `getBlockUrl(blockNum)` |
| `client/src/data/blockchain/hiveConfig.ts` | Explorer base URLs, game account, Hive nodes |
| `client/src/data/HiveSync.ts` | Keychain signing: `transferCard()`, `transferCards()` (batch), `broadcastCustomJson()` |
| `client/src/data/HiveEvents.ts` | Event bus: `card:transferred`, `transaction:confirmed/failed` |
| `client/src/game/components/collection/NFTProvenanceViewer.tsx` | UI: stamp timeline with explorer links |
| `client/src/game/components/collection/SendCardModal.tsx` | UI: transfer flow with double-confirm |

---

## Explorer Link Format

Every stamp contains a `trxId` that maps to a permanent Hive explorer URL:

```
Transaction: https://hivehub.dev/tx/{trxId}
Block:       https://hivehub.dev/b/{blockNum}
```

These URLs are deterministic and permanent. Hive blocks are irreversible after ~60 seconds. The explorer shows the full `custom_json` payload including the Hive account that signed it — cryptographic proof of the transfer.

---

## Marketplace Readiness

The stamp system makes external marketplace integration straightforward:

### What a Marketplace Needs

1. **Card lookup** — Given a UID, show full metadata + provenance
   - Already available: card object in IndexedDB has everything
   - REST endpoint: `GET /api/chain/card/:uid` (server indexer)

2. **Ownership verification** — Prove current owner
   - Last stamp's `to` field = current owner
   - Verify by clicking the `trxId` link on any block explorer
   - Or replay the chain independently (trustless)

3. **Transfer execution** — Move card from seller to buyer
   - Seller signs `rp_card_transfer` via Hive Keychain
   - New stamp appended automatically by all replay engines
   - Buyer's collection updates on next sync

4. **Authenticity check** — Prove card was minted by the official game
   - First stamp (index 0) has `from: ''` (mint) with `trxId`
   - That trxId links to a mint op signed by `@ragnarok`
   - If the mint wasn't signed by `@ragnarok`, the card is not authentic

### What's NOT Needed

- No centralized ownership database
- No proprietary API for verification
- No server uptime requirement for transfers
- No smart contract interaction fees

The blockchain IS the database. The stamps ARE the API response. The explorer links ARE the verification.

---

## Design Principles

1. **The NFT is the source of truth.** Everything needed to verify a card lives on the card object itself.

2. **Append-only stamps mirror append-only blockchain.** Stamps are never modified, only appended — matching the immutability of Hive L1.

3. **Verification is one click away.** Every stamp has a direct explorer link. No chain scanning, no API calls, no RPC queries.

4. **Offline-first.** After initial sync, the client has everything. Network is only needed for new operations.

5. **Trust math, not servers.** Deterministic replay means any client can independently verify any card's entire history. The server indexer is a convenience, not a requirement.

6. **Storage burden on the user who benefits.** Each player stores their own collection's provenance. The cost is trivial (KB per card). The benefit is trustless ownership.

7. **Bounded by design.** Stamp compaction caps local storage at ~6KB per card regardless of trade volume. The full history lives on-chain forever; local storage keeps only what matters.

8. **Spam has a cost, not a reward.** Transfer cooldowns + Hive RC + compaction mean spam attacks waste the attacker's resources while achieving nothing — local storage stays bounded, chain state stays correct.

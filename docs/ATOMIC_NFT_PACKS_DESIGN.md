# Atomic NFT Packs & Transfer Design

**Status**: Draft — Pre-Implementation Design
**Date**: 2026-03-17
**Authors**: Claude Opus 4.6, informed by NFTLox protocol audit
**Affects**: `protocol-core/apply.ts`, `replayDB.ts`, `HiveSync.ts`, `opSchemas.ts`, `hiveConfig.ts`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Recap](#2-current-architecture-recap)
3. [Upgrade 1: Atomic Transfers](#3-upgrade-1-atomic-transfers)
4. [Upgrade 2: Packs as NFTs (Functional DNA)](#4-upgrade-2-packs-as-nfts-functional-dna)
5. [Upgrade 3: Seed/Instance/Replica Model (Cryptographic DNA Lineage)](#5-upgrade-3-seedinstancereplica-model-cryptographic-dna-lineage)
6. [New Op Types](#6-new-op-types)
7. [IndexedDB Schema Changes](#7-indexeddb-schema-changes)
8. [Replay Engine Changes](#8-replay-engine-changes)
9. [HiveSync Broadcast Changes](#9-hivesync-broadcast-changes)
10. [UI Flow Changes](#10-ui-flow-changes)
11. [Security Analysis](#11-security-analysis)
12. [Migration & Backward Compatibility](#12-migration--backward-compatibility)
13. [Vector Micro-Indexer (Future)](#13-vector-micro-indexer-future)
14. [Implementation Phases](#14-implementation-phases)
15. [Open Questions](#15-open-questions)

---

## 1. Executive Summary

Three protocol-level upgrades inspired by the NFTLox comparison audit:

| Upgrade | Impact | Risk | Effort |
|---------|--------|------|--------|
| **Atomic Transfers** | L1 visibility, anti-spam, explorer-native provenance | Low | ~3-5 files |
| **Packs as NFTs** | Tradeable sealed packs, functional DNA, richer secondary economy | Medium | ~8-12 files |
| **Seed/Instance/Replica** | Cryptographic DNA lineage, card cloning, merging, family trees | Medium | ~8-10 files |

**Design philosophy**: An NFT should not be a static receipt of ownership — it should be a **functional component** whose DNA can alter game mechanics, be traded, and serve multiple purposes (card source, tournament key, collectible). Every card carries its genotype (what it is) and phenotype (who it is), enabling biological replication with full provenance.

---

## 2. Current Architecture Recap

### How Transfers Work Today

```
User → HiveSync.transferCard(uid, recipient)
     → Keychain signs custom_json (Active key)
     → Hive includes in block
     → replayEngine polls, finds op
     → apply.ts: applyCardTransfer()
       - validates ownership, cooldown, nonce
       - card.owner = recipient
       - card.lastTransferBlock = blockNum
       - appends ProvenanceStamp
     → IndexedDB updated
     → UI refreshed
```

**Problem**: The transfer is a `custom_json` only. Standard Hive explorers (PeakD, HiveScan) show the raw JSON but don't register it as a value transfer. The card's provenance is only visible through our indexer.

### How Pack Opening Works Today

```
Phase 1: User → pack_commit (salt_commit, pack_type, quantity)
Phase 2: Wait for entropy block (commit_block + 3) to reach LIB
Phase 3: User → pack_reveal (commit_trx_id, user_salt)
         → seed = sha256(salt || commitTrxId || entropyBlockId || "1")
         → LCG draws N cards deterministically
         → Cards minted directly to user's account
```

**Problem**: The pack never exists as a transferable object. Users can't:
- Buy a sealed pack and sell it unopened
- Gift sealed packs to friends
- Use sealed packs as tournament entry tickets
- Collect rare sealed packs (factory-sealed premium)

---

## 3. Upgrade 1: Atomic Transfers

### Concept

Bundle every value-transfer `custom_json` with a **0.001 HIVE native transfer** to the recipient in a single atomic Hive transaction. This dual-anchors the operation in both the Ragnarok indexer AND Hive's financial ledger.

### Hive Transaction Format

Hive supports multi-operation transactions natively. A single signed transaction can contain both:

```json
{
  "operations": [
    ["custom_json", {
      "required_auths": ["alice"],
      "required_posting_auths": [],
      "id": "ragnarok-cards",
      "json": "{\"action\":\"card_transfer\",\"card_uid\":\"abc123\",\"to\":\"bob\"}"
    }],
    ["transfer", {
      "from": "alice",
      "to": "bob",
      "amount": "0.001 HIVE",
      "memo": "ragnarok:card_transfer:abc123"
    }]
  ]
}
```

Both operations succeed or fail atomically — Hive's transaction processing guarantees this.

### Which Ops Get Atomic Anchoring

| Op | Gets 0.001 HIVE transfer? | Recipient | Rationale |
|----|--------------------------|-----------|-----------|
| `card_transfer` | **YES** | Card recipient | Custody change = value transfer |
| `pack_mint` (new) | **YES** | Pack buyer | Pack purchase = value transfer |
| `pack_transfer` (new) | **YES** | Pack recipient | Sealed pack custody change |
| `pack_burn` (new) | **NO** | N/A | Burn is self-action, no recipient |
| `burn` | **NO** | N/A | Destruction, no recipient |
| `match_result` | **NO** | N/A | Game outcome, no HIVE transfer |
| `reward_claim` | **NO** | N/A | Self-serve mint, no counterparty |
| `level_up` | **NO** | N/A | XP acknowledgement only |

### Transfer Memo Format

```
ragnarok:{action}:{primary_id}
```

Examples:
- `ragnarok:card_transfer:a1b2c3d4` — card UID
- `ragnarok:pack_transfer:pack_e5f6g7` — pack UID
- `ragnarok:pack_mint:standard:3` — pack type + quantity

The memo is **not parsed by the replay engine** — it's purely for L1 explorer readability. The `custom_json` payload remains the canonical data source.

### Replay Engine Validation

The replay engine gains one new validation rule for atomic ops:

```typescript
// In applyCardTransfer, applyPackTransfer, applyPackMint:
if (genesis.sealed) {
  // Post-seal: require companion HIVE transfer in same transaction
  const companionTransfer = await state.getCompanionTransfer(op.trxId);
  if (!companionTransfer) {
    return { status: 'rejected', reason: 'missing atomic HIVE transfer' };
  }
  if (companionTransfer.amount !== '0.001 HIVE') {
    return { status: 'rejected', reason: 'wrong atomic transfer amount' };
  }
  if (companionTransfer.to !== payload.to) {
    return { status: 'rejected', reason: 'atomic transfer recipient mismatch' };
  }
}
```

**Pre-seal ops are exempt** — backward compatibility with existing chain history.

### StateAdapter Extension

```typescript
interface StateAdapter {
  // ... existing methods ...

  // NEW: Look up companion transfer in same Hive transaction
  getCompanionTransfer(trxId: string): Promise<{
    from: string;
    to: string;
    amount: string;
    memo: string;
  } | null>;
}
```

### Implementation in clientStateAdapter.ts

The replay engine already receives full transaction data from `get_account_history`. Each history entry contains ALL operations in that transaction. The adapter needs to scan sibling operations for a `transfer` op in the same `trxId`.

```typescript
// clientStateAdapter.ts
async getCompanionTransfer(trxId: string): Promise<CompanionTransfer | null> {
  // During replay, the engine can store sibling ops per trxId
  // Alternatively, fetch the full transaction once via condenser_api
  const cached = this.trxSiblingCache.get(trxId);
  if (!cached) return null;

  const transfer = cached.find(op => op[0] === 'transfer');
  if (!transfer) return null;

  return {
    from: transfer[1].from,
    to: transfer[1].to,
    amount: transfer[1].amount,
    memo: transfer[1].memo,
  };
}
```

### Cost to Users

- **0.001 HIVE per transfer** (~$0.0003 USD at current prices)
- Plus Hive RC cost (already exists for custom_json)
- Negligible for legitimate users; meaningful barrier for spam bots at scale

### Benefits Summary

| Benefit | Before | After |
|---------|--------|-------|
| PeakD visibility | Raw JSON blob | Clear 0.001 HIVE transfer with memo |
| HiveScan tracking | Not indexed | Indexed as financial transfer |
| Explorer provenance | Only via our viewer | Any Hive explorer shows history |
| Anti-spam | RC only | RC + 0.001 HIVE economic cost |
| Wallet integration | Custom indexer needed | Standard wallet shows transfers |

---

## 4. Upgrade 2: Packs as NFTs (Functional DNA)

### Concept

A pack is no longer a protocol event — it becomes a **first-class NFT** with a deterministic DNA hash that mathematically encodes its contents. The pack exists as a transferable, tradeable, burnable object.

### Pack Lifecycle

```
              ┌────────────────────────┐
              │  PACK SEED DEFINITION  │
              │  (admin creates via    │
              │   genesis/mint)        │
              └──────────┬─────────────┘
                         │ pack_mint op
                         ↓
              ┌────────────────────────┐
              │   SEALED PACK NFT     │
              │  uid: "pack_{trxId}"  │
              │  dna: sha256(seed)     │
              │  owner: buyer          │
              │  packType: "standard"  │
              │  sealed: true          │
              │  tradeable: true       │
              └──────────┬─────────────┘
                         │
              ┌──────────┼──────────────┐
              │          │              │
              ↓          ↓              ↓
         ┌─────────┐ ┌────────┐  ┌──────────┐
         │ TRADE   │ │ GIFT   │  │  OPEN    │
         │ on      │ │ via    │  │  (burn)  │
         │ market  │ │ atomic │  │          │
         │         │ │ xfer   │  │          │
         └─────────┘ └────────┘  └────┬─────┘
                                      │ pack_burn op
                                      ↓
              ┌────────────────────────┐
              │  DETERMINISTIC UNPACK  │
              │  seed = sha256(        │
              │    packDna ||          │
              │    burnTrxId ||        │
              │    entropyBlockId      │
              │  )                     │
              │  LCG draws N cards     │
              └──────────┬─────────────┘
                         │ N new CardAssets
                         ↓
              ┌────────────────────────┐
              │   CARDS IN COLLECTION  │
              │  owner: pack opener    │
              │  mintSource: 'pack'    │
              │  mintTrxId: burnTrxId  │
              └────────────────────────┘
```

### Pack NFT Data Model

```typescript
interface PackAsset {
  // Identity
  uid: string;                    // "pack_{mintTrxId}:{index}"
  packType: PackType;             // 'starter' | 'standard' | 'premium' | 'mythic' | 'mega'

  // DNA — deterministic content identifier
  // The pack's DNA does NOT reveal its contents until burned.
  // Contents depend on: dna + burnTrxId + entropyBlockId (unknowable until burn)
  dna: string;                    // sha256(mintTrxId + ":" + index + ":" + packType)

  // Ownership
  ownerId: string;                // Current Hive account owner
  sealed: boolean;                // true = unopened, false = burned/opened

  // Provenance
  mintTrxId: string;              // Transaction that created this pack
  mintBlockNum: number;           // Block of creation
  lastTransferBlock: number;      // For 10-block cooldown
  provenanceChain: ProvenanceStamp[];
  officialMint?: OfficialMint;    // Proves @ragnarok minted it

  // Metadata
  cardCount: number;              // How many cards inside (5 for standard, 7 for premium, etc.)
  edition: string;                // 'alpha' | 'beta'

  // Polymorphic utility (future extensibility)
  utility?: PackUtility[];        // e.g., [{ type: 'tournament_ticket', tournamentId: '...' }]
}

type PackType = 'starter' | 'standard' | 'premium' | 'mythic' | 'mega';

interface PackUtility {
  type: 'tournament_ticket' | 'access_token' | 'crafting_reagent';
  metadata: Record<string, unknown>;
}
```

### DNA Derivation (Deterministic, Self-Describing)

The pack's DNA is computed at mint time and is immutable:

```typescript
function computePackDna(mintTrxId: string, index: number, packType: string): string {
  const input = `${mintTrxId}:${index}:${packType}`;
  return sha256(input);
}
```

The DNA alone does NOT reveal the cards inside. Card derivation requires the **burn transaction ID** and **entropy block ID**, which don't exist until the pack is opened. This prevents anyone from pre-computing pack contents.

### Card Derivation on Burn

When a pack is burned (opened), the cards are derived deterministically:

```typescript
function derivePackCards(
  packDna: string,
  burnTrxId: string,
  entropyBlockId: string,
  packType: PackType,
): DerivedCard[] {
  // Seed combines pack identity + burn entropy + block entropy
  const seed = sha256(`${packDna}|${burnTrxId}|${entropyBlockId}`);

  // Same LCG algorithm as current drawPackCards()
  const cardCount = PACK_SIZES[packType];
  const idRanges = PACK_ID_RANGES[packType];
  const cards: DerivedCard[] = [];

  let rng = lcgSeed(seed);
  for (let i = 0; i < cardCount; i++) {
    const { cardId, rarity } = drawOneCard(rng, idRanges);
    cards.push({
      uid: `${burnTrxId}:${i}`,
      cardId,
      rarity,
      mintSource: 'pack',
    });
    rng = lcgNext(rng);
  }

  return cards;
}
```

### Why This Is Better

| Feature | Current (Protocol Event) | New (Pack NFT) |
|---------|------------------------|----------------|
| Pack exists as NFT | No | Yes — uid, owner, provenance |
| Tradeable while sealed | No | Yes — atomic transfer like cards |
| Visible on Hive explorers | No | Yes — with 0.001 HIVE anchor |
| Deterministic contents | Yes (commit-reveal seed) | Yes (DNA + burn entropy) |
| Unpredictable before open | Yes (20-block delay) | Yes (burn trxId unknowable) |
| Secondary market | Impossible | Native — sell sealed packs |
| Polymorphic utility | N/A | Tournament tickets, access tokens |
| Collector value | N/A | Factory-sealed packs as collectibles |

---

## 5. Upgrade 3: Seed/Instance/Replica Model (Cryptographic DNA Lineage)

### The Problem with Flat Card Minting

Currently, every card in our system is a flat record:

```typescript
// Current: each card is independent, no lineage
{
  uid: "trx123:0",     // unique instance
  cardId: 20001,        // template ID (Odin, Allfather)
  ownerId: "alice",
  level: 2, xp: 120,
  // ... no relationship to other copies of card 20001
}
```

If Alice and Bob both own card #20001 (Odin), their instances share a `cardId` but have **zero cryptographic relationship**. You can't prove they came from the same mint run, you can't trace a card's family tree, and you can't create a foil variant that's provably linked to its original.

### The NFTLox Insight: Genotype vs Phenotype

NFTLox separates every NFT into three layers:

| Layer | Analogy | Purpose | Immutable? |
|-------|---------|---------|------------|
| **Seed** | Species DNA | Defines what the card IS (stats, art, rarity, max supply) | Yes |
| **Instance** | Individual organism | A specific copy with its own ownership, XP, history | No (mutable owner, XP) |
| **Replica** | Clone | A new individual with identical genotype but unique phenotype | N/A (creates new instance) |

The key innovation is **two DNA hashes per card**:

```
originDna  = sha256(cardId + edition + rarity + mintSalt)
             → The card's GENOTYPE. What it is. Shared by all copies of this card.

instanceDna = sha256(originDna + parentInstanceDna + mintTrxId + index)
              → The card's PHENOTYPE. Who it is. Unique to this specific copy.
              → If replicated, the child's instanceDna includes the parent's,
                creating a cryptographic family tree.
```

### How This Maps to Ragnarok

#### Layer 1: Card Seeds (Already Exist — `allCards.ts`)

Our card registry (`allCards.ts`, 2,242 entries) already serves as the seed layer. Each card template defines the genotype: name, stats, rarity, art, keywords, effects.

What we're missing: a **cryptographic seed hash** that binds each template to the chain.

```typescript
// New: CardSeed — the on-chain genotype anchor
interface CardSeed {
  cardId: number;              // Template ID (e.g., 20001)
  originDna: string;           // sha256(cardId + edition + rarity + genesisTrxId)
  name: string;                // "Odin, Allfather"
  rarity: CardRarity;
  maxSupply: number;           // Per-card supply cap (250 mythic, 2000 common, etc.)
  mintedCount: number;         // How many instances exist
  edition: string;             // 'alpha'
  registeredBlock: number;     // Block where seed was registered on-chain
  registeredTrxId: string;     // Transaction of registration
}
```

The `originDna` is computed once at genesis and never changes. It cryptographically binds the card template to its on-chain registration. Every instance of card #20001 shares this same `originDna`.

#### Layer 2: Card Instances (Upgrade Existing `HiveCardAsset`)

Each minted copy gets a unique `instanceDna` derived from its origin + mint context:

```typescript
// Extended HiveCardAsset with DNA lineage
interface HiveCardAsset {
  // Existing fields (unchanged)
  uid: string;
  cardId: number;
  ownerId: string;
  rarity: string;
  edition: string;
  foil: string;
  level: number;
  xp: number;
  mintTrxId: string;
  mintBlockNum: number;
  provenanceChain: ProvenanceStamp[];
  officialMint?: OfficialMint;

  // NEW: DNA lineage fields
  originDna: string;           // Genotype — same for all copies of this card
  instanceDna: string;         // Phenotype — unique to THIS copy
  parentInstanceDna?: string;  // If this is a replica, points to parent
  generation: number;          // 0 = original mint, 1 = first replica, 2 = replica of replica
  replicaCount: number;        // How many replicas have been made FROM this instance
}
```

#### Layer 3: Replicas (New `card_replicate` Op)

A replica is a new instance with:
- **Same `originDna`** as its parent (same card, same stats, same art)
- **New `instanceDna`** derived from the parent (cryptographic family tree)
- **Own provenance chain** (independent ownership history)
- **Own XP/level** (starts fresh at level 1, xp 0)
- **Generation counter** incremented from parent

```typescript
function computeInstanceDna(
  originDna: string,
  parentInstanceDna: string | null,
  mintTrxId: string,
  index: number,
): string {
  const parent = parentInstanceDna || 'genesis';
  return sha256(`${originDna}|${parent}|${mintTrxId}|${index}`);
}
```

### Use Cases Unlocked

#### 1. Golden/Foil Card Forging

A player can replicate their card #20001 to create a golden variant. The replica inherits the same `originDna` (proving it's a real Odin card) but gets a new `instanceDna` and `foil: 'gold'` property.

```
Original: inst_abc (Odin, standard foil, gen 0)
    └──→ Replica: inst_xyz (Odin, gold foil, gen 1, parent=inst_abc)
```

The golden version is provably derived from a legitimate original — not conjured from thin air.

#### 2. Tournament Card Lending

Both Alice and Bob need an Odin card for a tournament. Alice owns the original. She replicates it, creating a time-limited tournament copy for Bob:

```
Alice's original: inst_abc (gen 0)
    └──→ Tournament replica: inst_tour (gen 1, parent=inst_abc, utility: tournament_loan)
```

After the tournament, the replica can be burned. The original's `replicaCount` decrements.

#### 3. Card Merging / Ascension

Two instances of the same card (same `originDna`) can be merged into a stronger version:

```
inst_abc (Odin, level 1, gen 0)  ──┐
                                    ├──→ inst_merged (Odin, level 2, gen 0, foil: 'ascended')
inst_def (Odin, level 1, gen 0)  ──┘
     (burned)                          (inherits combined XP)
```

The merged card's `instanceDna` references both parents, proving it was forged from two legitimate copies.

#### 4. Provenance Family Tree

Every replica traces its lineage back to the original mint:

```
Genesis Mint (gen 0): inst_001
    ├── Replica (gen 1): inst_002
    │       └── Replica (gen 2): inst_003
    └── Replica (gen 1): inst_004
            ├── Replica (gen 2): inst_005
            └── Replica (gen 2): inst_006
```

The `NFTProvenanceViewer` can show the full family tree — not just a linear chain of transfers but a branching genealogy. First-generation originals become more valuable because they're the root of the tree.

### New Op: `card_replicate`

```typescript
interface CardReplicatePayload {
  action: 'card_replicate';
  source_uid: string;          // Instance to replicate from
  foil?: 'standard' | 'gold';  // Replica foil type
  memo?: string;
}

// Validation
- Source card must exist
- Broadcaster must be owner of source card
- Source card's replicaCount must be < MAX_REPLICAS_PER_CARD (e.g., 3)
- Per-card supply cap must not be exceeded (total instances < maxSupply)
- Generation must be < MAX_GENERATION (e.g., 3 — prevents infinite replica chains)

// State mutations
const parent = await state.getCard(payload.source_uid);
parent.replicaCount += 1;
await state.putCard(parent);

const replica: CardAsset = {
  uid: `${trxId}:replica:0`,
  cardId: parent.cardId,
  ownerId: op.broadcaster,
  rarity: parent.rarity,
  edition: parent.edition,
  foil: payload.foil || 'standard',
  level: 1,
  xp: 0,
  originDna: parent.originDna,
  instanceDna: computeInstanceDna(parent.originDna, parent.instanceDna, trxId, 0),
  parentInstanceDna: parent.instanceDna,
  generation: parent.generation + 1,
  replicaCount: 0,
  mintTrxId: trxId,
  mintBlockNum: blockNum,
  mintSource: 'replica',
  provenanceChain: [buildStampWithUrls(...)],
};
await state.putCard(replica);
```

### New Op: `card_merge`

```typescript
interface CardMergePayload {
  action: 'card_merge';
  source_uids: [string, string];  // Exactly two cards to merge
}

// Validation
- Both cards must exist
- Both must be owned by broadcaster
- Both must share the same originDna (same card template)
- Neither can be a replica with active children (replicaCount must be 0)

// State mutations
const [cardA, cardB] = await Promise.all(sources.map(uid => state.getCard(uid)));

// Create merged card
const merged: CardAsset = {
  uid: `${trxId}:merge:0`,
  cardId: cardA.cardId,
  ownerId: op.broadcaster,
  rarity: cardA.rarity,
  edition: cardA.edition,
  foil: 'ascended',  // Merged cards get special foil
  level: Math.min(MAX_LEVEL, Math.max(cardA.level, cardB.level) + 1),
  xp: cardA.xp + cardB.xp,  // Combined XP
  originDna: cardA.originDna,
  instanceDna: sha256(`${cardA.instanceDna}|${cardB.instanceDna}|merge|${trxId}`),
  parentInstanceDna: cardA.instanceDna,  // Primary parent
  generation: 0,  // Merged cards reset to gen 0 (they ARE the new original)
  replicaCount: 0,
  mintTrxId: trxId,
  mintBlockNum: blockNum,
  mintSource: 'merge',
  mergedFrom: [cardA.uid, cardB.uid],  // Provenance link to both parents
  provenanceChain: [buildStampWithUrls(...)],
};
await state.putCard(merged);

// Burn both source cards
await state.deleteCard(cardA.uid);
await state.deleteCard(cardB.uid);
```

### Limits & Anti-Abuse

| Limit | Value | Rationale |
|-------|-------|-----------|
| `MAX_REPLICAS_PER_CARD` | 3 | Prevents infinite supply inflation |
| `MAX_GENERATION` | 3 | Replicas of replicas of replicas cap out |
| Replica cooldown | 100 blocks (~5 min) | Rate limit per source card |
| Merge requires same `originDna` | — | Can't merge different cards |
| Merge burns both sources | — | Net supply neutral (2 in, 1 out) |
| Replicate checks supply cap | — | Total instances can't exceed `maxSupply` |

### Impact on Existing Systems

| System | Change Required |
|--------|----------------|
| `allCards.ts` | None — already serves as seed registry |
| `replayDB.ts` | Add `originDna`, `instanceDna`, `parentInstanceDna`, `generation`, `replicaCount` to cards store |
| `apply.ts` | Add `card_replicate` + `card_merge` handlers |
| `opSchemas.ts` | Add Zod schemas for new ops |
| `HiveSync.ts` | Add `replicateCard()` + `mergeCards()` methods |
| `nftMetadataGenerator.ts` | Include DNA fields in ERC-1155 metadata |
| `NFTProvenanceViewer.tsx` | Show family tree visualization |
| `CollectionPage.tsx` | Add Replicate + Merge buttons |
| `INFTBridge.ts` | Add `replicateCard()` + `mergeCards()` to interface |

### Migration from Current Cards

Existing cards (minted before this upgrade) get DNA fields computed retroactively during replay:

```typescript
// During applyMintBatch / applyPackReveal / applyRewardClaim:
// If card has no originDna (pre-upgrade), compute it
if (!card.originDna) {
  card.originDna = sha256(`${card.cardId}|${card.edition}|${card.rarity}|${genesisTrxId}`);
  card.instanceDna = sha256(`${card.originDna}|genesis|${card.mintTrxId}|${mintIndex}`);
  card.generation = 0;
  card.replicaCount = 0;
}
```

This is non-destructive — existing UIDs, owners, and provenance chains are untouched. The DNA fields are additive.

---

## 6. New Op Types

### 5.1 `pack_mint` — Create Sealed Pack NFTs

**Broadcaster**: `@ragnarok` (admin) or any account purchasing from the store
**Auth**: Active (involves 0.001 HIVE transfer)
**Atomic**: YES — includes 0.001 HIVE transfer to pack recipient

```typescript
// Payload
interface PackMintPayload {
  action: 'pack_mint';
  pack_type: PackType;
  quantity: number;           // 1-10 packs per op
  to: string;                // Recipient Hive account
  // DNA is auto-computed, not in payload
}

// Validation
- Genesis must exist and be sealed
- pack_type must be valid
- quantity must be 1-10
- Companion 0.001 HIVE transfer must exist to `to` account
- Pack supply cap check (per pack_type)

// State mutations
for (let i = 0; i < quantity; i++) {
  const uid = `pack_${trxId}:${i}`;
  const dna = sha256(`${trxId}:${i}:${packType}`);
  putPack({
    uid,
    packType,
    dna,
    ownerId: payload.to,
    sealed: true,
    mintTrxId: trxId,
    mintBlockNum: blockNum,
    lastTransferBlock: blockNum,
    cardCount: PACK_SIZES[packType],
    edition: 'alpha',
    provenanceChain: [buildStampWithUrls(...)],
    officialMint: buildOfficialMint(...),
  });
  incrementPackSupply(packType);
}
```

### 5.2 `pack_transfer` — Transfer Sealed Pack

**Broadcaster**: Pack owner
**Auth**: Active
**Atomic**: YES — includes 0.001 HIVE transfer to recipient

```typescript
interface PackTransferPayload {
  action: 'pack_transfer';
  pack_uid: string;
  to: string;                // Recipient
  nonce?: number;            // Anti-replay
  memo?: string;
}

// Validation
- Pack must exist and be sealed
- Broadcaster must be current owner
- Recipient != sender
- Transfer cooldown (10 blocks)
- Nonce must advance (if provided)
- Companion 0.001 HIVE transfer must exist

// State mutations
pack.ownerId = payload.to;
pack.lastTransferBlock = blockNum;
pack.provenanceChain.push(buildStampWithUrls(...));
```

### 5.3 `pack_burn` — Open Pack (Burn + Derive Cards)

**Broadcaster**: Pack owner
**Auth**: Active (destructive — burns the pack NFT)
**Atomic**: NO — self-action, no counterparty

This replaces the old `pack_commit`/`pack_reveal` two-phase for NFT packs. The entropy comes from the burn transaction itself.

```typescript
interface PackBurnPayload {
  action: 'pack_burn';
  pack_uid: string;
  salt: string;              // User entropy contribution
  salt_commit?: string;      // Optional: pre-committed salt for extra security
}

// Validation
- Pack must exist and be sealed
- Broadcaster must be owner
- If salt_commit provided, sha256(salt) must match
- Entropy block (burnBlock + 3) must be ≤ LIB (same finality rule as pack_reveal)

// State mutations (two-phase internally)
// Phase 1: Record burn intent (on seeing the op)
pack.sealed = false;
pack.burnTrxId = trxId;
pack.burnBlock = blockNum;

// Phase 2: Derive cards (when entropy block is irreversible)
// This can happen in the same replay pass if the entropy block is already past LIB
const entropyBlockId = await getBlockId(blockNum + 3);
const cards = derivePackCards(pack.dna, trxId, entropyBlockId, pack.packType);

for (const card of cards) {
  // Same supply checks as current drawPackCards
  await putCard({
    uid: card.uid,
    cardId: card.cardId,
    ownerId: op.broadcaster,
    rarity: card.rarity,
    level: 1,
    xp: 0,
    edition: pack.edition,
    foil: 'standard',
    mintTrxId: trxId,
    mintBlockNum: blockNum,
    mintSource: 'pack',
    provenanceChain: [buildStampWithUrls(...)],
    officialMint: pack.officialMint, // Inherits from pack
  });
  incrementPackCardSupply(card.rarity, card.cardId);
}

// Delete the pack NFT (burned)
await deletePack(pack.uid);
```

### 5.4 Summary of All Ops (v1.1)

| Op | New? | Auth | Atomic? | Purpose |
|----|------|------|---------|---------|
| `genesis` | No | Active | No | Protocol init |
| `seal` | No | Active | No | Freeze admin |
| `mint_batch` | No | Active | No | Admin card mint |
| `card_transfer` | **Modified** | Active | **YES** | Card custody change |
| `burn` | No | Active | No | Card destruction |
| `level_up` | No | Posting | No | XP acknowledgement |
| `match_anchor` | No | Posting | No | Dual-sig session |
| `match_result` | No | Posting | No | Game outcome |
| `queue_join` | No | Posting | No | Enter queue |
| `queue_leave` | No | Posting | No | Leave queue |
| `reward_claim` | No | Posting | No | Self-serve reward |
| `pack_commit` | **Deprecated** | Posting | No | *(legacy, pre-NFT packs)* |
| `pack_reveal` | **Deprecated** | Posting | No | *(legacy, pre-NFT packs)* |
| `legacy_pack_open` | No | Posting | No | Pre-seal compat |
| `pack_mint` | **NEW** | Active | **YES** | Create sealed pack NFT |
| `pack_transfer` | **NEW** | Active | **YES** | Transfer sealed pack |
| `pack_burn` | **NEW** | Active | No | Open pack (burn + derive) |

---

## 7. IndexedDB Schema Changes

### New Store: `packs`

```typescript
// replayDB.ts — add to IDB schema (version bump: v6 → v7)
const db = await openDB('ragnarok-chain', 7, {
  upgrade(db, oldVersion) {
    // ... existing stores ...

    if (oldVersion < 7) {
      const packStore = db.createObjectStore('packs', { keyPath: 'uid' });
      packStore.createIndex('by_owner', 'ownerId');
      packStore.createIndex('by_sealed', 'sealed');

      const packSupplyStore = db.createObjectStore('pack_supply', { keyPath: 'packType' });
    }
  }
});
```

### Pack Store Schema

| Field | Type | Indexed | Description |
|-------|------|---------|-------------|
| `uid` | string | Primary key | `"pack_{trxId}:{index}"` |
| `packType` | string | No | Pack tier |
| `dna` | string | No | Deterministic content hash |
| `ownerId` | string | `by_owner` | Current Hive account |
| `sealed` | boolean | `by_sealed` | true = unopened |
| `mintTrxId` | string | No | Origin transaction |
| `mintBlockNum` | number | No | Origin block |
| `lastTransferBlock` | number | No | Cooldown tracker |
| `cardCount` | number | No | Cards inside |
| `edition` | string | No | 'alpha' / 'beta' |
| `provenanceChain` | ProvenanceStamp[] | No | Transfer history |
| `officialMint` | OfficialMint | No | Mint proof |
| `burnTrxId` | string? | No | Set on burn |
| `burnBlock` | number? | No | Set on burn |
| `utility` | PackUtility[]? | No | Polymorphic uses |

### Pack Supply Store Schema

| Field | Type | Description |
|-------|------|-------------|
| `packType` | string | Primary key |
| `minted` | number | Total packs minted |
| `burned` | number | Total packs opened |
| `cap` | number | Supply limit (0 = unlimited) |

### StateAdapter Extensions

```typescript
interface StateAdapter {
  // ... existing ...

  // Pack operations (NEW)
  getPack(uid: string): Promise<PackAsset | null>;
  putPack(pack: PackAsset): Promise<void>;
  deletePack(uid: string): Promise<void>;
  getPacksByOwner(owner: string): Promise<PackAsset[]>;
  getSealedPacksByOwner(owner: string): Promise<PackAsset[]>;

  // Pack supply tracking (NEW)
  getPackSupply(packType: string): Promise<PackSupplyRecord | null>;
  incrementPackSupply(packType: string): Promise<void>;
  incrementPackBurned(packType: string): Promise<void>;

  // Companion transfer lookup (NEW)
  getCompanionTransfer(trxId: string): Promise<CompanionTransfer | null>;
}
```

---

## 8. Replay Engine Changes

### Transaction Sibling Caching

The replay engine needs to see ALL operations in a transaction, not just the `custom_json`. Currently, `get_account_history` returns one entry per operation, but operations in the same transaction share a `trx_id`.

```typescript
// replayEngine.ts — collect sibling ops per transaction
const trxSiblingMap = new Map<string, HiveOperation[]>();

for (const [idx, entry] of historyPage) {
  const trxId = entry.trx_id;
  if (!trxSiblingMap.has(trxId)) {
    trxSiblingMap.set(trxId, []);
  }
  trxSiblingMap.get(trxId)!.push(entry.op);
}

// Pass to state adapter for companion transfer lookups
stateAdapter.setTrxSiblings(trxSiblingMap);
```

### Op Registration

```typescript
// protocol-core/apply.ts — add new cases
switch (op.action) {
  // ... existing 14 cases ...
  case 'pack_mint': return applyPackMint(op, ctx, deps);
  case 'pack_transfer': return applyPackTransfer(op, ctx, deps);
  case 'pack_burn': return applyPackBurn(op, ctx, deps);
}
```

### Zod Schemas (opSchemas.ts)

```typescript
export const PackMintPayload = z.object({
  pack_type: z.enum(['starter', 'standard', 'premium', 'mythic', 'mega']),
  quantity: z.number().int().min(1).max(10),
  to: HiveUsername,
});

export const PackTransferPayload = z.object({
  pack_uid: z.string().min(1),
  to: HiveUsername,
  nonce: z.number().int().optional(),
  memo: z.string().max(256).optional(),
});

export const PackBurnPayload = z.object({
  pack_uid: z.string().min(1),
  salt: z.string().min(32),
  salt_commit: z.string().optional(),
});
```

---

## 9. HiveSync Broadcast Changes

### Multi-Operation Transaction Builder

```typescript
// HiveSync.ts — new method for atomic transactions
async broadcastAtomicTransaction(
  customJsonPayload: Record<string, unknown>,
  transfer: { to: string; amount: string; memo: string },
): Promise<HiveBroadcastResult> {
  // Build multi-op transaction
  const operations = [
    ['custom_json', {
      required_auths: [this.username],
      required_posting_auths: [],
      id: RAGNAROK_APP_ID,
      json: JSON.stringify({
        ...customJsonPayload,
        app: RAGNAROK_APP_ID,
      }),
    }],
    ['transfer', {
      from: this.username,
      to: transfer.to,
      amount: transfer.amount,
      memo: transfer.memo,
    }],
  ];

  // Keychain supports multi-op broadcasts via requestBroadcast
  return new Promise((resolve, reject) => {
    window.hive_keychain.requestBroadcast(
      this.username,
      operations,
      'Active',  // Active key required for transfers
      (response) => {
        if (response.success) resolve(response);
        else reject(new Error(response.message));
      }
    );
  });
}
```

### Updated transferCard()

```typescript
async transferCard(cardUid: string, toUser: string, memo?: string) {
  return this.broadcastAtomicTransaction(
    {
      action: 'card_transfer',
      card_uid: cardUid,
      to: toUser,
      memo,
    },
    {
      to: toUser,
      amount: '0.001 HIVE',
      memo: `ragnarok:card_transfer:${cardUid}`,
    }
  );
}
```

### New Pack Methods

```typescript
async mintPack(packType: PackType, quantity: number, toUser: string) {
  return this.broadcastAtomicTransaction(
    {
      action: 'pack_mint',
      pack_type: packType,
      quantity,
      to: toUser,
    },
    {
      to: toUser,
      amount: '0.001 HIVE',
      memo: `ragnarok:pack_mint:${packType}:${quantity}`,
    }
  );
}

async transferPack(packUid: string, toUser: string, memo?: string) {
  return this.broadcastAtomicTransaction(
    {
      action: 'pack_transfer',
      pack_uid: packUid,
      to: toUser,
      memo,
    },
    {
      to: toUser,
      amount: '0.001 HIVE',
      memo: `ragnarok:pack_transfer:${packUid}`,
    }
  );
}

async burnPack(packUid: string, salt: string, saltCommit?: string) {
  // Burns are NOT atomic (no counterparty)
  return this.broadcastCustomJson('rp_pack_burn', {
    pack_uid: packUid,
    salt,
    salt_commit: saltCommit,
  }, true); // Active key — destructive
}
```

---

## 10. UI Flow Changes

### Pack Store Page (PacksPage.tsx)

**Before**: User clicks "Open Pack" → commit-reveal two-phase → cards appear
**After**: User clicks "Buy Pack" → receives sealed pack NFT → can trade OR open it

```
┌─────────────────────────────────────────────┐
│                 PACK STORE                   │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Standard │  │ Premium  │  │  Mythic  │  │
│  │ 5 cards  │  │ 7 cards  │  │  7 cards │  │
│  │          │  │          │  │          │  │
│  │ [Buy 1]  │  │ [Buy 1]  │  │ [Buy 1]  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                              │
│  ─── YOUR SEALED PACKS ───                  │
│                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐           │
│  │ Std ×2 │ │ Prm ×1 │ │ Mth ×1 │           │
│  │ [Open] │ │ [Open] │ │ [Open] │           │
│  │ [Gift] │ │ [Gift] │ │ [Gift] │           │
│  └────────┘ └────────┘ └────────┘           │
└─────────────────────────────────────────────┘
```

### Collection Page — Pack Inventory Section

A new tab or section showing sealed packs the user owns, with:
- Pack type and card count
- DNA hash (truncated, clickable to explorer)
- Mint date and provenance
- [Open Pack] button → pack_burn flow
- [Send Pack] button → pack_transfer flow

### Send Pack Modal

Identical to `SendCardModal.tsx` but for packs:
- Recipient username input
- Double-confirm safety
- Keychain Active key signing
- Atomic transfer (pack_transfer + 0.001 HIVE)

---

## 11. Security Analysis

### Attack: Front-Running Pack Burns

**Threat**: A node operator sees a `pack_burn` in the mempool and tries to front-run it to predict cards.

**Mitigation**: Cards derive from `sha256(packDna || burnTrxId || entropyBlockId)`. The `burnTrxId` is unique to the specific burn transaction and the `entropyBlockId` is 20 blocks (~60s) in the future. Even if a front-runner sees the burn intent, they can't derive the cards because:
1. They don't know the burn's final `trxId` (assigned by the block producer)
2. They don't know the entropy block ID (20 blocks away)

### Attack: Pack DNA Rainbow Table

**Threat**: Someone pre-computes all possible card derivations for known pack DNAs.

**Mitigation**: The derivation includes `burnTrxId` (unique per burn) and `entropyBlockId` (unknowable at mint time). A rainbow table would need to enumerate all possible `(burnTrxId, entropyBlockId)` pairs — computationally infeasible.

### Attack: Pack Transfer Spam

**Threat**: Someone ping-pongs packs between accounts to bloat the provenance chain.

**Mitigation**:
1. 10-block transfer cooldown (same as cards)
2. 0.001 HIVE economic cost per transfer
3. Hive RC cost per operation
4. Provenance compaction after 50 stamps (same as cards)

### Attack: Fake Pack Minting

**Threat**: Non-admin account broadcasts `pack_mint`.

**Mitigation**: `pack_mint` requires broadcaster to be `@ragnarok` (admin account check in apply.ts). Or, if we allow user-initiated purchases, the atomic transfer is to `@ragnarok-treasury` (not the user), and the replay engine validates the transfer direction.

### Attack: Burning Someone Else's Pack

**Threat**: Account A tries to burn a pack owned by account B.

**Mitigation**: `applyPackBurn` checks `pack.ownerId === op.broadcaster`. Rejected if not owner.

---

## 12. Migration & Backward Compatibility

### Protocol Version

This is a **v1.1 extension**, not a breaking change. All existing v1 ops continue to work identically.

| Scenario | Behavior |
|----------|----------|
| Old `pack_commit` + `pack_reveal` | Still valid for pre-v1.1 chain history |
| New `pack_mint` + `pack_burn` | New pack flow for post-v1.1 |
| Old `card_transfer` (no HIVE anchor) | Still valid for pre-v1.1 chain history |
| New `card_transfer` (with HIVE anchor) | Required post-v1.1 seal update |
| Existing cards in IDB | Unchanged, no migration needed |
| Existing pack_commit records | Unchanged, old flow still processes |

### Activation Strategy

1. **Phase 1**: Deploy code that can READ both old and new ops
2. **Phase 2**: Admin broadcasts a `protocol_upgrade` op (new op type) specifying the activation block
3. **Phase 3**: After activation block, new rules enforced:
   - `card_transfer` requires companion HIVE transfer
   - `pack_commit`/`pack_reveal` deprecated (rejected)
   - `pack_mint`/`pack_transfer`/`pack_burn` accepted

### IndexedDB Migration

```typescript
// replayDB.ts — non-destructive upgrade
if (oldVersion < 7) {
  db.createObjectStore('packs', { keyPath: 'uid' });
  // ... indexes ...
  db.createObjectStore('pack_supply', { keyPath: 'packType' });
}
// Existing stores (cards, matches, etc.) are untouched
```

---

## 13. Vector Micro-Indexer (Future)

Not part of this implementation but designed to be compatible:

### Concept

A lightweight, Dockerized indexer node (Bun + Redis/Typesense) that:
- Replays the same `protocol-core/apply.ts` handlers
- Stores state in Redis for <50ms query latency
- Exposes WebSocket API for real-time state subscriptions
- Deployable for $5/month per node
- Open-source, community-operated

### Interface

```typescript
// Micro-indexer WebSocket API
ws.send(JSON.stringify({
  type: 'query',
  method: 'getPacksByOwner',
  params: { owner: 'alice' },
}));

// Response in <50ms
ws.onmessage = (event) => {
  const { packs } = JSON.parse(event.data);
  // [{ uid: 'pack_abc', sealed: true, dna: '...', packType: 'standard' }]
};
```

### How It Fits

```
Browser → WebSocket → Micro-Indexer (Bun + Redis)
                          ↓ (on startup)
                      Hive RPC → apply.ts → Redis
                          ↓ (live)
                      Hive RPC polling → apply.ts → Redis → push to WS clients
```

The micro-indexer runs the SAME `apply.ts` handlers as the browser replay engine. This guarantees state consistency across all nodes. The `StateAdapter` interface makes this trivial — Redis implements `StateAdapter` just like IndexedDB does.

---

## 14. Implementation Phases

### Phase 1: Atomic Transfers (Low Risk, High Value)

**Files changed**: ~5
**Estimated effort**: 1 session

1. Add `broadcastAtomicTransaction()` to `HiveSync.ts`
2. Update `transferCard()` to use atomic broadcast
3. Add `getCompanionTransfer()` to `StateAdapter` + `clientStateAdapter.ts`
4. Add companion transfer validation to `applyCardTransfer()` in `apply.ts`
5. Add transaction sibling caching to `replayEngine.ts`
6. Add `PackTransferPayload` schema to `opSchemas.ts`
7. Update `SendCardModal.tsx` to show "0.001 HIVE transfer included" info

### Phase 2: Pack NFTs (Medium Risk, High Value)

**Files changed**: ~10-12
**Estimated effort**: 2-3 sessions

1. Add `packs` + `pack_supply` stores to `replayDB.ts` (IDB v7)
2. Add `PackAsset` type to `HiveTypes.ts`
3. Add pack methods to `StateAdapter` + `clientStateAdapter.ts`
4. Implement `applyPackMint`, `applyPackTransfer`, `applyPackBurn` in `apply.ts`
5. Add Zod schemas to `opSchemas.ts`
6. Add `mintPack()`, `transferPack()`, `burnPack()` to `HiveSync.ts`
7. Add pack methods to `INFTBridge.ts` + both implementations
8. Add `packs` to `useHiveDataStore.ts` (Zustand)
9. Update `PacksPage.tsx` — buy packs → sealed inventory → open/gift
10. Create `SendPackModal.tsx` (clone of SendCardModal)
11. Add pack provenance viewer
12. Update `replayEngine.ts` hydration to include packs

### Phase 3: Seed/Instance/Replica DNA (Medium Risk, High Value)

**Files changed**: ~8-10
**Estimated effort**: 2 sessions

1. Add `originDna`, `instanceDna`, `parentInstanceDna`, `generation`, `replicaCount` to `HiveCardAsset` in `HiveTypes.ts`
2. Add `CardSeed` type for on-chain seed registry
3. Update `replayDB.ts` cards store with new fields (IDB schema unchanged — fields are additive)
4. Add `computeInstanceDna()` and `computeOriginDna()` to `shared/protocol-core/hash.ts`
5. Implement `applyCardReplicate` and `applyCardMerge` in `apply.ts`
6. Add Zod schemas for `card_replicate` and `card_merge` to `opSchemas.ts`
7. Add `replicateCard()` and `mergeCards()` to `HiveSync.ts`
8. Add methods to `INFTBridge.ts` + both implementations
9. Retroactive DNA computation in existing mint/pack/reward handlers
10. Update `NFTProvenanceViewer.tsx` with family tree visualization
11. Add Replicate + Merge buttons to `CollectionPage.tsx`
12. Update `nftMetadataGenerator.ts` with DNA fields in ERC-1155 metadata

### Phase 4: Micro-Indexer (Future, Separate Repo)

Not in scope for this sprint. Designed for compatibility — `StateAdapter` abstraction ensures drop-in Redis backend.

---

## 15. Open Questions

### Q1: Who Can Mint Packs?

**Option A**: Admin-only (`@ragnarok` broadcasts `pack_mint`, distributes to buyers)
**Option B**: Self-serve (user broadcasts `pack_mint` + sends HIVE to `@ragnarok-treasury`)

Option B is more decentralized but requires the replay engine to validate the HIVE transfer goes to the right account. Recommendation: **Start with Option A**, add Option B post-launch.

### Q2: Pack Supply Caps?

Should we cap the total number of packs per type? Recommendation: Yes — the same supply cap philosophy as cards. Suggested limits:

| Pack Type | Max Supply | Cards Per | Total Cards |
|-----------|------------|-----------|-------------|
| Starter | 100,000 | 5 | 500,000 |
| Standard | 500,000 | 5 | 2,500,000 |
| Premium | 100,000 | 7 | 700,000 |
| Mythic | 25,000 | 7 | 175,000 |
| Mega | 10,000 | 15 | 150,000 |

### Q3: Pack Pricing?

The 0.001 HIVE atomic anchor is a protocol fee. Should packs have an additional HIVE price? This would make the `transfer` amount larger (e.g., 5 HIVE for a standard pack instead of 0.001). The replay engine would validate the transfer amount matches the pack price.

Recommendation: **Defer pricing to the game economy design.** The protocol should support any price (validate `transfer.amount >= PACK_PRICES[packType]`), but the actual prices are a business decision.

### Q4: Can Packs Have Expiration?

Should sealed packs expire? This could drive urgency in the secondary market.

Recommendation: **No expiration.** Sealed packs should be eternal collectibles. This maximizes secondary market value and simplifies the protocol.

### Q5: Deprecation Timeline for pack_commit/pack_reveal?

The old two-phase flow can coexist with the new NFT flow indefinitely. Recommendation: Deprecate at the v1.1 activation block — all new pack operations must use `pack_mint`/`pack_burn`. Old `pack_commit`/`pack_reveal` records already in the chain are still processed normally during replay.

---

## Appendix A: Hive Transaction Example

### Atomic Card Transfer (Real Hive JSON)

```json
{
  "ref_block_num": 12345,
  "ref_block_prefix": 1234567890,
  "expiration": "2026-03-17T12:00:00",
  "operations": [
    [
      "custom_json",
      {
        "required_auths": ["alice"],
        "required_posting_auths": [],
        "id": "ragnarok-cards",
        "json": "{\"action\":\"card_transfer\",\"card_uid\":\"abc123def456\",\"to\":\"bob\",\"app\":\"ragnarok-cards\"}"
      }
    ],
    [
      "transfer",
      {
        "from": "alice",
        "to": "bob",
        "amount": "0.001 HIVE",
        "memo": "ragnarok:card_transfer:abc123def456"
      }
    ]
  ],
  "extensions": [],
  "signatures": ["2045a1b2c3..."]
}
```

### What PeakD Shows

```
alice → bob: 0.001 HIVE
Memo: ragnarok:card_transfer:abc123def456
+ custom_json: ragnarok-cards
```

Any Hive user can see this transfer happened, who sent what to whom, without running our indexer.

---

## Appendix B: Pack DNA Verification Tool

A standalone CLI tool for verifying pack contents (trustless):

```bash
# Given a burned pack, verify its derived cards
$ ragnarok-verify-pack \
    --pack-dna "a1b2c3d4e5f6..." \
    --burn-trx-id "f7e8d9c0b1a2..." \
    --entropy-block-id "0000001234abcdef..." \
    --pack-type "standard"

Pack DNA:        a1b2c3d4e5f6...
Burn TrxId:      f7e8d9c0b1a2...
Entropy Block:   0000001234abcdef...
Seed:            sha256(a1b2c3...|f7e8d9...|00000012...) = 9876543210...

Derived Cards:
  1. Card #20145 (Odin's Raven) — Epic
  2. Card #31023 (Fenrir's Packleader) — Common
  3. Card #20801 (Mjolnir's Echo) — Rare
  4. Card #50123 (Young Fenrir) — Common
  5. Card #30201 (Einherjar Hadding) — Rare

All cards verified against on-chain state. ✓
```

This tool runs `derivePackCards()` — the same function the replay engine uses. Anyone can verify any pack's contents independently.

---

## Appendix C: Why This Is Disruptive (Hive vs Ethereum)

*Based on analysis from NFTLox protocol architect, March 2026.*

The three upgrades in this document (atomic transfers, pack NFTs, DNA lineage) are not theoretically new — Ethereum has been attempting composable/utilitarian NFTs for years through various ERC sub-standards. What's disruptive is the **feasibility**. Hive's unique conditions make this actually work where ETH cannot.

### C.1 Zero-Fee Continuous Mutation

| | Ethereum | Hive (Ragnarok) |
|--|----------|-----------------|
| **Cost per state change** | $0.50-$50 gas per tx | $0.00 (RC only) |
| **Confirmation time** | 12-60 seconds | 3 seconds |
| **Mutations per day** | 1-5 (cost-prohibitive) | 100+ (free) |
| **Game mechanic location** | Centralized AWS ("Web 2.5") | 100% on L1 chain |

On ETH, building a game where cards constantly mutate, replicate, level up, and interact on L1 is **economically unfeasible**. That's why 99% of Ethereum games are "Web 2.5": the NFT is a static entry pass, but all game mechanics happen on centralized servers.

On Hive, our game already proves the opposite: match results, XP accumulation, level-ups, card transfers, pack openings, ELO ratings — all happen on L1 via `custom_json` at zero fee. Adding replicas, merges, and composable ownership is just more of the same.

**Ragnarok already does what ETH games wish they could.** This document extends that advantage further.

### C.2 NFT-Owns-NFT Composability

On Ethereum, making one NFT own another requires:
- ERC-6551 (Token Bound Accounts) — a new standard, poorly supported
- Complex smart contracts with high gas costs
- Cross-contract calls for every hierarchy query

On Hive + our protocol, NFT ownership of other NFTs is trivial:

```json
{
  "action": "equip_artifact",
  "hero_uid": "inst_hero_001",
  "artifact_uid": "inst_artifact_042",
  "slot": "weapon"
}
```

The indexer reads `hero_uid.equippedArtifacts = ["inst_artifact_042"]` — no L1 compute cost, no gas, no ERC sub-standard. Just a JSON field processed by the same deterministic replay engine.

#### Concrete Applications for Ragnarok

| Concept | Implementation | On-Chain Op |
|---------|---------------|-------------|
| **Hero owns artifacts** | Hero NFT has `equippedArtifacts[]` pointing to artifact NFT UIDs | `equip_artifact` |
| **Deck as NFT** | Deck NFT owns 30 card NFTs as children | `create_deck_nft` |
| **Pet evolution chain** | Stage 3 pet NFT has `evolvedFrom` pointing to Stage 1 origin | Already tracked via `parentInstanceDna` |
| **Sealed pack contains cards** | Pack NFT's DNA determines child card NFTs on burn | `pack_burn` (Upgrade 2) |
| **Tournament ticket** | Pack NFT doubles as access token (polymorphic utility) | `utility: [{ type: 'tournament_ticket' }]` |

### C.3 DNA as Decentralized Access Key

On Ethereum, verifying NFT ownership for access control requires:
1. `personal_sign` cryptographic signature from wallet
2. On-chain `ownerOf()` call to the smart contract
3. Gas costs for any state verification

On Hive + our DNA model, a card's `instanceDna` functions natively as a **decentralized API key**:

```typescript
// Generate a time-limited access key from any NFT's DNA
function generateAccessKey(
  instanceDna: string,
  purpose: string,     // e.g., 'tournament_entry', 'premium_content'
  expiresAt: number,   // Unix timestamp
): string {
  return sha256(`${instanceDna}|${purpose}|${expiresAt}`);
}

// Verify without any chain query — just math
function verifyAccessKey(
  key: string,
  instanceDna: string,
  purpose: string,
  expiresAt: number,
): boolean {
  if (Date.now() > expiresAt) return false;
  return sha256(`${instanceDna}|${purpose}|${expiresAt}`) === key;
}
```

No smart contract. No gas. No chain query. The NFT's mathematical existence proves authorization.

#### Use Cases

| Use Case | How It Works |
|----------|-------------|
| **VIP tournament entry** | Show mythic pack NFT DNA → `generateAccessKey(dna, 'tournament_vip', ...)` → auto-verified |
| **Cross-game item portability** | Another Hive game reads our chain → verifies `originDna` → spawns equivalent item |
| **Premium content unlock** | Own a mythic card → its `instanceDna` unlocks exclusive lore/art/cosmetics |
| **Software license** | NFT = perpetual license key. Transfer the NFT = transfer the license. Revoke = burn. |
| **Guild membership** | Guild leader replicates a "guild badge" NFT → distributes to members → badge DNA = access to guild features |

### C.4 Strategic Positioning

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE WEB3 GAME SPECTRUM                       │
│                                                                 │
│  Web 2.0          Web 2.5           Web 2.9         Web 3.0    │
│  ─────────────────────────────────────────────────────────────  │
│  No NFTs          Static NFTs       Partial on-chain  Full L1   │
│  All on server    (entry pass)      (some mutations)  (all ops) │
│                                                                 │
│  Most mobile      Most ETH games    Solana games     RAGNAROK  │
│  games            (Axie, STEPN)     (Star Atlas?)    + NTFLox   │
│                                                                 │
│  Features:        Features:         Features:        Features:  │
│  - Central DB     - Mint/transfer   - Some on-chain  - ALL ops  │
│  - No ownership   - Game on AWS     - Hybrid state     on L1    │
│  - No provenance  - Static metadata - Some fees      - $0 fees  │
│                   - High gas        - Partial DNA    - Full DNA  │
│                                                      - Composable│
│                                                      - Replicable│
│                                                      - Mergeable │
│                                                      - Access key│
└─────────────────────────────────────────────────────────────────┘
```

**Our thesis**: The concept of composable/utilitarian NFTs has been tried for years on ETH. What makes it disruptive NOW is Hive's zero-fee `custom_json` + deterministic off-chain indexing. We don't need Turing-complete smart contracts or Layer 2 rollups — we have something better: a purpose-built protocol where every game action is an immutable L1 record that costs nothing to write and 3 seconds to confirm.

Ragnarok is the proof that this works. These three upgrades extend it from "functional" to "disruptive."

---

## Appendix D: Three-Layer Protocol Taxonomy (NFTLox Model)

*Mapping the NFTLox layered architecture to Ragnarok's 21 ops.*

The NFTLox protocol organizes all operations into three semantic layers based on security level, economic impact, and functional purpose. Our protocol maps cleanly to this taxonomy:

### Layer 1: Origin (Birth of the Asset)

These ops create the foundation — collection rules, seed templates, and initial distribution.

| NFTLox Op | Ragnarok Op | Auth | Atomic? | Purpose |
|-----------|-------------|------|---------|---------|
| `create_collection` | `genesis` | Active | No | Define master rules (supply caps, version) |
| `mint` | `mint_batch` | Active | No | Create card seeds/templates (admin pre-seal) |
| — | `seal` | Active | No | Freeze admin authority permanently |
| `distribute` | `pack_distribute` | Active | 0.001 HIVE | Admin distributes packs to players |
| — | `pack_mint` | Active | No | Admin creates sealed packs into admin inventory |
| — | `reward_claim` | Posting | No | Self-serve milestone reward (no admin action) |

**Key principle**: Posting key for defining rules/data. Active key when real value is assigned to another user.

### Layer 2: Utility (The Living Gear)

These ops give NFTs functional behavior — they mutate, clone, evolve, and die.

| NFTLox Op | Ragnarok Op | Auth | Atomic? | Purpose |
|-----------|-------------|------|---------|---------|
| `replicate` | `card_replicate` | Active | No | Clone card — same genotype, new phenotype |
| — | `card_merge` | Active | No | Sacrifice 2 cards → 1 ascended card |
| `transfer` | `card_transfer` | Active | 0.001 HIVE | Send card to another player |
| `transfer` | `pack_transfer` | Active | 0.001 HIVE | Send sealed pack to another player |
| `burn` | `burn` | Active | No | Destroy card NFT |
| `burn` | `pack_burn` | Active | No | Open pack (burn = consume) |
| — | `level_up` | Posting | No | Acknowledge XP-derived level progression |
| — | `match_result` | Posting | No | Record game outcome + XP/ELO/RUNE rewards |
| — | `match_anchor` | Posting | No | Dual-sig session initialization |
| — | `queue_join` | Posting | No | Enter ranked matchmaking |
| — | `queue_leave` | Posting | No | Leave ranked queue |
| — | `slash_evidence` | Posting | No | Anti-cheat evidence submission |

**Key principle**: `burn` is polymorphic — it can mean "destroy," "open a pack," "forge a weapon," or "consume a potion." The game layer decides the semantic meaning; the protocol just deletes the NFT and emits the event.

### Layer 3: Economic (Integrated Marketplace) — FUTURE

Unlike Ethereum (where OpenSea is an external contract), NFTLox embeds the marketplace at the protocol level. This is our next frontier.

| NFTLox Op | Ragnarok Op | Auth | Atomic? | Purpose |
|-----------|-------------|------|---------|---------|
| `list` | *(future)* | Posting | No | Set price, offer asset on global network |
| `unlist` | *(future)* | Posting | No | Remove listing |
| `buy` | *(future)* | Active | HIVE amount | Accept price, atomic transfer of funds + ownership |
| `offer` | *(future)* | Posting | No | Bid/ask counteroffers |

**Current state**: Our trading system (`tradeStore.ts`) uses server-mediated P2P offers. To reach full NFTLox parity, we would move `list/unlist/buy/offer` into the protocol core as chain ops — making the marketplace fully decentralized, no server needed.

**Why Posting vs Active matters**:

```
Posting Key (low security, daily use):
  → Intentions: list, unlist, offer, queue_join, level_up
  → Data: match_result, match_anchor, slash_evidence
  → Destruction: burn (no counterparty affected)

Active Key (high security, real value):
  → Money moves: buy, distribute, transfer
  → Custody changes: card_transfer, pack_transfer
  → Asset creation affecting others: pack_distribute
  → Permanent mutations: card_replicate, card_merge
```

This separation means a compromised Posting key can never steal assets or transfer value — the worst an attacker can do is burn your cards (which is logged immutably on L1 for dispute resolution).

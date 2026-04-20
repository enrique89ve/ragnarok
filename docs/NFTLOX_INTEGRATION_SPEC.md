# Ragnarok x NFTLox Integration Specification

## Overview

Ragnarok uses NFTLox as its **NFT birth layer** — all card minting, pack creation, and pack opening happen through the NFTLox protocol on Hive L1. Everything after birth (gameplay, ELO, tournaments, rewards, anti-cheat) runs on Ragnarok's own `ragnarok-cards` protocol.

**Separation of concerns:**
- **NFTLox** = NFT factory (create collection, mint seeds, distribute instances, open packs)
- **Ragnarok** = game engine (deck building, matches, ELO, marketplace, rewards)

The Ragnarok indexer watches BOTH `nftlox_testnet` (for ownership changes) AND `ragnarok-cards` (for game state) custom_json operations.

---

## 1. Collection Setup

### Create Ragnarok Collection

One-time operation by the Ragnarok admin account.

```json
{
  "protocol": "nftlox_testnet",
  "version": "0.3.0",
  "action": "create_collection",
  "data": {
    "name": "Ragnarok Cards",
    "symbol": "RGNRK",
    "creator": "<ragnarok-admin>",
    "totalPotential": 2134,
    "metadata": {
      "description": "Norse Mythos Card Game — 2,134 collectible cards across 5 mythological factions",
      "image": "https://dhenz14.github.io/norse-mythos-card-game/icons/icon-512.webp",
      "externalUrl": "https://dhenz14.github.io/norse-mythos-card-game"
    },
    "rules": {
      "transferable": true,
      "burnable": true,
      "replicable": false,
      "royaltyPct": 0,
      "royaltyRecipient": "<ragnarok-admin>"
    },
    "schema": {
      "immutable": [
        { "name": "card_id", "type": "uint32" },
        { "name": "name", "type": "string" },
        { "name": "type", "type": "string" },
        { "name": "rarity", "type": "string" },
        { "name": "class", "type": "string" },
        { "name": "mana_cost", "type": "uint8" },
        { "name": "attack", "type": "uint8" },
        { "name": "health", "type": "uint8" },
        { "name": "race", "type": "string" },
        { "name": "set", "type": "string" }
      ],
      "mutable": [
        { "name": "level", "type": "uint8" },
        { "name": "xp", "type": "uint32" },
        { "name": "foil", "type": "string" }
      ]
    }
  }
}
```

**Notes:**
- `totalPotential: 2134` = total number of unique card templates (seeds)
- `replicable: false` — Ragnarok manages its own DNA/replication system
- `royaltyPct: 0` — no protocol fee, Ragnarok handles its own marketplace
- Schema includes immutable card stats + mutable game progression (level, xp, foil)

---

## 2. Seed Minting (Card Templates)

Each of the 2,134 collectible cards becomes one NFTLox seed. Seeds are templates — they define the card type and supply cap. Players never own seeds directly; they own instances distributed from seeds.

### Seed Data Mapping

| Ragnarok Field | NFTLox Seed Field | Notes |
|---------------|-------------------|-------|
| `card.id` | `artId` | Unique card identifier (e.g., "20001") |
| `card.name` | `metadata.name` | Card display name |
| `card.description` | `metadata.description` | Card text (truncated to 1000 chars) |
| Art URL | `metadata.imageUrl` | `https://dhenz14.github.io/norse-mythos-card-game/art/{artId}.webp` |
| Supply cap | `maxSupply` | Per-rarity: mythic=250, epic=500, rare=1000, common=2000 |

### Seed Mint Payload (per card)

```json
{
  "protocol": "nftlox_testnet",
  "version": "0.3.0",
  "action": "mint",
  "data": {
    "collectionId": "<ragnarok-collection-id>",
    "edition": 1,
    "owner": "<ragnarok-admin>",
    "metadata": {
      "name": "Echo of the Allfather",
      "description": "Battlecry: Draw 2 cards. Your hero power costs (0) this turn.",
      "imageUrl": "https://dhenz14.github.io/norse-mythos-card-game/art/20001.webp"
    },
    "maxSupply": 250,
    "immutableData": {
      "card_id": 20001,
      "name": "Echo of the Allfather",
      "type": "minion",
      "rarity": "mythic",
      "class": "Neutral",
      "mana_cost": 8,
      "attack": 7,
      "health": 7,
      "race": "Einherjar",
      "set": "norse"
    }
  }
}
```

### Batch Seed Minting Plan

| Rarity | Seeds | maxSupply | Total Instances | Batches (50/batch) |
|--------|-------|-------------|-----------------|---------------------|
| Mythic | 160 | 250 | 40,000 | 4 |
| Epic | 363 | 500 | 181,500 | 8 |
| Rare | 687 | 1,000 | 687,000 | 14 |
| Common | 924 | 2,000 | 1,848,000 | 19 |
| **Total** | **2,134** | — | **2,756,500** | **427 transactions** |

NFTLox limits 5 operations per Hive transaction. 2,134 seeds / 5 = 427 Keychain signatures. At ~4s per signature, full mint takes ~28 minutes.

**artId format:** Card ID as string, zero-padded to 5 digits (e.g., `"20001"`, `"01000"`, `"50376"`). Max 14 chars, alphanumeric + hyphens per NFTLox validation.

---

## 3. Pack System

### Pack Definitions

Ragnarok has 6 pack types. Each maps to one NFTLox pack with weighted drop tables.

| Pack Type | Cards Per Pack | Drop Table Weights |
|-----------|---------------|-------------------|
| Starter | 5 | 70% common, 20% rare, 8% epic, 2% mythic |
| Booster | 5 | 60% common, 25% rare, 12% epic, 3% mythic |
| Standard | 5 | 55% common, 27% rare, 14% epic, 4% mythic |
| Premium | 7 | 40% common, 30% rare, 22% epic, 8% mythic |
| Mythic | 7 | 20% common, 30% rare, 35% epic, 15% mythic |
| Mega | 15 | 30% common, 30% rare, 28% epic, 12% mythic |

### Pack Create Payload (example: Standard Pack)

```json
{
  "protocol": "nftlox_testnet",
  "version": "0.3.0",
  "action": "pack_create",
  "data": {
    "collectionId": "<ragnarok-collection-id>",
    "name": "Ragnarok Standard Pack",
    "description": "5 cards with guaranteed rare or better",
    "imageUrl": "https://dhenz14.github.io/norse-mythos-card-game/art/pack-standard.webp",
    "dropTable": [
      { "seedId": "seed_<common1>", "weight": 55 },
      { "seedId": "seed_<common2>", "weight": 55 },
      { "seedId": "seed_<rare1>", "weight": 27 },
      { "seedId": "seed_<epic1>", "weight": 14 },
      { "seedId": "seed_<mythic1>", "weight": 4 }
    ],
    "itemsPerPack": 5,
    "maxSupply": 100000
  }
}
```

**Drop table construction:** Each seed in the drop table gets a weight proportional to its rarity tier. Within each rarity tier, all seeds share equal weight. For example, if there are 924 common seeds at weight 55 total, each common seed gets `55/924 ≈ 0.06` weight. NFTLox uses integer weights (1-10000), so we scale accordingly.

### Pack Opening

Player broadcasts via Hive Keychain:
```json
{
  "protocol": "nftlox_testnet",
  "version": "0.3.0",
  "action": "pack_open",
  "data": {
    "packId": "<ragnarok-standard-pack-id>",
    "quantity": 1
  }
}
```

NFTLox deterministically generates 5 card instances. Ragnarok's indexer picks up the new NFTs from the nftlox protocol ops and adds them to the player's collection.

---

## 4. Ragnarok Indexer Integration

### Dual-Protocol Watching

The Ragnarok replay engine watches two protocol IDs:

```
Protocol 1: "nftlox_testnet" (or production ID when launched)
  — Monitors: mint, transfer, burn, bulk_distribute, pack_open
  — Purpose: Track card ownership (who has what)

Protocol 2: "ragnarok-cards"
  — Monitors: match_anchor, match_result, queue_join/leave, reward_claim, etc.
  — Purpose: Game state (ELO, matches, rewards, tournaments)
```

### NFTLox Op → Ragnarok State Mapping

| NFTLox Op | Ragnarok Action |
|-----------|----------------|
| `mint` (seed) | Register new card template in local registry |
| `bulk_distribute` | Add instances to player's collection |
| `pack_open` | Add opened cards to player's collection |
| `transfer` | Update card ownership |
| `burn` | Remove card from player's collection |

### Ownership Resolution

When Ragnarok needs to check if a player owns a card (e.g., deck building):

1. Query local IndexedDB (fast, client-side)
2. IndexedDB is populated by replaying NFTLox `custom_json` ops filtered to our collection ID
3. No dependency on NFTLox's server API — fully self-sovereign

### Art Resolution

NFT instances carry `metadata.imageUrl` pointing to GitHub Pages. The Ragnarok client resolves art locally via `getCardArtPath(name, cardId)` — the NFT metadata URL is for external tools/explorers only.

---

## 5. What NFTLox Provides

| Feature | NFTLox Handles | Ragnarok Handles |
|---------|---------------|-----------------|
| Collection creation | Yes | — |
| Seed minting | Yes | — |
| Instance distribution | Yes | — |
| Pack creation | Yes | — |
| Pack opening (RNG) | Yes | — |
| NFT transfers | Yes (also Ragnarok marketplace) | Yes (own marketplace) |
| NFT burns | Yes | — |
| Card ownership query | Yes (API) | Yes (IndexedDB replay) |
| Marketplace listings | — | Yes (`ragnarok-cards` ops) |
| Match results | — | Yes |
| ELO / leaderboards | — | Yes |
| Tournament rewards | — | Yes |
| Anti-cheat (PoW, WASM) | — | Yes |
| Provenance stamps | — | Yes (extends NFTLox birth data) |
| DNA lineage | Yes (originDna, instanceDna) | Uses NFTLox DNA |
| Level / XP progression | — | Yes (mutable data or own ops) |

---

## 6. What We Need From NFTLox

### Required (Launch Blockers)

1. **Production protocol ID** — currently `nftlox_testnet`, need production `nftlox` (or equivalent)
2. **Collection creation** — we create one collection: "Ragnarok Cards" / RGNRK
3. **Seed minting** — 2,134 seeds via `buildSeedBatch()`, 43 Keychain-signed batches
4. **Pack creation** — 6 pack definitions with drop tables
5. **Pack opening** — deterministic RNG (already built)
6. **Bulk distribute** — for initial distribution / DUAT airdrop

### Nice to Have

7. **Schema support** — typed immutable/mutable fields on our cards (card_id, rarity, level, xp)
8. **Zero royalty/fee** — confirmed: `royaltyPct: 0`, no protocol fee for our collection
9. **Large drop tables** — we have 2,134 seeds; drop tables max 50 entries, so we'd need grouped rarity-tier entries, not per-card entries

### Not Needed

- NFTLox marketplace (we have our own)
- NFTLox lending/allowances (future consideration)
- NFTLox data operators (could use later for cross-game composability)
- NFTLox multisig buy (we handle our own marketplace)

---

## 7. Drop Table Strategy

NFTLox drop tables max out at 50 entries. We have 2,134 seeds. Two approaches:

### Option A: Rarity-Tier Pools (Recommended)

Create 4 "pool seeds" — one per rarity tier. Each pool seed represents all cards of that rarity. When a pack opens and selects a pool seed, Ragnarok's indexer uses a second deterministic pass (seeded from the NFTLox instance DNA) to select the specific card within that rarity tier.

```
Drop table (4 entries):
  pool_common  → weight 5500  (55%)
  pool_rare    → weight 2700  (27%)
  pool_epic    → weight 1400  (14%)
  pool_mythic  → weight 400   (4%)
```

**Pro:** Simple, fits within 50-entry limit, easy to maintain.
**Con:** Requires Ragnarok-side logic to resolve pool → specific card.

### Option B: Multiple Pack Variants

Create many pack variants, each with different 50-card subsets. Player randomly gets assigned a pack variant.

**Pro:** Pure NFTLox, no Ragnarok-side resolution needed.
**Con:** Massive operational complexity (43+ pack types per pack tier).

### Recommendation: Option A

Use rarity pool seeds. NFTLox handles the rarity selection. Ragnarok's indexer deterministically maps `instanceDna` → specific card ID within the rarity pool. This keeps the drop table small and the card selection deterministic and verifiable.

---

## 8. Migration Timeline

### Phase 1: Setup (Day 1)
- Create "Ragnarok Cards" collection on NFTLox
- Mint all 2,134 seeds (43 batch transactions)
- Verify seeds via NFTLox API

### Phase 2: Packs (Day 1-2)
- Create 6 pack definitions with drop tables
- Test pack opening with test account
- Verify deterministic card resolution

### Phase 3: Integration (Day 2-3)
- Update Ragnarok replay engine to watch `nftlox_testnet` ops
- Map NFTLox instance ownership → Ragnarok IndexedDB `cards` store
- Test deck building with NFTLox-derived ownership

### Phase 4: Launch (Day 3+)
- DUAT airdrop via `bulk_distribute` (164,460 packs to 3,511 holders)
- Pack sales via NFTLox `pack_buy`
- Secondary trading via Ragnarok marketplace (`ragnarok-cards` ops)

---

## 9. Technical Integration Points

### Ragnarok Files That Need Changes

| File | Change |
|------|--------|
| `replayEngine.ts` | Add `nftlox_testnet` as second protocol filter |
| `replayRules.ts` | Add handlers for NFTLox mint/transfer/burn/pack_open |
| `replayDB.ts` | No change (cards store already handles ownership) |
| `hiveConfig.ts` | Add `NFTLOX_PROTOCOL_ID` constant |
| `HiveSync.ts` | Add NFTLox SDK import for pack_open/transfer broadcasts |
| `genesisAdmin.ts` | Replace custom genesis with NFTLox collection creation |
| `AdminPanel.tsx` | Update UI to use NFTLox SDK builders |
| `PacksPage.tsx` | Wire pack_open to NFTLox protocol |

### New Dependencies

```json
{
  "@nftlox/sdk": "^0.3.0"
}
```

Or vendor the SDK builders directly (they're pure functions with zero dependencies beyond Zod).

---

## 10. Prompt for NFTLox Team

> We're building Ragnarok, a Norse mythology card game on Hive with 2,134 collectible cards. We want to use NFTLox as our NFT birth layer — you handle collection creation, seed minting, pack creation, and pack opening. Everything after (gameplay, marketplace, anti-cheat) runs on our own `ragnarok-cards` protocol.
>
> What we need:
> 1. One collection: "Ragnarok Cards" / RGNRK, 2,134 seeds, typed schema, 0% royalty
> 2. 427 seed mint transactions (5 ops per tx) with per-seed maxSupply (250/500/1000/2000 by rarity)
> 3. 6 pack types with weighted drop tables (4 rarity-pool entries each)
> 4. Our indexer replays your `nftlox_testnet` ops alongside our own — no API dependency
> 5. No fee on our collection (we'll run our own marketplace)
>
> Total NFT supply: ~2.76M instances across 2,134 unique cards.
> Art hosted on GitHub Pages. Schema: card_id, name, type, rarity, class, mana_cost, attack, health, race, set (immutable) + level, xp, foil (mutable).
>
> Are there any constraints we should know about? Can we do a test mint on the current testnet protocol?

---

## 11. NFTLox Protocol Updates (2026-03-27 Audit)

Changes discovered since this spec was first written. NFTLox is actively developing with Ragnarok as a first-class use case.

### Breaking Changes

1. **`tags` field removed** — Seed mint payloads no longer accept `tags`. Removed from our payloads above.
2. **`maxReplicas` renamed to `maxSupply`** — All field references updated throughout this spec.
3. **Batch count corrected** — NFTLox limits 5 ops per Hive transaction (not 50). 2,134 seeds = 427 transactions (~28 min), not 43 batches (~3 min).

### New: Typed Schema System

NFTLox now supports typed collection schemas with immutable + mutable fields:
- 22 scalar types: `string`, `bool`, `int8`-`int64`, `uint8`-`uint64`, `float`, `double`, plus array variants
- Max 64 fields total per collection
- Field names: `^[a-z][a-z0-9_]*$` (max 64 chars)
- Immutable data set at mint, **never changeable**
- Mutable data updatable by creator/data operators only (not NFT owner)
- Owner-private data via `set_owner_data` (owner-only, free-form)
- SHA-256 canonical hash computed for all data fields automatically

**Ragnarok schema templates ship in the SDK:** `RAGNAROK_MINION_SCHEMA`, `RAGNAROK_SPELL_SCHEMA`, `RAGNAROK_WEAPON_SCHEMA`, `RAGNAROK_PET_SCHEMA`, `RAGNAROK_ARMOR_SCHEMA`, `RAGNAROK_HERO_SCHEMA`. The NFTLox team is explicitly designing with our game in mind.

### New Operations (25 total, was 23)

| New Op | Description | Authority |
|--------|-------------|-----------|
| `extend_schema` | Append fields to collection schema (creator-only) | posting |
| `set_owner_data` | Owner writes free-form data to their NFT | posting |

### Permission Model Change

For schema-based collections, `set_data` is now **creator-only** (not owner). Players who want to store personal data use `set_owner_data` instead. Ragnarok admin would broadcast `set_data` for level/XP updates after match results.

### SPV Verification System ("Boleto Suizo")

NFTLox ships trustless verification for pack openings:
- Pure verifiers: replay deterministic RNG locally, verify DNA derivation
- Network verifiers: fetch tx from Hive L1, compare against indexer data
- Audit coordinator: randomly samples recent pack_open events, verifies each

We can wire this into a "Verify on Chain" button in our collection UI.

### Other Updates

- **Weight range expanded:** Drop table weights now 1-1,000,000 (was 1-10,000) — finer rarity granularity
- **Lending system:** `nft_lend` / `nft_return` — future card lending for tournaments
- **Data operators:** Cross-game composability via `data_operator_approve` + `set_data_from`
- **Orphaned buy tracking:** Failed marketplace buys with paired HIVE transfers are audited
- **Genesis auto-reset:** Changing `GENESIS_BLOCK` in indexer config triggers full re-sync
- **Listing expiration:** Marketplace listings expire based on block timestamps (deterministic)

### Decision Needed: Schema Strategy

NFTLox ships 6 per-card-type schemas for Ragnarok. Two approaches:

**Option A: Single collection, generic schema** (our current plan)
- One `create_collection` with unified immutable fields (card_id, name, type, rarity, etc.)
- Simpler: 1 collection, 1 seed batch, 1 pack system
- Less type-safe: spells have attack/health fields set to 0

**Option B: Multiple collections, typed schemas**
- 6 collections using NFTLox's Ragnarok templates
- Each card type gets only its relevant fields
- More complex: 6 collection creates, 6 sets of seeds, pack system spans collections

**Recommendation:** Stay with Option A (single collection) for launch simplicity. The generic schema with unused fields set to 0 is standard practice in TCG NFTs. Migrate to per-type collections in a future protocol version if needed.

---

## 12. NFTLox Protocol Updates (2026-03-29 Audit)

20 commits in 48 hours. Monorepo migration (sdk/indexer/playground), Bun workspaces, PostgreSQL.

### Critical: Option C+ Pack Opening (Recommended by NFTLox)

NFTLox drop tables cap at 50 entries. With 2,134 cards, `pack_create` + `pack_open` cannot represent our full catalog. NFTLox recommends "Option C+":

1. Accept player HIVE payment (any method)
2. Read payment `txId` + `blockNum` from chain
3. Run `resolveDropTable()` locally with full card catalog (no size limit)
4. Call `bulk_distribute` with resolved seed IDs

```json
{
  "protocol": "nftlox_testnet",
  "version": "0.3.0",
  "action": "bulk_distribute",
  "data": {
    "to": "player-alice",
    "items": [
      { "seedId": "seed_20001", "quantity": 1, "originBlock": 12345678 },
      { "seedId": "seed_31005", "quantity": 1, "originBlock": 12345678 },
      { "seedId": "seed_50136", "quantity": 1, "originBlock": 12345678 }
    ]
  }
}
```

**This supersedes our Section 7 (Drop Table Strategy) and Section 3 (Pack System).** We keep our 6 pack types but resolve them server-side, then distribute via `bulk_distribute`.

### `bulk_distribute` Signature Change (Breaking)

Old: `(collectionId, seedId, recipients, quantity)`
New: `{ to, items: [{seedId, quantity, originBlock}] }`

- Max 50 distinct seeds per operation
- Payload size validated (8KB limit, 90% safety margin → 7,372 bytes effective)
- Optional `imageOverrides` for per-seed art customization
- Optional `data`/`mutableData` for schema-based initial data

### Auth Key Simplification

Only `buy` requires active key. Everything else (mint, transfer, burn, list, lend, etc.) uses posting key. Our adapter was already correct (`useActiveKey: false` default).

### New HiveSync Adapter Methods

| Method | NFTLox Action | Key |
|--------|--------------|-----|
| `nftloxSetOwnerData(nftId, data)` | `set_owner_data` | Posting |
| `nftloxExtendSchema(collectionId, fields)` | `extend_schema` | Posting |
| `nftloxLendCard(nftId, borrower)` | `nft_lend` | Posting |
| `nftloxReturnCard(nftId)` | `nft_return` | Posting |
| `nftloxListCard(nftId, price, currency)` | `list` | Posting |
| `nftloxBuyCard(listingId, nftId, seller, amount)` | `buy` | Active |

### New Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `NFTLOX_MAX_JSON_SIZE` | 8,000 | Max bytes per custom_json |
| `NFTLOX_SAFE_PAYLOAD_MAX` | 7,372 | 90% safety margin |
| `NFTLOX_MAX_BULK_ITEMS` | 50 | Max seeds per bulk_distribute |
| `NFTLOX_MAX_DROP_TABLE` | 50 | Max entries in pack drop table |

### Deterministic ID Generation

All IDs are FNV-1a hash-based (no random, no timestamps):
- Collection: `col_xxxxxxxxxxxx` from `(creator, name, symbol)`
- Seed: `seed_xxxxxxxx` from `(collectionId, artId)`
- Instance: `nft_xxxxxxxx_N_xxxx` from `(seedId, instanceNumber)`
- Pack: `pack_xxxxxxxxxxxx` from `(collectionId, packName)`

Pre-computable before minting. Admin panel can preview all IDs.

### SPV Verification Expanded

Full "Boleto Suizo" module:
- `fetchTransaction()` — Hive L1 via HAFAH REST API
- `verifyPackOpen()` — End-to-end pack open verification
- `verifyNftOwnership()` — Current owner via L1 + indexer cross-check
- `runAudit()` — Batch audit of recent pack opens

### Multisig Marketplace Buy

Atomic buy flow: buyer fetches payment splits → builds unsigned tx → indexer co-signs → buyer broadcasts. 1% protocol fee hardcoded. Ragnarok's own marketplace is simpler (no multisig needed).

### Schema Field Type Update

NFTLox Ragnarok templates use `uint16` for attack/health (our spec had `uint8` capping at 255). Update our schema to match:

```
"attack": "uint16",  // was uint8
"health": "uint16",  // was uint8
```

### What NFTLox Still Doesn't Handle (Ragnarok Protocol)

- Card merge (sacrifice 2 → 1 ascended)
- Match results / ELO / ranked ladder
- Reward claims
- Genesis/seal ceremony
- Poker combat state
- Tournament brackets

---

## 13. NFTLox Protocol Updates (2026-03-29 Audit — v0.4.0)

Protocol version bumped from **0.3.0 to 0.4.0**. Same 25 actions, but significant key type and structural changes.

### Key Type Reclassification (Security Tightening)

The biggest change — asset-moving operations now require active key:

| Action | v0.3.0 Key | v0.4.0 Key | Rationale |
|--------|-----------|-----------|-----------|
| `transfer` | Posting | **Active** | Asset transfer is high-risk |
| `burn` | Posting | **Active** | Permanent destruction is high-risk |
| `list` | Posting | **Active** | Marketplace listing is high-risk |
| `data_operator_approve` | Posting | **Active** | Delegation is high-risk |
| `unlist` | Active | **Posting** | Delisting is low-risk (reduces friction) |

**Impact on our adapter:** `nftloxListCard`, `nftloxTransferCard`, `nftloxBurnCard`, `nftloxDataOperatorApprove` now pass `useActiveKey: true`. `nftloxUnlistCard` uses posting (default).

This contradicts our Section 12 note that "Only `buy` requires active key" — that was correct for v0.3.0 but is now outdated. **Active key actions (v0.4.0): transfer, burn, list, buy, pack_buy, pack_transfer, nft_approve, nft_approve_all, pack_approve, data_operator_approve (10 total).**

### 3-Tier Data Model (ownerData)

NFTs now have THREE data layers:

| Layer | Writer | Mutability | Use Case |
|-------|--------|-----------|----------|
| `immutableData` | Creator (at mint) | Never changes | card_id, name, type, rarity, class, mana_cost, attack, health, race, set |
| `mutableData` | Creator / data operators | `set_data` / `set_data_from` | level, xp, foil (admin-controlled progression) |
| `ownerData` | NFT owner only | `set_owner_data` | Player-controlled data (custom name, notes, display preferences) |

Our `nftloxSetOwnerData(nftId, ownerData)` sends the `ownerData` field (not `mutableData`).

### Build API Improvements

- **`keyType` field in response** — response now tells the caller which Hive key to sign with
- **`warnings[]` array** — advisory messages (high royalty, large supply, etc.)
- Our adapter doesn't use the Build API (we construct payloads locally), but these are useful for the Admin Panel

### Protocol Fee Formalization

- **1.0% fee on every marketplace sale**, paid to the co-signing indexer node
- `calculatePaymentSplit(price, royaltyPct)` → `{ seller, royalty, fee }` amounts
- Fee is taken from the buyer's payment before seller/royalty split
- Min price: 0.001 HIVE/HBD (exactly 3 decimal places)

### Hash Version Header

- `hashVersion: "v1"` field now appears in API responses
- Signals the hash algorithm used for data hashes (currently SHA-256)
- Forward-compatible: when hash algorithm changes, field increments

### Listing Expiration

- `expiresAt` field on marketplace listings (block-based, deterministic)
- Our `nftloxListCard` already accepts `expiresInBlocks` parameter — compatible

### Rate Limiting

- 1,000 requests/min per IP with standard `X-RateLimit-*` headers
- 2s cache for data endpoints, 10s for stats
- Our client-side replay engine doesn't hit their API directly (reads from Hive L1), so no impact

### New Adapter Methods (v0.4.0)

| Method | NFTLox Action | Key | Purpose |
|--------|--------------|-----|---------|
| `nftloxTransferCard(nftId, to, memo?)` | `transfer` | Active | Transfer NFT to another account |
| `nftloxBurnCard(nftId)` | `burn` | Active | Permanently destroy NFT |
| `nftloxUnlistCard(nftId)` | `unlist` | Posting | Remove marketplace listing |
| `nftloxReplicate(seedId, to?)` | `replicate` | Posting | Create replica of seed |
| `nftloxDataOperatorApprove(collectionId, operator, approved)` | `data_operator_approve` | Active | Approve/revoke data operator |

### Complete Key Assignment Table (v0.4.0)

**Active Key (10):** transfer, burn, list, buy, pack_buy, pack_transfer, nft_approve, nft_approve_all, pack_approve, data_operator_approve

**Posting Key (15):** create_collection, mint, replicate, bulk_distribute, set_data, set_owner_data, extend_schema, unlist, pack_create, pack_open, nft_transfer_from, pack_transfer_from, set_data_from, nft_lend, nft_return

### Indexer Client Library

17-method portable API client using only `fetch()` (browser-compatible):

```
getStatus(), getHealth(), getStats(), getCollections(), getCollection(),
getCollectionNfts(), getCollectionStats(), getNft(), getNftInstances(),
getUserNfts(), getUserNftCounts(), getUserCollections(), getUserPacks(),
getListings(), getPaymentInfo(), multisig(), getPacks(), getPack()
```

We may wire this into a future "NFTLox Explorer" panel, but our primary indexing runs client-side via Hive L1 chain replay.

### SPV Verification Expanded

Full "Boleto Suizo" module with 8 functions:

```
runAudit(), runSingleVerification(), verifyNftOwnership(),
verifyOperationOnChain(), fetchTransaction(), parseNftloxOperation(),
replayDropTableResolution(), verifyDeterministicDerivation()
```

Can be wired into a "Verify on Chain" button in our collection UI for trustless ownership proof.

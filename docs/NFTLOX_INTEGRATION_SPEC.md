# NFTLox Integration — External NFT Ownership Layer

> ⚠️ **This document is NOT a source of truth for how Ragnarok administers cards in-game.**
>
> - **In-game card contract** → `client/src/game/data/schemas/` (canonical types, rarity, set, element, ids).
> - **Card definitions** → `client/src/game/data/cardRegistry/`.
> - **Game state on Hive** (matches, ELO, decks, rewards) → `docs/RAGNAROK_PROTOCOL_V1.md`.
>
> This file describes only the **external NFT birth & ownership layer** (minting, supply, pack opening, transfer, burn) that runs on the third-party NFTLox protocol on Hive L1. It is forward-looking integration spec, not active game logic. If this doc and the schemas package disagree, **the schemas win**.

---

## Separation of concerns

| Layer | Owner | What it governs |
|---|---|---|
| **NFTLox** (external protocol) | Birth & custody | Collection creation, seed minting, instance distribution, pack opening RNG, transfers, burns |
| **Ragnarok** (`ragnarok-cards` protocol) | Game state | Matches, ELO, decks, rewards, marketplace, anti-cheat, level/XP progression |

The Ragnarok client-side replay engine watches **both** custom_json protocols on Hive L1 and merges them into local IndexedDB. No NFTLox API dependency at runtime.

---

## Current decisions (target v0.4.0)

### Collection — single, generic schema

One NFTLox collection: `Ragnarok Cards` / symbol `RGNRK`, ~2,134 seeds (one per unique card template). Generic schema with all gameplay-relevant fields; spell/weapon cards leave irrelevant numeric fields at 0. Per-type collections rejected for launch simplicity.

| Property | Value |
|---|---|
| `replicable` | `false` (Ragnarok manages its own DNA) |
| `royaltyPct` | `0` (Ragnarok runs its own marketplace) |

### Schema (immutable + mutable + owner)

NFTLox v0.4.0 supports a 3-tier data model. Ragnarok uses all three:

| Tier | Writer | Fields |
|---|---|---|
| `immutableData` | Creator at mint, never changes | `card_id, name, type, rarity, class, mana_cost, attack, health, race, set` (attack/health are `uint16`) |
| `mutableData` | Creator / data operators only | `level, xp, foil` (admin-controlled progression after match results) |
| `ownerData` | NFT owner | Free-form personal data (custom names, notes) |

The `set` and `rarity` fields here mirror the canon defined in `client/src/game/data/schemas/primitives/`. Any divergence between the on-chain `immutableData` and the schemas package is a bug.

### Pack opening — Option C+ (server-resolved + `bulk_distribute`)

NFTLox drop tables cap at 50 entries; Ragnarok has 2,134 seeds. The `pack_create` / `pack_open` flow can't represent the full catalog. Instead:

1. Player pays via HIVE transfer (any method).
2. Ragnarok admin reads payment `txId + blockNum` from chain.
3. `resolveDropTable()` runs locally with the full catalog (no 50-seed cap).
4. `bulk_distribute` ships the resolved seed IDs to the recipient (max 50 distinct seeds per op).

This supersedes any prior plan based on `pack_create` with rarity-pool drop tables.

### Authority model (v0.4.0)

Asset-moving ops require **active key**; everything else is posting:

- **Active**: `transfer, burn, list, buy, pack_buy, pack_transfer, nft_approve, nft_approve_all, pack_approve, data_operator_approve`
- **Posting**: `create_collection, mint, replicate, bulk_distribute, set_data, set_owner_data, extend_schema, unlist, pack_create, pack_open, nft_transfer_from, pack_transfer_from, set_data_from, nft_lend, nft_return`

---

## What we still need from NFTLox

| Need | Status |
|---|---|
| Production protocol ID (currently `nftlox_testnet`) | Pending |
| Confirmed `royaltyPct: 0` for our collection | Pending |
| 8KB custom_json payload limit (`NFTLOX_SAFE_PAYLOAD_MAX = 7372`) | Documented |
| Test mint pass on testnet | Pending |

What we explicitly **don't** use: NFTLox marketplace, lending, multisig buy, data operators (cross-game composability — future).

---

## Integration points in our codebase

| File | Role |
|---|---|
| `replayEngine.ts` | Add `nftlox_*` as second protocol filter alongside `ragnarok-cards` |
| `replayRules.ts` | Handlers for NFTLox `mint / transfer / burn / pack_open / bulk_distribute` |
| `HiveSync.ts` | Adapter methods for each NFTLox action with correct key type |
| `genesisAdmin.ts` | Replace custom genesis with NFTLox `create_collection` + seed batch |
| `client/src/game/data/schemas/` | **Source of truth** — `immutableData` schema mirrors these primitives |

Total NFT supply at full mint: ~2.76M instances across ~2,134 seeds.

---

## Constraints to remember

- 5 ops per Hive `custom_json` transaction → 2,134 seeds = 427 signatures (~28 min full mint).
- Drop tables max 50 entries (worked around by Option C+).
- Bulk distribute: max 50 distinct seeds per op.
- Marketplace listings expire by block, not wall-time.
- Min price: 0.001 HIVE/HBD (3 decimal places exactly).
- 1.0% protocol fee on marketplace sales (taken from buyer payment before seller/royalty split).

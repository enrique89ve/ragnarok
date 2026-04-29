# NFTLox Integration — External NFT Ownership Layer

> ⚠️ **This document is NOT a source of truth for how Ragnarok administers cards in-game.**
>
> - **In-game card contract** → `client/src/game/data/schemas/` (canonical types, rarity, set, element, ids).
> - **Card definitions** → `client/src/game/data/cardRegistry/`.
> - **Game state on Hive** (matches, ELO, decks, rewards) → `docs/RAGNAROK_PROTOCOL_V1.md`.
>
> This file describes only the **external NFT birth & ownership layer** (minting, supply, distribution, transfer, burn) that will run on the third-party NFTLox protocol on Hive L1. **Not yet integrated** — it is target spec, not active game logic. Active mint/pack/replicate/merge logic currently lives in `shared/protocol-core/apply.ts` (v1.1). If this doc and the schemas package disagree, **the schemas win**.

---

## Separation of concerns

| Layer | Owner | What it governs |
|---|---|---|
| **NFTLox** (external protocol) | Birth & custody | Collection creation, seed minting, instance distribution (`bulk_distribute`), transfers, burns, deterministic IDs/DNAs |
| **Ragnarok** (`ragnarok-cards` protocol) | Game state | Matches, ELO, decks, rewards, marketplace, anti-cheat, level/XP progression, **pack RNG resolution**, replicate/merge primitives |

The Ragnarok client-side replay engine watches **both** custom_json protocols on Hive L1 and merges them into local IndexedDB. No NFTLox API dependency at runtime.

---

## Current decisions (target v0.4.0)

> Verified against NFTLox testnet docs at `nftloxtest.hivecreators.co/docs` on 2026-04-29.

### Collection — single, generic schema

One NFTLox collection: `Ragnarok Cards` / symbol `RGNRK`, ~2,134 seeds (one per unique card template). Generic schema with all gameplay-relevant fields; spell/weapon cards leave irrelevant numeric fields at 0. Per-type collections rejected for launch simplicity.

`CollectionData.rules` exposes only four flags — there is no `replicable`, no built-in lineage, no breeding. The values we set:

| Rule | Value | Reason |
|---|---|---|
| `transferable` | `true` | Players can trade and gift cards |
| `burnable` | `true` | Required for the merge primitive (Ragnarok-side) |
| `royaltyPct` | `0` | Ragnarok runs its own marketplace; NFTLox royalties bypassed |
| `royaltyRecipient` | (omitted) | n/a when `royaltyPct = 0` |

### Schema — 2 tiers (immutable + mutable)

NFTLox v0.4.0 has a **2-tier** data model — there is no `ownerData` tier.

| Tier | Writer | Op | Fields we use |
|---|---|---|---|
| `immutableData` | Creator at mint | `mint` (seed) | `card_id, name, type, rarity, class, mana_cost, attack, health, race, set` (numeric stats are `uint16`) |
| `mutableData` | NFT **owner** (default) or approved **data operator** | `set_data` / `set_data_from` | `level, xp, foil` |

Two consequences worth flagging:
- The owner of the NFT can rewrite `mutableData` directly. To prevent players from setting their own `level`/`xp`, Ragnarok must register a **data operator** (`data_operator_approve`) and have the operator be the only signer of `set_data_from` for those fields. The schema can't enforce "creator-only writes" by itself.
- Schemas are append-only and validated by `schema_version`. Existing fields can never change type; new fields can be added with `extend_schema`.

The `set` and `rarity` fields here mirror the canon defined in `client/src/game/data/schemas/primitives/`. Any divergence between the on-chain `immutableData` and the schemas package is a bug.

### Pack opening — server-resolved RNG + `bulk_distribute`

**NFTLox v0.4.0 has no pack primitive.** There is no `pack_create`, `pack_open`, `pack_buy`, or drop table on the protocol. The canonical pattern (and the one shown in NFTLox's own [Game Development guide](https://nftloxtest.hivecreators.co/docs/use-cases/games.md)) is the same flow Ragnarok needs:

1. Player pays via HIVE transfer (or some other off-protocol trigger — e.g. a Ragnarok pack burn).
2. Ragnarok admin (or game server) reads the trigger `txId + blockNum` from chain.
3. RNG roll happens **server-side** with the full catalog (no protocol-imposed cap on entries).
4. `buildBulkDistribute({ signer: CREATOR, to: player, items })` ships the resolved seed IDs to the recipient.

Caps from `nftlox-sdk`:
- `MAX_BULK_DISTRIBUTE_ITEMS = 50` distinct seeds per call.
- `MAX_BULK_DISTRIBUTE_TOTAL_QUANTITY = 250` instances per call.
- `MAX_BULK_TRANSFER / BURN = 50` ids per call.

A 5-card pack fits trivially in one op; a 15-card mega pack also fits as long as it touches ≤ 50 distinct seeds. No batching needed for normal pack sizes.

### Authority model (v0.4.0)

The mapping is enforced by `ACTION_AUTH_LEVEL` in NFTLox's protocol package — there is no override.

- **Active key (3 ops only)**: `create_collection`, `buy_commitment`, `buy`.
- **Posting key (everything else)**: `mint`, `bulk_distribute`, `transfer`, `burn`, `list`, `unlist`, `set_data`, `set_data_from`, `extend_schema`, `archive_collection`, `nft_approve`, `nft_approve_all`, `data_operator_approve`, `nft_transfer_from`, `nft_lend`, `nft_return`.

A subset of active actions also requires the signer to be a **registered active settlement node** (`NODE_SIGNED_ACTIONS` — currently `buy_commitment` and `buy`). `create_collection` is active-signed by the creator, not by a node.

---

## On-chain identity — IDs and DNAs (deterministic)

NFTLox derives every ID and DNA deterministically from `sha256` with a fixed domain separator. Anyone can recompute them client-side without trusting the indexer.

| ID | Format | Derivation |
|---|---|---|
| Collection ID | `col_<20 hex>` | `sha256("nftlox:col:" + creator + ":" + name + ":" + symbol)` |
| Collection origin DNA | `o<15 upper-hex>` | `sha256("nftlox:origin:" + collectionId)` |
| Seed ID | `seed_<20 hex>` | `sha256("nftlox:seed:" + collectionId + ":" + artId.lower())` |
| Instance ID | `nft_<seedSuffix>_<n>` | concatenation, where `n` = `instanceNumber` |
| Seed `nftDna` | `i<19 upper-hex>` | `sha256("nftlox:seed-dna:" + nftId + ":" + originDna + ":" + edition + ":" + imageHash)` |
| Instance `nftDna` | `i<19 upper-hex>` | `sha256("nftlox:dna:" + seedId + ":" + n + ":" + txId + ":" + blockNum)` |
| Image hash | `img_<16 hex>` | `sha256("nftlox:img:" + imageUrl)` after `toWireUrl()` normalization |
| Listing ID | `list_<32 hex>` | `sha256("nftlox:listing:v1:" + nftId + ":" + owner + ":" + marketplace + ":" + price + ":" + currency + ":" + expiresAt + ":" + nonce)` |

**`nftDna` is functional, not cosmetic.** Mutating ops (`set_data`, `set_data_from`) **require** passing the current `nftDna` as a guard; it prevents cross-NFT replays and binds the mutation to current state. `client.getNft(nftId).nft_dna` is how the SDK exposes it.

### How this maps to our v1.1 DNA fields

Our protocol-core (`shared/protocol-core/`) already implements its own DNA system in `CardAsset` (`originDna`, `instanceDna`, `parentInstanceDna`, `generation`, `replicaCount`). It was designed for the standalone Ragnarok protocol and **does not align 1:1 with NFTLox**:

| Concept | Ragnarok v1.1 | NFTLox v0.4.0 |
|---|---|---|
| "Genotype" granularity | Per-card (`cardId + edition + rarity`) | Per-**collection** (`originDna` is one value for the whole catalog) |
| Template identity | Implicit via `originDna` | Explicit: the **seed** itself, identified by `seed_<…>` and its own `nftDna` |
| Per-instance identity | `instanceDna` (sha256, no prefix) | `nftDna` of the instance (`i<19 upper-hex>`) |
| Lineage (`parent`, `generation`) | Yes | Not modeled |
| Domain separators | Ad-hoc (`\|`, `:`) | Stable namespaced (`nftlox:origin:`, `nftlox:dna:`, …) |
| Image binding | Not in DNA | `imageHash` is part of seed `nftDna` |

When integration lands, the **seed `nftDna`** replaces our per-card `originDna` (it carries strictly more information — image hash + edition), and the **instance `nftDna`** replaces our `instanceDna`. We stop computing them ourselves and read them off the indexer (`client.getNft(...)`) or recompute via `verifyDeterministicDerivation()`.

### Replicate / Merge are Ragnarok-only

NFTLox v0.4.0 has **no** `replicate` op and **no** `merge` op. The lineage fields (`parentInstanceDna`, `generation`, `replicaCount`, `mergedFrom`) live on `CardAsset` only and are written by our `card_replicate` / `card_merge` handlers in `shared/protocol-core/apply.ts`.

If we want those primitives to survive the NFTLox migration, the options are:

1. **Off-chain only**: keep replicate/merge entirely in Ragnarok protocol state (no NFTLox NFT is created/destroyed). Player owns one NFTLox NFT per "real" card; replicas/merges are virtual.
2. **NFTLox `mutableData` shadow**: store `parent_nft_id` and `generation` as schema fields. Replicate = `bulk_distribute` 1 instance, write `parent` via `set_data_from`. Merge = burn the two source NFTs and `bulk_distribute` 1 new one.
3. **Drop the primitives**. Simplest, but breaks the existing `Replicate` / `Merge (2 → 1)` UI in [`CollectionPage.tsx`](../client/src/game/components/collection/CollectionPage.tsx).

Decision deferred until integration starts; the UI flagging in `CollectionPage.tsx` is fine to leave as-is meanwhile.

### Image URL canonicalization

NFTLox normalizes image URLs through `toWireUrl()` before hashing — the wire form has no protocol prefix (`https://example.com/img.png` → `example.com/img.png`). The reader applies `fromWireUrl()` on the way out. Our `assetPathFor(assetId)` currently produces relative paths (`/art/nfts/...`), which are **not stable hostnames**. Before mint, we need a canonical absolute URL per asset (CDN, IPFS, or pinned host) — otherwise the `imageHash` is fragile.

---

## Deferred cleanup plan (gated on SDK install)

**Decision (2026-04-29)**: keep current v1.1 DNA + replicate/merge code as-is until the `nftlox-sdk` is actually installed and we can do the cleanup with full context. Doing it ahead of time risks deleting working features that we'd then have to rebuild.

**Target end state**: internal `CardAsset` carries only `cardId` for template identity. No `originDna`, `instanceDna`, `parentInstanceDna`, `generation`, `replicaCount`, `mergedFrom`. All instance-level identity comes from NFTLox's `nftDna` and is **validated at the boundary** (when ingesting from indexer or replay) but not propagated into our domain.

**When it triggers**: after `nftlox-sdk` is installed, after we've decided how replicate/merge survive the migration (3 options in the section above), and *before* the first NFTLox-mediated mint.

**Cleanup checklist** (mapped to current files):

| File | Action |
|---|---|
| `shared/protocol-core/types.ts` | Drop `originDna`, `instanceDna`, `parentInstanceDna`, `generation`, `replicaCount`, `mergedFrom` from `CardAsset`. Drop `'replica'` and `'merge'` from `CardAsset.mintSource` union. Drop `MAX_REPLICAS_PER_CARD`, `MAX_GENERATION`, `REPLICA_COOLDOWN_BLOCKS` constants. Drop `'card_replicate'` and `'card_merge'` from `CanonicalAction`. Drop them from `ACTIVE_AUTH_OPS`. |
| `shared/protocol-core/apply.ts` | Drop `applyCardReplicate`, `applyCardMerge`, `loadMergeCards`, `resolveMergeLineage`, `getCardOriginDna`, `getCardInstanceDna`. Drop dispatcher entries. In `applyPackBurn`: stop computing `originDna`/`instanceDna`. |
| `shared/protocol-core/normalize.ts` | Drop `'rp_card_replicate'` / `'rp_card_merge'` from `LEGACY_MAP` and from the canonical `known` set. |
| `shared/protocol-core/broadcast-utils.ts` | Drop `generateOriginDna`, `generateInstanceDna`. Drop `instanceDna` param from `buildTransferMemo` and `dnaPrefix` from `parseTransferMemo`. |
| `shared/protocol-core/index.ts` | Drop re-exports of `generateOriginDna`, `generateInstanceDna`. |
| `client/src/data/blockchain/opSchemas.ts` | Drop `CardReplicatePayload`, `CardMergePayload`, and entries in op schema map. |
| `client/src/data/schemas/HiveTypes.ts` | Drop `'rp_card_replicate'`, `'rp_card_merge'` from custom_json id union. |
| `client/src/data/HiveSync.ts` | Drop `replicateCard`, `mergeCards`. |
| `client/src/game/nft/INFTBridge.ts` | Drop `replicateCard`, `mergeCards` from interface. |
| `client/src/game/nft/HiveNFTBridge.ts` + `LocalNFTBridge.ts` | Drop both methods. |
| `client/src/game/components/collection/CollectionPage.tsx` | Drop "Genetic Heritage" panel and Replicate/Merge buttons (lines ~960–1033). |
| `shared/protocol-core/replayTraces.test.ts` | Drop `describe('v1.1: card_replicate', ...)` and `describe('v1.1: card_merge', ...)` blocks (lines ~1069–1231). Adjust `pack_burn` test to no longer assert `originDna`/`instanceDna`. |

**Estimated diff**: net negative — ~13 files, mostly deletions. Low risk because none of the touched code reaches the combat engine.

**Do not** start this cleanup before:
1. `nftlox-sdk` installed and a smoke `create_collection` works on testnet.
2. Replicate/merge fate decided (off-chain only / `mutableData` shadow / drop entirely).
3. Pack opening flow rewritten on top of `bulk_distribute` (the current `applyPackBurn` is the live pack opener — removing DNA from it is fine, removing it entirely is not until the NFTLox-mediated replacement works).

---

## What we still need from NFTLox

| Need | Status |
|---|---|
| Production protocol ID (currently `nftlox_testnet`) | Pending |
| Stable absolute image URL host for each asset (drives `imageHash`) | Pending |
| Test mint pass on testnet | Pending |

What we **don't** use: NFTLox marketplace, lending, multisig buy. We **do** use `data_operator_approve` + `set_data_from` (required to keep `level`/`xp`/`foil` writable only by Ragnarok admin).

---

## Integration points in our codebase

| File | Role |
|---|---|
| `replayEngine.ts` | Add `nftlox_testnet` (later `nftlox`) as second protocol filter alongside `ragnarok-cards` |
| `replayRules.ts` | Handlers for NFTLox `mint`, `bulk_distribute`, `transfer`, `burn`, `set_data`, `set_data_from` |
| `HiveSync.ts` | Adapter methods using `nftlox-sdk` builders; wire `seedTxId` provenance refs where applicable |
| `genesisAdmin.ts` | Replace custom genesis with NFTLox `create_collection` + `bulk` seed mints |
| `client/src/game/data/schemas/` | **Source of truth** — `immutableData` schema mirrors these primitives |

Total NFT supply at full mint: ~2.76M instances across ~2,134 seeds.

---

## Constraints to remember

- Hive `custom_json` hard cap: 8192 B; SDK enforces a safe budget of `SAFE_PAYLOAD_MAX_BYTES = 7372` (90%).
- Max 5 ops per Hive transaction → 2,134 seeds = ~427 signatures (~28 min full mint).
- `bulk_distribute`: max **50 distinct seeds** AND max **250 instances** per op.
- `bulk_transfer` / `bulk_burn`: max **50 ids** per op.
- 8 actions support optional `seedId` / `seedTxId` provenance attestation (`transfer`, `list`, `unlist`, `set_data`, `set_data_from`, `nft_transfer_from`, `nft_lend`, `nft_return`) — mismatch is rejected.
- Image URLs are stored in **wire form** (no `https://` prefix); `imageHash` is `sha256("nftlox:img:" + toWireUrl(url))`.

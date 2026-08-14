# Hive Indexer Contract

Status: current runtime contract for the server-side Ragnarok read model.

Activation is separate from replay capability: per
[`ADR 0007`](./adr/0007-p2p-gameplay-only-testnet.md), the current P2P testnet
does not emit `match_anchor` or `match_result`. The indexer may retain handlers
for future ranked settlement without making them part of the current match flow.

This document is the source of truth for what the server indexer reads from
Hive, how it decides an operation belongs to Ragnarok, which deterministic
validations it applies, and what evidence the API exposes.

The indexer is a replay-derived cache. Hive irreversible blocks are the source
of truth; `/api/chain/*` is a read surface over the derived projection.

## Authority Boundary

This is the only normative document for the live Ragnarok server indexer. Other
indexer documents in this repository are historical design notes unless they
link back here for the current runtime contract.

The Ragnarok indexer owns the replay-derived gameplay and economy projection:

- RUNE ledger credits, debits, caps, balances, and source keys.
- Eitr ledger credits, debits, balances, forge commits, and forge reveals.
- Pack purchase and exchange triggers, pack caps, pack burn/open outcomes, and
  deterministic pack RNG resolution.
- Campaign results, daily quest claims, reward claims, and their derived
  economy effects.
- Match anchors, final `match_result` operations, ranked ELO, Season Score
  inputs, and XP/level progression derived from valid match results.
- Queue state, slashed-account guards, replay evidence, and read-side ranking
  projections.

NFT custody is outside this indexer contract. NFTLox owns genesis NFT custody,
distribution, ownership, and transfer authority for NFTLox-enabled phases. The
Ragnarok indexer may keep compatibility ownership-like fields while Alfa uses a
JSON ownership source, or while it validates gameplay/economy operations, but
those fields are projections, not NFT custody authority.

Pack fulfillment crosses both systems: Ragnarok owns the pack trigger, quote,
RUNE/HBD payment validation, idempotency key, and deterministic RNG result;
NFTLox births or distributes the resolved NFT instances. See
[`adr/0002-state-authority-boundaries.md`](./adr/0002-state-authority-boundaries.md),
[`adr/0006-pack-fulfillment-and-hbd-sale-economy.md`](./adr/0006-pack-fulfillment-and-hbd-sale-economy.md),
and [`NFTLOX_INTEGRATION_SPEC.md`](./NFTLOX_INTEGRATION_SPEC.md).

XP and level are Ragnarok-derived gameplay progression. NFTLox `mutableData`
may mirror those values through an approved Ragnarok operator, but gameplay
validation must use Ragnarok replay when the value matters. See
[`adr/0003-instance-xp-ragnarok-derived-nftlox-mirrored.md`](./adr/0003-instance-xp-ragnarok-derived-nftlox-mirrored.md).

## Inputs From Hive

The indexer reads public Hive data only:

- `condenser_api.get_dynamic_global_properties` for `head_block_number` and
  `last_irreversible_block_num`.
- Block RPC mode: `condenser_api.get_ops_in_block(blockNum, false)`.
- Fast range mode: HafAH `/hafah-api/operations` with
  `operation-types=18`, which is Hive `custom_json`.

The current fast path expects HafAH at `https://api.hive.blog` by default. Not
all normal Hive RPC nodes expose `/hafah-api/operations`; keep
`RAGNAROK_HAF_ENDPOINTS` explicit when changing providers.

The sync target is conservative:

```text
syncTargetBlock = last_irreversible_block_num - PACK_ENTROPY_DELAY_BLOCKS
```

`PACK_ENTROPY_DELAY_BLOCKS` is currently `20`. This keeps entropy-dependent
operations, such as pack burns and forge reveals, away from reversible head
blocks.

## Cursor And State File

For a fresh JSON state file, the initial cursor is:

```text
RAGNAROK_INDEX_START_BLOCK - 1
```

For each runtime phase, configure the season date and index start block
together:

```env
VITE_SEASON_START=2026-06-14T23:28:54Z
RAGNAROK_SEASON_START=2026-06-14T23:28:54Z
VITE_RAGNAROK_INDEX_START_BLOCK=107278144
RAGNAROK_INDEX_START_BLOCK=107278144
```

`VITE_*` values expose the phase boundary to the browser and diagnostics.
`RAGNAROK_*` values are the server-side mirrors for split deployments and
operator runtimes. The start block is a bootstrap boundary, not a destructive
reset. If a state file already contains a higher
`lastIrreversibleBlockProcessed`, the loader keeps the higher persisted cursor.

State is one file per runtime phase. Examples:

- `data/chain-state.local.json`
- `data/chain-state.alfa-testnet.json`
- `data/chain-state.testnet.json`
- `data/chain-state.mainnet.json`

For Alfa, use:

```bash
pnpm run dev:alfa-testnet
```

That script points the server at `data/chain-state.alfa-testnet.json`. Plain
`pnpm run dev` is local and should not be used to inspect Alfa sync.

## Operation Selection

The indexer only applies Hive `custom_json` operations that pass the Ragnarok
selection contract.

Accepted custom_json ids:

- The active runtime protocol id, for example `rk_game_testnet` or
  `ragnarok-cards`.
- Legacy `rp_*` ids when the runtime allows legacy protocol ids.
- Legacy `ragnarok_level_up` when the runtime allows legacy protocol ids.

Ignored inputs:

- Malformed JSON.
- Unknown `custom_json` ids.
- Canonical protocol ids with no `action` field.
- Unknown canonical action names.
- Legacy `rp_team_submit`, which is informational only.
- Operations whose Hive authority level does not match the action class.

HafAH may return the operation type as `custom_json_operation`. The indexer
normalizes both `custom_json` and `custom_json_operation` into the same internal
shape before replay.

## Ordering

Replay order is block deterministic:

1. Blocks are processed monotonically from `cursor + 1` through
   `syncTargetBlock`.
2. Operations inside a block are sorted by `trx_in_block`, then `op_in_trx`,
   then `trx_id`.
3. A block cursor advances only after that block's relevant operations have
   been processed.
4. Rejected operations do not advance domain state, but the block cursor still
   advances after the block is fully inspected.

This means two indexers with the same runtime config and same Hive data should
derive the same projection.

## Replay Pipeline

Every selected operation follows the same pipeline:

```text
raw Hive op
  -> normalizeRawOp()
  -> shared/protocol-core applyOp()
  -> server StateAdapter
  -> chain-state JSON projection
```

Normalization happens before proof-of-work checks, signature checks, nonce
checks, ownership checks, and state mutation.

The server uses the same `shared/protocol-core` package as the browser replay
path. The server storage adapter is different, but the protocol handler is not.

## Validation Results

Each normalized operation resolves to one of three outcomes:

- `applied`: the operation passed validation and changed derived state.
- `rejected`: the operation is a Ragnarok operation, but failed a deterministic
  protocol rule. The indexer logs the action, broadcaster, block, and reason.
- `ignored`: the operation is not relevant, already applied, not yet eligible,
  or belongs to a no-op action.

Rejected operations are evidence: they explain why the chain event did not
enter the projection. Ignored operations are not necessarily errors.

## Validations Offered

The exact rule lives in `shared/protocol-core/apply.ts`. This section summarizes
the currently active classes of validation.

Common validation:

- Finality gate: operations beyond the current irreversible replay context are
  ignored.
- Runtime protocol id and legacy-id acceptance.
- Canonical action recognition.
- Posting-vs-Active authority class.
- Slashed-account guard for `match_anchor`, `match_result`,
  `campaign_result`, and `queue_join`.
- Idempotency and duplicate guards where handlers maintain deterministic keys.
- Monotonic nonce checks for account-scoped mutable flows.
- Supply cap checks for pack/reward/card mint paths.
- Ownership checks before transfer, burn, market, replicate, merge, and pack
  burn operations.
- Cooldown checks for transferable card and pack custody.

Admin validation:

- Admin-only operations require the configured admin account or configured
  operator account with an embedded admin Active approval.
- Admin approval verifies the current Hive Active key when the signature
  verifier is available.
- Admin approval nonces must advance monotonically.

Match validation:

- `match_anchor` requires proof of work and participant membership.
- `match_result` requires genesis, valid participants, broadcaster membership,
  monotonic nonce, proof of work, compact result hash integrity for compact
  payloads, ranked match anchor presence, pinned pubkeys, and dual anchored
  signatures for ranked settlement.
- Ranked settlement derives ELO, RUNE credit, and winner card XP from replayed
  data.

Campaign validation:

- Campaign id and ruleset hash must match the local campaign registry.
- Mission id, difficulty, prerequisites, nonce, transcript root, final state
  hash, and turn count are checked.
- Campaign seed, stars, progress, and first-clear rewards are derived
  deterministically.

Queue and reward validation:

- `queue_join` requires proof of work.
- `reward_claim` requires genesis, known reward id, unmet duplicate claim key,
  reward condition satisfaction, and reward supply availability.
- `daily_quest_claim` validates date/slot/idempotency and credits deterministic
  RUNE through the shared ledger path.

Card, pack, forge, and Eitr validation:

- `card_transfer` requires Active authority, existing card ownership,
  destination username validity, no self-transfer, cooldown, and optional nonce.
- `burn` requires owner, genesis card category, Eitr value, and matching genesis
  supply.
- `level_up` requires owner and rejects overclaim above the derived XP level.
- `pack_commit`/`pack_reveal` validate commit ownership, salt commitment,
  reveal deadline, irreversible entropy block id, and deterministic draw caps.
- `pack_burn` validates pack ownership, sealed state, irreversible entropy, and
  deterministic card draw against pack supply.
- `forge_commit` validates sealed genesis, rarity, Eitr balance, salt commit,
  and rarity supply.
- `forge_reveal` validates commit ownership, salt, deadline, entropy block id,
  and deterministic mint or refund.

Economy validation:

- RUNE ledger writes reject negative balance and emission-cap violations.
- `rune_exchange` requires sealed genesis, valid quote, sufficient RUNE,
  per-account redemption limits, and global pack caps.
- `pack_purchase` requires sealed genesis, valid HBD sale quote, global pack
  cap, and exact companion HBD payment when the companion transfer is available
  to the replay adapter.

DUAT validation:

- `duat_airdrop_claim` requires genesis, open claim window, no prior claim,
  snapshot entitlement, positive pack count, and any legacy payload counts must
  match the canonical snapshot.
- `duat_airdrop_finalize` requires admin authority and a closed claim window.

Marketplace validation:

- Listings and offers validate NFT existence, ownership, price, currency, and
  active/pending status.
- Buys and accepts validate companion payment sender, recipient, amount, and
  currency when the companion transfer is available to the replay adapter.

## No-Op Or Limited Areas

These are intentionally not claimed as full validation guarantees:

- `warband_request`, `warband_accept`, `warband_remove`, and `warband_block`
  are currently no-op/ignored in shared replay.
- `slash_evidence` is currently ignored by the handler; existing slashed-account
  state is enforced, but new slash evidence is not applied by this server
  indexer path yet.
- The server does not validate complete off-chain gameplay transcripts from
  IPFS or another external payload store during index replay.
- The server does not open Hive Keychain and does not sign gameplay actions.
- REST responses are not authority. They are read-model evidence over replayed
  Hive data.

## Companion Transfer Limitation

Some handlers validate a sibling `transfer` in the same Hive transaction:

- `pack_purchase`
- `pack_distribute`
- `pack_transfer`
- `market_buy`
- `market_accept`

The block RPC path can see non-`custom_json` siblings returned by
`get_ops_in_block`, so companion transfer validation is available there.

The current HafAH fast path queries `operation-types=18`, which returns
`custom_json` only. Therefore HAF-only catch-up cannot prove companion transfer
presence unless a future transfer ingestion path supplies those siblings. In
that mode, payment-backed operations may reject with a missing-payment reason
instead of being applied.

Do not document HAF range sync as full payment validation until transfer
ingestion is added to the fast path.

## Evidence Exposed By The API

`GET /api/chain/status` exposes:

- `lastIrreversibleBlockProcessed`
- `indexStartBlock`
- `headBlock`
- `irreversibleBlock`
- `syncTargetBlock`
- `blocksBehind`
- `progressBlocks`
- `progressTargetBlocks`
- `progressPercent`
- `stateFile`
- `stateFileConfigured`
- entity totals such as players, cards, matches, and known accounts

`GET /api/health` includes the same indexer health plus runtime evidence:

- network stage
- runtime phase
- protocol id
- reset epoch
- season start
- index start block
- state file evidence

The admin panel surfaces the same status so operators can see exactly which
file is active and how many blocks remain.

## Operational Verification

Use these checks before claiming the indexer contract is ready:

```bash
pnpm exec vitest run server/services/chainState.contract.test.ts shared/runtimeConfig.test.ts
pnpm run verify:alfa-runtime-env
pnpm run check
```

Runtime logs should show:

```text
[chainIndexer] Sync status cursor=..., target=..., lib=..., head=..., blocksBehind=..., mode=...
[chainIndexer] Processed ... ops across ... blocks, cursor=..., target=..., blocksBehind=..., rate=... blocks/s
```

For Alfa, the active state file should be:

```text
data/chain-state.alfa-testnet.json
```

and `/api/chain/status` should report `blocksBehind=0` when synchronized.

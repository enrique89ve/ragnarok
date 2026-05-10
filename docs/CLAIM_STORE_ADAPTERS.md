# Claim Store Adapters

Claims are replay-derived state. The canonical source remains the Hive op log and
the protocol replay rules; the store is a fast read model that can be rebuilt.

## Storage Roles

- Server JSON: temporary beta storage at `data/chain-state.json`, owned by
  `server/services/chainState.ts` and reached through `StateAdapter`.
- External DB: hot mutable read model for production latency. It should replace
  the JSON implementation behind the same adapter contract, not change protocol
  rules.
- IPFS: immutable snapshots, manifests, receipts, and checkpoints. Do not use it
  as the hot claim write path; gateway latency and propagation are not bounded
  enough for live claim UX.

## Current JSON Scope

The JSON state persists:

- reward claims
- DUAT airdrop claims
- campaign submissions and campaign progress
- RUNE ledger entries and token balances
- packs and pack supply

This is acceptable for beta because replay can rebuild the state and the JSON
file is only a local adapter. It is not the final scaling boundary.

## Restart And File Permissions

On server start, `chainIndexer` calls `loadState()` and rebuilds the in-memory
maps from the JSON file. During normal operation it flushes after each applied
scan batch and also has a 30s dirty-state flush. On `SIGINT` and `SIGTERM`, the
server stops the indexer and forces a final flush before exiting.

Default file path:

```text
data/chain-state.json
```

Override with:

```bash
RAGNAROK_CHAIN_STATE_FILE=/secure/path/chain-state.json npm run dev:testnet
```

The JSON adapter checks read/write/execute access to the target directory during
`startPersistence()`. It writes via `chain-state.json.tmp` and atomic rename,
with new files created as owner-readable/writable only (`0600`) and new
directories as `0700`.

Crash note: an OS crash or `SIGKILL` can still lose mutations made after the
last successful flush. The chain op log remains canonical, so the JSON read
model can be rebuilt.

## External DB Contract

Any DB adapter should preserve these properties:

- Idempotent writes by deterministic claim key.
- Atomic claim insert plus any derived ledger/pack state that belongs to the same
  replay operation.
- Fast point lookup for `(account, rewardId)` and source-key style ids.
- Append-only audit fields: `blockNum`, `trxId` when available, and source key.
- Rebuild path from the chain op log. The DB must be disposable cache, not a new
  source of truth.

Recommended hot-state candidates:

- Redis for very low-latency ephemeral beta indexing.
- Postgres for durable indexed claims and later analytics.
- SQLite/libSQL for simple single-node durable tests.

## Query Safety

Current server queries are in-memory map/array scans, so there is no SQL
injection surface in the JSON adapter. Public routes clamp `limit`/`offset`,
validate Hive usernames before account lookups, and cap read-triggered account
registration to avoid unbounded growth from arbitrary profile reads.

Queue state is treated as live-only state. Expired queue entries are pruned from
RAM and stale historical queue joins are not retained when replay catches up.

For production DB adapters, preserve the same constraints with parameterized
queries and indexes on:

- `(account, rewardId)` for reward claims
- `entryId` and `(seasonId, account, sourceType)` for RUNE ledger
- `owner` for cards and packs
- `claimKey`/source key for idempotency

## Benchmark And Regression

Use the claim store benchmark before choosing or tuning an adapter:

```bash
npm run bench:claim-store -- --adapter json --claims 2000 --reads 2000
```

The report is written to `.scratch/benchmarks/claim-store-*.json`.

Default beta budgets:

- write p95 <= 100ms
- read p95 <= 50ms
- flush p95 <= 250ms

The benchmark buckets write latency by claim count, computes p95 per bucket, and
fits a linear regression:

```text
latency_ms = intercept_ms + slope_ms_per_claim * claim_count
```

That gives an estimated claim count where the adapter will cross the configured
p95 threshold. The same regression is computed for flush latency. It is a sizing
signal, not a correctness proof; correctness still comes from replay tests.

## IPFS Checkpoints

For IPFS, publish compact immutable artifacts:

- claim snapshot chunk
- manifest with block range and state hash
- CID reference in an operator/index update

Clients can use IPFS to bootstrap or verify state, then continue against a hot
adapter or local replay cache.

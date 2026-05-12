# Current Plan: Chain Indexer + RUNE Read API

This file is intentionally short. The previous per-account polling plan was
superseded by the implemented block-complete server indexer.

## Current State

- Express mounts the public read-only chain surface at `/api/chain`.
- The server indexer scans irreversible Hive blocks with `get_ops_in_block` plus
  a LIB cursor.
- The indexer starts by default unless `ENABLE_CHAIN_INDEXER=false`.
- When the indexer is disabled, the server still loads persisted chain state for
  read APIs.
- Browser replay remains the verifier path; the server indexer is convenience,
  not authority.

## Canonical RUNE Reads

- `GET /api/chain/player/:username/rune?seasonId=S01`
- `GET /api/chain/rune/state?seasonId=S01`
- `GET /api/chain/rune/ledger?seasonId=S01&account=:username`
- `GET /api/chain/rune/balances?seasonId=S01`

Do not reintroduce `/api/testnet/rune/*`. Testnet is a runtime profile, not a
second API namespace.

## Active Limits

- Global `/api`: 120 requests/minute per IP.
- Sync-on-demand chain account reads: 24 requests/minute per IP in production.
- RUNE state/ledger/balances reads: 60 requests/minute per IP in production.
- UI background refresh for RUNE views should not run faster than once every 30
  seconds per browser view.

## Remaining Work

- Live Hive/Keychain smoke for RUNE claim/open pack.
- Local replay parity check after the live smoke.
- Season Score snapshot: final ELO plus capped RUNE bonus at season-end block.
- RUNE ledger/index cache before larger public scale.

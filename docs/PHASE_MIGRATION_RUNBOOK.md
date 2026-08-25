# Phase migration runbook

This operator procedure is explicit and non-destructive. It never promotes
local settlement or economy into Hive/canonical authority.

## Prerequisites

Use a maintenance window, `pnpm`, the exact runtime environment files, access
to `RAGNAROK_CHAIN_STATE_FILE`, and an operator-owned backup location. There is
no built-in browser export command in this repository; use the browser/platform
backup procedure only if your deployment provides one.

```sh
pnpm run verify:runtime-env
pnpm exec vitest run shared/protocolPhaseMigration.test.ts client/src/data/blockchain/replayDB.phaseMigration.test.ts server/services/chainState.contract.test.ts shared/runtimeConfig.test.ts
```

## 1. Capture fingerprint

Stop writes and record `stage`, `phaseId`, `protocolId`, `resetEpoch`,
`seasonStart`, `indexStartBlock` and the exact `representation` from runtime
evidence. A changed phase must use a new reset epoch. A process restart with the same
fingerprint is not a migration: do not rotate `VITE_RAGNAROK_RESET_EPOCH` /
`RAGNAROK_RESET_EPOCH` unless you intend to isolate a new namespace.

## 2. Back up

```sh
state_file="${RAGNAROK_CHAIN_STATE_FILE:?set RAGNAROK_CHAIN_STATE_FILE first}"
cp -- "$state_file" "$state_file.$(date +%Y%m%d%H%M%S).bak"
```

Back up the source browser/replay data using an approved platform procedure if
available. Do not delete the source and do not reuse an incompatible server
volume.

## 3. Dry-run

For a server JSON state that predates the active fingerprint, prepare an isolated
destination with the safe command below. It is dry-run by default and prints JSON;
the source remains byte-identical.

```sh
pnpm run prepare:chain-state-migration -- \
  --source "$RAGNAROK_CHAIN_STATE_FILE" \
  --destination "${RAGNAROK_CHAIN_STATE_FILE}.new" \
  --archive "${RAGNAROK_CHAIN_STATE_FILE}.archive"
```

The report includes the migration id, projection hash, source/target fingerprints
and discarded counts. A legacy source without a fingerprint is accepted only as
`legacy_unfingerprinted` for archive-and-reset; it cannot carry or promote any
state. To apply, repeat with `--apply --confirm <migrationId>` (or
the reported projection hash/fingerprint representation). Existing destination or
archive paths are rejected; the old file is copied to the explicit archive before
the fresh target is atomically created, and failures roll the archive back.
The command never copies RUNE, ELO, SeasonScore, CardXP, level-ups, market/packs,
NFT ownership, outbox or local settlement records. The archive is the recovery
evidence; after verification, configure `RAGNAROK_CHAIN_STATE_FILE` to the new
destination before starting the server. F1 local IndexedDB/replay economy is
never promoted into this server state.

Call `planProtocolPhaseMigration(from, to, inventory)`. Inventory counts must
be finite integers greater than or equal to zero. The deterministic result
contains `migrationId`, `projectionHash`, action totals and
`localEconomyPromoted:false`; invalid inventory, phase skips/regressions or an
unchanged reset epoch are rejected. Record it with the `phase_migrations`
adapter: same hash returns `already_applied`, a changed hash returns `conflict`.

## 4. Provision destination

- Carry preferences, accessibility and saved decks.
- Archive transcripts, campaign evidence and daily-quest evidence.
- Reset RUNE, ELO, SeasonScore, CardXP, level-ups, outbox, market, packs and
  ownership projections.
- Never promote local settlement/economy to Hive/canonical state.

Provision a new namespace and state path with a new `resetEpoch`, then start the
server. Reusing the old incompatible volume is expected to fail closed with
`fingerprint_mismatch` before Maps mutate.

## 5. Verify

Check the exported fingerprint, destination economy reset, carried preferences,
archived evidence and phase capability gates. Expected persistence outcomes are
`already_applied` for an identical report and `conflict` for a changed report;
never overwrite a conflict.

## 6. Rollback

Stop writes, restore the backed-up source state file to its original path only
after verifying its fingerprint, and restore the source namespace. Do not merge
destination RUNE/ELO/CardXP or ownership data into the source.

## Troubleshooting

- `fingerprint_mismatch`: stop; the volume or worker belongs to another phase.
- `already_applied`: the same migration id and projection hash were recorded.
- `conflict`: do not overwrite; regenerate the report from the actual inventory.
- Missing `verify:runtime-env`: validate the exact environment variables and
  run the focused migration/runtime test suite before rollout.

## Automation limit

The repository provides a pure phase planner, dry-run persistence adapter and the
explicit server chain-state preparation command above. The planner record still
does not execute browser carry/archive/reset; an operator must materialize those
actions with the approved backup, namespace and reset-epoch procedure above.

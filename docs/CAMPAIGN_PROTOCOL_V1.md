# Campaign Protocol V1

Campaign progress is derived from Hive `custom_json` operations, not from
client-local `completedMissions`. The public server read model is a convenience
surface: any compatible indexer should be able to derive the same state from
chain ops, the campaign registry hash, and deterministic replay.
The current server indexer selection and validation contract lives in
[`HIVE_INDEXER_CONTRACT.md`](./HIVE_INDEXER_CONTRACT.md).

## Operation

V1 introduces `rp_campaign_result`, normalized by `protocol-core` to
`campaign_result`.

Payload:

```json
{
  "v": 1,
  "cid": "war-of-pantheons",
  "m": "norse-1",
  "d": "normal",
  "n": 12,
  "rid": "local_run_id",
  "lst": 1736200000000,
  "rh": "ruleset_hash",
  "tr": "transcript_root",
  "tc": "ipfs://optional-transcript-cid",
  "fh": "final_state_hash",
  "t": 9
}
```

Field notes:

- `cid`: campaign id. V1 uses `war-of-pantheons`.
- `m`: mission id.
- `d`: `normal`, `heroic`, or `mythic`.
- `n`: campaign-specific monotonic nonce for the broadcaster.
- `rid`: local run id created when the mission starts in IndexedDB.
- `lst`: local run start timestamp in unix milliseconds.
- `rh`: campaign registry hash.
- `tr`: transcript Merkle root.
- `tc`: optional transcript CID.
- `fh`: final state hash.
- `t`: turn count. Stars are recalculated by the indexer.

The Hive broadcaster is the authoritative account. Payload usernames are not
trusted and are intentionally omitted.

## Seed

The campaign seed is derived by the indexer:

```txt
sha256(canonical({
  domain: "ragnarok:campaign:v1",
  account: op.broadcaster,
  campaignId,
  localRunId,
  localStartedAt,
  missionId,
  difficulty,
  nonce,
  rulesetHash
}))
```

This binds a result to the signing Hive account, campaign, mission,
difficulty, nonce, declared local run metadata, and campaign ruleset. `rid` and
`lst` are not proof that the run started at that time; they bind the published
result to a specific local run draft.

## V1 State

The testnet server persists derived campaign state in the runtime-specific
chain-state file, for example `data/chain-state.alfa-testnet.json`, through the
existing `StateAdapter` path:

- `campaignNonces`
- `campaignSubmissions`
- `campaignProgress`

`campaignSubmissions` records accepted `rp_campaign_result` envelopes. The apply
step marks the entry `consumed` immediately after writing the corresponding
progress record. The `queued` / `rejected` states are reserved for future
transcript-replay verification (Phase 2 / mainnet hardening); they are not
emitted by the current inline-validation path.

`campaignProgress` is the only final campaign state. `applyCampaignResult`
writes it inline after registry hash, mission, prerequisite, and nonce checks
pass, and credits first-clear RUNE in the same apply step via the
`campaign_first_clear` ledger source. Transcript-replay verification is
reserved for Phase 2 / mainnet hardening (see ADR 0004). Rewards and unlock
checks must read `campaignProgress`, not submission status.

## Local Run Ledger

The browser stores local run drafts in IndexedDB `campaign_runs`:

- `localRunId`
- `account`
- `campaignId`
- `missionId`
- `difficulty`
- `registryHash`
- `nonce`
- `localStartedAt`
- `status`: `started`, `won`, `published`, or `rejected`
- publication data such as `transcriptRoot`, `finalStateHash`, and `publishedTrxId`

This is a player-side journal. It is useful for retries, diagnostics, and
building `rp_campaign_result`, but it is not authoritative campaign progress.

## Rewards

`rp_campaign_result` itself credits first-clear RUNE in the same apply step
that writes `campaignProgress`. There is no separate `reward_claim campaign:*`
broadcast — a single chain op carries both the progression update and the
economic settlement.

For S01, the `campaign_first_clear` RUNE ledger credit uses source key
`campaign:S01:{account}:{campaignId}:{missionId}`. The credit is idempotent:
the same mission cannot credit RUNE twice for the same account, and campaign
RUNE remains capped by the season account and pool limits (10 RUNE/account
across all chapters). The per-mission reward table is
`runeEconomy.campaignStageRuneRewards` and is keyed by trailing mission
ordinal: missions `*-1`..`*-4` pay 2 RUNE, `*-5`..`*-6` pay 1 RUNE, and any
later mission ordinal is narrative-only (0 RUNE). Chapter mission counts are
narrative; only the first six ordinals across all chapters participate in the
campaign economy.

## Registry

The verification registry lives at:

```txt
shared/campaign/campaign-registry.v1.json
```

It intentionally contains only replay/progression-relevant mission data, not
narrative copy, music, visuals, or layout. The current canonical hash is exposed
by `shared/campaign/registry.ts`.

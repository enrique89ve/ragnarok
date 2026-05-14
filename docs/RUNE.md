## RUNE — quick reference

One stop for everything RUNE. Other docs link here; this file is authoritative for caps, source keys, endpoints, and code pointers.

## TL;DR

- Non-transferable, season-scoped, replay-derived from chain ops.
- Earned via P2P ranked wins and campaign first-clears. Spent via `rune_exchange` for packs.
- Each source has an independent per-account cap. **Campaign (10) and P2P (100) do NOT share quota** — same account can hold up to 10 + 100 = 110 RUNE/season.

## Caps (S01)

| Cap | Value | Scope |
|---|---|---|
| `totalCap` | 2,200,000 | Global emission |
| `p2pCap` | 2,000,000 | Global P2P pool |
| `campaignCap` | 200,000 | Global campaign pool |
| `maxP2PRunePerAccount` | 100 | P2P per-account, per season |
| `maxCampaignRunePerAccount` | 10 | Campaign per-account, per season |
| `maxRuneExchangeSpendPerOp` | 50 | Per `rune_exchange` op |
| `maxRuneScoreBonusInput` | 110 | Season Score formula clamp |

Constants live in [shared/protocol-core/runeEconomy.ts](../shared/protocol-core/runeEconomy.ts) `TESTNET_RUNE_ECONOMY`. The runtime values are the only truth — this table is a snapshot.

## Sources (credit ops)

| `sourceType` | Op | Per-clear | Source key | Notes |
|---|---|---|---|---|
| `p2p_ranked` | `match_result` (ranked) | win = 2, loss = 0 | `p2p:S01:{matchId}` | Loser RUNE credited via `TokenBalance` only, no ledger entry |
| `campaign_first_clear` | `campaign_result` | per ordinal table `[2,2,2,2,1,1]` | `campaign:S01:{account}:{cid}:{m}` | Only first clear ever pays; replays update best stats, not RUNE |
| `reward_claim` | `reward_claim` (generic) | per reward def | `reward:S01:{account}:{rewardId}` | Non-campaign rewards only — `reward_claim` campaign:* path was removed in [commit 00d48fb](../shared/protocol-core/apply.ts) |

## Sink (debit op)

| `sourceType` | Op | Source key | Notes |
|---|---|---|---|
| `rune_exchange` | `rune_exchange` | `pack:S01:{account}:{trxId}:{packType}:{quantity}` | Debits RUNE, delegates pack delivery to `RuneExchangeAdapter` |

## Campaign ordinal table

`runeEconomy.campaignStageRuneRewards: [2, 2, 2, 2, 1, 1]` — indexed by trailing mission ordinal:

- `*-1`..`*-4` → 2 RUNE each
- `*-5`..`*-6` → 1 RUNE each
- `*-7`+ → 0 RUNE (narrative only, progress still recorded)

Account cap is hit after roughly one full chapter's worth of paying missions (10 RUNE total). Mission count varies per chapter (norse/twilight 9, others 10) but is irrelevant economically — only the first six ordinals across all chapters pay.

## How a campaign clear becomes RUNE

Single broadcast, single apply step. No client-side claim button, no separate `reward_claim`.

```
client.publishCampaignVictoryResult(ctx, end)
  └→ hiveSync.broadcastCustomJson('rp_campaign_result', payload)
       └→ chain replay: applyCampaignResult(op, deps)
            ├ validate (registry hash, mission, prereqs, nonce, submission key)
            ├ putCampaignSubmission({ status: 'consumed' })
            ├ putCampaignProgress({ status: 'verified', merged best stats })
            └ applyCampaignFirstClearRuneCredit (only if first clear)
                 └ calculateCappedRuneCredit + putRuneLedgerEntryAndBalance
```

Validation order matters: a duplicate nonce returns `'ignored'` before any state mutates.

## How a P2P ranked win becomes RUNE

```
match_result (ranked) → applyRankedMatchSettlement → P2P RUNE credit
                                                     ├ source: p2p_ranked
                                                     └ key:    p2p:S01:{matchId}
```

Implementation: [shared/protocol-core/apply.ts](../shared/protocol-core/apply.ts) — search `'p2p_ranked'`.

## Read API

All read-only, derived from chain replay. There is no `/api/testnet/rune/*` namespace — testnet is a runtime profile.

- `GET /api/chain/player/:username/rune?seasonId=S01` — single account summary
- `GET /api/chain/rune/state?seasonId=S01` — global caps + emission totals
- `GET /api/chain/rune/ledger?seasonId=S01&account=:user&sourceType=:type` — paginated entries
- `GET /api/chain/rune/balances?seasonId=S01` — paginated per-account balance

Rate limits: 60 req/min per IP in production for `state`/`ledger`/`balances`. Refresh UI ≥30s apart.

## Where in code

| Concept | File |
|---|---|
| Constants + caps + ordinal table | [shared/protocol-core/runeEconomy.ts](../shared/protocol-core/runeEconomy.ts) |
| Apply ops + credit logic | [shared/protocol-core/apply.ts](../shared/protocol-core/apply.ts) |
| Ledger storage adapter (client) | [client/src/data/blockchain/clientStateAdapter.ts](../client/src/data/blockchain/clientStateAdapter.ts) |
| Ledger storage adapter (server) | [server/services/serverStateAdapter.ts](../server/services/serverStateAdapter.ts) |
| Client API | [client/src/data/runeAPI.ts](../client/src/data/runeAPI.ts) |
| Server routes | [server/routes/runeRoutes.ts](../server/routes/runeRoutes.ts) |
| Exchange adapter (server) | [server/services/runeExchangeAdapter.ts](../server/services/runeExchangeAdapter.ts) |

## Tests

- [shared/protocol-core/runeEconomy.test.ts](../shared/protocol-core/runeEconomy.test.ts) — table + cap math
- [shared/protocol-core/campaignResult.test.ts](../shared/protocol-core/campaignResult.test.ts) — 9 cases incl. account cap, broadcaster binding, P2P isolation
- [shared/protocol-core/replayTraces.test.ts](../shared/protocol-core/replayTraces.test.ts) — ranked match RUNE credit

## Non-goals

These are explicit non-goals of v1 and must not be implemented:

- RUNE transferable peer-to-peer.
- Eitr ↔ RUNE conversion.
- RUNE awarded by any op other than `match_result`, `campaign_result`, or `reward_claim`.
- Per-chapter caps separate from the account-wide campaign cap.
- Client-supplied RUNE amounts (chain computes from canonical state).
- A second `reward_claim campaign:*` path. Campaign credit happens inline in `applyCampaignResult` only.

## See also

- [TOKEN_AXIS.md](./TOKEN_AXIS.md) — RUNE in context with NFT / Eitr / DUAT axes
- [CAMPAIGN_PROTOCOL_V1.md](./CAMPAIGN_PROTOCOL_V1.md) — full campaign-result op shape
- [BETA_TESTNET_SCOPE.md](./BETA_TESTNET_SCOPE.md) — beta scope including RUNE participation
- [RAGNAROK_PROTOCOL_V1.md](./RAGNAROK_PROTOCOL_V1.md) — wire-level op canon
- [ADR 0001](./adr/0001-eitr-v1-canonical.md) — Eitr, the sibling token (non-goals around RUNE/Eitr conversion)

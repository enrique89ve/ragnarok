## RUNE — quick reference

One stop for everything RUNE. Other docs link here; this file is authoritative for caps, source keys, endpoints, and code pointers.

## TL;DR

- Non-transferable, season-scoped, replay-derived from chain ops.
- Earned via P2P ranked wins, campaign first-clears, and daily quests. Spent via `rune_exchange` for packs.
- Each source has an independent per-account cap. **P2P (100), campaign (10), and daily quest (20) do NOT share quota** — same account can hold up to 100 + 10 + 20 = 130 RUNE/season.
- P2P is canon-only in closed beta: the on-chain handler is wired but the client does **not** broadcast `match_result` until the winner-arbiter / ranking server lands (see [Beta status](#beta-status)). Closed-beta earn surface is **campaign (10) + daily quest (20) = 30 RUNE/season per account**.

## Beta status

| Source | Chain handler | Client broadcast | Closed beta |
|---|---|---|---|
| `p2p_ranked` | live (`applyRankedMatchSettlement`) | **stub** (no arbiter yet) | **deferred** |
| `campaign_first_clear` | live | live (`publishCampaignVictoryResult`) | active |
| `daily_quest_claim` | live | live (auto-claim on goal) | active |
| `reward_claim` (tournament) | live | tournament server pending | deferred |
| `rune_exchange` (sink) | live | live (pack purchase) | active |

The P2P broadcast stub lives in [client/src/game/match/modes/p2p/lifecycle.ts](../client/src/game/match/modes/p2p/lifecycle.ts) and will be wired once the arbiter can verify the winner from a signed transcript. Until then, P2P matches produce no RUNE on either side; canon emission caps stay declared so the cap structure is forward-compatible.

## Caps (S01)

| Cap | Value | Scope |
|---|---|---|
| `totalCap` | 2,600,000 | Global emission |
| `p2pCap` | 2,000,000 | Global P2P pool |
| `campaignCap` | 200,000 | Global campaign pool |
| `dailyQuestCap` | 400,000 | Global daily quest pool |
| `maxP2PRunePerAccount` | 100 | P2P per-account, per season |
| `maxCampaignRunePerAccount` | 10 | Campaign per-account, per season |
| `maxDailyQuestRunePerAccount` | 20 | Daily quest per-account, per season |
| `dailyQuestRunePerSlot` | 2 | Flat reward per completed slot |
| `dailyQuestSlotsPerDay` | 3 | Slots assigned per UTC day |
| `maxRuneExchangeSpendPerOp` | 50 | Per `rune_exchange` op |
| `maxRuneScoreBonusInput` | 130 | Season Score formula clamp |

Constants live in [shared/protocol-core/runeEconomy.ts](../shared/protocol-core/runeEconomy.ts) `TESTNET_RUNE_ECONOMY`. The runtime values are the only truth — this table is a snapshot.

## Sources (credit ops)

| `sourceType` | Op | Per-clear | Source key | Notes |
|---|---|---|---|---|
| `p2p_ranked` | `match_result` (ranked) | win = 2, loss = 0 | `p2p:S01:{matchId}` | Loser RUNE credited via `TokenBalance` only, no ledger entry |
| `campaign_first_clear` | `campaign_result` | per ordinal table `[2,2,2,2,1,1]` | `campaign:S01:{account}:{cid}:{m}` | Only first clear ever pays; replays update best stats, not RUNE |
| `daily_quest_claim` | `daily_quest_claim` | flat 2 RUNE/slot | `daily_quest:S01:{account}:{ymd_utc}:{slot}` | Auto-claimed on completion; chain trusts client (no match transcript); per-day cap = 3 slots × 2 RUNE = 6 RUNE; ymd_utc validated within ±48h of `op.timestamp` |
| `reward_claim` | `reward_claim` (generic) | per reward def | `reward:S01:{account}:{rewardId}` | Tournament rewards only (`first_victory`, `elo_*`, etc) — `reward_claim` campaign:* path was removed in [commit 00d48fb](../shared/protocol-core/apply.ts), `reward_claim` daily_quest:* path replaced by `daily_quest_claim` op |

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

## How a daily quest claim becomes RUNE

Single broadcast per slot, single apply step. The broadcast is **deferred**:
goal-completion happens mid-combat, but the chain op fires at a neutral moment
(match-end or daily-quest-panel mount) so a Keychain confirmation dialog does
not interrupt gameplay. No manual "Claim" button.

```
dailyQuestStore.updateProgress(type, delta)        ─ mid-combat
  └→ if (newProgress >= goal) set completed=true   (no broadcast yet)

flushDailyQuestClaimsAfterMatch()                  ─ at match-end OR panel mount
  └→ for each (completed && !claimed) quest:
       └→ getNFTBridge().claimDailyQuest(ymdUtc, slot, questType)
            └→ hiveSync.broadcastCustomJson('rp_daily_quest_claim', payload)
                 └→ chain replay: applyDailyQuestClaim(op, deps)
                      ├ parse payload (ymd_utc, slot, quest_type)
                      ├ validate ymd_utc within ±48h of op.timestamp
                      ├ idempotency by (account, ymd_utc, slot)
                      └ calculateCappedRuneCredit + putRuneLedgerEntryAndBalance
                           ├ source: daily_quest_claim
                           └ key:    daily_quest:S01:{account}:{ymd}:{slot}
       └→ on broadcast success: set claimed=true, emit "+N RUNE" toast
```

Visible state machine in the quest panel:
**in_progress** (gold) → **awaiting_claim** (amber, after goal hit) → **claimed** (emerald, after broadcast ack).

`quest_type` is informational only — chain does NOT vary reward by it. Daily
quest progress lives entirely client-side (event-bus subscribed), so a
verifiable per-quest-type reward would require match transcripts (deferred
to Phase 2 of ADR 0004). Flat reward removes spoof incentive.

Refresh boundary is UTC (`new Date().toISOString().slice(0,10)`); a local
clock shift cannot harvest extra quests because the chain idempotency key
uses the broadcast `ymd_utc` and rejects out-of-skew dates.

## How a P2P ranked win becomes RUNE

> **Closed-beta status:** the client does not yet broadcast `match_result`. The
> chain handler below is fully wired and tested; flipping the bit will require
> the winner-arbiter (post-beta scope).

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
- RUNE awarded by any op other than `match_result`, `campaign_result`, `daily_quest_claim`, or `reward_claim`.
- Per-chapter caps separate from the account-wide campaign cap.
- Client-supplied RUNE amounts (chain computes from canonical state — daily quest reward is the constant `dailyQuestRunePerSlot`, not a client-supplied number).
- A second `reward_claim campaign:*` path. Campaign credit happens inline in `applyCampaignResult` only.
- A second `reward_claim daily_quest:*` path. Daily quest credit happens in `applyDailyQuestClaim` only.
- Per-quest-type reward variance for `daily_quest_claim`. Chain cannot verify quest progress without match transcripts; varying reward by `quest_type` would let a client spoof the most-rewarding type on claim.

## See also

- [TOKEN_AXIS.md](./TOKEN_AXIS.md) — RUNE in context with NFT / Eitr / DUAT axes
- [CAMPAIGN_PROTOCOL_V1.md](./CAMPAIGN_PROTOCOL_V1.md) — full campaign-result op shape
- [BETA_TESTNET_SCOPE.md](./BETA_TESTNET_SCOPE.md) — beta scope including RUNE participation
- [RAGNAROK_PROTOCOL_V1.md](./RAGNAROK_PROTOCOL_V1.md) — wire-level op canon
- [ADR 0001](./adr/0001-eitr-v1-canonical.md) — Eitr, the sibling token (non-goals around RUNE/Eitr conversion)

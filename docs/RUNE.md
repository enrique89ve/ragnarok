## RUNE — quick reference

One stop for everything RUNE. Other docs link here; this file is authoritative for caps, source keys, endpoints, and code pointers.

## TL;DR

- Non-transferable, season-scoped, replay-derived from chain ops.
- Bank-ledger model: every ledger entry has one balance owner, and that owner is derived from the authenticated Hive broadcaster or from a dual-signed match envelope.
- Earned via P2P ranked wins, campaign first-clears, and daily quests. Spent via `rune_exchange` for packs.
- Each source has an independent per-account cap. **P2P (100), campaign (10), and daily quest (20) do NOT share quota** — same account can hold up to 100 + 10 + 20 = 130 RUNE/season.
- P2P is canon-only in closed beta: the on-chain handler is wired but the client does **not** broadcast `match_result` until the [winner-arbiter](./P2P_WINNER_ARBITER.md) / ranking server lands (see [Beta status](#beta-status)). Closed-beta earn surface is **campaign (10) + daily quest (20) = 30 RUNE/season per account**.
- QA full-catalog P2P may show a local projected reward after victory, but that preview is not RUNE until a replay-derived ledger entry exists.

## Bank-ledger anti-cheat contract

RUNE is not a smart-contract token and not a client wallet balance. It is a
reader-defined ledger over irreversible Hive ops. The protocol treats Hive as
the ordered event log and `protocol-core` as the interpreter.

Hard invariants:

- **Signer owns self-directed balance changes.** For `campaign_result`,
  `daily_quest_claim`, `reward_claim`, and `rune_exchange`, the RUNE balance
  owner is `op.broadcaster`. Payload account fields are ignored or invalid.
- **P2P is multi-party authority.** A ranked `match_result` may credit the
  winner only when the result references a prior dual-anchored `match_anchor`
  and is bound to the participants. The broadcaster alone is not enough to
  choose the RUNE owner.
- **Amounts are computed, never supplied.** The protocol computes credit/debit
  amounts from source type, season config, account, source key, and pack quote.
- **Ledger first, balance second.** Balance changes must go through a
  `RuneLedgerEntry` with `balanceBefore`/`balanceAfter`; scalar token balances
  are replay projections and drift-detection surfaces.
- **One economic event, one idempotency key.** Replays and retries are safe
  because every source key is deterministic and consumed once.
- **Caps are protocol rules.** Account caps, source-pool caps, active-balance
  caps, and total-emission caps are enforced during replay.
- **Reads are not authority.** `/api/chain/rune/*` and wallet displays are
  projections. Any disagreement with replay is a bug in the projection.

## Beta status

| Source | Chain handler | Client broadcast | Closed beta |
|---|---|---|---|
| `p2p_ranked` | live (`applyRankedMatchSettlement`) | **stub** (no arbiter yet) | **deferred** |
| `campaign_first_clear` | live | live (`publishCampaignVictoryResult`) | active |
| `daily_quest_claim` | live | live (explicit Claim button after goal) | active |
| `reward_claim` (tournament) | live | tournament server pending | deferred |
| `rune_exchange` (sink) | live | live (pack purchase) | active |

The P2P broadcast stub lives in [client/src/game/match/modes/p2p/lifecycle.ts](../client/src/game/match/modes/p2p/lifecycle.ts) and will be wired once the [winner-arbiter](./P2P_WINNER_ARBITER.md) can verify the winner from a signed transcript. Until then, P2P matches produce no RUNE on either side; canon emission caps stay declared so the cap structure is forward-compatible.

## QA full-catalog reward preview

QA Testnet Season 0 may calculate and display local reward feedback at P2P
game-over so testers can validate the future reward UX. The projected winner
RUNE should use the same current testnet season value as ranked P2P
(`TESTNET_RUNE_ECONOMY.p2pWinRune`, currently `2`), and local match/profile XP
should come from the P2P reward channel. This calculation is display/local
progress only.

It must not:

- write a `RuneLedgerEntry`;
- appear in `/api/chain/player/:username/rune`, `/api/chain/rune/state`,
  `/api/chain/rune/ledger`, or `/api/chain/rune/balances`;
- affect wallet balance, Season Score, ELO, caps, source keys, or prize
  eligibility;
- create CardXP, `level_up`, or NFTLox `mutableData` writes;
- survive a stage, protocol id, reset epoch, account, profile, or mainnet
  migration boundary.

Cache keys for this preview must include stage, protocol id, reset epoch,
account, and match id. On any mismatch, the UI must ignore or purge the preview
before rendering. Result-only evidence remains insufficient for `p2p_ranked`;
the economic path still starts at dual `match_anchor` plus a dual-signed,
deterministically replayable result.

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
| `p2p_ranked` | `match_result` (ranked) | win = 2, loss = 0 | `p2p:S01:{matchId}:{winner|loser}:{account}` | Match is consumed by prefix `p2p:S01:{matchId}:`; S01 loser reward is 0 so only the winner writes a ledger entry |
| `campaign_first_clear` | `campaign_result` | per ordinal table `[2,2,2,2,1,1]` | `campaign:S01:{account}:{cid}:{m}` | Only first clear ever pays; replays update best stats, not RUNE |
| `daily_quest_claim` | `daily_quest_claim` | flat 2 RUNE/slot | `daily_quest:S01:{account}:{ymd_utc}:{slot}` | Completed locally, then claimed from an explicit wallet action; chain trusts client (no match transcript); per-day cap = 3 slots × 2 RUNE = 6 RUNE; ymd_utc validated within ±48h of `op.timestamp` |
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

Single broadcast per slot, single apply step. Goal-completion happens mid-combat,
but the chain op only fires from an explicit client wallet action. Match-end,
panel mount, day refresh, and server reads must not open Keychain.

```
dailyQuestStore.updateProgress(type, delta)        ─ mid-combat
  └→ if (newProgress >= goal) set completed=true   (no broadcast yet)

DailyQuestPanel Claim button                       ─ explicit wallet invocation
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
**in_progress** (gold) → **awaiting_claim** (amber, after goal hit) → **claimed** (emerald, after explicit Claim broadcast ack).

### Local persistence

Progress lives entirely client-side in `localStorage['ragnarok-daily-quests:{account}']` (account-scoped via [accountScopedStorage](../client/src/lib/storage/accountScopedStorage.ts)). The dev server is not in the data path — claim broadcasts go directly from Hive Keychain to a Hive RPC node, and chain idempotency is the only authoritative arbiter. A server outage does not affect quest progress, claim broadcasts, or RUNE crediting; it only blocks wallet read endpoints (`/api/chain/rune/*`).

### Multi-device

The quest pick is deterministic. `pickRandomQuests` seeds a mulberry32 PRNG with `sha256("daily:{account}:{ymd_utc}")`, so the same account logged into two browsers on the same UTC day sees the **same three quests** (and the same replacement when one is rerolled). Without this, two browsers would draw uncorrelated sets and a "complete slot 0" on each device could fire two different `quest_type` claims for the same `(account, ymd_utc, slot)` — chain would reject the second as duplicate but the local UI on the second device would still show a misleading "+2 RUNE" toast. Determinism keeps the local state honest.

Progress and the `rerollsUsedToday` counter are still local-only and not synced across devices: each browser counts its own completions and gets its own daily reroll. The chain remains the single source of truth for what was actually credited.

### Midnight UTC rollover

At a UTC day change, `refreshIfNeeded` never opens Keychain. If a quest is still pending (not claimed yet, Keychain rejected, guest mode, network down), the rotation is **held** — the panel keeps yesterday's quest visible so the player can use the explicit Claim action. Holds last up to 2 days, matching the chain's `ymd_utc` acceptance window of ±48h; past that point the rotation force-completes to unblock the daily quest UI, accepting that the unclaimed quest can no longer be redeemed.

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
> the [winner-arbiter](./P2P_WINNER_ARBITER.md) (post-beta scope).

```
match_anchor (start) ─ pins participants, session pubkeys, deck hashes,
                       engine hash, registry hash, seed commitments
  └→ match_result (ranked, end) ─ dual-signed transcript settlement
       └→ applyRankedMatchSettlement
            └→ P2P RUNE credit
                 ├ source: p2p_ranked
                 └ key:    p2p:S01:{matchId}:winner:{winner}
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
- [ADR 0005](./adr/0005-rune-owner-signed-ledger-protocol.md) — RUNE owner-signed bank-ledger model

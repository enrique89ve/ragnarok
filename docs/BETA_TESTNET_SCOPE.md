# Beta-Testnet Scope

> Historical/reference document. The active readiness plan for the current
> Alfa Testnet to Closed Testnet Beta path is
> [`TESTNET_READINESS_FAST_TRACK.md`](./TESTNET_READINESS_FAST_TRACK.md).
> Keep this file for environment model, RUNE constraints, and older QA Season 0
> decisions, but do not use it as the current sprint plan.

## Objective

Validate Ragnarok's full shared architecture before mainnet: gameplay, P2P, match results, rewards, NFT ownership, packs, replay, indexing, and economy flows.

Beta-testnet state is temporary. Progress, rankings, rewards, packs, and NFTs created during testnet are reset before mainnet.

## Environment Model

| Stage | Purpose | Persistence | Economic risk |
|-------|---------|-------------|---------------|
| `local` | Private development, mocks, full catalog access, fast iteration. | Resettable. | None. |
| `testnet` | Shared beta network for real users and full architecture validation. | Resettable at beta wipe. | No permanent value. |
| `mainnet` | Production economy, final supply, permanent ownership. | Permanent. | Real. |

`VITE_NETWORK_STAGE` is the source of truth for the runtime profile:

- `local`: private development.
- `testnet`: shared resettable beta using Hive data and blockchain packaging.
- `mainnet`: permanent economic environment using Hive data and blockchain packaging.

`VITE_DATA_LAYER_MODE` is an advanced override for focused tests/debugging:

- `local`: browser/dev data.
- `test`: mock/test server data.
- `hive`: Hive L1 replay or indexed data.

Normal local/testnet/mainnet runs should not set `VITE_DATA_LAYER_MODE` or
`VITE_BLOCKCHAIN_PACKAGING`; both are derived from `VITE_NETWORK_STAGE`.

Network constants live in `shared/runtimeConfig.ts` and are consumed by both server and client wrappers. They define protocol namespace, collection id, admin/index accounts, indexer endpoints, art endpoints, NFTLox protocol id, reset epoch, and reset/economic policy per stage.

NFTLoX is phase-gated. Alfa and QA Season 0 run with JSON ownership unless an
operator intentionally sets `VITE_NFTLOX_PROTOCOL_ID` for a focused test.
Closed Beta must not open until the NFTLoX protocol id and collection proof are
both present.

The active frontend config is resolved once as `RAGNAROK_NETWORK_CONFIG`, so runtime consumers should import constants/helpers instead of rebuilding env-derived strings.

`VITE_RAGNAROK_RESET_EPOCH` is mandatory for shared resettable phases. It
separates IndexedDB, localStorage-backed stores, service-worker caches, action
logs, RUNE/DUAT projections, and deck state between QA Season 0, Closed Testnet
Beta, and later wipes. Do not reuse an epoch after a reset.

Operational startup lives in `docs/TESTNET_RUNBOOK.md`. The canonical testnet dev command is:

```bash
pnpm run dev:testnet
```

The expected testnet shape is mainnet-like:

- Same gameplay, replay, P2P and reward validation rules as mainnet.
- Different `custom_json` protocol id: `rk_game_testnet`.
- Different collection id.
- Different indexer and art endpoints when available.
- Different admin/index accounts when needed.
- Resettable state with no permanent economic value.

## Current Status — 2026-05-21

- Central network config exists in `shared/runtimeConfig.ts`, with client and server wrappers resolving from the same contract.
- Testnet protocol id is `rk_game_testnet`.
- Testnet collection id is `ragnarok-testnet`.
- Testnet reset epoch is `testnet-s01-2026-05-19` unless explicitly changed for
  a QA/beta wipe. QA Testnet Season 0 must use a `qa-s0-*` or
  `QA Season 0 / ...` epoch; Closed Testnet Beta must rotate to a non-QA
  epoch such as `closed-beta-*`.
- `pnpm run dev:testnet` starts the app with `.env.testnet`.
- The UI shows a persistent `TESTNET` header badge.
- The resettable testnet banner is dismissible.
- Client broadcasters and replay filters consume `RAGNAROK_APP_ID` / protocol constants instead of hardcoded testnet strings.
- Server/indexer protocol filters accept the configured protocol namespace through shared constants.
- P2P wire layer validated at the trust boundary: every inbound envelope passes through `parseWireMessage` (zod) before the bridge dispatch (TD-24a, 2026-05-05). The bridge no longer accepts unverified shapes.
- Per-command divergence detection uses WASM canonical state hashes for both wire paths: cards `game_command` envelopes carry `prevStateHash` over `computeStateHashSync` (TD-27c-cards, 2026-05-05), and chess `chess_command` envelopes carry a dual hash `prevChessStateHash` + `prevCardsStateHash` over canonical chess snapshot + cards GameState (TD-27c-chess, 2026-05-06). Domain-specific reject codes (`prev_chess_state_hash_mismatch` / `prev_cards_state_hash_mismatch`) localize forensics to the diverging slice.
- Periodic 2s `hash_check` beacon broadcasts both cards and chess hashes (TD-27c-chess F3, 2026-05-06); cross-peer divergence is detected per-envelope at move time and per-beacon while idle. Slash evidence trxIds carry `cards_` / `chess_` infix for slice attribution.
- Match modes are physically separated under `client/src/game/match/modes/{single,campaign,p2p}/` with ESLint-enforced isolation; gameplay routes split as `/game/single` and `/game/campaign`, while legacy `/game` redirects to `/game/single`.
- QA Season 0 slices 01-06 are closed: reset epoch, QA full-catalog
  entitlement, DUAT provenance/filter, ceremony feedback, RUNE/pack smoke, and
  campaign QA pass.
- P2P Season 0 is code-hardened and waiting on the real two-browser Hive
  Keychain smoke.
- P2P session-log exports now carry shared runtime evidence, including reset
  epoch and QA full-catalog state.
- `/api/health` and `/api/admin/config` expose `runtimePhase`,
  `qaFullCatalogEnabled`, `storageNamespace`, and the automated
  `closedBetaCutover` gate. A Closed Beta invite run should not proceed while
  `closedBetaCutover.inviteBlocked` is `true`.
- The Week One operator plan lives in
  [`TESTNET_WEEK_ONE_SPEC.md`](./TESTNET_WEEK_ONE_SPEC.md).

## Next Gate

Complete the QA Season 0 week-one readiness gate:

1. Start with a `qa-s0-*` reset epoch, not the default `testnet-s01-*` epoch.
2. Confirm `/api/health` reports testnet, `rk_game_testnet`, the QA epoch, and
   resettable mode. During QA Season 0, `runtime.runtimePhase` must be
   `qa-season-0` and `runtime.closedBetaCutover.inviteBlocked` should remain
   `true`.
3. Run the focused Season 0/P2P/RUNE verification matrix from
   [`TESTNET_WEEK_ONE_SPEC.md`](./TESTNET_WEEK_ONE_SPEC.md).
4. Complete the two-browser P2P Hive Keychain smoke from
   [`TESTNET_RUNBOOK.md`](./TESTNET_RUNBOOK.md#smoke-test--p2p-qa-season-0).
5. Keep Closed Testnet Beta invites blocked until issue 08 proves a non-QA
   `closed-beta-*` epoch, `qaFullCatalogEnabled: false`,
   the NFTLoX/starter/DUAT/RUNE ownership gates, and the explicit evidence env
   flags consumed by `closedBetaCutover`: `RAGNAROK_NFTLOX_COLLECTION_PROOF`,
   `RAGNAROK_HIVE_KEYCHAIN_SMOKE`, `RAGNAROK_P2P_TWO_BROWSER_SMOKE`, and
   `RAGNAROK_CLOSED_BETA_OPERATOR_SIGNOFF`. The final NFTLoX schema, tester
   cohort, and invite timing still require owner/operator sign-off.

## Beta Modes

- Single (PvE practice) — no reward.
- Campaign (PvE) — up to `10` first-clear RUNE per account/S01.
- Daily quests — up to `20` RUNE per account/S01 (`3` slots × `2` RUNE/slot per UTC day; auto-claimed on completion).
- Multiplayer P2P manual host/join — playable but **does not credit RUNE in closed beta**. The chain handler is live; client broadcast waits on the [winner-arbiter](./P2P_WINNER_ARBITER.md) (see [RUNE.md § Beta status](./RUNE.md#beta-status)).
- QA full-catalog P2P result preview — may calculate and show projected winner RUNE plus local match/profile XP for UX rehearsal. If stored after display, it must use reset-epoch-scoped local state. It is not RUNE, CardXP, NFTLox progress, Season Score, or ownership.
- Quick Match P2P as experimental matchmaking, not official ranked.

Active closed-beta earn surface: **campaign (max 10) + daily quest (max 20) = 30 RUNE per account, per season**. P2P ranked stays in canon and caps but emits 0 RUNE until the arbiter ships.

## Season Ranking

**Closed-beta gate:** ELO and the Season Score leaderboard go live once the
[winner-arbiter](./P2P_WINNER_ARBITER.md) is shipped and P2P `match_result`
broadcasts begin. Until then,
campaign + daily quest RUNE accrue normally but the public leaderboard stays
dark (no ranked match history to rank against). See
[RUNE.md § Beta status](./RUNE.md#beta-status).

The official S01 leaderboard is Season Score based. ELO is the dominant skill
component; capped RUNE contributes a smaller participation bonus so prize
contenders must play both ranked P2P and campaign.

Ranking source:

- Only verified ranked P2P `match_result` operations count for ELO.
- ELO is derived from match history with K=32.
- Casual, single, campaign, local, disputed, or unverified matches do not count.
- Queue-advertised ELO is never trusted; it is read from replay-derived state.

Score formula:

```txt
seasonRuneEarned = min(campaignRune, 10) + min(p2pRune, 100) + min(dailyQuestRune, 20)
runeScoreBonus = floor(min(seasonRuneEarned, 130) * 0.5)
seasonScore = finalElo + runeScoreBonus
```

S01 prize snapshot:

- Primary sort: `seasonScore` descending at the season-end block.
- Eligibility: at least `20` verified ranked matches and no unresolved dispute
  at snapshot time.
- Prize eligibility requires the account to earn the full `10` campaign RUNE.
- Max RUNE score bonus is `65`, so ELO remains the primary ranking force.
- Tiebreakers: final ELO, ranked wins, win rate, head-to-head where available,
  then fewer abandons/disconnects.
- Verifier/admin leaderboard snapshots are compact reads only; the final ranking
  must be reproducible from Hive `match_result` replay.

## Playtest RUNE Ledger

RUNE is active during beta as resettable playtest progression. It is not a
transferable token and it is not user-authored balance state.

For caps, source types, source keys, code pointers, and the full credit flow,
see [RUNE.md](./RUNE.md). This section restates the testnet-specific
constraints only.

RUNE payloads must never trust a client-supplied amount. The protocol computes
the amount from season config, source type, account, and source key. If an op
injects an amount or exceeds a cap, replay rejects it.

The balance owner is also derived, not accepted from client payloads. For
self-directed RUNE ops the owner is the authenticated Hive broadcaster; for
ranked P2P it is the winner or loser account proven by the dual-signed match
envelope. Ranked P2P must also reference a prior dual-anchored `match_anchor`;
there is no RUNE credit for result-only matches.

The canonical RUNE read endpoints (also listed in [RUNE.md](./RUNE.md)) live
under `/api/chain/rune/*` and `/api/chain/player/:username/rune`. Do not add or
document parallel `/api/testnet/rune/*` endpoints — testnet is a runtime
profile, not an API namespace.

QA full-catalog local reward previews must stay outside these endpoints and
outside wallet aggregation. If the UI shows `+2` projected P2P RUNE or local
match/profile XP after a QA match, the persistence key must include stage,
protocol id, reset epoch, account, and match id. A stage, epoch, account, or
profile change must make the preview unreadable before render. The value must
not be copied into RUNE ledger storage, NFT CardXP, NFTLox `mutableData`,
marketplace ownership, ELO, Season Score, or mainnet migration state.

Expected read cadence:

- Wallet/testnet panels may fetch `state`, the selected account summary, and the
  selected account ledger on open, reconnect, or manual refresh.
- Background refresh must not be faster than once every 30 seconds per browser
  view. Normal wallet usage should stay around 3-6 RUNE reads per minute.
- `/api/chain/player/:username/*` reads are not pure cache reads when the
  account is unknown; they may request a bounded server-side Hive scan. Do not
  call them from render loops or high-frequency UI effects.

Server-side limits:

- Global `/api` limit: 120 requests/minute per IP.
- On-demand chain sync reads (`/player/:username`, `/player/:username/rune`,
  `/player/:username/cards`, `/verify-deck`, `/register`): 24 requests/minute
  per IP in production, 90 in development.
- ELO lookup (`/player/:username/elo`): 60 requests/minute per IP in production,
  180 in development.
- RUNE state/ledger/balances reads: 60 requests/minute per IP in production,
  180 in development.

Season S01 hard caps:

- Total emission: `2_600_000` RUNE.
- P2P pool: `2_000_000` RUNE.
- Campaign pool: `200_000` RUNE.
- Daily quest pool: `400_000` RUNE.
- Campaign account cap: `10` RUNE per account per season.
- P2P account cap: `100` RUNE per account per season for the closed beta target
  of 20,000 accounts.
- Daily quest account cap: `20` RUNE per account per season.
- Starter pack claim: `1` per account.

Idempotency keys are mandatory:

- Campaign first-clear: `campaign:S01:{account}:{campaignId}:{missionId}`.
- P2P reward: `p2p:S01:{matchId}:{winner|loser}:{account}`; the match is
  consumed by prefix `p2p:S01:{matchId}:` so a conflicting winner cannot settle
  a second ledger entry.
- Reward claim: `reward:S01:{account}:{rewardId}`.
- Daily quest claim: `daily_quest:S01:{account}:{ymd_utc}:{slot}`.
- RUNE pack spend: `pack:S01:{account}:{trxId}:{packType}:{quantity}`.

Pack exchange limits:

- The RUNE ledger only validates the quote, records the debit, and enforces
  spend/account/global caps. Pack construction belongs to the exchange adapter
  for the current runtime.
- Standard pack: `2` RUNE.
- Premium pack: `7` RUNE.
- Mythic pack: `20` RUNE.
- Max RUNE spend per pack op: `50` RUNE.
- RUNE exchange limit per account/season: `5` standard, `3` premium,
  `5` mythic.
- Campaign-only target: full campaign cap (`10` RUNE) still buys exactly `1`
  standard + `1` premium pack, leaving `1` RUNE — preserves the original
  onboarding-pack guarantee.
- Casual target (no P2P): campaign + daily (`30` RUNE) buys `4` standard +
  `3` premium = `29` RUNE spent, `1` RUNE locked.
- P2P target: full P2P cap (`100` RUNE) still buys exactly `5` mythic packs.
- Active full target: full caps combined (`130` RUNE) buy `5` standard +
  `3` premium + `5` mythic = `131` RUNE; the per-account RUNE total is
  the binding constraint, not the pack limit.
- Global RUNE pack instance caps: `100_000` standard, `60_000` premium,
  `100_000` mythic.
- Pack quantities must be derived from `packType * quantity`; direct negative
  spends or direct card mints are invalid.

Beta HBD pack prices:

- Standard pack: `20.000 HBD`.
- Premium pack: `100.000 HBD`.
- Mythic pack: `250.000 HBD`.
- Source of truth: `HBD_PACK_SALE_SCENARIOS` and
  `ACTIVE_HBD_PACK_SALE_SCENARIO_KEY` in
  `shared/protocol-core/packCatalog.ts`.
- Frontend must display HBD prices through the shared HBD helpers; do not
  hardcode pack prices in React components.

Replay rejection/cap rules:

- Duplicate source key: ignored/idempotent.
- RUNE credit over account cap: credited only up to the remaining account cap.
- RUNE credit over season pool cap: credited only up to the remaining pool cap.
- Spend greater than balance: rejected.
- Spend greater than max per op: rejected.
- Unknown season, pack type, campaign id, mission id, or ruleset hash: rejected.
- Verifier/admin compact logs that disagree with replay: rejected.

## Not Permanent In Beta

- Permanent ranked rewards or mainnet prize state.
- Final genesis assets or supply.
- Mainnet reward claims.
- Production marketplace value.
- Irreversible production seal.
- QA full-catalog local reward previews, local match/profile XP, and any cache
  rows created only to rehearse the reward UX.

## Runtime Rules

- `local` can bypass shared-network checks for development speed.
- `testnet` should behave like a shared network: verify ownership, detect duplicate/conflicting results, and produce replayable evidence where possible.
- `mainnet` is the only economic environment.

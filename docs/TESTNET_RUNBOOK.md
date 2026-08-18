# Testnet Runbook

## Purpose

Run Ragnarok in a mainnet-like beta environment with a separate Hive namespace, collection id, accounts, and service endpoints. Testnet validates the full architecture but remains resettable.

For the current Alfa Testnet readiness order and the shortest path to Closed
Testnet Beta, use
[`TESTNET_READINESS_FAST_TRACK.md`](./TESTNET_READINESS_FAST_TRACK.md). This
runbook remains the command and smoke reference.

Current P2P testnet follows
[`ADR 0007`](./adr/0007-p2p-gameplay-only-testnet.md): Keychain may be used for
an explicit login before matchmaking, but a match must not request signatures
or broadcast `match_anchor`/`match_result`. Phase checkpoints use the existing
WebSocket relay and the terminal result is local evidence only.

For the one-week QA Testnet Season 0 operating script, use
[`TESTNET_WEEK_ONE_SPEC.md`](./TESTNET_WEEK_ONE_SPEC.md). That spec is the
day-by-day historical QA checklist.

## First Setup

Create the local testnet env file:

```bash
cp .env.testnet.example .env.testnet
```

Required values for the current profile:

```env
VITE_NETWORK_STAGE=testnet
VITE_RAGNAROK_PROTOCOL_ID=rk_game_testnet
VITE_RAGNAROK_COLLECTION_ID=ragnarok-testnet
VITE_RAGNAROK_RESET_EPOCH=testnet-s01-2026-05-19
VITE_RAGNAROK_ADMIN_ACCOUNT=ragnarok-test
VITE_RAGNAROK_ADMIN_OPERATOR_ACCOUNT=ragnarok-test-operator
```

NFTLoX is not required for Alfa or QA Season 0. Keep
`VITE_NFTLOX_PROTOCOL_ID` unset until the Closed Beta collection proof exists.

For QA Testnet Season 0, rotate the reset epoch to a `qa-s0-*` value before
testers start, for example:

```env
VITE_RAGNAROK_RESET_EPOCH=qa-s0-2026-05-21
```

The default `testnet-s01-*` example is not enough for the QA full-catalog
rehearsal because it intentionally keeps `qaFullCatalogEnabled=false`.

`VITE_NETWORK_STAGE=testnet` derives Hive data mode and blockchain packaging.
Do not set `VITE_DATA_LAYER_MODE` or `VITE_BLOCKCHAIN_PACKAGING` for normal
testnet runs.

`VITE_RAGNAROK_RESET_EPOCH` is the browser/server projection boundary for a
resettable phase. Change it when opening QA Testnet Season 0, Closed Testnet
Beta, or any wipe so old IndexedDB, localStorage, service-worker caches, RUNE
ledger projections, DUAT claims, decks, and QA local reward previews cannot
bleed into the new phase.
Each reset epoch must also carry explicit phase boundaries:

```env
VITE_SEASON_START=2026-06-14T23:28:54Z
RAGNAROK_SEASON_START=2026-06-14T23:28:54Z
VITE_RAGNAROK_INDEX_START_BLOCK=109016418
RAGNAROK_INDEX_START_BLOCK=109016418
```

The `VITE_*` values expose the intended phase contract to browser/admin
diagnostics. The server-side `RAGNAROK_SEASON_START` and
`RAGNAROK_INDEX_START_BLOCK` are mirrors for operator/runtime processes. Keep
each mirror equal to its `VITE_*` value unless a split deployment has a
documented reason to expose one boundary and operate another.

The indexer reads irreversible Hive operations, filters Ragnarok
`custom_json`, and applies the deterministic validation contract documented in
[`HIVE_INDEXER_CONTRACT.md`](./HIVE_INDEXER_CONTRACT.md). Use
`GET /api/chain/status` to inspect `stateFile`, `indexStartBlock`,
`syncTargetBlock`, `blocksBehind`, and `progressPercent`.
Use a `qa-s0-*` or `QA Season 0 / ...` reset epoch only for the QA full-catalog
rehearsal. Closed Testnet Beta must rotate to a different epoch such as
`closed-beta-*`, which disables the `qa_full_catalog` deck entitlement and
returns verification to starter, NFT custody, and replay-derived acquisition.
Alfa Testnet must use an `alfa-testnet-*` reset epoch. It is a temporary
production-hosted testnet alias for finding Dokploy, SSL, Cloudflare, WebSocket,
and JSON-state failures with full NFT mechanics. It still keeps
`VITE_NETWORK_STAGE=testnet`, uses `rk_game_testnet`, disables QA full-catalog
access, keeps RUNE/P2P active, and differs from later Beta Testnet only in the
NFT ownership source: JSON-backed provenance projection now, NFTLox custody
after the collection proof exists.
QA reward preview caches must include at least stage, protocol id, reset epoch,
account, and match id in their key; on stage/epoch/account mismatch they must be
ignored or purged before UI render.

Hive private keys are server/operator-only. Never put posting, active, owner,
memo, or WIF keys in a `VITE_*` variable; `VITE_*` is bundled into browser code.
Public `VITE_*` values may include network stage, protocol ids, collection ids,
Hive account names, and public endpoints. Admin panel login requires the
frontend admin account to sign a custom_json-shaped login payload with Keychain
Posting authority; that payload is verified by the server but not broadcast to
Hive. Private admin operations use the `/api/admin/multisig/*` flow: Keychain
signs the prepared Hive transaction with admin Active authority, then the server
adds the operator Active signature from `RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY` and
broadcasts. Treasury is payments-only. Do not put credentials in public URLs.
See [`ENV_SECURITY.md`](ENV_SECURITY.md) for the canonical key-placement rules.

Indexer and art endpoints can stay empty until those services are deployed:

```env
VITE_RAGNAROK_INDEXER_URL=
VITE_RAGNAROK_ART_INDEXER_URL=
```

## Start Testnet

```bash
pnpm run dev:testnet
```

`dev:testnet` loads `.env` first and then `.env.testnet` with testnet taking
priority. If both files set `VITE_NETWORK_STAGE`, the explicit `--mode testnet`
profile wins.

For local Alfa diagnostics, use the explicit Alfa script instead:

```bash
pnpm run dev:alfa-testnet
```

`dev:alfa-testnet` sets the same season boundary defaults as Dokploy and uses
`data/chain-state.alfa-testnet.json` unless `RAGNAROK_CHAIN_STATE_FILE` is
overridden. `pnpm run dev` remains local-only and should not be used to inspect
Alfa sync state.

Expected UI signals:

- Header shows `TESTNET`.
- Dismissible lower-left banner shows `Testnet / Resettable / rk_game_testnet`.
- `GET /api/health` reports `runtime.stage: "testnet"` and
  `runtime.protocolId: "rk_game_testnet"` plus the active reset epoch.

The header badge remains visible after dismissing the lower-left banner.

## Alfa Testnet Production Profile

For the one-week Dokploy-hosted Alfa Testnet profile:

```bash
cp .env.alfa-testnet.example .env.alfa-testnet
pnpm run build:alfa-testnet
pnpm run start:alfa-testnet
```

The Alfa Docker image already bakes the public profile
(`VITE_NETWORK_STAGE=testnet`, `rk_game_testnet`, `alfa-testnet-*` epoch,
JSON state file). Dokploy only needs:

```env
P2P_CHALLENGE_SIGNING_SECRET=<64-hex-chars>
```

See [`DOKPLOY_DEPLOYMENT.md`](./DOKPLOY_DEPLOYMENT.md) for the baked list and
optional operator keys.

Expected Alfa signals:

- Product copy says `Alfa Practice` or equivalent Practice/Alfa wording.
- Diagnostics still report `runtime.stage: "testnet"`.
- `GET /api/health` and `GET /api/admin/config` report
  `runtimePhase: "alfa-testnet"`, an `alfa-testnet-*` reset epoch,
  `qaFullCatalogEnabled: false`, `resettable: true`, `economic: false`, and
  JSON state evidence.
- `GET /api/admin/p2p/status` reports `challengeSigning.source: "env"` in
  Dokploy/shared environments; `process-fallback` is acceptable only for
  private local/dev runs.
- Alfa is not mainnet acceptance and does not open Beta Testnet invites by
  itself.

For a low-risk local runtime sanity check that does not start the chain indexer
or checkpoint publisher, use an ephemeral port and explicit QA epoch:

```bash
PORT=5010 \
VITE_NETWORK_STAGE=testnet \
VITE_RAGNAROK_PROTOCOL_ID=rk_game_testnet \
VITE_RAGNAROK_COLLECTION_ID=ragnarok-testnet \
VITE_RAGNAROK_RESET_EPOCH=qa-s0-2026-05-21 \
ENABLE_CHAIN_INDEXER=false \
ENABLE_INDEX_CHECKPOINT_PUBLISHER=false \
./node_modules/.bin/tsx server/index.ts --mode testnet-safe
```

Then verify:

```bash
node -e "fetch('http://127.0.0.1:5010/api/health').then(r=>r.json()).then(j=>console.log(JSON.stringify(j.runtime,null,2)))"
```

## Chain Read API

Testnet uses the same public chain-derived API namespace as every other
runtime profile. Do not use or reintroduce `/api/testnet/rune/*`.

- `GET /api/chain/player/:username/rune?seasonId=S01` returns one account's
  RUNE balance, credits, debits, drift, last RUNE block, and indexed flag.
- `GET /api/chain/rune/state?seasonId=S01` returns global RUNE caps, emission
  totals, and drift.
- `GET /api/chain/rune/ledger?seasonId=S01&account=:username` returns
  paginated RUNE ledger entries.
- `GET /api/chain/rune/balances?seasonId=S01` returns paginated account balance
  summaries.

Expected cadence: wallet/testnet panels may request `state`, account summary,
and ledger together on open or manual refresh. Background refresh must not run
faster than once every 30 seconds per browser view.

Production rate limits are 24 requests/minute per IP for chain reads that may
sync unknown accounts, 60 requests/minute per IP for RUNE state/ledger/balances,
and 120 requests/minute per IP for the global `/api` limiter.

## Smoke Test — Testnet Configuration (Gate 5)

1. Open the app at the dev server URL.
2. Confirm the testnet badge is visible.
3. Connect Hive Keychain.
4. If validating Hive write configuration separately from gameplay, explicitly
   broadcast a low-risk pre-match operation such as queue join/leave.
5. Confirm the Hive `custom_json` id is `rk_game_testnet`.
6. Confirm the JSON body has a canonical protocol `action` such as
   `queue_join` or `queue_leave`. If Keychain shows `match_anchor` or
   `match_result` during the gameplay-only track, cancel it and record a blocker.
   If Keychain shows `save_state`, cancel the prompt; portable saves must not be broadcast under
   `rk_game_testnet`.
7. Confirm client replay reads the same namespace.

Passing this smoke test closes the testnet configuration gate and opens the next roadmap block: gameplay/P2P validation under the testnet namespace.

## Quick Manual Checklist — Ceremony Feedback

Run once per QA reset epoch. For every ceremony, use the visible Evidence
button and confirm the JSON includes `runtime.resetEpoch`,
`runtime.protocolId`, `runtime.qaFullCatalogEnabled`, the active account, and
recent ceremony/session events.

1. Open `/#/packs` with a fresh account and claim the starter line. Confirm the
   copy says starter/birthright only and does not mention DUAT, NFT custody, or
   QA full-catalog access.
2. Open the DUAT airdrop surface from `/#/packs` or the wallet claim entry.
   Confirm eligible, ineligible, pending, and claimed states stay labeled as
   DUAT airdrop provenance only.
3. After DUAT replay creates sealed packs, open one from `/#/packs`. Confirm the
   reveal labels the source as DUAT and the result inspection can export
   evidence.
4. Complete a daily quest, use its Claim action, then click Claim again after it
   is already claimed. Confirm the panel shows earned RUNE and the
   already-claimed/idempotent state.
5. Clear a campaign mission for the first time, then replay the same mission.
   Confirm the first clear shows the configured RUNE preview/result and the
   replay says no new RUNE.
6. Open `/#/marketplace?tab=packs`, exchange RUNE for a pack, then open that
   sealed RUNE pack from `/#/packs`. Confirm spend, rejection/failure, indexing,
   confirmed, and reveal states are distinguishable from DUAT and HBD packs.

## Smoke Test — RUNE Rewards and Pack Flow

Run once per QA reset epoch after the configuration gate passes. This smoke uses
only replay-derived RUNE and the public `/api/chain/*` read model; do not edit a
wallet balance, seed a parallel API, or use `/api/testnet/rune/*`.

1. Confirm `GET /api/health` reports `runtime.protocolId: "rk_game_testnet"`
   and the active `runtime.resetEpoch`.
2. Claim one daily quest slot. Record the `custom_json` id, transaction id,
   `daily_quest:S01:<account>:<ymd_utc>:<slot>` source key, and the
   `/api/chain/rune/ledger?account=<account>&sourceType=daily_quest_claim`
   entry.
3. Claim the same daily quest slot again. Confirm replay ignores or no-ops the
   duplicate and the account balance does not increase.
4. Clear a campaign mission for the first time, then replay the same mission.
   Confirm only the first clear creates a
   `campaign:S01:<account>:<campaign_id>:<mission_id>` ledger credit.
5. Exchange RUNE for a standard pack from `/#/marketplace?tab=packs`. Confirm a
   `rune_exchange` debit exists with a
   `pack:S01:<account>:<trx_id>:<pack_type>:<quantity>` source key.
6. Open the sealed RUNE pack from `/#/packs`. Confirm the pack burn removes the
   sealed pack and produces replay-visible card results tied to the burn
   transaction.
7. Attempt a RUNE pack exchange from an account with insufficient balance.
   Confirm the failure is reportable and no pack or debit ledger entry appears.
8. As an offline replay/fixture validation only, feed ranked result-only evidence
   without a prior dual-anchored `match_anchor`. Do not sign or broadcast it.
   Confirm replay rejects it and no `p2p_ranked` RUNE ledger entry appears.
9. Compare `/api/chain/player/<account>/rune?seasonId=S01` with
   `/api/chain/rune/ledger?seasonId=S01&account=<account>`: credits minus debits
   must equal `runeBalance`, and `drift` must be `0`.
10. Export ceremony evidence for the daily quest, campaign reward, RUNE
    exchange, and RUNE pack opening. The JSON should include the account,
    `custom_json` id, source keys, reset epoch, and relevant ledger entries.

## Smoke Test — Campaign QA Season 0

Run once per QA reset epoch with `qa_full_catalog` enabled. This smoke validates
campaign mechanics coverage only; it does not validate NFT custody, marketplace
ownership, CardXP, or ranked economy proof.

1. Confirm `GET /api/health` reports `runtime.stage: "testnet"`,
   `runtime.protocolId: "rk_game_testnet"`, and the active QA reset epoch.
2. In `/#/warband?mode=single`, build at least one 30-card hero loadout for
   campaign testing using non-starter QA Access cards. The deck may verify through
   `qa_full_catalog`, but verified cards must remain non-transferable and
   `earnsCardXp: false`.
3. Start a campaign mission from `/#/campaign`. Record the local run id from
   the campaign evidence export when available.
4. Win one configured reward-paying first-clear mission. Confirm
   `rp_campaign_result` is broadcast under `rk_game_testnet` and replay creates
   one `campaign_first_clear` RUNE credit with source key
   `campaign:S01:<account>:<campaign_id>:<mission_id>`.
5. Replay the same mission. Confirm progress may update best turns/stars, but
   the RUNE balance and `campaign_first_clear` ledger count do not increase.
6. Clear or replay a non-paying/narrative mission. Confirm campaign progress is
   visible after sync even when no RUNE ledger entry is created.
7. Submit or replay an invalid campaign result, such as a mission with unmet
   prerequisites or mismatched registry hash. Confirm it is rejected and creates
   no campaign progress or RUNE ledger entry.
8. Export campaign reward evidence from the briefing and game-over result. The
   JSON must include `runtime.resetEpoch`, `campaignId`, `missionId`,
   `localRunId` when available, difficulty, result/turn count when available,
   and reward evidence (`status`, preview RUNE, transaction id or error).
9. Confirm the campaign evidence and collection UI do not describe QA Access
   as NFT ownership, DUAT provenance, marketplace value, or CardXP eligibility.

## Smoke Test — P2P QA Season 0

Run once per QA reset epoch with two browser profiles and two Hive testnet
identities. This smoke validates the networked peer path only; do not use
campaign/local AI behavior as proof for P2P.

1. Confirm both profiles report `runtime.stage: "testnet"`,
   `runtime.protocolId: "rk_game_testnet"`, and the same QA reset epoch.
2. Connect Hive Keychain in both profiles before opening multiplayer. The P2P
   screen should block matchmaking/manual peer links until a Hive session is
   present in shared-network runtime.
3. In each profile, build complete 30-card loadouts for queen, rook, bishop,
   and knight using at least one non-starter QA Access card from
   `/#/warband?mode=multiplayer`. Confirming the Warband continues into
   `/#/multiplayer`; the wire `deck_verify` message must use
   `protocolVersion: 2` and `claims[]` only.
4. Start one manual or quick match. Confirm the existing pre-match login/session
   gate passes without a new `session_authorize` prompt and the board renders
   with the announced armies.
5. Make at least one quiet chess move from each side. Record any
   `chess_command_rejected` event, reject code, command id, or state-hash
   prefix from the P2P session log instead of guessing.
6. Force an instant capture and then a non-instant capture into poker/combat.
   Confirm both peers receive the `chess → poker_combat` checkpoint commit,
   apply the same poker decision sequence, and receive the
   `poker_combat → chess` commit before returning to the shared chess board.
7. Disconnect one tab briefly without reloading it. Confirm the visible P2P
   badge enters grace/reconnect state, queued actions stay visible when
   applicable, and the same match resumes inside the current reconnect policy.
8. Attempt a hard reload during an active match and cancel the browser prompt.
   Use the P2P badge download button to export the session log; confirm it
   includes `p2p_reload_guard_prompted`.
9. Finish or technically resolve the match. Confirm both peers receive the
   terminal checkpoint commit and see an explicit local win/loss/draw result.
   In QA full-catalog mode the result may calculate and
   show local reward feedback (projected winner RUNE and match/profile XP), but
   it must be labeled local/resettable and must not say it was credited on
   chain.
10. Confirm QA cards do not earn CardXP: no `level_up`, no NFTLox
    `mutableData` write, no marketplace ownership change, and no Season Score
    input is created from the QA result.
11. Confirm the match caused no Keychain prompt, `match_anchor`, `match_result`,
    `session_renewal` or Hive broadcast. Confirm no `p2p_ranked` RUNE ledger,
    ELO, Season Score or CardXP mutation appears for either account. Ranked
    settlement remains deferred in
    [`P2P_WINNER_ARBITER.md`](./P2P_WINNER_ARBITER.md).
12. Open wallet/RUNE reads and collection/NFT details for both accounts. Confirm
    the QA preview amount is absent from `/api/chain/player/:account/rune`,
    `/api/chain/rune/ledger`, NFT CardXP, and NFTLox ownership/progress views.
13. Rotate to a non-QA reset epoch or a mainnet profile. Confirm the previous QA
    preview does not appear in result history, wallet balance, collection, or
    matchmaking/ranking surfaces.

## Smoke Test — Closed Beta Cutover Gate

Run before inviting the first Closed Testnet Beta cohort. This gate is not a
replacement for owner/operator sign-off; it only proves that the active runtime
is no longer the QA full-catalog rehearsal.

Start a closed-beta testnet runtime on an isolated port:

```bash
PORT=5011 \
VITE_NETWORK_STAGE=testnet \
VITE_RAGNAROK_PROTOCOL_ID=rk_game_testnet \
VITE_RAGNAROK_COLLECTION_ID=ragnarok-testnet \
VITE_RAGNAROK_RESET_EPOCH=closed-beta-2026-06 \
VITE_NFTLOX_PROTOCOL_ID=nftlox_testnet \
RAGNAROK_NFTLOX_COLLECTION_PROOF=verified \
RAGNAROK_HIVE_KEYCHAIN_SMOKE=passed \
RAGNAROK_P2P_TWO_BROWSER_SMOKE=passed \
RAGNAROK_CLOSED_BETA_OPERATOR_SIGNOFF=approved \
ENABLE_CHAIN_INDEXER=false \
ENABLE_INDEX_CHECKPOINT_PUBLISHER=false \
./node_modules/.bin/tsx server/index.ts --mode testnet-safe
```

Then verify the runtime gate:

```bash
node -e "fetch('http://127.0.0.1:5011/api/health').then(r=>r.json()).then(j=>console.log(JSON.stringify({phase:j.runtime.runtimePhase,qa:j.runtime.qaFullCatalogEnabled,blocked:j.runtime.closedBetaCutover.inviteBlocked,blockers:j.runtime.closedBetaCutover.blockerIds,signoff:j.runtime.closedBetaCutover.operatorSignoffRequired},null,2)))"
```

Expected automated result:

- `phase` is `"closed-beta"`.
- `qa` is `false`.
- `blocked` is `false`.
- `blockers` is `[]`.
- `signoff` is `false`.

If any blocker appears, do not invite testers. Common blockers are a QA reset
epoch, missing collection id, missing NFTLoX protocol id, a non-testnet /
economic profile, missing NFTLoX collection proof, missing Hive/Keychain smoke,
missing two-browser P2P smoke, or missing operator sign-off.

Operator UI check:

1. Open `/#/admin` as the configured admin account.
2. Confirm the header/status panel shows the active phase, reset epoch, QA
   catalog disabled, NFTLoX protocol id, and Closed Beta cutover checks.
3. Confirm the admin panel still requires the normal admin session and
   multisig/operator configuration.

Ownership smoke for the same epoch:

1. Run `pnpm exec vitest run shared/runtimeConfig.test.ts client/src/data/blockchain/deckVerification.test.ts`.
2. Confirm starter cards still verify for every account.
3. Confirm a non-starter genesis card without `nft_id` is rejected.
4. Confirm QA full-catalog cards from a previous `qa-s0-*` epoch are not
   accepted under the `closed-beta-*` epoch.
5. Confirm DUAT and RUNE pack cards are playable only after replay/custody
   evidence exists for that account.

Final invite approval remains HITL: record the NFTLoX collection/schema proof,
starter/DUAT/RUNE pack evidence, tester cohort, and invite timing before
opening access.

## Local/Mainnet Profile Commands

Local private development uses the default local profile:

```bash
pnpm run dev
```

Mainnet smoke/deployment uses the explicit mainnet profile:

```bash
cp .env.mainnet.example .env.mainnet
pnpm run dev:mainnet      # local smoke with mainnet runtime constants
pnpm run build:mainnet    # production browser bundle with mainnet constants
pnpm run start:mainnet    # run the built server with .env.mainnet
```

Do not use `pnpm run dev:mainnet` as a shortcut for beta testing; testnet must
stay on `pnpm run dev:testnet` so broadcasts use `rk_game_testnet`.

## Smoke Test — Local Single (Gate 2)

Validates that a single-player practice match runs end-to-end on the local stack: `/#/warband?mode=single` -> `/#/game/single` -> chess phase -> combat (cards) phase -> game over. Exercises the AI turn driver (`useChessAITurn`) responsible for the "doble movimiento" defense in `cc99e71`.

**Prerequisites**

- Dev server running: `pnpm run dev` (local config). Testnet/mainnet flags are not required for Gate 2.
- Browser at `http://localhost:5000/`.
- A complete warband. Two ways to obtain one:
  - **Real path** (preferred for Gate 6 tester readiness): build all four piece decks via the deck builder UI on `/#/warband?mode=single`.
  - **Programmatic seed** (fast for regression smoke): the `useWarbandStore` is exposed on `globalThis.__ragnarokWarbandStore` for test affordance. Call `getState().setWarband(army, deckCardIds)` from the DevTools console with the army payload below.

**Procedure**

1. Open `/#/warband?mode=single`. Confirm the page renders without "Maximum update depth exceeded".
2. Either complete the warband via UI or seed it via console (see Prerequisites).
3. Visit `/#/game`. Confirm the URL replaces to `/#/game/single` (Navigate redirect, no back-history pollution).
4. Confirm the coordinator mounts: chess board visible with 5 player pieces (king + queen + rook + bishop + knight), 5 player pawns, mirrored opponent pieces (10 total per side).
5. Confirm `globalThis.__ragnarokCombatStore.getState().boardState.currentTurn === 'player'` and `gameStatus === 'playing'`.
6. Move a player pawn forward. Confirm a MovePlate dot appears on click; click the dot to commit.
7. Wait ~1.5s. Confirm the AI plays exactly one piece in response (no "doble movimiento"). `boardState.currentTurn` flips back to `'player'`. `boardState.moveCount` advances by 2.
8. Repeat moves until phase advances to combat or chess concludes. Track AI turns -- target ≥10 across the session.
9. Confirm transition into combat: `gameStatus === 'combat'` and `pokerIsActive === true`. The cards UI mounts (Spellcraft window, mulligan prompt). No console errors.
10. Play through combat phases (mulligan -> spellcraft -> betting rounds) until one side's HP reaches 0 or chess resumes and chess reaches checkmate, draw, or decisive-material game-over.
11. Confirm the game-over screen renders with the correct winner attribution. `getWinnerFromGameStatus` resolves to `'player'` or `'opponent'` matching the visible UI.
12. Confirm console is clean of errors throughout the entire session. Warnings from `cardDataExporter` (effect registry deuda, see `effect-registry-deuda.md`) are expected and not failures.

**Last verified**

- 2026-05-10 via `agent-browser 0.27.0` against `pnpm run dev` at `http://localhost:5000/#/game/single`.
- Warband used the programmatic seed below. The chess board mounted 10v10 with `currentTurn === 'player'` and `gameStatus === 'playing'`.
- AI turn check: 12 consecutive AI responses advanced `boardState.moveCount` from 0 to 24, exactly +2 per player/AI round. No freeze, no timeout, no double movement.
- Combat check: bishop-vs-queen attack transitioned into cards combat with `gameStatus === 'combat'` and `pokerIsActive === true`; poker hands resolved and returned to chess with `pendingCombat === false`.
- Game-over check: legal chess endgame reached `boardState.gameStatus === 'opponent_wins'`; visible UI showed `DEFEAT` and `PLAY AGAIN`.
- Console check: 0 errors. `cardDataExporter` malformed-effect warnings were present and are expected by this runbook.

**Expected sample seed for step 2**

```js
const store = globalThis.__ragnarokWarbandStore;
store.getState().setWarband(
  {
    king:   { id: 'king-leif',           name: 'Leif the Wayfinder', heroClass: 'neutral', description: '', element: 'light' },
    queen:  { id: 'hero-erik-flameheart', name: 'Erik Flameheart',   heroClass: 'mage',    description: '', element: 'fire'  },
    rook:   { id: 'hero-ragnar-ironside', name: 'Ragnar Ironside',   heroClass: 'warrior', description: '', element: 'water' },
    bishop: { id: 'hero-brynhild',        name: 'Brynhild',          heroClass: 'priest',  description: '', element: 'light' },
    knight: { id: 'hero-sigurd',          name: 'Sigurd',            heroClass: 'rogue',   description: '', element: 'fire'  },
  },
  Array.from({ length: 30 }, (_, i) => 1000 + i)
);
```

Passing Gate 2 unblocks the testnet onboarding sequence (Gates 3-6).

### Failure checks

- "Maximum update depth exceeded" on `/#/game/single` -> regression of `f829952` (`selectDeckCardIds` lost referential stability). Run `pnpm exec vitest run client/src/lib/stores/useWarbandStore.test.ts` first; if the regression tests fail, the bug is back. Audit any other zustand selector that branches on status and returns an array or object.
- AI plays two pieces in one turn ("doble movimiento") -> regression of `cc99e71`. Run `pnpm exec vitest run client/src/game/coordinator/hooks/chessAITurnDriver.test.ts` to confirm the early-return contract.
- Chess phase freezes mid-AI-turn -> check the dev console for orphaned `setTimeout` warnings; the timeout batch in `useChessAITurn.ts` is what protects against turn-flip mid-think.

## Failure Checks

- If the badge does not appear, verify the server was started with `pnpm run dev:testnet`.
- If the client writes ops but replay does not see them, check protocol id filters first.
- If server status reports `ragnarok-cards`, check env loading and optional `RAGNAROK_PROTOCOL_ID` override.

# QA Testnet Season 0 - Week One Spec

## Status

Agent-ready technical plan for the one-week QA Testnet Season 0 rehearsal.
Owner/operator approval is still required for tester accounts, exact dates, and
the Closed Testnet Beta invite decision.

This spec closes the operating plan. It does not enable ranked P2P RUNE,
official ELO, Season Score, or NFTLox `mutableData` writes.

## Boundary

QA Testnet Season 0 is a resettable gameplay and evidence rehearsal:

- runtime stage must be `testnet`;
- protocol id must be `rk_game_testnet`;
- reset epoch must be `qa-s0-*` or `QA Season 0 / ...`;
- QA full-catalog cards are a deck-building entitlement only;
- QA cards are not NFT custody, marketplace inventory, CardXP, ELO, Season
  Score, or mainnet value;
- P2P may show QA-local reward feedback, but no `p2p_ranked` RUNE is credited
  without the Closed Beta winner-arbiter path.

The server remains minimal: matchmaking, relay, config/read APIs, and replay
projection. Gameplay truth and the Season 0 arbiter candidate are client-local
and replay-verifiable; the server is not a live referee.

## Day 0 - Operator Setup

Required before testers start:

1. Start from a QA reset epoch, for example
   `VITE_RAGNAROK_RESET_EPOCH=qa-s0-2026-05-21`.
2. Confirm `GET /api/health` reports `runtime.stage: "testnet"`,
   `runtime.protocolId: "rk_game_testnet"`, the QA reset epoch, and
   `resettable: true`.
3. Run:

```bash
npm run check
npx vitest run shared/runtimeConfig.test.ts client/src/game/protocol/ceremonyFeedback.test.ts client/src/data/blockchain/transcriptBuilder.test.ts
```

4. Confirm tester instructions point to `/#/multiplayer`, not
   `/#/game/multiplayer`.
5. Prepare two browser profiles with Hive Keychain and two testnet identities.

## Day 1 - Access And Reset Isolation

Must test:

- first load, Hive session, testnet banner, admin/runtime evidence;
- storage namespace changes when the reset epoch changes;
- QA full-catalog appears only in the QA epoch;
- Closed Beta style epoch, for example `closed-beta-*`, disables
  `qa_full_catalog`.

Evidence:

- `/api/health` response;
- ceremony or session evidence JSON containing runtime reset fields;
- screenshots may supplement, but they are not the only evidence.

## Day 2 - Ceremonies

Must test:

- starter claim;
- DUAT eligibility, claim, sealed pack, pack opening, and DUAT filter;
- daily quest claim and duplicate claim;
- campaign reward evidence button;
- RUNE pack exchange and pack opening.

Each ceremony must export evidence with account, reset epoch, protocol id, and
recent session events.

## Day 3 - RUNE And Packs

Must test:

- daily quest source-key idempotency;
- campaign first-clear credit and replay no-op;
- RUNE pack exchange debit;
- insufficient-balance rejection;
- `/api/chain/player/:account/rune` matches `/api/chain/rune/ledger`.

No `/api/testnet/rune/*` endpoint is valid.

## Day 4 - Campaign

Must test:

- 30-card QA full-catalog campaign deck;
- at least one non-starter QA Access card;
- first-clear reward mission;
- replay of the same mission without extra RUNE;
- invalid campaign result rejection;
- evidence export from briefing or game-over result.

QA Access must never be described as NFT ownership or CardXP eligibility.

## Day 5 - P2P Gameplay

Must test with two browser profiles and two Hive testnet identities:

- Hive session gate before matchmaking;
- `deck_verify` with `protocolVersion: 2` and `claims[]` only;
- quiet chess move from each side;
- instant capture;
- non-instant capture into poker and return to chess;
- reconnect/grace behavior;
- reload warning with `p2p_reload_guard_prompted` in the downloaded session log;
- explicit win/loss/draw result on both peers;
- QA-local reward preview stays outside wallet, CardXP, NFTLox, ELO, and
  Season Score.

Failed P2P smoke is actionable only with exported session log evidence:
match/session id, role, reject code, state hashes where available, reconnect or
reload status, and winner/result state.

## Day 6 - Regression And Triage

Run the focused matrix before accepting fixes:

```bash
npm run check
npx vitest run \
  shared/runtimeConfig.test.ts \
  client/src/data/blockchain/transcriptBuilder.test.ts \
  client/src/game/protocol/ceremonyFeedback.test.ts \
  client/src/game/deck/heroDeckRules.test.ts \
  client/src/game/p2p/messageSchemas.test.ts \
  client/src/game/match/modes/p2p/wireSync/resultProposalGuard.test.ts \
  client/src/game/match/modes/p2p/qaLocalRewardPreview.test.ts \
  client/src/game/match/modes/p2p/winnerArbiter.test.ts \
  shared/protocol-core/runeEconomy.test.ts \
  shared/protocol-core/campaignResult.test.ts \
  shared/protocol-core/replayTraces.test.ts
npm run prototype:p2p-settlement -- --demo
```

Every accepted logic fix needs either a focused test or a runbook evidence
entry. Cosmetic fixes are deferred unless they block reading the result or
exporting evidence.

## Day 7 - Exit Criteria

QA Season 0 can close when:

- `npm run check` is green;
- focused Season 0/P2P/RUNE tests are green;
- every must-test path above has at least one evidence JSON artifact;
- P2P has a real two-browser Hive Keychain pass or a captured blocker with
  session logs;
- result-only P2P evidence still creates no `p2p_ranked` RUNE;
- QA-local P2P reward preview is absent from wallet, chain reads, CardXP,
  NFTLox, ELO, and Season Score;
- known limitations are visible to testers.

Closed Testnet Beta invitations remain blocked until the cutover gate proves a
new reset epoch, no QA full-catalog entitlement, confirmed NFTLoX collection
gate, and no bleed from Season 0 data.

## Known Limitations

- No permanent value.
- No mainnet ownership.
- No official ranking.
- No ranked P2P RUNE settlement.
- No automatic settlement for disconnects, reloads, or result-only evidence.
- Hard reload recovery is not complete; the reload guard and evidence export
  are the Season 0 acceptance path.

## Winner-Arbiter Track

The current arbiter slice is client-local and fail-closed. It verifies the
candidate shape for future full NFT ranked settlement, including dual anchor,
pinned participants, pre-match NFT custody deck evidence tied to anchored deck
hashes, deterministic transcript finalizer evidence, visible review, dual
signatures, and prior signature verification against anchored pubkeys.

For Week One, this is a guardrail and spec proof. It is not wired to broadcast
`match_result`, and the QA week must continue to treat P2P ranked settlement as
disabled.

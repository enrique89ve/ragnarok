# Testnet Runbook

## Purpose

Run Ragnarok in a mainnet-like beta environment with a separate Hive namespace, collection id, accounts, and service endpoints. Testnet validates the full architecture but remains resettable.

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
VITE_NFTLOX_PROTOCOL_ID=nftlox_testnet
```

`VITE_NETWORK_STAGE=testnet` derives Hive data mode and blockchain packaging.
Do not set `VITE_DATA_LAYER_MODE` or `VITE_BLOCKCHAIN_PACKAGING` for normal
testnet runs.

Hive private keys are server/operator-only. Never put posting, active, owner,
memo, or WIF keys in a `VITE_*` variable; `VITE_*` is bundled into browser code.
Public `VITE_*` values may include network stage, protocol ids, collection ids,
Hive account names, and public endpoints. Do not put credentials in public URLs.
See [`ENV_SECURITY.md`](ENV_SECURITY.md) for the canonical key-placement rules.

Indexer and art endpoints can stay empty until those services are deployed:

```env
VITE_RAGNAROK_INDEXER_URL=
VITE_RAGNAROK_ART_INDEXER_URL=
```

## Start Testnet

```bash
npm run dev:testnet
```

Expected UI signals:

- Header shows `TESTNET`.
- Dismissible lower-left banner shows `Testnet / Resettable / rk_game_testnet`.

The header badge remains visible after dismissing the lower-left banner.

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
4. Broadcast a low-risk operation first, such as queue join/leave or match anchor.
5. Confirm the Hive `custom_json` id is `rk_game_testnet`.
6. Confirm client replay reads the same namespace.

Passing this smoke test closes the testnet configuration gate and opens the next roadmap block: gameplay/P2P validation under the testnet namespace.

## Smoke Test — Local Single (Gate 2)

Validates that a single-player practice match runs end-to-end on the local stack: `/warband` -> `/#/game/single` -> chess phase -> combat (cards) phase -> game over. Exercises the AI turn driver (`useChessAITurn`) responsible for the "doble movimiento" defense in `cc99e71`.

**Prerequisites**

- Dev server running: `npm run dev` (mainnet config). Testnet flags are not required for Gate 2.
- Browser at `http://localhost:5000/`.
- A complete warband. Two ways to obtain one:
  - **Real path** (preferred for Gate 6 tester readiness): build all four piece decks via the deck builder UI on `/#/warband`.
  - **Programmatic seed** (fast for regression smoke): the `useWarbandStore` is exposed on `globalThis.__ragnarokWarbandStore` for test affordance. Call `getState().setWarband(army, deckCardIds)` from the DevTools console with the army payload below.

**Procedure**

1. Open `/#/warband`. Confirm the page renders without "Maximum update depth exceeded".
2. Either complete the warband via UI or seed it via console (see Prerequisites).
3. Visit `/#/game`. Confirm the URL replaces to `/#/game/single` (Navigate redirect, no back-history pollution).
4. Confirm the coordinator mounts: chess board visible with 5 player pieces (king + queen + rook + bishop + knight), 5 player pawns, mirrored opponent pieces (10 total per side).
5. Confirm `globalThis.__ragnarokCombatStore.getState().boardState.currentTurn === 'player'` and `gameStatus === 'playing'`.
6. Move a player pawn forward. Confirm a MovePlate dot appears on click; click the dot to commit.
7. Wait ~1.5s. Confirm the AI plays exactly one piece in response (no "doble movimiento"). `boardState.currentTurn` flips back to `'player'`. `boardState.moveCount` advances by 2.
8. Repeat moves until phase advances to combat or chess concludes. Track AI turns -- target ≥10 across the session.
9. Confirm transition into combat: `gameStatus === 'combat'` and `pokerIsActive === true`. The cards UI mounts (Spellcraft window, mulligan prompt). No console errors.
10. Play through combat phases (mulligan -> spellcraft -> betting rounds) until one side's HP reaches 0 or chess resumes and a king is captured.
11. Confirm the game-over screen renders with the correct winner attribution. `getWinnerFromGameStatus` resolves to `'player'` or `'opponent'` matching the visible UI.
12. Confirm console is clean of errors throughout the entire session. Warnings from `cardDataExporter` (effect registry deuda, see `effect-registry-deuda.md`) are expected and not failures.

**Last verified**

- 2026-05-10 via `agent-browser 0.27.0` against `npm run dev` at `http://localhost:5000/#/game/single`.
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

- "Maximum update depth exceeded" on `/#/game/single` -> regression of `f829952` (`selectDeckCardIds` lost referential stability). Run `npx vitest run client/src/lib/stores/useWarbandStore.test.ts` first; if the regression tests fail, the bug is back. Audit any other zustand selector that branches on status and returns an array or object.
- AI plays two pieces in one turn ("doble movimiento") -> regression of `cc99e71`. Run `npx vitest run client/src/game/coordinator/hooks/chessAITurnDriver.test.ts` to confirm the early-return contract.
- Chess phase freezes mid-AI-turn -> check the dev console for orphaned `setTimeout` warnings; the timeout batch in `useChessAITurn.ts` is what protects against turn-flip mid-think.

## Failure Checks

- If the badge does not appear, verify the server was started with `npm run dev:testnet`.
- If the client writes ops but replay does not see them, check protocol id filters first.
- If server status reports `ragnarok-cards`, check env loading and optional `RAGNAROK_PROTOCOL_ID` override.

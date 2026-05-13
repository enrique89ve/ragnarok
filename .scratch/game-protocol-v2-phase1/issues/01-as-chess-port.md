# 01 — AS port of `shared/protocol-core/chess/` → `assembly/chess/`

**Status**: ready-for-agent
**Depends on**: nothing (foundational issue)
**Blocks**: 02 (re-exports), 03 (bridge needs the export), 04 (parity loads AS), 06 (smoke loads AS)
**ADR**: [docs/adr/0004-game-protocol-deterministic-engine.md §Decision.5 Phase 1](../../../docs/adr/0004-game-protocol-deterministic-engine.md#5-phasing)
**Decisions**: [DECISIONS.md](../DECISIONS.md) — D1, D2, D3

---

## Goal

Port the geometry-only chess reducer to AssemblyScript. The AS twin must be a structural mirror of [`shared/protocol-core/chess/`](../../../shared/protocol-core/chess/) on commit `439ff28`. AS becomes the runtime authority; the TS twin stays as the contract reference (see D4).

## Why

Per ADR 0004 §Decision.5 Phase 1, chess turns must become bit-identical cross-peer. The TS reducer in `shared/protocol-core/chess/reducer.ts` is pure and deterministic *in TypeScript*, but two peers running it under different V8 builds, Map iteration orders, or Number precisions can drift (per [wasm-engine-stub memoria](../../../.claude/projects/-root-projects-norse-mythos-card-game/memory/wasm-engine-stub.md)). AssemblyScript's `i32`/`i64` typing + spec-defined Map iteration eliminates the drift class entirely.

Per D1, scope is **geometry only** — pieces, currentTurn, gameStatus, moveCount, inCheck. Stamina + mines + health stay TS hooks around the WASM call (see D8 invariant).

## Module layout

```
assembly/chess/
├── types.ts          # Mirror of shared/protocol-core/chess/types.ts.
│                     #   ChessPieceType, ChessPlayerSide, ChessGameStatus,
│                     #   ChessBoardPosition, ChessProtocolPiece,
│                     #   MovementPattern, PIECE_MOVEMENT_PATTERNS,
│                     #   BOARD_ROWS, BOARD_COLS.
│                     # i32 indices; static i32 arrays for movement vectors.
├── state.ts          # Mirror of shared/protocol-core/chess/state.ts.
│                     #   ChessBoardSnapshot class with pieces: ChessProtocolPiece[],
│                     #   currentTurn, gameStatus, moveCount: i32, inCheck.
├── boardSetup.ts     # Mirror of shared/protocol-core/chess/boardSetup.ts.
│                     #   PIECE_BASE_STATS, PLAYER_INITIAL_POSITIONS,
│                     #   OPPONENT_INITIAL_POSITIONS. Static const arrays.
├── rules.ts          # Mirror of shared/protocol-core/chess/chessRules.ts.
│                     #   getValidMoves, getThreateningPieces, isKingInCheck,
│                     #   isCheckmate, checkPawnPromotion, checkWinCondition.
├── reducer.ts        # Mirror of shared/protocol-core/chess/reducer.ts.
│                     #   applyChessAction(snapshotJson: string,
│                     #                    actionJson: string): string
│                     #   Parses inputs from canonical JSON; emits canonical
│                     #   JSON output. NO AS-side state across calls.
└── canonical.ts      # Per-D3: AS does NOT re-implement canonicalize.
                      # Instead this file contains the canonical-emit helpers
                      # (escapeJsonString equivalent, sort-pieces-by-id, etc.)
                      # that the reducer uses on output. Byte-for-byte must
                      # match shared/protocol-core/chess/canonicalize.ts.
```

## Surface contract (the only exported symbol bound to TS)

```ts
// assembly/chess/reducer.ts — exported via assembly/index.ts (issue 02)
export function applyChessAction(
	snapshotJson: string,
	actionJson: string,
): string;
```

Input contract:
- `snapshotJson` is **canonical-form** JSON of `ChessBoardSnapshot<ChessProtocolPiece>` produced by `canonicalChessSnapshot` (the TS spec — see D3).
- `actionJson` is a canonical-form JSON of `ChessAction` (move | capture | promote | endTurn). Field-order: alphabetical keys; `kind` first by virtue of alphabetical order.

Output contract:
- On success: canonical-form `{"ok":true,"state":<canonical snapshot>}`.
- On rejection: `{"ok":false,"reason":"<rejection-code>"}` where reason ∈ `no-such-piece | wrong-turn | illegal-target | not-promotable | game-over`.
- **The output MUST satisfy**: `output === canonicalChessSnapshot_TS(JSON.parse(output))` (asserted by parity tests in issue 04).

## Canonical-emit rules (must match `shared/protocol-core/chess/canonicalize.ts` byte-for-byte)

Per D3:
- Number encoding: `String(n)` for `i32` (AS auto-emits as `i32 → string` without decimal point).
- Boolean encoding: literal `"true"` / `"false"`.
- String escaping: mirror [canonicalize.ts:57-72](../../../shared/protocol-core/chess/canonicalize.ts#L57-L72). Code-point check for `0x22`, `0x5c`, `0x08`, `0x0c`, `0x0a`, `0x0d`, `0x09`, then `< 0x20` → `\uXXXX`.
- Piece field order: `hasMoved,id,owner,position,type`.
- Piece `position` inner key order: `col,row`.
- Pieces array sorted by `id` lex-ascending (string comparison).
- Top-level key order: `currentTurn,gameStatus,inCheck,moveCount,pieces`.
- `inCheck === null` emits as literal `null` (not `"null"`).
- Result shape: `{"ok":<bool>,"reason":<string>}` for failure, `{"ok":<bool>,"state":<snapshot>}` for success (alphabetical).

## Files to touch

- `assembly/chess/types.ts` — NEW.
- `assembly/chess/state.ts` — NEW.
- `assembly/chess/boardSetup.ts` — NEW.
- `assembly/chess/rules.ts` — NEW.
- `assembly/chess/reducer.ts` — NEW (exports `applyChessAction`).
- `assembly/chess/canonical.ts` — NEW (helper module used by reducer for output emit).
- `assembly/asconfig.json` — no change; `entries: ["assembly/index.ts"]` already pulls in the new directory once issue 02 wires the re-export.

## Build verification

After this issue lands:
- `npm run build:wasm` (or whichever script invokes asc per asconfig.json) succeeds for release + debug targets.
- `client/public/engine.wasm` size delta within ~5 KB (chess port is small).
- `npm run check` passes (no TS-side changes yet).

## Determinism rules (do NOT violate; will be checked by issue 05's audit script)

- No `f32` / `f64` declarations.
- No bare `number` type annotations — use `i32` / `u32` / `i64` / `u64` explicitly.
- No `Math.random()`.
- `Math.*` allowed only for `floor`, `max`, `min`, `abs`. Any other `Math.*` call requires a comment justification.
- No `Date.now()`, `performance.now()`, `Date.UTC`, or any wall-clock primitive.
- `new Map<>()` requires a `// audit: insertion-order required because <reason>` comment. The chess port should not need Maps — piece lookup is by linear scan or by-id sort, deterministic by construction.

## Acceptance criteria

1. The six new files exist under `assembly/chess/` and compile via `asconfig.json`.
2. `assembly/chess/reducer.ts` exports `applyChessAction(snapshotJson: string, actionJson: string): string`.
3. Output JSON is byte-equal to `canonicalChessSnapshot(parseResult(output).state)` for the trivial `endTurn` action on the initial board (smoke check during this issue; full parity test lands in issue 04).
4. Phase 0 audit (existing 7/7) still green: `npm run smoke:phase0` exits 0.
5. No new files outside `assembly/chess/` and `assembly/asconfig.json`.

## Non-goals (for this issue)

- No client wiring. `assembly/index.ts` is NOT modified here — that is issue 02's job.
- No new tests. Parity tests are issue 04. Smoke is issue 06.
- No TS-side files touched.

## Commit message (suggested)

```
feat(protocol): ADR 0004 issue 01 — assembly/chess/ AS twin of geometry reducer
```

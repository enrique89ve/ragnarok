# PRD — Game protocol v2 Phase 1 (chess engine → `assembly/chess/`)

**Status**: Accepted
**Owner**: enrique
**Decision**: [docs/adr/0004-game-protocol-deterministic-engine.md §Decision.5 Phase 1](../../docs/adr/0004-game-protocol-deterministic-engine.md#5-phasing)
**Resolved flags**: [DECISIONS.md](./DECISIONS.md) — 11 implementation flags (D1–D11) resolved 2026-05-13 via the `grill-with-docs` skill before agent kickoff.
**Target milestone**: Phase 1 → Phase 2 promotion gate (closed beta hardening). Phase 0 (commits `ea833fa..439ff28`) is the foundation; this phase makes the chess phase deterministic across peers.
**Created**: 2026-05-13

---

## Goal

Port the chess engine — the geometry-only surface of [`shared/protocol-core/chess/`](../../shared/protocol-core/chess/) as it stands on `439ff28` — to `assembly/chess/` so the chess phase becomes **bit-identical cross-peer**. The TS twin stays as the contract reference; the AS twin is the runtime authority. The bridge into [chessCombatSlice.ts](../../client/src/game/stores/combat/chessCombatSlice.ts) is a single import swap (D4). Stamina / mines / health / animation hooks **stay TS** for Phase 1 (D1).

## Why now

Phase 0 closed the protocol-layer trust gap (signed transcripts, session_renewal, server pending queue, smoke gate green per `npm run smoke:phase0`). The remaining false-positive-slash risk is the engine layer: two peers mutating chess state via a TS reducer can produce different snapshot hashes from the same intent. Per ADR 0004 §Context and [wasm-engine-stub memoria](../../.claude/projects/-root-projects-norse-mythos-card-game/memory/wasm-engine-stub.md), the current WASM module is a hash oracle, not the engine. Phase 1 flips that for chess.

Why chess first (not cards):
- Smaller surface (~400 LOC vs 13+ reachable card-engine stubs per ADR §Code-level).
- Single deterministic reducer with a complete TS twin already living in `shared/protocol-core/chess/`.
- No card-data exporter dependency; chess pieces are geometry, not registry-driven.
- Tests the AS-twin pattern in isolation before Phase 2 sweeps the rest.

Why geometry-only (not the full ADR-text scope of stamina + mines): the TS twin's reducer is already geometry-only by design (per [reducer.ts:11](../../shared/protocol-core/chess/reducer.ts)). Stamina and mines live as before/after hooks in the slice and would balloon the AS port with seeded-RNG plumbing for Ginnungagap scatter ([ChessTypes.ts:176](../../client/src/game/types/ChessTypes.ts#L176)). They become anti-cheat surface in a Phase 2 / mini-1.5 follow-up (F1 in DECISIONS.md).

## Scope

### In scope (Phase 1)

- **AS port** of `shared/protocol-core/chess/` to `assembly/chess/`: types, state, boardSetup, rules, reducer, canonical emit. ~400 LOC AS.
- **WASM interface wiring**: `assembly/index.ts` re-exports `applyChessAction`; `client/src/game/engine/wasmInterface.ts` exposes the typed call.
- **TS bridge shim**: `client/src/game/engine/chessReducer.ts` (sync wrapper, throws on `!isWasmReady()`).
- **chessCombatSlice swap**: single import-path change; animation/UI seam unchanged.
- **Parity test corpus**: `shared/protocol-core/chess/fixtures/*.json` (≥50) + `parity.test.ts` (three-way equality: TS contract, AS contract, cross-impl byte equality).
- **Determinism audit**: `scripts/audit-wasm-determinism.mjs` with two scopes (AS rules + chess-hook deny list); `npm run audit:determinism`.
- **smoke:phase1 harness**: `client/src/game/protocol/phase1.smoke.test.ts` (100 seeds × 60 turns, peer-A vs peer-B canonical equality at every turn).
- **CI workflow**: `.github/workflows/ci.yml` running on PRs — check + lint + lint:css + audit + test + smoke:phase0 + smoke:phase1.
- **Docs**: CONTEXT.md glossary entry for the AS-twin pattern; ADR §Decision.5 cross-link to smoke:phase1; close-out RETRO.md.

### Out of scope (Phase 1, do not implement)

- **Stamina / mines / health / element / hero data port**. These stay TS hooks around the WASM reducer until Phase 2 (or a follow-up F1 mini-phase). The audit-script scope-2 deny list prevents new non-determinism leaking into the hooks.
- **Cards / poker engine port** to `assembly/engine/`. Phase 2.
- **Protocol id split** (`ragnarok-match` namespace). Phase 3.
- **Server-side WASM arbitration runtime**. Phase 4, post-mainnet.
- **TS reducer deletion**. The TS twin in `shared/protocol-core/chess/` stays — it is the canonical contract reference (D4 rationale).
- **Async refactor** of chessCombatSlice. Sync wrapper preserved (D4).

## Non-goals (explicit)

See [ADR 0004 §Non-goals](../../docs/adr/0004-game-protocol-deterministic-engine.md#non-goals). Phase 1 non-goals beyond those:

- No new on-chain protocol surface. `match_anchor` schema unchanged (Phase 0 sealed it).
- No per-turn chain anchoring (rejected in ADR).
- No new RNG sources in `assembly/`. The Phase 0 7/7 determinism audit must remain green throughout this phase.

## Architecture (post-ADR, Phase 1 boundaries)

```
CHESS TURN PRE-PHASE-1                                          PHASE 1 ARTEFACT
────────────────────────────────────────────────────            ──────────────────
1. User clicks piece + target square                       →    (UI, unchanged)
2. Slice calls applyChessAction from shared/protocol-core  →    TS reducer (still here, kept as contract)
3. Slice applies before/after hooks (stamina, mines)       →    TS hooks (still here)
4. chessHash.ts canonicalizes snapshot + WASM SHA-256      →    (unchanged for Phase 1)
5. Phase 0 transcript builder wraps action in envelope     →    (unchanged, Phase 0 ship)


CHESS TURN POST-PHASE-1                                         PHASE 1 ARTEFACT
────────────────────────────────────────────────────            ──────────────────
1. User clicks piece + target square                       →    (UI, unchanged)
2. Slice calls applyChessAction from chessReducer shim     →    NEW: client/src/game/engine/chessReducer.ts (issue 03)
   └─ canonicalChessSnapshot(state) → snapshotJson         →    TS canon (spec, unchanged)
   └─ JSON.stringify(action)                               →    (trivial)
   └─ wasm.applyChessAction(snapJson, actJson) → outJson   →    NEW: assembly/chess/* (issue 01) + wasmInterface wiring (issue 02)
   └─ JSON.parse(outJson) → typed ChessReduceResult        →    (trivial)
3. Slice applies before/after hooks                        →    TS hooks (unchanged — D8 invariant)
4. chessHash canonicalizes + WASM SHA-256                  →    (unchanged — D5)
5. Phase 0 transcript builder wraps envelope               →    (unchanged)


PARITY GUARANTEE (per-action)                                   PHASE 1 ARTEFACT
────────────────────────────────────────────────────            ──────────────────
peer A applies action → canonical(snapshot_A) = bytes_A    →    AS reducer + canon emit (issue 01)
peer B applies action → canonical(snapshot_B) = bytes_B
assert bytes_A === bytes_B at every turn                   →    smoke:phase1 (issue 06)
assert sha256(bytes_A) === envelope.prevChessStateHash     →    smoke:phase1 (issue 06)


DETERMINISM ENFORCEMENT                                         PHASE 1 ARTEFACT
────────────────────────────────────────────────────            ──────────────────
assembly/** ........... no f32/f64, no Math.random,
                        no Date.now, no Maps without note  →    audit:determinism scope 1 (issue 05)
chess*Slice.ts ........ no Math.random, no Date.now,
                        no performance.now,
                        no crypto.getRandomValues          →    audit:determinism scope 2 (issue 05)
CI gate ............... pr-time, fails the build          →    .github/workflows/ci.yml (issue 05)
```

## Acceptance criteria

1. A tester plays a chess match against an opponent. Every chess move is executed by `assembly/chess/applyChessAction` (verified via a runtime assertion in dev mode that the shim's return-path was traversed). The TS reducer in `shared/protocol-core/chess/reducer.ts` is **not** called at runtime.
2. `chessCombatSlice.ts` imports `applyChessAction` from `@/game/engine/chessReducer`, not from `@shared/protocol-core/chess`. Diff for issue 03 is one line in the slice + one new file (the shim).
3. The animation seam holds: every animation that fired pre-Phase-1 (move, capture, check toast, checkmate cinematic, mine trigger) still fires, derived from `prev` vs `next` snapshot in the slice. Verified manually + by the existing chess UI test suite.
4. `parity.test.ts` runs ≥50 fixtures; for each:
   - `canonicalChessSnapshot(applyChessAction_TS(input, action).state) === expected.canonical`
   - `wasm.applyChessAction(canonical(input), canonical(action)) === expected.canonical`
   - The two outputs are byte-equal.
5. `npm run smoke:phase1` exits 0: 100 seeds × 60 turns × 2 peers, zero canonical-snapshot divergences, zero hash mismatches, zero transcript-chain failures.
6. `npm run smoke:phase0` still exits 0 (Phase 0 regression gate, must stay green).
7. `npm run audit:determinism` exits 0. Scope 1 verifies `assembly/**` (including the new `assembly/chess/`) honors the AS rules. Scope 2 verifies `client/src/game/stores/combat/chess*Slice.ts` is free of Math.random / Date.now / performance.now / crypto.getRandomValues.
8. `.github/workflows/ci.yml` exists and runs on every PR. Job is green for the merge commit of every Phase 1 issue.
9. `npm run check`, `npm run lint`, `npm run lint:css` pass with no new errors. No new `as` casts on the WASM boundary — JSON output is `unknown` + zod validation (or equivalent) per [hive-payload-canon memoria](../../.claude/projects/-root-projects-norse-mythos-card-game/memory/hive-payload-canon.md).
10. **Disciplina determinismo**: the AS port adds no new `f32` / `f64` declaration, no new `Math.*` call outside the whitelist, no `Date.now`, no `performance.now`. Phase 0's 7/7 audit stays green; Phase 1 extends it to "7/7 AS + N/N chess-hook" green.

## Implementation issues

Each issue is sized for AFK execution. Numbering reflects dependency order; later issues depend on earlier ones unless marked parallel.

1. [ ] [01-as-chess-port](./issues/01-as-chess-port.md) — Port `shared/protocol-core/chess/` to `assembly/chess/`: types, state, boardSetup, rules, reducer + canonical emit. AS-only, no client wiring yet.
2. [ ] [02-wasm-interface-wiring](./issues/02-wasm-interface-wiring.md) — Re-export `applyChessAction` from `assembly/index.ts`; expose typed call from `client/src/game/engine/wasmInterface.ts`. No call-site swap yet.
3. [ ] [03-ts-bridge-and-slice-swap](./issues/03-ts-bridge-and-slice-swap.md) — `client/src/game/engine/chessReducer.ts` sync shim (D4); one-line import-path swap in `chessCombatSlice.ts`; animation-seam invariant documented.
4. [ ] [04-parity-fixtures](./issues/04-parity-fixtures.md) — `shared/protocol-core/chess/fixtures/*.json` corpus (≥50) + `parity.test.ts` (D6 three-way equality).
5. [ ] [05-determinism-audit-and-ci](./issues/05-determinism-audit-and-ci.md) — `scripts/audit-wasm-determinism.mjs` (D7 two-scope rules) + `.github/workflows/ci.yml` scaffold (D11). Parallel from start.
6. [ ] [06-smoke-phase1](./issues/06-smoke-phase1.md) — `client/src/game/protocol/phase1.smoke.test.ts` (100 seeds × 60 turns); `smoke:phase1` npm script; appends to ci.yml.
7. [ ] [07-docs-and-retro](./issues/07-docs-and-retro.md) — CONTEXT.md glossary update; ADR §Decision.5 cross-link to smoke:phase1; `RETRO.md` close-out.

**Critical path**: 01 → 02 → 03 → (04 ‖ 06) → 07. Issue 05 ships in parallel from day 1.

## Design conversation summary

All decisions are anchored in [DECISIONS.md](./DECISIONS.md) (resolved 2026-05-13 via `grill-with-docs`). Summary for issue-level review:

| # | Branch | Decision |
|---|---|---|
| D1 | Scope of `assembly/chess/` | Geometry-only mirror of `shared/protocol-core/chess/`; stamina + mines stay TS |
| D2 | WASM boundary encoding | JSON-string boundary: `applyChessAction(snapshotJson, actionJson) → resultJson` |
| D3 | Canonicalize ownership | TS owns canon spec (`canonicalize.ts`); AS reducer emits canonical-shaped JSON directly |
| D4 | Bridge contract | Sync shim, throw on `!isWasmReady`; no TS fallback; one import-path swap in slice |
| D5 | `chessHash.ts` | No change — already does the right thing for Phase 1 |
| D6 | Test parity | Vitest + shared fixture corpus, two adapters (TS reducer + AS reducer via loader) |
| D7 | Determinism enforcement | Single `audit-wasm-determinism.mjs` script, two scopes (AS rules + chess-hook deny list) |
| D8 | Animation / UI seam | Invariant preserved (slice diffs prev/next snapshot); no code work in Phase 1 |
| D9 | Promotion gate | New `smoke:phase1` harness: 100 seeds × 60 turns × 2 peers, byte-equal canonical |
| D10 | Issue split | 7 issues mirroring Phase 0 cadence |
| D11 | CI integration | New `.github/workflows/ci.yml` PR gate; pre-commit unchanged |

## Mirror-of pattern

This PRD intentionally mirrors [.scratch/game-protocol-v2/PRD.md](../game-protocol-v2/PRD.md) (Phase 0) and [.scratch/eitr-v1/PRD.md](../eitr-v1/PRD.md):
- Goal / Why now / Scope / Non-goals / Architecture / Acceptance criteria / Issues / Design conversation summary.
- ADR-first canon; PRD points to ADR for full rationale.
- Issues sized for AFK execution with explicit dependency ordering.

See [feedback_mirror_of_rune_pattern memoria](../../.claude/projects/-root-projects-norse-mythos-card-game/memory/feedback_mirror_of_rune_pattern.md) for the established convention.

## Comments

(append below)

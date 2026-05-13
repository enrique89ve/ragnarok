# DECISIONS — Game protocol v2 Phase 1 (chess engine → `assembly/chess/`)

**Status**: Open grill (in progress 2026-05-13)
**Owner**: enrique
**Decision parent**: [ADR 0004 §Decision.5](../../docs/adr/0004-game-protocol-deterministic-engine.md#5-phasing)
**Phase 0 ship**: commits `ea833fa..439ff28`, smoke gate `npm run smoke:phase0` green.

This file resolves implementation-level flags surfaced during the Phase 1
grill (skill: `grill-with-docs`). Each entry is **a flag → a single
binding choice → a rationale**. Issues land in `./issues/NN-*.md` and
must reference the flag id from here.

---

## D1 — Scope of `assembly/chess/`: geometry-only mirror

**Decision**: Phase 1 ports **exactly the surface of [shared/protocol-core/chess/](../../shared/protocol-core/chess/) as it stands on `439ff28`**.

Modules ported (AS twins of the TS files):

| TS source | AS twin |
|---|---|
| `shared/protocol-core/chess/types.ts` | `assembly/chess/types.ts` |
| `shared/protocol-core/chess/state.ts` | `assembly/chess/state.ts` |
| `shared/protocol-core/chess/boardSetup.ts` | `assembly/chess/boardSetup.ts` |
| `shared/protocol-core/chess/chessRules.ts` | `assembly/chess/rules.ts` |
| `shared/protocol-core/chess/reducer.ts` | `assembly/chess/reducer.ts` |
| `shared/protocol-core/chess/canonicalize.ts` | `assembly/chess/canonicalize.ts` |

**Out of Phase 1 scope** (deferred to Phase 2 or a later workstream):
- Stamina recompute hooks ([chessCombatSlice.ts:572,587](../../client/src/game/stores/combat/chessCombatSlice.ts)).
- King Divine Command mines (`KingDivineCommandState`, [ChessTypes.ts:165-235](../../client/src/game/types/ChessTypes.ts#L165-L235)).
- Health / element / heroClass / deck / spell-slot recompute.
- Animation triggers, log emission, EventBus toasts.

**Rationale**:
- The TS twin (`shared/protocol-core/chess/`) is already the geometry-only contract — `reducer.ts` doc literal: *"Health/stamina/element/log/animation belong to the gameplay model and live in the client slice"*.
- `canonicalize.ts:29-33` already acknowledges mines/stamina as a **separate** anti-cheat workstream, not a Phase 1 blocker.
- Mines+stamina pull in a seeded-RNG plumbing change (Ginnungagap scatter, [ChessTypes.ts:176](../../client/src/game/types/ChessTypes.ts#L176)) that would balloon Phase 1.
- Phase 1's promotion gate is *"chess turns bit-identical cross-peer in real matches"* — measured against what the reducer returns. Hooks that derive from reducer output (stamina, mines) stay deterministic as long as their TS code is pure (already true on `439ff28`).

**ADR amendment**: line 255 row updated to reflect this scope (see
`docs/adr/0004-game-protocol-deterministic-engine.md` history).

**Open follow-ups**:
- F1: Phase 2 / mini-1.5 workstream to promote stamina+mines into
  `shared/protocol-core/chess/` and then port to AS — captured here, not
  scheduled.

---
## D2 — WASM boundary encoding: JSON-string

**Decision**: `assembly/chess/index.ts` exports a **pure JSON-string reducer**:

```ts
export function applyChessAction(
	snapshotJson: string,
	actionJson: string,
): string;
```

Input: canonical-form snapshot JSON + action JSON. Output: canonical-form `ChessReduceResult` JSON (either `{"ok":true,"state":...}` or `{"ok":false,"reason":...}`). State **lives in TS** between calls; AS owns no state across actions.

A thin TS wrapper at `client/src/game/engine/chessReducer.ts` (new) marshals snapshot → canonical string → WASM → parse output → typed result. Same call signature as today's `applyChessAction` from `@shared/protocol-core/chess`. Drop-in swap for the import in `chessCombatSlice`.

**Rationale**:
- ChessBoardSnapshot is small (≤20 pieces × 5 scalar fields + 4 top-level scalars) — JSON marshaling overhead is negligible.
- AS owning no state across calls keeps `session_renewal` simple: no AS-side pointer lifecycle to reconstruct on reload.
- Matches the existing chess send-path: `chessHash.computeChessPrevStateHash` already canonicalizes the snapshot to a string per action; we feed that exact string into AS, then re-hash the AS output the same way.
- Mirrors the documented `applyAction(stateJson, actionJson) → resultJson` surface in `assembly/index.ts:8` (the cards engine has both, but the JSON form is closer to what the chess flow already does).
- Rejected B (class-by-reference / `@assemblyscript/loader` typed args): forces lifecycle management of AS-owned state across reload/`session_renewal`. Not worth the perf gain for this call rate.
- Rejected C (lockstep oracle, TS-runtime + AS-verify): does not satisfy ADR Phase 1 promise that *chess actions cross to WASM*. Leaves false-positive slash risk unresolved for the chess phase.

---

## D3 — Canonicalize ownership: TS owns spec, AS emits canonical directly

**Decision**: `shared/protocol-core/chess/canonicalize.ts` remains the **single specification of canonical form** (field ordering, number encoding, sort rules, JSON escaping). AS's `assembly/chess/reducer.ts` is written so that the JSON it emits **is already canonical** — no AS-side `canonicalize` function, no post-hoc re-canonicalize on the AS output in TS.

Cross-check: every AS-output fixture in tests asserts
```ts
assert(asOutput === canonicalChessSnapshot(JSON.parse(asOutput)))
```
so drift between the TS spec and the AS emitter is caught immediately.

**Rationale**:
- One canonical form, one spec file. Eliminates drift between two implementations.
- AS's emitter is mechanical (~30 LOC: walks the typed AS struct, writes fields in the fixed order TS canonicalize uses). The TS spec is the contract; AS just respects it.
- Rejected (ii) "move canonicalize into AS, delete TS": would force server-side validation (Phase 4) and tests to boot WASM to read canonical form. Keeps TS spec as the human-readable reference.
- Rejected (iii) "both implementations + fuzz-test diff": doubles maintenance burden; the fixture-equality assertion in this decision is a lighter equivalent.

**Implementation constraint** for `assembly/chess/reducer.ts`:
- Number encoding uses `i32 → String(n)` (same as TS `String(n)`).
- Boolean encoding uses literal `"true"` / `"false"`.
- String escaping mirrors `escapeJsonString` ([canonicalize.ts:57-72](../../shared/protocol-core/chess/canonicalize.ts#L57-L72)) byte-for-byte.
- Pieces are written in `id`-sorted order; piece keys appear as `hasMoved,id,owner,position,type` and inner `position` keys as `col,row` (alphabetical), matching [canonicalize.ts:74-83](../../shared/protocol-core/chess/canonicalize.ts#L74-L83).
- Top-level keys appear as `currentTurn,gameStatus,inCheck,moveCount,pieces`, matching [canonicalize.ts:102-108](../../shared/protocol-core/chess/canonicalize.ts#L102-L108).

A dedicated parity test (`shared/protocol-core/chess/canonicalize.parity.test.ts`, new) runs ≥100 fixtures through (a) `canonicalChessSnapshot(snap)` and (b) `parse + AS.applyChessAction(endTurnOnly) → output` and asserts byte equality.

---
## D4 — Bridge contract: sync wrapper, no fallback, gated at match start

**Decision**: A new sync shim at `client/src/game/engine/chessReducer.ts` exposes:

```ts
export function applyChessAction<P extends ChessProtocolPiece>(
	state: ChessBoardSnapshot<P>,
	action: ChessAction,
): ChessReduceResult<P>;
```

Same signature as today's `applyChessAction` from `@shared/protocol-core/chess`. **One import-path swap in [chessCombatSlice.ts:39](../../client/src/game/stores/combat/chessCombatSlice.ts) flips chess to WASM-backed.** No other call-site changes.

Internally:
1. `isWasmReady()` → if false: `throw new Error('WASM not loaded — chess phase reached before engine bootstrap')`. Treated as a programming bug, not a fallback path. Justification: chess phase only starts after match handshake, which already verifies `engineHash` on both peers (per ADR §Decision.5 Phase 0). WASM-ready by construction.
2. `canonicalChessSnapshot(state)` → canonical input JSON.
3. `wasmApplyChessAction(snapshotJson, actionJson)` → canonical output JSON.
4. `JSON.parse(out)` → typed `ChessReduceResult<P>`.

**Rejected B** (TS fallback when WASM not ready): silent divergence between a TS-fallback peer and a WASM-ready peer would trip false-positive slash. The very problem Phase 1 fixes.

**Rejected C** (async): forces ~739 LOC of slice + every caller into async. Sync click handler → sync reducer is the existing call shape; preserving it minimizes blast radius.

**Rejected D** (delete TS reducer): the TS twin is the contract reference for tests, server-side validation (Phase 4), and the parity assertion in D3. Keep.

**Failure mode**: any throw from the shim bubbles to the slice; today's slice path treats reducer failure as a UI no-op (the click does nothing). Document this invariant in the issue body for the slice swap.

---

## D5 — `chessHash.ts`: no functional change in Phase 1

**Decision**: [client/src/game/engine/chessHash.ts](../../client/src/game/engine/chessHash.ts) stays as written. It already does the right thing for Phase 1:

1. Receives a `ChessBoardSnapshot<P>` (caller-side typed object).
2. Calls `canonicalChessSnapshot(snapshot)` (TS canon, the spec per D3).
3. Calls `hashJsonString(canonical)` (WASM SHA-256, already in `assembly/index.ts:110`).

The slice's working snapshot is always a typed object (parsed from AS output). Canonicalizing it again in TS for the hash is the same canonical string AS would have emitted. No work duplicated semantically; one trivial `canonicalize` call per hash. Optimization (re-use the AS-emitted canonical string directly) is a Phase 2+ micro-opt, not a Phase 1 deliverable.

---

## D8 — Animation/UI seam: invariant preserved, no Phase 1 work

**Decision**: Animation triggers, log emission, EventBus toasts, and mine resolution stay in [chessCombatSlice.ts](../../client/src/game/stores/combat/chessCombatSlice.ts). They diff `prev` vs `next` snapshot returned by the WASM reducer and fire UI side-effects from that diff (per memory `feedback_animations_separated_from_logic`). Because the AS reducer returns the **same** `ChessReduceResult<P>` shape as the TS twin (enforced by D3 parity + D6 parity tests), the diff inputs are unchanged.

**Invariant** (must hold post-Phase 1, asserted in issue body):
- The AS reducer never produces a derived field the TS twin would not.
- The slice never reads engine-internal AS state — only the parsed result.
- New animations introduced after Phase 1 derive from snapshot fields (or fields documented in the slice), never from AS-internal state.

No code work in Phase 1 issues for animation. A short note in the slice-swap issue records the invariant.

---
## D9 — Promotion gate: `npm run smoke:phase1` (mirrors Phase 0 pattern)

**Decision**: Phase 1 → Phase 2 promotion gate is:

```bash
npm run smoke:phase1  # exit 0 required
```

Backed by a new harness at `client/src/game/protocol/phase1.smoke.test.ts` that:

- Runs **100 fuzz seeds**.
- Each seed drives a **60-turn full chess match** between two mock peers, both using the real `engine.wasm` chess reducer through the D4 shim.
- At every turn boundary, asserts:
  1. `canonical(peerA_snapshot) === canonical(peerB_snapshot)` (byte equality).
  2. `sha256(canonical(peerA)) === sha256(canonical(peerB))` (hash equality — derived but tested explicitly to catch hash-binding regressions).
  3. The envelope's `prevChessStateHash` (per Phase 0 transcript) matches the peer's locally computed hash.
- **Gate green** = 0 divergences across 6000 actions × 2 peers.
- **CI matrix**: `smoke:phase0` runs on every PR (existing regression gate) **and** `smoke:phase1` runs on every PR once issue 1 (AS port) lands.
- Phase 0 smoke is NOT modified by Phase 1 work. It stays as the transport+crypto regression gate. (Rejected B for this reason.)
- Closed-beta telemetry is collected post-merge but is **not** part of the merge gate — Phase 2 unlocks on smoke green, not on production telemetry. (Rejected D as gating-overkill; ship-then-patch friendly per memory `feedback_ship_then_patch_strategy`.) Telemetry remains valuable as confidence signal and is captured under "F2: post-Phase-1 hash-divergence dashboard" in the follow-ups list at the bottom of this file.

**Smoke fuzz seeds source**: deterministic seed list embedded in the test file (no `Math.random` at test time). Each seed drives both the move-selection oracle (e.g. always plays the first legal `getValidMoves` candidate, breaking ties by piece id then move destination) AND the per-match initial-piece-id derivation. Two peers fed the same seed must produce identical action sequences. (This is the harness oracle, not gameplay.)

---
## D6 — Test parity: vitest + shared fixture corpus, two adapters

**Decision**: Single test runner (vitest, already used). New artefacts:

```
shared/protocol-core/chess/
  fixtures/                   (NEW)
    01-initial-board.json
    02-pawn-double-step.json
    03-pawn-cannot-jump-allied.json
    04-pawn-attack-diagonal.json
    05-knight-l-shape.json
    06-rook-line-blocked.json
    07-bishop-diagonal-pin.json
    08-queen-multi-direction.json
    09-king-cannot-move-into-check.json
    10-king-in-check-blocks-other-pieces.json
    ...
    50-promote-to-queen-on-far-rank.json
  parity.test.ts              (NEW)
  reducer.test.ts             (existing — TS-only path, KEEP)
  canonicalize.test.ts        (existing — TS canon spec, KEEP)
  chessRules.test.ts          (existing — TS predicates, KEEP)
```

Each fixture is JSON:
```jsonc
{
  "name": "knight-l-shape-from-d1-to-c3",
  "input": { /* canonical ChessBoardSnapshot */ },
  "action": { "kind": "move", "pieceId": "n1", "to": { "row": 2, "col": 2 } },
  "expected": { "ok": true, "state": { /* canonical ChessBoardSnapshot */ } }
}
```

`parity.test.ts` (vitest) for each fixture asserts **three** equalities:

1. `canonicalChessSnapshot(applyChessAction(fixture.input, fixture.action).state) === fixture.expected.state` — TS reducer matches contract.
2. `wasmApplyChessAction(canonical(fixture.input), canonical(fixture.action)) === expected_canonical` — AS reducer matches contract.
3. `canon(ts_out) === as_out` — TS and AS produce byte-equal canonical output.

WASM loaded via the existing `wasmInterface.ts` + `wasmLoader.ts` (same path Phase 0 smoke uses). No new loader code; the parity test re-uses the engine bootstrap from the smoke harness.

**Fixture coverage matrix** (minimum 50 fixtures — distribution captured in `issues/04-parity-fixtures.md` once issues are split):
- All 6 piece types × {move, capture, blocked, edge-of-board}
- King: cannot-move-into-check, blocked by pin, escape-only-square
- Checkmate: fool's mate, back-rank mate, on a 5×7 board
- Promotion: pawn → queen / rook / bishop / knight (and 'not-promotable' rejections)
- Reducer rejection paths: `no-such-piece`, `wrong-turn`, `illegal-target`, `not-promotable`, `game-over`
- `endTurn` from `setup` and `playing` (preserved through D6 invariant)

Existing TS tests stay untouched (they prove the TS contract is the spec). `parity.test.ts` proves the AS implementation honors that spec. The smoke harness (D9) proves the *combination* under a real match flow.

**Rejected B** (`as-pect`): forces a second test runner, second fixture format, drift risk. AS code base is small enough that running it through `@assemblyscript/loader` from vitest is simpler.

**Rejected C** (TS-generated fixtures, AS-only execution at test time): you lose the cross-impl assertion at test time. The contract drift would only be caught at fixture-regeneration time, which is human-triggered and easy to skip.

---
## D7 — Determinism audit: single script, two scopes

**Decision**: Phase 1 ships `scripts/audit-wasm-determinism.mjs` (referenced in ADR §Implementation notes but not yet created). Single script enforces two scope blocks:

### Scope 1 — `assembly/**/*.ts` (AS rules per ADR)

Forbidden:
- New `f32` / `f64` declarations (the mulberry32 PRNG in `assembly/util/seededRng.ts` is the lone whitelist).
- Bare `number` type annotations (AS requires explicit `i32`/`i64`/`u32`/`u64`).
- `Math.random()` (anywhere).
- `Math.*` calls **except** the whitelist `floor` / `max` / `min` (used in seededRng and elsewhere). New whitelist additions require a comment justification.
- `Date.now()`, `performance.now()`, `Date.UTC`, any wall-clock primitive.
- `new Map<>()` without a `// audit: insertion-order required because X` comment.
- `crypto.*`, `globalThis.*`, any host-environment reach.

### Scope 2 — `client/src/game/stores/combat/chess*Slice.ts` (chess hooks deny list)

Forbidden:
- `Math.random()`, `crypto.getRandomValues()`, `crypto.subtle.*` (anything non-seeded).
- `Date.now()`, `performance.now()` — even for animation timing (animation slice is the right home for that).
- `setTimeout` / `setInterval` for state-mutating callbacks (timing-coupled state break determinism).

Allowed in chess slice:
- `Math.floor` / `Math.max` / `Math.min` / `Math.abs` (pure deterministic math).
- The audit script's allowed-list for these is documented inline in the script.

### Execution

- New npm script: `"audit:determinism": "node scripts/audit-wasm-determinism.mjs"`.
- Exit non-zero blocks merge (wired into `pre-commit` and CI).
- Output format: file:line — rule violated — suggestion.
- 7/7 audit (the existing 7 AS Phase 0 rules already pass per project memory `project_game_protocol_v2_adr0004`); Phase 1 expands that to 7/7 AS + N/N chess-hook checks, all must stay green.

**Rejected B** (ESLint for slice): inconsistent tooling between AS and TS sides for the same conceptual rule (determinism boundary). One script keeps the deny-list authoritative and grep-able in one place.

**Rejected C** (AS only, trust TS hooks): a future "add mine-trigger jitter so animations feel less robotic" PR could trivially introduce `Math.random()` in `chessCombatSlice.ts` without tripping any guard. Phase 1 has to close that door at the same time it ports the engine, otherwise the gain is partly undone.

---

## D10 — Issue split: 7 issues, parallel-friendly

**Decision**: Phase 1 ships through 7 self-contained issues under `./issues/`, mirroring Phase 0's 7-issue cadence (commits `ea833fa..439ff28`). Each issue is one revertable commit.

| # | File | Critical path | What ships |
|---|---|---|---|
| 01 | `01-as-chess-port.md` | blocks 02 | `assembly/chess/` six files: types, state, boardSetup, rules, reducer, canonical emit. ~400 LOC AS. Compiles via `asconfig.json` (release+debug). No call sites yet. |
| 02 | `02-wasm-interface-wiring.md` | blocks 03 | `assembly/index.ts` re-exports `applyChessAction`. `client/src/game/engine/wasmInterface.ts` exposes the typed call. No client behavior change. |
| 03 | `03-ts-bridge-and-slice-swap.md` | blocks 04, 06 | New `client/src/game/engine/chessReducer.ts` sync shim (D4). `chessCombatSlice.ts` import-path swap (one line). Animation-seam invariant noted (D8). |
| 04 | `04-parity-fixtures.md` | (parallel after 03) | ≥50 fixtures in `shared/protocol-core/chess/fixtures/`. `parity.test.ts` asserts the three-way equality from D6. |
| 05 | `05-determinism-audit-and-ci.md` | (parallel from start) | `scripts/audit-wasm-determinism.mjs` with D7 two-scope deny lists. `audit:determinism` npm script. **Also scaffolds** `.github/workflows/ci.yml` (D11) with check + lint + lint:css + audit + test + smoke:phase0. |
| 06 | `06-smoke-phase1.md` | needs 03 | `client/src/game/protocol/phase1.smoke.test.ts` (100 seeds × 60 turns bit-identical). `smoke:phase1` npm script. **Appends** smoke:phase1 step to ci.yml. |
| 07 | `07-docs-and-retro.md` | last | `CONTEXT.md` glossary update. ADR 0004 §Decision.5 row already amended in this commit; issue 07 adds the cross-link to the smoke:phase1 gate. `.scratch/game-protocol-v2-phase1/RETRO.md` (post-ship lessons). |

**Critical path** (sequential): 01 → 02 → 03 → (04 ‖ 06) → 07.
**Parallel-friendly**: 05 ships from day 1 (creates `ci.yml` scaffold + audit script — does not depend on 01/02/03). 04 and 06 are parallel after 03.

**Issue body convention** (per each file):
- `**Status**: ready-for-agent` (canonical local status, per [docs/agents/triage-labels.md](../../docs/agents/triage-labels.md)).
- `**Depends on**: <issue numbers>` block at top.
- Decision IDs cited inline (e.g. *"per D2"*) so a reviewer can re-derive the choice from this file.

---

## D11 — Build/CI integration: PR gate via `.github/workflows/ci.yml`

**Decision**: Phase 1 ships `.github/workflows/ci.yml`. Trigger: `pull_request` + `push: branches-ignore: [main]`. Steps:

```yaml
- npm ci
- npm run check          # tsc --noEmit
- npm run lint           # eslint
- npm run lint:css       # stylelint
- npm run audit:determinism   # D7 — two-scope rules
- npm test               # vitest unit + integration suite
- npm run smoke:phase0   # transport+crypto regression gate (439ff28 baseline)
- npm run smoke:phase1   # added by issue 06 once shim lands
```

Workflow scaffold lands in **issue 05** (alongside the audit script). Issue 06 appends the `smoke:phase1` step. Issue 07 documents the merge-gate in CONTEXT.md / ADR cross-link.

Branch protection on `main` (one-time, manual setup outside Phase 1 issues — captured in F3 follow-up below) requires the CI job green to merge. Existing `.github/workflows/deploy.yml` stays as-is (push-to-main → GitHub Pages).

**Pre-commit unchanged**: `lint-staged.config.mjs` keeps its current fast-path (ESLint --fix + CSS dupe checks). Audit script intentionally **does not** run pre-commit — it scans files outside the staged set (cross-file rules), is fast enough in CI, and an additional pre-commit slow-down was rejected per memory `feedback_commit_cadence` (devs shouldn't fight pre-commit).

**Rejected B** (pre-commit only, no CI): doesn't honor ADR's "blocks merge". A force-pushed or rebased branch could land with the audit broken.

**Rejected C** (hybrid): two layers to maintain for the same rule set, no obvious gain.

**Rejected D** (defer): ADR §Implementation notes explicitly says the audit script is part of *this* workstream. Deferring leaves Phase 1 unprotected against a regression in the same cycle.

---

## Open follow-ups (not Phase 1 scope, captured for Phase 2 / post-Phase-1)

- **F1** — Promote `stamina` + `KingDivineCommandState` (mines) into `shared/protocol-core/chess/` so they enter the canonical hash domain. Seeded RNG plumbing for Ginnungagap scatter ([ChessTypes.ts:176](../../client/src/game/types/ChessTypes.ts#L176)) required. Then port to `assembly/chess/`. Either Phase 2 (preferred per ADR) or a mini-Phase-1.5.
- **F2** — Closed-beta dashboard for chess `prevChessStateHash` divergence telemetry. Post-Phase-1, not a merge gate, but a confidence signal before Phase 2 promotion.
- **F3** — Branch-protection rule on `main` requiring `ci.yml` green. Manual GitHub UI action, outside Phase 1 issue scope. Captured here so it isn't forgotten.
- **F4** — Reduce `chessHash.ts` to consume AS canonical output directly (skip re-canonicalize). Micro-optimization; valuable only at high move-rate, which chess doesn't have.

---

## Phase 1 → Phase 2 promotion gate (summary)

A single line: **green `npm run smoke:phase1` and `npm run audit:determinism`** on `main` for ≥3 consecutive commits with chess actions exercised in real (closed-beta) matches.

The smoke harness is the deterministic guarantee. The audit script is the *future* deterministic guarantee (catches the regression you'd otherwise ship on commit N+1). The 3-commit window is the human signal that the system holds under change pressure.


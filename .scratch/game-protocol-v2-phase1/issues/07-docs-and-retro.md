# 07 — Docs + Phase 1-lite retrospective

**Status**: ready-for-agent
**Depends on**: 01, 02, 04, 05, 06 (issue 03 deferred — see D12).
**Blocks**: nothing (Phase 1-lite closes here)
**ADR**: [docs/adr/0004-game-protocol-deterministic-engine.md](../../../docs/adr/0004-game-protocol-deterministic-engine.md)
**Decisions**: [DECISIONS.md](../DECISIONS.md) — all (D1–D12)

---

## Phase 1-lite scope note

Per [D12](../DECISIONS.md#d12--phase-1-lite-defer-runtime-flip-until-post-closed-beta), this issue closes Phase 1-lite, not Phase 1. The CONTEXT.md glossary entry "AS twin" still applies (the AS chess module exists, is exposed, and tracks the TS spec by parity test). The ADR §Decision.5 row was already amended in the D12 commit to reflect the lite scope and add the Phase 1.5 row. RETRO documents the pivot.

---

## Goal

Close out Phase 1: update CONTEXT.md with the glossary terms that surfaced; cross-link ADR §Decision.5 to the new smoke gate; write the Phase 1 RETRO mirroring Phase 0's pattern.

## Why

Phase 0's discipline (per [project_game_protocol_v2_adr0004 memoria](../../../.claude/projects/-root-projects-norse-mythos-card-game/memory/project_game_protocol_v2_adr0004.md)) was: PRD up front, DECISIONS resolved before code, RETRO at the end. Phase 1 follows the same shape. The RETRO captures what was learned in the AS port + what defines "done" for Phase 2 onboarding.

## Files to touch

### MODIFY `CONTEXT.md`

Add a glossary entry under the existing domain-language section (find the alphabetical slot):

```markdown
- **AS twin** — An AssemblyScript module under `assembly/` that structurally mirrors a TypeScript module under `shared/protocol-core/`. Under Phase 1-lite of [ADR 0004](docs/adr/0004-game-protocol-deterministic-engine.md), the AS twin for chess is *built and exposed* but the TS twin remains the *runtime authority* during closed beta; the AS twin is verified continuously against the TS spec via [shared/protocol-core/chess/parity.test.ts](shared/protocol-core/chess/parity.test.ts) on ≥50 fixtures. Phase 1.5 flips runtime authority to the AS twin once the threat-model justifies the work; see [.scratch/game-protocol-v2-phase1/DECISIONS.md D3 + D4 + D12](.scratch/game-protocol-v2-phase1/DECISIONS.md).
```

If a "Phasing" section already exists, append a one-liner pointing at the Phase 1-lite gate:

```markdown
- Phase 1-lite → Phase 1.5 promotion gate: `npm run smoke:phase1` (TS reducer 2-peer determinism) + `npm run audit:determinism` + parity tests all green on `main` for ≥3 consecutive commits with chess actions exercised in real closed-beta matches, plus the threat-model evolution captured in D12.
```

### MODIFY `docs/adr/0004-game-protocol-deterministic-engine.md`

The §Decision.5 table and gate sentences were already amended in the D12 commit (Phase 1-lite + Phase 1.5 rows; Phase 1-lite → Phase 1.5 gate sentence). This issue only needs to **add cross-links to the now-shipped test files** so future readers can land on the spec without searching. Append the parity test + smoke test paths to the Phase 1-lite row's gate-criterion cell:

```diff
- ... | `smoke:phase1` (TS reducer, 2-peer determinism) + `audit:determinism` + `parity.test.ts` (TS↔AS three-way equality) all green |
+ ... | [`npm run smoke:phase1`](../../client/src/game/protocol/phase1.smoke.test.ts) + [`npm run audit:determinism`](../../scripts/audit-wasm-determinism.mjs) + [`parity.test.ts`](../../shared/protocol-core/chess/parity.test.ts) all green |
```

### NEW `.scratch/game-protocol-v2-phase1/RETRO.md`

Mirror Phase 0's RETRO if it exists, else use this template:

```markdown
# RETRO — Game protocol v2 Phase 1-lite

**Shipped**: <date>
**Commits**: <range> (issues 01, 02, 04, 05, 06, 07 — issue 03 deferred per D12)
**Promotion gate**: `npm run smoke:phase1` (TS reducer) + `npm run audit:determinism` + parity tests all green.

## What landed

- `assembly/chess/` AS twin (6 files, ~400 LOC) — built and exposed, dormant in Phase 1-lite.
- `applyChessAction` re-exported across the WASM boundary via `wasmInterface.ts`.
- `shared/protocol-core/chess/fixtures/` + `parity.test.ts` — three-way equality on ≥50 fixtures (TS ↔ AS).
- `shared/protocol-core/chess/canonicalAction.ts` — canonical-form action emitter.
- `scripts/audit-wasm-determinism.mjs` — two-scope deny lists; wired into CI.
- `.github/workflows/ci.yml` — first PR gate workflow in the repo.
- `client/src/game/protocol/phase1.smoke.test.ts` + `smoke:phase1` npm script — 100 seeds × 60 turns bit-identical, **driven by TS reducer**.
- ADR 0004 §Decision.5 amended: Phase 1-lite row + Phase 1.5 row.
- DECISIONS.md D12 + F5 capture the pivot and Phase 1.5 trigger conditions.

## What surprised us

(Fill in post-ship.)

## What we deferred

- **Phase 1.5 runtime flip (F5)** — see [D12](../DECISIONS.md). Re-opens issue 03 with the three grill concerns (rich-field re-merge, entry gate, discriminator check) addressed.
- F1: Promote stamina + mines into protocol-core + AS (Phase 2 or mini-1.5).
- F2: Closed-beta hash-divergence telemetry dashboard.
- F3: Branch-protection rule on `main` (manual GitHub UI action).
- F4: Skip re-canonicalize in `chessHash.ts` by consuming AS canonical output directly (micro-opt).

## Lessons for Phase 2 / Phase 1.5 onboarding

(Fill in post-ship — what was easy, what was hard, what the next AS port should do differently.)
```

## Acceptance criteria

1. `CONTEXT.md` contains the **AS twin** glossary entry and (if applicable) the Phase 1 promotion gate one-liner.
2. ADR 0004 line 124 + line 137 area updated with the smoke + audit cross-links.
3. `.scratch/game-protocol-v2-phase1/RETRO.md` exists with the template above; "What surprised us" and "Lessons" sections filled with at least one bullet each (post-ship review).
4. `npm run check`, `npm run lint`, `npm run lint:css`, `npm run audit:determinism`, `npm run smoke:phase0`, `npm run smoke:phase1` all exit 0 on this commit.
5. The Phase 1 scratch directory (`.scratch/game-protocol-v2-phase1/`) is committed in full (PRD + DECISIONS + 7 issue files + RETRO).
6. Memory entry: append a new bullet to `~/.claude/projects/-root-projects-norse-mythos-card-game/memory/MEMORY.md` pointing at a new `project_game_protocol_v2_phase1_shipped.md` file, mirroring how `project_game_protocol_v2_adr0004.md` was created at Phase 0 close-out.

## Non-goals (for this issue)

- No code-behavior change.
- No new ADR — amendments to existing ADR only.
- No branch-protection-rule API call (F3 follow-up, manual).

## Commit message (suggested)

```
docs(protocol): ADR 0004 issue 07 — Phase 1 close-out + CONTEXT.md + RETRO
```

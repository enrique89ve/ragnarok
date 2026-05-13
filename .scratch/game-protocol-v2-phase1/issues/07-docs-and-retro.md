# 07 — Docs + Phase 1 retrospective

**Status**: ready-for-agent
**Depends on**: 01, 02, 03, 04, 05, 06 (all ship before docs are final)
**Blocks**: nothing (Phase 1 closes here)
**ADR**: [docs/adr/0004-game-protocol-deterministic-engine.md](../../../docs/adr/0004-game-protocol-deterministic-engine.md)
**Decisions**: [DECISIONS.md](../DECISIONS.md) — all (D1–D11)

---

## Goal

Close out Phase 1: update CONTEXT.md with the glossary terms that surfaced; cross-link ADR §Decision.5 to the new smoke gate; write the Phase 1 RETRO mirroring Phase 0's pattern.

## Why

Phase 0's discipline (per [project_game_protocol_v2_adr0004 memoria](../../../.claude/projects/-root-projects-norse-mythos-card-game/memory/project_game_protocol_v2_adr0004.md)) was: PRD up front, DECISIONS resolved before code, RETRO at the end. Phase 1 follows the same shape. The RETRO captures what was learned in the AS port + what defines "done" for Phase 2 onboarding.

## Files to touch

### MODIFY `CONTEXT.md`

Add a glossary entry under the existing domain-language section (find the alphabetical slot):

```markdown
- **AS twin** — An AssemblyScript module under `assembly/` that structurally mirrors a TypeScript module under `shared/protocol-core/` and serves as the *runtime authority* for that domain. The TS twin remains as the *contract reference* (used by tests, server-side validators, fallback paths). The two implementations agree by construction because the AS twin is written to honor the TS twin's canonicalization spec byte-for-byte. First applied to chess in Phase 1 of [ADR 0004](docs/adr/0004-game-protocol-deterministic-engine.md). See [.scratch/game-protocol-v2-phase1/DECISIONS.md](.scratch/game-protocol-v2-phase1/DECISIONS.md) D3 + D4.
```

If a "Phasing" section already exists, append a one-liner pointing at Phase 1's promotion gate:

```markdown
- Phase 1 → Phase 2 promotion gate: `npm run smoke:phase1` green on `main` for ≥3 consecutive commits with chess actions exercised in real closed-beta matches.
```

### MODIFY `docs/adr/0004-game-protocol-deterministic-engine.md`

Phase 1 row in the §Decision.5 table (line 124) already names the gate; add a footnote / cross-link to the smoke test path so future readers can land on the spec without searching:

Locate line 124 and append a footnote-style reference:

```diff
- | **1** | Chess engine to `assembly/chess/`. Cards/poker stay TS. Mixed mode: chess actions cross to WASM, cards stay in TS. | WASM (chess) + TS (cards/poker) | Chess turns bit-identical cross-peer in real matches |
+ | **1** | Chess engine to `assembly/chess/`. Cards/poker stay TS. Mixed mode: chess actions cross to WASM, cards stay in TS. | WASM (chess) + TS (cards/poker) | `npm run smoke:phase1` green ([client/src/game/protocol/phase1.smoke.test.ts](../../client/src/game/protocol/phase1.smoke.test.ts)). Bit-identical cross-peer in real matches confirmed by smoke + per-fixture parity ([shared/protocol-core/chess/parity.test.ts](../../shared/protocol-core/chess/parity.test.ts)). |
```

Also update line 137 (the Phase 0 → Phase 1 gate sentence) if a similar update for Phase 1 → Phase 2 is appropriate — append:

```markdown
**Phase 1 → Phase 2 promotion gate**: `npm run smoke:phase1` must exit 0 on `main`, AND `npm run audit:determinism` must exit 0 (both AS scope + chess-hook scope clean). Phase 2 (cards + poker WASM port) unlocks when these two are green for ≥3 consecutive commits with chess actions exercised in real (closed-beta) matches.
```

### NEW `.scratch/game-protocol-v2-phase1/RETRO.md`

Mirror Phase 0's RETRO if it exists, else use this template:

```markdown
# RETRO — Game protocol v2 Phase 1

**Shipped**: <date>
**Commits**: <range> (issues 01–07)
**Promotion gate**: `npm run smoke:phase1` + `npm run audit:determinism` both green.

## What landed

- `assembly/chess/` AS twin (6 files, ~400 LOC) — runtime authority for chess turns.
- `client/src/game/engine/chessReducer.ts` — sync bridge shim.
- `shared/protocol-core/chess/fixtures/` + `parity.test.ts` — three-way equality on ≥50 fixtures.
- `scripts/audit-wasm-determinism.mjs` — two-scope deny lists; wired into CI.
- `.github/workflows/ci.yml` — first PR gate workflow in the repo.
- `client/src/game/protocol/phase1.smoke.test.ts` + `smoke:phase1` npm script — 100 seeds × 60 turns bit-identical.
- ADR 0004 §Decision.5 + §Implementation notes amended with concrete gate references.

## What surprised us

(Fill in post-ship.)

## What we deferred

- F1: Promote stamina + mines into protocol-core + AS (Phase 2 or mini-1.5).
- F2: Closed-beta hash-divergence telemetry dashboard.
- F3: Branch-protection rule on `main` (manual GitHub UI action).
- F4: Skip re-canonicalize in `chessHash.ts` by consuming AS canonical output directly (micro-opt).

## Lessons for Phase 2 onboarding

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

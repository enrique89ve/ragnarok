# 04 — Parity fixture corpus + `parity.test.ts`

**Status**: ready-for-agent
**Depends on**: 03 (both reducer impls must be runnable side-by-side)
**Blocks**: 07 (RETRO references parity coverage)
**ADR**: [docs/adr/0004-game-protocol-deterministic-engine.md §Decision.5 Phase 1](../../../docs/adr/0004-game-protocol-deterministic-engine.md#5-phasing)
**Decisions**: [DECISIONS.md](../DECISIONS.md) — D3 (canonical-equivalence), D6 (vitest + shared fixtures)

---

## Goal

Prove the AS reducer (issue 01) produces byte-equivalent canonical output to the TS reducer (`shared/protocol-core/chess/reducer.ts`) across a meaningful corpus of chess positions and actions.

## Why

Per D3, the TS canonicalize is the spec; the AS reducer emits canonical-shaped JSON directly. Per D6, the parity test is the line of defence that catches AS-vs-TS drift the moment it appears — *before* a smoke test catches it under a real match flow (issue 06) and long before production telemetry catches it (F2 follow-up).

The three-way equality asserted on every fixture is the contract:

```
ts_canon  = canonicalChessSnapshot(applyChessAction_TS(input, action).state)
as_canon  = wasm.applyChessAction(canonical(input), canonical(action))  // post-OK extracted
expected  = fixture.expected.canonical
assert ts_canon === expected     // TS reducer honors spec
assert as_canon === expected     // AS reducer honors spec
assert ts_canon === as_canon     // they agree
```

## Fixture format

`shared/protocol-core/chess/fixtures/NN-<slug>.json`:

```jsonc
{
  "name": "knight-l-shape-from-knight1-to-c3",
  "description": "white knight moves from b1 (col=0,row=0) to c3 (col=2,row=2)",
  "input": {
    "pieces": [ /* canonical-form ChessProtocolPiece array */ ],
    "currentTurn": "player",
    "gameStatus": "playing",
    "moveCount": 4,
    "inCheck": null
  },
  "action": { "kind": "move", "pieceId": "knight1", "to": { "row": 2, "col": 2 } },
  "expected": {
    "ok": true,
    "canonical": "<exact canonical JSON string of the post-action snapshot>"
  }
}
```

Rejection fixtures use:
```jsonc
{
  "expected": {
    "ok": false,
    "reason": "wrong-turn"
  }
}
```

## Coverage matrix (minimum 50 fixtures)

| Category | Fixture count | Notes |
|---|---|---|
| Pawn moves | 6 | single step, double step (`hasMoved=false`), blocked-by-ally, blocked-by-enemy, diagonal-attack, no-attack-forward |
| Knight | 4 | L-shape × 4 board edges; off-board rejection via `illegal-target` |
| Bishop | 4 | diagonal-open, diagonal-blocked-by-ally, diagonal-capture-enemy, edge-of-board |
| Rook | 4 | line-open, line-blocked-by-ally, line-capture-enemy, edge-of-board |
| Queen | 4 | mixed line + diagonal coverage |
| King | 5 | one-step in 8 directions (sample), cannot-move-into-check, can-escape-check, must-be-captured-by-checkmate-only, illegal-king-capture |
| Captures | 4 | normal capture; capture-out-of-line `illegal-target`; capture-ally `illegal-target`; capture-king attempt rejected |
| Promotion | 4 | pawn → queen success; pawn → rook success; non-pawn rejection `not-promotable`; promote-to-king `not-promotable` |
| Check + checkmate | 6 | `isKingInCheck` true after a move; `isKingInCheck` cleared after a defensive move; checkmate (fool's mate variant on 5×7); pin (move would expose king → filtered from valid moves); discovered check |
| Reducer rejections | 5 | `no-such-piece`; `wrong-turn`; `illegal-target`; `game-over` after `player_wins`; `endTurn` from `setup` and from `playing` |
| Edge cases | 4 | board-edge wrap rejection; identical-position rejection (move to same square); empty pieces array (defensive); both kings present terminal `playing` |

**Total: 50 fixtures**. More are welcome; less is rejected at review.

## Generation strategy (suggested)

1. Hand-author 5–10 canonical-form fixtures to anchor the test.
2. For the remainder: write a one-shot generator script under `scripts/temp/genChessParityFixtures.mjs` that imports the TS reducer + canonicalize, walks a curated list of `(input, action)` pairs, captures the TS output, and writes the JSON file. **Delete the generator script after fixtures are committed** — fixtures are the long-lived artefact, not the generator (per [CLAUDE.md](../../../CLAUDE.md) "Evita escribir scripts directamente si solo se va a ejecutar una vez").
3. Review each fixture's `expected.canonical` for sanity before commit (the generator can produce mathematically valid but semantically uninteresting fixtures).

## Files to touch

- `shared/protocol-core/chess/fixtures/*.json` — NEW, ≥50 files.
- `shared/protocol-core/chess/parity.test.ts` — NEW vitest suite:

  ```ts
  import { describe, it, expect, beforeAll } from 'vitest';
  import { readdirSync, readFileSync } from 'fs';
  import { resolve } from 'path';
  import {
  	applyChessAction as applyTs,
  	canonicalChessSnapshot,
  } from './index';
  import { loadWasmEngine, isWasmReady } from '@/game/engine/wasmLoader';
  import { applyChessActionWasm } from '@/game/engine/wasmInterface';

  beforeAll(async () => {
  	await loadWasmEngine();
  	expect(isWasmReady()).toBe(true);
  });

  const fixturesDir = resolve(__dirname, 'fixtures');
  const fixtures = readdirSync(fixturesDir)
  	.filter(f => f.endsWith('.json'))
  	.map(f => ({ name: f, body: JSON.parse(readFileSync(resolve(fixturesDir, f), 'utf8')) }));

  describe('chess reducer parity (TS twin ↔ AS twin)', () => {
  	for (const fx of fixtures) {
  		it(fx.body.name, () => {
  			const tsResult = applyTs(fx.body.input, fx.body.action);
  			const asOutRaw = applyChessActionWasm(
  				canonicalChessSnapshot(fx.body.input),
  				/* canonicalize fx.body.action — pull from `chessReducer.ts` helper or duplicate */,
  			);
  			if (fx.body.expected.ok) {
  				expect(tsResult.ok).toBe(true);
  				const tsCanon = canonicalChessSnapshot(tsResult.state!);
  				const asParsed = JSON.parse(asOutRaw);
  				expect(asParsed.ok).toBe(true);
  				const asCanon = canonicalChessSnapshot(asParsed.state);
  				expect(tsCanon).toBe(fx.body.expected.canonical);
  				expect(asCanon).toBe(fx.body.expected.canonical);
  				expect(asCanon).toBe(tsCanon);
  			} else {
  				expect(tsResult.ok).toBe(false);
  				expect((tsResult as any).reason).toBe(fx.body.expected.reason);
  				const asParsed = JSON.parse(asOutRaw);
  				expect(asParsed.ok).toBe(false);
  				expect(asParsed.reason).toBe(fx.body.expected.reason);
  			}
  		});
  	}

  	it('non-empty corpus', () => {
  		expect(fixtures.length).toBeGreaterThanOrEqual(50);
  	});
  });
  ```

- The `canonicalAction` helper from issue 03 should be **extracted to a shared util** so the parity test imports it (avoid duplication). Suggested location: `shared/protocol-core/chess/canonicalAction.ts` (NEW).

## Acceptance criteria

1. `shared/protocol-core/chess/fixtures/` contains ≥50 valid fixture files matching the coverage matrix.
2. `shared/protocol-core/chess/parity.test.ts` exists and passes via `npm test`.
3. The three-way equality assertion holds for every fixture.
4. `npm run smoke:phase0` exits 0.
5. `npm run check`, `npm run lint` pass.
6. **No new TS reducer code paths** — the TS reducer behavior is exactly as it was on `439ff28`.

## Non-goals (for this issue)

- No smoke harness (issue 06).
- No CI workflow changes (issue 05).
- No production code changes.

## Commit message (suggested)

```
test(protocol): ADR 0004 issue 04 — chess parity fixtures + three-way assertion
```

## Test files allowlist note

Per [test-files-allowlist memoria](../../../.claude/projects/-root-projects-norse-mythos-card-game/memory/test-files-allowlist.md): `.gitignore` excludes `*.test.ts` globally. Add an explicit `!shared/protocol-core/chess/parity.test.ts` line OR `git add` the new test file explicitly to avoid silent skip.

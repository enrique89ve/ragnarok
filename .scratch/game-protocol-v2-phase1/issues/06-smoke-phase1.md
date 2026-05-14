# 06 — `smoke:phase1` harness (bit-identical cross-peer chess turns, TS reducer)

**Status**: ready-for-agent
**Depends on**: 05 (CI scaffold to append to)
**Blocks**: 07 (RETRO references the gate)
**ADR**: [docs/adr/0004-game-protocol-deterministic-engine.md §Decision.5 Phase 1-lite](../../../docs/adr/0004-game-protocol-deterministic-engine.md#5-phasing) — gate criterion *"Chess turns bit-identical cross-peer in real matches"*
**Decisions**: [DECISIONS.md](../DECISIONS.md) — D9 (smoke:phase1 specification), **D12 (smoke runs against TS reducer under Phase 1-lite; flips to AS shim in Phase 1.5 via single import change)**

---

## Phase 1-lite scope note

Per [D12](../DECISIONS.md#d12--phase-1-lite-defer-runtime-flip-until-post-closed-beta), the harness imports `applyChessAction` from `@shared/protocol-core/chess` (TS reducer) — **not** from `@/game/engine/chessReducer` (the deferred shim). The harness still proves the property the gate cares about — *"chess turns bit-identical cross-peer"* — because the TS reducer is pure (no `Math.random` / `Date.now`) and is the runtime authority during closed beta.

Phase 1.5 will flip the single import line to point at the new shim; the harness body, oracle, seed list, and assertions stay identical. The fixture corpus from issue 04 already proves the AS twin agrees with the TS reducer on ≥50 fixtures, so the Phase 1.5 swap is mechanical.

---

## Goal

Build the Phase 1 → Phase 2 promotion gate: a single `npm run smoke:phase1` command that drives 100 fuzz seeds × 60 chess turns × 2 simulated peers and asserts byte-equal canonical snapshots + matching transcript hashes at every turn boundary.

## Why

Per D9, this is the *only* pre-merge contract that says Phase 1 holds. The parity-fixture test (issue 04) proves the reducers agree on a curated corpus. The smoke harness proves they agree under a *real match flow*: P0 transcript chaining, P0 envelope signing, both peers calling the shim independently, no missed canonicalization step.

The harness mirrors [client/src/game/protocol/phase0.smoke.test.ts](../../../client/src/game/protocol/phase0.smoke.test.ts) (the Phase 0 gate file). Phase 0's smoke stays untouched as a regression gate — Phase 1's smoke is **additive**.

## Module surface

NEW `client/src/game/protocol/phase1.smoke.test.ts`:

```ts
/**
 * phase1.smoke.test.ts — Phase 1 promotion gate.
 *
 * Asserts the engine port to assembly/chess/ produces bit-identical
 * canonical snapshots across two simulated peers, for 100 fuzz seeds
 * × 60 chess turns each. Runs under vitest like phase0.smoke.
 *
 * Promotion gate: this file passing = Phase 2 unlocked.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadWasmEngine } from '@/game/engine/wasmLoader';
// Phase 1-lite: TS reducer is runtime authority. Phase 1.5 will swap this
// single import to `@/game/engine/chessReducer` once the shim ships.
import { applyChessAction } from '@shared/protocol-core/chess';
import {
	canonicalChessSnapshot,
	PLAYER_INITIAL_POSITIONS,
	OPPONENT_INITIAL_POSITIONS,
	PIECE_BASE_STATS,
	type ChessBoardSnapshot,
	type ChessProtocolPiece,
	type ChessAction,
	getValidMoves,
} from '@shared/protocol-core/chess';
import { sha256Hex } from '@/game/engine/wasmInterface'; // exposes the WASM SHA-256 used by chessHash

const SEEDS = 100;
const TURNS_PER_MATCH = 60;

function buildInitialSnapshot(seed: number): ChessBoardSnapshot<ChessProtocolPiece> {
	// Deterministic id-gen from seed (mulberry32 lookalike in TS — seeded test oracle only,
	// NOT used at runtime; seed is the per-match harness oracle).
	const pieces: ChessProtocolPiece[] = [];
	for (const p of PLAYER_INITIAL_POSITIONS) {
		pieces.push({
			id: `p-${p.type}-${p.col}-${p.row}-${seed}`,
			type: p.type,
			owner: 'player',
			position: { col: p.col, row: p.row },
			hasMoved: false,
		});
	}
	for (const p of OPPONENT_INITIAL_POSITIONS) {
		pieces.push({
			id: `o-${p.type}-${p.col}-${p.row}-${seed}`,
			type: p.type,
			owner: 'opponent',
			position: { col: p.col, row: p.row },
			hasMoved: false,
		});
	}
	return { pieces, currentTurn: 'player', gameStatus: 'playing', moveCount: 0, inCheck: null };
}

function selectAction(state: ChessBoardSnapshot<ChessProtocolPiece>, _seed: number): ChessAction | null {
	// Oracle: walk own pieces sorted by id; pick the first piece with any legal move;
	// pick the lex-smallest target (row then col). Deterministic by construction.
	const own = [...state.pieces]
		.filter(p => p.owner === state.currentTurn)
		.sort((a, b) => (a.id < b.id ? -1 : 1));
	for (const piece of own) {
		const { moves, attacks } = getValidMoves(piece, state.pieces);
		const all = [...moves, ...attacks].sort((a, b) =>
			a.row !== b.row ? a.row - b.row : a.col - b.col,
		);
		if (all.length === 0) continue;
		const to = all[0];
		const victim = state.pieces.find(p => p.position.row === to.row && p.position.col === to.col);
		if (victim && victim.owner !== piece.owner) {
			return { kind: 'capture', attackerId: piece.id, victimId: victim.id, to };
		}
		return { kind: 'move', pieceId: piece.id, to };
	}
	return null; // stalemate; harness moves on
}

describe('Phase 1 smoke: bit-identical chess turns cross-peer', () => {
	beforeAll(async () => {
		await loadWasmEngine();
	});

	for (let seed = 0; seed < SEEDS; seed++) {
		it(`seed ${seed} — 60 turns × 2 peers, byte-equal canonical`, () => {
			let snapA = buildInitialSnapshot(seed);
			let snapB = buildInitialSnapshot(seed);
			expect(canonicalChessSnapshot(snapA)).toBe(canonicalChessSnapshot(snapB));

			for (let t = 0; t < TURNS_PER_MATCH; t++) {
				const action = selectAction(snapA, seed);
				if (!action) break; // stalemate path; gate still green

				const resA = applyChessAction(snapA, action);
				const resB = applyChessAction(snapB, action);
				expect(resA.ok).toBe(true);
				expect(resB.ok).toBe(true);

				if (resA.ok && resB.ok) {
					const canonA = canonicalChessSnapshot(resA.state);
					const canonB = canonicalChessSnapshot(resB.state);
					expect(canonA).toBe(canonB); // bit-equal across peers
					expect(sha256Hex(canonA)).toBe(sha256Hex(canonB)); // hash-equal (derived but tested)
					snapA = resA.state;
					snapB = resB.state;
				}

				if (snapA.gameStatus !== 'playing' && snapA.gameStatus !== 'setup') break;
			}
		});
	}
});
```

### Notes on the harness oracle

- `selectAction` is **the test oracle**, not gameplay AI. Its determinism is what makes seed → action sequence reproducible. It does not represent how a real player picks moves.
- Both peers receive the **same** action sequence (the test simulates the WS relay delivering the same signed envelope to both). This is the contract: same action → bit-equal output. If the AS reducer ever produces a different snapshot from the same action across peers, the gate fails.
- The 100-seed budget × 60 turns × 2 reducer calls = 12 000 individual reducer invocations. Smoke-time target on CI: < 30 s. If it exceeds 60 s, reduce `TURNS_PER_MATCH` or `SEEDS` — but never both at once (preserve coverage).

## Files to touch

- `client/src/game/protocol/phase1.smoke.test.ts` — NEW.
- `package.json` — add npm script:
  ```json
  "smoke:phase1": "vitest run client/src/game/protocol/phase1.smoke.test.ts",
  ```
  (Adjacent to `smoke:phase0`.)
- `.github/workflows/ci.yml` — append a step **after** the existing `smoke:phase0` step:
  ```yaml
      - run: npm run smoke:phase1
  ```

## Acceptance criteria

1. `npm run smoke:phase1` exits 0 locally on the post-issue-05 tree (CI scaffold in place; TS reducer is authority).
2. `npm run smoke:phase1` exits 0 in CI on every PR after this issue lands.
3. Injecting a deliberate TS reducer non-determinism (e.g. `if (Math.random() > 0.5) state.currentTurn = 'opponent'`) causes the smoke to fail clearly on the first turn boundary of seed 0 — verify locally before commit, then revert the injection. Under Phase 1.5 the same test would inject the equivalent into the AS reducer; the gate semantics are identical.
4. `npm run smoke:phase0` still exits 0 (regression gate).
5. The harness runs in < 60 s on CI (the existing CI runner spec, no special hardware).

## Test files allowlist note

Per [test-files-allowlist memoria](../../../.claude/projects/-root-projects-norse-mythos-card-game/memory/test-files-allowlist.md): explicitly add `!client/src/game/protocol/phase1.smoke.test.ts` to `.gitignore`'s allowlist OR `git add` the file — same pattern Phase 0 used for `phase0.smoke.test.ts`.

## Non-goals (for this issue)

- No new gameplay logic.
- No real WS relay loop in the harness — both peers share the same in-process state. WS-flow is Phase 0's smoke domain.
- No production telemetry instrumentation (F2 follow-up).

## Commit message (suggested)

```
feat(protocol): ADR 0004 issue 06 — smoke:phase1 promotion gate
```

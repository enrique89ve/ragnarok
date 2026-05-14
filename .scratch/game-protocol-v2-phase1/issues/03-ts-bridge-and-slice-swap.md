# 03 — TS bridge shim + `chessCombatSlice` import swap

**Status**: **DEFERRED to Phase 1.5 (post-beta)** — see [DECISIONS.md D12](../DECISIONS.md).
**Depends on**: 02 (WASM surface must exist) — already shipped (`1fa4247`).
**Blocks**: nothing in Phase 1-lite. Original blockers (04, 06) reframed to use TS reducer.
**ADR**: [docs/adr/0004-game-protocol-deterministic-engine.md §Decision.5 Phase 1](../../../docs/adr/0004-game-protocol-deterministic-engine.md#5-phasing)
**Decisions**: [DECISIONS.md](../DECISIONS.md) — D4, D5, D8 (original) + **D12 (pivot rationale)**.

---

## Why deferred

Grill on `2026-05-13` surfaced two HIGH-risk concerns and one MED-risk concern in the runtime flip:

1. **Rich-field loss at slice seam (HIGH)** — AS reducer round-trips only `ChessProtocolPiece` fields (5 keys). Rich client fields (`heroClass`, `health`, `element`, `stamina`, `heroName`, `heroId`, `fixedCards`, `hasSpells`) are dropped on every action. Silent `NaN`/`undefined` propagation through `incrementAllStamina` → `checkAndTriggerMine` → `updatePieceStamina`. Not caught by acceptance criterion 4 (5-move smoke). Mitigation: re-merge by `id` inside the shim (~5 LOC). Workable but adds a layer of implicit contract.

2. **`isWasmReady()` throw vs caller paths (HIGH)** — D4 mandates throw. Verified caller paths in `useChessBoardInteractions.ts` (UI click) and `useWireSync.ts:1124` (peer message) have no try/catch. Throw poisons wire-sync queue mid-match. Mitigation: coordinator-level entry gate + wire-sync try/catch. Workable but expands blast radius beyond the 1-line swap.

3. **`as ChessReduceResult<P>` trust boundary (MED)** — bare cast across WASM→TS boundary; technically violates [hive-payload-canon](../../../.claude/projects/-root-projects-norse-mythos-card-game/memory/hive-payload-canon.md). Mitigation: discriminator check (5 LOC).

Aggregate mitigation is ~15 LOC of shim work + entry-gate + wire-sync try/catch + extra acceptance criteria + manual smoke covering stamina/health post-roundtrip. **None of this is necessary for closed-beta threat model**:

- TS reducer at `shared/protocol-core/chess/reducer.ts` is pure (no `Math.random` / `Date.now`) — two peers with the same commit produce byte-identical output.
- `chessHash.ts:39` already canonicalizes + hashes the snapshot; `prevChessStateHash` rides every chess envelope (Phase 0 wire transcript).
- A peer who patches their TS reducer to accept an illegal move computes a snapshot the *remote* peer will reject under its own unpatched TS reducer → hash divergence detected immediately by wire-sync (already shipped).
- Tampering scenarios that require the AS binary as a second line of defence (e.g. patcher modifies TS but replicates correct output) are not the closed-beta threat surface — invited players, known identities.

What we gain by flipping in Phase 1-lite: marginal defence against an elaborate tampering pattern that is not the closed-beta threat. What we risk: shipping a NaN-stamina bug or wire-sync poisoning into the launch.

The runtime flip ships in **Phase 1.5** (post-closed-beta), when the threat model justifies the work and there is time to address concerns 1–3 deliberately rather than under launch pressure.

---

## What stays from this issue's research

- `assembly/chess/` is built and `applyChessAction` is exposed across the WASM boundary (issues 01 + 02, shipped). Binary is ready for Phase 1.5 flip.
- The shim file `client/src/game/engine/chessReducer.ts` is **NOT created** in Phase 1-lite — adding it now would expose an unused code path and tempt premature swap.
- The slice keeps its current import (`applyChessAction` from `@shared/protocol-core/chess`).
- Issues 04 (parity), 05 (audit), 06 (smoke) reframe to validate the TS reducer path while the AS twin sits dormant.

## Original spec (Phase 1.5 reference)

The original spec for this issue (prior to the pivot) is preserved below for Phase 1.5 implementers. **Do not implement on `main` during Phase 1-lite.**

---

## Goal

Flip chess's runtime reducer from TS to WASM via a single import-path swap in [chessCombatSlice.ts](../../../client/src/game/stores/combat/chessCombatSlice.ts). The slice's call sites remain unchanged — same function signature, same `ChessReduceResult<P>` typed result, same sync behavior.

## Why

Per D4, the bridge contract is a sync wrapper that throws when WASM is not loaded (treated as a programming bug, not a fallback — the matchmaking handshake from Phase 0 guarantees `engineHash` is verified before chess phase starts, so WASM-ready by construction). Per D8, animations + log + EventBus + mine resolution stay in the slice and diff `prev` vs `next` snapshot returned by the reducer; the AS reducer returns the same `ChessReduceResult<P>` shape (enforced by D6 parity tests in issue 04), so the seam holds.

## Files to touch

### NEW `client/src/game/engine/chessReducer.ts`

```ts
/**
 * chessReducer.ts — Phase 1 WASM-backed chess reducer.
 *
 * Same signature as `applyChessAction` from `@shared/protocol-core/chess`,
 * but executes inside `engine.wasm` (assembly/chess/reducer.ts). The TS
 * twin in shared/ stays as the contract reference + test oracle (D4 + D6).
 *
 * Failure mode: throws if WASM is not yet loaded. By construction this
 * can only happen if the chess phase is reached before the matchmaking
 * handshake completes — a programming bug, not a fallback.
 */

import type {
	ChessAction,
	ChessReduceResult,
	ChessBoardSnapshot,
	ChessProtocolPiece,
} from '@shared/protocol-core/chess';
import { canonicalChessSnapshot } from '@shared/protocol-core/chess';
import { isWasmReady, applyChessActionWasm } from './wasmInterface';

function canonicalAction(action: ChessAction): string {
	// Hand-write the canonical form so it matches AS's parser exactly.
	// (Object.keys order from JSON.stringify is engine-defined; we don't
	//  rely on it.) Field order: alphabetical.
	switch (action.kind) {
		case 'move':
			return '{"kind":"move","pieceId":' + JSON.stringify(action.pieceId)
				+ ',"to":{"col":' + String(action.to.col)
				+ ',"row":' + String(action.to.row) + '}}';
		case 'capture':
			return '{"attackerId":' + JSON.stringify(action.attackerId)
				+ ',"kind":"capture","to":{"col":' + String(action.to.col)
				+ ',"row":' + String(action.to.row) + '}'
				+ ',"victimId":' + JSON.stringify(action.victimId) + '}';
		case 'promote':
			return '{"kind":"promote","pieceId":' + JSON.stringify(action.pieceId)
				+ ',"to":' + JSON.stringify(action.to) + '}';
		case 'endTurn':
			return '{"kind":"endTurn"}';
	}
}

export function applyChessAction<P extends ChessProtocolPiece>(
	state: ChessBoardSnapshot<P>,
	action: ChessAction,
): ChessReduceResult<P> {
	if (!isWasmReady()) {
		throw new Error(
			'WASM not loaded — chess phase reached before engine bootstrap. '
			+ 'Matchmaking handshake should have verified engineHash first.',
		);
	}
	const snapJson = canonicalChessSnapshot(state);
	const actJson = canonicalAction(action);
	const out = applyChessActionWasm(snapJson, actJson);
	// Parse without re-canonicalizing — AS already emits canonical form (D3).
	return JSON.parse(out) as ChessReduceResult<P>;
}
```

### MODIFY `client/src/game/stores/combat/chessCombatSlice.ts`

One-line change at the import block (currently around [line 39](../../../client/src/game/stores/combat/chessCombatSlice.ts#L39)):

```diff
- import { applyChessAction, type ChessAction, type ChessReduceResult }
-   from '@shared/protocol-core/chess';
+ import { applyChessAction } from '@/game/engine/chessReducer';
+ import type { ChessAction, ChessReduceResult } from '@shared/protocol-core/chess';
```

That's it. The four `applyChessAction(...)` call sites ([:234, :286, :417, :595](../../../client/src/game/stores/combat/chessCombatSlice.ts)) are unchanged.

### Add invariant comment at top of `chessCombatSlice.ts` (just below the file's leading docstring)

```ts
/**
 * Phase 1 invariant (per .scratch/game-protocol-v2-phase1/DECISIONS.md D8):
 * Animations, log emission, EventBus toasts, and mine resolution diff
 * `prev` vs `next` ChessBoardSnapshot returned by applyChessAction.
 * Never read engine-internal AS state. New animations must derive from
 * snapshot fields or slice-local computed state — not from AS internals.
 */
```

## Acceptance criteria

1. New file `client/src/game/engine/chessReducer.ts` exists with the API above.
2. `chessCombatSlice.ts` imports `applyChessAction` from `@/game/engine/chessReducer` (not from `@shared/protocol-core/chess`).
3. The invariant comment is present in `chessCombatSlice.ts`.
4. **Manual smoke (single match)**: start a Skirmish chess match → make 5 moves including 1 capture and 1 check → verify:
   - Pieces move correctly on screen.
   - Check toast fires when king attacked.
   - Capture animation fires.
   - Mine triggers still fire (King Divine Command system, [chessCombatSlice.ts:255-264](../../../client/src/game/stores/combat/chessCombatSlice.ts)).
   - End-of-turn stamina recompute still fires.
5. `npm run check`, `npm run lint`, `npm run lint:css` pass.
6. `npm run smoke:phase0` exits 0.
7. **The TS reducer in `shared/protocol-core/chess/reducer.ts` is NOT removed** — it stays as the contract reference for parity tests in issue 04 (D4 rationale).

## Failure-mode verification

In a dev console, with WASM not yet loaded, attempting a chess move should throw the `'WASM not loaded'` error visibly (not silently no-op). Verify by adding `await new Promise(r => setTimeout(r, 100_000))` somewhere in the WASM boot path locally + observing the error — then remove before commit. This validates the throw path is reachable and clear.

## Non-goals (for this issue)

- No new tests — parity tests are issue 04, smoke is issue 06.
- No change to `chessHash.ts` (per D5).
- No animation rewrites — the seam is preserved.
- No removal of the TS reducer file.

## Commit message (suggested)

```
feat(protocol): ADR 0004 issue 03 — chess reducer runs via WASM in production
```

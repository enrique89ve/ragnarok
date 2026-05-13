# 03 — TS bridge shim + `chessCombatSlice` import swap

**Status**: ready-for-agent
**Depends on**: 02 (WASM surface must exist)
**Blocks**: 04 (parity tests assume the shim is canon), 06 (smoke uses the shim's flow)
**ADR**: [docs/adr/0004-game-protocol-deterministic-engine.md §Decision.5 Phase 1](../../../docs/adr/0004-game-protocol-deterministic-engine.md#5-phasing)
**Decisions**: [DECISIONS.md](../DECISIONS.md) — D4 (sync contract, no fallback), D5 (chessHash unchanged), D8 (animation seam invariant)

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

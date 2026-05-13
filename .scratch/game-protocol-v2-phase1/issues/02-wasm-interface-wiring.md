# 02 — WASM interface wiring for `applyChessAction`

**Status**: ready-for-agent
**Depends on**: 01 (AS module must exist)
**Blocks**: 03 (TS shim imports the typed call), 04 (parity test loads via this surface), 06 (smoke loads via this surface)
**ADR**: [docs/adr/0004-game-protocol-deterministic-engine.md §Decision.5 Phase 1](../../../docs/adr/0004-game-protocol-deterministic-engine.md#5-phasing)
**Decisions**: [DECISIONS.md](../DECISIONS.md) — D2 (JSON-string boundary), D4 (sync contract)

---

## Goal

Make the AS-side `applyChessAction` exported by issue 01 reachable from TypeScript via the existing WASM loader infrastructure. No client behavior change yet — only the wire surface and types.

## Why

Issue 01 produces an AS module that compiles, but its export is invisible to the TS bridge until [assembly/index.ts](../../../assembly/index.ts) re-exports it and [client/src/game/engine/wasmInterface.ts](../../../client/src/game/engine/wasmInterface.ts) exposes a typed call. Splitting this from issue 01 keeps each commit small + reviewable + revertable on its own.

## Files to touch

- `assembly/index.ts` — add re-export of `applyChessAction` from `./chess/reducer`. Mirror the existing block style (e.g. the `Poker exports` block at lines 30–43). Add a section header comment so the chess block is grep-able.

  ```ts
  // Chess exports (Phase 1 — geometry-only)
  export { applyChessAction } from './chess/reducer';
  ```

- `client/src/game/engine/wasmInterface.ts` — add a typed wrapper that:
  1. Calls into the loader-bound `applyChessAction(snapshotJson: string, actionJson: string): string`.
  2. Returns the raw string. **Do not parse here** — parsing is the TS shim's concern (issue 03) because the parse boundary defines the typed `ChessReduceResult<P>` contract, and that type lives in `shared/protocol-core/chess`.

  ```ts
  export function applyChessActionWasm(
  	snapshotJson: string,
  	actionJson: string,
  ): string {
  	const fn = loader.exports.applyChessAction;
  	if (!fn) throw new Error('WASM applyChessAction not exported — rebuild engine.wasm');
  	return fn(snapshotJson, actionJson) as string;
  }
  ```

- `client/src/game/engine/wasmLoader.ts` — verify the new export is listed in the typed `Exports` interface (if such an interface exists; if not, no change). Run `npm run check` to confirm no TS errors.

## Acceptance criteria

1. `assembly/index.ts` re-exports `applyChessAction` from `./chess/reducer`.
2. The WASM module rebuilds and `getEngineVersion()` (existing) still returns its current value — no engine-version bump for this issue (the wire surface gained an export but no behavior changed).
3. `client/src/game/engine/wasmInterface.ts` exports a `applyChessActionWasm(snapshotJson, actionJson): string` function with strict types.
4. `npm run check` passes.
5. `npm run smoke:phase0` exits 0 (regression gate).
6. **No call sites in `client/src/` invoke `applyChessActionWasm` yet** — that is issue 03. Issue 02 is wire-surface-only.

## Non-goals (for this issue)

- No new TS shim file (`chessReducer.ts`) — issue 03.
- No change to `chessCombatSlice.ts` — issue 03.
- No new tests — parity tests are issue 04.

## Commit message (suggested)

```
feat(protocol): ADR 0004 issue 02 — expose applyChessAction across WASM boundary
```

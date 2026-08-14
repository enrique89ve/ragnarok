# ADR 0004 — Game protocol separation + deterministic engine boundary

**Status**: Accepted
**Date**: 2026-05-13
**Deciders**: enrique
**Supersedes**: RAGNAROK_PROTOCOL_V1.md §14 entry "Protocol-id split into multiple namespaces" (as a non-goal)

> **Current testnet qualification (2026-08-13):**
> [ADR 0007](./0007-p2p-gameplay-only-testnet.md) defers this ADR's
> Hive-authorized session keys, `match_anchor`, signed action envelopes,
> `session_renewal`, result signing and settlement. Current P2P testnet matches
> use server-notarized phase checkpoints, produce a local result and open no
> match-driven Keychain prompt. The design below remains the future ranked
> settlement target.

---

## Context

The current architecture (post-Eitr v1) mixes two distinct concerns under one Hive protocol id (`ragnarok-cards`):

1. **Economy** — NFT lifecycle, balances (RUNE, Eitr), packs, forge, transfers, marketplace, DUAT airdrop, level_up.
2. **Match lifecycle** — `match_anchor`, `match_result`, `queue_join`/`queue_leave`, `slash_evidence`.

The two have completely different update cadences, validation complexity, and audit consumers:

| Aspect | Economy | Match |
|---|---|---|
| Cadence | Sparse (player-triggered actions) | Bursty during a match, then idle |
| Validation | State-machine over storage | Engine replay over signed envelope |
| Trust model | Chain = source of truth per op | Chain = finality only; engine off-chain |
| Audit consumers | Wallets, explorer, marketplace | Game client, dispute resolver |

The future ranked-settlement model assumed here is explicit: **the server is not
a mediator that synchronizes mid-match between peers — it is an arbiter that
validates the final envelope and resolves disputes**. Peers run the game state
machine locally and exchange moves via the WS relay (`/ws/p2p`). In that future
model the winner broadcasts `match_result` and contradictions open a slash
window. ADR 0007 does not activate either behavior in the current testnet.

For this model to be honest, two architectural invariants must hold:

- **A**: Both peers reach bit-identical state at every turn from the same input sequence (deterministic engine).
- **B**: The server can re-derive the disputed state from public inputs alone (engine is portable peer↔server).

Today neither holds cleanly. The game engine lives in TypeScript `gameStore.ts` + `unifiedCombatStore.ts`, mixed with React effects (`RagnarokGameCoordinator.tsx` owns the `useEffect` that detects game_over). Per the deterministic-engine audit:

- TS engine has React lifecycle coupling — win-detection in a `useEffect`, phase guards scattered across components.
- `applyAction` in `assembly/engine/actionProcessor.ts` exists in AssemblyScript source but was partially wired in the historical `wasm-engine-stub` audit.
- Chess engine is **0% in WASM**: all chess mutations live in `unifiedCombatStore.boardState` TypeScript.
- Per-turn `hash_check` already runs between peers via WASM (`computeStateHash`), but if engines diverge, this triggers false-positive slash because the verifier is deterministic and the mutator is not.

Net effect: P2P slash today can punish a peer whose browser ran the same intent slightly differently — engine bug, not cheating.

---

## Decision

Adopt a four-piece architectural shift, sequenced as phases A–E. The shift can be summarized as:

> **The game is its own protocol, with its own deterministic engine, separate from the economy. The server arbitrates final envelopes; it does not mediate matches.**

### 1. Two-protocol split

Introduce a second Hive `custom_json` namespace:

| Protocol id | Owns | Trust model |
|---|---|---|
| `ragnarok-cards` (existing) | NFT lifecycle, ledgers, packs, forge, transfers, marketplace, DUAT, level_up | Chain = source of truth per op |
| `ragnarok-match` (new) | `match_anchor`, `match_result`, `queue_join`/`queue_leave`, `slash_evidence`, `turn_commit` (future, dispute-only) | Chain = finality only |

Cross-link is by content hash, not protocol coupling:

```
match_result {
  matchId, winner, transcriptRoot, deckHashes, anchoredKeys, sigs {alice, bob}
}
```

The `ragnarok-cards` indexer observes valid `match_result` events from `ragnarok-match` and credits RUNE/CardXP. Slash events on the match side trigger reversal on the cards side. Each protocol can be indexed independently.

### 2. WASM engine boundary

The `assembly/` AssemblyScript module becomes the **single source of truth for game-state mutation**.

Public surface from WASM:
- `applyAction(state, action, matchSeed) → { state', stateHash, success, error }` — pure deterministic state transition.
- `computeStateHash(state) → string` — already exists, kept.
- Constructors (`createGameState`, `createPlayer`, `createCardInstance`) — already exist.

Public surface from TypeScript:
- UI state in `gameStore.ts` (selected card, hovered card, animations, modals).
- Action call-throughs that hand the move payload to WASM and accept the new state.
- Subscribers that react to state-hash changes (animation triggers, notifications).

The forbidden coupling — TypeScript mutating game-state fields directly — disappears entirely. `gameStore` actions that today mutate `gameState.players[X].health` will instead call `applyAction(state, { type: 'attack', ... })` and replace `gameState` with the engine's return value.

### 3. Server-as-arbiter (not mediator)

Server's responsibilities for matches:

- Index `match_anchor` / `match_result` / `slash_evidence` ops as today.
- Validate envelope signatures (already exists).
- On slash: import the same `.wasm` binary via `@assemblyscript/loader`, run `applyAction` on the disputed turn alone, compare the resulting state hash against what the offender signed. Mismatch → slash.

Server **does NOT** replay turns mid-match. Server **does NOT** synchronize peers. Server **does NOT** track per-turn state. The WS relay (`/ws/p2p`) continues to be a dumb fan-out; game state never reaches it as protocol payload — peers exchange signed moves.

### 4. AssemblyScript as engine language

This is an evidenced choice, not a tradition. The existing `assembly/` source passes a 7/7 determinism audit:

| Discipline check | Result |
|---|---|
| Sized integers (`i32`/`i64`/`u32`/`bool`) | 302 declarations, 0 bare `number` |
| `Math.random` | 0 occurrences |
| `Math.sqrt`/`pow`/trig (float, NaN-risk) | 0 occurrences |
| `Date.now` / `performance.now` | 0 occurrences |
| Seeded RNG (mulberry32, cross-verified TS twin) | Present, used |
| `Map`/`Set` iteration order | 3 `Map<i32, i32>` (poker eval, cardRegistry) — AS spec guarantees insertion-order iteration |
| TODO/FIXME/stub markers | 0 |

The team has already established the discipline. Migration is closing the chess gap, not changing language.

Alternatives explicitly rejected (see §Rejected alternatives below):
- Pure TypeScript engine in `shared/protocol-core/match/` — loses compile-time determinism enforcement.
- Rust → WASM — ditches existing AS investment; steeper team learning curve.
- Custom IR / data-driven interpreter — maintenance burden for complex card effects.
- Status quo with hash check only — produces false-positive slash.

### 5. Phasing

**Historical ranked-settlement phasing**: this sequence puts the **transport +
crypto + protocol infrastructure first** (Phase 0, sin WASM) and migrates the
engine to WASM second (Phases 1–2). ADR 0007 now defers Phase 0 settlement
activation until after the gameplay-only testnet track. The full WASM migration
is **not required** to test the current P2P gameplay model.

| Phase | Scope | Engine | Test gate before next |
|---|---|---|---|
| **0** | Transport + crypto + protocol (NO engine changes). Build ephemeral session keys (WebCrypto Ed25519 non-extractable), per-action signed transcript, Merkle root tracker, server pending queue + witness sig, slash window logic, session_renewal flow, action log persistence in IndexedDB. Extend `match_anchor` to carry `engineHash` + `cardRegistryHash`. | TS gameStore (unchanged) | P2P protocol smoke: signed actions flow end-to-end, false-positive slash measurable, session_renewal works on reload |
| **1-lite** | Chess engine ported to `assembly/chess/` and exposed via `wasmInterface`, **but the runtime authority remains the TS reducer** for closed beta (`shared/protocol-core/chess/reducer.ts`). Parity tests (TS↔AS), determinism audit, CI gate, and TS-driven smoke ship. Runtime flip deferred to Phase 1.5 — see [.scratch/game-protocol-v2-phase1/DECISIONS.md D12](../../.scratch/game-protocol-v2-phase1/DECISIONS.md#d12--phase-1-lite-defer-runtime-flip-until-post-closed-beta). | TS (chess + cards/poker), with WASM chess binary ready and verified | `smoke:phase1` (TS reducer, 2-peer determinism) + `audit:determinism` + `parity.test.ts` (TS↔AS three-way equality) all green |
| **1.5** (post-closed-beta) | Flip chess runtime authority from TS to WASM via `client/src/game/engine/chessReducer.ts` shim. Resolves the three grill concerns captured in D12 (rich-field re-merge in shim, entry-gate `isWasmReady` assertion, discriminator check on parse). | WASM (chess) + TS (cards/poker) | Chess turns bit-identical cross-peer in real matches; no stamina/health regression post-roundtrip |
| **2** | Cards + poker complete in `assembly/engine/`. ~13 reachable stubs → IMPLEMENTED. Bridge TS↔WASM unifies. | WASM (all) + TS (UI shell only) | False-positive slash rate drops to ~zero |
| **3** | Protocol id split: `match_anchor` / `match_result` / `queue_*` / `slash_evidence` move to `ragnarok-match`. Server indexer routes by protocol id. `chainState.ts` splits into `economyState.ts` + `matchState.ts`. | — | Pre-mainnet only |
| **4** (post-mainnet) | Server-side WASM runtime for slash arbitration. `slash_evidence` handler imports `@assemblyscript/loader` and re-derives disputed turn. | — | Slash becomes cryptographically grounded |

**Why this order**:
- Phase 0 tests the protocol design (signed actions, transcript, session keys, queue) under the existing TS engine. If the protocol breaks at this stage, you discover it before paying the WASM rewrite cost.
- Phase 1 tests determinism on one engine slice (chess) without touching the rest. If chess WASM diverges from TS, you can compare directly during the mixed-mode window.
- Phase 2 closes the loop. By this point the protocol is proven and engine porting is mechanical.
- Phase 3 is the bureaucratic split — last because moving op namespace breaks clients and should be aligned with a deploy window.

**Duration estimate**: 8–11 weeks total with explicit test gates between phases. Phase 0 alone (3–4 weeks) is sufficient for closed beta if false-positive slash is acceptable in low-stakes ranked.

**Phase 0 → Phase 1 promotion gate**: `pnpm run smoke:phase0` must exit 0. The harness (`client/src/game/protocol/phase0.smoke.test.ts`) drives a 60-turn mock match through session_authorize + signed transcript + encrypted action log + session_renewal + server pending queue, with a stub engine. It asserts envelope integrity, prevHash chaining, Merkle root convergence, renewal idempotency, queue TTL, and the Keychain prompt budget (1 at start per peer, 0 mid-match). Green light = the protocol design holds end-to-end without an engine; Phase 1 (chess → WASM) is unlocked.

**Phase 1-lite → Phase 1.5 promotion gate** (per [.scratch/game-protocol-v2-phase1/DECISIONS.md D12](../../.scratch/game-protocol-v2-phase1/DECISIONS.md#d12--phase-1-lite-defer-runtime-flip-until-post-closed-beta)): `smoke:phase1` (TS reducer 2-peer determinism), `audit:determinism`, and `parity.test.ts` (TS↔AS canonical equality on ≥50 fixtures) all green on `main` for ≥3 consecutive commits with chess actions exercised in real closed-beta matches, plus the threat-model evolution captured in D12. When met, Phase 1.5 (runtime flip — original Phase 1 scope) is unlocked.

### 6. Reconnect & recovery

The ephemeral session key pattern (Decision §3) creates a recovery surface: if the peer's tab dies, the privkey dies with it. Five distinct scenarios, all of which must be handled before mainnet:

| # | Scenario | Memory | Privkey | Strategy |
|---|---|---|---|---|
| A | Network drop (wifi off, mobile change) | Intact | Lives | WS reconnect with exponential backoff |
| B | Tab reload (F5) | Cleared | **Dead** | `session_renewal` flow with 1 Keychain prompt |
| C | Browser crash | Cleared | Dead | Same as B |
| D | Out-of-memory (browser kills tab) | Cleared | Dead | Same as B |
| E | Mobile sleep / background | Cleared (eventually) | Dead | Same as B + grace period |

#### A. Network drop

```
T+0     connection drops
T+0–10s client retries WS connect silently (exp backoff)
T+10s   silent retry fails → toast "Reconnecting..."
T+10–60s continued retries with user-visible toast
T+60s   if still failing, treat as scenarios B-E (lost session)
```

Opponent sees quietness but does NOT declare forfeit until 90s (per §5 hybrid model).

#### B-E. Lost session (privkey gone)

```
T+0     tab reload / crash / OOM kill
T+0–30s tab loads, app boots
        app queries chain: getActiveMatchForAccount(myAccount) → matchId
        if matchId exists AND match not finalized:
          show modal "Resume active match? (requires re-auth)"

T+30–60s user clicks resume:
        client.generateNewEphemeralKeypair() → newPubkey
        Hive Keychain Posting prompt: sign 'session_renewal authorizing newPubkey for matchId X'
        client WS→ opponent: { type: 'session_renewal', matchId, newPubkey, hiveSig }

T+60–90s opponent verifies:
        - hiveSig matches the account on file in match_anchor
        - matchId is current active match
        - no overlapping renewals (latest valid Hive sig wins)
        opponent accepts → updates opponent_pubkey in memory
        opponent WS→ peer: { type: 'session_resumed', lastSeenStateHash }

T+90s+  peer reconstructs match state:
        - Option A: replay from IndexedDB action log (if persistence enabled)
        - Option B: state_sync_request from opponent → opponent sends signed state snapshot
        - peer verifies state hash matches the transcript up to that point
        - resume play with new key
```

**Action log persistence** (optional but recommended):
- Each peer writes their signed actions to IndexedDB, encrypted with the same Hive Posting signature used for `session_authorize`.
- On reload, action log is decryptable by user (with one Keychain prompt) and reconstructable.
- Protects against XSS exfil: even if a script reads IndexedDB, it can't decrypt without the Hive key.

**Grace periods table**:

```
WS disconnect detect:                  1–2s
WS silent retry window:                10s
WS reconnect toast window:             60s
Forfeit claim threshold:               90s of no signed action received
Server pending queue TTL:              100 blocks (~5 min)
Slash window total:                    100 blocks post-match_result broadcast
```

**Future ranked-settlement Keychain prompts in recovery** (not active in the
ADR 0007 gameplay-only testnet):

- Match start: 1 Posting prompt (`session_authorize`; reused for action-log encryption)
- Mid-match: 0 prompts
- Per reload: 1 Posting prompt (session_renewal)
- Match end: 1 Posting prompt (final result envelope)

This historical budget is not acceptable for the current gameplay-only track.
ADR 0007 requires zero match-driven prompts; reload recovery must either use the
supported unsigned P2P path or surface a local blocker.

**Edge cases**:

| Edge | Handling |
|---|---|
| Bob reload + alice also offline | Server pending queue holds Bob's session_renewal. Alice reconnects → server pushes. Both resume. |
| Bob reload, alice rejects renewal | Bob is offline from alice's POV → forfeit via §5 hybrid path. Alice wins after 100-block window. |
| Multiple rapid reloads | Each renewal = new Hive sig (1 prompt each). Annoying but correct. Server queue accepts only the latest signed renewal per matchId. |
| Bob malicious: deliberate reload to reset engine | NO benefit. Reload regenerates signing key but NOT game state. State is reconstructed from the signed action log up to that point. Bob cannot rewind. |
| Action log corrupted in IndexedDB | Bob requests `state_sync_request` from alice. Alice sends her signed action log. Bob verifies all signatures and reconstructs. |
| Race: network drop + reload happen together | session_renewal is idempotent on `(matchId, newest Hive sig)`. Whichever arrives first establishes the new key; later arrivals are no-ops if same Hive sig hash. |

---

## Non-goals

These are explicitly out of scope and **must not be implemented** without superseding ADRs:

- **Per-turn chain anchoring** (`turn_commit` broadcast per move). Rejected as too heavy: 60-turn match × 3s block = 3 min of chain wait + 120 custom_json ops. Off-chain happy path with `slash_evidence` on dispute is the chosen tradeoff. `turn_commit` may exist later as a dispute-only op carrying a single contested turn's signed payload, not as a happy-path op.
- **Server replaying full matches**. Server runs the engine only on `slash_evidence` for the single disputed turn. Happy path is signature-only validation.
- **Cross-game protocol** (e.g., bridging match outcomes to another game). Out of scope.
- **Pure TypeScript engine** in `shared/protocol-core/`. Rejected — see §Rejected alternatives.
- **Replacing AssemblyScript with Rust**. The existing AS investment is preserved.
- **Match state ever transiting the WS relay as protocol payload**. The relay fans out signed move messages; it does not understand match state. (Existing design; reaffirmed.)
- **Hive blocks providing per-turn entropy**. The match seed is established once at handshake via commit-reveal; all subsequent randomness is derived deterministically from that seed.

---

## Consequences

### Wire-level

- New protocol id `ragnarok-match` added to `RAGNAROK_APP_IDS` in `shared/indexer-types.ts`.
- 4 existing ops change namespace: `match_anchor`, `match_result`, `queue_join`, `queue_leave`, `slash_evidence`. Pre-mainnet break for testnet clients; testnet S01 is resettable.
- Cross-protocol contract: `ragnarok-cards` indexer subscribes to `match_result` events from `ragnarok-match`.
- WS relay (`/ws/p2p`) unchanged — it is transport, not protocol.

### Code-level

New code (estimate):
- `assembly/chess/` — ~6 files, ~400 lines AS (types, state, boardSetup, rules, reducer, canonicalize). Geometry-only mirror of [`shared/protocol-core/chess/`](../../shared/protocol-core/chess/). Stamina + mines + element + health stay TS hooks around the WASM reducer until Phase 2 (see [.scratch/game-protocol-v2-phase1/DECISIONS.md#d1](../../.scratch/game-protocol-v2-phase1/DECISIONS.md) D1).
- `assembly/engine/` — complete ~13 reachable stubs (drawCard, spell handlers, weapon, mana, effects)
- `shared/protocol-core/match/` — mirror of `shared/protocol-core/` separation for game protocol types
- Server: `server/services/matchState.ts` (separated from `chainState.ts`)
- Server: `server/routes/matchRoutes.ts` (mirror of `runeRoutes`/`eitrRoutes`)
- Server (Phase E): `server/services/slashArbitration.ts` (imports `@assemblyscript/loader`)

Modified code (estimate):
- ~80 files: gameStore action handlers delegate to WASM `applyAction`
- `unifiedCombatStore.ts` chess actions delegate to WASM chess engine
- `RagnarokGameCoordinator.tsx` win-detection effect deletes (now in engine return)
- `chainRoutes.ts` indexer splits by protocol id
- `chainState.ts` storage split into economy + match

### Trust model

- Bit-identical engine guaranteed across peers via shared WASM binary + boot-time hash check (already exists).
- Single source of truth for state mutation: `applyAction`.
- Server-as-arbiter contract honored end-to-end.
- Slash evidence becomes proof-checkable, not blackbox-result-comparison.

### Determinism preserved (already established, must not regress)

- No new RNG sources permitted in `assembly/`. All randomness derives from match seed.
- No new `f32`/`f64` declarations except the existing mulberry32 PRNG.
- No new `Math.*` calls except the existing `Math.floor` in `seededRng.ts:nextInt`.
- No `Date.now()` / `performance.now()` in `assembly/`.
- New `Map<>` declarations require justification in PR (insertion-order iteration must be the intent, not lookup-by-key in a hot path).

A new lint script `scripts/audit-wasm-determinism.mjs` (Python or Node) will enforce these on every push. Failure blocks merge.

### Migration

- Testnet S01 is resettable. No state migration required.
- Mainnet has not launched. Pre-mainnet break is acceptable.
- Phase A through C are pre-mainnet work. Phase D timing must align with mainnet readiness.
- Phase E is post-mainnet; current model (no server-side slash arbitration; trust signature comparison) is acceptable for closed beta.

---

## Rejected alternatives

### Alt 1: Pure TypeScript engine in `shared/protocol-core/match/`

**Why considered**: smaller bundle, easier debugging, no compile step, leverages team's existing TS fluency.

**Why rejected**: loses compile-time determinism enforcement. TS allows bare `number` (f64 under the hood); AS forces `i32`/`i64`. TS Map iteration order is V8-defined but not spec-mandated across runtimes; AS Map is spec-defined. TS allows accidental coupling to React/Zustand if a refactor crosses module boundaries; AS physically cannot import from `client/src/`. Determinism becomes a PR-review discipline rather than a language guarantee.

### Alt 2: Rust → WASM (`wasm-bindgen`)

**Why considered**: strongest type-level determinism guarantees, mature WASM tooling, broader hiring pool for low-level engine work.

**Why rejected**: ditches existing AS investment (poker engine 125 lines, cards engine 70%, all 7/7 audit-passing). Steeper team learning curve. Source maps weaker than AS for debugging. AssemblyScript's TS-like syntax preserves PR fluency for the broader team. The marginal determinism gain over disciplined AS is not worth the rewrite cost.

### Alt 3: Custom IR / data-driven rule interpreter

**Why considered**: rules as JSON, peers/server eval same data — determinism by construction.

**Why rejected**: card effects are too varied (Battlecries, Deathrattles, conditional triggers, Norse mechanics like Blood Price + Ragnarok Chain). Encoding all of them in a data DSL would either be Turing-complete (in which case the interpreter has the same problem as the engine), or restrictive (preventing future cards). The actual win was the AS subset, not the data-driven approach.

### Alt 4: Status quo (TS engine + WASM hash check verification only)

**Why considered**: zero migration cost.

**Why rejected**: produces false-positive slash. Engine in TS + React drifts subtly between peers (effect timing, Number precision, Map iteration); WASM hash check catches the drift and triggers slash, blaming the honest peer. The historical `wasm-engine-stub` audit required P2P determinism plans to account for this; this ADR is that accounting.

### Alt 5: Per-turn chain anchoring (optimistic vs not)

**Why considered**: every turn broadcast to chain ensures determinism via block-id entropy.

**Why rejected**: ~120 chain ops per match × hundreds of concurrent matches = Hive congestion. 3s block latency per turn = 3–5 min just of chain waits for a 60-turn match. The optimistic off-chain happy path with match seed established at handshake is the correct tradeoff. Per-turn `turn_commit` is reserved for dispute-only encoding.

---

## Implementation notes (non-binding)

### Engine surface contract

```ts
// assembly/index.ts (exported from WASM)
export function applyAction(
  stateHandle: i32,       // opaque pointer to GameState in WASM linear memory
  actionPayload: string,  // JSON-encoded EngineAction
  matchSeed: u32,         // single source of randomness for the match
): EngineResult;          // { success, stateHash, error }
```

### Chess action surface (Phase A scope)

```ts
type ChessAction =
  | { kind: 'move_piece'; pieceId: string; from: Pos; to: Pos }
  | { kind: 'place_mine'; pieceId: string; pattern: MinePattern; target: Pos }
  | { kind: 'reveal_mine'; mineId: string }  // implicit when stepped on
  | { kind: 'use_hero_power'; pieceId: string; target?: Pos };
```

### Determinism PR checklist

Every PR to `assembly/` must pass:

- [ ] No bare `: number` annotations introduced
- [ ] No `Math.random`, `Math.sqrt`, `Math.pow`, `Math.sin/cos/tan` introduced
- [ ] No `Date.now()` / `performance.now()` introduced
- [ ] Any new `Map<>` / `Set<>` declarations justify iteration-order intent in PR description
- [ ] `pnpm run audit:wasm-determinism` passes (lint script to be added)

### Server-side WASM runtime (Phase E)

```ts
// server/services/slashArbitration.ts (sketch)
import { instantiate } from '@assemblyscript/loader';
const wasm = await instantiate(fs.readFileSync('client/public/engine.wasm'));
function arbitrateSlash(evidence: SlashEvidence): SlashVerdict {
  const stateAtTurnNMinus1 = reconstructState(evidence.priorTranscript);
  const expected = wasm.applyAction(stateAtTurnNMinus1, evidence.disputedAction, evidence.matchSeed);
  return expected.stateHash === evidence.signedStateHash
    ? { verdict: 'no_violation' }
    : { verdict: 'slash', offender: evidence.signer, expected: expected.stateHash, actual: evidence.signedStateHash };
}
```

---

## Open issues for follow-up ADRs

- **ADR 0005**: Server-side WASM runtime for slash arbitration. Concrete schema for slash_evidence envelope. Dispute window timing. (Phase E enabler.)
- **ADR 0006**: Match transcript Merkle root structure. How the per-turn signed moves chain into `transcriptRoot`. Whether opponents both sign the final envelope or only the winner.
- **ADR 0007**: Tournament/spectator mode. Deterministic transcript replay from chain anchor + match seed. Implications for casting (Twitch overlay) and post-game analysis.
- **ADR 0008**: Migration path from current ranked S01 state into the post-Phase-D protocol split. Probably trivial because S01 is resettable, but document.

---

## See also

- [docs/RAGNAROK_PROTOCOL_V1.md](../RAGNAROK_PROTOCOL_V1.md) — protocol canon (§14 non-goal "protocol-id split" superseded)
- [docs/TOKEN_AXIS.md](../TOKEN_AXIS.md) — token map (no changes; tokens stay in `ragnarok-cards`)
- [docs/adr/0001-eitr-v1-canonical.md](./0001-eitr-v1-canonical.md) — Eitr v1 canonical (precedent for replay-derived ledger, same pattern)
- [docs/LAYER_GLOSSARY.md](../LAYER_GLOSSARY.md) — layer seams (Engine boundary to be added)
- `assembly/` — AssemblyScript engine source (preserved)
- `client/src/game/engine/wasmLoader.ts` — WASM boot machinery

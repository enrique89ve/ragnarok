# Layer Glossary

Authoritative vocabulary for the seams between game logic, transport,
state, and presentation. When this document and the code disagree, the
code wins — but disagreements should resolve by editing one or the other,
not by inventing new terms.

Older roadmap notes used words like "bridge", "adapter", "wrapper"
interchangeably. This file fixes them. The current active readiness plan is
`TESTNET_READINESS_FAST_TRACK.md`; a new contributor should read that plan and
this glossary before moving P2P, combat, or presentation boundaries.

---

## Layer map

```
┌──────────────────────────────────────────────────────────────────┐
│  components/                  presentation (React, framer-motion)│
│  ▲ reads                                                         │
│  │                                                               │
│  subscribers/                 bus → side effect / UI store       │
│  ▲ subscribes to GameEventBus                                    │
│  │                                                               │
│  coordinator/                 mounts phases, owns FSM            │
│  ▲ reads MatchContext + dispatches FSM events                    │
│  │                                                               │
│  match/        modes/{single,campaign,p2p}/{resolver,lifecycle}  │
│  ▲ pure functions: input → MatchContext, MatchContext → reward   │
│  │                                                               │
│  stores/                      Zustand slices (game, combat, peer)│
│  ▲ wraps reducers + side-effects                                 │
│  │                                                               │
│  shared/protocol-core/        pure deterministic engine          │
│                               types, rules, reducer              │
└──────────────────────────────────────────────────────────────────┘
```

The arrows go upward only. Anything pointing down (a reducer that
imports from `components/`, a subscriber that mutates a store directly
without going through its actions) is a layer-contract violation.

---

## Active roles

### Resolver

**Definition.** A pure function that takes external input (menu choice,
mission id, P2P handshake) and produces a `MatchContext`. Owns the
mode-specific shape: which `OpponentSpec` is built, which
`RewardChannel` applies, which mission payload to attach.

**Location.** `client/src/game/match/modes/{mode}/resolver.ts`.

**Contract.**
- MUST be pure (no I/O, no store reads, no Date.now / Math.random).
- MAY import from `match/types`, `match/economy`, `shared/`.
- MUST NOT import from `stores/`, `components/`, or sibling modes.

**Why pure.** Resolvers are unit-tested with input → output assertions
(`resolver.test.ts` per mode). A non-pure resolver would force tests to
mock Zustand or fake transport state; the test pyramid collapses.

**Real example.** `client/src/game/match/modes/p2p/resolver.ts`:

```ts
export function resolveP2P(handshake: P2PHandshake): MatchContext {
	return {
		matchId: handshake.matchId,
		matchSeed: handshake.matchSeed,
		opponent: { kind: 'peer', /* ... */ },
		reward: modeEconomyToReward(MATCH_ECONOMY.p2pRanked),
	};
}
```

---

### Setup wrapper

**Definition.** A React component that owns the asynchronous wait
between "user picked a mode" and "MatchContext is fully populated". It
runs the resolver, pushes the context into `useMatchStore`, and only
then mounts its children (the coordinator). Until ready, it renders a
fallback.

**Location.** `client/src/game/match/modes/{mode}/MatchSetup{Mode}.tsx`.

**Contract.**
- MUST guarantee `useMatchStore.activeMatch` is non-null and matches the
  mode's `opponent.kind` BEFORE rendering children.
- MUST clear `useMatchStore` on unmount (no leaked context across
  navigations).
- MAY import from its own mode (`modes/{mode}/`), `match/`, `stores/`,
  `components/`.
- MUST NOT import from sibling modes (ESLint enforced).

**Why exists.** Pre-Fase-5, the coordinator mounted with `matchSeed:
undefined` and gated every effect with ad-hoc guards (`p2pInitApplied`,
`matchSeed` truthy). The wrapper centralizes the gate so the coordinator
sees a complete context at first render.

**Real example.** `client/src/game/match/modes/p2p/MatchSetupP2P.tsx`.
Single and campaign analogs are `MatchSetupSingle` and `MatchSetupCampaign`. Public callers import all three from `client/src/game/match`.

---

### Adapter

**Definition.** A class of object that translates between two stable
shapes that should not know each other. Distinct from a resolver:
resolvers run once at match start; adapters run continuously during the
match lifetime, mediating reads or writes.

**Location convention.** `client/src/game/adapters/{Name}Adapter.ts`
(directory does not yet exist; created when the first adapter lands).

**Contract.**
- MUST hide the source shape from the consumer; consumer should not
  import the source's types.
- SHOULD be a pure function or a small object with a clear input
  interface — not a hook with side effects.
- MAY read from any layer below; MUST NOT mutate cross-layer state.

**Existing examples.**

`useChessCombatAdapter` and `usePokerCombatAdapter` (both in
`client/src/game/hooks/`) translate the unified combat store into
phase-specific shapes the coordinator expects. Naming is honest: they
are adapters, not stores.

**Proposed (not yet built): `GameReadyAdapter`.**
Translates `(MatchContext, warbandStore, peerStore wire data)` →
`GameReadySignal { playerArmy, opponentArmy, matchSeed | null,
initialBoardSeed }`. Once landed, the coordinator no longer imports
`useWarbandStore` or `usePeerStore` directly — it reads `ready:
GameReadySignal` from the adapter and mounts only when ready is
populated. This collapses the three bootstrap effects + four imperative
refs that the coordinator carries today.

---

### Subscriber

**Definition.** A module that listens to `GameEventBus` events and
produces side effects: toast messages, animation frames, audio cues,
on-chain transcript writes. Subscribers are the bus → world boundary.

**Location.** `client/src/game/subscribers/{Name}Subscriber.ts`.

**Contract.**
- MUST register via `GameEventBus.subscribe` and return an unsubscribe
  function.
- MAY read UI stores, write to UI stores, call audio/animation APIs.
- MUST NOT call game-logic actions on `gameStore` (subscribers consume,
  they do not drive the game).
- MUST NOT import from `coordinator/` or `match/modes/`.

**Why exists.** Without subscribers, every store action that needs a
toast or sound effect would have to import from `components/`. The
ESLint rule `stores/ ↛ components/` (Phase F) enforces this; the
subscriber is the only sanctioned way to bridge.

**Real example.** `client/src/game/subscribers/NotificationSubscriber.ts`
listens for `'NOTIFICATION'` events on the bus and pushes them into
`useBannerStore`. Stores can emit `NotificationEvent` without ever
importing the banner.

Initialization happens once at app start in
`subscribers/index.ts`. Multiple subscribers can coexist (notification,
audio, animation, blockchain transcript).

---

### Mode value derivation

**Definition.** A pure function that takes `MatchContext` (and possibly
other inert inputs) and returns a value that depends on the mode but
itself has no side effects. The coordinator reads the value and
decides what to render or what to pass downstream.

**Location.** `client/src/game/match/derived.ts` (split into
`match/derived/{name}.ts` only when the file crosses ~300 lines).

**Contract.**
- MUST be pure — no Zustand store reads, no `Math.random` / `Date.now`,
  no I/O, no React hooks.
- MUST be exhaustive over `OpponentSpec.kind` (and over discriminated
  sub-unions like `ScriptPayload.kind` when the value depends on them).
- MAY import types, deterministic constants, and pure helpers from
  `match/`, `shared/`, `client/src/game/data/`, and per-mode pure
  helpers (e.g. campaign army composition).
- MUST NOT import any Zustand store (`stores/**`, `lib/stores/**`,
  `match/store`), any `*Dispatch.ts` file, or `legacyBridge`. Enforced
  by `pureDerivationRules` in `eslint.config.js`.

**Why purity is non-negotiable.** A deriver that reads
`useStore.getState()` returns whatever the store says **at call time**,
not at match start. During P2P replay, that value will be the current
runtime store, not the historical match state — replays diverge from
recordings silently. The lint rule prevents this bug class by
construction. Same property protects future workers (no
`localStorage`) and SSR builds.

**Real examples** (`client/src/game/match/derived.ts`):
- `deriveAuthority(ctx)` → `Authority`
- `deriveOpponentArmyForMode(ctx)` → `ArmySelection | null`
- `deriveIntro(ctx, seenChapterIds)` → `IntroSpec`
- `deriveMatchFlowPolicy(ctx)` → `MatchFlowPolicy` (practice / campaign / p2p flow facts; replaces reconstructed `isCampaign` / `isP2PConnected` flags)

---

### Mode lifecycle dispatcher

**Definition.** A neutral helper that, given a `MatchContext`, returns
a callback that performs mode-specific side effects (store mutations,
event emissions, on-chain dispatch). The coordinator invokes the
returned callback at a lifecycle moment (game-end, surrender, turn-start);
the dispatcher itself does not do the work, it picks who does.

**Location.** `client/src/game/match/{phase}Dispatch.ts` — the
`*Dispatch.ts` suffix is the canary that flags an impure entry point.
A reader scanning `git ls-files match/` should see all impure
dispatchers at a glance.

**Contract.**
- MUST be exhaustive over `OpponentSpec.kind`.
- MAY import from all `match/modes/*/lifecycle.ts`.
- MAY transitively pull Zustand stores via the lifecycle handlers.
- MUST NOT contain mode-specific logic; it routes only — the impure
  work belongs in `match/modes/{mode}/lifecycle.ts`.

**Why separate from `derived.ts`.** Lifecycle handlers import Zustand
stores that use `persist` middleware, which calls `localStorage` at
module-init. If `derived.ts` (loaded by every test that touches a
deriver) pulled this transitively, every unit test would crash in Node
env. The split is enforced architecturally — it is not a workaround.

**Why separate from the coordinator.** Putting `if (isCampaign) X else
if (isP2P) Y` in the coordinator was the original sin: every new mode
forced another branch and another store import. The dispatcher is the
single point of mode-aware routing, called from a coordinator that
itself is mode-agnostic.

**Real example** (`client/src/game/match/onWinDispatch.ts`):

```ts
export function selectOnWinHandler(ctx: MatchContext) {
	switch (ctx.opponent.kind) {
		case 'ai':       return (end) => onSingleMatchEnd(ctx, end);
		case 'scripted': return (end) => onCampaignMatchEnd(ctx, end);
		case 'peer':     return (end) => onP2PMatchEnd(ctx, end);
	}
}
```

The coordinator calls `selectOnWinHandler(ctx)({ iWon, turnCount })`
without knowing which mode it is.

---

### Wire sender

**Definition.** A module that translates a domain action into a
`WireMessage` envelope and hands it to the transport layer (`peerStore`
today, possibly WebSocket later). The boundary that lets game logic
speak about moves and lets transport speak about envelopes.

**Location.** `client/src/game/p2p/{topic}WireSender.ts`.

**Contract.**
- MAY import from `gameStore` (for matchId), `peerStore` (for
  `send(envelope)`), `shared/p2p-wire/` (for envelope types).
- MUST NOT import from `components/` or `coordinator/`.
- MUST quietly no-op when no match is active (callers should be able to
  invoke unconditionally from a UI flow).

**Real example.** `client/src/game/p2p/chessWireSender.ts` — exposes
`sendChessMove` and `sendChessAttack`. The chess UI calls these without
knowing about envelopes, seq counters, or `prevStateHash`.

**Why this is the transport boundary.** A future swap from WebRTC
(`peerStore`) to WebSocket would happen inside `chessWireSender.ts` and
the new transport module — the chess UI never changes. This is the
"transport boundary" referenced in Fase 7 C15d.

---

### Coordinator

**Definition.** The React component that mounts a match's phase tree
(`<CinematicPhase/>`, `<ChessPhase/>`, `<VsScreenPhase/>`,
`<PokerCombatPhase/>`, `<GameOverPhase/>`) and owns the FSM that
sequences them. Reads `MatchContext` to make mode-aware decisions, but
does so through dispatchers — never via inline conditionals.

**Location.** `client/src/game/coordinator/RagnarokGameCoordinator.tsx`.

**Contract (target after Fase 7 + GameReadyAdapter).**
- MUST receive a populated `MatchContext` at first render (Setup wrapper
  guarantees it).
- MAY read `useMatchStore`, `useGameFlowStore`, combat store adapters.
- MUST NOT read `useWarbandStore`, `usePeerStore`, `useCampaignStore`
  directly — those go through `GameReadyAdapter` or mode dispatchers.
- Target size: under 300 lines.

**Today's gap.** `RagnarokGameCoordinator.tsx` is 793 lines, imports
six stores directly, and carries four imperative refs to gate
re-initialization. The `GameReadyAdapter` (proposed) collapses that to
a single `ready` prop.

---

### Reducer

**Definition.** A pure function `(state, action) => state` that
implements game rules without any I/O, randomness, or imports from
`client/`. The deterministic engine.

**Location.** `shared/protocol-core/{topic}/reducer.ts`.

**Contract.**
- MUST be total — every action × state combination has a defined
  result, including `Result<state | rejection>` for invalid moves.
- MUST NOT import from `client/` (ESLint enforced via `shared/ ↛
  client/` rule).
- MUST NOT use `Math.random`, `Date.now`, or any non-determinism.
  Required randomness must be threaded as a `SeededRng` parameter.

**Real example.** `shared/protocol-core/chess/reducer.ts` —
`applyChessAction(state, action)` with action union `move | capture |
promote | endTurn`. 14 tests assert input/output equivalence with the
slice's pre-extraction behavior.

---

### Slice

**Definition.** A Zustand store fragment that holds match-time mutable
state and exposes actions that wrap the reducer plus side effects
(animations, log entries, mine triggers).

**Location.** `client/src/game/stores/{topic}/{name}Slice.ts` or
`client/src/game/stores/{name}Store.ts`.

**Contract.**
- Actions MAY call into the reducer, then layer side effects on top.
- MUST NOT import from `components/` (ESLint enforced).
- SHOULD be small. When a slice grows past ~500 lines, side effects
  should migrate out to subscribers.

**Real example.** `client/src/game/stores/combat/chessCombatSlice.ts`
(730 lines today; over budget — flagged in roadmap as P2 mantenibilidad)
wraps `applyChessAction` and adds mines / animations / log entries that
are not deterministic and cannot live in protocol-core.

---

## Cross-cutting layer contract

The following ESLint rules in `eslint.config.js` enforce the layer
boundaries. A `pnpm run lint` failure on `no-restricted-imports` is
always a layer violation.

| Rule | Enforces |
|------|----------|
| `shared/ ↛ client/` | Protocol-core stays pure |
| `stores/ ↛ components/` | Stores can't reach into UI; subscribers bridge |
| `core/ ↛ components/` | Same idea for `client/game/core/` |
| `match/modes/{X}/ ↛ match/modes/{Y}/` | Modes don't cross-call (Fase 6) |
| `match/derived.ts ↛ {stores, *Dispatch, legacyBridge}` | Pure derivers stay replay-safe (Opp 3) |

**Test environment as a purity canary.** `vitest.config.ts` runs the
entire suite in `environment: "node"`. Any test that exercises a pure
deriver runs without `localStorage`, `window`, or `document`. If a
deriver test ever needs jsdom, the deriver is no longer pure — that
is a structural failure, not a test-config oversight.

Future rules to add (proposed):

| Rule | Enforces |
|------|----------|
| `coordinator/ ↛ {peerStore, warbandStore, campaignStore}` | Coordinator reads through `GameReadyAdapter` + mode dispatchers only |

---

## Decision tree: where does my new code go?

**I need to read game state from a store inside a UI component.**
→ Direct read is fine. Stores can be consumed by components freely; the
restricted direction is `stores → components`, not the reverse.

**I need to fire a toast / sound / animation when something happens
during the match.**
→ Emit a `GameEventBus` event from the store action. Add or extend a
subscriber that listens for it. Do NOT import the toast or audio API
from the store.

**I need to add a new game mode (tournament, daily challenge, puzzle).**
→ Add an `OpponentSpec` variant in `match/types.ts`. Create
`match/modes/{newMode}/{resolver,lifecycle,index}.ts`. Wire it in the
relevant dispatchers (`onWinDispatch`, `deriveOpponentArmyForMode`,
`deriveIntro`). Add a `MatchSetup{NewMode}` wrapper. Add the ESLint
isolation rule for the new mode in `eslint.config.js`.

**I need to send a new kind of message peer-to-peer.**
→ Define the envelope type in `shared/p2p-wire/`. Create or extend a
`{topic}WireSender.ts` in `client/src/game/p2p/`. Update the receiver
in `useWireSync` and the relay whitelist on the server.

**I need to add deterministic game logic (a new combat rule, a new
piece movement).**
→ Extend the reducer in `shared/protocol-core/`. Add unit tests beside
it. Update the slice action that wraps the reducer if needed.

**I need to add UI-only state (a modal toggle, a hover preview).**
→ Local component state (`useState`) is fine. If multiple components
need to read it, a small Zustand store under `client/src/lib/stores/`
is acceptable. Do NOT mix UI state into game-state slices.

---

## Historical terms (do not use in new code)

These terms appear in commit messages, file names, and code comments
from earlier phases of the codebase. They are recorded here so a reader
can recognize them, but they MUST NOT be used to name or describe new
code.

### Bridge

**Where it appears.** `client/src/game/match/legacyBridge.ts`,
`client/src/game/match/legacySynth.ts`, the `useLegacyMatchContextBridge`
hook.

**What it was.** A short-lived hook that synthesized a `MatchContext`
from legacy store shapes (campaign + peer) during the transition to
mode-specific Setup wrappers. It existed to keep the coordinator
working before `<MatchSetupP2P/>` and its single / campaign analogs
landed.

**Status.** Scheduled for deletion in Phase 7 C15b once
`<MatchSetupSingle/>` and `<MatchSetupCampaign/>` ship.

**Why the term is retired.** "Bridge" overlaps semantically with
**Adapter** — both translate between shapes — but signals nothing
about lifetime. Calling something a "Bridge" hid the fact that it was
intended to be thrown away. New translators between shapes are
**Adapters**; new translators between mode-pick and `MatchContext` are
**Resolvers** wrapped by **Setup wrappers**. There is no slot for a
"Bridge" in the active vocabulary.

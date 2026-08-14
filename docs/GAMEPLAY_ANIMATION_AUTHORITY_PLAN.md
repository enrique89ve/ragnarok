# Gameplay Animation Authority Plan

Status: draft

Scope: decouple match mechanics from CSS classes, CSS animations, GSAP timelines, Pixi resize/render loops, Framer Motion callbacks, and DOM class selectors.

## Question

Can gameplay resolve from explicit state commands and events while animation systems remain subscribers/adapters?

Prototype branch: logic. If uncertainty remains before implementation, build a throwaway terminal prototype that drives attack resolution through these cases:

- AI attack resolves when the visual timeline is killed.
- Chess attack resolves when the visual marker is cleared late.
- VFX target lookup fails without affecting match state.
- Card drop position is visual input only; store validation remains decisive.

The prototype should live near the first touched combat module and be deleted or folded into tests once the question is answered.

## Target Contract

Gameplay authority must flow in this order:

1. User, AI, or peer command enters a store or protocol seam.
2. Store/protocol validates legality and mutates state.
3. Store/protocol emits a game event or visual marker.
4. Subscriber/adapters render CSS, GSAP, Pixi, Framer Motion, audio, or toast effects.
5. Animation cleanup may clear visual markers, but must not apply damage, validate actions, advance turns, or decide winners.

CSS classes and `data-*` attributes may describe visual state. They must not be the source of legality, ownership, damage, turn, or outcome truth.

## Existing Evidence

- `docs/LAYER_GLOSSARY.md` defines subscribers as the bus-to-world boundary and says subscribers must not call game-logic actions.
- `docs/POKER_ARENA_UI.md` already defines a fixed-ratio arena contract and warns that GSAP targeting `.game-viewport` can break canvas scale.
- `client/src/game/combat/rules/pokerActionRules.ts` and `pokerCombatSlice.ts` already keep poker action validation in rules/store seams.
- `client/src/game/components/AIAttackAnimationProcessor.tsx` currently applies damage from GSAP timeline callbacks.
- `client/src/game/components/chess/ChessAttackAnimation.tsx` and `chessCombatSlice.ts` currently use visual completion as part of attack resolution.
- `client/src/game/combat/animations/PokerDramaVFX.ts` and `CombatEventSubscribers.ts` currently find visual targets through several class selectors.

## Phase 1: AI Attack Resolution Seam

Goal: AI attack damage resolves outside React and GSAP.

Planned modules:

- Add `client/src/game/combat/aiAttackResolution.ts`.
- Add `client/src/game/combat/aiAttackResolution.test.ts`.
- Update `client/src/game/components/AIAttackAnimationProcessor.tsx`.

Implementation steps:

1. Extract `resolveAIAttackEvent(event, deps)` from `AIAttackAnimationProcessor`.
2. Move `CombatEventBus.emitImpactPhase`, `applyDamageToState`, `setGameState`, and `markDamageApplied` behind that imported function.
3. Make `AIAttackAnimationProcessor` only start, stop, and clean visual timelines.
4. Ensure killing the GSAP timeline cannot prevent damage resolution.

Acceptance criteria:

- No `applyDamageToState` call remains inside `AIAttackAnimationProcessor.tsx`.
- AI attack resolution test passes without DOM, GSAP, or mounted React.
- Visual `onImpact` may trigger effects, but not state mutation.

Verification:

```bash
pnpm run check
pnpm exec vitest run client/src/game/combat/aiAttackResolution.test.ts
rg -n "applyDamageToState|setGameState" client/src/game/components/AIAttackAnimationProcessor.tsx
```

## Phase 2: Chess Attack Resolution Before Animation Cleanup

Goal: chess attack mechanics resolve through store/protocol commands; `completeAttackAnimation` becomes visual cleanup only.

Planned modules:

- Update `client/src/game/stores/combat/chessCombatSlice.ts`.
- Update `client/src/game/stores/combat/chessAnimationSlice.ts`.
- Update `client/src/game/components/chess/ChessAttackAnimation.tsx`.
- Update `client/src/game/components/chess/useChessBoardInteractions.ts`.
- Add or extend tests under `client/src/game/stores/combat/`.

Implementation steps:

1. Introduce a clear store-level function for resolving a pending chess attack, for example `resolvePendingChessAttack`.
2. Move instant-kill, mine trigger, and combat-start work out of visual completion.
3. Keep `pendingAttackAnimation` as a UI freshness marker only.
4. Make `ChessAttackAnimation` call only visual cleanup.
5. Preserve P2P hash timing in `useChessBoardInteractions` before changing wire emission order.

Acceptance criteria:

- A chess attack can resolve in a store test without rendering `ChessAttackAnimation`.
- `completeAttackAnimation` or its replacement does not perform damage/combat rules.
- Animation cleanup cannot emit a phantom attack or block a valid resolved attack.

Verification:

```bash
pnpm run check
pnpm exec vitest run client/src/game/stores/combat/chessAnimationSlice.test.ts
pnpm exec vitest run client/src/game/coordinator/hooks/chessAITurnDriver.test.ts
rg -n "onAnimationComplete|completeAttackAnimation" client/src/game/components/chess client/src/game/stores/combat
```

## Phase 3: Stable Arena VFX Targets

Goal: VFX systems target stable `data-*` contracts instead of CSS classes.

Planned modules:

- Add `client/src/game/combat/arenaVfxTargets.ts`.
- Update poker arena zones and HUD elements to emit `data-vfx-target` / `data-vfx-layer`.
- Update `client/src/game/combat/animations/PokerDramaVFX.ts`.
- Update `client/src/game/services/CombatEventSubscribers.ts`.
- Update `client/src/game/combat/components/HeroBattlePopup.tsx`.
- Update `docs/POKER_ARENA_UI.md`.

Proposed target names:

- `data-vfx-layer="arena-vfx"`
- `data-vfx-layer="arena-modal"`
- `data-vfx-target="player-hero"`
- `data-vfx-target="opponent-hero"`
- `data-vfx-target="community-slot"`
- `data-vfx-target="risk-display"`
- `data-vfx-target="player-minion"`
- `data-vfx-target="opponent-minion"`

Implementation steps:

1. Centralize selectors and position helpers in `arenaVfxTargets.ts`.
2. Migrate imperative VFX modules to use the helper instead of raw `document.querySelector` strings.
3. Replace class fallbacks only after JSX emits the matching `data-*` attributes.
4. Keep VFX target lookup nullable; missing targets must degrade visual output, not gameplay.

Acceptance criteria:

- `PokerDramaVFX` no longer queries `.community-slot`, `.risk-display`, `.pot-display`, or `.game-viewport` directly.
- `CombatEventSubscribers` no longer uses `[class*="minion"]` as a gameplay/VFX lookup fallback.
- Arena docs name `arenaVfxTargets.ts` as the target selector contract.

Verification:

```bash
pnpm run check
rg -n "querySelector\\(['\\\"]\\.|\\[class\\*=" client/src/game/combat/animations/PokerDramaVFX.ts client/src/game/services/CombatEventSubscribers.ts
```

## Phase 4: CardDragAnimation Removal Or Isolation

Goal: remove dead drag code or quarantine it as a legacy visual adapter with no authority.

Planned modules:

- Inspect `client/src/game/components/CardDragAnimation.tsx`.
- Inspect `client/src/game/components/DirectCardDrag.tsx`.
- Inspect `client/src/game/components/CardWithDrag.tsx`.

Implementation steps:

1. Confirm import graph and runtime use.
2. If `CardDragAnimation` is still orphaned, delete it.
3. If it is reachable, rename or mark it as legacy and remove direct gameplay authority from its DOM geometry checks.
4. Ensure live card play continues through `playCard`, `dispatchGameCommand`, or imported store/protocol validation.

Acceptance criteria:

- No live game rule depends on `.simple-battlefield`, `.player-row`, or `.bf-slot.occupied`.
- Drop position can provide `insertionIndex`, but store/protocol remains decisive.
- Orphaned animation code is deleted instead of kept as misleading architecture.

Verification:

```bash
pnpm run check
rg -n "CardDragAnimation|\\.bf-slot|\\.player-row|\\.simple-battlefield" client/src/game
```

## Phase 5: Documentation Contract

Goal: make the event-first animation rule explicit.

Planned docs:

- `docs/GAME_FLOW.md`
- `docs/POKER_ARENA_UI.md`
- optionally `docs/LAYER_GLOSSARY.md` if the subscriber contract needs sharper wording

Implementation steps:

1. Replace the current animation flow that says animation completion updates state.
2. Document the new flow:
   - command resolves state
   - event/visual marker is emitted
   - subscriber/adapters render animation
   - cleanup clears visual marker only
3. Add a short note that CSS classes and GSAP timelines must not be authority.

Acceptance criteria:

- Docs no longer imply animation completion owns state mutation.
- Poker arena docs point to `arenaVfxTargets.ts` for imperative VFX targeting.

Verification:

```bash
rg -n "Animation completes|State updates|arenaVfxTargets|subscriber" docs/GAME_FLOW.md docs/POKER_ARENA_UI.md docs/LAYER_GLOSSARY.md
```

## Commit Slices

1. `ai-attack-resolution-seam`
2. `chess-attack-resolution-before-animation`
3. `arena-vfx-target-contract`
4. `remove-or-isolate-legacy-card-drag-animation`
5. `document-event-first-animation-flow`

## Final Gate

Run after all phases:

```bash
pnpm run check
pnpm test -- --runInBand
rg -n "applyDamageToState|setGameState" client/src/game/components client/src/game/combat/animations
rg -n "querySelector\\(['\\\"]\\.|\\[class\\*=" client/src/game/combat/animations client/src/game/services
```

If repo-wide tests are too noisy, record the failing suites and still run the focused tests added by each phase.

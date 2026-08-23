# Game Effect Architecture

Status: incremental frontend migration

This contract separates gameplay consequences from interface motion. It does
not change game rules, economy, RUNE, ledger, server, or protocol authority.

## Domains

```text
game/effects/core       shared vocabulary and lifecycle
game/effects/poker      poker gameplay effects
game/effects/chess      chess gameplay effects
game/effects/feedback   typed gameplay messages and presentation adapter
interface/motion        menus, navigation, panels, tooltips, and page motion
```

Effect intents are client-side, structured-clone-safe data. They describe the
source, target, semantic anchors, impact and timing, but never query the DOM,
mutate game state, or own a render loop. This keeps the mapping portable to a
Worker later; only the final adapter needs the browser and visual layer.

`gameEffectCoordinator.ts` is the single timer runtime. It owns keyed
replacement, lanes, priorities, cancellation, reduced-motion timing and an
active-effect budget. Zustand stores remain observable render state; they do
not create a second timer authority.

The `game` domain can emit an effect intent. It must not import `toast`,
Framer Motion, GSAP, CSS modules, or React components to render that intent.

The existing `client/src/game/effects/EffectRegistry.ts` and its handler tree
are a separate, legacy card-effect execution path. They are not the authority
for presentation FX or gameplay messages, and this migration does not widen
or duplicate that registry. New presentation work belongs to the contracts
and adapters described here; card-effect execution remains unchanged until a
separate, explicit migration is planned.

## One route for gameplay feedback

```text
game rule/store
  -> typed gameplay event or message ID
  -> domain adapter (poker/chess/shared)
  -> feedback or motion adapter
  -> current renderer (banner, stack, canvas VFX, audio)
```

`client/src/game/effects/feedback/gameMessageCatalog.ts` owns message IDs,
parameters, copy, tone, and duration. Callers do not construct gameplay toast
strings. `gameMessageAdapter.ts` is the current presentation seam and routes
through the existing combat feedback store.

Feedback is also an effect: `GameFeedbackEffectIntent` can render as the
current feedback stack, a toast, a banner, or `silent`. Changing that choice
does not change the gameplay event or its source of truth. Renderers are
registered through `registerGameFeedbackRenderer`; the current stack is only
the default implementation for all three visible presentations.

## No dual authority

- Rules/stores own legality, damage, resources, turns, and outcomes.
- Effect domains own intent mapping and lifecycle policy.
- Adapters own rendering technology and target lookup.
- Interface motion is not a gameplay effect and does not subscribe to gameplay
  details unless it receives an explicit UI-facing event.
- A compatibility adapter may remain during migration, but it cannot create a
  second queue, second message catalog, or second source of gameplay truth.

## Migration order

1. Centralize gameplay message IDs and route event-subscriber messages through
   the adapter.
2. Keep the existing poker motion implementation as the only poker scheduler,
   but expose it through `game/effects/poker`. This is a compatibility facade,
   not a second scheduler.
3. Add semantic attack intents (`source → travel → impact → feedback`) and let
   the current visual adapter consume them without changing combat authority.
4. Route all client-side effect timers through `gameEffectCoordinator`; keep
   Zustand only as observable render state.
5. Make chess use the same domain/effect vocabulary without moving chess UI in
   the first pass.
6. Migrate legacy animation consumers to the canonical gameplay coordinator.
7. Remove compatibility exports only after importer scans and focused tests are
   empty/green.

Economy and protocol notifications remain outside this migration boundary.

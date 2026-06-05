# View Transitions Contract

Ragnarok must use view transitions only when the motion explains continuity.
Global route fades are not allowed: they make ordinary navigation feel like a
load glitch and they compete with game/combat choreography.

## Runtime Gate

- Current app runtime: Vite + React 18.
- React's `<ViewTransition>` and `addTransitionType` APIs require React Canary
  or Experimental. Do not import them until the dependency change is explicit.
- Do not call `document.startViewTransition()` directly from app code.
- Do not animate `::view-transition-old(root)` or `::view-transition-new(root)`.
- Keep React Router navigation instant until a route has an intentional
  transition owner and can be implemented through React transitions.

## Intent Matrix

| Surface | Relationship | Pattern | Status |
| --- | --- | --- | --- |
| Home -> Campaign | forward into authored saga | route transition, future `nav-forward` | allowed after React VT gate |
| Campaign -> Campaign Game | launch into combat | loader/preload first, route transition optional | allowed |
| Home/Warband -> Single Game | launch into combat setup | loader/preload first | allowed |
| Home -> Collection/Packs/Wallet/Market | lateral utility navigation | no directional route motion | instant |
| Packs -> Pack Opening -> Collection | same reward object deepens into inventory | shared element candidate | allowed after React VT gate |
| Collection filter/sort/search | same set rearranged | list identity, no route motion | allowed after React VT gate |
| Army hero selection | same roster, different selected hero | shared element or state reveal | allowed after React VT gate |
| Suspense code/data load | data arrived | contextual loading/reveal | allowed now |
| Combat phases | authored gameplay choreography | existing Framer/CSS combat motion | outside route VT |

## Persistent Elements

When React view transitions are enabled, these elements must be isolated from
page snapshots:

- `ToastProvider`
- `EitrMigrationBanner`
- `MetaPageHeader`
- Home sticky header and utility bar
- Floating overlays such as Warband drawer, DUAT claim popup, faction pledge,
  tooltips, and modals

Use stable `viewTransitionName` values only for persistent elements. Do not put
manual `viewTransitionName` on the root DOM node inside a React
`<ViewTransition>` boundary.

## Implementation Rules

1. Add transitions in page or component owners, not layout wrappers.
2. Use `default="none"` on every React `<ViewTransition>` unless a default
   cross-fade is explicitly desired.
3. Pair `enter` and `exit`.
4. Use directional motion only for hierarchy or ordered sequences.
5. Use Suspense reveals for loading. Use `LoadingScreen` only when the wait is a
   meaningful ceremony or heavy asset preload, not for every route.
6. Use `assetPreloader` before expensive image surfaces such as army selection,
   pack opening, collection card grids, or map/campaign art.
7. Respect `prefers-reduced-motion`.

## First Safe Candidates

1. Improve contextual Suspense fallbacks for heavy lazy routes.
2. Preload army-selection and pack-opening images behind a short lore loader.
3. After an explicit React Canary/Experimental dependency decision, add shared
   element transitions for pack reward cards and collection cards.
4. Add route-level directional transitions only for campaign/game launch paths.

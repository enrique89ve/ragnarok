# Design System - Ragnarok: Norse Mythos Card Game

## Product Context

- **What this is:** Hive-anchored card battler with chess movement and
  Texas Hold'em poker combat where HP is the betting currency.
- **Who it is for:** Players who understand collectible card games, strategy
  board tactics, wallet-gated testnet play, and mythic fantasy presentation.
- **Current product phase:** Alfa Testnet, full NFT mechanics, resettable
  testnet value.
- **Primary design problem now:** make poker combat readable enough that a new
  tester understands turn, phase, cards, risk, action and result without help.

## Memorable Direction

Ragnarok should feel like a serious mythic war table, not a generic crypto game
and not a casino table pasted into a card battler.

The safest choices keep the app readable: strong hierarchy, explicit state,
clear actions, predictable panels. The design risk worth taking is the war-table
identity: gold, iron, blood, rune light, square-cut controls, restrained motion
and mythic typography.

## Aesthetic Direction

- **Direction:** Industrial mythic war table.
- **Decoration level:** intentional. Use texture, frame, rune accents and realm
  atmosphere only when they support reading the game state.
- **Layout approach:** fixed-ratio game canvas for combat, dense app layout for
  admin/wallet/collection screens.
- **UI posture:** serious, legible, high-contrast, game-first.

Avoid:

- purple/violet gradients as default accents;
- generic rounded SaaS cards;
- icon-only game actions without nearby state context;
- decorative effects that cross the 1920x1080 canvas boundary;
- large marketing-first hero layouts inside the playable app.

## Typography

- **Display:** Cinzel / Cinzel Decorative for Ragnarok, phase banners, mythic
  titles and major result states. Use sparingly.
- **Body/UI target:** Source Sans 3 for future UI/body replacement. Current
  Inter usage is legacy fallback, not a direction to expand.
- **Numbers/data:** JetBrains Mono for hashes, protocol ids, HP values, counts,
  admin rows and session evidence.
- **Scale:** use small, dense UI text inside combat panels. Hero-scale type is
  only for route headers, phase slams and terminal result states.
- **Letter spacing:** keep `0` for normal reading. Uppercase labels may use
  tracked display styling, but must not make buttons or critical values hard to
  scan.

## Color

- **Approach:** balanced, not one-hue. Obsidian and iron are the base; gold is
  authority; blood red is danger; rune cyan is magic/connection; green is
  success; amber is warning.

| Role | Hex | Use |
|---|---|---|
| Obsidian 950 | `#05070d` | page and combat depth |
| Iron 850 | `#111827` | panels and inactive surfaces |
| Iron 650 | `#334155` | borders and disabled UI |
| Gold 300 | `#f5c542` | primary game authority and current phase |
| Gold 500 | `#b7791f` | frames, separators, active focus |
| Blood 500 | `#dc2626` | damage, fold/loss, critical HP |
| Rune Cyan | `#38bdf8` | P2P, magic, session/connection |
| Saga Green | `#22c55e` | success, valid action, health gain |
| Amber 400 | `#f59e0b` | warning, reconnect/grace |
| Ink 100 | `#e5e7eb` | primary text |

Dark mode is the base mode. Do not simply brighten everything for contrast;
increase separation through borders, shadows, panel opacity and fewer competing
glows.

## Spacing And Radius

- **Base unit:** 4px.
- **Combat density:** compact but not cramped. Poker actions and HP values must
  fit fixed controls without resizing the board.
- **App density:** comfortable for collection/admin views.
- **Radius:** 4px for small controls, 6px for panels, 8px maximum for repeated
  cards/panels unless a circular chip is intentional.
- **Board geometry:** gameplay coordinates live in
  `client/src/game/poker/layout/pokerViewportLayout.ts`.

## Layout

### Combat

- Combat uses a virtual `1920x1080` board scaled by `GameViewport`.
- The board remains landscape. Portrait does not get a separate poker layout.
- `board.css` owns cross-zone placement.
- Component CSS owns visual identity.
- JSX/Tailwind owns local alignment only.
- VFX and modals mount inside arena layers, not `document.body`.

### App screens

- Home, wallet, collection, admin and marketplace should stay dense and
  navigable. No marketing-first landing page inside the playable app.
- Use cards only for repeated items, panels, modals and framed tools.
- Do not nest cards inside cards.

## Poker Board UX Contract

Poker combat is ready only when these states are visible:

- phase name and phase progress;
- whose turn and whether input is allowed;
- player hole cards, opponent hole cards, community cards;
- pot/risk total and each side's HP committed;
- current action set and HP required;
- hand strength;
- P2P state: idle, thinking, ready, reconnecting, error;
- showdown winner, winning hand and HP delta;
- return-to-chess state after resolution.

The player should not need to infer these from animation alone. Motion can
reinforce state, but text/value state must remain stable and readable.

## Motion

- **Approach:** intentional-functional.
- **Durations:** micro 80-120ms, short 150-250ms, medium 300-450ms, cinematic
  700-1200ms only for phase/result beats.
- **Rule:** gameplay state must update from canonical state first; animation
  subscribes to that state. Animation failure must not lose or delay gameplay
  truth.
- **Poker pacing:** slower readable phase/result motion beats subtle fast motion.

## Accessibility And QA

- Icon buttons require `aria-label`, `title`, focus state and adjacent context
  when the action is game-critical.
- Text must fit fixed controls at desktop, ultrawide and mobile landscape.
- Critical colors need shape or label backup, especially success/error/turn
  states.
- Verify poker visually at 1366x768, 1920x1080, ultrawide, and mobile landscape.

## Current P0 Design Work

1. Make poker board hierarchy obvious.
2. Add visible context for action buttons and HP costs.
3. Reconcile duplicate pot/risk displays. Done: `GameHUD` is the only turn/phase/stakes rail; `WagerInfoPanel` and `TurnBanner` are unmounted.
4. Constrain `WagerInfoPanel` height across phases. Superseded by unmounting the panel.
5. Keep P2P turn/reconnect/error state visible during poker.
6. Remove unnamed layout offsets only after visual smoke confirms replacements.
7. Delete dead poker components only after grep and runtime smoke.

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-14 | Created design source of truth | The repo had poker technical docs but no active design system. |
| 2026-06-14 | Poker board clarity is P0 | Testnet cannot succeed if players cannot read turn, risk, action and result. |
| 2026-06-14 | Alfa stays dark mythic, not casino/SaaS | The game needs a serious war-table identity that supports rules comprehension. |

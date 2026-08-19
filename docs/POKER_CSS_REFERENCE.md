# Poker CSS Reference

Per-element catalog of every rendered thing in the poker arena, the CSS file that owns it, the selectors / tokens it consumes, and the state classes that change its appearance. **Code wins** if a rule here diverges from implementation; the divergence should be reconciled in the same PR.

Scope: `RagnarokCombatArena` only. Chess board (`ChessPhase`) is out of scope.
Companion docs: [POKER_ARENA_UI.md](./POKER_ARENA_UI.md) (architecture canon), [POKER_ARENA_DOM_TREE.md](./POKER_ARENA_DOM_TREE.md) (position map).

---

## 0. How to use this doc

Each section maps a **rendered thing** → **owning CSS file(s)** → **selectors** → **game values displayed** → **state classes** → **tokens consumed**.

If you're debugging a visual issue, jump to the section for the element. If you're adding a state, find the existing state classes for the element and mirror the pattern. If you're moving geometry, the right home is `board.css` (layout) or one of the visual files in `client/src/game/combat/styles/` — never the TSX.

---

## 1. CSS file inventory (62 files, ~10 200 LOC)

### 1.1 Entry chain

```
combat/styles/index.css                  ← legacy backward-compat aggregate
  └── poker-core.css                     ← modern manifest (imports 44 sub-files)
        ├── reset.css
        ├── zones.css
        ├── game-hud.css, pot-display.css, betting-controls.css, timer.css, hand-strength.css
        ├── card-frame.css, face-down.css, hole-cards.css, community-cards.css,
        │   battlefield.css, hero-card.css, hp-bar.css
        ├── turn-banner.css, targeting-prompts.css, cursors.css, responsive.css
        └── (extracted from legacy god file — see §1.3)
```

`poker-vfx.css` / `poker-showdown.css` / `poker-campaign.css` are sibling manifests loaded alongside `poker-core.css`.

### 1.2 Cascade order (per `poker-core.css`)

| Layer | Files |
|---|---|
| **Base** | `reset.css`, `zones.css` |
| **HUD** | `game-hud.css`, `pot-display.css`, `betting-controls.css`, `timer.css`, `hand-strength.css` |
| **Cards** | `card-frame.css`, `face-down.css`, `hole-cards.css`, `community-cards.css`, `battlefield.css`, `hero-card.css`, `hp-bar.css` |
| **Overlays** | `turn-banner.css`, `targeting-prompts.css`, `cursors.css`, `responsive.css` |
| **Extracted** (see §1.3) | 30+ concern-specific files |

### 1.3 Concern → file map (full list)

| File | LOC | Owns |
|---|---|---|
| [client/src/game/combat/styles/activity-logs.css](../client/src/game/combat/styles/activity-logs.css) | 114 | top-right activity dock + last action log fade-in |
| [client/src/game/combat/styles/arena-shell.css](../client/src/game/combat/styles/arena-shell.css) | 17 | scrollbar removal for arena root |
| [client/src/game/combat/styles/attack-mode-banner.css](../client/src/game/combat/styles/attack-mode-banner.css) | 107 | floating banner above player field when minion selected |
| [client/src/game/combat/styles/battle-intel.css](../client/src/game/combat/styles/battle-intel.css) | 180 | left-edge expandable card list with row/glyph |
| [client/src/game/combat/styles/battlefield-hero.css](../client/src/game/combat/styles/battlefield-hero.css) | 121 | hero frame, hover lift, clickable/targetable states |
| [client/src/game/combat/styles/battlefield.css](../client/src/game/combat/styles/battlefield.css) | 7 | mostly dead; `.opponent-hand-display` kept |
| [client/src/game/combat/styles/betting-controls.css](../client/src/game/combat/styles/betting-controls.css) | 12 | `.poker-actions` wrapper only |
| [client/src/game/combat/styles/card-frame.css](../client/src/game/combat/styles/card-frame.css) | 157 | ornate card frame gold gradient |
| [client/src/game/combat/styles/card-highlight.css](../client/src/game/combat/styles/card-highlight.css) | 43 | winning card glow + celebration |
| [client/src/game/combat/styles/combat-animations.css](../client/src/game/combat/styles/combat-animations.css) | 506 | all keyframes for combat overlays |
| [client/src/game/combat/styles/combat-phase-director.css](../client/src/game/combat/styles/combat-phase-director.css) | 351 | wager-mode phase rail; mode/window/tone tokens |
| [client/src/game/combat/styles/community-cards-row.css](../client/src/game/combat/styles/community-cards-row.css) | 67 | community slot sizing |
| [client/src/game/combat/styles/community-cards.css](../client/src/game/combat/styles/community-cards.css) | 106 | shared poker cards display |
| [client/src/game/combat/styles/cursors.css](../client/src/game/combat/styles/cursors.css) | 34 | custom SVG cursors |
| [client/src/game/combat/styles/damage-indicator.css](../client/src/game/combat/styles/damage-indicator.css) | 207 | popup + shake/flash; `position: fixed` in comment only |
| [client/src/game/combat/styles/dealer.css](../client/src/game/combat/styles/dealer.css) | 26 | gold Norse coin |
| [client/src/game/combat/styles/element-matchup-banner.css](../client/src/game/combat/styles/element-matchup-banner.css) | 161 | matchup presentation badges |
| [client/src/game/combat/styles/elemental-glows.css](../client/src/game/combat/styles/elemental-glows.css) | 514 | per-element hero glows, token-based |
| [client/src/game/combat/styles/end-turn.css](../client/src/game/combat/styles/end-turn.css) | 115 | end turn button (legacy + unified) |
| [client/src/game/combat/styles/face-down.css](../client/src/game/combat/styles/face-down.css) | 57 | opponent-hand back geometry (paint is CardCardBack) |
| [client/src/game/combat/styles/fighting-hp-bars.css](../client/src/game/combat/styles/fighting-hp-bars.css) | 209 | MK-style HP/STA bars |
| [client/src/game/combat/styles/game-hud.css](../client/src/game/combat/styles/game-hud.css) | 262 | deck count, hand count, turn counter |
| [client/src/game/combat/styles/game-over.css](../client/src/game/combat/styles/game-over.css) | 451 | victory/defeat overlay; one `105vh` use |
| [client/src/game/combat/styles/glow-effects.css](../client/src/game/combat/styles/glow-effects.css) | 225 | premium AAA glows; particle-drift tokens |
| [client/src/game/combat/styles/hand-strength-indicator.css](../client/src/game/combat/styles/hand-strength-indicator.css) | 49 | compact bar + label |
| [client/src/game/combat/styles/hand-strength.css](../client/src/game/combat/styles/hand-strength.css) | 74 | fill bar state classes `.weak` / `.medium` / `.strong` / `.very-strong` / `.royal` |
| [client/src/game/combat/styles/hero-card-frame.css](../client/src/game/combat/styles/hero-card-frame.css) | 298 | frame + premium-glow variants; particle-drift tokens |
| [client/src/game/combat/styles/hero-card.css](../client/src/game/combat/styles/hero-card.css) | 469 | pocket cards + tooltip + stats |
| [client/src/game/combat/styles/hero-death.css](../client/src/game/combat/styles/hero-death.css) | 125 | death overlay |
| [client/src/game/combat/styles/hero-elemental.css](../client/src/game/combat/styles/hero-elemental.css) | 745 | 7-element frame variants, token-based `!important` |
| [client/src/game/combat/styles/hero-reactions.css](../client/src/game/combat/styles/hero-reactions.css) | 127 | idle breathing, low HP, damage/heal flash |
| [client/src/game/combat/styles/hole-cards.css](../client/src/game/combat/styles/hole-cards.css) | 325 | hole cards + active-turn gold/red glow; suit tokens |
| [client/src/game/combat/styles/hp-bar.css](../client/src/game/combat/styles/hp-bar.css) | 127 | bold readable health display |
| [client/src/game/combat/styles/index.css](../client/src/game/combat/styles/index.css) | 7 | backward-compat aggregate |
| [client/src/game/combat/styles/mana-display.css](../client/src/game/combat/styles/mana-display.css) | 14 | mana gem chip |
| [client/src/game/combat/styles/norse-atmosphere.css](../client/src/game/combat/styles/norse-atmosphere.css) | 244 | fog, vignette, turn-glow |
| [client/src/game/combat/styles/opponent-hand.css](../client/src/game/combat/styles/opponent-hand.css) | 44 | revealed card + count badge |
| [client/src/game/combat/styles/p2p-turn-status.css](../client/src/game/combat/styles/p2p-turn-status.css) | 118 | 4-state peer-status pill |
| [client/src/game/combat/styles/pet-god-card.css](../client/src/game/combat/styles/pet-god-card.css) | 155 | compact preview widget |
| [client/src/game/combat/styles/poker-betting.css](../client/src/game/combat/styles/poker-betting.css) | 738 | action panels + slider + raise/call/fold/check; `vw` in clamps; button tokens |
| [client/src/game/combat/styles/poker-campaign.css](../client/src/game/combat/styles/poker-campaign.css) | 3 | `@import` manifest |
| [client/src/game/combat/styles/poker-core.css](../client/src/game/combat/styles/poker-core.css) | 53 | main `@import` manifest (45+ files) |
| [client/src/game/combat/styles/poker-drama.css](../client/src/game/combat/styles/poker-drama.css) | 404 | tension vignette + phase banner + hand-strength tier; phase tokens |
| [client/src/game/combat/styles/poker-showdown.css](../client/src/game/combat/styles/poker-showdown.css) | 296 | `@import` + winning card glow |
| [client/src/game/combat/styles/poker-stats.css](../client/src/game/combat/styles/poker-stats.css) | 96 | stat badges |
| [client/src/game/combat/styles/poker-timer.css](../client/src/game/combat/styles/poker-timer.css) | 66 | minimal timer + in-panel timer |
| [client/src/game/combat/styles/poker-vfx.css](../client/src/game/combat/styles/poker-vfx.css) | 12 | optional VFX manifest |
| [client/src/game/combat/styles/pot-display.css](../client/src/game/combat/styles/pot-display.css) | 43 | risk display badge |
| [client/src/game/combat/styles/ragnarok-art-ui.css](../client/src/game/combat/styles/ragnarok-art-ui.css) | 68 | art overlay URLs |
| [client/src/game/combat/styles/realm-boards.css](../client/src/game/combat/styles/realm-boards.css) | 568 | 10 realm skins |
| [client/src/game/combat/styles/reset.css](../client/src/game/combat/styles/reset.css) | 27 | scrollbar hide + base |
| [client/src/game/combat/styles/responsive.css](../client/src/game/combat/styles/responsive.css) | 37 | dead mobile media query (GameViewport scales canvas) |
| [client/src/game/combat/styles/risk-breakdown.css](../client/src/game/combat/styles/risk-breakdown.css) | 21 | you/them + sep |
| [client/src/game/combat/styles/spell-screen-effects.css](../client/src/game/combat/styles/spell-screen-effects.css) | 56 | element tints |
| [client/src/game/combat/styles/targeting-prompts.css](../client/src/game/combat/styles/targeting-prompts.css) | 90 | targeting modal |
| [client/src/game/combat/styles/timer.css](../client/src/game/combat/styles/timer.css) | 156 | hourglass timer |
| [client/src/game/combat/styles/turn-banner.css](../client/src/game/combat/styles/turn-banner.css) | 141 | persistent turn badge |
| [client/src/game/combat/styles/unified-containers.css](../client/src/game/combat/styles/unified-containers.css) | 106 | `.poker-hero` / `.opponent-hero` / `.poker-hand` containers |
| [client/src/game/combat/styles/wager-effects.css](../client/src/game/combat/styles/wager-effects.css) | 57 | left-edge effect ticker |
| [client/src/game/combat/styles/zones.css](../client/src/game/combat/styles/zones.css) | 28 | zone tokens |
| [client/src/game/poker/styles/canvas.css](../client/src/game/poker/styles/canvas.css) | — | consumes `--poker-zone-*` from `pokerViewportLayout.ts`; `.unified-combat-arena` placement |

---

## 2. Five-board zones

`.unified-combat-arena` is an absolute board. Zone boxes are authored in [pokerViewportLayout.ts](../client/src/game/poker/layout/pokerViewportLayout.ts). See [POKER_ARENA_UI.md §3](./POKER_ARENA_UI.md).

| # | Zone component | Layout zone id | Owns |
|---|---|---|---|
| 1 | `OpponentZone` | `opponentHero` / `opponentHand` | opponent hero, hole cards, hand count, boss pips |
| 2 | `MinionField role="opp"` | `opponentBattlefieldCards` | opponent battlefield cards |
| 3 | `BoardZone` | `communityCards` | community cards (5 slots) |
| 4 | `MinionField role="player"` | `playerBattlefieldCards` | player battlefield cards |
| 5 | `PlayerZone` | `playerHero` / `playerHand` | player hero, hand fan, resources, bet stack |

For zone-level movement, edit `pokerViewportLayout.ts`. Inside zones, edit the per-element CSS files (§3-§8).

---

## 3. Game value reference table — what every element shows

This is the audit gold: every rendered thing in the arena, what game value it displays, and which CSS file owns it.

### 3.1 HUD ribbon (`[data-zone="game-hud"]`)

| Element | TSX | CSS owner | Selectors | Game values shown | State classes |
|---|---|---|---|---|---|
| HUD top ribbon | `GameHUD.tsx` | [game-hud.css](../client/src/game/combat/styles/game-hud.css) | `.game-hud`, `.hud-status-ribbon`, `.hud-status-chip` | ribbon container | `.player-active`, `.opponent-active` |
| Turn chip | `GameHUD.tsx` | `game-hud.css` | `.hud-status-turn` | current turn number | — |
| Phase chip | `GameHUD.tsx` | `game-hud.css` | `.hud-status-phase` | current phase name | per phase (see §5) |
| Initiative chip | `GameHUD.tsx` | `game-hud.css` | `.hud-status-initiative` | who acts first | — |
| Pot chip | `GameHUD.tsx` | `game-hud.css` | `.hud-status-pot` | current pot total | — |
| Matchup badge | `GameHUD.tsx` | `game-hud.css` | `.hud-matchup-badge` | elemental matchup hint | `.advantage`, `.disadvantage`, `.neutral-matchup` |
| Player deck badge | `GameHUD.tsx` | `game-hud.css` | `.hud-player-deck`, `.hud-deck-badge` | cards left in player deck | `.empty`, `.low-deck` |
| Opponent deck badge | `GameHUD.tsx` | `game-hud.css` | `.hud-opponent-deck`, `.hud-deck-badge` | cards left in opponent deck | `.empty`, `.low-deck` |
| Opponent hand badge | `GameHUD.tsx` | `game-hud.css` | `.hud-opponent-hand` | opponent hand count | — |

### 3.2 Opponent zone (`.zone-opp`)

| Element | TSX | CSS owner | Selectors | Game values shown | State classes |
|---|---|---|---|---|---|
| Opponent hero card | `BattlefieldHero.tsx` | [battlefield-hero.css](../client/src/game/combat/styles/battlefield-hero.css) | `.battlefield-hero`, `.hero-card` | opponent hero portrait | `.clickable`, `.targetable`, `.turn-active` |
| Opponent HP / STA bars | `BattlefieldHero.tsx` | [fighting-hp-bars.css](../client/src/game/combat/styles/fighting-hp-bars.css) | `.hp-bar`, `.sta-bar` | current/max HP, current/max STA | `.hero-low-hp`, `.hero-critical-hp` |
| Opponent hero reactions | `BattlefieldHero.tsx` | [hero-reactions.css](../client/src/game/combat/styles/hero-reactions.css) | `.hero-reaction` | damage flash, heal flash, low-HP breathing | `.damage-shake`, `.damage-flash`, `.damage-heal` |
| Boss quip bubble | `BossQuipBubble.tsx` | `BossQuipBubble.css` | `.boss-quip-bubble`, `.boss-quip-portrait` | boss line of dialogue | — |
| Phase pip indicator | `PhasePipIndicator.tsx` | `PhasePipIndicator.css` | `.phase-pip-indicator`, `.phase-pip` | 4 phase pips (PRE_FLOP / FAITH / FORESIGHT / DESTINY) | `.phase-pip-fired` |
| Opponent hole cards | `HoleCardsOverlay.tsx` | [hole-cards.css](../client/src/game/combat/styles/hole-cards.css) | `.opponent-hole-cards`, `.hero-pocket-cards--opponent` | 2 face-down cards (revealed on showdown) | `.hole-cards-active-turn` |
| Opponent hand display | `OpponentZone.tsx` | [opponent-hand.css](../client/src/game/combat/styles/opponent-hand.css) | `.opponent-hand-display`, `.opponent-card-back` | fan of 1-10 card backs | — |
| Opponent hand count badge | `OpponentZone.tsx` | `opponent-hand.css` | `.opponent-hand-count` | numeric hand size | — |
| Opponent revealed card | `OpponentZone.tsx` | `opponent-hand.css` | `.opponent-revealed-card` | a single face-up opponent card | — |
| Opponent resource dock | `HeroResourceDock.tsx` | `hero-resource.css` (port) | `.hero-resource-dock` | mana gem, eitr, etc. | — |

### 3.3 Board zone (`.zone-board`)

| Element | TSX | CSS owner | Selectors | Game values shown | State classes |
|---|---|---|---|---|---|
| Community card row | `BoardZone.tsx` | [community-cards.css](../client/src/game/combat/styles/community-cards.css) | `.community-row`, `.community-cards-section` | flex row of 5 slots | — |
| Community card slot | `BoardZone.tsx` | `community-cards.css` + [community-cards-row.css](../client/src/game/combat/styles/community-cards-row.css) | `.community-slot` | one face-up poker card OR placeholder | — |
| Empty community placeholder | `BoardZone.tsx` | `community-cards.css` | `.card-placeholder` | "ᛟ" rune outline until dealt | — |
| Community slot label | `BoardZone.tsx` | `community-cards.css` | `.slot-label`, `.slot-label.dimmed` | "FLOP" / "TURN" / "RIVER" tag | `.dimmed` when slot not yet revealed |
| Dealer coin | (dealer button) | [dealer.css](../client/src/game/combat/styles/dealer.css) | `.dealer-coin` | gold Norse coin marking the button | — |
| Card highlight glow | (showdown only) | [card-highlight.css](../client/src/game/combat/styles/card-highlight.css) | `.winning-card-glow` | winning cards pulse on showdown | `.celebration` |

### 3.4 Player field (`.zone-player-field`) and player zone (`.zone-player`)

| Element | TSX | CSS owner | Selectors | Game values shown | State classes |
|---|---|---|---|---|---|
| Player hero card | `BattlefieldHero.tsx` | [battlefield-hero.css](../client/src/game/combat/styles/battlefield-hero.css) | `.battlefield-hero` | player hero portrait | `.clickable`, `.targetable`, `.turn-active` |
| Player HP / STA bars | `BattlefieldHero.tsx` | [hp-bar.css](../client/src/game/combat/styles/hp-bar.css) + [fighting-hp-bars.css](../client/src/game/combat/styles/fighting-hp-bars.css) | `.hp-bar`, `.player-hp-bar` | current/max HP, current/max STA, % fill | `.hero-low-hp`, `.hero-critical-hp` |
| Player hand fan | `PlayerZone.tsx` | [hole-cards.css](../client/src/game/combat/styles/hole-cards.css) | `.player-hole-cards` | 2 face-up hole cards | `.hole-cards-active-turn` |
| Hand-strength bar (full) | `HandStrengthIndicator.tsx` | [hand-strength.css](../client/src/game/combat/styles/hand-strength.css) | `.hand-strength-bar`, `.hand-strength-fill` | fill % of current best hand tier | `.weak` / `.medium` / `.strong` / `.very-strong` / `.royal` |
| Hand-strength compact | `PlayerZone.tsx` | [hand-strength-indicator.css](../client/src/game/combat/styles/hand-strength-indicator.css) | `.hand-strength-compact`, `.strength-name` | compact hand name + bar | — |
| Player resource dock | `HeroResourceDock.tsx` | `hero-resource.css` (port) | `.hero-resource-dock` | mana gem, eitr | — |

### 3.5 Betting surface (`[data-zone="betting-panel"]`, `[data-zone="wager-info-panel"]`)

| Element | TSX | CSS owner | Selectors | Game values shown | State classes |
|---|---|---|---|---|---|
| Betting panel | `BettingPanel.tsx` | [poker-betting.css](../client/src/game/combat/styles/poker-betting.css) | `.betting-panel`, `.poker-actions`, `.action-buttons-group` | root container | — |
| Quick-bet chips | `BettingPanel.tsx` | `poker-betting.css` | `.poker-quick-bets`, `.quick-bet-btn` | min / ½ / pot / max shortcuts | `.is-active` |
| HP slider | `BettingPanel.tsx` | `poker-betting.css` | `.poker-hp-slider-container`, `.poker-hp-slider`, `.slider-value` | current slider value | — |
| Raise / Call / Fold / Check / All-in / Auto-attack buttons | `BettingPanel.tsx` | `poker-betting.css` | `.poker-btn.raise-btn` / `.call-btn` / `.fold-btn` / `.all-in` / `.auto-attack-btn` | bet action label + icon | `.is-disabled` |
| Wager info panel | `WagerInfoPanel.tsx` | (Tailwind `right-5 top-30 z-500 w-85`) | — | WagerInfoPanel wrapper (see §6 dupe) | — |
| Combat phase director (inside WagerInfoPanel) | `CombatPhaseDirector.tsx` | [combat-phase-director.css](../client/src/game/combat/styles/combat-phase-director.css) | `.combat-phase-director`, `.combat-phase-director-topline`, `.combat-phase-rail`, `.combat-phase-step` | wager-mode phase rail | `.mode-${mode}`, `.player-window`, `.opponent-window`, `.is-waiting`; `.pill.tone-${tone}`; `.combat-phase-step.complete`, `.current` |

### 3.6 Risk / pot display

| Element | TSX | CSS owner | Selectors | Game values shown | State classes |
|---|---|---|---|---|---|
| Risk badge (total HP at stake) | (RiskDisplay in arena) | [pot-display.css](../client/src/game/combat/styles/pot-display.css) | `.risk-display`, `.risk-label`, `.risk-value` | "RISK" label + total HP | — |
| Pot display | (PotDisplay component) | `pot-display.css` (or hud) | `.pot-display` | current pot | — |
| Risk breakdown | (you/them split) | [risk-breakdown.css](../client/src/game/combat/styles/risk-breakdown.css) | `.risk-breakdown`, `.risk-row` | your contribution + opponent contribution | — |
| Wager effects ticker | (left edge) | [wager-effects.css](../client/src/game/combat/styles/wager-effects.css) | `.wager-effect` | last wager animation log | — |

### 3.7 Status badges and indicators

| Element | TSX | CSS owner | Selectors | Game values shown | State classes |
|---|---|---|---|---|---|
| Hourglass timer | `Timer.tsx` | [timer.css](../client/src/game/combat/styles/timer.css) | `.hourglass-timer`, `.hourglass-svg` | seconds left | `.low-time`, `.critical`, `.expired` |
| In-panel timer (poker) | (in CombatPhaseDirector) | [poker-timer.css](../client/src/game/combat/styles/poker-timer.css) | `.poker-timer` | seconds left | — |
| Persistent turn badge | `TurnBanner.tsx` | [turn-banner.css](../client/src/game/combat/styles/turn-banner.css) | `.persistent-turn-badge` | "YOUR TURN" / "ENEMY TURN" | `.player-turn`, `.opponent-turn` |
| Phase banner (transient) | `PhaseBanner.tsx` | `turn-banner.css` (port) + [poker-drama.css](../client/src/game/combat/styles/poker-drama.css) | `.phase-banner`, `.phase-banner-content` | "FIRST BLOOD" / "FAITH" / etc. | `data-phase=${bannerData.key}`; `.phase-banner-enter` / `.exit` |
| Action announcement | (ActionAnnouncement) | `norse-atmosphere.css` (slam) | `.action-announcement-container` | action name reveal | — |
| P2P turn status pill | `PokerP2PTurnStatus.tsx` | [p2p-turn-status.css](../client/src/game/combat/styles/p2p-turn-status.css) | `.p2p-poker-turn-status` | peer state | `.state-idle`, `.state-thinking`, `.state-ready`, `.state-error` |
| Battle-intel button + panel | `BattleIntel.tsx` | [battle-intel.css](../client/src/game/combat/styles/battle-intel.css) | `.battle-intel`, `.battle-intel-row` | current effects per side | `.with-icon`, `.player`, `.opponent` |
| Element matchup banner | `ElementMatchupBanner.tsx` | [element-matchup-banner.css](../client/src/game/combat/styles/element-matchup-banner.css) | `.element-matchup-overlay`, `.matchup-element-badge`, `.matchup-result` | elemental matchup diagram | `.mutual`, `.advantage`, `.disadvantage`, `.neutral` |
| Realm indicator | (RealmIndicator) | `norse-atmosphere.css` | `.realm-indicator`, `.realm-indicator-name` | active realm | — |
| Realm announcement | (transient) | `norse-atmosphere.css` | `.realm-announcement` | realm name + description | — |
| Hand-strength tier (full) | `HandStrengthIndicator.tsx` | [poker-drama.css](../client/src/game/combat/styles/poker-drama.css) | (tier color tokens) | tier-tinted hand-strength bar | `.tier-low`, `.tier-mid`, `.tier-high`, `.tier-godly` |

### 3.8 Minion / spell / targeting UI

| Element | TSX | CSS owner | Selectors | Game values shown | State classes |
|---|---|---|---|---|---|
| Minion field row | `MinionField.tsx` | (zone defaults) | `.minion-field`, `.minion-field--${role}` | row of battlefield cards | — |
| Attack-mode banner | `AttackSystem.tsx` | [attack-mode-banner.css](../client/src/game/combat/styles/attack-mode-banner.css) | `.attack-mode-banner` | "SELECT TARGET" | — |
| Targeting prompt | `TargetingPrompt.tsx` | [targeting-prompts.css](../client/src/game/combat/styles/targeting-prompts.css) | `.targeting-prompt` | targeting hint | — |
| Hero-power targeting | `HeroPowerPrompt.tsx` | `targeting-prompts.css` | `.targeting-prompt.hero-power-targeting` | hero power hint | — |
| Spell screen effects | (element tints) | [spell-screen-effects.css](../client/src/game/combat/styles/spell-screen-effects.css) | (data attribute) | element flash tints | ⚠ no live JSX binding (see §6 orphans) |
| Elemental glows | (hero + cards) | [elemental-glows.css](../client/src/game/combat/styles/elemental-glows.css) | `.elemental-glow` | per-element color halo | per element |
| Card highlight on win | (showdown) | [card-highlight.css](../client/src/game/combat/styles/card-highlight.css) | `.winning-card-glow` | winning cards | — |
| Activity logs dock | (top-right) | [activity-logs.css](../client/src/game/combat/styles/activity-logs.css) | `.activity-logs` | last action log entries | — |
| Mulligan notice | (mulligan start) | (inline) | `.mulligan-notice`, `.mulligan-text`, `.mulligan-subtext` | "MULLIGAN" prompt | ⚠ part of MulliganScreen? (see §6) |

### 3.9 Card visual identity

| Element | TSX | CSS owner | Selectors | Game values shown | State classes |
|---|---|---|---|---|---|
| Generic card frame | `PlayingCard.tsx` (or `CardRenderer.tsx`) | [card-frame.css](../client/src/game/combat/styles/card-frame.css) | `.card-frame` | ornate gold frame | — |
| Face-down card back | hole + opponent hand + community | [pokerFaceDown.css](../client/src/game/components/card/pokerFaceDown.css) | `.poker-face-down-surface` + `<CardCardBack>` | solid dark + gold rim + Eihwaz | — |
| Suit accent | `PlayingCard.tsx` | [hole-cards.css](../client/src/game/combat/styles/hole-cards.css) | `.arena-poker-card.norse.spades` / `.hearts` / `.diamonds` / `.clubs` | suit color via `--suit-accent` | per suit (see §5) |
| Corner rune (card) | `PlayingCard.tsx` | `hole-cards.css` | `.arena-poker-card .corner-rune.top-left` etc. | decorative corner runes | — |
| Card value text | `PlayingCard.tsx` | `hole-cards.css` | `.arena-poker-card .card-value`, `.card-rune` | value + suit rune | — |
| Card center symbol | `PlayingCard.tsx` | `hole-cards.css` | `.norse-symbol-large`, `.face-card-symbol` | large center icon | — |
| Large variant (hand fan) | `PlayingCard.tsx` | `hole-cards.css` | `.arena-poker-card.norse.large` | 144×202px | `.large` |

### 3.10 Overlays and modals

| Element | TSX | CSS owner | Selectors | Game values shown | State classes |
|---|---|---|---|---|---|
| Mulligan screen | `MulliganScreen.tsx` | (modal portal) | `.mulligan-screen` | "MULLIGAN — pick cards to swap" | — |
| Showdown celebration | `ShowdownCelebration.tsx` | [poker-showdown.css](../client/src/game/combat/styles/poker-showdown.css) | `.showdown-celebration-container`, `.winner-badge` | winner hand name + HP delta | `.player-side`, `.opponent-side`, `.center` |
| Game over screen | `GameOverScreen.tsx` | [game-over.css](../client/src/game/combat/styles/game-over.css) | `.game-over-overlay`, `.game-over-panel` | "VICTORY" / "DEFEAT" / "DRAW" | `.victory`, `.defeat`, `.draw` |
| Hero gear panel | `HeroGearPanel.tsx` | `HeroGearPanel.css` | `.hero-gear-panel`, `.gear-slot` | artifacts + armor | `.artifact-slot`, `.armor-slot`, `.filled`, `.empty`, `.spent` |
| Hero death animation | `HeroDeathAnimation.tsx` | [hero-death.css](../client/src/game/combat/styles/hero-death.css) | `.hero-death-overlay` | KO sequence | `.player`, `.opponent` |
| First-strike animation | `FirstStrikeAnimation.tsx` | (overlay) | `.first-strike-overlay` | "FIRST STRIKE" 15 dmg | — |
| Boss phase flash | `BossPhaseFlash.tsx` | `BossPhaseFlash.css` | `.boss-phase-flash` | boss transition flash | `.boss-phase-flash-${flash}` |
| King passive popup | `KingPassivePopup.tsx` | `KingPassivePopup.css` | `.king-passive-popup`, `.kpp-player` / `.kpp-opponent` | king ability trigger | — |
| Element buff popup | `ElementBuffPopup.tsx` | (component) | `.element-buff-popup` | element change | ⚠ CSS not audited (DOM_TREE §22) |
| Hero battle popup (×n) | `HeroBattlePopup.tsx` | `HeroBattlePopup.css` | `.hbp-overlay`, `.hbp-${action}` | "ATTACK" / "DEFEND" etc. | per action |
| Damage indicator (×n) | `DamageIndicator.tsx` | [damage-indicator.css](../client/src/game/combat/styles/damage-indicator.css) | `.damage-indicator`, `.damage-number-text` | floating damage number | `.damage-heal`, `.damage-big`, `.damage-critical` |
| Targeting overlay (SVG line) | `TargetingOverlay.tsx` | (overlay) | `.targeting-overlay` | attack line from attacker to target | — |
| Card burn overlay | `CardBurnOverlay.tsx` | (overlay) | `.card-burn-overlay` | burn-to-ash effect | — |
| First-strike animation | `FirstStrikeAnimation.tsx` | (overlay) | `.first-strike-overlay` | opening 15 dmg | — |
| Poker combat animation | `PokerCombatAnimation.tsx` | [combat-animations.css](../client/src/game/combat/styles/combat-animations.css) | `.melee-slash-trail`, `.ranged-projectile`, `.magic-blast-ring`, `.divine-rays`, `.nature-wave`, `.shadow-tendril` | attack VFX per element | per element |
| Pixi particle canvas | `PixiParticleCanvas.tsx` | (canvas, no CSS) | — | realm particles | — |
| Animation overlay | `AnimationOverlay.tsx` | (overlay) | — | generic VFX root | — |
| Opponent thinking indicator | (RagnarokCombatArena) | (overlay) | `.opponent-thinking-indicator` | "..." while AI thinks | — |
| Realm particles | `PixiParticleCanvas.tsx` | (canvas) | — | per-realm particles | per realm |
| Cursors | (global) | [cursors.css](../client/src/game/combat/styles/cursors.css) | (custom SVG cursors) | per-state cursor | per state |

---

## 4. Token inventory

All tokens are CSS custom properties. **Always prefer tokens over magic values** when adding a rule. New tokens belong in `client/src/styles/tokens.css` (globals) or in the file that owns them (concern-scoped).

### 4.1 Layout / board tokens (live in [board.css](../client/src/game/combat/layout/board.css))

| Token | Default | Used by | Purpose |
|---|---|---|---|
| `--arena-zone-min-height` | `166px` | zone grid | min row height |
| `--arena-z-opponent-field` | `150` | stacking | opp field layer |
| `--arena-z-board` | `160` | stacking | board layer |
| `--arena-z-opponent` | `180` | stacking | opponent zone |
| `--arena-z-player-field` | `190` | stacking | player field |
| `--arena-z-player` | `220` | stacking | player zone |
| `--poker-zone-*` | various | `[data-zone="…"]` bindings | positioning for betting/wager/p2p panels |
| `--zone-poker-card-scale` | `1` | `HoleCardsOverlay` | hole card zoom |
| `--zone-hole-cards-opponent-offset` | `-80px` | `HoleCardsOverlay` | opp hole vertical offset |

### 4.2 UI / color tokens (live in [client/src/styles/tokens.css](../client/src/styles/tokens.css))

Family | Examples | Purpose
---|---|---
`--ui-*` | `--ui-panel-bg`, `--ui-gold-bright`, `--ui-gold-glow-soft`, `--ui-gold-glow-hard`, `--ui-selection-pale` | shared UI palette
`--gold-*` | `--gold-300`, `--gold-400` | gold accents
`--frost-*`, `--crimson-*`, `--bifrost-*`, `--cobalt-*`, `--ember-*` | theme colors
`--danger-*`, `--success-*`, `--rarity-*` | semantic colors
`--space-*` | spacing scale (10-step) | layout
`--text-*` | text size scale | typography
`--radius-*` | radius scale | rounded corners
`--type-display`, `--type-body` | font families | typography
`--font-display` | display font fallback | Cinzel etc.
`--z-*` | z-index scale | layering

### 4.3 Concern-scoped tokens

| File | Token | Default | Purpose |
|---|---|---|---|
| [pot-display.css](../client/src/game/combat/styles/pot-display.css) | `--zone-risk-left` | `15%` | risk badge x |
| [pot-display.css](../client/src/game/combat/styles/pot-display.css) | `--zone-risk-bottom` | `340px` | risk badge y |
| [pot-display.css](../client/src/game/combat/styles/pot-display.css) | `--z-risk` | `50` | risk badge z |
| [combat-phase-director.css](../client/src/game/combat/styles/combat-phase-director.css) | `--director-accent` | `#f8d483` | phase rail accent |
| [combat-phase-director.css](../client/src/game/combat/styles/combat-phase-director.css) | `--director-accent-soft` | `rgba(…)` | accent halo |
| [combat-phase-director.css](../client/src/game/combat/styles/combat-phase-director.css) | `--director-panel` | `rgba(8,12,22,0.96)` | rail panel |
| [combat-phase-director.css](../client/src/game/combat/styles/combat-phase-director.css) | `--director-panel-deep` | `rgba(5,8,16,0.98)` | rail sub-panel |
| [combat-phase-director.css](../client/src/game/combat/styles/combat-phase-director.css) | `--director-line` | `rgba(…)` | rail divider |
| [combat-phase-director.css](../client/src/game/combat/styles/combat-phase-director.css) | `--director-text` | `rgba(241,245,249,0.9)` | rail text |
| [combat-phase-director.css](../client/src/game/combat/styles/combat-phase-director.css) | `--director-muted` | `rgba(203,213,225,0.72)` | rail sub-text |
| [poker-betting.css](../client/src/game/combat/styles/poker-betting.css) | `--poker-button-top/mid/bottom/rim/accent/copy` | 5 themes | button face colors |
| [poker-betting.css](../client/src/game/combat/styles/poker-betting.css) | `--poker-button-cut` | `3px` | button chamfer |
| [poker-betting.css](../client/src/game/combat/styles/poker-betting.css) | `--poker-button-inner-cut` | `2px` | inner chamfer |
| [poker-drama.css](../client/src/game/combat/styles/poker-drama.css) | `--phase-color` | per-phase token | drama tint |
| [poker-drama.css](../client/src/game/combat/styles/poker-drama.css) | `--phase-glow` | per-phase token | drama glow |
| [hole-cards.css](../client/src/game/combat/styles/hole-cards.css) | `--suit-accent` | per-suit value | suit color (set on `.spades`/`.hearts`/`.diamonds`/`.clubs`) |
| [opponent-hand.css](../client/src/game/combat/styles/opponent-hand.css) | `--opponent-hand-count-size` | `24px` | hand-count badge |
| [hero-card-frame.css](../client/src/game/combat/styles/hero-card-frame.css), [glow-effects.css](../client/src/game/combat/styles/glow-effects.css) | `--particle-drift-*` | 10 variants of px offsets | particle drift animation |

### 4.4 Suit accent (defined inline on `.arena-poker-card.norse`)

| Suit | `--suit-accent` |
|---|---|
| spades | `#2d4a3d` |
| hearts | `#8b3a3a` |
| diamonds | `#5c4a2a` |
| clubs | `#3a4a5c` |

---

## 5. State hook quick reference

These are the **dynamic class hooks** that change a rendered thing's appearance based on game state. When adding a new state, mirror the existing pattern.

### 5.1 Phase

Set on `<CombatPhaseDirector>` (`.mode-${mode}`) and `<PhaseBanner>` (`data-phase`). Poker phase literals come from `PhaseManager.ts` `BETTING_ROUND_MAP` keys.

| Phase | `pre_flop` | `faith` | `foresight` | `destiny` | `resolution` |
|---|---|---|---|---|---|
| Community cards revealed | 0 | 3 (flop) | 4 (turn) | 5 (river) | 5 (showdown) |
| Wager round | preflop | flop | turn | river | — |
| Phase banner | FIRST BLOOD | FAITH | FORESIGHT | DESTINY | RESOLUTION |

### 5.2 Element

`fire`, `electric`, `water`, `ice`, `light`, `holy`, `dark`, `shadow`, `grass`, `earth`, `wind`, `neutral`. Per-element color halos live in [elemental-glows.css](../client/src/game/combat/styles/elemental-glows.css); per-element frame variants in [hero-elemental.css](../client/src/game/combat/styles/hero-elemental.css).

### 5.3 Suit

`spades`, `hearts`, `diamonds`, `clubs` — set on `.arena-poker-card.norse` to drive `--suit-accent`.

### 5.4 Hand tier

Tier classes drive the hand-strength bar fill and the drama-tinted compact:

| Class | Color | Tier |
|---|---|---|
| `.weak` | red gradient | low pair / high card |
| `.medium` | amber gradient | two pair / straight draw |
| `.strong` | green gradient | straight / flush |
| `.very-strong` | violet gradient + glow | full house / straight flush |
| `.royal` | gold shimmer + animation | royal flush / godly tier |
| `.tier-low` / `.tier-mid` / `.tier-high` / `.tier-godly` | (drama colors) | alternate tier names used on full indicator |

### 5.5 Turn

| Class | Effect |
|---|---|
| `.active-turn` | generic "this side is acting" |
| `.player-turn` | persistent badge says "YOUR TURN" |
| `.opponent-turn` | persistent badge says "ENEMY TURN" |
| `.hole-cards-active-turn` | gold (player) / red (opponent) glow on hole cards |
| `.turn-active` | hero frame glows |

### 5.6 HP / damage

| Class | Effect |
|---|---|
| `.hero-low-hp` | HP bar warning tint |
| `.hero-critical-hp` | HP bar critical + pulse |
| `.damage-shake` | hero shake |
| `.damage-flash` | red flash on hit |
| `.damage-heal` | green flash on heal |
| `.damage-big` / `.damage-critical` | larger floating damage number |

### 5.7 Peer / P2P

On `.p2p-poker-turn-status`:
| Class | Meaning |
|---|---|
| `.state-idle` | peer waiting |
| `.state-thinking` | peer thinking |
| `.state-ready` | peer ready to act |
| `.state-error` | connection error |

### 5.8 Combat phase director

On `.combat-phase-director`:
- `.mode-${mode}` — wager mode
- `.player-window` / `.opponent-window` — whose window
- `.is-waiting` — waiting on peer
- `.pill.tone-${tone}` — pill tone (info/warn/danger/etc.)
- `.combat-phase-step.complete` / `.current` — rail step state

### 5.9 Matchup

On `.hud-matchup-badge` / `.matchup-result`:
| Class | Meaning |
|---|---|
| `.advantage` / `.advantage-bonuses` | your element hits theirs |
| `.disadvantage` / `.disadvantage-bonuses` | theirs hits yours |
| `.neutral-matchup` / `.neutral` | equal |
| `.mutual` / `.mutual-bonuses` | both strong |

### 5.10 Deck / timer

| Class | Effect |
|---|---|
| `.empty` | deck count zero |
| `.low-deck` | deck count low (warning) |
| `.low-time` | timer under threshold |
| `.critical` | timer critical |
| `.expired` | timer zero |

### 5.11 Card face

| Class | Effect |
|---|---|
| `.face-down` | Norse back, no value |
| `.face-up` | value + suit visible |
| `.norse` | Norse card skin |
| `.large` | 144×202 hand-fan size (default 100×140) |
| `.winning-card-glow` | showdown winning cards |
| `.celebration` | showdown celebration pulse |

---

## 6. Anti-patterns and audit (the "disaster" the user sensed)

### 6.1 Magic offsets (raw px that should be tokens)

| Location | Current value | Suggested token |
|---|---|---|
| [hole-cards.css:18](../client/src/game/combat/styles/hole-cards.css) | `margin-bottom: -35px` on `.player-hole-cards` | `--zone-player-hole-cards-overlap` |
| [hole-cards.css:23](../client/src/game/combat/styles/hole-cards.css) | `margin-bottom: -30px` on `.opponent-hole-cards` | `--zone-opponent-hole-cards-overlap` |
| `HoleCardsOverlay.tsx:57` | `Tailwind -ml-3.75` on second `.hole-card-slot` | `--zone-hole-card-overlap` |
| `HoleCardsOverlay.tsx:57` | `rotate-[-8deg]` / `rotate-[8deg]` | `--zone-hole-card-rotate` |
| `HoleCardsOverlay.tsx:110` | `marginTop: var(--zone-hole-cards-opponent-offset, -80px)` fallback `-80px` | make `--zone-hole-cards-opponent-offset` defined in tokens.css |
| `OpponentZone.tsx` | `scale-[0.4] -mx-8` on `.opponent-revealed-card` | `--opponent-revealed-card-scale`, `--opponent-revealed-card-overlap` |
| `WagerInfoPanel.tsx` | `right-5 top-30 z-500 w-85 max-w-85` (Tailwind) | move to `board.css` `poker-zone-wager-info-panel` |
| `RagnarokCombatArena.tsx:1110-1112` | inline `zIndex={0}/{500}/{900}` on layer wrappers | use `--arena-z-layer-*` tokens (board.css has `arena-z-*` zone tokens but not layer tokens) |
| `RagnarokCombatArena.tsx:676` | `Tailwind -translate-x-1/2 -translate-y-1/2` on `.mulligan-notice` | positioning belongs in CSS |

### 6.2 CSS ↔ Tailwind dupes (pick one owner per hotspot)

| Hotspot | Both define | Pick |
|---|---|---|
| `.poker-hero-container` | CSS sets `flex/flex-col/items-center/gap-2`; JSX repeats same Tailwind | **delete CSS** (Tailwind is the surface) |
| `.opponent-hero-container` | same dupe | **delete CSS** |
| `.poker-hand-container` | CSS has `transform: translateY(-50px)`; JSX has Tailwind flex | keep CSS for the offset, drop the rest |
| `.betting-controls-bar` | CSS has `margin-left: 240px` magic | verify still rendered, then move to token |
| `.unified-hero-section` / `.unified-hand-section` | CSS has `transform: translateY(10px)` magic | name the purpose (`--player-zone-y`?) or delete |
| `WagerInfoPanel.tsx` | Tailwind positions + `board.css` `[data-zone='wager-info-panel']` | keep CSS, drop Tailwind |
| `OpponentZone.tsx` | Tailwind `scale-[0.4] -mx-8` + `opponent-hand.css` `.opponent-revealed-card` | keep CSS, drop Tailwind |
| `PlayerZone.tsx` `.hand-strength-compact` | Tailwind stack overrides `hand-strength-indicator.css` | pick one — recommend CSS for spacing, Tailwind for layout |
| `HoleCardsOverlay.tsx` non-`positionAbsolute` branch | Tailwind `flex flex-row items-center justify-center pointer-events-none z-10 gap-1` | move to `hole-cards.css` |
| `RagnarokCombatArena.tsx` `mulligan-notice` | Tailwind positions + CSS styles | consolidate into CSS |

### 6.3 Dead or near-dead files

| File | LOC | Note |
|---|---|---|
| [battlefield.css](../client/src/game/combat/styles/battlefield.css) | 7 | only `.opponent-hand-display` kept; rest moved to `opponent-hand.css`. Verify remaining rule still used. |
| [responsive.css](../client/src/game/combat/styles/responsive.css) | 37 | mobile media query unreferenced; `GameViewport` scales canvas. **Delete.** |
| [betting-controls.css](../client/src/game/combat/styles/betting-controls.css) | 12 | single `.poker-actions` rule; rest moved to `poker-betting.css`. Verify still used. |
| [ragnarok-art-ui.css](../client/src/game/combat/styles/ragnarok-art-ui.css) | 68 | URL tokens only; verify consumed via `realm-boards.css` `@import`. |
| [index.css](../client/src/game/combat/styles/index.css) | 7 | backward-compat aggregate; verify imported. |
| [poker-campaign.css](../client/src/game/combat/styles/poker-campaign.css) | 3 | `@import` manifest; verify imported in main entry. |
| [poker-vfx.css](../client/src/game/combat/styles/poker-vfx.css) | 12 | optional VFX manifest; verify opt-in flag still toggles. |

### 6.4 Orphans (CSS hooks nothing renders)

| Concern | Note |
|---|---|
| `[data-vfx-target="…"]` CSS rules in [spell-screen-effects.css](../client/src/game/combat/styles/spell-screen-effects.css) | `data-vfx-target` attribute is **not** emitted as literal in any TSX; `arenaVfxTargetProps()` helper applies via different prop name. CSS targeting via `[data-vfx-target=…]` is unreachable. Either fix the helper to emit `data-vfx-target`, or rewrite the CSS selectors. |
| `spell-screen-effects.css` element tints (6 declarations) | no grep hit in TSX for matching data attribute; verify or delete. |
| `.unified-hand-section` `flex: 1` | removed per [POKER_ARENA_UI.md §7](./POKER_ARENA_UI.md) but verify no stale reference. |
| Orphaned art: `client/public/art/orphaned/` (28 MB, 226 files) | see [POKER_ARENA_DOM_TREE.md §Image hygiene](./POKER_ARENA_DOM_TREE.md) |
| Dead components per [POKER_ARENA_UI.md §2](./POKER_ARENA_UI.md): `ArenaPokerHand.tsx`, `HeroBridge.tsx`, `WagerEffectsHUD.tsx` | delete in cleanup |

### 6.5 Layout shift suspects

See [POKER_ARENA_DOM_TREE.md](./POKER_ARENA_DOM_TREE.md) §"Suspects for layout shift on phase change" for the full list. Top fixes:

1. **WagerInfoPanel height changes** — fixed width but height can vary by phase content. Constrain or convert to fixed height.
2. **`<BossQuipBubble>` AnimatePresence** — may force re-flow of `.opponent-hero-container` parent.
3. **CombatPhaseDirector content height** — phase changes (Spellcraft → First Blood → Faith …) alter text length.

---

## 7. Editing rules (recap from canon)

From [POKER_ARENA_UI.md §1](./POKER_ARENA_UI.md) and §7:

1. **No `position: fixed` in gameplay code.** Use `position: absolute` inside the layer.
2. **No `document.body` mounts.** Target `#arena-layer-vfx` or `#arena-layer-modal`.
3. **Z-index inside the reserved range.** VFX 400-699, HUD 700-899, modal 900+.
4. **`pointer-events: none`** by default on VFX + modal containers; children opt in.
5. **GSAP shakes `.game-viewport-wrapper`** (not `.game-viewport` — that would overwrite the responsive scale).
6. **Width / height in %** of the layer; pixels only for tiny visual primitives.
7. **No `vw` / `vh`** inside gameplay zones. (Exception: `poker-betting.css` uses `vw` inside `clamp()` for fluid button sizing — verify intent.)
8. **Mobile = landscape.** No vertical mobile variant for poker combat.
9. **VFX selectors are data contracts.** Use `arenaVfxTargets.ts` selectors + `data-vfx-target` / `data-hero-role`.
10. **CSS vs Tailwind split**:
    - **Tailwind in JSX** = local structure and component syntax (`section`, `footer`, `flex`, `items-*`, `gap-*`, `pointer-events-*`, simple transforms).
    - **`board.css`** = board-level geometry, grid tracks, cross-zone coordinates, scale tokens.
    - **Other CSS files** = visual identity, colors, borders, shadows, animation keyframes, typography, state effects.
    - **No overlap.** If Tailwind and CSS both own the same property, prefer a named layout token in `board.css`.

---

## 8. Common recipes

### 8.1 Add a new state class for an element

1. Find the element in §3.
2. Find the owning CSS file.
3. Add a new selector block (`.parent.new-state .child { … }`) with the visual delta.
4. Add the new state class to the TSX `className` template.
5. If the state is reused across files, consider adding a token.

### 8.2 Add a new HUD chip

1. In `game-hud.css`, mirror an existing `.hud-status-*` block.
2. Add a JSX slot in `GameHUD.tsx`.
3. Add the game value to the §3.1 row.
4. Add a new `data-zone` if it gets its own positioning (then bind in `board.css`).

### 8.3 Move an element to a new grid area

1. Edit `board.css` `grid-template-areas` and `--poker-zone-*` tokens.
2. Do **not** add magic Tailwind positioning in JSX.
3. Verify mobile landscape + ultrawide + 4K.

### 8.4 Add a new portal target

1. Mount in `#arena-layer-vfx` (z 400-699) or `#arena-layer-modal` (z 900+).
2. `pointer-events: none` on the container; opt in on the interactive child.
3. For VFX, set `data-vfx-layer` per the arenaVfxTargets contract.

### 8.5 Wire a state-driven class to a CSS rule

1. Find the state in §5.
2. Find the owning file in §3.
3. Add the `.element.state-class` selector mirroring existing pattern.
4. Document the new state in §5 if it doesn't exist yet.

---

## 9. Open questions (carry from canon)

- **PotDisplay vs hud-status-pot in GameHUD** — pot info in BOTH places. Reconcile (likely delete the standalone PotDisplay and let GameHUD own it).
- **WagerInfoPanel = CombatPhaseDirector?** — WagerInfoPanel wraps CombatPhaseDirector with positioning. Either fold into Director or keep as positioning shell.
- **`.mulligan-notice` purpose** — transient toast or part of mulligan modal? If toast → absolute overlay. If part of modal → delete (MulliganScreen handles it).
- **`.attack-mode-banner` placement** — should be ribbon under HUD, not in board flow.
- **AnimationOverlay vs AIAttackAnimationProcessor** — both manage attack VFX. Verify single owner.
- **`[data-vfx-target]` orphan** — fix helper to emit the attribute, or rewrite CSS selectors.
- **Legacy god file `RagnarokCombatArena.css`** — claimed 4443 LOC, NOT on disk (already split into 60 files). Verify in git history that split is complete and no rule was lost.

---

## 10. Maintenance

When you add a new component, rendered element, or CSS file:

1. Add a row to the §3 sub-table for the owning zone.
2. Add any new state class to §5.
3. Add any new token to §4.
4. If the file is dead, add it to §6.3.
5. If there's a magic offset, add it to §6.1.
6. If there's a CSS↔Tailwind dupe, add it to §6.2.

When you delete a component, mark it as resolved in §6.4 or remove the row from §3.

---

*Document version 1 — 2026-06-12. Generated from cross-grep of 62 CSS files + 30 TSX components.*

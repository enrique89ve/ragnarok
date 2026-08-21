# Poker Arena UI — Canon

Single source of truth for the poker combat arena UI structure, components, state flow, and visual layers. When code diverges from this doc, code wins — but the divergence should be reconciled here in the same PR.

Scope: only the poker arena (`RagnarokCombatArena`). Chess board (`ChessPhase`) is a sibling FSM phase, not part of this canon.

---

## 0. Responsive board contract

The poker arena is a **fixed-ratio game board**, not a responsive document layout.

| Concern | Canon |
|---|---|
| Base canvas | `1920×1080` virtual board, `16:9` |
| Runtime scaler | `GameViewport.tsx` computes `scale = min(windowWidth / 1920, windowHeight / 1080)` |
| Mobile target | Landscape. Portrait is not a poker layout target; do not reflow zones into a vertical board. |
| Large screens | Preserve `16:9`; wrapper art fills letterbox/pillarbox space. Do not stretch the board. |
| Ultra-large option | If the board feels too large on wall-sized displays, add a `maxScale`/presentation cap to `GameViewport`, not a second CSS layout. |
| Coordinate system | All gameplay positions are authored inside the 1920×1080 board. Use board tokens/areas, not `vw`/`vh`, for pieces. |

**Grammar**:

```
real viewport
└── .game-viewport-wrapper        fixed inset-0, owns full-window background
    └── .game-viewport            absolute 1920×1080, JS translate + scale
        └── .ragnarok-combat-arena relative, overflow hidden
            ├── canvas layers      absolute inset-0
            └── .arena-content     absolute inset-0, grid-based board
```

**Editing rule**: moving a poker element should usually mean changing one token, grid area, or zone component. If moving a hero requires touching VFX, HUD, and card CSS at the same time, the layer contract has been broken.

---

## 1. Layered architecture (canonical contract)

Every visual element in the arena belongs to exactly **one** logical layer. Background, VFX, and modal have dedicated wrapper nodes today; game and HUD elements are still partly direct children / `data-zone` panels, but they must obey the same z-index ranges. Nothing escapes the 1920×1080 canvas.

```
.game-viewport-wrapper (real viewport; fixed, overflow hidden)
└── .game-viewport (1920×1080, transform: scale by GameViewport.tsx)
    └── .ragnarok-combat-arena (position: relative; overflow: hidden)
    │
    ├── .layer-background      z: 0–99      pointer-events: none
    │   └── art, ambient dust, torch glow, realm bg, board border
    │
    ├── .arena-content          z: 100–399   pointer-events: auto (game layer)
    │   └── zones (opp, opp-field, board, player-field, player),
    │       cards, heroes, mana bars, hole cards
    │
    ├── #arena-layer-vfx        z: 400–699   pointer-events: none
    │   ↑ portal/mount target for cinematic effects:
    │     PhaseBanner, PokerDramaVFX, FirstStrikeAnimation,
    │     screen flashes, vignettes, damage indicators
    │
    ├── HUD elements            z: 700–899   pointer-events: auto (opt-in)
    │   └── GameHUD ribbon, hourglass, BattleIntel, BettingPanel,
    │       hand-strength indicator, CombatFeedbackStack (LoR-style chips)
    │
    └── #arena-layer-modal      z: 900+      pointer-events: auto (blockers)
        ↑ portal/mount target for full-screen modals:
          MulliganScreen, ShowdownCelebration, GameOverScreen, GearPanel
```

### Hard rules

1. **No `position: fixed` in gameplay code.** Use `position: absolute` inside the appropriate layer. `fixed` escapes the canvas scale.
2. **No `document.body` mounts.** All portals + imperative DOM creation target `#arena-layer-vfx` or `#arena-layer-modal`.
3. **Z-index inside the reserved range.** A VFX overlay never uses `z: 800` (HUD range).
4. **`pointer-events: none` by default** on VFX + modal containers — children opt-in. Prevents accidental click-blocking.
5. **GSAP shakes target `.game-viewport-wrapper`** (no transform). Targeting `.game-viewport` overwrites the responsive scale and breaks the canvas.
6. **Width / height in %** of the layer (which is canvas-sized). Pixel sizes only for tiny visual primitives (borders, small badges).
7. **No `vw`/`vh` inside gameplay zones.** The viewport is already normalized by `GameViewport`.
8. **Mobile landscape is a scaled board.** Do not add vertical mobile variants for poker combat.
9. **VFX selectors are data contracts.** Imperative VFX code resolves targets
   through `client/src/game/combat/arenaVfxTargets.ts` and `data-vfx-target`
   / `data-hero-role` attributes. CSS class names are styling hooks, not VFX
   API.

### Mount targets (canonical)

| Effect / component | Mount target | Why |
|---|---|---|
| `PokerDramaVFX` container | `#arena-layer-vfx` | Imperative GSAP/DOM injection — needs bounded layer |
| `PhaseBanner` (portal) | `#arena-layer-vfx` | Transitions between phases, fades in centered |
| `MulliganScreen` (portal) | `#arena-layer-modal` | Blocks input until mulligan committed |
| `ShowdownCelebration` (portal) | `#arena-layer-modal` | Blocks input during resolution |
| `GameOverScreen` (portal) | `#arena-layer-modal` | Terminal modal |
| `CombatFeedbackStack` | `feedbackStack` HUD zone above community cards | Spell/status chips. Waits while PhaseBanner or ActionAnnouncement occupies cinema. Game log always records the same event. |
| `BettingPanel` | `[data-zone="betting-panel"]` in HUD z-range | Persistent control surface. Actions show **Bet/Raise/Call/Check/Fold/All in** plus HP, not icon-only. Disabled buttons keep the same label and explain why in `title`. |
| `GameHUD` | `[data-vfx-target="risk-display"]` on stakes chip | Only turn/phase/stakes rail |
| Particle bursts (Pixi) | `#arena-layer-vfx` | Canvas-bounded particles |

### Feedback lanes (log + overlay)

Gameplay events write `gameLogStore` always (practice, campaign, P2P). Overlay is a separate lane so announcements never stack on the same pixel:

| Lane | Occupant | Rule |
|---|---|---|
| Cinema | `PhaseBanner`, `ActionAnnouncement` | Exclusive. Stack waits. |
| Stack | `CombatFeedbackStack` chips | Max 3, horizontal above the flop. Reading dwell = enter 200ms + words + exit 160ms. |
| Floater | `HeroBattlePopup`, `DamageIndicator` | On the actor, not the center. |
| Log | `GameLog` dock | Persistent. If the flash is missed, the dock still has it. |

`showStatus` / `NOTIFICATION` enqueue the stack, not Sonner. Sonner stays out of the poker canvas.

### VFX target contract

`arenaVfxTargets.ts` is the central selector registry for arena VFX. Components
that need to be animated expose a stable attribute, for example:

- `data-vfx-target="community-slot"` for each board card slot.
- `data-vfx-slot-index="0"` through `data-vfx-slot-index="4"` for ordered
  board cards.
- `data-vfx-target="risk-display"` for the current wager/risk display.
- `data-vfx-layer="game-viewport"` and
  `data-vfx-layer="game-viewport-wrapper"` for viewport-level effects.

Imperative animation modules may query these attributes through the helper
functions. They should not fall back to `.community-slot`, `.risk-display`,
`.pot-display`, `.game-viewport`, or broad `[class*="..."]` selectors.

### Anti-patterns historically encountered

- **`#poker-drama-vfx-layer` mounted on document.body with `position: fixed; inset: 0`**: caused every "screen flash" / "slash" effect to span the entire viewport, painting through letterbox bars. *Fix*: mount in `#arena-layer-vfx`.
- **GSAP `gsap.to('.game-viewport', { x, y })`**: overwrote the inline `transform: translate(...) scale(...)` set by GameViewport.tsx for responsive scaling — first shake stripped the scale, canvas displaced permanently. *Fix*: shake `.game-viewport-wrapper` instead.
- **`body { overflow: visible; width: 100vw }`**: with `100vw` including the scrollbar gutter on Windows/Chromium, any momentary horizontal overflow triggered a document scrollbar and shifted the whole body by ~15 px. *Fix*: `overflow-x: hidden; width: 100%`.
- **`playPhaseDramaVFX` injecting `width: 100%; background: red-gradient` slash into fixed-inset container**: drew a 1920+ px red line across the entire screen on every PRE_FLOP. *Fix*: removed the slash injection; if dramatic line is wanted in the future, mount it inside `.zone-board` and constrain to board dimensions.

---

## 2. Component dependency tree

```
RagnarokGameCoordinator (FSM root)
└── PokerCombatPhase (lazy, mounts when flowState.tag === 'poker_combat')
    └── RagnarokCombatArena (1516 LOC — god component, target for split)
        └── GameViewport (1920×1080 virtual canvas + JS scale)
            └── .ragnarok-combat-arena (relative, overflow hidden, full canvas)
                ├── HUD layer (absolute siblings)
                │   ├── GameHUD              (only turn/phase/initiative/stakes/to-call rail)
                │   ├── hourglass-timer      (top-center countdown)
                │   ├── HandStrengthIndicator (player's current best hand)
                │   ├── opponent-thinking-indicator
                │   ├── battle-intel toggle + panel
                │   ├── realm-indicator
                │   └── (board-ambient-dust, board-torch-glow, board-border-ornament)
                │
                ├── .arena-content (absolute inset-0, game layer)
                │   └── UnifiedCombatArena (CSS grid — zones live here)
                │       ├── .zone-opp          (opp hero + hole cards + hand-count)
                │       ├── .zone-opp-field    (opp minions)
                │       ├── .zone-board        (community cards)
                │       ├── .zone-player-field (player minions)
                │       └── .zone-player       (player hero + hand fan)
                │
                └── Overlay layer (absolute siblings, animation/modal)
                    ├── PhaseBanner               (FIRST BLOOD / FAITH / etc. slash)
                     ├── GameHUD                  (turn/phase/stakes rail)
                    ├── ActionAnnouncement        (action text reveal)
                    ├── FirstStrikeAnimation
                    ├── HeroDeathAnimation
                    ├── ShowdownCelebration
                    ├── BossPhaseFlash
                    ├── BossQuipBubble
                    ├── KingPassivePopup
                    ├── ElementBuffPopup
                    ├── ElementMatchupBanner
                    ├── DamageIndicator (×n floating)
                    ├── HeroBattlePopup (×n)
                    ├── realm-announcement
                    ├── TargetingPrompt           (spell targeting)
                    ├── HeroPowerPrompt           (hero power targeting)
                    ├── MulliganScreen            (modal)
                    ├── HeroGearPanel             (artifact/armor modal)
                    ├── GameOverScreen            (post-combat)
                    ├── TargetingOverlay          (SVG line)
                    ├── CardBurnOverlay
                    ├── AIAttackAnimationProcessor
                    ├── AnimationOverlay
                    └── PixiParticleCanvas        (realm particles)
```

**Dead components (delete in cleanup):**
- `ArenaPokerHand.tsx` — 0 usages
- `HeroBridge.tsx` — 0 usages (still exported in `components/index.ts`)
- `WagerEffectsHUD.tsx` — 0 usages

**Verify before delete:**
- `PotDisplay.tsx` — 1 usage (check it's not the only caller already dead)
- `PokerCombatAnimation.tsx` — 1 usage

---

## 3. Target DOM zone layout

Canvas `1920×1080`. Board-level placement is absolute, authored in `client/src/game/poker/layout/pokerViewportLayout.ts` and applied as CSS vars on `.ragnarok-combat-arena`. `poker/styles/canvas.css` consumes those vars. Tailwind may describe local flex alignment inside a zone.

```
┌─────────────────────────────────────────── 1920×1080 ──┐
│  ┌── HUD layer (absolute) ──────────────────────────┐  │
│  │ [TURN N · PHASE X · INITIATIVE · STAKES · POT]   │  │ ← GameHUD
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌── .arena-content absolute inset-0 ────────────────┐  │
│  │  .unified-combat-arena  position:relative         │  │
│  │                                                   │  │
│  │     [OPP HERO] [opp hole/hand] [spell tray]       │  │
│  │     [community 0→5]   [opponent minions]          │  │
│  │                    [player minions]               │  │
│  │     [PLAYER HERO] [hand fan] [bet / turn]         │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌── Overlay layer (absolute, inset-0, pointer-     │  │
│  │   events-none with opt-in children) ──────────┐  │  │
│  │  PhaseBanner, modals, VFX, prompts             │  │  │
│  └────────────────────────────────────────────────┘  │  │
└─────────────────────────────────────────────────────────┘
```

**Board tracks** live in `POKER_VIEWPORT_LAYOUT.zones`. CSS reads `--poker-zone-<id>-x|y|w|h|rot`.

**Zone vocabulary**:

| Zone component | DOM class | Layout zone id | Contains |
|---|---|---|---|
| `OpponentZone` | `.zone-opp` | `opponentHero`, `opponentHand`, `opponentHeroCards` | opponent hero, boss pips, hole cards, opponent hand count |
| `MinionField role="opp"` | `.zone-opp-field` | `opponentBattlefieldCards` | opponent battlefield cards |
| `BoardZone` | `.zone-board` | `communityCards` | poker community cards / placeholders |
| `MinionField role="player"` | `.zone-player-field` | `playerBattlefieldCards` | player battlefield cards |
| `PlayerZone` | `.zone-player` | `playerHero`, `playerHand`, `playerHeroCards` | player hero, hero resources, hole cards, hand fan |

**Editable layout tokens** are in `client/src/game/poker/layout/pokerViewportLayout.ts`:

| Move this | Prefer editing |
|---|---|
| Any board/HUD zone box | `POKER_VIEWPORT_LAYOUT.zones.<id>` |
| Safe area / max scale | `POKER_VIEWPORT_LAYOUT.safeArea` |
| Community card chrome size | `combat/styles/community-cards.css` |
| Hero resource docks | `--hero-resource-dock-*` in `poker/styles/canvas.css` |

**Anchors:**
- Board-level movement: change the TS zone, not CSS fallbacks.
- In-zone alignment: Tailwind or small component classes (`flex`, `items-*`, `gap-*`).
- VFX/HUD/modal: absolute layer siblings, never a second coordinate table.
- Do not put primary gameplay zones in `position: fixed`; they must remain inside the scaled canvas.

---

## 4. State / data flow

```
useGameStore (top-level game state)
       │
       ▼
usePokerCombatAdapter (client/src/game/hooks/usePokerCombatAdapter.ts)
       │  ← adapter: projects gameState slice into poker-only shape
       ▼
useUnifiedCombatStore (composite Zustand store)
   ├── sharedCombatSlice    — turn manager, HP, common
   ├── pokerCombatSlice     — phases, betting, pot, hole/community cards
   ├── pokerSpellSlice      — poker spells (timing buckets)
   ├── chessCombatSlice     — chess (UNUSED in poker arena, shared module)
   ├── chessAnimationSlice  — chess anim (UNUSED in poker arena)
   ├── minionBattleSlice    — minion-vs-minion resolution
   └── kingAbilitySlice     — king passive
       │
       ▼
useRagnarokCombatController (1175 LOC orchestrator hook)
       │  ← derives view models, callbacks, selectors
       │  ← composes: usePokerPhases, usePokerAI, usePokerDrama,
       │              useTurnOrchestrator, useDamageAnimations,
       │              useElementalBuff, useBossPhases, useRealmAnnouncement,
       │              useCombatEvents, useCombatTimer, useHeroHealthEffects
       ▼
RagnarokCombatArena render
       │
       ▼
Inner UnifiedCombatArena render (zones)
```

**Adapter contract**: `usePokerCombatAdapter` is the trust boundary between game-level state and combat-only state. Adapter file is the only place gameStore is read in combat tree.

**State touchpoints from outside combat:**
- `useCampaignStore` (boss data, music)
- `useSettingsStore` (showDamageNumbers, audio settings)
- `useKingPassiveEventStore` (king popup queue)
- `useAudio` (combat music)

---

## 5. Phase lifecycle

```
FIRST_STRIKE (15 dmg instant, no betting)
       │
       ▼
MULLIGAN     (replace hole cards — modal overlay, blocks board)
       │
       ▼
SPELL_PET    (cast pre-deal spells; no community cards yet)
       │
       ▼
PRE_FLOP     (First Blood — opening wager round)         ──┐
       │                                                    │
       ▼                                                    │
FAITH        (Flop — reveal 3 community cards) + wager     │ each
       │                                                    │ phase
       ▼                                                    │ swaps
FORESIGHT    (Turn — reveal 1 more) + wager                │ initiative
       │                                                    │ between
       ▼                                                    │ players
DESTINY      (River — reveal final) + wager                │
       │                                                    │
       ▼                                                  ──┘
RESOLUTION   (Showdown — compare hands, apply pot to HP)
       │
       ▼
GAME_OVER (handled by FSM, not arena)
```

**Phase machine**: `client/src/game/combat/modules/PhaseManager.ts` (pure TS, no React).

**Betting rounds**: `BETTING_ROUND_MAP` in PhaseManager maps each phase → `preflop|flop|turn|river|null`.

**Community card reveal counts**: FAITH=3, FORESIGHT=1, DESTINY=1 (total 5).

**Phase-driven UI transitions:**
| Phase change | Components that react |
|---|---|
| any → next | `PhaseBanner` (slam-in 2s), `usePokerPhases` advance |
| → FAITH/FORESIGHT/DESTINY | community card reveal animation via `PlayingCard` |
| → RESOLUTION | `ShowdownCelebration` mount, HP delta animations, `HeroDeathAnimation` if KO |
| MULLIGAN start | `MulliganScreen` modal, `.mulligan-notice` (DEPRECATE — push layout) |

---

## 6. Module layer (pure TS, no React)

| Module | Responsibility | LOC |
|---|---|---|
| `PhaseManager.ts` | phase order, betting round map, community card counts | 125 |
| `BettingEngine.ts` | blinds, bet legality, action validation | 180 |
| `HandEvaluator.ts` | 5-card hand ranking (Hawthorn algorithm) | ? |
| `SidePotManager.ts` | split-pot computation for all-in scenarios | ? |
| `SmartAI.ts` | AI decision tree (fold/check/call/bet/raise) | ? |

These are dependency-free and unit-testable. Keep them in `combat/modules/`. No UI knowledge.

---

## 7. CSS architecture

**Current**: `poker/styles/poker.css` is the only arena CSS entry. Geometry is authored in `pokerViewportLayout.ts`. Visual leaves live under `combat/styles/`.

**Cascade order** (per `poker/styles/poker.css`):
1. **Base** — `tokens.css`, `canvas.css` (consumes layout vars), then `poker-core.css` (`reset.css`, `zones.css`)
2. **Visual** — `norse-atmosphere.css`, `realm-boards.css`
3. **HUD** — `game-hud.css`, `pot-display.css`, `betting-controls.css`, `timer.css`, `hand-strength.css`
4. **Cards** — `card-frame.css`, `face-down.css`, `hole-cards.css`, `community-cards.css`, `battlefield.css`
5. **VFX** — `glow-effects.css`, `elemental-glows.css`, `card-highlight.css`, `targeting-prompts.css`, `spell-screen-effects.css`
6. **Overlays** — `poker-drama.css`, `turn-banner.css`, `element-matchup-banner.css`, `hero-reactions.css`, `hero-death.css`, `game-over.css`
7. **Utility** — `combat-animations.css`, `cursors.css`, `ragnarok-art-ui.css`, `responsive.css`

**Rule of thumb (CSS vs Tailwind):**
- **Tailwind in JSX** = local structure and component syntax (`section`, `footer`, `flex`, `items-*`, `gap-*`, `pointer-events-*`, simple transforms).
- **`pokerViewportLayout.ts`** = board-level geometry: zone boxes, rail tokens, and the editable positions of heroes/cards/panels.
- **Other CSS files** = visual identity: colors, borders, shadows, animation keyframes, card art, typography, and state effects.
- No overlap. If Tailwind and CSS both own the same board-level property, prefer a named zone in `pokerViewportLayout.ts`.

**Tailwind-as-base pattern**:

```tsx
<section className="zone-board" aria-label="Community cards">
  <div className="unified-community community-cards-section zone-community">
    ...
  </div>
</section>
```

The JSX names the semantic zone and small local alignment. `pokerViewportLayout.ts` decides where `.zone-board` lives on the board.

**Known conflicts (already deduped in PR1):**
- `.unified-hand-section { flex: 1 }` → removed (Tailwind centers via parent justify)
- `.phase-banner` × 2 (norse-atmosphere + poker-drama) → kept poker-drama

**Known conflicts (PENDING dedupe):**
- `.poker-hero-container` CSS sets `flex/flex-col/items-center/gap-2`, JSX repeats same Tailwind
- `.opponent-hero-container` same dup
- `.poker-hand-container` CSS has `transform: translateY(-50px)` magic offset
- `.betting-controls-bar` CSS has `margin-left: 240px` magic offset (verify still rendered)
- `.unified-hero-section` CSS has `transform: translateY(10px)` magic
- `.unified-hand-section` CSS has `transform: translateY(10px)` magic

---

## 8. Migration plan (incremental, low-risk)

### Phase A — Cleanup uncommitted state
1. Commit current PR1 fixes
2. Audit uncommitted files (`git status`): keep, fold, or revert per file
3. Verify `pnpm run check` + `lint:css` clean

### Phase B — Stabilize the board grammar
1. Keep `GameViewport` as the only responsive scaler.
2. Keep `.arena-content` absolute and `.unified-combat-arena` as the game-layer host.
3. Move every cross-zone coordinate in `pokerViewportLayout.ts` only.
4. Add/keep `data-zone` markers for HUD controls that are visually attached to the board but not part of card flow.
5. Smoke-test landscape mobile, 16:9 desktop, ultrawide desktop, and very large desktop.

### Phase C — Kill unmanaged offsets
- Replace anonymous `translateY(...)`, `margin-left: ...`, and raw pixel nudges with named tokens.
- Keep intentional offsets, but name them by purpose (`--player-hand-y`, `--community-cards-scale`, etc.).
- Delete offsets that no rendered element consumes.

### Phase D — Dedupe CSS↔Tailwind
For each hotspot class:
- Decide single owner (CSS or Tailwind)
- Delete the other

### Phase E — Delete dead components
- `ArenaPokerHand.tsx`, `HeroBridge.tsx`, `WagerEffectsHUD.tsx`
- Audit `PotDisplay` + `PokerCombatAnimation` callers, delete if dead

### Phase F — Split `RagnarokCombatArena.css` (4443 LOC)
Move by concern into existing `combat/styles/*.css`:
- Hero card visuals → `hero-card.css` (new)
- Hero portrait → `hero-portrait.css` (new)
- Hero power button → `hero-power.css` (new)
- Betting bar legacy → either modernize or delete (verify dead)
- Battle Intel panel → `battle-intel.css` (new)
- Keep `RagnarokCombatArena.css` as only the `@import "./styles/index.css"` + viewport scaling (`GameViewport.css` already separate)

### Phase G — Split `RagnarokCombatArena.tsx` (1516 LOC)
Extract zone subcomponents:
- `<OpponentZone />`, `<BoardZone />`, `<PlayerZone />`, `<OverlayLayer />`
- Keep `RagnarokCombatArena` as the orchestration shell

### Phase H — Optional ultra-large presentation cap
- If large monitors make the board feel oversized, add `maxScale` to `GameViewport`.
- Keep the canvas `1920×1080`; only cap the transform scale.
- Do not create separate "desktop XL" coordinates unless playtesting proves a real gameplay need.

---

## 9. Open questions

- **PotDisplay vs hud-status-pot in GameHUD** — pot info is in BOTH places? Reconcile.
- **WagerInfoPanel / TurnBanner** — unmounted. `GameHUD` owns turn, phase, initiative, stakes, and to-call. Files remain until a smoke pass deletes them.
- **`.mulligan-notice` purpose** — is this a transient toast or part of mulligan modal? If toast → make absolute overlay. If part of modal → delete (MulliganScreen handles it).
- **`.attack-mode-banner` placement** — should be ribbon under HUD when active, not in board flow.
- **AnimationOverlay vs AIAttackAnimationProcessor** — both manage attack VFX. Verify single owner.

---

*Document version 2 — 2026-05-14. Responsive board grammar aligned with current grid/canvas implementation.*

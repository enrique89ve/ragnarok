# Poker Arena UI — Canon

Single source of truth for the poker combat arena UI structure, components, state flow, and visual layers. When code diverges from this doc, code wins — but the divergence should be reconciled here in the same PR.

Scope: only the poker arena (`RagnarokCombatArena`). Chess board (`ChessPhase`) is a sibling FSM phase, not part of this canon.

---

## 0. Layered architecture (canonical contract)

Every visual element in the arena belongs to exactly **one** of five layers. Each layer is `position: absolute; inset: 0` inside `.ragnarok-combat-arena`, so nothing escapes the 1920×1080 canvas. Z-index ranges are reserved per layer — never collide across layers.

```
.game-viewport (1920×1080, transform: scale by GameViewport.tsx)
└── .ragnarok-combat-arena (position: relative; overflow: hidden)
    │
    ├── .layer-background      z: 0–99      pointer-events: none
    │   └── art, ambient dust, torch glow, realm bg, board border
    │
    ├── .layer-game             z: 100–399   pointer-events: auto (default)
    │   └── zones (opp, opp-field, board, player-field, player),
    │       cards, heroes, mana bars, hole cards
    │
    ├── #arena-layer-vfx        z: 400–699   pointer-events: none
    │   ↑ portal/mount target for cinematic effects:
    │     PhaseBanner, PokerDramaVFX, FirstStrikeAnimation,
    │     screen flashes, vignettes, damage indicators
    │
    ├── .layer-hud              z: 700–899   pointer-events: auto (opt-in)
    │   └── GameHUD ribbon, hourglass, BattleIntel, BettingPanel,
    │       WagerInfoPanel, TurnBanner, hand-strength indicator
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

### Mount targets (canonical)

| Effect / component | Mount target | Why |
|---|---|---|
| `PokerDramaVFX` container | `#arena-layer-vfx` | Imperative GSAP/DOM injection — needs bounded layer |
| `PhaseBanner` (portal) | `#arena-layer-vfx` | Transitions between phases, fades in centered |
| `MulliganScreen` (portal) | `#arena-layer-modal` | Blocks input until mulligan committed |
| `ShowdownCelebration` (portal) | `#arena-layer-modal` | Blocks input during resolution |
| `GameOverScreen` (portal) | `#arena-layer-modal` | Terminal modal |
| `BettingPanel` | `.layer-hud` (any HUD slot) | Persistent control surface |
| `WagerInfoPanel` | `.layer-hud` (top-right dock) | Persistent info panel |
| Particle bursts (Pixi) | `#arena-layer-vfx` | Canvas-bounded particles |

### Anti-patterns historically encountered

- **`#poker-drama-vfx-layer` mounted on document.body with `position: fixed; inset: 0`**: caused every "screen flash" / "slash" effect to span the entire viewport, painting through letterbox bars. *Fix*: mount in `#arena-layer-vfx`.
- **GSAP `gsap.to('.game-viewport', { x, y })`**: overwrote the inline `transform: translate(...) scale(...)` set by GameViewport.tsx for responsive scaling — first shake stripped the scale, canvas displaced permanently. *Fix*: shake `.game-viewport-wrapper` instead.
- **`body { overflow: visible; width: 100vw }`**: with `100vw` including the scrollbar gutter on Windows/Chromium, any momentary horizontal overflow triggered a document scrollbar and shifted the whole body by ~15 px. *Fix*: `overflow-x: hidden; width: 100%`.
- **`playPhaseDramaVFX` injecting `width: 100%; background: red-gradient` slash into fixed-inset container**: drew a 1920+ px red line across the entire screen on every PRE_FLOP. *Fix*: removed the slash injection; if dramatic line is wanted in the future, mount it inside `.zone-board` and constrain to board dimensions.

---

## 1. Component dependency tree

```
RagnarokGameCoordinator (FSM root)
└── PokerCombatPhase (lazy, mounts when flowState.tag === 'poker_combat')
    └── RagnarokCombatArena (1670 LOC — god component, target for split)
        └── GameViewport (1920×1080 virtual canvas + JS scale)
            └── .ragnarok-combat-arena (display:flex flex-col, full canvas)
                ├── HUD layer (absolute siblings)
                │   ├── GameHUD              (top ribbon: turn/phase/stakes/committed)
                │   ├── hourglass-timer      (top-center countdown)
                │   ├── HandStrengthIndicator (player's current best hand)
                │   ├── opponent-thinking-indicator
                │   ├── battle-intel toggle + panel
                │   ├── realm-indicator
                │   └── (board-ambient-dust, board-torch-glow, board-border-ornament)
                │
                ├── .arena-content (the only non-absolute flex child)
                │   └── UnifiedCombatArena (inner JSX — zones live here)
                │       ├── opp-zone        (opp hero + hole cards + hand-count)
                │       ├── opp-field       (opp minions)
                │       ├── board-zone      (community cards + pot info)
                │       ├── player-field    (player minions)
                │       └── player-zone     (player hero + hand + bet controls)
                │
                └── Overlay layer (absolute siblings, animation/modal)
                    ├── PhaseBanner               (FIRST BLOOD / FAITH / etc. slash)
                    ├── TurnBanner                (YOUR TURN / ENEMY TURN)
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

## 2. Target DOM zone layout

Canvas 1920×1080. Inner arena is `flex flex-col`. Each zone is a flex-row in flow. NO magic pixel positions for primary zones — those are reserved for overlays only.

```
┌─────────────────────────────────────────── 1920×1080 ──┐
│  ┌── HUD layer (absolute) ──────────────────────────┐  │
│  │ [TURN N · PHASE X · INITIATIVE · STAKES · POT]   │  │ ← GameHUD
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌── .arena-content (flex flex-col) ─────────────────┐  │
│  │  opp-zone        (min-h-[160px], py-2)            │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │  [OPP HERO]  [opp hole]  [opp deck count]    │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  │  opp-field       (min-h-[140px])                  │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │           [opp minions row]                  │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  │  board-zone      (min-h-[160px])                  │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │    [community cards 0→5]   [pot info pill]   │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  │  player-field    (min-h-[140px])                  │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │           [player minions row]               │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  │  player-zone     (min-h-[300px], py-2)            │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │  [PLAYER HERO]   [hand fan]   [bet stack]    │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌── Overlay layer (absolute, inset-0, pointer-     │  │
│  │   events-none with opt-in children) ──────────┐  │  │
│  │  PhaseBanner, TurnBanner, modals, VFX, prompts │  │  │
│  └────────────────────────────────────────────────┘  │  │
└─────────────────────────────────────────────────────────┘
```

**Vertical budget**: 160+140+160+140+300 = 900 px for zones, leaving ~180px for HUD chrome + breathing.

**Anchors:**
- Zone rows: `flex flex-row justify-center items-center gap-N`
- Hero + Hand + Bet inside player-zone: `flex flex-row items-end gap-4 justify-center`
- No `position: absolute` for zone-level wrappers — reserved for HUD/overlay siblings.

---

## 3. State / data flow

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

## 4. Phase lifecycle

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

## 5. Module layer (pure TS, no React)

| Module | Responsibility | LOC |
|---|---|---|
| `PhaseManager.ts` | phase order, betting round map, community card counts | 125 |
| `BettingEngine.ts` | blinds, bet legality, action validation | 180 |
| `HandEvaluator.ts` | 5-card hand ranking (Hawthorn algorithm) | ? |
| `SidePotManager.ts` | split-pot computation for all-in scenarios | ? |
| `SmartAI.ts` | AI decision tree (fold/check/call/bet/raise) | ? |

These are dependency-free and unit-testable. Keep them in `combat/modules/`. No UI knowledge.

---

## 6. CSS architecture

**Current**: 31 CSS files + 4903-LOC monolith (`RagnarokCombatArena.css`). Target = stratified layers, one concern per file.

**Cascade order** (per `combat/styles/index.css`):
1. **Base** — `reset.css`, `zones.css`, `canvas-layout.css`
2. **Visual** — `norse-atmosphere.css`, `realm-boards.css`
3. **HUD** — `game-hud.css`, `pot-display.css`, `betting-controls.css`, `timer.css`, `hand-strength.css`
4. **Cards** — `card-frame.css`, `face-down.css`, `hole-cards.css`, `community-cards.css`, `battlefield.css`
5. **VFX** — `glow-effects.css`, `elemental-glows.css`, `card-highlight.css`, `targeting-prompts.css`, `spell-screen-effects.css`
6. **Overlays** — `poker-drama.css`, `turn-banner.css`, `element-matchup-banner.css`, `hero-reactions.css`, `hero-death.css`, `game-over.css`
7. **Utility** — `combat-animations.css`, `cursors.css`, `ragnarok-art-ui.css`, `responsive.css`

**Rule of thumb (CSS vs Tailwind):**
- **Tailwind in JSX** = layout (display/flex/grid/gap/justify/align/position/inset/translate)
- **CSS file** = visual identity (colors/borders/shadows/animations/gradients/typography)
- No overlap. If both define the same property, delete one.

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

## 7. Migration plan (incremental, low-risk)

### Phase A — Cleanup uncommitted state
1. Commit current PR1 fixes
2. Audit uncommitted files (`git status`): keep, fold, or revert per file
3. Verify `npm run check` + `lint:css` clean

### Phase B — Inner arena flex-column refactor
1. Convert `UnifiedCombatArena` root from `relative block` to `flex flex-col`
2. Replace each absolute zone with a flex row:
   - `opp-zone` (replaces `unified-opponent-hero` + `unified-opponent-hand`)
   - `opp-field` (replaces `unified-opponent-field`)
   - `board-zone` (replaces `unified-community`)
   - `player-field` (replaces `unified-player-field`)
   - `player-zone` (replaces `unified-player-area` + nested `unified-hero-hand-row`)
3. Make `.mulligan-notice` and `.attack-mode-banner` absolute or move them into Overlay layer
4. Move `BettingPanel` + `WagerInfoPanel` into Overlay layer (no longer fight zone real estate)
5. Smoke-test all phases visually

### Phase C — Kill magic offsets
- Delete `margin-left: 240px`, `translateY(-50px/10px)` hacks
- Replace with semantic spacing (gap, padding) or remove

### Phase D — Dedupe CSS↔Tailwind
For each hotspot class:
- Decide single owner (CSS or Tailwind)
- Delete the other

### Phase E — Delete dead components
- `ArenaPokerHand.tsx`, `HeroBridge.tsx`, `WagerEffectsHUD.tsx`
- Audit `PotDisplay` + `PokerCombatAnimation` callers, delete if dead

### Phase F — Split `RagnarokCombatArena.css` (4903 LOC)
Move by concern into existing `combat/styles/*.css`:
- Hero card visuals → `hero-card.css` (new)
- Hero portrait → `hero-portrait.css` (new)
- Hero power button → `hero-power.css` (new)
- Betting bar legacy → either modernize or delete (verify dead)
- Battle Intel panel → `battle-intel.css` (new)
- Keep `RagnarokCombatArena.css` as only the `@import "./styles/index.css"` + viewport scaling (`GameViewport.css` already separate)

### Phase G — Split `RagnarokCombatArena.tsx` (1670 LOC)
Extract zone subcomponents:
- `<OpponentZone />`, `<BoardZone />`, `<PlayerZone />`, `<OverlayLayer />`
- Keep `RagnarokCombatArena` as the orchestration shell

---

## 8. Open questions

- **PotDisplay vs hud-status-pot in GameHUD** — pot info is in BOTH places? Reconcile.
- **WagerInfoPanel = CombatPhaseDirector?** WagerInfoPanel wraps CombatPhaseDirector with positioning. Either fold into Director or keep as positioning shell.
- **`.mulligan-notice` purpose** — is this a transient toast or part of mulligan modal? If toast → make absolute overlay. If part of modal → delete (MulliganScreen handles it).
- **`.attack-mode-banner` placement** — should be ribbon under HUD when active, not in board flow.
- **AnimationOverlay vs AIAttackAnimationProcessor** — both manage attack VFX. Verify single owner.

---

*Document version 1 — 2026-05-13. Update as architecture stabilises.*

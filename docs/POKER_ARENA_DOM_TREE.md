# Poker Arena DOM Tree — Position Map

Every element in the runtime DOM, its position type, mount condition, and a flag for "can-this-shift-layout?".

Generated 2026-05-13. Updated 2026-05-14 to match the grid/canvas layout.

---

## Top-level structure

```
window
└── <body>
    └── #root (React root, default block)
        └── …router stack…
            └── <PokerCombatPhase>  (lazy, mounts when flow tag === 'poker_combat')
                └── motion.div (framer-motion fade wrapper)
                    └── <RagnarokCombatArena>
                        └── <GameViewport>  ← responsive scaling wrapper
                            ├── .game-viewport-wrapper  (position:fixed; inset:0; overflow:hidden)
                            │   └── .game-viewport  (position:absolute; size 1920×1080; JS transform: scale/translate)
                            │       └── .ragnarok-combat-arena  ← CANVAS ROOT
                            │           └── …see "arena children" below…
                            └── …react portal targets (banner, particles, etc.)…
```

---

## `.ragnarok-combat-arena` direct children — canvas root

Parent: `position: relative; width:100%; height:100%; overflow:hidden`. Gameplay layers are absolute inside the scaled 1920×1080 canvas. Any child that should not affect board geometry must remain absolute or portaled to `#arena-layer-vfx` / `#arena-layer-modal`.

| # | Element | Position | Mount | Can shift? |
|---|---|---|---|---|
| 1 | `.hourglass-timer` | absolute (top: 8px) | always | ✓ no |
| 2 | `<PhaseBanner>` | absolute → **PORTAL** to `.game-viewport` since 2026-05-13 | conditional (phase changes) | ✓ no (now portaled) |
| 3 | `<HandStrengthIndicator>` (.hand-strength-indicator) | absolute (bottom: 195px; left: 50%) | always (gated by hand rank tier) | ✓ no |
| 4 | `.opponent-thinking-indicator` | absolute | conditional (`!isPlayerTurn`) | ✓ no |
| 5 | `.board-ambient-dust` | absolute (decoration) | always | ✓ no |
| 6 | `.board-torch-glow` | absolute (decoration) | always | ✓ no |
| 7 | `.board-border-ornament` | absolute (decoration) | always | ✓ no |
| 8 | `.realm-indicator` | absolute (right) | conditional (activeRealmId) | ✓ no |
| 9 | `.battle-intel` button + `.battle-intel-panel` | absolute | conditional (hasBattleIntel) | ✓ no |
| 10 | `.realm-announcement` | absolute (motion.div) | conditional (transient) | ✓ no |
| 11 | `.arena-content` (JSX says relative block, CSS overrides) | absolute inset-0 via `canvas-layout.css` | always | ✓ no |
| 12 | `<TargetingOverlay>` | absolute (`.targeting-overlay`) | conditional | ✓ no |
| 13 | `<CardBurnOverlay>` | absolute (`.card-burn-overlay`) | conditional | ✓ no |
| 14 | `<ActionAnnouncement>` | absolute (`.action-announcement-container`) | always | ✓ no |
| 15 | `<BossPhaseFlash>` | absolute (`.boss-phase-flash`) | conditional (boss phase fires) | ✓ no |
| 16 | `<HeroBattlePopup>` *(× N)* | fixed (inline style) | conditional (per popup) | ✓ no |
| 17 | `<KingPassivePopup>` | absolute (`.kpp-anchor`) | conditional | ✓ no |
| 18 | `<AIAttackAnimationProcessor>` | renders null | always | ✓ no |
| 19 | `<PixiParticleCanvas>` | fixed (inline) | always | ✓ no |
| 20 | `<AnimationOverlay>` | fixed (inline) | conditional | ✓ no |
| 21 | `<FirstStrikeAnimation>` | absolute (`.first-strike-overlay`) | conditional (first strike fires) | ✓ no |
| 22 | `<ElementBuffPopup>` | ? (CSS not audited) | conditional | ⚠ to verify |
| 23 | `<ElementMatchupBanner>` | absolute (`.element-matchup-overlay`) | conditional (combat start) | ✓ no |
| 24 | `<TargetingPrompt>` | absolute (`.targeting-prompt`) | conditional | ✓ no |
| 25 | `<HeroPowerPrompt>` | absolute (`.targeting-prompt.hero-power-targeting`) | conditional | ✓ no |
| 26 | `<MulliganScreen>` | overlay (full-screen modal) | conditional | ✓ no |
| 27 | `<ShowdownCelebration>` | absolute (`.showdown-celebration-container`) | conditional (resolution) | ✓ no |
| 28 | `<GameOverScreen>` | absolute (`.game-over-overlay`) | conditional (end of combat) | ✓ no |

**Conclusion**: `.arena-content` is the single game-layer host and is absolute. HUD/VFX/modal siblings do not push layout. Primary board geometry happens one level down in `.unified-combat-arena`.

---

## `.arena-content` → `UnifiedCombatArena` → 5 zones

Parent of zones: `.unified-combat-arena` (`display:grid; width:100%; height:100%`). 5 always-mounted grid children.

| # | Zone | Grid area | Mount | Can shift? |
|---|---|---|---|---|
| 1 | `<OpponentZone>` `<header>` | `opponent` | always | bounded by grid area |
| 2 | `<MinionField role="opp">` `<section>` | `opponent-field` | always | bounded by grid area |
| 3 | `<BoardZone>` `<section>` | `board` | always | bounded by grid area |
| 4 | `<MinionField role="player">` `<section>` | `player-field` | always | bounded by grid area |
| 5 | `<PlayerZone>` `<footer>` | `player` | always | bounded by grid area |

All zones always mount. Their position is defined by `grid-template-areas` plus tokens in `client/src/game/combat/styles/canvas-layout.css`.

**Inside OpponentZone**:
```
<header zone-opp>
  <div .opponent-hero-container flex flex-col items-center gap-2>
    ├── <BossQuipBubble>          absolute (BossQuipBubble.css)
    ├── <PhasePipIndicator>       absolute (PhasePipIndicator.css)
    ├── <BattlefieldHero>         block w/ background-image (220×293px)
    ├── <HoleCardsOverlay>        ?
    └── <HeroResourceDock>        block, fixed dock width token
  <div .opponent-hand-display>
    × ≤10 <CardRenderer> or <opponent-card-back>
    × 1 .opponent-hand-count badge (absolute, top-right)
```

**Inside PlayerZone**:
```
<footer zone-player>
  <div .unified-hero-section shrink-0 z-30 pointer-events-auto>
    <div .poker-hero-container flex flex-col items-center gap-2>
      ├── <BattlefieldHero>      block w/ background-image
      ├── <HeroResourceDock>      block, fixed dock width token
      ├── <HoleCardsOverlay>      ?
      └── .hand-strength-compact  absolute (conditional on playerHandEval > HIGH_CARD)
  <div .unified-hand-section flex flex-row items-end z-40 pointer-events-auto>
    <div .poker-hand-container flex flex-row justify-start items-end p-0>
      <HandFan />
```

---

## ⚠ Suspects for layout shift on phase change

### Resolved high-suspicion candidates:

1. **PhasePipIndicator** (inside OpponentZone) — now `position:absolute` in `PhasePipIndicator.css`, anchored above the opponent hero column. It should no longer push the hero.

2. **`.hand-strength-compact`** (inside PlayerZone) — now rendered with `absolute -bottom-6 left-1/2`. It should no longer consume hero-column layout space.

### Remaining medium suspicion:

3. **`.combat-phase-director-*`** (CombatPhaseDirector inside WagerInfoPanel) — CSS now exists in `RagnarokCombatArena.css`. Still verify fixed height/overflow behavior because content changes between phases (Spellcraft → First Blood → Faith …); the parent panel has fixed width but may still change height.

4. **`<BossQuipBubble>`** — absolute (verified). OK on its own, but it uses AnimatePresence + motion.div which may force a re-flow of its absolute parent (`.opponent-hero-container`) during enter/exit transitions.

### Low suspicion (verified absolute):

5. PhaseBanner — now portaled, fully outside arena tree
6. BettingPanel / WagerInfoPanel — absolute, fixed widths
7. All boss/element/showdown overlays — absolute

---

## Image-driven shift candidates

- `<BattlefieldHero>` uses `backgroundImage: url(...)` on a sized div (220×293px). **No layout shift** because background images don't change box dimensions.
- `<GameOverScreen>` uses `<img>` for hero portraits. Only mounts at game over, not during phase change.
- All decorative ornaments use background-image — safe.

**Conclusion**: layout shift on phase change is **not** image-driven.

---

## Current layout-shift hypothesis

The previous likely root cause (`PhasePipIndicator` / `.hand-strength-compact` mounting in flow) has been addressed by absolute positioning. If phase changes still shift layout, inspect:

- Wager/HUD panel height changes in absolute overlays.
- Any component using `position: fixed` instead of an arena layer.
- Any cross-zone offset that is not represented by a named token in `canvas-layout.css`.

---

## Image hygiene

- `client/public/art/orphaned/` — **28MB / 226 files**, literally named "orphaned". Verify no JSX refs, then delete.
- `client/public/ui/` — 10 dead jpg/png files (no JSX/CSS refs):
  - `attack-button-v2.jpg`, `board-frame.jpg`, `card-frame-v1.jpg`
  - `hero-frame-v1.jpg`, `hero-frame-v2-alt.jpg`, `pvp-background.png`
  - `ragnarok-sky-bg.jpg`, `ragnarok-sky-bg-alt.jpg`
  - `rune-chain-divider.jpg`, `rune-chain-divider-v2.jpg`

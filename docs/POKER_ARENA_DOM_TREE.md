# Poker Arena DOM Tree — Position Map

Every element in the runtime DOM, its position type, mount condition, and a flag for "can-this-shift-layout?".

Generated 2026-05-13. Update when arena components change.

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
                            │       └── .ragnarok-combat-arena  ← FLEX COLUMN ROOT
                            │           └── …see "arena children" below…
                            └── …react portal targets (banner, particles, etc.)…
```

---

## `.ragnarok-combat-arena` direct children — flex column root

Parent: `display: flex; flex-direction: column; overflow: hidden`. Children stack vertically. Anything **not** absolute pushes flex flow.

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
| 11 | `.arena-content` (relative w-full h-full **block**) | **STATIC (flex flow!)** | always | ⚠ owns vertical column space |
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

**Conclusion**: only `.arena-content` (`#11`) is non-absolute. All other arena children are absolute. So arena-content always takes the full flex-column space — no horizontal shift possible from siblings.

---

## `.arena-content` → `UnifiedCombatArena` → 5 zones

Parent of zones: `.unified-combat-arena` (`flex flex-col w-full h-full`). 5 flex children.

| # | Zone | Tailwind | Mount | Can shift? |
|---|---|---|---|---|
| 1 | `<OpponentZone>` `<header>` | `zone-opp shrink-0 flex flex-row justify-start items-end gap-6 px-6 py-2` | always | content-fit |
| 2 | `<MinionField role="opp">` `<section>` | `zone-opp-field grow shrink-0 basis-0 min-h-32 flex flex-row justify-center` | always | flex-1 distribute |
| 3 | `<BoardZone>` `<section>` | `zone-board grow-2 shrink basis-0 min-h-40 flex flex-row justify-center` | always | flex-1 distribute |
| 4 | `<MinionField role="player">` `<section>` | `zone-player-field grow shrink-0 basis-0 min-h-32 flex flex-row justify-center` | always | flex-1 distribute |
| 5 | `<PlayerZone>` `<footer>` | `zone-player shrink-0 flex flex-row items-end justify-start gap-4 px-6 pb-1` | always | content-fit |

All zones always mount. Their height distributes via flex-grow (board grow-2, fields grow-1, opp+player content-fit).

**Inside OpponentZone**:
```
<header zone-opp>
  <div .opponent-hero-container flex flex-col items-center gap-2>
    ├── <BossQuipBubble>          absolute (BossQuipBubble.css)
    ├── <PhasePipIndicator>       STATIC (display:flex; flex-direction:column)  ← can push!
    ├── <BattlefieldHero>         block w/ background-image (220×293px)
    ├── <HoleCardsOverlay>        ?
    └── <ManaBar wrap>            block (.opponent-hero-mana, Tailwind w-55 flex)
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
      ├── <ManaBar wrap>          .player-mana-display (Tailwind w-55 flex)
      ├── <HoleCardsOverlay>      ?
      └── .hand-strength-compact  STATIC (conditional on playerHandEval > HIGH_CARD)  ← can push!
  <div .unified-hand-section flex flex-row items-end z-40 pointer-events-auto>
    <div .poker-hand-container flex flex-row justify-start items-end p-0>
      <HandFan />
```

---

## ⚠ Suspects for layout shift on phase change

### High suspicion (static, conditional rendering inside flex-col zones):

1. **PhasePipIndicator** (inside OpponentZone) — `display: flex; flex-direction: column` — STATIC. Renders only if `bossPhases` is set AND `opponentMaxHP > 0`. If conditions toggle during combat (e.g. data loads late), it appears/disappears, pushing the rest of the hero column.

2. **`.hand-strength-compact`** (inside PlayerZone) — STATIC inline `<div>`. Renders only when `playerHandEval && playerHandEval.rank > PokerHandRank.HIGH_CARD`. When community cards are revealed and the hand improves past HIGH_CARD, this element mounts and pushes the hand-strength badge below the hole cards. Vertical only, but combined with `align-items: center` in the flex-col can ripple.

### Medium suspicion (CSS classes with no defined rules):

3. **`.combat-phase-director-*`** (CombatPhaseDirector inside WagerInfoPanel) — **ZERO CSS rules** in entire codebase. Component renders unstyled divs. Content changes between phases (Spellcraft → First Blood → Faith …) — each change re-renders the panel with different text length. Since the parent WagerInfoPanel has fixed width (`w-85`) but no fixed height, height fluctuates per phase.

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

## Most likely root cause

**`.hand-strength-compact` and/or `PhasePipIndicator` toggling inside their respective hero columns.** Both are STATIC (in-flow) and conditionally rendered. When they appear/disappear:

- The hero column re-flows vertically (adds/removes ~30-50px of height).
- This is inside a `flex flex-col items-center` column. The COLUMN re-centers its children → hero portrait shifts slightly.
- Adjacent zones may re-flow if their `min-h` is tight.

Fix: make both elements **absolute-positioned** (overlay style) so their appearance does not consume layout space.

---

## Image hygiene

- `client/public/art/orphaned/` — **28MB / 226 files**, literally named "orphaned". Verify no JSX refs, then delete.
- `client/public/ui/` — 10 dead jpg/png files (no JSX/CSS refs):
  - `attack-button-v2.jpg`, `board-frame.jpg`, `card-frame-v1.jpg`
  - `hero-frame-v1.jpg`, `hero-frame-v2-alt.jpg`, `pvp-background.png`
  - `ragnarok-sky-bg.jpg`, `ragnarok-sky-bg-alt.jpg`
  - `rune-chain-divider.jpg`, `rune-chain-divider-v2.jpg`

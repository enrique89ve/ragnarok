# Poker Arena

Poker combat is a self-contained game phase. Like chess, it owns its layout schema, its canvas, and its CSS entry. This folder is the file-system contract for that autonomy.

## Layout

```
client/src/game/poker/
├── README.md                   ← you are here
├── index.ts                    ← public barrel (re-exports layout schema)
├── layout/
│   └── pokerViewportLayout.ts  ← canonical 1920×1080 schema, TS type
└── styles/
    ├── poker.css               ← single public CSS entry
    ├── tokens.css              ← local --poker-* alias block
    ├── canvas.css              ← fixed 1920×1080 geometry (must be first)
    ├── poker-core.css          ← manifest: reset, zones, cards, HUD, controls
    ├── poker-vfx.css           ← manifest: atmosphere, glows, drama
    ├── poker-showdown.css      ← manifest: terminal presentation
    └── poker-campaign.css      ← manifest: campaign-only overlays
```

## CSS contract

`styles/poker.css` is the **single** CSS entry. Import it once from `RagnarokCombatArena.tsx` (or any poker surface) and stop. Do not import the manifests or `canvas.css` directly from TSX — the entry enforces cascade order.

Adding a new poker CSS concern:

1. Create the leaf in the matching manifest's target folder (currently `client/src/game/combat/styles/`).
2. Add an `@import "./new-leaf.css";` to the relevant manifest.
3. Do not add a new top-level entry to `poker.css`.

## Token bridge

App design tokens (`--gold-300`, `--space-*`, `--surface-overlay-deep`, `--radius-full`, `--z-hover`, `--color-gold`, `--bifrost-300`, `--hero-card-width`) live in `client/src/styles/design-tokens.css`. Poker CSS does **not** consume them directly. They are aliased once in `styles/tokens.css` as `--poker-*` and poker CSS reads the local alias. Touch `tokens.css` when the app changes a token.

## Layout schema

`layout/pokerViewportLayout.ts` is the single source of truth for the 1920×1080 zone geometry. It exports:

- `POKER_VIEWPORT_LAYOUT` — frozen layout with all 24 zones.
- `POKER_VIEWPORT_LAYOUT_STYLE` — pre-computed React `style` object to spread onto the `.unified-combat-arena` element.
- `buildPokerViewportLayoutStyle(layout)` — recompute the style for a custom layout (used by the dev-only safe-area prototype).
- Types: `PokerViewportZoneId`, `PokerViewportLayer`, `PokerViewportZone`, `PokerViewportLayout`, `PokerViewportCssVarName`, `PokerViewportLayoutStyle`.

Import these from `'../../poker'` (the barrel), not from the inner path.

## No `!important` rule

`canvas.css` historically carries `!important` declarations that fight with `RagnarokCombatArena.css` and `combat-animations.css`. The folder move is the first step toward removing them — by isolating the canvas into `poker/styles/canvas.css`, the cascade can be re-tuned without cross-folder interference. New CSS in this folder **must not** use `!important`. Existing `!important` is being removed in a follow-up; do not add new ones while waiting.

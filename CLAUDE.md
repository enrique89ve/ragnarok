# CLAUDE.md

Norse Mythos Card Game — Hive-anchored card battler.

## Commands

```bash
npm run dev       # Vite + Express dev server → http://localhost:5000
npm run check     # TypeScript type check
npm run lint      # ESLint (use --fix to autofix)
npm run lint:css  # Stylelint (runs in pre-commit)
```

## Source of truth

- **Schema canon** (rarity, element, set, ids, protocol version, adapters) → `client/src/game/data/schemas/`
- **Card registry** (actual card definitions) → `client/src/game/data/cardRegistry/`
- **Game rules** → `docs/RULEBOOK.md`
- **On-chain protocol** → `docs/RAGNAROK_PROTOCOL_V1.md`
- **Genesis ceremony** → `docs/GENESIS_RUNBOOK.md`
- **Element interactions** → `docs/ElementWeaknessSystem.md`

## Conventions

- **Gameplay is truth.** When docs and code diverge, code wins. `schemas/` is the contract; anything else (incl. `metadata.json`) derives from it.
- **Two card universes** — `set: 'free'` (starter cards, infinite, off-chain) and `set: 'genesis'` (sealed NFT pool, on-chain). Combat rules are identical between sets; differences live in meta layers (XP curve, eitr, marketplace, packs).
- **Rarity is one enum** — `common | uncommon | rare | epic | legendary`. Adapters in `schemas/primitives/rarity.ts` translate external vocabularies to this canon. Never branch on legacy strings (`basic`, `mythic`); convert at the boundary.
- **Asset paths** resolve via `assetPathFor(assetId)` from the schemas package. No hardcoded `/art/nfts/...` outside `client/src/game/utils/art/`.
- **Indentation**: tabs. **Emojis**: never in committed code.

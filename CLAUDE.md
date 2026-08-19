# CLAUDE.md

Norse Mythos Card Game — Hive-anchored card battler.

## Commands

```bash
pnpm run dev       # Vite + Express dev server → http://localhost:5000
pnpm run dev:testnet # Same server with .env.testnet / rk_game_testnet
pnpm run build:alfa-testnet # Production Alfa Testnet bundle; stage stays testnet
pnpm run start:alfa-testnet # Built server with alfa-testnet reset epoch / JSON state
pnpm run build:mainnet # Production browser bundle with .env.mainnet
pnpm run check     # TypeScript type check
pnpm run lint      # ESLint (use --fix to autofix)
pnpm run lint:css  # Stylelint (runs in pre-commit)
```

Package manager is **pnpm** (see `pnpm-workspace.yaml`). Install with `pnpm install --frozen-lockfile`; never commit a `package-lock.json`.

## Source of truth

- **Schema canon** (rarity, category, set, helpers, adapters) → `shared/schemas/`. Combat-engine primitives (element, ids, faction, piece, cardType, manifest) re-exported via `client/src/game/data/schemas/`.
- **Card registry** (actual card definitions) → `client/src/game/data/cardRegistry/`
- **Game rules** → `docs/RULEBOOK.md`
- **On-chain protocol** → `docs/RAGNAROK_PROTOCOL_V1.md`
- **Hive indexer contract** → `docs/HIVE_INDEXER_CONTRACT.md`
- **PvP wire protocol** → `docs/PVP_WIRE_PROTOCOL.md` (transport, lifecycle, envelopes, authority model, transcript)
- **P2P reload / local snapshot** → `docs/P2P_MATCH_RESUME.md`
- **Current Alfa → Closed Beta readiness** → `docs/TESTNET_READINESS_FAST_TRACK.md`
- **Card chrome by stage** → `docs/CARD_SURFACE_RENDER.md`
- **Visual/design system** → `DESIGN.md`
- **Poker arena UI canon** → `docs/POKER_ARENA_UI.md`
- **Genesis ceremony** → `docs/GENESIS_RUNBOOK.md`
- **Element interactions** → `docs/ElementWeaknessSystem.md`

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the canonical local status values `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo: read root `CONTEXT.md` and relevant ADRs when present. See `docs/agents/domain.md`.

### TypeScript protocol design

For protocol-boundary TypeScript contracts, authority models, discriminated unions, branded primitives, or runtime validation shape, use the `typescript-pro` skill and consult a separate agent when the design affects shared client/server/replay behavior.

## Conventions

- **Gameplay is truth.** When docs and code diverge, code wins. `schemas/` is the contract; anything else (incl. `metadata.json`) derives from it.
- **Two card universes** — `set: 'starter'` (starter cards, infinite, off-chain — every player has these) and `set: 'genesis'` (sealed NFT pool, on-chain). Combat rules are identical between sets; differences live in meta layers (XP curve, eitr, marketplace, packs). See `docs/SET_AXIS.md`.
- **Rarity is one enum** — `common | rare | epic | mythic` (4 tiers, per `docs/RULEBOOK.md` Card Rarity table). Canon lives in `shared/schemas/rarity.ts`; `adaptRarity` translates external vocabularies (e.g. legacy `basic` → `common`, PascalCase `Mythic` → `mythic`) at the trust boundary. Never branch on non-canonical strings.
- **Asset paths** resolve via `assetPathFor(assetId)` from the schemas package. No hardcoded `/art/nfts/...` outside `client/src/game/utils/art/`.
- **Indentation**: tabs. **Emojis**: never in committed code.

## Design System

Always read `DESIGN.md` before visual or UI work. Poker/combat visual changes
must also read `docs/POKER_ARENA_UI.md` and the current testnet readiness plan in
`docs/TESTNET_READINESS_FAST_TRACK.md`.

Do not deviate from the documented type, color, spacing, board geometry, motion,
or poker-readability rules without explicit user approval. In QA/review mode,
flag visual code that fights `DESIGN.md` or splits the poker board into a
parallel layout path.

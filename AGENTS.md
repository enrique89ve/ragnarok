# Agent Workflows

This file defines how AI agents (Cursor, Claude Code API, etc.) should work in this repository.

## Primary Workflow

1. **Before edits**: Read CLAUDE.md and relevant docs (RULEBOOK.md, GAME_FLOW.md)
2. **Scope**: Identify affected files — use Globs and search across the full scope
3. **Execute**: Follow existing patterns; prefer editing over creating new files
4. **Verify**: Run `npm run check` and `npm run lint` before finishing

## Roles

| Task | Primary Location | Notes |
|------|------------------|-------|
| Card changes | `client/src/game/data/`, `cardRegistry/` | allCards.ts is single source |
| Effect handlers | `client/src/game/effects/handlers/` | Add to index.ts |
| Combat logic | `client/src/game/combat/` | PokerCombatStore, RagnarokCombatArena |
| API routes | `server/routes/` | Pack/inventory require DATABASE_URL |
| Styling/positioning | `client/src/game/combat/styles/zones.css` | Use CSS variables only |
| Types | `client/src/game/types/` | Extend cautiously |

## Commands

```bash
npm run dev       # Start dev server — http://localhost:5000
npm run build     # Production build
npm run check     # TypeScript type check
npm run lint      # ESLint
```

## Cursor Rules

Rules in `.cursor/rules/` provide file-specific context:

- `game-conventions.mdc` — Cards, effects, CSS, components
- `api-patterns.mdc` — Pack/inventory API patterns

## Pre-Commit

When available: `npm run lint` and `npm run check` run before commits to catch issues early.

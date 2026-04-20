# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Development server (Vite + Express) — http://localhost:5000
npm run dev:game  # Alias for dev
npm run build     # Production build
npm run check     # TypeScript type checking
npm run lint      # ESLint
npm run lint:fix  # ESLint with auto-fix
npm run lint:css  # Stylelint (duplicate-selector guard, runs in pre-commit)
```




### Next (Genesis Launch)

- Admin panel built: `/admin` → Genesis Command Center (step-by-step ceremony UI with checklist)
- Create @ragnarok Hive account (2-of-3 multisig, no standalone keys)
- Create @ragnarok-genesis Hive account (2-of-3 multisig, same signers)
- Create @ragnarok-treasury Hive account (2-of-3 initial, expandable via WoT)
- Ceremony flow: `/admin` → Step 1: Genesis → Step 2: Batch Mint → Step 3: Seal → Step 4: Mint Packs → Step 5: Distribute
- Treasury remains active for ongoing RUNE payouts
- Full ceremony procedures: [GENESIS_RUNBOOK.md](docs/GENESIS_RUNBOOK.md)

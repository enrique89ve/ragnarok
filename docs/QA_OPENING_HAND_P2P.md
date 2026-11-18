# QA — Opening hand (local) & P2P safety

Companion to `docs/POKER_ARENA_UI.md` §Opening hand: local vs P2P.

Policy implementation: `client/src/game/combat/openingHandPresentationPolicy.ts`.

## Automated (CI-friendly)

```bash
pnpm run qa:opening-hand-policy
```

Runs unit tests for presentation policy + arena prefetch defer/flush.

## Local single — LoL path

Prereq: `pnpm run dev` or `pnpm run dev:alfa-testnet`, guest single, animations on.

- [ ] Chess clash → VS holds ~3–4s with aurora backdrop (no double plate flash).
- [ ] Enter `poker_combat`: fullscreen opening mulligan (no heavy poker board under cards).
- [ ] Deal uses snap timing (cards appear quickly, no long ghost prime).
- [ ] DevTools Performance (optional CPU 4×): no long `Parse/Compile` spike on `RagnarokCombatArena` during card flip / mulligan interaction.
- [ ] **Keep Hand** → exit iris on same viewport → poker board appears (realm/background), first strike if applicable, then betting.
- [ ] Second chess→poker in same match: no opening host; arena loads without approach overlay blocking mulligan.

## P2P — authority path

### Dos navegadores (automático)

Servidor local (`pnpm run dev` o `dev:alfa-testnet`) en `http://127.0.0.1:5000`:

```bash
# Ventanas visibles (en WSL hace falta DISPLAY / host X11)
pnpm run qa:p2p-opening-hand -- --url http://127.0.0.1:5000 --headed

# Headless: matchmaking + capturas en artifacts/
pnpm run qa:p2p-opening-hand -- --url http://127.0.0.1:5000
```

Abre **dos perfiles Chromium** (dos instancias separadas), navega a `/#/multiplayer` (HashRouter) y pulsa **Find opponent** en ambos. El script inyecta el starter claim de workshop local. Luego completa manualmente ajedrez → choque → VS → mulligan según la checklist de abajo.

Chaos de red (drops/offline): `pnpm run qa:p2p-chaos -- --url …` (otro gate).

Prereq: Quick Match wired; starter claim si el lobby lo exige.

- [ ] Both peers: VS completes (poker entry approval if shown).
- [ ] Both enter `poker_combat` with **arena mounted** (HUD/timer hooks alive; not stuck on host-only shell).
- [ ] Opening mulligan: toggle / confirm / skip only via wire commands — opponent state converges (`gameStore` tests cover reducer; spot-check in UI).
- [ ] After both ready: **same poker phase** on both clients (`FIRST_STRIKE` then `PRE_FLOP`, or straight `PRE_FLOP` per handoff).
- [ ] First-strike damage and HP floor apply once; no peer stuck in `FIRST_STRIKE` while the other bets.
- [ ] Turn clock (if notary enabled) starts only when local policy allows actions — not during active opening gate.
- [ ] No `CombatPhasesLazyFallback` / approach overlay covering an active mulligan modal.

## Regression watchlist

| Symptom | Likely cause |
|---|---|
| P2P desync on first poker hand | Arena deferred or `completeFirstStrike` only on one peer |
| Approach overlay over mulligan | Outer Suspense + lazy phase before policy split |
| Iris missing on single exit | Host unmounted same frame as gate drop (should retain host until `onMulliganChamberExitSettled`) |
| Arena parse during opening mulligan (single) | `prefetchPokerCombatChunk()` called with opening gate + local match |

## When to update this doc

- New opening-hand animation or portal.
- Change to `isOpeningMulliganGatingPoker` or mulligan wire commands.
- VS timing split between ranked and single.
# Refactor Plan — `/game` Flow State Machine

**Status:** Ready to execute
**Created:** 2026-04-27
**Estimated effort:** 6–8 hours, distributed in 9 reversible sub-sprints
**Prerequisites:** Sprints A–F + I.1 already merged (warband store, page, route, wiring, header redundancy fix)

---

## 1. Context (load this first when picking up cold)

### What this codebase is

Norse Mythos — Hive-anchored card battler. React + Vite + Tailwind v3 + Zustand. SPA with `HashRouter`. Single mega-route `/game` runs `RagnarokChessGame.tsx` (1513 lines, 42 hooks) which is a **state machine with 6 phases** mixing render, transitions, side effects, and route-specific logic in one component.

### Entry routes that reach `/game`

| Route          | Component         | Reaches `/game` via                                                           |
| -------------- | ----------------- | ----------------------------------------------------------------------------- |
| `/warband`     | `WarbandPage`     | Pickea warband → `useWarbandStore.setWarband` → `navigate('/game')`           |
| `/campaign`    | `CampaignPage`    | Pickea mission → sets `useCampaignStore.currentMission` → `navigate('/game')` |
| `/multiplayer` | `MultiplayerGame` | Renders `<RagnarokChessGame />` internally after picker                       |

### Already-completed refactor (do NOT redo)

Sprints A–F shipped `useWarbandStore` (Zustand), `WarbandPage`, route `/warband`, removed embedded picker from `RagnarokChessGame`, connected `MultiplayerGame` to the store, and added a redirect guard. Sprint I.1 removed redundant header UI in `ArmySelection.tsx`. **Read git log if details are needed; do NOT touch the warband flow.**

---

## 2. The problem this plan solves

`RagnarokChessGame.tsx` currently:

1. **Carries dead phases per route.** `cinematic`, `mission_intro`, `army_selection`, `game_over.cinematic`, `game_over.bridge` only apply to `/campaign`. Casual and multiplayer routes load that JSX, state, and imports for nothing.
2. **State ownership is wrong in 4 places.** Route-specific state (`bossRulesApplied`, `gameOverSubPhase`) lives in the universal coordinator. Cross-fase state (`pokerSlotsSwapped`, `turnCount`) lives local where it should be in `useUnifiedCombatStore`.
3. **FSM is untestable.** Transitions live entwined with `setState`, `useEffect`, callbacks. No way to assert `chess → vs_screen → poker_combat → chess` is correct without booting the full game.
4. **Bundle has ~30–60KB of campaign-only code** (`useCampaignStore`, `CinematicCrawl`, `MissionBriefing`, `buildCampaignArmy`) loaded by every route.

---

## 3. Phase × Route audit (the source of truth)

| Phase                                   | `/warband` casual |       `/campaign`        | `/multiplayer` |
| --------------------------------------- | :---------------: | :----------------------: | :------------: |
| `army_selection` (transient on restart) |        ❌         |            ✅            |       ❌       |
| `cinematic`                             |        ❌         |   ✅ if `hasCinematic`   |       ❌       |
| `mission_intro`                         |        ❌         | ✅ if `narrativeBefore`  |       ❌       |
| `chess`                                 |        ✅         |            ✅            |       ✅       |
| `vs_screen`                             |        ✅         |            ✅            |       ✅       |
| `poker_combat`                          |        ✅         |            ✅            |       ✅       |
| `game_over.result`                      |        ✅         |            ✅            |       ✅       |
| `game_over.cinematic`                   |        ❌         | ✅ if `victoryCinematic` |       ❌       |
| `game_over.bridge`                      |        ❌         |   ✅ if `storyBridge`    |       ❌       |

---

## 4. State ownership audit

| State                                     | Today                     | Should be                              | Reason                     |
| ----------------------------------------- | ------------------------- | -------------------------------------- | -------------------------- |
| `phase` (FSM)                             | local `useState`          | **`useGameFlowStore` (NEW slice)**     | Testability of transitions |
| `playerArmy`                              | local + `useWarbandStore` | local cache OK                         | Acceptable mirroring       |
| `sharedDeckCardIds`                       | local + `useWarbandStore` | local cache OK                         | Idem                       |
| `combatPieces`                            | local                     | **local**                              | Short-lived handoff        |
| `vsScreenPieces`                          | local                     | **local**                              | Idem                       |
| `pokerSlotsSwapped`                       | local                     | **`useUnifiedCombatStore`**            | Crosses chess↔poker        |
| `turnCount`                               | local                     | **`useUnifiedCombatStore.boardState`** | Board metadata             |
| `bossRulesApplied`                        | local                     | **`useCampaignStore`**                 | Campaign-only              |
| `gameOverSubPhase`                        | local                     | **`useCampaignStore`**                 | Campaign-only              |
| `gameEndProcessedRef`, `gameOverTimerRef` | local                     | **local**                              | Refs always local          |
| `boardState`, `combatState`               | `useUnifiedCombatStore`   | ✅ correct                             | —                          |
| `campaignData`                            | `useCampaignStore`        | ✅ correct                             | —                          |

---

## 5. Chosen architecture: Option B (Phases extracted + thin coordinator)

Rejected Option A (route-specific cores) because it duplicates the chess↔poker handoff logic across `CasualGame`, `CampaignGame`, `MultiplayerGame`. The handoff is delicate; one source of truth is safer.

### Target folder structure

```
client/src/game/components/chess/
├─ RagnarokChessGame.tsx          (~120 lines — coordinator)
└─ flow/
   ├─ types.ts                    Discriminated union GameFlowState + FlowEvent
   ├─ transitions.ts              Pure (state, event) → state'
   ├─ guards.ts                   Pure invariants (canTransition, validity checks)
   ├─ store.ts                    Zustand slice; useGameFlowStore
   ├─ useGameFlow.ts              Hook: wraps store + side-effect bindings
   ├─ phases/
   │  ├─ CinematicPhase.tsx       (lazy)
   │  ├─ MissionIntroPhase.tsx    (lazy)
   │  ├─ ChessPhase.tsx
   │  ├─ VsScreenPhase.tsx
   │  ├─ PokerCombatPhase.tsx
   │  └─ GameOverPhase.tsx        (handles result + cinematic + bridge sub-phases)
   └─ __tests__/
      ├─ transitions.test.ts
      ├─ guards.test.ts
      └─ store.test.ts
```

### Discriminated union contract

```ts
// flow/types.ts
export type GameFlowState =
  | { phase: "cinematic"; cinematic: CinematicData }
  | { phase: "mission_intro"; mission: MissionData }
  | { phase: "chess"; army: ArmySelection }
  | { phase: "vs_screen"; attacker: ChessPiece; defender: ChessPiece }
  | { phase: "poker_combat"; handoff: CombatHandoff }
  | {
      phase: "game_over";
      result: GameResult;
      sub: "result" | "cinematic" | "bridge";
    };

export type FlowEvent =
  | { type: "INIT_CAMPAIGN"; mission: MissionData; hasCinematic: boolean }
  | { type: "INIT_CASUAL"; army: ArmySelection }
  | { type: "CINEMATIC_DONE" }
  | { type: "INTRO_DONE" }
  | { type: "COMBAT_TRIGGERED"; attacker: ChessPiece; defender: ChessPiece }
  | { type: "VS_TIMEOUT" }
  | { type: "COMBAT_RESOLVED"; resolution: CombatResolution }
  | { type: "GAME_ENDED"; winner: "player" | "opponent" }
  | { type: "GAME_OVER_ADVANCE" }
  | { type: "RESTART_CAMPAIGN" }
  | { type: "RESTART_CASUAL" };
```

### Coordinator after refactor

```tsx
// RagnarokChessGame.tsx (~120 lines)
const RagnarokChessGame = ({ initialArmy }: Props) => {
  const { state, dispatch } = useGameFlow({ initialArmy });
  // shared adapters that ALL phases need
  // ... useChessCombatAdapter(), usePokerCombatAdapter() etc.

  switch (state.phase) {
    case "cinematic":
      return (
        <CinematicPhase
          data={state.cinematic}
          onDone={() => dispatch({ type: "CINEMATIC_DONE" })}
        />
      );
    case "mission_intro":
      return (
        <MissionIntroPhase
          data={state.mission}
          onDone={() => dispatch({ type: "INTRO_DONE" })}
        />
      );
    case "chess":
      return (
        <ChessPhase
          army={state.army}
          onCombat={(a, d) =>
            dispatch({ type: "COMBAT_TRIGGERED", attacker: a, defender: d })
          }
        />
      );
    case "vs_screen":
      return (
        <VsScreenPhase
          {...state}
          onTimeout={() => dispatch({ type: "VS_TIMEOUT" })}
        />
      );
    case "poker_combat":
      return (
        <PokerCombatPhase
          handoff={state.handoff}
          onResolved={(r) =>
            dispatch({ type: "COMBAT_RESOLVED", resolution: r })
          }
        />
      );
    case "game_over":
      return (
        <GameOverPhase
          result={state.result}
          sub={state.sub}
          onAdvance={() => dispatch({ type: "GAME_OVER_ADVANCE" })}
        />
      );
    default:
      return assertNever(state);
  }
};
```

---

## 6. Sub-sprint plan (execute in order, each is a separate commit)

> **Reversibility rule:** at the end of every sub-sprint, the game must be playable end-to-end. If a sub-sprint breaks gameplay, revert before continuing.

### G1 — Pure FSM types + transitions (no UI)

**Files:** `flow/types.ts`, `flow/transitions.ts`, `flow/guards.ts`, `flow/__tests__/transitions.test.ts`

- Define `GameFlowState`, `FlowEvent`, `CombatHandoff`, `GameResult`, `CinematicData`, `MissionData` types.
- Implement pure `nextState(state, event): GameFlowState`.
- Implement pure `canTransition(state, event): boolean` guards.
- Vitest tests covering all valid transitions + every invalid transition (should return state unchanged).

**Validation:** tests green. No app behavior changed (no consumers yet).

**Estimated:** 1.5h

---

### G2 — Zustand slice + `useGameFlow` hook (parallel to existing)

**Files:** `flow/store.ts`, `flow/useGameFlow.ts`, `flow/__tests__/store.test.ts`

- Slice exposes `state: GameFlowState`, `dispatch(event): void`.
- Hook bridges store with React-side effects (sound, timer cleanup, AI turn triggers) — these effects move OUT of `RagnarokChessGame.tsx` into the hook.
- **DO NOT migrate `RagnarokChessGame.tsx` yet.** Coexist for one commit so the hook can be tested in isolation.

**Validation:** unit tests on dispatch + state shape. Game still uses old local `phase` state; behavior unchanged.

**Estimated:** 1h

---

### G3 — Migrate state ownership to correct stores

**Files:** `useCampaignStore`, `useUnifiedCombatStore`, `RagnarokChessGame.tsx`

- Move `bossRulesApplied`, `gameOverSubPhase` from local state → `useCampaignStore` slice.
- Move `pokerSlotsSwapped` from local → `useUnifiedCombatStore`.
- Move `turnCount` from local → `useUnifiedCombatStore.boardState`.
- Update all consumers in `RagnarokChessGame.tsx` to read from stores.
- Tests: extend existing store tests to cover new fields.

**Validation:** play one full campaign mission AND one casual game end-to-end. Boss rules apply on correct turn. Poker side-swap works. Game-over cinematic plays in campaign.

**Estimated:** 1.5h

---

### G4 — Migrate `phase` to `useGameFlowStore`

**Files:** `RagnarokChessGame.tsx`

- Remove `useState<GamePhase>(...)` from `RagnarokChessGame`.
- Replace with `const { state, dispatch } = useGameFlow(...)`.
- Replace every `setPhase('X')` call with `dispatch({ type: 'EVENT' })`.
- Keep all phase render blocks where they are (still inline) — only the state source changes.

**Validation:** every entry path (casual, campaign with cinematic, campaign without, multiplayer) reaches chess phase correctly. Combat triggers VS screen → poker → back to chess.

**Estimated:** 1h

---

### G5 — Extract `CinematicPhase` (the simplest)

**Files:** `flow/phases/CinematicPhase.tsx`, `RagnarokChessGame.tsx`

- New component: takes `data: CinematicData`, `onDone: () => void`, renders `<CinematicCrawl>`.
- Use `lazy()` import in coordinator.
- Replace inline `phase === 'cinematic' && (<CinematicCrawl .../>)` with `<CinematicPhase ...>`.

**Validation:** campaign with `hasCinematic` plays cinematic, transitions to chess on done.

**Estimated:** 0.5h

---

### G6 — Extract `MissionIntroPhase`

**Files:** `flow/phases/MissionIntroPhase.tsx`, `RagnarokChessGame.tsx`

Same pattern as G5, lazy-loaded. Wraps `<MissionBriefing>` or whatever currently renders for `mission_intro`.

**Validation:** campaign mission with `narrativeBefore` shows briefing → chess.

**Estimated:** 0.5h

---

### G7 — Extract `GameOverPhase` (with internal sub-state)

**Files:** `flow/phases/GameOverPhase.tsx`, `RagnarokChessGame.tsx`

- Component receives `result`, `sub: 'result' | 'cinematic' | 'bridge'`, `onAdvance`.
- Internal sub-routing: `sub === 'cinematic'` → renders victory/defeat cinematic; `sub === 'bridge'` → story bridge; `sub === 'result'` → standard result card.
- Casual + multiplayer always pass `sub='result'`.

**Validation:** all 3 sub-paths play correctly in campaign. Casual shows result card immediately. "Play Again" button still navigates to `/warband` (per Sprint E behavior).

**Estimated:** 1h

---

### G8 — Extract `VsScreenPhase` and `PokerCombatPhase`

**Files:** `flow/phases/VsScreenPhase.tsx`, `flow/phases/PokerCombatPhase.tsx`, `RagnarokChessGame.tsx`

- VsScreen: receives `attacker`, `defender`, `onTimeout`. Pure presentation + timer.
- PokerCombat: receives `handoff: CombatHandoff`, `onResolved: (resolution) => void`. Internally uses `usePokerCombatAdapter`.
- The handoff data structure must include EVERYTHING poker needs: pet data for both pieces, swap flag, first-strike target, etc. Build it in the chess phase before dispatching `COMBAT_TRIGGERED`.

**Validation:** combat triggers cleanly, VS shows for 3.2s, poker plays out, resolution returns to chess with correct HP/death applied. Test instant kills, mulligan, side-swap.

**Estimated:** 1h

---

### G9 — Extract `ChessPhase` + final coordinator cleanup

**Files:** `flow/phases/ChessPhase.tsx`, `RagnarokChessGame.tsx`

- ChessPhase: receives `army`, `onCombat(attacker, defender)`, renders board + HUD.
- All chess-specific effects (AI turn trigger, valid-moves checker, stamina increments) move INTO `ChessPhase`.
- `RagnarokChessGame.tsx` final form: switch over `state.phase` returning the right phase component. ~120 lines.
- Delete dead code: `army_selection` rendering, unused imports, unused refs.
- Run `npm run lint -- --fix` and `npx tsc --noEmit` to ensure zero new warnings.

**Validation:**

- Full smoke test on each entry route:
  - Casual: `/warband` → pick → play → game over → "Play Again" → `/warband`
  - Campaign: `/campaign` → mission → cinematic → intro → play → game over (with bridge if applicable) → return to map
  - Multiplayer: matchmaking → VS → play → game over

**Estimated:** 1h

---

## 7. What NOT to touch (Golden Rule of Restraint)

- `useUnifiedCombatStore` core API — only ADD fields (`pokerSlotsSwapped`, `turnCount` migration). Do not refactor existing methods.
- `useChessCombatAdapter`, `usePokerCombatAdapter` — leave intact. They are the boundary the phases consume.
- `useWarbandStore` — sealed; do not modify.
- `ArmySelection.tsx`, `WarbandPage.tsx` — sealed; do not modify.
- `MultiplayerGame.tsx` — only update if it imports `RagnarokChessGame` and the prop contract changed (it shouldn't).
- The 14 routes other than `/game`, `/warband`, `/campaign`, `/multiplayer` — irrelevant to this refactor.

---

## 8. Risks & mitigations

| Risk                                      | Likelihood | Mitigation                                                                                    |
| ----------------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Chess↔poker handoff breaks                | medium     | G8 has dedicated validation; `CombatHandoff` type built upfront in G1                         |
| Effects timing changes (AI turns, sounds) | medium     | All effects move into `useGameFlow` hook in G2 — single ownership                             |
| Campaign reset path breaks                | low        | G3 migrates campaign state explicitly; `army_selection` transient hack removed entirely in G9 |
| Lazy loading causes flash                 | low        | `<Suspense>` at coordinator level with skeleton or background                                 |
| Bundle splitting breaks production build  | low        | Existing project already lazy-loads pages; same pattern                                       |

---

## 9. Naming conventions established (do not deviate)

| Concept               | Name                            | Reason                                        |
| --------------------- | ------------------------------- | --------------------------------------------- |
| Picker route          | `/warband`                      | On-theme with "Muster the Warband" UI text    |
| Picker page component | `WarbandPage`                   | Matches route                                 |
| Picker store          | `useWarbandStore`               | Matches route + page                          |
| Picker action         | `setWarband(army, deckCardIds)` | Matches store name                            |
| Internal data type    | `ArmySelection`                 | DO NOT rename — 93 references in chess engine |
| Picker UI component   | `ArmySelection.tsx`             | Internal component name; DO NOT rename        |
| FSM types             | `GameFlowState`, `FlowEvent`    | Camel case discriminated unions               |
| FSM store             | `useGameFlowStore`              | Consistent with project Zustand naming        |

---

## 10. Pre-flight checklist (run before starting next session)

```bash
cd /root/projects/norse-mythos-card-game

# 1. Confirm warband refactor is in place
ls client/src/lib/stores/useWarbandStore.ts          # should exist
ls client/src/game/components/warband/WarbandPage.tsx # should exist
grep -q "warband: '/warband'" client/src/lib/routes.ts && echo OK

# 2. Confirm tests pass
npx vitest run client/src/lib/stores/useWarbandStore.test.ts

# 3. Confirm typecheck clean for warband files
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "useWarbandStore|WarbandPage" | head

# 4. Smoke test: dev server boots
npm run dev   # then visit /#/warband and verify picker renders
```

If any of those fail, **stop**. Sprints A–F + I.1 are not in the expected state. Read git log and reconcile before starting G1.

---

## 11. Definition of Done

- `RagnarokChessGame.tsx` ≤ 150 lines.
- All phases live in `flow/phases/*.tsx`, one file each.
- `useGameFlowStore` is the single source of truth for `phase`.
- `flow/transitions.ts` covered by unit tests (every valid transition + invalid rejection).
- Three smoke tests pass: casual, campaign (with cinematic + bridge), multiplayer.
- `npx tsc --noEmit` reports zero new errors.
- `npm run lint` reports zero new warnings.
- Bundle analysis: `/warband` and `/multiplayer` routes do not pull `CinematicCrawl` / campaign code.

---

## 12. After this refactor lands (future considerations, not in scope)

- **H** — `clearWarband()` on logout / account switch
- **I.2** — Audit overlapping UI at tablet (768px) and mobile (375px) breakpoints
- **F-extended** — Promote `/warband` to a Primary Route on `HomePage` (production CTA, not just dev link)
- **Layout primitives** — `AppShell`, `Stack`, `Cluster`, `Container`, `Section` if more responsive bugs surface

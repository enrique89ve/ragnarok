# Auditoria de autoridad de animaciones gameplay

Base: `docs/GAMEPLAY_ANIMATION_AUTHORITY_PLAN.md` contra el workspace actual.

Estado de lectura: `found` significa que el bug/riesgo sigue visible en el codigo; `fixed` solo se usa si el workspace ya muestra la correccion completa.

| Etapa | Bug / riesgo observado | Severidad | Confianza | Evidencia | Acceptance check esperado | Estado |
|---|---|---:|---|---|---|---|
| AI attack | La resolucion de dano de AI estaba dentro de un componente React y callbacks visuales. Si el timeline GSAP se mataba antes del impacto, el callback que aplicaba dano podia no ejecutarse. | P0 | HIGH | `client/src/game/combat/aiAttackResolution.ts:83` define `resolveAIAttackEvent`; `client/src/game/combat/aiAttackResolution.ts:104` emite impacto desde el resolver; `client/src/game/combat/aiAttackResolution.ts:120` aplica dano; `client/src/game/components/AIAttackAnimationProcessor.tsx:103` resuelve al iniciar el evento; `client/src/game/components/AIAttackAnimationProcessor.tsx:119` y `client/src/game/components/AIAttackAnimationProcessor.tsx:150` solo actualizan fase visual. | `rg -n "applyDamageToState\|setGameState" client/src/game/components/AIAttackAnimationProcessor.tsx` no devuelve mutaciones; `pnpm exec vitest run client/src/game/combat/aiAttackResolution.test.ts` pasa. | fixed |
| Chess attack | La mecanica de ataque esperaba la finalizacion visual. `completeAttackAnimation` ejecutaba instant-kill, minas y arranque de combate. | P0 | HIGH | `client/src/game/stores/combat/chessCombatSlice.ts:51` define `resolveChessAttackIntent`; `client/src/game/stores/combat/chessAnimationSlice.ts:57` delega mecanica al iniciar el marcador; `client/src/game/stores/combat/chessCombatSlice.ts:686` deja `completeAttackAnimation` como limpieza; `client/src/game/components/chess/useChessBoardInteractions.ts:166` solo limpia marcador. | `pnpm exec vitest run client/src/game/stores/combat/chessAnimationSlice.test.ts client/src/game/coordinator/hooks/chessAITurnDriver.test.ts` pasa; los tests prueban resolucion antes de cleanup visual. | fixed |
| Arena VFX selectors | Los targets VFX estaban atados a clases CSS y fallback por `class*`, sin contrato central `data-vfx-*`. | P2 | HIGH | `client/src/game/combat/arenaVfxTargets.ts:1` define atributos/targets; `client/src/game/combat/animations/PokerDramaVFX.ts:18` importa helpers; `client/src/game/services/CombatEventSubscribers.ts:15` consume helpers; `client/src/game/combat/zones/BoardZone.tsx:52` expone slots por `data-vfx-*`. | `rg -n "querySelector(All)?\\(['\\\"]\\.\|\\[class\\*=" client/src/game/combat/animations/PokerDramaVFX.ts client/src/game/services/CombatEventSubscribers.ts` no devuelve matches. | fixed |
| CardDragAnimation | `CardDragAnimation` estaba huerfano pero conservaba validacion de drop por geometria/clases DOM y calculo de `insertionIndex`. | P2 | MEDIUM | `client/src/game/components/CardDragAnimation.tsx` fue eliminado; `client/src/game/hooks/useCardDragAnimation.ts` fue eliminado; el scan de codigo vivo no encuentra `CardDragAnimation`, `useCardDragAnimation`, `.bf-slot`, `.player-row`, ni `.simple-battlefield`. | `rg -n "CardDragAnimation\|useCardDragAnimation\|\\.bf-slot\|\\.player-row\|\\.simple-battlefield" client/src/game --glob '!*.css'` no devuelve matches. | fixed |
| GAME_FLOW docs | La documentacion principal ensenaba un flujo animation-first: la animacion completa y luego se actualiza estado. | P2 | HIGH | `docs/GAME_FLOW.md:400` documenta `Gameplay Animation Authority`; `docs/GAME_FLOW.md:407` inicia el flujo con comando; `docs/GAME_FLOW.md:408` exige mutacion canonica antes de animacion; `docs/GAME_FLOW.md:414` dice que una animacion cancelada no puede perder estado; `docs/POKER_ARENA_UI.md:77` documenta contrato `data-vfx-*`. | `docs/GAME_FLOW.md` documenta comando -> store/protocolo -> evento/marcador visual -> subscriber/adaptador -> cleanup visual; `docs/POKER_ARENA_UI.md` referencia `arenaVfxTargets.ts`. | fixed |

## Checks usados

- `rg` para buscar mutaciones, callbacks, selectors DOM y referencias de drag.
- Lectura con lineas actuales de `AIAttackAnimationProcessor.tsx`, slices de chess, VFX, drag y docs.
- Tests enfocados de AI attack y chess attack durante la integracion.

## Bloqueadores

Ninguno para esta auditoria. Hay cambios ajenos en el worktree; las etapas de autoridad de animacion quedan marcadas como fixed en el workspace actual.

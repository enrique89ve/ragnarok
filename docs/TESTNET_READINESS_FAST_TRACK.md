# Testnet Readiness Fast Track - 2026-08-20

## Proposito

Esta es la fuente activa para cerrar lo que falta entre el estado actual y una
Alfa Testnet jugable por personas reales, con el menor camino posible hacia
Closed Testnet Beta.

Este documento reemplaza el rol de "plan vivo" que antes tenian documentos de
QA Season 0 o beta. Esos documentos siguen siendo referencia historica o
detalle por dominio, pero este archivo decide el orden actual.

Actualizacion 2026-08-19: Alfa Player-Ready ya no es solo hosting + P2P. Un
tester tiene que completar **practica**, **una mision de campana** y **P2P**
con la misma spine chess↔poker→`game_over`, daily quest claimable, poker
legible, y una sola fuente de verdad por dominio. No es un cemetery de
archivos sueltos ni las 49 misiones.

Actualizacion 2026-08-20: se reconcilio el tablero de gates con el codigo y
los smokes locales. Practica, funnel CTA, daily claim local, match-end unico
y docs de Standard Match ya no bloquean. Siguen abiertos: first-clear de
norse-1, `getCardById` unico, pass visual de arena, runtime del host, Hive
Keychain, P2P dos browsers, y el re-run de ticket security.

## Verdad actual

- Fase actual: **Alfa Testnet con mecanicas full NFT**.
- Runtime esperado: `RAGNAROK_RUNTIME_MODE=alfa-testnet`.
- Stage de red: `VITE_NETWORK_STAGE=testnet`.
- Protocolo: `VITE_RAGNAROK_PROTOCOL_ID=rk_game_testnet`.
- Reset epoch: `VITE_RAGNAROK_RESET_EPOCH=alfa-testnet-*`.
- Ownership actual de Alfa: JSON-backed provenance. NFTLoX no bloquea Alfa.
- Alfa no es Closed Beta, Public Testnet, Genesis ni Mainnet.

La meta inmediata no es reabrir todo el protocolo. La meta es que el juego sea
comprensible, jugable y verificable en testnet real.

**Terminar Ragnarok ahora** significa llegar a **Alfa Player-Ready**, no a
mainnet ni a settlement ranked. El nucleo jugable es la
**Playable Match Spine** (`CONTEXT.md`): practica, una mision Norse y P2P
corren el mismo loop. P2P anade checkpoints sobre ese loop:

```text
practica | campana | matchmaking + seed
        |
        v
     chess
     /    \
instant    chess_combat_initiated
 kill              |
chess_attack       v
 stays        Phase Checkpoint (P2P only)
 on chess   chess -> poker_combat
                   |
                   v
            poker_action loop
                   |
                   v
            Phase Checkpoint (P2P only)
          poker_combat -> chess
                   |
                   v
            chess continues
                   |
                   v
            game_over  (P2P: Phase Checkpoint * -> game_over)
                   |
                   v
            local result
            campana: first-clear / replay no-op
            P2P: JSON export, no Keychain, no Hive op
            daily quest Claim en home
```

La decision normativa es
[`ADR 0007`](./adr/0007-p2p-gameplay-only-testnet.md): esta fase prueba partidas
P2P completas y fluidas. El relay arbitra solamente checkpoints deterministas
de cambio de fase. No hay firma ni broadcast de `match_result`, settlement P2P
de RUNE/ELO/Season Score/CardXP, ni prompts de Keychain causados por la partida.
El resultado terminal es evidencia local.

## Definicion de listo

### Loop de tester (producto)

```text
Home
  -> Starter claim (si aplica)
  -> Warband (loadout 30 cartas)
  -> uno de:
        Practica  /#/warband?mode=single -> /#/game/single
        Campana   /#/campaign -> 1 mision Norse -> /#/game/campaign
        P2P       /#/warband?mode=multiplayer -> /#/multiplayer
  -> chess
  -> captura instantanea se queda en chess
  -> captura no-instantanea -> poker -> vuelta a chess
  -> game_over visible
  -> daily quest Claim en home (si completo)
```

Los tres modos usan el mismo coordinador (`RagnarokGameCoordinator`) y la
misma spine. Practica no paga economia. Campana Alfa = **una mision Norse
end-to-end**, no 49 misiones. Daily quests de tester (`DailyQuestPanel`) no
son las card-quests in-match (`questStore`).

### Alfa Testnet player-ready

Alfa esta lista para mas manos internas cuando todo esto sea verdad:

1. El deploy real prueba `/api/health`, `/api/admin/config` y
   `/api/admin/p2p/status` con `runtimePhase=alfa-testnet`,
   `qaFullCatalogEnabled=false`, estado JSON y secreto P2P estable.
2. El tablero de poker se entiende sin explicacion externa: fase, turno,
   cartas, apuesta/riesgo, accion disponible, conexion P2P y resultado.
   Home / warband / briefing de campana / game-over tienen una CTA primaria.
3. Un smoke humano con Hive Keychain valida login previo, session reuse y dos
   perfiles reales. Desde matchmaking hasta el resultado no aparece ningun
   prompt de wallet.
4. Practica y campana (1 mision Norse) completan el script de spine local:
   quiet move, instant kill, captura a poker, resolucion, retorno a chess,
   `game_over`. El backup timer de showdown (9s) no dispara en el camino feliz.
5. El P2P de dos browsers cubre el mismo script mas checkpoints
   `chess ↔ poker_combat`, checkpoint terminal, reconnect corto, reload local
   snapshot + rejoin, resultado local y export JSON sin operacion Hive.
6. Daily quest: progreso de partida + Claim explicito en home; duplicate
   claim es no-op. Campana first-clear persiste; replay no paga RUNE extra.
7. Dualidades P0 de migracion estan congeladas: un owner de fin de partida,
   un lookup de carta, docs que no anuncian el modo muerto "Standard Match".
8. `pnpm run check`, `pnpm run lint:css`, el runner de seguridad P2P y el build
   Alfa pasan en el arbol que se va a desplegar.

### Closed Testnet Beta

Closed Beta no se abre hasta que, ademas de lo anterior:

1. Exista prueba de coleccion/schema NFTLoX testnet para Ragnarok.
2. Se rote a `closed-beta-*`.
3. `qaFullCatalogEnabled=false`.
4. `closedBetaCutover.inviteBlocked=false` solo despues de estas evidencias:
   `RAGNAROK_NFTLOX_COLLECTION_PROOF`,
   `RAGNAROK_HIVE_KEYCHAIN_SMOKE`,
   `RAGNAROK_P2P_TWO_BROWSER_SMOKE`,
   `RAGNAROK_CLOSED_BETA_OPERATOR_SIGNOFF`.
5. P2P ranked RUNE, ELO oficial, Season Score y CardXP siguen apagados. El
   winner-arbiter y `match_result` pertenecen a una fase futura y no bloquean
   la validacion de jugabilidad actual.

## Orden mas corto

El trabajo paralelo que no acorta Alfa Player-Ready (ranked settlement,
transcript Merkle entre peers, action-log replay, mines P2P, CSP de
produccion, auditoria de catalogo, cemetery de CSS/VFX, las 49 misiones)
se deja fuera hasta que practica, 1 mision y el smoke de dos browsers
pasen. Cards OPEN-8 (handshake + apply simetrico) ya cerro; no reabrir
como host-auth.

```text
0. Estabilizar WIP del working tree
        |
        v
1. Spine de partida (practica + campana + P2P)
   chess <-> poker <-> game_over  SIEMPRE termina
        |
        +-- 2. UX poker + funnel tester (paralelo una vez 1 no se cuelga)
        |
        v
3. Ceremonias minimas: starter, 1 mision campana, daily claim
        |
        v
4. Congelar dualidades P0 (fin de partida, getCardById, docs mentirosos)
        |
        v
5. Runtime Alfa + smoke humano dos browsers
        |
        v
6. P1: muertos evidentes, CSS dedupe, Closed Beta cutover
```

Chequeo 2026-08-20 (codigo + smokes de agent-browser; no sustituye Keychain
humano ni health del deploy real).

| Orden | Gate | Estado actual | Cierre minimo |
|---|---|---|---|
| 0 | WIP del arbol | Queda chrome poker | Diff actual: `HoleCardsOverlay.tsx`, `hero-card.css`, `CardFrame.css`. Spine/resume/labels ya en `main`. No empilar trabajo nuevo fuera de arena. |
| 1 | Spine practica / campana / P2P | Practica local cerrada | Practica: chess → poker writeback → Leave Match → `game_over` (2026-08-19). Campana: norse-1 entra, abandon ya no muestra victoria. Falta **ganar** norse-1 (first-clear) y el smoke P2P de dos browsers. |
| 2 | Poker board + funnel | Funnel cerrado; arena en curso | Labels Bet/Call/Raise/Fold/All in + HP. Home: CTA starter/campana; PvP copy gameplay-only. Warband: Launch Battle / Find Opponent. Game-over: Play Again / Continue the Saga / Return Home. Falta el pass visual 1366/1920/ultrawide/mobile landscape. |
| 3 | Runtime Alfa desplegable | Abierto P0 operador | Scripts `build:alfa-testnet` / `start:alfa-testnet` y Dokploy docs existen. Falta probar health/admin/p2p status, headers y cache en el host real. |
| 4 | Hive session | Abierto P0 humano | Login real con Keychain antes de matchmaking; cero prompts causados por la partida. Claim de daily quest es el unico prompt post-partida. |
| 5 | Campana 1 mision + daily quest | Daily local cerrado | Claim diario local: `claimed` / `already_claimed` sin RUNE. norse-1 entra. Falta first-clear ganado y Claim Hive testnet. |
| 6 | Dualidades P0 | Casi cerrado | Fin de partida unico (`matchEndController` cableado). Docs: Standard Match historico. OPEN-8 cerrado. **Sigue abierto:** dos `getCardById` (`allCards.ts` y `cardManagement/cardRegistry.ts`). Showdown 9s queda como red de seguridad aceptada. |
| 7 | P2P smoke dos browsers | Abierto P0 humano | Codigo de snapshot local + rejoin existe (`P2P_MATCH_RESUME.md`). Falta evidencia de dos perfiles: spine + checkpoints + reconnect + reload + export, cero Keychain de partida. |
| 8 | Seguridad P2P enfocada | Necesita re-run | `bash scripts/p2p-ticket-security-check.sh` en el arbol que se va a desplegar. |
| 9 | Closed Beta cutover | Bloqueado | NFTLoX proof, epoch `closed-beta-*`, env evidence y operator sign-off. No es gate de Alfa Player-Ready. |

## Fuentes de verdad

Cuando docs y codigo divergen, **codigo gana** y el doc se reconcilia en el
mismo cambio.

| Dominio | Canon | No es canon |
|---|---|---|
| Schemas (rarity, set, starter) | `shared/schemas/` | `metadata.json`, strings sueltos |
| Definiciones de carta | `client/src/game/data/cardRegistry/` | `allCards.ts` (compat), `cardManagement/cardRegistry.ts` (map paralelo) |
| Reglas de juego | chess en `shared/protocol-core/chess` + poker combat + `docs/RULEBOOK.md` | `GAME_FLOW.md` (historico) |
| Campana progreso | `campaign_result` en protocol-core + `campaignProgress` | solo `campaignStore.completedMissions` |
| Daily quest RUNE | `applyDailyQuestClaim` en protocol-core | `questStore` (card-quests in-match) |
| Match context | `MatchSetupSingle` / `MatchSetupCampaign` / `MatchSetupP2P` | `legacyBridge.ts` (hook nunca montado) |
| Coordinador | `RagnarokGameCoordinator` | `GameBoard.tsx`, `SimpleGame.tsx` |
| Poker UI | `RagnarokCombatArena` + `docs/POKER_ARENA_UI.md` + `DESIGN.md` | layouts `vw/vh` paralelos, Standard Match |
| Card chrome | `docs/CARD_SURFACE_RENDER.md` + `cardPresentationContract.ts` | `EnhancedCard` |
| P2P | `docs/PVP_WIRE_PROTOCOL.md` + ADR 0005/0007 | host `gameState` dumps (OPEN-8 cerrado) |
| Plan vivo | este archivo | `.scratch/*`, `TESTNET_WEEK_ONE_SPEC.md`, `ALFA_TESTNET_DELIVERY_PLAN.md` |
| XP / RUNE preview | `shared/protocol-core/xpEconomy.ts` | formulas en UI |

**Quest no es uno.** Daily quests (`dailyQuestStore` + `DailyQuestPanel`) son
el loop de tester Alfa. Card quests (`questStore` + `QuestTracker`) son
mecanica de carta in-match. No reabrir el segundo para testnet.

## Dualidades P0 (congelar) vs P1 (etiquetar)

P0, dos verdades que causan bugs o mentiras:

1. Fin de partida: **cerrado 2026-08-19.** Chess terminal, hero HP=0 y Leave
   Match pasan por `createMatchEndController`. No hay segundo pipeline inline.
2. Showdown que no llama `onCombatEnd`: **aceptado.** `ShowdownCelebration`
   garantiza `onComplete` en ≤8s. El timer de 9s en
   `useRagnarokCombatController` es red de seguridad, no el camino feliz.
3. Lookup de cartas: **sigue abierto.** Canon de definiciones =
   `client/src/game/data/cardRegistry/`. Hay dos helpers `getCardById`:
   `allCards.ts` (compat Map) y `cardManagement/cardRegistry.ts` (Map paralelo
   usado por effect handlers). Un helper. No fusionar archivos en Alfa.
4. Docs: **cerrado.** Standard Match / `GameBoard` no es un modo Alfa.
   RULEBOOK y GAME_FLOW lo marcan historico.
5. `P2P_SECURITY_HARDENING.md` es historico; OPEN-8 esta cerrado.

P1, muertos evidentes. Borrar **despues** del smoke, con grep + smoke visual:

- `GameBoard.tsx` + `GameBoardHandlers.tsx`
- `components/minimal/SimpleGame.tsx` + `SimpleGameLayout.tsx`
- `legacyBridge.ts` / `legacySynth.ts`
- Dedupe de ~62 CSS poker (`docs/POKER_CSS_REFERENCE.md`)
- `.scratch/*` PRDs (no borrar, no seguir)
- Ranked settlement, OPEN-1/2 transcript, OPEN-9 mines

## Script de spine (practica y campana)

El smoke P2P de mas abajo es el mismo script mas checkpoints. En SP:

1. Quiet move en chess.
2. Instant kill (`chess_attack`) se queda en chess.
3. Captura no-instantanea entra a poker (`pendingCombat` → vs_screen →
   `poker_combat`).
4. Poker resuelve; HP/stamina vuelven a las mismas piezas.
5. Chess continua.
6. `game_over` visible (rey, material, o hero HP=0).
7. Leave Match no deja stores sucios.

Archivos primarios de la spine:

- `client/src/game/coordinator/RagnarokGameCoordinator.tsx`
- `client/src/game/coordinator/matchEndController.ts`
- `client/src/game/coordinator/gameCoordinatorRules.ts`
- `client/src/game/p2p/p2pResumePokerHandoff.ts`
- `client/src/game/p2p/phaseCheckpointClient.ts`
- `client/src/game/combat/hooks/useRagnarokCombatController.ts`
- `client/src/game/match/modes/{single,campaign,p2p}/`

## Sprint P0 - tablero de poker y funnel

La mejora visual no debe ser cosmetica aislada. Debe responder a una pregunta:
si alguien llega al primer combate, puede jugar sin preguntarnos que mirar o que
boton tocar?

Fuera del tablero, la misma pregunta con menos profundidad: home tiene una
CTA primaria; warband bloquea o lanza; briefing de campana lanza la mision
siguiente; game-over dice el resultado y el siguiente paso.

### Resultado que debe ver el jugador

- Quien actua ahora.
- En que fase esta la mano: Mulligan, Spellcraft, First Blood, Faith,
  Foresight, Destiny, Showdown.
- Cuales son sus cartas, cuales son cartas comunitarias y cuales son del rival.
- Cuantos HP estan en riesgo, cuanto debe pagar, si puede check/call/raise/fold.
- Si esta esperando al otro peer, reconectando, en error o listo.
- Que gano/perdio al terminar el poker y que ocurre al volver al tablero chess.

### Cambios P0 recomendados

1. **Jerarquia visual**
   - `zone-board` debe dominar la lectura central.
   - Hero propio, hero rival, hole cards, community cards y riesgo deben tener
     una lectura de 3 segundos.
   - El resultado de showdown debe explicar ganador, mano ganadora y delta de HP.

2. **Acciones de poker**
   - Mantener iconos, pero no depender solo del icono. Los botones necesitan
     `aria-label`, `title` y contexto visible cercano: `Bet`, `Call`, `Check`,
     `Raise`, `Fold`, `All in`.
   - La cantidad efectiva de HP debe verse cerca del control, no solo dentro del
     tooltip.
   - Los estados disabled deben explicar si falta turno, HP, call pendiente o
     conexion P2P.

3. **Paneles y duplicados**
   - Elegir un solo owner visible para pot/risk. Si `GameHUD` ya muestra pot,
     `PotDisplay` no debe competir salvo que tenga una funcion distinta.
   - Constrain de altura para `WagerInfoPanel`/`CombatPhaseDirector`; el cambio
     de fase no debe mover la escena.
   - Resolver `.mulligan-notice`: o toast absoluto, o eliminar si el modal ya
     cubre ese rol.

4. **Geometria**
   - Mantener `GameViewport` como unico escalador.
   - Mover ajustes anonimos a tokens en `client/src/game/combat/layout/board.css`.
   - No meter `vw`/`vh` nuevos dentro de gameplay zones.
   - Validar 1366x768, 1920x1080, ultrawide y mobile landscape.

5. **P2P legible**
   - `PokerP2PTurnStatus` debe estar visible durante poker.
   - Reconnect/grace/error debe bloquear inputs locales y decir por que.
   - El export JSON debe ser obvio cuando un smoke falla.

### Archivos primarios

- `client/src/game/combat/RagnarokCombatArena.tsx`
- `client/src/game/combat/layout/board.css`
- `client/src/game/combat/components/BettingPanel.tsx`
- `client/src/game/combat/components/WagerInfoPanel.tsx`
- `client/src/game/combat/components/PokerP2PTurnStatus.tsx`
- `client/src/game/combat/styles/poker-betting.css`
- `client/src/game/combat/styles/game-hud.css`
- `client/src/game/combat/styles/poker-showdown.css`
- `docs/POKER_ARENA_UI.md`
- `docs/POKER_ARENA_DOM_TREE.md`

## Sprint P0 - runtime y conexion

### Build/start Alfa

```bash
pnpm run build:alfa-testnet
pnpm run start:alfa-testnet
```

### Runtime evidence

```bash
curl https://your-domain.example/api/health
curl https://your-domain.example/api/admin/config
curl https://your-domain.example/api/admin/p2p/status
```

Debe probar:

- `runtime.stage="testnet"`.
- `runtime.runtimePhase="alfa-testnet"`.
- `runtime.resetEpoch` empieza por `alfa-testnet-`.
- `runtime.qaFullCatalogEnabled=false`.
- `runtime.resettable=true`.
- `runtime.economic=false`.
- `runtime.state.persistence="json-file"`.
- P2P challenge/ticket signing `source="env"` y `ready=true`.

### Seguridad P2P enfocada

```bash
bash scripts/p2p-ticket-security-check.sh
```

Este runner no prueba gameplay humano. Solo cierra el borde de ticket, Origin,
subprotocol, logs, memoria privada y adapter de poker sin `globalThis`.

### Smoke humano P2P

No marcar como pasado sin dos perfiles reales con Hive Keychain.

Flujo minimo:

1. Browser A y Browser B tienen identidades Hive testnet distintas.
2. Ambos completan cualquier login requerido antes de matchmaking y llegan al
   lobby sin pedir firma repetida por solo cambiar de ruta.
3. Matchmaking crea sala y ambos reciben solo su propio `P2PMatchTicket`.
4. Chess quiet move de cada lado.
5. Captura instantanea.
6. Captura no instantanea entra a poker.
7. Ambos peers obtienen commit del checkpoint `chess → poker_combat`; poker
   resuelve y solo vuelve a chess tras el commit `poker_combat → chess`.
8. Reconnect corto conserva estado o exporta blocker con reject code.
9. Reload duro avisa, restaura el snapshot local sellado y reintenta la sala
   (2 intentos / 60s). Si el snapshot falta o el sello no cuadra, el tester
   vuelve al lobby; no hay tablero servido por Express.
10. `game_over` ocurre solo tras el checkpoint terminal; se muestra el resultado
    local y no aparece Keychain ni una operacion Hive.
11. Export JSON incluye match/session id, roles, reset epoch, reject code si
    existe, hashes, checkpoints y resultado local.

## P1 despues de Alfa player-ready

- Borrar `GameBoard`, `SimpleGame`, `legacyBridge` despues de grep + smoke.
- Hash coverage de snapshots de poker y transcript replay compacto.
- Replay determinista del `action-log` firmado (ranked). El snapshot local
  de hard reload ya esta en [`P2P_MATCH_RESUME.md`](./P2P_MATCH_RESUME.md).
- Dedupe de CSS/Tailwind pendiente en poker.
- CSP explicita para assets, Hive APIs, WebSocket y fuentes.
- Auditoria de vulnerabilidades de produccion antes de abrir testers externos.
- Resto de capitulos de campana (el gate Alfa ya cerro con 1 mision Norse).

## No hacer ahora

- No llamar Alfa "beta lista".
- No abrir Public Testnet.
- No activar P2P ranked RUNE, ELO oficial o Season Score.
- No firmar/broadcast `match_anchor` o `match_result` ni pedir Keychain durante,
  al reconectar o al terminar una partida P2P. Daily quest Claim es el unico
  prompt de wallet post-partida.
- No convertir NFTLoX en requisito de Alfa.
- No usar Vercel/static para una prueba con `/api/*` y `/ws/p2p`.
- No resolver visuales creando un segundo tablero paralelo.
- No auditar el catalogo de 2400 cartas ni completar las 49 misiones.
- No crear un cuarto roadmap (`docs/ALFA_ROADMAP.md`, scratch PRDs).
- No implementar "Standard Match" (`GameBoard`). El modo no existe en Alfa.
- No fusionar 62 CSS ni 190 effect handlers "porque hay archivos sueltos".
- No cablear ranked settlement / winner arbiter "por si acaso". Canon en
  ADR 0008; Alfa sigue ADR 0007 (sin `match_result`).

## Estado de documentos

Activos:

- `docs/TESTNET_READINESS_FAST_TRACK.md` - este archivo, plan vivo.
- `CONTEXT.md` - vocabulario de release (Alfa Player-Ready, spine, epochs).
- `DESIGN.md` - direccion visual y reglas UI.
- `docs/RULEBOOK.md` - mecanicas; codigo gana si diverge.
- `docs/CARD_SURFACE_RENDER.md` - chrome de carta por stage.
- `docs/DOKPLOY_DEPLOYMENT.md` - deploy Alfa/Dokploy.
- `docs/TESTNET_RUNBOOK.md` - comandos y smokes manuales.
- `docs/PVP_WIRE_PROTOCOL.md` - contrato P2P.
- `docs/adr/0007-p2p-gameplay-only-testnet.md` - alcance normativo de esta fase.
- `docs/adr/0008-winner-posted-match-result.md` - canon de ranked futuro (ganador publica, replay valida). No es gate de Alfa.
- `docs/P2P_TICKET_SECURITY_VALIDATION.md` - validacion enfocada de ticket.
- `docs/P2P_MATCH_RESUME.md` - snapshot local de hard reload.
- `docs/POKER_ARENA_UI.md` - canon tecnico del poker arena.
- `docs/POKER_ARENA_DOM_TREE.md` - mapa DOM/posicion.

Historicos o de referencia:

- `docs/BETA_TESTNET_SCOPE.md` - scope historico y economia, no plan activo.
- `docs/TESTNET_WEEK_ONE_SPEC.md` - QA Season 0, no Alfa actual.
- `docs/GAME_FLOW.md` - flujo antiguo; no planificar contra el.
- `docs/P2P_SECURITY_HARDENING.md` - invariantes absorbidos; OPEN-8 cerrado.
- `.scratch/practice-production-profile/ALFA_TESTNET_DELIVERY_PLAN.md` -
  no seguir (mezcla Practice como runtime stage, rechazado).

## Evidencia minima para cerrar este documento

Antes de decir "listo para testers", adjuntar o registrar:

- salida de `pnpm run check`;
- salida de `pnpm run lint:css`;
- salida de `bash scripts/p2p-ticket-security-check.sh`;
- salida de `pnpm run build:alfa-testnet`;
- `/api/health`, `/api/admin/config`, `/api/admin/p2p/status`;
- session log JSON del smoke humano P2P;
- capturas o reporte visual del tablero poker en los viewports objetivo;
- practica: evidencia del script chess↔poker→`game_over`;
- campana: 1 mision Norse, evidence JSON (account, epoch, mission,
  first-clear o replay-no-op);
- daily quest: un Claim con feedback `claimed` o `already_claimed`;
- confirmacion de que el backup timer de showdown no disparo en esos caminos;
- dualidades P0 cerradas o explicitamente aceptadas.

# Testnet Readiness Fast Track - 2026-09-01

## Proposito

**Canonical phase note:** this plan now targets F1 `local-gameplay-v1`. Daily,
campaign and P2P local RUNE are real idempotent IndexedDB ledger projections;
local ELO, SeasonScore, CardXP and level-ups are also persisted. No wallet
Claim, Hive `custom_json`, outbox or canonical settlement is an F1 gate.

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

Actualizacion 2026-08-31: el runtime del host, headers/cache, build Alfa,
seguridad P2P, lookup canonico, persistencia local y los gates de capacidades
ya tienen evidencia. El relay automatizado conserva identidad ante cambio de
IP/VPN y el cliente bloquea acciones durante reconnect o cuarentena. `dev/local`
permite Single sin login para QA por browser o LLM; la Alfa compartida conserva
identidad. Siguen abiertos la victoria humana de norse-1, el smoke P2P con dos
cuentas/Keychain reales, desplegar este arbol y el sign-off del operador.

Actualizacion 2026-09-01: la suite completa se repitio sobre el arbol actual
(309 archivos, 2.206 tests), junto con build Alfa, stylelint, determinismo WASM
y la matriz de seguridad P2P; todos pasan. El ADR de transporte se reconcilio
con el compromiso bilateral `transport_committed_v1` y la recuperacion relay
pre-commit. Los adaptadores tambien descartan frames de gameplay entrantes antes
del compromiso, evitando que una cola de transporte los aplique tarde. El host
sigue con `inviteBlocked=true`, por lo que el deploy y los gates humanos
continuan siendo requisitos separados.

Actualizacion 2026-10-16: la arquitectura de fase ya esta cerrada. El orden
vigente es la hoja de ruta de abajo. El diagrama de septiembre queda como
historial: la spine, las dualidades P0 y la seguridad de tickets ya no son el
trabajo siguiente.

Actualizacion 2026-11-24 (auditoria conjunta sobre `main` `8143d7d0`): desde el
corte de octubre cerraron en codigo el modal PWA de nueva version (`version.json`),
Fases 0-3 de `DATA_PERSISTENCE_AND_CACHE_PLAN.md` (`engine.wasm` versionado,
anti-drift de JSON estaticos, `starterClaimRegistry` atomico por epoch,
`idbLifecycle` + validacion en `replayDB`, liquidaciones atomicas, eliminacion de
proyecciones duplicadas en `HiveDataLayer`, `saveStateManager` con Zod/checksum,
flush async de 30s en `chainState` y paridad de `pgStateAdapter`), backpressure
simetrico en relay P2P, VFX de arena, CSP de produccion via Helmet
(`server/index.ts`), y el cambio de campana a solo RUNE mas el piloto local de
Eitr en `norse-9`. Validacion local al corte: `pnpm run check` verde,
`pnpm run lint:css` 0 warnings, `bash scripts/p2p-ticket-security-check.sh`
26/26 suites (235/235 tests). Siguen pendientes los gates operativos de Alfa y
se registran abajo las fricciones/riesgos P1 detectados en auditoria de codigo.

## Hoja de ruta

La autoridad la decide el perfil de `shared/protocolPhase.ts`, no el nombre
del script ni `VITE_NETWORK_STAGE=testnet`. Alfa, QA Season 0 y generic
testnet siguen en F1 `local-gameplay-v1`. Closed Beta es F2
`hive-testnet-v1`. Mainnet es F3 `mainnet-v1`.

```text
1. Front F1 (ahora)
   poker legible + funnel, dentro del tablero unico
        |
        v
2. Cerrar Alfa Player-Ready
   deploy de este arbol + smoke humano + victoria norse-1
        |
        v
3. Closed Beta F2
   epoch closed-beta-* + replay Hive
   market, packs, NFTLox y ranking oficial siguen apagados
        |
        v
4. Ranked (ADR 0008)
   corte explicito; rotar el epoch no lo enciende
        |
        v
5. Mainnet F3
   market, packs, escrituras NFTLox y ranking oficial
```

### 1. Front F1

Es el unico trabajo de producto que acorta Alfa sin abrir otra fase. Tiene
que responder si alguien llega al primer combate y puede jugar sin preguntar
que mirar o que boton tocar.

- Home, warband, briefing de la mision Norse y game over: una CTA primaria.
- Poker, lectura de tres segundos: quien actua, fase de la mano, hole cards,
  comunitarias, HP en riesgo y la accion (`Bet`, `Call`, `Check`, `Raise`,
  `Fold`, `All in`), con el motivo cuando el control esta deshabilitado.
- Un solo dueno visible del pot/riesgo.
- Estado P2P visible durante poker. Reconnect, gracia y error bloquean el
  input local y dicen por que.
- El showdown explica ganador, mano ganadora y delta de HP antes de volver
  a chess.
- Pase visual humano en 1366x768, 1920x1080, ultrawide y un telefono fisico.
  El chrome abierto de este corte vive en `HoleCardsOverlay.tsx`,
  `hero-card.css` y `CardFrame.css`.

El front de este corte obedece estas restricciones:

- Un escalador, `GameViewport` a 1920x1080. Sin `vw`/`vh` nuevos dentro de
  las zonas de combate y sin un tablero vertical paralelo. En telefono,
  portrait pide rotar.
- Un coordinador (`RagnarokGameCoordinator`) y un fin de partida
  (`matchEndController`). Single, la mision Norse y P2P comparten la spine.
- Cartas desde `client/src/game/data/cardRegistry/`.
- Daily quest del home y las card-quests de la partida siguen siendo sistemas
  distintos.
- Single no muestra recompensa. Campana y P2P muestran la proyeccion local
  de IndexedDB. Esa proyeccion no se presenta como saldo Hive, ranking
  oficial ni propiedad NFT.
- Quick Match conserva una sola firma Keychain en `Find` (delegacion Posting);
  `Accept` es confirmacion local (`sessionSig`). La partida, el reconnect y
  `game_over` no abren Keychain.
- Marketplace y packs siguen como superficie deshabilitada. Montar su
  mutacion seria un cambio de fase.

### 2. Cerrar Alfa Player-Ready

La spine, el settlement local, las dualidades P0, la persistencia F0-F3 y la
seguridad de tickets ya tienen evidencia de codigo. Falta evidencia operativa
sobre el arbol actual (`8143d7d0`) y conviene resolver antes de invitar manos
externas las fricciones P1 de claim/P2P listadas en la seccion de auditoria:

1. Desplegar este arbol (`8143d7d0`). `testnetdev.ragnaroknft.quest` sigue con
   el bundle anterior hasta ese deploy. Validar `/api/health`,
   `/api/admin/config`, `/api/admin/p2p/status` y la CSP de Helmet en vivo.
2. Smoke de dos cuentas Hive con Keychain: login, una sola firma Posting en
   `Find` (delegacion) por jugador, `Accept` local (`sessionSig`), checkpoints
   `chess ↔ poker_combat` y `* → game_over`, reconnect corto, resultado local,
   export JSON y cero prompts o `custom_json` despues de `Find`.
3. Victoria jugada de `norse-1` en el navegador. El first-clear local (solo
   RUNE) ya esta cubierto por tests; falta la partida humana.
4. El pase visual del punto 1 en 1366x768, 1920x1080, ultrawide y un telefono
   fisico en landscape.

### 2b. Hallazgos P1 de auditoria (2026-11-24) — Estado de cierre

1. **Flujos de Claim — CERRADO EN CODIGO (2026-11-24):**
   - *Starter claim*: `useStarterStore.reconcileServerClaimStatus` y
     `syncSharedNetworkStarterClaimStatus` / `reconcileSharedNetworkStarterClaimReceipt`
     reconcilian `localStorage` con `GET /api/starter/status/:username` en
     `HomePage` y `useMatchmaking` (auto-registrando en F1 si ya hubo claim
     local, o limpiando el estado stale en F2 sin deadlock ni prompt sorpresa).
     `HomePage` usa `authenticatedHiveUsername` + `requiresAuthenticatedSession: true`
     y `StarterPackCeremony.tsx` muestra `'Claiming...'` en F1 (`'Signing...'`
     solo en `hive-body-auth`).
   - *Daily quest claim*: `dailyQuestStore.ts` protege el commit local F1 con
     `flushing: true` + `try/catch/finally` y feedback `rejected` visible;
     `DailyQuestPanel.tsx` re-ejecuta `refreshIfNeeded` al cambiar `account` y
     maneja `awaiting_replay` (sin botón duplicado ni copy ambiguo en F2).
   - *DUAT en F1*: `duatClaimStore.ts` bloquea `claimReady` cuando
     `!phasePolicy.hiveBroadcast || !phasePolicy.packs` con mensaje explicito de
     fase (`Mainnet F3`), y `DuatClaimPopup.tsx` renderiza `store.error` y
     etiqueta `'Unavailable in Phase'`.
2. **Mecanicas de juego y determinismo P2P — CERRADO EN CODIGO (2026-11-24):**
   - *IDs/RNG deterministas*: `wheelOfYoggHandler.ts`,
     `changeHeroPowerHandler.ts`, `replaceHeroPowerHandler.ts`,
     `cardTypeAdapter.ts` y fallback de `discoveryUtils.ts` usan `cryptoIdGen()`
     (enlazado a `withDeterministicIdGen` en P2P) en lugar de `Date.now()`.
     `pokerSpellSlice.ts` envuelve `resolvePokerSpellEffect` en
     `withDeterministicRng(seededRngFromString(...))` y `resolveHoleSwap` es
     invariante a perspectiva (`attacker`/`defender`).
   - *Techo de showdown (aceptado)*: `SHOWDOWN_PRESENTATION_BUDGET_MS` = **21s**
     (`pokerResolutionOutcome.ts:4`). Red de seguridad; el camino feliz no debe
     dispararlo.
   - *Paridad WASM vs TS (deuda estructural post-Alfa)*: chess/poker en vivo
     corren en TS; `engine.wasm` solo hashea y provee helpers de poker
     (`applyChessActionWasm` sin llamadores; `assembly/effects/effectInterpreter.ts`
     ignora patrones desconocidos; `customHandler.ts:70-78` retorna `success: true`).
3. **P2P practico para testers — ABIERTOS COMO FRICCION CONOCIDA:**
   - *Recarga dura (F5 / tab kill movil)*: `useP2PMatchResume.ts:36-55` mantiene
     `renewalAvailable: false` (Fase 4 bloqueada hasta ceremonia `session_renewal`),
     descartando el snapshot y sacando al tester al lobby. Aceptado para Alfa
     cerrada; prioritario antes de abrir beta mas amplia.
   - *Emparejamiento directo*: salas manuales por ID estan deshabilitadas en red
     compartida (`MultiplayerLobby.tsx:216`); dos testers deben usar Quick Match
     o ser amigos aceptados en `FriendsPanel` (cola de retos en memoria). Evaluar
     codigo de sala privada firmado o incluir Warband Challenge en el smoke.
   - *Backpressure del relay*: superar 256 KiB pendientes cierra el socket
     (`p2pSocketSend.ts`, `p2pRelay.ts:650-653`) y el usuario solo percibe
     desconexion.
4. **Consistencia de datos residual — CERRADO EN CODIGO (excepto Postgres/F4):**
   - *Cambio de cuenta en caliente (CERRADO)*: `accountScopedStorage.ts`
     normaliza usernames, rastrea la cuenta activa sin carrera contra
     `localStorage`, y resetea en memoria las stores registradas (con escrituras
     suprimidas) antes de `rehydrate()` para evitar fuga de estado al cambiar de
     cuenta.
   - *Indexador async (CERRADO)*: `server/services/chainIndexer.ts` usa
     `await saveStateAsync()` por lote en lugar de `saveState()` sincrono.
   - *PostgreSQL (P2 post-Alfa)*: esquema y `pgStateAdapter` tienen paridad de
     codigo, pero Alfa sigue operando en `json-file` (1 instancia). Activar
     Postgres antes de escalar beta/multi-instancia.

### 3. Closed Beta F2

Se abre solo despues del punto 2, con epoch nuevo `closed-beta-*`,
`qaFullCatalogEnabled=false` y `inviteBlocked=false` tras
`RAGNAROK_HIVE_KEYCHAIN_SMOKE`, `RAGNAROK_P2P_TWO_BROWSER_SMOKE` y
`RAGNAROK_CLOSED_BETA_OPERATOR_SIGNOFF`.

F2 enciende replay Hive, wallet explicito y publicacion de campana. Mantiene
apagados marketplace, packs, escrituras NFTLox y ranking oficial. La
migracion archiva evidencia y no promueve RUNE, ELO, Season Score ni CardXP
locales. La prueba NFTLox de `docs/BETA_TESTNET_SCOPE.md` no es gate de este
corte: ese requisito es F3.

### 4. Ranked

ADR 0008 sigue siendo el contrato: el ganador publica `match_result`, el
replay valida y el perdedor no contrafirma. Permanece apagado durante el
cierre de Alfa y durante la invitacion F2. Encenderlo es un corte de runtime
posterior, con su propio smoke de ancla, receipt, transcript y una sola
operacion Hive. No forma parte del front F1 ni del cutover de Closed Beta.

### 5. Mainnet F3

Marketplace, packs, escrituras NFTLox y ranking oficial se habilitan aqui,
con fingerprint mainnet y aprobacion operativa. No se anticipan en el front
de Alfa ni en la invitacion de Closed Beta.

### Fuera de esta hoja

Hasta cerrar el punto 2 quedan fuera: settlement ranked, replay del
action-log firmado, auditoria completa del catalogo de 2400 cartas, fusion de
los CSS de poker, borrar `GameBoard` / `SimpleGame` / `legacyBridge`, activar
PostgreSQL como runtime principal, reanudacion P2P tras recarga dura (Fase 4 /
`session_renewal`), el piloto Eitr de `norse-9` y el resto de misiones de
campana. La CSP de produccion ya esta aplicada via Helmet (`server/index.ts`);
solo falta verificarla en el host desplegado.

## Verdad actual

Phase 1 gameplay validation is `local-gameplay-v1`: single, campaign, daily
quests and P2P use local replay/IndexedDB settlement. RUNE, ELO, SeasonScore,
CardXP and level-ups are local authority, never Hive output. Marketplace,
packs and NFTLox writes are disabled and must be verified through their gates.

- Fase actual: **Phase 1 Gameplay Validation con mecanicas locales completas**.
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
            P2P: JSON export, one Find/delegation Keychain signature, no later Keychain/Hive op
            daily quest Claim en home
```

F1 terminal settlement is local and complete: campaign/daily/P2P RUNE is
idempotent IndexedDB ledger state; ELO, SeasonScore, CardXP and level-ups are
local projections. The two-browser smoke must verify those projections and
zero Hive/custom_json/outbox/wallet output after the explicit Quick Match
Find/delegation signatures. It must not claim browser smoke is complete until it is
run operationally.

La decision normativa es
[`ADR 0007`](./adr/0007-p2p-gameplay-only-testnet.md): esta fase prueba partidas
P2P completas y fluidas. El relay arbitra solamente checkpoints deterministas
de cambio de fase. No hay firma ni broadcast de `match_result`, settlement P2P
canonico de RUNE/ELO/Season Score/CardXP, ni prompts de Keychain posteriores a
Find causados por la partida. La cola es unsigned; Find/delegation es la unica
firma Keychain especifica de partida por jugador. Accept es local (sessionSig). El resultado terminal y esas
proyecciones economicas son evidencia local en IndexedDB/replay.

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
   perfiles reales. Quick Match muestra `Find (delegacion) → Offer → Accept → Ready`:
   una sola firma Posting visible en `Find` por jugador, `Accept` local
   (`sessionSig`) y ningun prompt posterior hasta el resultado.
4. Practica y campana (1 mision Norse) completan el script de spine local:
   quiet move, instant kill, captura a poker, resolucion, retorno a chess,
   `game_over`. El backup timer de showdown (`SHOWDOWN_PRESENTATION_BUDGET_MS`,
   21s) no dispara en el camino feliz.
5. El P2P de dos browsers cubre el mismo script mas checkpoints
   `chess ↔ poker_combat`, checkpoint terminal, reconnect corto, reload local
   snapshot + rejoin, resultado local y export JSON sin operacion Hive.
6. Daily quest: progreso de partida + commit local idempotente en home; duplicate
   claim es no-op. Campana first-clear persiste RUNE local una vez; no wallet en F1.
7. Dualidades P0 de migracion estan congeladas: un owner de fin de partida,
   un lookup de carta, docs que no anuncian el modo muerto "Standard Match".
8. `pnpm run check`, `pnpm run lint:css`, el runner de seguridad P2P y el build
   Alfa pasan en el arbol que se va a desplegar.

### Closed Testnet Beta

Closed Beta no se abre hasta que, ademas de lo anterior:

1. Se rote a `closed-beta-*`.
2. `qaFullCatalogEnabled=false`.
3. `closedBetaCutover.inviteBlocked=false` solo despues de estas evidencias:
   `RAGNAROK_HIVE_KEYCHAIN_SMOKE`,
   `RAGNAROK_P2P_TWO_BROWSER_SMOKE`,
   `RAGNAROK_CLOSED_BETA_OPERATOR_SIGNOFF`.
4. P2P ranked RUNE, ELO oficial, Season Score y CardXP siguen apagados. El
   winner-arbiter y `match_result` pertenecen al corte ranked de la hoja de
   ruta (ADR 0008), posterior a la invitacion F2.

## Orden mas corto

El orden vigente es la [hoja de ruta](#hoja-de-ruta) del 2026-10-16. El
diagrama siguiente es el historial del corte 2026-09-01: la spine, las
ceremonias locales y las dualidades P0 ya cerraron en codigo. El trabajo
siguiente es el front F1 y la evidencia operativa de Alfa.

El trabajo paralelo que no acorta Alfa Player-Ready (ranked settlement,
action-log replay, CSP de produccion, auditoria de catalogo,
cemetery de CSS/VFX, las 49 misiones)
se deja fuera hasta que el deploy, el smoke de dos browsers y la victoria
norse-1 pasen. Cards OPEN-8 (handshake + apply simetrico) ya cerro; no
reabrir como host-auth.

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

Chequeo 2026-09-01 (codigo + pruebas focalizadas + smoke automatizado de relay;
no sustituye Keychain humano, dispositivo fisico ni health del deploy real).

Actualizacion 2026-09-02: Mulligan permanece en `pre_battle`; su receipt se
reintenta de forma idempotente con el mismo `commandId + seq` y, si no converge,
el match se cancela sin resultado. `battle_started` deriva solamente del primer
movimiento legal de pieza aceptado por Chess. El hard integrity overlay queda
reservado para una batalla ya iniciada y la accion de evidencia se llama
`Export diagnostics`. Este cierre de codigo no cierra el gate humano/deploy de
dos browsers con Keychain.

Actualizacion 2026-10-09: en `main`, la recompensa de poker en single ya no
reinstala `cryptoIdGen` como alcance propio (eso era el
`Maximum call stack size exceeded` en `#/game/single`). `PixiParticleCanvas`
se monta solo con animaciones activas, sin reduced motion y fuera de
`game_over`; `GameOverScreen` se monta solo en `game_over`. Las cinco zonas
del tablero y `GameHUD` siguen montadas durante el duelo. El host Alfa sigue
sirviendo el bundle anterior hasta el proximo deploy. La fila 0 de la tabla
conserva el diff historico del 2026-09-01; no describe este arbol.

| Orden | Gate | Estado actual | Cierre minimo |
|---|---|---|---|
| 0 | WIP del arbol | Queda chrome poker | Diff actual: `HoleCardsOverlay.tsx`, `hero-card.css`, `CardFrame.css`. Spine/resume/labels ya en `main`. No empilar trabajo nuevo fuera de arena. |
| 1 | Spine practica / campana / P2P | Integracion automatizada cerrada; smoke humano abierto | Practica: chess → poker writeback → Leave Match → `game_over` (2026-08-19). Campana: el test de lifecycle ejecuta derrota, first-clear, segundo clear y reapertura de IndexedDB con settlement local. P2P: el tracer multiperfil cubre handshake, chess, checkpoint, Poker, reload serializado y `game_over`. Faltan ganar norse-1 en browser y el smoke P2P de dos browsers reales. |
| 2 | Poker board + funnel | Funnel y telefono landscape cerrados; pass amplio abierto | El contrato SSR prueba labels visibles dinamicos Bet/Raise y Check/Call, Fold, Frontline, All in, HP, aria/title y razones disabled; la geometria `117x99` queda fijada por test. Browser 844x390 confirma starter, warband, deckbuilder y combate lado a lado; portrait muestra el gate de rotacion. Atlas 844x390 muestra mapa+dossier y 390x844 sigue responsive, sin relajar CSP. Falta el pass visual humano 1366/1920/ultrawide/dispositivo fisico. |
| 3 | Runtime Alfa desplegable | Host inspeccionado; arbol actual no desplegado | `build:alfa-testnet` pasa. En `testnetdev.ragnaroknft.quest`, health/admin/p2p status, sync, headers y cache pasaron; challenge signing figura `source=env`, `required=true`, `ready=true`. El host todavia sirve copy/API anteriores (por ejemplo daily claim) y no prueba este workspace hasta el siguiente deploy. |
| 4 | Hive session | Abierto P0 humano | Login real con Keychain; Quick Match queue unsigned, una firma Find/delegation por jugador y cero prompts Keychain posteriores o claims F1. |
| 5 | Campana 1 mision + daily quest | Persistencia local automatizada cerrada | Claim diario local: commit IDB `claimed` / `already_claimed` con RUNE local una vez (`Commit`, sin wallet). Campana: first-clear concede solo RUNE local una sola vez (sin Match XP ni CardXP en Alfa; `norse-9` tiene piloto local de Eitr fuera del gate), el replay persiste tras cerrar/reabrir IndexedDB y una derrota no completa la mision. Falta evidencia jugada en browser de una victoria `norse-1`. |
| 6 | Dualidades P0 | Cerrado | Fin de partida unico (`matchEndController` cableado). Lookup de cartas unico en `data/cardRegistry`; `allCards.ts` y `cardManagement/cardRegistry.ts` son adaptadores sin dataset propio. Docs: Standard Match historico. OPEN-8 cerrado. Showdown backup (21s) queda como red de seguridad aceptada. |
| 7 | P2P smoke dos browsers | Automatizacion cerrada; P0 humano abierto | El tracer usa dos perfiles aislados y prueba spine + checkpoints + reload serializado + settlement local externamente silencioso. Los tests de relay y control añaden cambio de `X-Forwarded-For`, reemplazo de socket con la misma sesión/ticket/`peerId` y rechazo de ticket distinto sin expulsar al miembro. El transporte conserva frames de referee que llegan antes del listener, no duplica timers de reconnect y no reprograma un reconnect cuyo room ya perdió ownership; una sala nueva cancela la ventana anterior. `transport_ready_v1` es solo anuncio: WebRTC/relay no publican gameplay hasta el `transport_committed_v1` bilateral; una carrera de kinds fuerza fallback coordinado y permite recuperación por relay. El reducer de combate y el smoke de battlecry prueban IDs deterministas para Overkill, deathrattle draw, tokens materializados y Discover después de aplicar local/remoto. La habilidad de Rey usa `chess_mine_placement` firmado y tile-set determinista, pero falta evidencia de dos browsers/Keychain reales, relay desplegado, desconexion/reconexion de transporte y export. |
| 8 | Seguridad P2P enfocada | Verde | `bash scripts/p2p-ticket-security-check.sh`: 26/26 suites y 235/235 tests (2026-11-24). El tracer multiperfil y la suite global tambien pasan; esto no sustituye el smoke humano de dos browsers. |
| 9 | Closed Beta cutover | Bloqueado | F2 epoch `closed-beta-*`, env evidence y operator sign-off. NFTLox proof es F3 futuro, no gate F2. |

Validacion del arbol local al cierre de este corte: TypeScript, build Alfa,
stylelint, determinismo WASM, gates P2P y suite completa verdes (309 archivos,
2.206 tests). ESLint no tiene errores y conserva warnings historicos; los
warnings de tamaño/chunk del build no bloquean la ejecución.

## Fuentes de verdad

Cuando docs y codigo divergen, **codigo gana** y el doc se reconcilia en el
mismo cambio.

| Dominio | Canon | No es canon |
|---|---|---|
| Schemas (rarity, set, starter) | `shared/schemas/` | `metadata.json`, strings sueltos |
| Definiciones de carta | `client/src/game/data/cardRegistry/` | `allCards.ts` y `cardManagement/cardRegistry.ts` (adaptadores compat sin dataset propio) |
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
   garantiza `onComplete` dentro del techo `SHOWDOWN_PRESENTATION_BUDGET_MS`
   (21s en `pokerResolutionOutcome.ts`). El timer es red de seguridad, no el
   camino feliz.
3. Lookup de cartas: **cerrado 2026-08-23.** Canon de definiciones y lecturas =
   `client/src/game/data/cardRegistry/`. `allCards.ts` y
   `cardManagement/cardRegistry.ts` preservan imports legacy, pero delegan al
   mismo `getCardById` y nunca mantienen un dataset paralelo. La prueba de
   paridad incluye IDs reales, tokens, miss y un effect handler legacy.
4. Docs: **cerrado.** Standard Match / `GameBoard` no es un modo Alfa.
   RULEBOOK y GAME_FLOW lo marcan historico.
5. `P2P_SECURITY_HARDENING.md` es historico; OPEN-8 esta cerrado.

P1, muertos evidentes. Borrar **despues** del smoke, con grep + smoke visual:

- `GameBoard.tsx` + `GameBoardHandlers.tsx`
- `components/minimal/SimpleGame.tsx` + `SimpleGameLayout.tsx`
- `legacyBridge.ts` / `legacySynth.ts`
- Dedupe de ~62 CSS poker (`docs/POKER_CSS_REFERENCE.md`)
- `.scratch/*` PRDs (no borrar, no seguir)
- Ranked settlement

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
- En que fase esta la mano: Mulligan, First Blood, Faith,
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
   - En telefono, bloquear la interaccion de partida en portrait y pedir giro;
     no crear una segunda geometria vertical para combate.
   - Aplicar el mismo gate a single, campana y P2P. Warband/seleccion de heroes
     y deckbuilder tambien son landscape-first porque son parte del funnel de
     batalla.
   - Lobby, Atlas, mapa de campana y metajuego pueden seguir siendo responsive
     en portrait; en landscape corto deben aprovechar el ancho sin apilar
     paneles por debajo del viewport.
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

### Canario de transporte

La política runtime mantiene `P2P_WEBRTC_ENABLED=false` por defecto. El
endpoint `GET /api/p2p/transport-config` permite cambiar el modo y los budgets
sin reconstruir el navegador, pero solo debe habilitar WebRTC para un canario
controlado. Antes de ampliar el rollout hay que validar dos browsers reales en
Chrome/Safari móvil y redes distintas, incluyendo Wi-Fi, celular, presupuesto
agresivo, fallback coordinado, relay con presupuesto independiente, reconnect
con relay sticky, política `no-ice` y ausencia de secretos en logs/respuestas.
La automatización ya cubre el reemplazo de relay tras cambio de IP y la
preservación de la sala por ticket/cuenta/`peerId`; los tests de mocks y el
build no sustituyen esa evidencia operativa en dos browsers desplegados.

### Smoke humano P2P

No marcar como pasado sin dos perfiles reales con Hive Keychain.

La preparación técnica del handshake no sustituye este smoke: el snapshot de
deck+claims es único (`deckHash`/`claimsHash`) y, en shared-network,
`initGameFromHandshake` queda bloqueado hasta que la identidad Hive coincida,
el binding de claims sea válido y las verificaciones de IndexedDB y servidor
devuelvan `approved`. Un mismatch o fallo de verificación es fail-closed y
desconecta. En Poker, `decisionId`, dedup, transcript y cierre de ronda solo
se comprometen después de que el motor devuelva `applied`.

Evidencia automatizada focalizada (no evidencia de dos navegadores):

```bash
pnpm exec vitest run \
  client/src/game/p2p/p2pMultiProfileF1.integration.test.ts \
  client/src/game/p2p/deckHandshakeAuthority.test.ts \
  client/src/game/p2p/p2pMatchResume.test.ts \
  client/src/game/p2p/phaseCheckpointClient.test.ts \
  client/src/game/match/modes/p2p/wireSync/pokerP2PActionCommit.test.ts \
  client/src/game/match/modes/p2p/wireSync/pokerP2PCombatAdapter.test.ts \
  client/src/game/subscribers/BlockchainSubscriber.localP2P.test.ts \
  client/src/game/subscribers/localP2PSettlement.test.ts
```

El tracer multiperfil compone dos sesiones aisladas: binding deck+claims
aprobado, chess aplicado/rechazado, checkpoint a Poker, accion Poker
rechazada/reintentada/deduplicada, reload serializado de transcript/checkpoint,
`game_over` y settlement F1 local con RUNE/ELO/SeasonScore/CardXP. La ruta de
settlement externo no se invoca. Ese reload serializado no prueba el relay:
el smoke humano de dos browsers, desconexion/reconnect real, transporte
desplegado e identidad Keychain sigue pendiente.

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
9. Reload duro avisa y, en la Alfa actual, muestra un bloqueo explícito porque
   la clave efímera no puede renovarse sin un prompt autorizado. El tester
   vuelve al lobby y crea una nueva partida; no hay tablero servido por
   Express. Un runtime futuro con `session_renewal` visible podrá reactivar el
   reintento de sala (2 intentos / 60s).
10. `game_over` ocurre solo tras el checkpoint terminal; se muestra el resultado
    local y no aparece Keychain ni una operacion Hive después de Find/Accept.
11. Export JSON incluye match/session id, roles, reset epoch, reject code si
    existe, hashes, checkpoints y resultado local.

## P1 despues de Alfa player-ready

- Borrar `GameBoard`, `SimpleGame`, `legacyBridge` despues de grep + smoke.
- Hash coverage de snapshots de poker y transcript replay compacto.
- Replay determinista del `action-log` firmado (ranked). El snapshot local
  de hard reload ya esta en [`P2P_MATCH_RESUME.md`](./P2P_MATCH_RESUME.md).
- Dedupe de CSS/Tailwind pendiente en poker.
- CSP de produccion ya aplicada via Helmet (`server/index.ts`); verificar en
  el host desplegado y endurecer antes de beta publica.
- Auditar/migrar handlers legacy restantes con `Date.now()` fuera del subconjunto
  cerrado en § 2b y cerrar paridad WASM vs TS antes de ranked.
- Evaluar proteccion de `/api/admin/config` y `/api/admin/p2p/status` y sanitizar
  el stack trace en `ErrorBoundary` antes de abrir testers externos.
- Auditoria de vulnerabilidades de produccion antes de abrir testers externos.
- Resto de capitulos de campana (el gate Alfa ya cerro con 1 mision Norse).

## No hacer ahora

- No llamar Alfa "beta lista".
- No abrir Public Testnet.
- No activar P2P ranked RUNE, ELO oficial o Season Score.
- No firmar/broadcast `match_anchor` o `match_result` ni pedir Keychain durante,
  al reconectar, al terminar una partida P2P o al reclamar en F1. Los claims F1
  son commits locales; no hay prompt de wallet post-partida.
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
- captura de ambos navegadores en el VS ready check, incluyendo contador de
  30 s, estados Ready/Pending, espera bilateral y pausa/reanudacion al reconectar;
- capturas o reporte visual del tablero poker en los viewports objetivo;
- practica: evidencia del script chess↔poker→`game_over`;
- campana: 1 mision Norse, evidence JSON (account, epoch, mission,
  first-clear o replay-no-op);
- daily quest: un Claim con feedback `claimed` o `already_claimed`;
- confirmacion de que el backup timer de showdown no disparo en esos caminos;
- dualidades P0 cerradas o explicitamente aceptadas.

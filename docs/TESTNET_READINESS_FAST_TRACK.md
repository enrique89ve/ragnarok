# Testnet Readiness Fast Track - 2026-06-14

## Proposito

Esta es la fuente activa para cerrar lo que falta entre el estado actual y una
Alfa Testnet jugable por personas reales, con el menor camino posible hacia
Closed Testnet Beta.

Este documento reemplaza el rol de "plan vivo" que antes tenian documentos de
QA Season 0 o beta. Esos documentos siguen siendo referencia historica o
detalle por dominio, pero este archivo decide el orden actual.

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
**Chess-Poker P2P Spine** definida en `CONTEXT.md`:

```text
matchmaking + seed
        |
        v
     chess
     /    \
instant    chess_combat_initiated
 kill              |
chess_attack       v
 stays        Phase Checkpoint
 on chess   chess -> poker_combat
                   |
                   v
            poker_action loop
                   |
                   v
            Phase Checkpoint
          poker_combat -> chess
                   |
                   v
            chess continues
                   |
                   v
            Phase Checkpoint
              * -> game_over
                   |
                   v
            local result + JSON export
            (no Keychain, no Hive op)
```

La decision normativa es
[`ADR 0007`](./adr/0007-p2p-gameplay-only-testnet.md): esta fase prueba partidas
P2P completas y fluidas. El relay arbitra solamente checkpoints deterministas
de cambio de fase. No hay firma ni broadcast de `match_result`, settlement P2P
de RUNE/ELO/Season Score/CardXP, ni prompts de Keychain causados por la partida.
El resultado terminal es evidencia local.

## Definicion de listo

### Alfa Testnet player-ready

Alfa esta lista para mas manos internas cuando todo esto sea verdad:

1. El deploy real prueba `/api/health`, `/api/admin/config` y
   `/api/admin/p2p/status` con `runtimePhase=alfa-testnet`,
   `qaFullCatalogEnabled=false`, estado JSON y secreto P2P estable.
2. El tablero de poker se entiende sin explicacion externa: fase, turno,
   cartas, apuesta/riesgo, accion disponible, conexion P2P y resultado.
3. Un smoke humano con Hive Keychain valida login previo, session reuse y dos
   perfiles reales. Desde matchmaking hasta el resultado no aparece ningun
   prompt de wallet.
4. El P2P de dos browsers cubre movimiento de chess, captura instantanea,
   captura a poker, checkpoints `chess ↔ poker_combat`, resolucion, retorno a
   chess, checkpoint terminal, reconnect corto, reload guard, resultado local
   y export JSON sin operacion Hive.
5. `pnpm run check`, `pnpm run lint:css`, el runner de seguridad P2P y el build
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
transcript Merkle entre peers, reload recovery completo, cards host-auth
OPEN-8, mines P2P, CSP de produccion, auditoria de catalogo) se deja fuera
hasta que el smoke de dos browsers pase.

| Orden | Gate | Estado actual | Cierre minimo |
|---|---|---|---|
| 1 | Documentacion activa | Cerrado en este pass | Usar este archivo y `CONTEXT.md` como entrada unica del plan vivo. |
| 2 | Poker board entendible | Abierto P0 | Un pass visual/UX sobre `RagnarokCombatArena`, `board.css`, `BettingPanel`, `WagerInfoPanel`, HUD y showdown. |
| 3 | Runtime Alfa desplegable | Abierto P0 | Probar build/start Alfa, health, admin config, p2p status, headers y cache rules en el target real. |
| 4 | Hive session | Abierto P0 humano | Login real con Keychain antes de matchmaking; cero prompts causados por la partida. |
| 5 | P2P smoke dos browsers | Abierto P0 humano | Cubrir la spine: quiet move, instant kill, captura a poker, checkpoint ida, resolucion, checkpoint vuelta, `game_over`, reconnect corto, export local. |
| 6 | Seguridad P2P enfocada | Necesita re-run | `bash scripts/p2p-ticket-security-check.sh` en el arbol final. |
| 7 | Closed Beta cutover | Bloqueado | NFTLoX proof, epoch `closed-beta-*`, env evidence y operator sign-off. |

## Sprint P0 - tablero de poker

La mejora visual no debe ser cosmetica aislada. Debe responder a una pregunta:
si alguien llega al primer combate, puede jugar sin preguntarnos que mirar o que
boton tocar?

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
9. Reload duro muestra warning y queda documentado como riesgo si no hay full
   recovery.
10. `game_over` ocurre solo tras el checkpoint terminal; se muestra el resultado
    local y no aparece Keychain ni una operacion Hive.
11. Export JSON incluye match/session id, roles, reset epoch, reject code si
    existe, hashes, checkpoints y resultado local.

## P1 despues de Alfa player-ready

- Hash coverage de snapshots de poker y transcript replay compacto.
- Full reload recovery con snapshot persistido y replay determinista.
- Dedupe de CSS/Tailwind pendiente en poker.
- Eliminacion de componentes muertos despues de grep y smoke visual.
- CSP explicita para assets, Hive APIs, WebSocket y fuentes.
- Auditoria de vulnerabilidades de produccion antes de abrir testers externos.

## No hacer ahora

- No llamar Alfa "beta lista".
- No abrir Public Testnet.
- No activar P2P ranked RUNE, ELO oficial o Season Score.
- No firmar/broadcast `match_anchor` o `match_result` ni pedir Keychain durante,
  al reconectar o al terminar una partida P2P.
- No convertir NFTLoX en requisito de Alfa.
- No usar Vercel/static para una prueba con `/api/*` y `/ws/p2p`.
- No resolver visuales creando un segundo tablero paralelo.

## Estado de documentos

Activos:

- `docs/TESTNET_READINESS_FAST_TRACK.md` - este archivo, plan vivo.
- `DESIGN.md` - direccion visual y reglas UI.
- `docs/DOKPLOY_DEPLOYMENT.md` - deploy Alfa/Dokploy.
- `docs/TESTNET_RUNBOOK.md` - comandos y smokes manuales.
- `docs/PVP_WIRE_PROTOCOL.md` - contrato P2P.
- `docs/adr/0007-p2p-gameplay-only-testnet.md` - alcance normativo de esta fase.
- `docs/P2P_TICKET_SECURITY_VALIDATION.md` - validacion enfocada de ticket.
- `docs/POKER_ARENA_UI.md` - canon tecnico del poker arena.
- `docs/POKER_ARENA_DOM_TREE.md` - mapa DOM/posicion.

Historicos o de referencia:

- `docs/BETA_TESTNET_SCOPE.md` - scope historico y economia, no plan activo.
- `docs/TESTNET_WEEK_ONE_SPEC.md` - QA Season 0, no Alfa actual.

## Evidencia minima para cerrar este documento

Antes de decir "listo para testers", adjuntar o registrar:

- salida de `pnpm run check`;
- salida de `pnpm run lint:css`;
- salida de `bash scripts/p2p-ticket-security-check.sh`;
- salida de `pnpm run build:alfa-testnet`;
- `/api/health`, `/api/admin/config`, `/api/admin/p2p/status`;
- session log JSON del smoke humano P2P;
- capturas o reporte visual del tablero poker en los viewports objetivo.

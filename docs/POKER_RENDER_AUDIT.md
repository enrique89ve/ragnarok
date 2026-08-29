# Poker render audit

## Objetivo

El tablero de poker debe comunicar el estado de la mano con una jerarquía
visual propia del juego. Un mismo evento no debe competir consigo mismo en
varios textos flotantes, banners y toasts.

## Inventario de superficies activas

| Superficie | Qué comunica | Comportamiento recomendado |
| --- | --- | --- |
| `PhaseBanner` | Cambio de fase | Único banner de fase; no reutilizarlo para manos o ataques. |
| `HandStrengthIndicator` | Mejor mano actual | HUD persistente, compacto y angular; texto corto, sin toast. |
| `HeroBattlePopup` | Acción puntual junto al héroe | Mantener como sello espacial de icono/acción; nunca alojar frases largas. |
| `CombatFeedbackStack` | Feedback textual genérico | No duplicar acciones que ya tienen popup o VFX dedicado. |
| `ActionAnnouncement` | Anuncio cinematográfico de acción | Reservarlo para eventos que no tengan representación espacial; suprimirlo en poker cuando exista un popup equivalente. |
| `ElementMatchupBanner` / `ElementBuffPopup` | Ventaja o modificación elemental | Solo durante la ventana de resolución elemental; no apilarlo con otro anuncio de la misma causa. |
| `ShowdownCelebration` | Resultado de la mano | Único resultado central al cerrar el showdown. |
| `TargetingPrompt` / `HeroPowerPrompt` / `MulliganScreen` | Decisión bloqueante del jugador | Son superficies interactivas, no feedback automático. |
| `BattlefieldCardInspector` / `HeroDossierModal` | Inspección solicitada | Modal bajo demanda, con chrome del juego; nunca debe aparecer como reacción automática. |
| Pixi + GSAP | Impacto, energía, rayos y movimiento | Canal principal para ataques y manos especiales; evitar texto largo dentro del efecto. |

## Símbolos de estado del tablero

El tablero usa hechos resueltos de `CardInstance` y el contrato compartido en
`client/src/game/combat/runtimeStateContract.ts`. La intención visual de sueño
se conserva en Dormant mediante el icono SVG dedicado, el contador de turnos y
dos marcas `z` decorativas de baja intensidad. Esas marcas no son estado, no
determinan elegibilidad y se desactivan con `prefers-reduced-motion`.

| Estado visible | Fuente actual | Sustitución del legado |
| --- | --- | --- |
| Summoning sickness | `isSummoningSick` + excepciones Charge/Rush | Hourglass SVG, ya no `moon` |
| Dormant | `isDormant`, `dormantTurnsLeft` | Dormant SVG + contador + `z` decorativas, ya no emoji/`zzzFloat` |
| Exhausted | `attacksPerformed` + `canAttack` | Crossed-blade SVG, no inferencia genérica de `canAttack === false` |
| Coil | `coiledBy` | Coil SVG, ya no `isCoiled` |
| Einherjar | `einherjar` keyword + `einherjarGeneration` | Runtime counter, ya no `einpieces` |

`BattlefieldStateMark` centraliza la etiqueta accesible y la resolución de
iconos keyword/combat. `SimpleBattlefield` solo decide qué hechos ya activos
debe presentar en cada slot.

## Redundancias que debemos evitar

1. Una acción de ataque no debe renderizar a la vez `CombatFeedbackStack`,
   `ActionAnnouncement` y un popup textual junto al héroe.
2. Una mejora de mano no debe crear un toast genérico. El HUD muestra el estado
   actual y el momento especial usa un VFX dedicado.
3. Un modal no debe competir con el `ShowdownCelebration`; los modales solo
   responden a una inspección explícita.
4. El texto visible debe tener un presupuesto fijo. El nombre completo y la
   explicación viven en `aria-label`, no en una caja que pueda desbordarse.

## Contrato visual para `THOR'S HAMMER`

- `HandStrengthIndicator`: sello persistente de mano actual, de tamaño estable.
- Evento `handImproved` con rango `THORS_HAMMER`: activa una sola vez el efecto
  especial.
- Si el mismo rango llega después como anuncio de showdown, se deduplica dentro
  de una ventana corta y no vuelve a renderizar el texto gigante de rango.
- Pixi: destello, rayos radiales, fragmentos y golpe en el ancla del héroe.
- GSAP: entrada del martillo desde un ángulo, cambio entre cuatro poses y
  caída sincronizada con el impacto.
- Las cuatro poses se cargan como texturas separadas en runtime; el atlas
  original queda como fuente de referencia, pero no gobierna la animación.
- Sin toast ni banner textual adicional durante la cinemática.
- Semilla derivada del id del evento para que la distribución visual sea
  reproducible entre replay, pruebas y multiplayer.

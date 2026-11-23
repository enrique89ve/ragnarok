# Ragnarok — Eitr de finales de campaña

## Estado

**Implementación propuesta / NO lista para mainnet.** Este paquete contiene un instalador idempotente en el sentido de que rechaza modificaciones que no coincidan con el código fuente previsto, y no toca la rama remota.

El conector GitHub podía leer `enrique89ve/ragnarok`, pero devolvió **HTTP 403** al intentar crear una rama. Por ello los cambios **NO están publicados ni aplicados** en GitHub.

Código base examinado: `enrique89ve/ragnarok`, `main`, commit `4f72e76389b65b922fe31109140661c765cfe382`.

## Piloto local de Norse

En F1, la primera victoria guardada de `norse-9` por cuenta y temporada
acredita 40 Eitr locales. En el mapa de Norse, Campaign Forge muestra el saldo
y permite gastarlo en una carta común aleatoria de demostración. El resultado
queda en el navegador como vista previa. Una nueva temporada expira el saldo
anterior y una nueva victoria vuelve a habilitar la Forja. El reinicio de
testnet usa el espacio de almacenamiento del nuevo `resetEpoch`.

## Decisión económica

| Finale | Eitr por temporada / cuenta |
|---|---:|
| norse-9 | 40 |
| greek-10 | 40 |
| egyptian-10 | 40 |
| celtic-10 | 40 |
| eastern-10 | 60 |
| twilight-9 | 100 |
| **Total máximo** | **320** |

Presupuesto global por temporada: `16_000_000` Eitr de finales, equivalente a 50.000 cuentas que completan los seis capítulos. El mismo algoritmo y valores se aplican a testnet y mainnet.

- RUNE sigue siendo el premio económico ordinario y se utiliza para packs.
- Se retiran las cartas NFT otorgadas directamente por `reward_claim`; los logros entregan solo RUNE.
- Eitr puede obtenerse destruyendo NFT Genesis o por un final de campaña **independientemente verificado**.
- Forjar con Eitr permanece como vía secundaria de adquirir una carta aleatoria NFT, sin elección de carta específica.
- La dificultad no multiplica premios de Eitr.
- Una misión final puede acreditar una vez por cuenta, misión y temporada.
- El saldo de Eitr sigue siendo de temporada; no se traslada a la próxima.

## Aplicar en un checkout local

1. En la computadora donde está tu repositorio, crea o utiliza una rama de trabajo. **No ejecutes sobre `main` sin revisar.**
2. Copia `apply_ragnarok_finale_eitr.py` a un directorio accesible desde la consola.
3. Ejecuta el script indicando la carpeta raíz del checkout:

```powershell
cd C:\ruta\a\ragnarok
git switch -c feature/campaign-finale-eitr-v1
python C:\ruta\descargas\apply_ragnarok_finale_eitr.py .
git diff --stat
git diff --check
pnpm test -- shared/protocol-core/campaignFinaleEitr.test.ts shared/protocol-core/campaignResult.test.ts shared/protocol-core/replayTraces.test.ts shared/protocol-core/runeEconomy.test.ts
pnpm run check
```

Si el archivo fuente cambió o existe una modificación inesperada, el instalador falla en la fase de comprobación **antes de escribir archivos**. No crea commits, pushes ni pull requests.

## Qué se modifica

- `shared/protocol-core/campaignFinaleEitr.ts` (nuevo): tabla de finales, presupuesto y función de consulta.
- `shared/protocol-core/eitrEconomy.ts`: `campaign_finale` y clave idempotente.
- `shared/protocol-core/types.ts`: interfaz opcional `verifyEconomicFinale`.
- `shared/protocol-core/apply.ts`: liquidación Eitr condicionada a verificación, anti-duplicados y supresión del mint de logros.
- `server/services/chainState.ts`: aceptación y contabilidad del nuevo tipo de entrada.
- `shared/protocol-core/rewardCatalog.ts`: los premios por logros dejan de anunciar cartas.
- Tests: `campaignFinaleEitr.test.ts` (nuevo), `campaignResult.test.ts`, `replayTraces.test.ts`, `runeEconomy.test.ts`.
- Documentación: ADR 0014 (nuevo), `docs/CAMPAIGN_PROTOCOL_V1.md`.

## Bloqueantes antes de activarlo

**No se emitirá Eitr desde las campañas en producción todavía**: el protocolo hoy acepta `campaign_result` basado en campos y hashes suministrados por el usuario sin reproducir independientemente la partida. El nuevo pago usa una función inyectada `verifyEconomicFinale` con comportamiento de **fallar cerrado**: si no hay verificador autoritativo que confirme la victoria, no acredita Eitr. En los tests, un doble que devuelve `true` sirve exclusivamente para ejercitar la contabilidad.

Antes de permitir pagos económicos reales también falta:

1. Implementar verificación determinista de resultados con replay completo del transcript y validación de elegibilidad y resultado.
2. Incorporar activación versionada (fecha/bloque) que evite emisiones retroactivas en reindexaciones.
3. Cerrar atomicidad, reinicio y recuperación de escrituras económicas del indexador.
4. Confirmar el presupuesto de 16 millones y políticas de fin de temporada.
5. Ejecución real de tests y comprobaciones CI en el checkout completo.

El paquete es un borrador de implementación: **no certifica seguridad mainnet ni reemplaza la auditoría del protocolo**.

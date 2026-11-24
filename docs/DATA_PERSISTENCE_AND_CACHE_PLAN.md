# Plan de Mejoras de Base de Datos, Datos Estáticos, Caché y Reconciliación

Estado: propuesto  
Base revisada: `main` (`349dcd83`)  
Referencias normativas: `docs/adr/0002-state-authority-boundaries.md`, `docs/adr/0009-local-settlement-and-phase-profiles.md`, `docs/PHASE_MIGRATION_RUNBOOK.md`

## 1. Objetivo

Eliminar deuda técnica en persistencia cliente/servidor y en artefactos estáticos (JSON, WASM y caché del Service Worker) para garantizar:

1. **Compatibilidad de datos entre versiones** sin corrupción silenciosa ni bloqueos por pestañas abiertas.
2. **Resistencia a manipulación o inyección local** manteniendo la frontera de autoridad: el navegador no decide resultados competitivos ni económicos fuera de F1; toda proyección reconstruible se valida contra su fuente canónica (Hive L1 / servidor / hashes de protocolo).
3. **Cero desincronización de caché o reconciliación** entre despliegues (especialmente en `engine.wasm`, manifiestos JSON y proyecciones duplicadas entre `localStorage` e IndexedDB).

---

## 2. Mapa Actual de Almacenamiento y Hallazgos

### 2.1 IndexedDB en el cliente (5 bases independientes)

| Base (`createRuntimeDatabaseName`) | Archivo | Versión / Stores | Hallazgos principales |
|---|---|---|---|
| `chain-v1` (o `chain-v1-campaign-proof-*`) | `client/src/data/blockchain/replayDB.ts` | v20 (~26 stores) | Casts sin validación en runtime al leer ledgers, cartas y cursores (`replayDB.ts:263`, `replayEngine.ts:137`); sin `onversionchange` ni `onblocked`; sin deduplicación de apertura concurrente; helpers `idbPut`/`idbDelete` resuelven en `req.onsuccess` en lugar de `tx.oncomplete` (`replayDB.ts:274-293`); carrera read-modify-write en liquidación local (`localP2PSettlement.ts:74` + `replayDB.ts:388`); `local_campaign_eitr` sin `keyPath`; comentario de cabecera desactualizado (dice v19). |
| `index-v1` | `client/src/data/indexer/indexDB.ts` | v1 (4 stores) | Sin `onversionchange`/`onblocked`; `putLeaderboard` (`indexDB.ts:161`) y `putSupplyCounters` (`indexDB.ts:188`) hacen `clear()` y luego `put()` en **dos transacciones distintas** (un cierre intermedio deja la tabla vacía); `applyOptimisticElo` (`indexDB.ts:223`) hace read-modify-write en dos transacciones. |
| `p2p-match-resume` | `client/src/game/p2p/p2pMatchResume.ts` | v1 (`records` + `sessionStorage`) | El sello SHA-256 (`p2pMatchResume.ts:103`) cubre identidad y contadores, pero **no** cubre `gameState` ni `combat` (tablero/póker). La recarga completa sigue bloqueada en Alfa (`useP2PMatchResume.ts:36`), lo cual debe mantenerse hasta verificar contra log firmado + checkpoint. |
| `action-log` | `client/src/game/protocol/actionLog.ts` | v1 (`leaves`, AES-GCM + HKDF) | `openRealDb()` (`actionLog.ts:101`) abre una conexión nueva sin `onversionchange`/`onblocked`; `txPut` (`actionLog.ts:200`) resuelve en `req.onsuccess` en lugar de `tx.oncomplete`. |
| `transcripts` | `client/src/data/blockchain/transcriptIPFS.ts` | v1 (`transcripts`) | Sin TTL ni política de evicción (crecimiento sin cota en IndexedDB); al leer por CID no recalcula ni verifica integridad contra `merkleRoot` o el pseudo-CID. |

### 2.2 `localStorage` y estado portable

- **Doble fuente de verdad (`client/src/data/HiveDataLayer.ts:195-206`)**: `useHiveDataStore` persiste en `localStorage` (`ragnarok-hive-data`) las proyecciones `stats`, `cardCollection`, `packCollection`, `tokenBalance` y `recentMatches`, mientras `replayDB` es la fuente canónica local. Esto provoca estados obsoletos tras migraciones o cambios de cuenta, desincronización visual antes de hidratar y riesgo de agotar la cuota de `localStorage` (~5 MiB) con colecciones grandes.
- **Claves dispersas (`client/src/game/config/storageKeys.ts`)**: coexisten nombres heredados e inconsistentes (`ragnarok_decks`, `ragnarok-decks`, `ragnarok-hero-decks`) y stores que definen claves fuera del registro central.
- **Restauración frágil (`client/src/game/stores/saveStateManager.ts:146-166`)**:
  - Un fallo de `checksum` solo emite `debug.warn` y continúa.
  - `restoreSaveState` muta directamente `campStore.completedMissions = state.campaign.completedMissions` sin usar `setState` de Zustand y asignando `string[]` donde `campaignStore` espera un diccionario (`Record<string, ...>`).

### 2.3 Persistencia en servidor (JSON en disco vs PostgreSQL)

- **`data/chain-state.<phase>.json` (`server/services/chainState.ts:651-836`)**:
  - Guarda todo el índice global en un único JSON monolítico con `JSON.stringify` + `fs.writeFileSync` + `fs.renameSync` cada 30 s.
  - **Riesgos**: la serialización síncrona bloquea el event loop de Node (impacta directamente al árbitro/relay P2P si comparten proceso); usa sufijo `.tmp` fijo sin PID/nonce ni `fsync`; `loadState()` (`chainState.ts:817`) captura y solo loguea errores de parseo/esquema (salvo `fingerprint_mismatch`), pudiendo arrancar con estado vacío silenciosamente si el archivo se corrompe.
  - **Fortaleza actual**: ya valida `runtimeFingerprint` y dispone de `server/services/chainStateMigration.ts` con dry-run, archivo de respaldo y confirmación explícita.
- **`data/starter-claims.json` (`server/services/starterClaimRegistry.ts:18-90`)**:
  - Usa `fs.writeFile` directa (**no atómica**: un crash a mitad de escritura trunca/corrompe el archivo).
  - Sin serialización de escrituras concurrentes (`saveStarterClaims()` puede intercalarse entre peticiones HTTP).
  - Sin `runtimeFingerprint` ni separación por fase/`resetEpoch`: todas las fases comparten por defecto la misma ruta `data/starter-claims.json`.
- **Esquema PostgreSQL incompleto (`server/db/ragnarok_schema.sql` y `server/services/pgStateAdapter.ts`)**:
  - `ragnarok_schema.sql` cubre solo 9 tablas base y **omite** `matches`, `eitr_ledger`, `forge_commits`, `campaign_submissions`, `campaign_progress`, `duat_claims`, `reward_claims`, `slashed_accounts`, `pack_commits`, `pack_supply` y una tabla de metadatos (`runtime_fingerprint`, versión de migración).
  - `pgStateAdapter.ts` tiene ~25 métodos del `StateAdapter` como stubs vacíos o no implementados (packs, campaña, mercado, Eitr, Forge, DUAT, slash, cola).

### 2.4 Datos estáticos (JSON, WASM, manifiestos y caché HTTP/SW)

| Artefacto | Tamaño / Ubicación | Cómo se consume hoy | Riesgo de caché / reconciliación |
|---|---|---|---|
| `engine.wasm` | `client/public/engine.wasm` (`package.json:61`) | `fetch(BASE_URL + 'engine.wasm')` sin hash (`wasmInterface.ts:47`, `genesisAdmin.ts:50`) | **CRÍTICO**: `sw.js:222` sirve `.wasm` en modo **cache-first** dentro de `ragnarok-assets-v4-<resetEpoch>` y `server/static.ts` no fija `Cache-Control`. Un despliegue dentro de la misma época deja clientes con el binario anterior y rompe la verificación `wasmHash` en el handshake P2P (`useWireSync.ts:1781`). |
| `genesisCollection.json` | 590 KB · `client/public/data/genesisCollection.json` | Generado por `scripts/genCollections.ts`; importado en build por `server/services/qaFullCatalogEntitlement.ts:1`; copiado a `dist/public/data/` | `"version": "1.0.0"` fijo sin content-hash; duplica `RARITY_TABLE` (`eitrForge`, `eitrDissolve`, `supplyCap`, `deckLimit`) y cartas de `cardRegistry` sin test automático de drift; queda expuesto en `dist/public/data/` sin `Cache-Control` explícito y bajo fallback genérico de `sw.js`. |
| `starterCollection.json` | 34 KB · `client/public/data/starterCollection.json` | Generado por `scripts/genCollections.ts`; referenciado solo en `scripts/auditArt.ts:122` | Mismo riesgo de drift frente a `cardRegistry`; se copia innecesariamente al bundle público `dist/public/data/` sin consumidor runtime en cliente. |
| `campaign-registry.v1.json` | 124 KB · `shared/campaign/campaign-registry.v1.json` | Importado estáticamente en `shared/campaign/registry.ts:1` | `CAMPAIGN_REGISTRY_HASH` está fijado manualmente en `shared/campaign/constants.ts:3`, pero `registry.ts` **no verifica** en arranque ni en tests que el hash del JSON coincida con la constante. Una edición manual rompe silenciosamente la verificación de envíos de campaña. |
| `duatSnapshot.json` | 233 KB · `shared/protocol-core/duatSnapshot.json` | Importado en `shared/protocol-core/duatSnapshot.ts:18` (lazy-load en cliente, directo en `chainIndexer.ts`) | Ya incluye aserción boot-time de `stats.totalPacks` (buen patrón). Falta fijar su SHA-256 canónico en protocolo/tests y mantenerlo estrictamente fuera del chunk inicial del cliente. |
| `version.json` | Emitido por `vite.config.ts:51` | Polling en `appUpdateManager.ts:112`; bypass en `sw.js:157`; `no-store` en `server/static.ts:52` | Solo contiene `{ buildHash, builtAt }`. No expone `wasmHash`, `cardRegistryHash`, `campaignRegistryHash`, `resetEpoch` ni `idbSchemaVersion` para detectar incompatibilidades antes de abrir partida. |
| `manifest.json` | 635 B · `client/public/manifest.json` | `no-store` en `server/static.ts:41` | `sw.js` no lo excluye explícitamente (a diferencia de `version.json`), por lo que cae en la caché genérica `network-first` con fallback potencialmente obsoleto. |
| `fonts/inter.json` | `client/public/fonts/inter.json` | Activo en `/fonts/` | Servido cache-first por `sw.js:24` sin hash en el nombre; si cambia el atlas tipográfico dentro de una época, los clientes conservan el JSON viejo. |

---

## 3. Política de Datos: Qué Conservar, Reconstruir, Versionar o Retirar

| Categoría | Fuente de autoridad | Acción ante incompatibilidad / corrupción |
|---|---|---|
| Proyecciones de cadena (`cards`, `matches`, `rune_ledger`, `eitr_ledger`, `elo_ratings`, `sync_cursors`, `index-v1`) | Hive L1 / Indexer | **Reconstruir**: invalidar cursor o tabla afectada y re-sincronizar desde bloque inicial / snapshot IPFS validado. Nunca confiar en caché local sin validar. |
| Progreso local F1 (`local_settlements`, `local_campaign_*`, `local_card_progression`) | Navegador (solo F1; no promocionable a red compartida) | **Migrar o cuarentenar**: validar esquema al leer; aislar registros inválidos en store/clave de diagnóstico sin romper la app ni inflar saldos. |
| Preferencias y mazos locales (`settings`, `heroDeckStore`, `tutorialStore`) | Navegador (particionado por cuenta y `resetEpoch`) | **Conservar con migración explícita** por `version` de Zustand y limpieza de claves heredadas. |
| Datos derivados estáticos (`genesisCollection.json`, `starterCollection.json`, `campaign-registry.v1.json`, `duatSnapshot.json`) | Código fuente / snapshot congelado | **Versionar por SHA-256 + verificación en CI/tests**: prohibir copias públicas sin consumidor HTTP o servirlas con hash inmutable / `no-cache` + ETag. |
| Binario de motor (`engine.wasm`) | Build actual | **Direccionar por hash de contenido** (nombre hasheado o `engine.wasm?v=<wasmHash>`) y validar que coincida con `version.json`. |
| Cachés efímeras (`transcripts`, `p2p-match-resume`) | Temporal | **Acotar con TTL y cuota máxima**; descartar si expira o falla verificación criptográfica. |

---

## 4. Plan de Implementación por Fases

### Fase 0 — Caché, WASM y Anti-Drift de JSON Estáticos (Prioridad inmediata)

1. **Corregir caché de `engine.wasm`**:
   - Emitir el SHA-256 de `client/public/engine.wasm` durante el build (e incluirlo en `version.json` junto a `buildHash`, `resetEpoch`, `campaignRegistryHash` y `cardRegistryHash`).
   - Cargar `engine.wasm` usando su URL versionada (`engine.wasm?v=<wasmHash>` o archivo emitido en `assets/engine.<hash>.wasm`).
   - En `client/public/sw.js`: aplicar `cache-first` únicamente a `.wasm` con hash inmutable; para `/engine.wasm` sin hash usar `network-first` (o bypass). Excluir también `/manifest.json` junto a `/version.json`.
   - En `server/static.ts`: definir `Cache-Control: no-cache, must-revalidate` para `/engine.wasm` y `/data/*.json` (o `immutable` únicamente si llevan hash en el nombre).
2. **Asegurar integridad y eliminar exposición innecesaria de JSON derivados**:
   - Añadir una prueba unitaria/CI de integridad que verifique:
     - `campaign-registry.v1.json` coincide con `CAMPAIGN_REGISTRY_HASH`.
     - `genesisCollection.json` y `starterCollection.json` coinciden con la salida actual de `genCollections.ts` (cero drift respecto a `cardRegistry` y `RARITY_TABLE`).
     - `duatSnapshot.json` mantiene su hash congelado y `stats.totalPacks`.
   - Mover `genesisCollection.json` y `starterCollection.json` fuera de `client/public/data/` (por ejemplo a `shared/generated/`) si ningún cliente los descarga por HTTP, reduciendo ~624 KB de estáticos sin control de caché en `dist/public/data/`. Si se mantiene consumo HTTP futuro, publicar un manifiesto versionado con SHA-256.
3. **Endurecer `server/services/starterClaimRegistry.ts`**:
   - Particionar la ruta por fase/`resetEpoch` (igual que `chainState.ts`) e incluir `runtimeFingerprint` en el JSON.
   - Escribir de forma atómica (`writeFile` a temporal único + `rename`) detrás de una cola secuencial de escritura en memoria para evitar carreras HTTP.

**Criterio de salida F0**: tests de integridad de JSON en verde; prueba de `sw.js` y `server/static.ts` confirmando que un nuevo `engine.wasm` nunca queda retenido en caché de una versión anterior; prueba de escritura concurrente y separación por época en `starterClaimRegistry`.

---

### Fase 1 — Endurecimiento de IndexedDB en Cliente (Prioridad P1)

1. **Capa compartida de apertura y transacciones (`client/src/lib/storage/idbLifecycle.ts`)**:
   - Deduplicar aperturas concurrentes (`inFlightOpen`), registrar `db.onversionchange` (cerrar conexión, limpiar caché de handle y emitir evento de recarga coordinada) y manejar `req.onblocked` (estado recuperable para UI en lugar de promesa colgada indefinidamente).
   - Estandarizar helpers de escritura para resolver **exclusivamente en `tx.oncomplete`** y rechazar en `tx.onerror` / `tx.onabort`.
   - Adoptar esta capa en las 5 bases (`replayDB.ts`, `indexDB.ts`, `actionLog.ts`, `p2pMatchResume.ts`, `transcriptIPFS.ts`).
2. **Validación en tiempo de ejecución en `replayDB.ts`**:
   - Introducir validadores estrictos (sin casts ciegos) al leer `sync_cursors`, `rune_ledger`, `eitr_ledger`, `cards`, `elo_ratings`, `token_balances`, `local_settlements` y `local_campaign_settlements`.
   - Clasificar cada lectura en `missing | legacy_migratable | corrupt`:
     - En proyecciones on-chain corruptas: reiniciar el cursor del store afectado y disparar re-replay desde Hive.
     - En registros locales F1 corruptos: mover a un store de cuarentena diagnóstica (`corrupt_records`) para no perder trazabilidad ni contaminar sumatorias.
   - Normalizar `local_campaign_eitr` con esquema explícito y actualizar comentarios/constantes de versión.
3. **Atomicidad y concurrencia en liquidaciones e índice local**:
   - En `localP2PSettlement.ts` + `replayDB.ts:388` (`commitLocalSettlement`): leer ELO/wins/losses, calcular la actualización y escribir el evento + proyección dentro de la **misma transacción `readwrite`** (o verificar revisión optimista y reintentar).
   - En `indexDB.ts`: unir `clear()` + `put()` de `putLeaderboard` y `putSupplyCounters` en una sola transacción; hacer `applyOptimisticElo` atómico en una sola transacción.
   - En `transcriptIPFS.ts`: añadir límite de entradas/TTL (evicción LRU por `storedAt`) y verificación de integridad antes de devolver un bundle cacheado.
4. **Suite de pruebas de migración y resiliencia**:
   - Fixtures de versiones previas (v16–v20) → upgrade a versión actual verificando conservación de datos válidos y aislamiento de registros corruptos.
   - Pruebas de dos eventos concurrentes de liquidación para las mismas cuentas.
   - Pruebas de `versionchange` / `blocked` simulando dos pestañas.

**Criterio de salida F1**: cero lecturas críticas sin validación en `replayDB`; todas las escrituras IDB confirmadas en `tx.oncomplete`; pruebas verdes para migración, concurrencia y dos pestañas.

---

### Fase 2 — Eliminar Doble Fuente de Verdad en `localStorage` y `saveStateManager` (Prioridad P1/P2)

1. **Adelgazar `useHiveDataStore` (`client/src/data/HiveDataLayer.ts`)**:
   - Persistir en `localStorage` solo la identidad mínima de sesión (`user` / cuenta activa) necesaria para el bootstrap de `accountScopedStorage`.
   - Dejar `cardCollection`, `packCollection`, `tokenBalance`, `stats` y `recentMatches` como estado reactivo en memoria hidratado únicamente desde `replayDB` (con bandera `hydratedFromEpoch` / `isHydrated`).
2. **Unificar claves y endurecer `saveStateManager.ts`**:
   - Eliminar duplicados en `storageKeys.ts` y centralizar todas las claves persistidas.
   - Corregir `restoreSaveState` para usar acciones/setters reales de `useCampaignStore`, validar el esquema del archivo importado con Zod y rechazar (o exigir confirmación explícita) cuando falle el checksum.

**Criterio de salida F2**: cambiar de cuenta o limpiar IndexedDB nunca muestra cartas/saldos fantasma provenientes de `localStorage`; import/export de `saveStateManager` cubierto por pruebas round-trip y de manipulación de checksum.

---

### Fase 3 — Persistencia del Servidor: Snapshot No Bloqueante y Paridad PostgreSQL (Prioridad P2)

1. **Mejora inmediata para despliegue con JSON (`server/services/chainState.ts`)**:
   - Evitar bloquear el event loop durante `saveState()`: pasar a escritura asíncrona (`fs.promises.writeFile` sobre archivo temporal con PID/timestamp + `fh.sync()` + `fs.promises.rename`), evitando solapamiento con una bandera `saveInFlight` + re-flush si `_dirty` volvió a activarse.
   - En `loadState()`: ante JSON corrupto o fallo de esquema Zod, **no** arrancar silenciosamente vacío; mover el archivo dañado a `.corrupt-<ts>` o fallar en arranque según configuración explícita (`CHAIN_STATE_RECOVERY_MODE=fail|rebuild`) para que el operador sepa si se requiere re-indexar desde `indexStartBlock`.
2. **Maduración a PostgreSQL (previo a beta/mainnet de alta escala)**:
   - Completar `server/db/ragnarok_schema.sql` con:
     - Tabla `schema_migrations` y tabla `runtime_meta` (persistiendo `runtime_fingerprint` y validándolo en arranque igual que `chainState.ts`).
     - Tablas faltantes: `matches`, `eitr_ledger`, `forge_commits`, `campaign_submissions`, `campaign_progress`, `duat_claims`, `reward_claims`, `slashed_accounts`, `pack_commits`, `pack_supply`.
     - Índices por `owner`, `account`, `season_id`, `block_num` y `nft_uid`.
   - Completar todos los métodos de `server/services/pgStateAdapter.ts` y ejecutar una suite compartida de contrato (`StateAdapter` contract tests) tanto contra `chainState` (memoria/JSON) como contra `pgStateAdapter`.
   - Crear script de migración verificada `chain-state.<phase>.json` → PostgreSQL con conteos y hash de proyección (siguiendo el patrón de `chainStateMigration.ts`).

**Criterio de salida F3**: cero llamadas `writeFileSync` en el ciclo de 30 s del servidor; manejo determinista de estado corrupto; paridad 100 % de `StateAdapter` antes de activar `pgStateAdapter` en producción.

---

### Fase 4 — Reanudación P2P Verificable (Prerrequisito antes de desbloquear hard reload)

- Mantener bloqueada la recarga completa en `useP2PMatchResume.ts:36` hasta que:
  1. `computeResumeSeal` cubra el estado completo de juego/combate o el snapshot pase a ser únicamente un acelerador cuya validez se compruebe reproduciendo `actionLog.ts` (hojas firmadas) hasta el último `phase_checkpoint` notarizado por el árbitro.
  2. Se integre la ceremonia aprobada de renovación de clave de sesión (`session_renewal`) con validación del rival y del último checkpoint acordado.

---

## 5. Orden Recomendado de Ejecución

1. **Fase 0** (caché de `engine.wasm`, `sw.js`, `server/static.ts`, tests anti-drift de JSON y atomicidad de `starterClaimRegistry.ts`) — elimina riesgos inmediatos en despliegues de testnet.
2. **Fase 1** (`idbLifecycle`, validación en lectura de `replayDB`, transacción única en `localP2PSettlement` e `indexDB`).
3. **Fase 2** (desacoplar proyecciones de `HiveDataLayer` en `localStorage` y corregir `saveStateManager`).
4. **Fase 3** (flush asíncrono + recuperación determinista en `chainState.ts`, luego completar esquema y adaptador PostgreSQL).
5. **Fase 4** (cuando se priorice habilitar recarga P2P completa en Alfa/Beta).

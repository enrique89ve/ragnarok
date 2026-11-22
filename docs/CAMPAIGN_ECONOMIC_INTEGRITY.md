# Integridad económica de campaña y Forja

## Contrato

- F1 mantiene el piloto local de Norse. Su saldo y su carta de demostración viven en el navegador.
- Las publicaciones de campaña v1 solo se admiten en un tramo histórico fijado por bloque. Por defecto el tramo está vacío. Las publicaciones nuevas requieren una victoria reproducible antes de modificar progreso o saldo.
- El compromiso de Forja confirma el débito junto con el compromiso. La liquidación confirma una carta y sus contadores, o un reembolso, junto con el cierre. Dos escritores concurrentes vuelven a comprobar saldo e inventario dentro de la escritura.
- Las reglas y claves históricas se conservan para reproducciones compatibles. La activación de premios nuevos necesita una política versionada vinculada al bloque irreversible original.

## Autoridad y evidencias

El resumen firmado de campaña identifica al publicador. La prueba de victoria requiere un inicio autorizado con contexto y semilla, un transcript completo, y un replay de ajedrez, póker, cartas, IA y reglas de jefe. La evidencia de aceptación es una victoria real de Norse reproducida independientemente, además de rechazos de derrotas, transcripts incompletos y reglas o mazos incompatibles.

El protocolo compartido prepara las escrituras de Forja. El indexador aplica el conjunto validado en una mutación síncrona y el navegador usa una transacción IndexedDB. Las pruebas comprueban doble apertura, doble cierre, reintento y contadores. El adaptador PostgreSQL experimental requiere su propia implementación transaccional antes de operar Forja.

## Reproducción y activación

`VITE_RAGNAROK_LEGACY_CAMPAIGN_RESULT_LAST_BLOCK` delimita el último bloque histórico admisible. El valor debe corresponder a un bloque irreversible acordado y coincidir en el servidor y el cliente. Sin valor, el historial admisible de campañas v1 está vacío. El corte forma parte de la huella de F2 y F3, y selecciona la base reproducible del navegador. Los snapshots del servidor con otra huella requieren reconstrucción desde el historial aplicable.

Antes de emitir Eitr de campaña con valor canjeable faltan el replay independiente de una victoria completa, una política versionada de emisión con clave única por cuenta, misión y temporada, y la prueba del corte con datos de la red correspondiente. La Forja necesita además paridad del catálogo entre ambos reproductores y un corte para conectar el finalizador por vencimiento al indexador. El piloto F1 usa sus propias vistas previas.

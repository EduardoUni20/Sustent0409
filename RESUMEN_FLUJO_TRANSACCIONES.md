# Resumen del flujo de transacciones

Este documento ubica en el código las validaciones, el HMAC, la ventana deslizante, la detección de anomalías, los logs, las respuestas y el uso de memoria.

Raíz actual del proyecto: `C:\Users\Usuario\Desktop\Sustent0409`

## Flujo general

1. El emisor envía una transacción a `POST /api/transactions`.
2. El endpoint valida el JSON y cada transacción con Zod.
3. El servidor recalcula el HMAC y compara el resultado con el valor recibido.
4. El servidor elige el tamaño de ventana según la fecha y configuración.
5. El endpoint llama a Supabase, que persiste la transacción y evalúa las anomalías.
6. El endpoint responde con el resultado de cada transacción.

## Validaciones

- Archivo: `C:\Users\Usuario\Desktop\Sustent0409\lib\transactionSchema.js`
  - `txnSchema` valida `idTxn` numérico no negativo, correo, fecha, valor, método de pago y hash opcional.
- Archivo: `C:\Users\Usuario\Desktop\Sustent0409\app\api\transactions\route.js`
  - `normalizeTransaction` aplica el esquema y prepara cada transacción.
  - `POST` valida que el cuerpo sea JSON, acepta un arreglo, `{ transactions: [...] }` o un objeto individual, limita el lote a 1.000 y comprueba `WINDOW_SECONDS` y `TRANSACTION_THRESHOLD`.
  - El lote se ordena por fecha antes de procesarse.
  - El endpoint no exige `x-api-key` en esta versión.

## HMAC, integridad y criptografía

- Archivo: `C:\Users\Usuario\Desktop\Sustent0409\lib\transactionHash.js`
  - `validateTransactionHash` calcula HMAC-SHA-256 sobre `idTxn,user,date,value,paymentMethod`, en ese orden.
  - Usa `HASH_SECRET`, valida la codificación `hex` o `base64` y compara en tiempo constante con `timingSafeEqual`.
  - El servidor verifica el HMAC; el emisor debe calcularlo y enviarlo usando los mismos campos, el mismo orden y el mismo secreto.
  - HMAC verifica integridad/autenticidad de los campos firmados, pero no cifra la transacción.
- Archivo de configuración de ejemplo: `C:\Users\Usuario\Desktop\Sustent0409\.env.example`
  - Documenta `HASH_ALGORITHM`, `HASH_ENCODING`, `HASH_FIELDS` y `HASH_SECRET`. El valor de secreto mostrado es un marcador de ejemplo, no debe usarse como secreto de producción.
- Archivo: `C:\Users\Usuario\Desktop\Sustent0409\supabase\schema.sql`
  - Declara la extensión `pgcrypto`; el cálculo del HMAC de transacción se hace en Node mediante `node:crypto`, no con esa extensión.

Un hash faltante o que no coincide devuelve `valid: false`, pero no cancela el ingreso. Se conserva la transacción con `hash_valid = false` y se registra como anomalía `HASH_INVALIDO`. No cuenta para la detección de velocidad.

## Ventana deslizante y detección

- Archivo: `C:\Users\Usuario\Desktop\Sustent0409\lib\slidingWindowConfig.js`
  - `getSlidingWindowConfig` escoge la ventana según la fecha y `WINDOW_TIME_ZONE`.
  - Valores predeterminados: 10 transacciones de 05:00:01 a 12:00:00, 6 de 12:00:01 a 20:00:00 y 3 durante el resto del día. Los tamaños se pueden configurar con `MORNING_WINDOW_SIZE`, `AFTERNOON_WINDOW_SIZE` y `NIGHT_WINDOW_SIZE`.
- Archivo: `C:\Users\Usuario\Desktop\Sustent0409\app\api\transactions\route.js`
  - Lee `WINDOW_SECONDS` (predeterminado 3) y `TRANSACTION_THRESHOLD` (predeterminado 3), calcula el tamaño aplicable y envía esos valores al procedimiento SQL.
- Archivo: `C:\Users\Usuario\Desktop\Sustent0409\supabase\schema.sql`
  - `process_transaction` serializa por correo, guarda la transacción, cuenta las transacciones de hash válido dentro de los segundos configurados y del tamaño máximo de ventana.
  - Si alcanza el umbral, registra `POSIBLE_FRAUDE`: nivel `medium` al alcanzar el umbral, `high` al duplicarlo y `critical` al triplicarlo.
  - Un mismo `idTxn` duplicado no se inserta de nuevo. La restricción única `(transaction_id, type)` evita duplicar el mismo tipo de anomalía para una transacción.

## Logs y diagnóstico

- Archivo: `C:\Users\Usuario\Desktop\Sustent0409\lib\slidingWindowDiagnostics.js`
  - `logHashDiagnostics` muestra el algoritmo, codificación, campos y validez. No imprime el HMAC recibido.
  - `logAnomalyLifecycle` registra eventos del dashboard.
- Archivo: `C:\Users\Usuario\Desktop\Sustent0409\app\api\transactions\route.js`
  - Usa `console.warn` para HMAC inválidos y `console.error` cuando falla la validación/configuración o Supabase.
- Archivos de APIs: `C:\Users\Usuario\Desktop\Sustent0409\app\api\dashboard\route.js`, `C:\Users\Usuario\Desktop\Sustent0409\app\api\anomalies\route.js`, `C:\Users\Usuario\Desktop\Sustent0409\app\api\anomalies\[id]\route.js` y `C:\Users\Usuario\Desktop\Sustent0409\app\api\transactions\list\route.js`
  - Registran errores al consultar o actualizar datos.
- Archivo: `C:\Users\Usuario\Desktop\Sustent0409\components\SlidingWindowDashboard.js`
  - Registra en la consola del navegador eventos como dashboard cargado, errores de carga y cambios de estado. Los logs de hash pueden contener correo y otros datos de transacción, por lo que deben tratarse como información sensible.

## Respuestas y rutas API

- `POST /api/transactions`
  - Código: `C:\Users\Usuario\Desktop\Sustent0409\app\api\transactions\route.js`
  - En éxito devuelve `received`, la configuración de ventana y `results`, con validez del HMAC, conteo, duplicado y anomalías.
  - Errores típicos: JSON inválido `400`, datos inválidos `422`, lote sobre 1.000 `413`, error al guardar `500`.
- `GET /api/transactions/list?page=1&pageSize=50`
  - Código: `C:\Users\Usuario\Desktop\Sustent0409\app\api\transactions\list\route.js`
  - Devuelve transacciones paginadas; el tamaño predeterminado es 50 y el máximo 100.
- `GET /api/dashboard`
  - Código: `C:\Users\Usuario\Desktop\Sustent0409\app\api\dashboard\route.js`
  - Llama a `get_transaction_dashboard` en SQL y devuelve métricas, series y anomalías.
- `GET /api/anomalies?page=1&pageSize=50&status=open`
  - Código: `C:\Users\Usuario\Desktop\Sustent0409\app\api\anomalies\route.js`
  - Lista anomalías, con filtro opcional por `open`, `reviewed` o `discarded`; admite hasta 100 por página.
- `PATCH /api/anomalies/[id]`
  - Código: `C:\Users\Usuario\Desktop\Sustent0409\app\api\anomalies\[id]\route.js`
  - Valida el UUID y el estado y llama a `update_anomaly_status` en SQL.
- `OPTIONS /api/transactions`
  - La misma ruta de ingreso responde `204` para la solicitud CORS.

## Uso de memoria

No hay una medición explícita de memoria del proceso. El endpoint de ingreso conserva temporalmente en Node los elementos del lote y sus resultados, con un máximo de 1.000 transacciones. La API de listado pagina los resultados.

En el navegador, `SlidingWindowDashboard.js` conserva las transacciones cargadas en estado; al elegir cargar todas las páginas, estas se acumulan. Además, `get_transaction_dashboard` en `schema.sql` agrega las anomalías para el dashboard sin un límite visible en esa consulta. Por tanto, el sistema no implementa una cola de ventana residente en memoria: la ventana se calcula consultando los registros persistidos en Supabase.

## Archivos principales

- Variables de ejemplo: `C:\Users\Usuario\Desktop\Sustent0409\.env.example`
- Esquema Zod: `C:\Users\Usuario\Desktop\Sustent0409\lib\transactionSchema.js`
- Ingreso y respuesta de transacciones: `C:\Users\Usuario\Desktop\Sustent0409\app\api\transactions\route.js`
- Verificación HMAC: `C:\Users\Usuario\Desktop\Sustent0409\lib\transactionHash.js`
- Configuración de ventana: `C:\Users\Usuario\Desktop\Sustent0409\lib\slidingWindowConfig.js`
- Logs y diagnóstico: `C:\Users\Usuario\Desktop\Sustent0409\lib\slidingWindowDiagnostics.js`
- Detección, persistencia y métricas SQL: `C:\Users\Usuario\Desktop\Sustent0409\supabase\schema.sql`
- Dashboard: `C:\Users\Usuario\Desktop\Sustent0409\components\SlidingWindowDashboard.js`
- Guía existente: `C:\Users\Usuario\Desktop\Sustent0409\SLIDING_WINDOW_README.md`

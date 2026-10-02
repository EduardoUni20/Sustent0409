# Sliding Window: guía completa del módulo

## 1. ¿Qué es este módulo?

Este módulo se encarga de detectar patrones sospechosos en transacciones usando una estrategia de ventana deslizante.

La idea es simple:

- se reciben transacciones por usuario
- se ordenan por fecha
- se revisa un rango de tiempo reciente
- si la cantidad de transacciones en ese rango supera el umbral configurado, se marca como anomalía

Esto se usa para detectar comportamientos como:

- varios pagos muy rápidos del mismo usuario
- intentos repetidos en pocos segundos
- patrones inusuales que no deberían ocurrir en una venta normal

---

## 2. ¿Dónde empieza todo?

La entrada es esta página:

- [app/ventana-deslizante/page.js](app/ventana-deslizante/page.js)

Y ahí se renderiza el componente principal:

- [components/SlidingWindowDashboard.js](components/SlidingWindowDashboard.js)

Ese componente se encarga de:

1. cargar los datos del dashboard
2. mostrar KPIs
3. dibujar gráficos
4. mostrar la tabla de anomalías recientes
5. mostrar usuarios recurrentes
6. permitir revisar o descartar anomalías

---

## 3. Mapa del módulo por responsabilidades

### 3.1 Vista principal

- [app/ventana-deslizante/page.js](app/ventana-deslizante/page.js) — entry point de la vista
- [components/SlidingWindowDashboard.js](components/SlidingWindowDashboard.js) — composición del dashboard completo

### 3.2 Componentes UI pequeños

- [components/sliding-window/MetricCard.js](components/sliding-window/MetricCard.js) — KPI cards
- [components/sliding-window/ChartCard.js](components/sliding-window/ChartCard.js) — wrapper para gráficas con estado vacío
- [components/sliding-window/EmptyChart.js](components/sliding-window/EmptyChart.js) — bloque visual para ausencia de datos
- [components/sliding-window/RecentAnomaliesTable.js](components/sliding-window/RecentAnomaliesTable.js) — tabla paginada de anomalías

### 3.3 APIs

- [app/api/dashboard/route.js](app/api/dashboard/route.js) — devuelve la configuración completa del dashboard
- [app/api/transactions/route.js](app/api/transactions/route.js) — recibe transacciones y valida el hash antes de persistirlas
- [app/api/transactions/list/route.js](app/api/transactions/list/route.js) — lista transacciones paginadas
- [app/api/anomalies/[id]/route.js](app/api/anomalies/[id]/route.js) — actualiza el estado de una anomalía

### 3.4 Lógica de negocio y seguridad

- [lib/transactionHash.js](lib/transactionHash.js) — calcula y valida hashes
- [lib/slidingWindowDiagnostics.js](lib/slidingWindowDiagnostics.js) — logs y diagnóstico para entender errores o comportamientos

### 3.5 Base de datos

- [supabase/schema.sql](supabase/schema.sql) — aquí está la lógica SQL principal: dashboard, detección de anomalías y manejo del sliding window
- [supabase/dashboard_migration.sql](supabase/dashboard_migration.sql) — configuración de permisos para funciones de Supabase

---

## 4. Flujo completo del dashboard

### Paso 1: carga inicial

Cuando la página carga, el componente principal ejecuta `fetch('/api/dashboard')`.

Eso pide data a:

- [app/api/dashboard/route.js](app/api/dashboard/route.js)

Ese endpoint invoca la función SQL:

- `get_transaction_dashboard()`

La lógica SQL en [supabase/schema.sql](supabase/schema.sql) genera un JSON con:

- `periods` → hoy, semana, mes
- `totals` → total, anomalías, hashes inválidos, usuarios afectados
- `statuses` → estado de anomalías
- `hourly` → anomalías por hora
- `weekly` → actividad semanal
- `paymentMethods` → métodos de pago
- `recurrentUsers` → usuarios repetidos
- `recentAnomalies` → últimas anomalías

Luego React pinta los KPIs, gráficos y tablas.

### Paso 2: tabla de anomalías paginada

La tabla de anomalías recientes ya no es infinita. Está modularizada en:

- [components/sliding-window/RecentAnomaliesTable.js](components/sliding-window/RecentAnomaliesTable.js)

Tiene:

- paginación por páginas
- 10 registros por página
- botones Anterior / Siguiente
- acciones de Revisar / Descartar

Esto evita que la vista se vuelva demasiado larga verticalmente.

### Paso 3: usuarios recurrentes paginados

La lista de usuarios recurrentes también está paginada dentro del mismo dashboard.

Se hace directamente en:

- [components/SlidingWindowDashboard.js](components/SlidingWindowDashboard.js)

Esta parte calcula:

- total de páginas
- página actual
- sublista visible por página

La idea es la misma: no bombardear a la UI con una lista infinita.

---

## 5. ¿Dónde se crean y validan los hashes?

La validación de hash ocurre en backend, no en el navegador.

### Archivo clave

- [lib/transactionHash.js](lib/transactionHash.js)

### Qué hace exactamente

1. Recibe una transacción
2. Lee configuración desde variables de entorno
3. Toma solo los campos autorizados para crear el hash
4. Construye un objeto canónico
5. Serializa con `JSON.stringify(...)`
6. Genera el digest usando SHA-256 o HMAC-SHA-256
7. Compara el hash recibido con el calculado
8. Devuelve `{ valid, algorithm, encoding, fields }`

### Variables relevantes

Las variables esperadas suelen ser:

```env
HASH_ALGORITHM=sha256
HASH_ENCODING=hex
HASH_FIELDS=idTxn,user,date,value,paymentMethod
HASH_SECRET=tu_secreto
```

### Ejemplo de campos usados para hash

Se toma un objeto como:

```js
{
  idTxn: "TXN_001",
  user: "usuario@correo.com",
  date: "2026-10-02T12:44:00.000Z",
  value: 120,
  paymentMethod: "CREDIT_CARD"
}
```

y luego se serializa para producir el hash.

---

## 6. Flujo completo de ingreso de una transacción

### Paso A: el cliente manda payload

Puede venir desde:

- [postman.md](postman.md)
- o desde un cliente real que haga POST a [app/api/transactions/route.js](app/api/transactions/route.js)

### Paso B: la API valida

En [app/api/transactions/route.js](app/api/transactions/route.js) se hace:

```js
hashResult = validateTransactionHash(transaction);
logHashDiagnostics(transaction, hashResult);
```

Eso significa:

- se valida el hash
- se loguea la información
- si falla, la API responde con error
- si pasa, se sigue con la inserción

### Paso C: Supabase procesa la transacción

La transacción se envía a una función RPC llamada `process_transaction` en [supabase/schema.sql](supabase/schema.sql).

Allí hace:

- guardar la transacción
- registrar si el hash fue válido
- calcular si hay anomalía por ventana deslizante
- crear el registro de anomalía si aplica

### Paso D: dashboard refleja resultados

Después de eso:

- [app/api/dashboard/route.js](app/api/dashboard/route.js) trae los datos del dashboard
- [components/SlidingWindowDashboard.js](components/SlidingWindowDashboard.js) los muestra

---

## 7. ¿Qué es la ventana deslizante aquí?

La idea de “sliding window” es revisar el conjunto de transacciones recientes por usuario dentro de un rango temporal.

Ejemplo:

- un usuario hace 5 transacciones en 3 segundos
- el sistema tiene `WINDOW_SECONDS = 3`
- y `TRANSACTION_THRESHOLD = 3`

Entonces:

- mira el intervalo de las últimas 3 segundos
- cuenta cuántas transacciones hay en ese rango
- si supera el umbral, marca anomalía

Eso está definido en la lógica SQL [supabase/schema.sql](supabase/schema.sql) y en el endpoint [app/api/transactions/route.js](app/api/transactions/route.js) con variables como:

```js
const windowSeconds = Number(process.env.WINDOW_SECONDS || 3);
const threshold = Number(process.env.TRANSACTION_THRESHOLD || 3);
```

---

## 8. Logs y diagnóstico de problemas

Este módulo ya tiene diagnóstico de logs en:

- [lib/slidingWindowDiagnostics.js](lib/slidingWindowDiagnostics.js)

### Funciones disponibles

- `buildHashDiagnostics(transaction, result)`
  - arma un resumen entendible del hash

- `logHashDiagnostics(transaction, result)`
  - imprime algoritmo, encoding, campos y si el hash fue válido

- `logAnomalyLifecycle(event, payload)`
  - registra eventos del ciclo de vida de una anomalía

### Ejemplo de lo que ves en consola

```js
[SlidingWindow] Hash diagnostics
transaction: { idTxn, user, date, value, paymentMethod }
hash: { algorithm, encoding, fields, valid }
```

Y también:

```js
[SlidingWindow] anomaly_status_updated
[SlidingWindow] dashboard_loaded
[SlidingWindow] transactions_error
```

Esto permite responder preguntas como:

- ¿Qué campos formaron el hash?
- ¿Qué algoritmo se usó?
- ¿El hash fue rechazado?
- ¿La anomalía se cargó bien o falló?
- ¿El dashboard se actualizó correctamente?

### Importante

Estos logs son de depuración. No son almacenamiento persistente de auditoría. Son útiles para analizar errores y comportamiento en tiempo real, pero para trazabilidad seria recomendable guardarlos en una tabla de logs.

---

## 9. ¿Cómo leer el flujo en orden correcto?

Si quieres entenderlo de principio a fin, sigue este orden:

1. [app/ventana-deslizante/page.js](app/ventana-deslizante/page.js)
2. [components/SlidingWindowDashboard.js](components/SlidingWindowDashboard.js)
3. [app/api/dashboard/route.js](app/api/dashboard/route.js)
4. [supabase/schema.sql](supabase/schema.sql)
5. [app/api/transactions/route.js](app/api/transactions/route.js)
6. [lib/transactionHash.js](lib/transactionHash.js)
7. [lib/slidingWindowDiagnostics.js](lib/slidingWindowDiagnostics.js)
8. [components/sliding-window/RecentAnomaliesTable.js](components/sliding-window/RecentAnomaliesTable.js)

---

## 10. Resumen corto

Este módulo tiene 4 capas principales:

- UI: dashboard, tablas, métricas, gráficos
- API: entradas y salidas del backend
- lógica de negocio: detección por ventana deslizante
- seguridad: validación y generación de hashes

Todo está separado para que puedas rastrear qué pasa exactamente en cada punto y saber en qué archivo buscar cuando el flujo falla.

---

## 11. Siguientes mejoras recomendadas

Estas son mejoras razonables para dejarlo más robusto:

- guardar logs de validación en una tabla de base de datos
- agregar alertas cuando un hash falla repetidamente
- exportar anomalías por fecha o usuario
- paginar también las transacciones con controles más avanzados
- separar aún más la lógica SQL de la vista del frontend

Si quieres, en el siguiente paso te dejo una versión aún más avanzada del README con:

- diagrama de flujo
- explicación de cada función SQL
- ejemplos reales de payload y respuesta
- checklist de troubleshooting del módulo

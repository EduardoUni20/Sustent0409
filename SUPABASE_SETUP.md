# Configuración de Supabase para ModaLab

La aplicación se ejecuta en Next.js y guarda la información en tu propio proyecto
de Supabase. El archivo de base de datos no vive en Vercel. La clave de servicio
se utiliza solo en las rutas del servidor; nunca la publiques como `NEXT_PUBLIC_*`.

## 1. Crear la base de datos

1. Entra en [supabase.com](https://supabase.com/) y crea un proyecto.
2. Guarda la contraseña de la base de datos que solicite Supabase.
3. Abre **SQL Editor** en el panel del proyecto.
4. Copia y ejecuta el contenido completo de [`supabase/schema.sql`](./supabase/schema.sql).
   El script crea `users`, `transactions`, `anomalies` y las funciones SQL usadas
   para registrar transacciones y calcular estadísticas.

## 2. Conectar Next.js

1. En Supabase abre **Project Settings → API Keys** (en algunos proyectos aparece
   como **Project Settings → API**).
2. La URL puede configurarse como `SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_URL`.
   Para el servidor, copia una clave **secret** y guárdala como
   `SUPABASE_SECRET_KEY`. En proyectos antiguos puedes usar la clave
   `service_role` con el nombre `SUPABASE_SERVICE_ROLE_KEY`.
   No uses la **publishable** key (`sb_publishable_...`) para este fin: no tiene
   permisos administrativos para ejecutar la escritura segura del endpoint.
   La clave secreta/service role es privada: no la pongas en el navegador, en Git
   ni en una variable cuyo nombre empiece con `NEXT_PUBLIC_`.
3. Crea `.env.local` en la carpeta raíz del proyecto, al lado de `package.json`,
   copiando [`.env.example`](./.env.example) y reemplazando los valores:

   ```env
   SUPABASE_URL=https://TU-PROYECTO.supabase.co
   SUPABASE_SECRET_KEY=TU_CLAVE_SECRETA_PRIVADA
   WINDOW_SECONDS=3
   TRANSACTION_THRESHOLD=3
   HASH_ALGORITHM=sha256
   HASH_ENCODING=hex
   HASH_FIELDS=idTxn,user,date,value,paymentMethod
   ```

4. En local ejecuta `npm run dev`. Para producción, agrega en **Vercel → Project
   → Settings → Environment Variables** tanto `SUPABASE_URL` como
   `SUPABASE_SECRET_KEY` para el entorno **Production**. `SUPABASE_URL` debe
   corresponder al mismo host de proyecto que usas localmente. Después de cambiar
   variables, crea un nuevo deployment para que la función de Vercel las reciba.
   No es necesario volver a desplegar cada vez que ingresen transacciones.

### Si aparece `permission denied for function get_transaction_dashboard`

En el **SQL Editor** del mismo proyecto de Supabase, ejecuta:

```sql
grant usage on schema public to service_role;
grant execute on function public.get_transaction_dashboard() to service_role;
grant execute on function public.process_transaction(
  text, text, timestamptz, numeric, text, text, boolean, text, text, integer, integer
) to service_role;

select
  has_function_privilege(
    'service_role',
    'public.get_transaction_dashboard()',
    'execute'
  ) as dashboard_permission,
  has_function_privilege(
    'service_role',
    'public.process_transaction(text,text,timestamptz,numeric,text,text,boolean,text,text,integer,integer)',
    'execute'
  ) as transaction_permission;
```

Los dos resultados deben ser `true`. Si el SQL Editor muestra `false`, confirma
que ejecutaste el bloque completo en el proyecto correcto. Después reinicia
`npm run dev`. Si ambos son `true` pero el error continúa, revisa que
`SUPABASE_SECRET_KEY` sea la clave **secret** del mismo proyecto (o que
`SUPABASE_SERVICE_ROLE_KEY` sea la clave `service_role` antigua), y no una clave
publishable.

### Comprobar si existen anomalías para mostrar

Ejecuta esto en el SQL Editor del mismo proyecto Supabase configurado en Vercel:

```sql
select
  (select count(*) from public.transactions) as total_transactions,
  (select count(*) from public.transactions where hash_valid) as valid_hash_transactions,
  (select count(*) from public.transactions where not hash_valid) as invalid_hash_transactions,
  (select count(*) from public.anomalies) as total_anomalies;
```

El detector crea una anomalía durante el procesamiento del POST cuando se alcanza
el umbral con transacciones de hash válido. No reconstruye anomalías
retroactivamente al abrir o actualizar el dashboard. Por eso puede haber
transacciones y cero anomalías si se recibieron fuera de la misma ventana, sus
hashes no validaron o se guardaron antes de activar la regla. Comprueba la
respuesta del POST: para el evento que supera el umbral debe indicar
`hashValid: true` y `anomaly: true`.

## 3. Enviar una transacción

El endpoint es `POST /api/transactions`. Acepta una transacción, un arreglo JSON
o `{ "transactions": [...] }`. Ejemplo de cuerpo:

```json
{
  "idTxn": 10001,
  "user": "aa@aa.com",
  "date": "2026-09-23T10:30:01.120Z",
  "value": 50000,
  "paymentMethod": "Tarjeta",
  "hash": "HASH_SHA256_EN_HEXADECIMAL"
}
```

`date` debe ser ISO 8601; si llega sin zona horaria, se interpreta como UTC.
El endpoint también admite `email` en lugar de `user`, `id` en lugar de `idTxn`,
y `fecha`/`metodoPago` como alias.

La ventana inicial es de **3 segundos** y el umbral es **3 transacciones del
mismo usuario**. Puedes cambiarlos en `.env.local` o en las variables de Vercel.
Para enviar una lista de transacciones en una sola petición, se ordena por fecha
antes de analizarlas. El cálculo se hace por correo y las ventanas de usuarios
distintos no se mezclan. Los identificadores `idTxn` repetidos se informan como
duplicados.

## 4. Convención inicial del hash

La información recibida no indica el formato con el que el script del profesor
crea el hash. Como punto de partida, el endpoint calcula SHA-256 hexadecimal del
JSON compacto de estos campos, respetando el orden:

```js
JSON.stringify({
  idTxn: 10001,
  user: "aa@aa.com",
  date: "2026-09-23T10:30:01.120Z",
  value: 50000,
  paymentMethod: "Tarjeta"
})
```

Para calcular el valor en un script Node.js con esa convención:

```js
const crypto = require("node:crypto");
const hash = crypto
  .createHash("sha256")
  .update(
    JSON.stringify({
      idTxn: 10001,
      user: "aa@aa.com",
      date: "2026-09-23T10:30:01.120Z",
      value: 50000,
      paymentMethod: "Tarjeta",
    }),
  )
  .digest("hex");
```

En este modo no existe una “clave” secreta. Si el profesor comparte otra fórmula,
ajusta `HASH_ALGORITHM` y `HASH_FIELDS` en `.env.local`/Vercel. Los campos
permitidos son `idTxn,user,date,value,paymentMethod,ip,state`, separados por
comas. Si el script usa HMAC-SHA256, selecciona `HASH_ALGORITHM=hmac-sha256` y
define `HASH_SECRET` con el secreto compartido; ambos lados deben usar el mismo.
El resultado se puede configurar como `HASH_ENCODING=hex` o `HASH_ENCODING=base64`.
Si los hashes del script no coinciden, pide el algoritmo, los campos y su orden,
la codificación del resultado (hexadecimal/base64) y la representación exacta
de los datos; no basta con cambiar una clave si el script usa SHA-256 sin HMAC.
Si el hash no coincide, la transacción queda guardada con `hash_valid=false`,
pero no participa en las ventanas ni genera anomalías. La respuesta lo señala
con `hashValid: false`.

## 5. Probar el endpoint

Desde PowerShell, con Next.js en ejecución, puedes probar que el endpoint recibe
POST. Sustituye `hash` por el hash correcto de acuerdo con la sección anterior:

```powershell
$body = @{
  idTxn = 10001
  user = "aa@aa.com"
  date = "2026-09-23T10:30:01.120Z"
  value = 50000
  paymentMethod = "Tarjeta"
  hash = "HASH_SHA256_EN_HEXADECIMAL"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/transactions" `
  -ContentType "application/json" -Body $body
```

El endpoint admite preflight `OPTIONS` para clientes web. Si defines
`INGEST_API_KEY`, el emisor debe enviar también el encabezado `x-api-key`.
`ALLOWED_ORIGIN` controla el origen CORS (por defecto `*`).

### Probar desde Postman

1. Inicia la aplicación con `npm run dev`.
2. Crea una petición **POST** a `http://localhost:3000/api/transactions`.
3. En **Headers**, agrega `Content-Type: application/json`. Si configuraste
   `INGEST_API_KEY` en `.env.local`, agrega también `x-api-key` con ese valor.
   No se necesita un token Bearer ni la clave de Supabase en Postman.
4. En **Body → raw → JSON**, pega este lote de prueba. Usa un correo de prueba
   y asegúrate de que los tres `idTxn` sean nuevos:

   ```json
   [
     {
       "idTxn": 910001,
       "user": "prueba@ejemplo.com",
       "date": "2026-10-02T17:10:00.000Z",
       "value": 50000,
       "paymentMethod": "Tarjeta"
     },
     {
       "idTxn": 910002,
       "user": "prueba@ejemplo.com",
       "date": "2026-10-02T17:10:01.000Z",
       "value": 30000,
       "paymentMethod": "Tarjeta"
     },
     {
       "idTxn": 910003,
       "user": "prueba@ejemplo.com",
       "date": "2026-10-02T17:10:02.000Z",
       "value": 20000,
       "paymentMethod": "Tarjeta"
     }
   ]
   ```

5. Abre **Scripts → Pre-request** (en algunas versiones, **Pre-request Script**)
   y pega lo siguiente. Calcula el hash para cada transacción usando la
   convención inicial documentada arriba y agrega el campo automáticamente:

   ```js
   const CryptoJS = require("crypto-js");
   const payload = JSON.parse(pm.request.body.raw);

   function addHash(transaction) {
     const canonical = {
       idTxn: transaction.idTxn,
       user: transaction.user,
       date: transaction.date,
       value: transaction.value,
       paymentMethod: transaction.paymentMethod,
     };
     return {
       ...transaction,
       hash: CryptoJS.SHA256(JSON.stringify(canonical)).toString(),
     };
   }

   const updatedPayload = Array.isArray(payload)
     ? payload.map(addHash)
     : Array.isArray(payload.transactions)
       ? { ...payload, transactions: payload.transactions.map(addHash) }
       : addHash(payload);

   pm.request.body.update({
     mode: "raw",
     raw: JSON.stringify(updatedPayload, null, 2),
   });
   ```

6. Pulsa **Send**. La respuesta debe tener HTTP `200`, tres resultados con
   `hashValid: true` y la tercera transacción debe reportar `anomaly: true`.
   Para probar la producción, cambia la URL por
   `https://sustent0409.vercel.app/api/transactions`. Abre
   `/ventana-deslizante` para ver el caso. Para repetir la prueba, usa tres
   `idTxn` distintos; el endpoint evita guardar identificadores duplicados.

## 6. Actualizar el dashboard ya creado en Supabase

Para ver todas las anomalías con paginación y cambiar su estado desde el dashboard,
ejecuta el contenido de [`supabase/dashboard_migration.sql`](./supabase/dashboard_migration.sql)
en el SQL Editor de Supabase. Este script es re-ejecutable: concede `EXECUTE`
solo a `service_role` para las funciones que llama el servidor, y reconstruye
anomalías faltantes para transacciones históricas con hash válido que cumplan la
regla predeterminada de 3 transacciones en 3 segundos.

No concedas `EXECUTE` a `anon` ni a `authenticated` para estas funciones. La app
las invoca desde rutas de servidor usando la clave privada de Supabase; abrirlas
a roles públicos permitiría invocar procesamiento o estadísticas directamente.
Tampoco uses `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public`, porque incluye
funciones que no necesita el cliente.

La tabla guarda todos los registros hasta la cuota de almacenamiento de tu plan;
el dashboard no intenta descargarlos todos en una única respuesta. Usa páginas
de 25, 50 o 100 registros por carga; usa “Cargar siguientes” o “Cargar todas”
para recorrer el historial completo. El endpoint acepta
hasta 1000 transacciones por petición para respetar límites de tamaño/tiempo de
Next.js y Vercel: envía datasets mayores en lotes sucesivos con IDs únicos.

## 7. Dashboard

Abre `/ventana-deslizante` en la aplicación. El dashboard muestra totales por
hoy/semana/mes, transacciones, anomalías y su estado, distribución horaria,
tendencia semanal, métodos de pago, usuarios recurrentes, y tablas paginadas de
anomalías recientes y transacciones. Usa “Cargar todas” para recorrer cada tabla.

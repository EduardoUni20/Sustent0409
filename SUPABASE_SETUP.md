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
   WINDOW_TIME_ZONE=America/Bogota
   MORNING_WINDOW_SIZE=10
   AFTERNOON_WINDOW_SIZE=6
   NIGHT_WINDOW_SIZE=3
   HASH_ALGORITHM=hmac-sha256
   HASH_ENCODING=hex
   HASH_FIELDS=idTxn,user,date,value,paymentMethod
   HASH_SECRET=TU_SECRETO_COMPARTIDO_ALEATORIO
   ```

4. En local ejecuta `npm run dev`. Para producción, agrega en **Vercel → Project
   → Settings → Environment Variables** `SUPABASE_URL`,
   `SUPABASE_SECRET_KEY`, `HASH_ALGORITHM`, `HASH_ENCODING`, `HASH_FIELDS` y
   `HASH_SECRET` para el entorno **Production**. Configura la misma `HASH_SECRET`
   en el bot autorizado usando un canal privado. No la publiques ni la incluyas
   en el JSON de la transacción. `SUPABASE_URL` debe corresponder al mismo host
   de proyecto que usas localmente. Después de cambiar variables, crea un nuevo
   deployment para que la función de Vercel las reciba.
   No es necesario volver a desplegar cada vez que ingresen transacciones.

### Si aparece `permission denied for function get_transaction_dashboard`

En el **SQL Editor** del mismo proyecto de Supabase, ejecuta:

```sql
grant usage on schema public to service_role;
grant execute on function public.get_transaction_dashboard() to service_role;
grant execute on function public.process_transaction(
  text, text, timestamptz, numeric, text, text, boolean, text, text, integer, integer, integer
) to service_role;

select
  has_function_privilege(
    'service_role',
    'public.get_transaction_dashboard()',
    'execute'
  ) as dashboard_permission,
  has_function_privilege(
    'service_role',
    'public.process_transaction(text,text,timestamptz,numeric,text,text,boolean,text,text,integer,integer,integer)',
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

La detección marca una posible anomalía cuando hay **3 o más transacciones con
hash válido del mismo usuario en 3 segundos**. Además, limita los datos evaluados
por una ventana móvil cuyo tamaño depende de la hora del campo `date`, interpretada
en `WINDOW_TIME_ZONE` (por defecto `America/Bogota`):

| Franja horaria | Tamaño de ventana |
| --- | ---: |
| 05:00:01–12:00:00 | 10 transacciones |
| 12:00:01–20:00:00 | 6 transacciones |
| 20:00:01–05:00:00 del día siguiente | 3 transacciones |

Los tamaños se pueden cambiar en `.env.local` o en las variables de Vercel con
`MORNING_WINDOW_SIZE`, `AFTERNOON_WINDOW_SIZE` y `NIGHT_WINDOW_SIZE`. La duración
y el umbral de anomalía se configuran por separado con `WINDOW_SECONDS` y
`TRANSACTION_THRESHOLD`. Al enviar un lote, se ordena por fecha para procesar cada
usuario cronológicamente; las ventanas de usuarios distintos no se mezclan.
Cualquier `idTxn` no vacío de texto o número es válido. Si se vuelve a enviar un
identificador ya registrado, se reporta como duplicado y no se inserta otra vez.

## 4. HMAC de autenticación de cada transacción

El endpoint requiere un HMAC-SHA-256 válido y no requiere un encabezado
`x-api-key`. Configura `HASH_SECRET` con el mismo secreto aleatorio en el
servidor y en el bot, mediante un canal privado. No uses el ejemplo de clave de
la diapositiva (`mi_llave_privada_123`) en producción.

Por defecto, el servidor firma estos campos en orden alfabético de nombres,
serializados como JSON compacto UTF-8, y envía el resultado en hexadecimal:

```json
{"date":"2026-09-23T10:30:01.120Z","idTxn":10001,"paymentMethod":"Tarjeta","user":"aa@aa.com","value":50000}
```

El bot en Python puede generar el mismo valor con los mismos nombres de campos,
valores, serialización y secreto:

```python
import hashlib
import hmac
import json
import os

secret = os.environ["HASH_SECRET"].encode("utf-8")
canonical = {
    "idTxn": 10001,
    "user": "aa@aa.com",
    "date": "2026-09-23T10:30:01.120Z",
    "value": 50000,
    "paymentMethod": "Tarjeta",
}
if isinstance(canonical["value"], float) and canonical["value"].is_integer():
    canonical["value"] = int(canonical["value"])
data = json.dumps(
    canonical,
    sort_keys=True,
    separators=(",", ":"),
    ensure_ascii=False,
)
transaction_hash = hmac.new(
    secret,
    data.encode("utf-8"),
    hashlib.sha256,
).hexdigest()
```

Los campos incluidos se configuran en `HASH_FIELDS`; los permitidos son
`idTxn,user,date,value,paymentMethod,ip,state`. La serialización ordena los
nombres alfabéticamente, independientemente del orden configurado. Ambos lados
deben firmar los mismos nombres, valores, tipos y fecha. Los alias del endpoint
se normalizan antes de verificar el HMAC, así que el bot debe firmar los nombres
canónicos mostrados arriba. Un HMAC faltante produce HTTP 400 y uno incorrecto
HTTP 401. Si el lote tiene un HMAC inválido, no se guarda ninguna transacción.

## 5. Probar el endpoint

Desde PowerShell, con Next.js en ejecución, puedes probar que el endpoint recibe
POST. Sustituye `hash` por el HMAC correcto calculado de acuerdo con la sección
anterior:

```powershell
$body = @{
  idTxn = 10001
  user = "aa@aa.com"
  date = "2026-09-23T10:30:01.120Z"
  value = 50000
  paymentMethod = "Tarjeta"
  hash = "HMAC_HEXADECIMAL_CALCULADO_POR_EL_BOT"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/transactions" `
  -ContentType "application/json" -Body $body
```

El endpoint admite preflight `OPTIONS` para clientes web y no requiere un
encabezado `x-api-key`: el HMAC de cada transacción autoriza y protege su
integridad.
`ALLOWED_ORIGIN` controla el origen CORS (por defecto `*`).

### Probar desde Postman

1. Inicia la aplicación con `npm run dev`.
2. Crea una petición **POST** a `http://localhost:3000/api/transactions`.
3. En **Headers**, agrega `Content-Type: application/json`. No agregues
   `x-api-key` ni compartas la clave privada de Supabase.
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

5. Agrega un campo `hash` a cada transacción con el HMAC hexadecimal que genera
   el bot usando la convención documentada en el apartado 4. El emisor real
   (por ejemplo, el bot del profesor) también debe generar ese HMAC por
   transacción antes de enviar.

6. Pulsa **Send**. La respuesta debe tener HTTP `200`, tres resultados con
   `hashValid: true` y la tercera transacción debe reportar `anomaly: true`.
   Para probar la producción, cambia la URL por
   `https://sustent0409.vercel.app/api/transactions`. Abre
   `/ventana-deslizante` para ver el caso. Para repetir la prueba, usa tres
   `idTxn` distintos; el endpoint evita guardar identificadores duplicados.

## 6. Actualizar el dashboard ya creado en Supabase

Para habilitar el tamaño de ventana por franja y guardarlo en las anomalías,
vuelve a ejecutar el contenido actualizado de
[`supabase/schema.sql`](./supabase/schema.sql) en el SQL Editor de Supabase antes
de desplegar la nueva versión de la aplicación. El script agrega `window_size` y
actualiza la función RPC usada por el endpoint.

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

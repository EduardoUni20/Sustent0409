## Librerías

* **Next.js:** Crea las APIs con `NextResponse` y rutas dentro de `app/api`.
* **Supabase JS (`@supabase/supabase-js`):** Conecta con la base de datos. El cliente con credenciales de servidor se prepara en `lib/supabase.js`.
* **node:crypto:** Calcula y compara hashes en `lib/transactionHash.js`.

---

## APIs y Base de Datos

* **`POST /api/transactions`:** Valida transacciones, verifica su hash y las envía a Supabase para guardar y detectar actividad sospechosa (`app/api/transactions/route.js`).
* **`GET /api/transactions/list`:** Devuelve transacciones paginadas (`app/api/transactions/list/route.js`).
* **`GET /api/dashboard`:** Devuelve métricas generales del sistema (`app/api/dashboard/route.js`).
* **`GET /api/anomalies`:** Lista y filtra anomalías (`app/api/anomalies/route.js`).
* **`PATCH /api/anomalies/[id]`:** Cambia el estado de una anomalía (`app/api/anomalies/[id]/route.js`).
* **Base de datos:** La lógica de base de datos —incluyendo la ventana de transacciones y las funciones que llaman las APIs— está en `supabase/schema.sql`.

La detección se hace por usuario: tres o más transacciones con hash válido en tres
segundos pueden generar una anomalía. El tamaño de la ventana móvil se elige con
la fecha (`date`) de cada transacción, en la zona `WINDOW_TIME_ZONE`: 10 registros
de 05:00:01 a 12:00:00, 6 de 12:00:01 a 20:00:00 y 3 desde 20:00:01 hasta 05:00:00.
Los tamaños predeterminados son configurables con `MORNING_WINDOW_SIZE`,
`AFTERNOON_WINDOW_SIZE` y `NIGHT_WINDOW_SIZE`. Los usuarios tienen ventanas
independientes. Se permite cualquier `idTxn` de texto o número no vacío; un ID ya
registrado se considera duplicado.

---

## Hashes y Logs

* **`lib/transactionHash.js`:** Genera un SHA-256 o HMAC-SHA-256 de campos configurables y compara el resultado con el hash recibido usando tiempo constante. Sirve para comprobar la integridad de la transacción, no como hash de contraseñas.
* **`INGEST_API_KEY`:** Secreto fijo compartido que el emisor envía en `x-api-key` para autorizar `POST /api/transactions`. No es el hash de la transacción: ese hash se calcula por separado para cada payload.
* **`lib/slidingWindowDiagnostics.js`:** Registra diagnósticos del hash y eventos del sistema. Las APIs también usan `console.error` cuando falla una operación.
* **Nota de seguridad:** Los diagnósticos del hash incluyen datos de la transacción (como el correo), pero no imprimen el hash recibido.

---

## Interfaz (Frontend)

* **`components/SlidingWindowDashboard.js`:** Es el dashboard de la interfaz de usuario. Consume algunas de estas APIs pero no ejecuta lógica de backend.
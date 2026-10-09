// Recibe transacciones, verifica sus datos y HMAC, y delega persistencia/detección a SQL.
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logHashDiagnostics } from "@/lib/slidingWindowDiagnostics";
import { getSlidingWindowConfig } from "@/lib/slidingWindowConfig";
import { txnSchema } from "@/lib/transactionSchema";
import { validateTransactionHash } from "@/lib/transactionHash";

export const runtime = "nodejs";

// Centraliza el origen permitido y los métodos/headers aceptados por CORS.
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// Construye todas las respuestas del endpoint de ingreso con los headers CORS comunes.
function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

// Aplica el esquema Zod y prepara el formato interno que usan el HMAC y Supabase.
function normalizeTransaction(input) {
  const parsed = txnSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; "),
    };
  }

  return {
    transaction: {
      idTxn: parsed.data.idTxn,
      user: input.user,
      date: input.date,
      value: parsed.data.value,
      paymentMethod: input.paymentMethod,
      hash: parsed.data.hash || "",
      ip: typeof input.ip === "string" ? input.ip : null,
      state: typeof input.state === "string" ? input.state : "received",
    },
  };
}

// Convierte fechas sin zona horaria a UTC y entrega a PostgreSQL un timestamp ISO uniforme.
function dateForDatabase(date) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return `${date}T00:00:00.000Z`;
  }
  const includesTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(date);
  const normalizedDate = includesTimezone ? date : `${date}Z`;
  return new Date(normalizedDate).toISOString();
}

// Responde las solicitudes previas de CORS sin procesar ni guardar transacciones.
export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// Flujo de ingreso: parsear lote, validar datos, verificar HMAC, configurar ventanas,
// llamar al procedimiento SQL y devolver un resultado por transacción.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "El cuerpo debe ser JSON válido." }, 400);
  }

  // Admite un arreglo directo, un objeto con "transactions" o una transacción individual.
  const inputs = Array.isArray(body)
    ? body
    : Array.isArray(body?.transactions)
      ? body.transactions
      : [body];

  // Limita el tamaño del lote y valida la configuración global de detección.
  if (inputs.length === 0) {
    return json({ error: "Envía al menos una transacción." }, 400);
  }
  if (inputs.length > 1000) {
    return json({ error: "El máximo por petición es 1000 transacciones." }, 413);
  }

  const windowSeconds = Number(process.env.WINDOW_SECONDS || 3);
  const threshold = Number(process.env.TRANSACTION_THRESHOLD || 3);
  if (
    !Number.isInteger(windowSeconds) ||
    windowSeconds < 1 ||
    !Number.isInteger(threshold) ||
    threshold < 2
  ) {
    return json(
      {
        error:
          "WINDOW_SECONDS debe ser un entero positivo y TRANSACTION_THRESHOLD un entero mayor que uno.",
      },
      500,
    );
  }

  // Valida todo el lote antes de iniciar escrituras; el primer dato inválido cancela el lote.
  const prepared = inputs.map(normalizeTransaction);
  const invalidInputIndex = prepared.findIndex((entry) => entry.error);
  if (invalidInputIndex !== -1) {
    return json(
      {
        error: `Transacción ${invalidInputIndex + 1}: ${prepared[invalidInputIndex].error}`,
      },
      422,
    );
  }

  // Ordena por fecha para procesar primero las transacciones más antiguas del lote.
  const transactions = prepared
    .map(({ transaction }, originalIndex) => ({ transaction, originalIndex }))
    .sort(
      (left, right) =>
        Date.parse(left.transaction.date) - Date.parse(right.transaction.date),
    );

  // Un HMAC inválido se registra como tal; no impide guardar la transacción.
  const hashResults = new Map();
  for (const { transaction, originalIndex } of transactions) {
    try {
      // validateTransactionHash compara el HMAC recibido con el que el servidor recalcula.
      const hashResult = validateTransactionHash(transaction);
      logHashDiagnostics(transaction, hashResult);
      if (!hashResult.valid) {
        console.warn("[SlidingWindow] Transacción recibida con HMAC no válido:", {
          idTxn: String(transaction.idTxn),
          user: transaction.user,
          date: transaction.date,
          reason: transaction.hash
            ? "El HMAC no coincide con la configuración."
            : "La transacción no contiene HMAC.",
        });
      }
      hashResults.set(originalIndex, hashResult);
    } catch (error) {
      console.error("[SlidingWindow] Error validando HMAC:", error);
      return json({ error: error.message }, 503);
    }
  }

  // Calcula una ventana para cada fecha y comprueba que el umbral quepa en todas ellas.
  let windowConfigurations;
  try {
    windowConfigurations = new Map(
      transactions.map(({ transaction, originalIndex }) => [
        originalIndex,
        getSlidingWindowConfig(dateForDatabase(transaction.date)),
      ]),
    );
    const smallestWindowSize = Math.min(
      ...Array.from(windowConfigurations.values(), ({ windowSize }) => windowSize),
    );
    if (threshold > smallestWindowSize) {
      return json(
        {
          error:
            "TRANSACTION_THRESHOLD no puede ser mayor que el tamaño de ventana configurado para las transacciones recibidas.",
        },
        500,
      );
    }
  } catch (error) {
    return json({ error: error.message }, 500);
  }

  // Obtiene el cliente privilegiado del servidor; si faltan credenciales, no procesa el lote.
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    return json({ error: error.message }, 503);
  }

  // Guarda cada respuesta en su posición original, aunque el lote se procese ordenado por fecha.
  const results = new Array(transactions.length);
  for (const { transaction, originalIndex } of transactions) {
    const { windowSize, period, timeZone } =
      windowConfigurations.get(originalIndex);
    const hashResult = hashResults.get(originalIndex);

    // Se envía hashValid al SQL: allí se decide si corresponde HASH_INVALIDO o POSIBLE_FRAUDE.
    const { data, error } = await supabase.rpc("process_transaction", {
      p_id_txn: String(transaction.idTxn),
      p_user_email: transaction.user.trim().toLowerCase(),
      p_date: dateForDatabase(transaction.date),
      p_value: transaction.value,
      p_payment_method: transaction.paymentMethod,
      p_hash: transaction.hash,
      p_hash_valid: hashResult.valid,
      p_ip: transaction.ip,
      p_state: transaction.state,
      p_window_seconds: windowSeconds,
      p_threshold: threshold,
      p_window_size: windowSize,
    });

    if (error) {
      console.error("No se pudo registrar la transacción en Supabase:", error);
      return json({ error: "No se pudo guardar la transacción." }, 500);
    }

    results[originalIndex] = {
      ...data,
      hashValid: hashResult.valid,
      hashAlgorithm: hashResult.algorithm,
      hashEncoding: hashResult.encoding,
      hashFields: hashResult.fields,
      windowSize,
      windowPeriod: period,
      timeZone,
    };
  }

  // Resume el lote y adjunta el resultado SQL junto con los parámetros usados.
  return json({
    received: results.length,
    windowSeconds,
    threshold,
    windows: {
      morning: Number(process.env.MORNING_WINDOW_SIZE || 10),
      afternoon: Number(process.env.AFTERNOON_WINDOW_SIZE || 6),
      night: Number(process.env.NIGHT_WINDOW_SIZE || 3),
      timeZone: process.env.WINDOW_TIME_ZONE || "America/Bogota",
    },
    results,
  });
}

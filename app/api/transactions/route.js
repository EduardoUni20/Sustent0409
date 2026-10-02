import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logHashDiagnostics } from "@/lib/slidingWindowDiagnostics";
import { validateTransactionHash } from "@/lib/transactionHash";

export const runtime = "nodejs";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };
}

function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

function normalizeTransaction(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Cada transacción debe ser un objeto JSON." };
  }

  const idTxn = input.idTxn ?? input.id;
  const user = input.user ?? input.email;
  const date = input.date ?? input.fecha;
  const value = input.value;
  const paymentMethod = input.paymentMethod ?? input.metodoPago;
  const hash = input.hash;

  if (
    (typeof idTxn !== "string" && typeof idTxn !== "number") ||
    String(idTxn).trim() === ""
  ) {
    return { error: "idTxn es obligatorio y debe ser texto o número." };
  }
  if (typeof user !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) {
    return { error: "user debe ser un correo electrónico válido." };
  }
  if (typeof date !== "string" || !Number.isFinite(Date.parse(date))) {
    return { error: "date debe ser una fecha válida en formato ISO 8601." };
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return { error: "value debe ser un número mayor o igual que cero." };
  }
  if (typeof paymentMethod !== "string" || !paymentMethod.trim()) {
    return { error: "paymentMethod es obligatorio." };
  }
  if (typeof hash !== "string" || !hash.trim()) {
    return { error: "hash es obligatorio." };
  }

  return {
    transaction: {
      idTxn,
      user,
      date,
      value,
      paymentMethod,
      hash: hash.trim(),
      ip: typeof input.ip === "string" ? input.ip : null,
      state: typeof input.state === "string" ? input.state : "received",
    },
  };
}

function dateForDatabase(date) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return `${date}T00:00:00.000Z`;
  }
  const includesTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(date);
  const normalizedDate = includesTimezone ? date : `${date}Z`;
  return new Date(normalizedDate).toISOString();
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request) {
  const expectedApiKey = process.env.INGEST_API_KEY;
  if (
    expectedApiKey &&
    request.headers.get("x-api-key") !== expectedApiKey
  ) {
    return json({ error: "API key no válida." }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "El cuerpo debe ser JSON válido." }, 400);
  }

  const inputs = Array.isArray(body)
    ? body
    : Array.isArray(body?.transactions)
      ? body.transactions
      : [body];

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

  const prepared = inputs.map(normalizeTransaction);
  const invalidInputIndex = prepared.findIndex((entry) => entry.error);
  if (invalidInputIndex !== -1) {
    return json(
      {
        error: `Transacción ${invalidInputIndex + 1}: ${prepared[invalidInputIndex].error}`,
      },
      400,
    );
  }

  const transactions = prepared
    .map(({ transaction }, originalIndex) => ({ transaction, originalIndex }))
    .sort(
      (left, right) =>
        Date.parse(left.transaction.date) - Date.parse(right.transaction.date),
    );

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    return json({ error: error.message }, 503);
  }

  const results = new Array(transactions.length);
  for (const { transaction, originalIndex } of transactions) {
    let hashResult;
    try {
      hashResult = validateTransactionHash(transaction);
      logHashDiagnostics(transaction, hashResult);
    } catch (error) {
      console.error("[SlidingWindow] Error validando hash:", error);
      return json({ error: error.message }, 500);
    }

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
    };
  }

  return json({
    received: results.length,
    windowSeconds,
    threshold,
    results,
  });
}

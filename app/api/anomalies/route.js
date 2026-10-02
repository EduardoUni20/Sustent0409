import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 100;
const VALID_STATUSES = new Set(["open", "reviewed", "discarded"]);

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || PAGE_SIZE_DEFAULT);
  const status = searchParams.get("status");

  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json(
      { error: "page debe ser un entero mayor que cero." },
      { status: 400 },
    );
  }
  if (
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > PAGE_SIZE_MAX
  ) {
    return NextResponse.json(
      { error: `pageSize debe ser un entero entre 1 y ${PAGE_SIZE_MAX}.` },
      { status: 400 },
    );
  }
  if (status && status !== "all" && !VALID_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "status debe ser all, open, reviewed o discarded." },
      { status: 400 },
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("anomalies")
      .select(
        "id, transaction_id, type, level, transaction_count, window_seconds, status, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error("No se pudieron cargar las anomalías:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar las anomalías." },
        { status: 500 },
      );
    }

    const anomalyRows = data || [];
    const transactionIds = anomalyRows.map((row) => row.transaction_id);
    const { data: transactionRows, error: transactionError } =
      transactionIds.length > 0
        ? await supabase
            .from("transactions")
            .select(
              "id, id_txn, value, transaction_date, payment_method, user_id",
            )
            .in("id", transactionIds)
        : { data: [], error: null };

    if (transactionError) {
      console.error(
        "No se pudieron cargar las transacciones de las anomalías:",
        transactionError,
      );
      return NextResponse.json(
        { error: "No se pudieron cargar los datos de las anomalías." },
        { status: 500 },
      );
    }

    const transactionsById = new Map(
      (transactionRows || []).map((row) => [row.id, row]),
    );
    const userIds = [
      ...new Set((transactionRows || []).map((row) => row.user_id)),
    ];
    const { data: userRows, error: userError } =
      userIds.length > 0
        ? await supabase.from("users").select("id, email").in("id", userIds)
        : { data: [], error: null };

    if (userError) {
      console.error("No se pudieron cargar los usuarios de las anomalías:", userError);
      return NextResponse.json(
        { error: "No se pudieron cargar los usuarios de las anomalías." },
        { status: 500 },
      );
    }

    const emailsById = new Map((userRows || []).map((row) => [row.id, row.email]));
    const anomalies = anomalyRows.map((row) => {
      const transaction = transactionsById.get(row.transaction_id);
      return {
        id: row.id,
        type: row.type,
        level: row.level,
        count: row.transaction_count,
        windowSeconds: row.window_seconds,
        status: row.status,
        createdAt: row.created_at,
        idTxn: transaction?.id_txn ?? null,
        value: transaction?.value ?? null,
        paymentMethod: transaction?.payment_method ?? null,
        transactionDate: transaction?.transaction_date ?? null,
        email: transaction ? emailsById.get(transaction.user_id) ?? null : null,
      };
    });

    return NextResponse.json(
      {
        anomalies,
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}

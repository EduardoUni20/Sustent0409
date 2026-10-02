import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 100;

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || PAGE_SIZE_DEFAULT);

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

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const supabase = getSupabaseAdmin();
    const { data, count, error } = await supabase
      .from("transactions")
      .select(
        "id, id_txn, user_id, value, transaction_date, payment_method, state, hash_valid, created_at",
        { count: "exact" },
      )
      .order("transaction_date", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("No se pudieron cargar las transacciones:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar las transacciones." },
        { status: 500 },
      );
    }

    const rows = data || [];
    const userIds = [...new Set(rows.map((row) => row.user_id))];
    const { data: users, error: usersError } =
      userIds.length > 0
        ? await supabase.from("users").select("id, email").in("id", userIds)
        : { data: [], error: null };

    if (usersError) {
      console.error("No se pudieron cargar los usuarios:", usersError);
      return NextResponse.json(
        { error: "No se pudieron cargar los usuarios de las transacciones." },
        { status: 500 },
      );
    }

    const emailByUserId = new Map(
      (users || []).map((user) => [user.id, user.email]),
    );
    const transactions = rows.map((row) => ({
      id: row.id,
      idTxn: row.id_txn,
      email: emailByUserId.get(row.user_id) ?? null,
      value: row.value,
      date: row.transaction_date,
      paymentMethod: row.payment_method,
      state: row.state,
      hashValid: row.hash_valid,
      createdAt: row.created_at,
    }));

    return NextResponse.json(
      {
        transactions,
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

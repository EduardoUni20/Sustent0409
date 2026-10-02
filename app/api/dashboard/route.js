import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin().rpc(
      "get_transaction_dashboard",
    );

    if (error) {
      console.error("No se pudieron cargar las estadísticas:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar las estadísticas." },
        { status: 500 },
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}

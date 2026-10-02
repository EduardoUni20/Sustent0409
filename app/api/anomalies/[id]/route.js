import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo debe ser JSON válido." },
      { status: 400 },
    );
  }

  if (!body || !["open", "reviewed", "discarded"].includes(body.status)) {
    return NextResponse.json(
      { error: "status debe ser open, reviewed o discarded." },
      { status: 400 },
    );
  }

  if (
    typeof params.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.id,
    )
  ) {
    return NextResponse.json(
      { error: "El id de anomalía debe ser un UUID válido." },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await getSupabaseAdmin().rpc(
      "update_anomaly_status",
      {
        p_anomaly_id: params.id,
        p_status: body.status,
      },
    );

    if (error) {
      console.error("No se pudo actualizar la anomalía:", error);
      return NextResponse.json(
        { error: "No se pudo actualizar la anomalía." },
        { status: 500 },
      );
    }
    if (!data || error?.code === "P0002") {
      return NextResponse.json(
        { error: "No existe una anomalía con ese id." },
        { status: 404 },
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}

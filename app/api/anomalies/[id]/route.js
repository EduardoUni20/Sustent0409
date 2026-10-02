import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

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

  if (!["open", "reviewed", "discarded"].includes(body.status)) {
    return NextResponse.json(
      { error: "status debe ser open, reviewed o discarded." },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("anomalies")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select("id, status")
      .maybeSingle();

    if (error) {
      console.error("No se pudo actualizar la anomalía:", error);
      return NextResponse.json(
        { error: "No se pudo actualizar la anomalía." },
        { status: 500 },
      );
    }
    if (!data) {
      return NextResponse.json(
        { error: "No existe una anomalía con ese id." },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}

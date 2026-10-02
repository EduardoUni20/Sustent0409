import { createClient } from "@supabase/supabase-js";

let supabase;

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    const missing = [
      !url && "SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL)",
      !secretKey &&
        "SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY; no la publishable key)",
    ]
      .filter(Boolean)
      .join(" y ");
    throw new Error(
      `Falta ${missing} en .env.local. Reinicia Next.js después de guardarlo.`,
    );
  }

  if (!supabase) {
    supabase = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabase;
}

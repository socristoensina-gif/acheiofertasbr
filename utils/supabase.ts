import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Público: só lê produtos publicados (regra do banco)
export const supabase = createClient<Database>(url, anon);

// Só para usar no servidor (rotas). Nunca importar em componentes de tela.
export function supabaseAdmin() {
  return createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
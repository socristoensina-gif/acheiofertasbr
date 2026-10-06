import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Retorna somente assinantes confirmados e ainda não cancelados para futuros envios. */
export async function obterAssinantesElegiveis(db: SupabaseClient<Database>) {
  const { data, error } = await db
    .from("newsletter_assinantes")
    .select("id, nome, email, categorias, periodicidade")
    .not("confirmado_em", "is", null)
    .is("cancelado_em", null);

  if (error) throw error;
  return data;
}
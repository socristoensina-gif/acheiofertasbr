import { AdminProdutoForm } from "@/components/admin-produto-form";
import { requireAdmin } from "@/lib/admin/auth";
import { CATEGORY_SLUGS } from "@/lib/config";
import { supabaseAdmin } from "@/utils/supabase";

export default async function NovoProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  await requireAdmin();
  const [{ data: categorias }, { erro }] = await Promise.all([
    supabaseAdmin().from("categorias").select("id, nome").in("slug", CATEGORY_SLUGS).order("nome"),
    searchParams,
  ]);

  return <AdminProdutoForm categorias={categorias ?? []} erro={erro} />;
}
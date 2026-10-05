import { AdminProdutoForm } from "@/components/admin-produto-form";
import { requireAdmin } from "@/lib/admin/auth";
import { SLUGS_CATEGORIAS } from "@/lib/categorias";
import { supabaseAdmin } from "@/utils/supabase";

export default async function NovoProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  await requireAdmin();
  const [{ data: categorias }, { erro }] = await Promise.all([
    supabaseAdmin().from("categorias").select("slug, nome").in("slug", SLUGS_CATEGORIAS).order("ordem"),
    searchParams,
  ]);

  return <AdminProdutoForm categorias={categorias ?? []} erro={erro} />;
}
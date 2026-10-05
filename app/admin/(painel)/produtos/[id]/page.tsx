import { notFound } from "next/navigation";
import { AdminProdutoForm } from "@/components/admin-produto-form";
import { requireAdmin } from "@/lib/admin/auth";
import { SLUGS_CATEGORIAS } from "@/lib/categorias";
import { supabaseAdmin } from "@/utils/supabase";

export default async function EditarProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const db = supabaseAdmin();
  const [{ data: produto }, { data: categorias }] = await Promise.all([
    db.from("produtos").select("*").eq("id", id).maybeSingle(),
    db.from("categorias").select("id, slug").in("slug", SLUGS_CATEGORIAS),
  ]);
  if (!produto) notFound();

  return <AdminProdutoForm produto={produto} categorias={categorias ?? []} erro={erro} />;
}
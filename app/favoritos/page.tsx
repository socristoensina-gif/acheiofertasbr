import { connection } from "next/server";
import { FavoriteList } from "@/components/favorite-list";
import { incluirMelhoresOfertas } from "@/lib/ofertas-publicas";
import { supabase } from "@/utils/supabase";

export default async function FavoritosPage() {
  await connection();
  const { data, error } = await supabase
    .from("produtos")
    .select("id, slug, nome, imagem, preco_atual, preco_antigo, marketplace")
    .eq("status", "publicado");
  if (error) throw error;
  const produtos = await incluirMelhoresOfertas(data ?? []);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <p className="section-kicker">Sua lista</p>
      <h1 className="mb-6 mt-1 text-3xl font-bold">Favoritos</h1>
      <FavoriteList produtos={produtos ?? []} />
    </main>
  );
}
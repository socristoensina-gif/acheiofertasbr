import { ProdutoCard } from "@/components/produto-card";
import { connection } from "next/server";
import { incluirMelhoresOfertas } from "@/lib/ofertas-publicas";
import { supabase } from "@/utils/supabase";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: consulta = "" } = await searchParams;
  await connection();
  const termo = consulta.trim().slice(0, 100);
  const termoEscapado = termo.replace(/[\\%_]/g, "\\$&");
  const { data: produtosOriginais, error } = termo
    ? await supabase
        .from("produtos")
        .select("id, slug, nome, imagem, preco_atual, preco_antigo")
        .eq("status", "publicado")
        .ilike("nome", `%${termoEscapado}%`)
        .order("criado_em", { ascending: false })
    : { data: [], error: null };
  if (error) throw error;
  const produtos = await incluirMelhoresOfertas(produtosOriginais ?? []);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <p className="section-kicker">Busca</p>
      <h1 className="mb-6 mt-1 text-3xl font-bold">
        {termo ? `Resultados para “${termo}”` : "Buscar ofertas"}
      </h1>
      {produtos?.length ? (
        <div className="product-grid">
          {produtos.map((produto) => <ProdutoCard key={produto.id} produto={produto} />)}
        </div>
      ) : (
        <p className="empty-state">
          {termo ? "Nenhum produto publicado encontrado." : "Digite um termo para buscar produtos."}
        </p>
      )}
    </main>
  );
}
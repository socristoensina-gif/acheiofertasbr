import { ProdutoCard } from "@/components/produto-card";
import { supabase } from "@/utils/supabase";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: consulta = "" } = await searchParams;
  const termo = consulta.trim().slice(0, 100);
  const termoEscapado = termo.replace(/[\\%_]/g, "\\$&");
  const { data: produtos } = termo
    ? await supabase
        .from("produtos")
        .select("id, slug, nome, imagem, preco_atual, preco_antigo")
        .eq("status", "publicado")
        .ilike("nome", `%${termoEscapado}%`)
        .order("created_at", { ascending: false })
    : { data: [] };

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
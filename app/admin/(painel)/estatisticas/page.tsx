import { requireAdmin } from "@/lib/admin/auth";
import { CATEGORIAS, SLUGS_CATEGORIAS } from "@/lib/categorias";
import { supabaseAdmin } from "@/utils/supabase";

type Clique = { produto_id: string; origem: string | null; created_at: string };

function agrupar<T>(itens: T[], chave: (item: T) => string) {
  const contagem = new Map<string, number>();
  for (const item of itens) {
    const nome = chave(item) || "direto";
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }
  return [...contagem.entries()].sort((a, b) => b[1] - a[1]);
}

  function corteDiasAtras(dias: number) {
    return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  }

function ListaEstatistica({ titulo, itens }: { titulo: string; itens: [string, number][] }) {
  return (
    <section>
      <h3 className="mb-3 text-lg font-bold">{titulo}</h3>
      {itens.length ? (
        <ol className="divide-y divide-stone-200 border-y border-stone-200">
          {itens.map(([nome, total]) => (
            <li key={nome} className="flex justify-between gap-4 py-2.5 text-sm">
              <span className="min-w-0 truncate">{nome}</span>
              <span className="shrink-0 font-bold">{total}</span>
            </li>
          ))}
        </ol>
      ) : <p className="text-sm text-stone-500">Sem cliques no período.</p>}
    </section>
  );
}

export default async function EstatisticasPage() {
  await requireAdmin();
  const db = supabaseAdmin();
    const desde30 = corteDiasAtras(30);
  const [{ data: cliques }, { data: produtos }, { data: categorias }] = await Promise.all([
    db.from("cliques").select("produto_id, origem, created_at").gte("created_at", desde30),
    db.from("produtos").select("id, nome, categoria_id"),
    db.from("categorias").select("id, slug").in("slug", SLUGS_CATEGORIAS),
  ]);
  const mapaProdutos = new Map((produtos ?? []).map((produto) => [String(produto.id), produto]));
  const nomesPorSlug = new Map(CATEGORIAS.map((categoria) => [categoria.slug, categoria.nome]));
  const mapaCategorias = new Map((categorias ?? []).map((categoria) => [String(categoria.id), nomesPorSlug.get(categoria.slug)]));
  const todos = (cliques ?? []) as Clique[];
    const seteDias = todos.filter((clique) => Date.parse(clique.created_at) >= Date.parse(corteDiasAtras(7)));

  function secoes(periodo: Clique[]) {
    return {
      produtos: agrupar(periodo, (clique) => mapaProdutos.get(String(clique.produto_id))?.nome ?? "Produto removido"),
      categorias: agrupar(periodo, (clique) => {
        const produto = mapaProdutos.get(String(clique.produto_id));
        return mapaCategorias.get(String(produto?.categoria_id)) ?? "Sem categoria";
      }),
      origens: agrupar(periodo, (clique) => clique.origem ?? "direto"),
    };
  }

  const dados7 = secoes(seteDias);
  const dados30 = secoes(todos);

  return (
    <main>
      <p className="section-kicker">Desempenho</p>
      <h1 className="mb-8 mt-1 text-2xl font-bold">Estatísticas de cliques</h1>
      <div className="grid gap-10 lg:grid-cols-2">
        {[{ dias: 7, dados: dados7 }, { dias: 30, dados: dados30 }].map(({ dias, dados }) => (
          <section key={dias} className="min-w-0">
            <h2 className="mb-5 border-b border-stone-300 pb-2 text-xl font-bold">Últimos {dias} dias</h2>
            <div className="grid gap-8 md:grid-cols-2">
              <ListaEstatistica titulo="Por produto" itens={dados.produtos} />
              <ListaEstatistica titulo="Por categoria" itens={dados.categorias} />
              <ListaEstatistica titulo="Por origem" itens={dados.origens} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
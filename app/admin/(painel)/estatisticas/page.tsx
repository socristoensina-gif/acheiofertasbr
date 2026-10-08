import { requireAdmin } from "@/lib/admin/auth";
import { SLUGS_CATEGORIAS } from "@/lib/categorias";
import { supabaseAdmin } from "@/utils/supabase";

type Clique = {
  produto_id: string;
  produto_oferta_id: string | null;
  marketplace: string;
  origem: string | null;
  criado_em: string;
};

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
  const [
    { data: cliques, error: erroCliques },
    { data: produtos, error: erroProdutos },
    { data: categorias, error: erroCategorias },
  ] = await Promise.all([
    db.from("cliques").select("produto_id, produto_oferta_id, marketplace, origem, criado_em").gte("criado_em", desde30),
    db.from("produtos").select("id, nome, categoria"),
    db.from("categorias").select("slug, nome").in("slug", SLUGS_CATEGORIAS),
  ]);
  if (erroCliques) throw erroCliques;
  if (erroProdutos) throw erroProdutos;
  if (erroCategorias) throw erroCategorias;
  const idsOfertas = [
    ...new Set(
      (cliques ?? [])
        .map((clique) => clique.produto_oferta_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: ofertas, error: erroOfertas } = idsOfertas.length
    ? await db.from("produto_ofertas").select("id, produto_id, marketplace_id").in("id", idsOfertas)
    : { data: [], error: null };
  if (erroOfertas) throw erroOfertas;
  const mapaProdutos = new Map((produtos ?? []).map((produto) => [String(produto.id), produto]));
  const mapaCategorias = new Map((categorias ?? []).map((categoria) => [categoria.slug, categoria.nome]));
  const mapaOfertas = new Map((ofertas ?? []).map((oferta) => [oferta.id, oferta]));
  const todos = (cliques ?? []) as Clique[];
  const seteDias = todos.filter((clique) => Date.parse(clique.criado_em) >= Date.parse(corteDiasAtras(7)));

  function secoes(periodo: Clique[]) {
    return {
      produtos: agrupar(periodo, (clique) => mapaProdutos.get(String(clique.produto_id))?.nome ?? "Produto removido"),
      categorias: agrupar(periodo, (clique) => {
        const produto = mapaProdutos.get(String(clique.produto_id));
        return mapaCategorias.get(produto?.categoria ?? "") ?? "Sem categoria";
      }),
      ofertas: agrupar(periodo, (clique) => {
        const oferta = clique.produto_oferta_id
          ? mapaOfertas.get(clique.produto_oferta_id)
          : undefined;
        const nomeProduto = mapaProdutos.get(String(clique.produto_id))?.nome ?? "Produto removido";
        if (oferta) return `${nomeProduto} · ${oferta.marketplace_id}`;
        return clique.produto_oferta_id ? "Oferta removida" : "Oferta legada";
      }),
      marketplaces: agrupar(periodo, (clique) => clique.marketplace || "Não identificado"),
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
              <ListaEstatistica titulo="Por oferta" itens={dados.ofertas} />
              <ListaEstatistica titulo="Por marketplace" itens={dados.marketplaces} />
              <ListaEstatistica titulo="Por categoria" itens={dados.categorias} />
              <ListaEstatistica titulo="Por origem" itens={dados.origens} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
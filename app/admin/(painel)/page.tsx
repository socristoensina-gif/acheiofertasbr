import Link from "next/link";
import { alterarStatusProduto, excluirProduto } from "@/app/admin/actions";
import { isStatusProduto, MARKETPLACES, STATUS_PRODUTO } from "@/lib/admin/produtos";
import { SLUGS_CATEGORIAS } from "@/lib/categorias";
import { supabaseAdmin } from "@/utils/supabase";

const TAMANHO_PAGINA = 500;

async function carregarProdutos() {
  const db = supabaseAdmin();
  const produtos: {
    id: string;
    nome: string;
    slug: string;
    status: string;
    categoria: string;
    criado_em: string | null;
    marketplace: string;
    imagem: string | null;
    link_afiliado: string;
  }[] = [];

  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const { data, error } = await db
      .from("produtos")
      .select("id, nome, slug, status, categoria, criado_em, marketplace, imagem, link_afiliado")
      .order("criado_em", { ascending: false })
      .range(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) throw error;
    produtos.push(...data);
    if (data.length < TAMANHO_PAGINA) break;
  }

  return produtos;
}

function nomeStatus(valor: string) {
  return STATUS_PRODUTO.find((status) => status.valor === valor)?.nome ?? valor;
}

export default async function AdminProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const db = supabaseAdmin();
  const [{ erro, sucesso }, produtos, categoriasResult, cliquesResult, ofertasResult] = await Promise.all([
    searchParams,
    carregarProdutos(),
    db.from("categorias").select("slug, nome").in("slug", SLUGS_CATEGORIAS),
    db.from("cliques").select("id", { count: "exact", head: true }),
    db.from("produto_ofertas").select("marketplace_id").eq("ativo", true),
  ]);
  if (categoriasResult.error) throw categoriasResult.error;
  if (cliquesResult.error) throw cliquesResult.error;
  if (ofertasResult.error) throw ofertasResult.error;
  if (cliquesResult.count === null) throw new Error("O Supabase não retornou a contagem de cliques.");

  const nomesCategoria = new Map((categoriasResult.data ?? []).map((item) => [item.slug, item.nome]));
  const contagemStatus = new Map(STATUS_PRODUTO.map(({ valor }) => [valor, 0]));
  const contagemMarketplace = new Map<string, number>();
  for (const produto of produtos) {
    if (isStatusProduto(produto.status)) {
      contagemStatus.set(produto.status, (contagemStatus.get(produto.status) ?? 0) + 1);
    }
  }
  for (const oferta of ofertasResult.data ?? []) {
    const marketplace = oferta.marketplace_id.trim() || "Não identificado";
    contagemMarketplace.set(marketplace, (contagemMarketplace.get(marketplace) ?? 0) + 1);
  }
  const marketplaces = [...contagemMarketplace.entries()].sort((a, b) => b[1] - a[1]);
  const semImagem = produtos.filter((produto) => !produto.imagem?.trim()).length;
  const semLink = produtos.filter((produto) => !produto.link_afiliado?.trim()).length;
  const mensagemErro = erro === "status"
    ? "Não foi possível atualizar o status do produto."
    : erro === "excluir"
      ? "Não foi possível excluir o produto."
      : null;
  const mensagemSucesso = sucesso === "status"
    ? "Status do produto atualizado."
    : sucesso === "excluir"
      ? "Produto excluído."
      : sucesso === "produto"
        ? "Produto salvo."
        : null;

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Central operacional</p>
          <h1 className="mt-1 text-2xl font-bold">Dashboard de produtos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/importar" className="rounded-md bg-orange-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-800">
            Importar oferta
          </Link>
          <Link href="/admin/produtos/novo" className="text-sm font-semibold text-stone-600 hover:text-orange-800">
            Cadastro manual (exceção)
          </Link>
        </div>
      </div>

      <section aria-label="Indicadores do catálogo" className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard titulo="Total de produtos" valor={produtos.length} />
        <MetricCard titulo="Publicados" valor={contagemStatus.get("publicado") ?? 0} />
        <MetricCard titulo="Em análise" valor={contagemStatus.get("analisando") ?? 0} />
        <MetricCard titulo="Pausados" valor={contagemStatus.get("pausado") ?? 0} />
        <MetricCard titulo="Encontrados" valor={contagemStatus.get("encontrado") ?? 0} />
        <MetricCard titulo="Encerrados" valor={contagemStatus.get("encerrado") ?? 0} />
        <MetricCard titulo="Cliques registrados" valor={cliquesResult.count} />
        <MetricCard titulo="Ofertas ativas" valor={ofertasResult.data?.length ?? 0} />
        <MetricCard titulo="Sem imagem" valor={semImagem} />
        <MetricCard titulo="Sem link" valor={semLink} />
      </section>

      <section className="mb-10 rounded-lg border border-stone-200 bg-white p-4 sm:p-6">
        <h2 className="mb-3 text-lg font-bold">Ofertas ativas por marketplace</h2>
        {marketplaces.length ? (
          <ul className="flex flex-wrap gap-2">
            {marketplaces.map(([marketplace, total]) => (
              <li key={marketplace} className="rounded-full bg-stone-100 px-3 py-1.5 text-sm">
                {marketplace}: <strong>{total}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">Nenhuma oferta ativa.</p>
        )}
        <p className="mt-3 text-xs text-stone-500">
          Marketplaces suportados pelo cadastro: {MARKETPLACES.join(", ")}.
        </p>
      </section>

      {mensagemErro && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{mensagemErro}</p>}
      {mensagemSucesso && <p role="status" className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{mensagemSucesso}</p>}
      <section>
        <h2 className="mb-4 text-xl font-bold">Catálogo</h2>
        {produtos.length ? (
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-stone-100 text-xs uppercase text-stone-600">
                <tr><th className="p-3">Produto</th><th className="p-3">Marketplace legado</th><th className="p-3">Categoria</th><th className="p-3">Status</th><th className="p-3">Ações</th></tr>
              </thead>
              <tbody>
                {produtos.map((produto) => (
                  <tr key={produto.id} className="border-t border-stone-200">
                    <td className="p-3 font-semibold">{produto.nome}</td>
                    <td className="p-3">{produto.marketplace || "Não identificado"}</td>
                    <td className="p-3">{nomesCategoria.get(produto.categoria) ?? "-"}</td>
                    <td className="p-3">{nomeStatus(produto.status)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link href={`/admin/produtos/${produto.id}`} className="font-semibold text-orange-800">Editar</Link>
                        <form action={alterarStatusProduto} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={produto.id} />
                          <label className="sr-only" htmlFor={`status-${produto.id}`}>Novo status de {produto.nome}</label>
                          <select id={`status-${produto.id}`} name="status" defaultValue={produto.status}>
                            {!STATUS_PRODUTO.some(({ valor }) => valor === produto.status) && (
                              <option value={produto.status}>{produto.status} (legado)</option>
                            )}
                            {STATUS_PRODUTO.map(({ valor, nome }) => (
                              <option key={valor} value={valor}>{nome}</option>
                            ))}
                          </select>
                          <button className="font-semibold text-stone-700">Atualizar status</button>
                        </form>
                        <form action={excluirProduto}>
                          <input type="hidden" name="id" value={produto.id} />
                          <button className="font-semibold text-red-700">Excluir</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">Nenhum produto cadastrado.</p>
        )}
      </section>
    </main>
  );
}

function MetricCard({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{titulo}</h2>
      <p className="mt-2 text-2xl font-bold">{valor.toLocaleString("pt-BR")}</p>
    </article>
  );
}

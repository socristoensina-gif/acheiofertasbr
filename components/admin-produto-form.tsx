import Link from "next/link";
import { salvarProduto, salvarProdutoCompleto } from "@/app/admin/actions";
import { AdminCadastroMidias } from "@/components/admin-cadastro-midias";
import { MARKETPLACES, marketplaceIdDoValor, STATUS_PRODUTO } from "@/lib/admin/produtos";

type Categoria = { slug: string; nome: string };
type Produto = {
  id: string;
  slug: string;
  nome: string;
  categoria: string;
  marketplace: string;
  id_externo: string | null;
  fonte_dados: string | null;
  link_afiliado: string;
  imagem: string | null;
  video: string | null;
  preco_atual: number | string | null;
  preco_antigo: number | string | null;
  avaliacao: number | string | null;
  vendas: number | string | null;
  beneficios: unknown;
  descricao: string | null;
  destaque: boolean;
  status: string;
  atualizado_em: string | null;
};

function Aviso({ erro }: { erro?: string }) {
  if (!erro) return null;
  if (erro === "ok") {
    return (
      <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
        Produto salvo e publicado. Cadastre o próximo.
      </p>
    );
  }
  return (
    <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
      {erro === "salvar"
        ? "O produto não foi salvo no banco. Revise os dados e tente novamente."
        : erro === "slug"
          ? "Esse slug já está em uso. Escolha outro."
          : erro === "categoria"
            ? "Selecione uma categoria válida e cadastrada."
            : erro === "marketplace"
              ? "Use um link de afiliado de um marketplace permitido."
              : erro === "midias" || erro === "midias-bucket"
                ? "O produto foi criado, mas as mídias não foram salvas. Abra a oferta e tente novamente."
                : "Confira os campos informados (link permitido, preço válido) e tente novamente."}
    </p>
  );
}

export function AdminProdutoForm({
  categorias,
  produto,
  erro,
}: {
  categorias: Categoria[];
  produto?: Produto;
  erro?: string;
}) {
  if (!produto) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Produtos</p>
            <h1 className="mt-1 text-2xl font-bold">Novo produto</h1>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-orange-800">Voltar</Link>
        </div>
        <Aviso erro={erro} />
        <form action={salvarProdutoCompleto} className="grid gap-6 rounded-lg border border-stone-200 bg-white p-4 sm:p-6">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-lg font-bold">1. Oferta afiliada</legend>
            <label className="admin-field sm:col-span-2">
              Link de afiliado
              <input name="link_afiliado" type="url" required placeholder="https://s.shopee.com.br/..." />
              <span className="text-xs font-normal text-stone-500">O marketplace é reconhecido pelo próprio link.</span>
            </label>
            <label className="admin-field">
              Preço atual (R$)
              <input name="preco_atual" type="text" inputMode="decimal" required placeholder="49,90" />
            </label>
            <label className="admin-field">
              Preço anterior (R$)
              <input name="preco_antigo" type="text" inputMode="decimal" placeholder="89,90" />
            </label>
            <label className="admin-field">
              Avaliação (0 a 5)
              <input name="avaliacao" type="number" min="0" max="5" step="0.1" />
            </label>
            <label className="admin-field">
              Vendas
              <input name="vendas" type="number" min="0" step="1" />
            </label>
          </fieldset>

          <fieldset className="grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
            <legend className="mb-3 text-lg font-bold">2. Produto</legend>
            <label className="admin-field">
              Nome exibido no portal
              <input name="nome" required minLength={2} />
            </label>
            <label className="admin-field">
              Categoria
              <select name="categoria" defaultValue="" required>
                <option value="" disabled>Selecione</option>
                {categorias.map((categoria) => (
                  <option key={categoria.slug} value={categoria.slug}>{categoria.nome}</option>
                ))}
              </select>
            </label>
            <label className="admin-field sm:col-span-2">
              Descrição
              <textarea name="descricao" rows={3} />
            </label>
            <label className="admin-field sm:col-span-2">
              Benefícios (um por linha)
              <textarea name="beneficios" rows={4} />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
              <input type="checkbox" name="destaque" />
              Destacar na página inicial
            </label>
          </fieldset>

          <AdminCadastroMidias />
        </form>
      </main>
    );
  }

  const beneficios = Array.isArray(produto.beneficios) ? produto.beneficios.join("\n") : "";
  const marketplaceAtual = marketplaceIdDoValor(produto.marketplace) ?? produto.marketplace;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="section-kicker">Produtos</p>
          <h1 className="mt-1 text-2xl font-bold">Editar produto</h1>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-orange-800">Voltar</Link>
      </div>
      <Aviso erro={erro} />
      <form action={salvarProduto} className="grid gap-6 rounded-lg border border-stone-200 bg-white p-4 sm:p-6">
        <input type="hidden" name="id" value={produto.id} />

        <fieldset id="dados-produto" className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-lg font-bold">Identificação e conteúdo editorial</legend>
          <label className="admin-field">
            Nome exibido no portal
            <input name="nome" defaultValue={produto.nome} required minLength={2} />
          </label>
          <label className="admin-field">
            Slug público
            <input name="slug" defaultValue={produto.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
          </label>
          <label className="admin-field">
            Categoria
            <select name="categoria" defaultValue={produto.categoria} required>
              <option value="" disabled>Selecione</option>
              {categorias.map((categoria) => (
                <option key={categoria.slug} value={categoria.slug}>{categoria.nome}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            Status operacional
            <select name="status" defaultValue={produto.status}>
              {!STATUS_PRODUTO.some(({ valor }) => valor === produto.status) && (
                <option value={produto.status}>{produto.status} (legado)</option>
              )}
              {STATUS_PRODUTO.map(({ valor, nome }) => (
                <option key={valor} value={valor}>{nome}</option>
              ))}
            </select>
          </label>
          <label className="admin-field sm:col-span-2">
            Descrição personalizada
            <textarea name="descricao" rows={4} defaultValue={produto.descricao ?? ""} />
          </label>
          <label className="admin-field sm:col-span-2">
            Benefícios (um por linha)
            <textarea name="beneficios" rows={4} defaultValue={beneficios} />
          </label>
          <label className="admin-field sm:col-span-2">
            Imagem principal da vitrine (compatibilidade)
            <input name="imagem" type="url" defaultValue={produto.imagem ?? ""} />
          </label>
          <label className="admin-field sm:col-span-2">
            Vídeo principal da vitrine (compatibilidade)
            <input name="video" type="url" defaultValue={produto.video ?? ""} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
            <input type="checkbox" name="destaque" defaultChecked={produto.destaque} />
            Destacar na página inicial
          </label>
        </fieldset>

        <fieldset className="grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
          <legend className="mb-3 text-lg font-bold">Dados legados de oferta (compatibilidade)</legend>
          <p className="text-sm text-stone-600 sm:col-span-2">
            Estes campos antigos são mantidos para não interromper produtos já cadastrados. Novas oportunidades devem ser gerenciadas em Ofertas vinculadas abaixo.
          </p>
          <label className="admin-field">
            Marketplace
            <select name="marketplace" defaultValue={marketplaceAtual} required>
              <option value="" disabled>Selecione</option>
              {!marketplaceIdDoValor(produto.marketplace) && (
                <option value={produto.marketplace}>{produto.marketplace} (legado)</option>
              )}
              {MARKETPLACES.map((marketplace) => (
                <option key={marketplace} value={marketplaceIdDoValor(marketplace) ?? marketplace}>{marketplace}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            ID externo do produto
            <input name="id_externo" defaultValue={produto.id_externo ?? ""} />
          </label>
          <label className="admin-field sm:col-span-2">
            Link de afiliado
            <input
              name="link_afiliado"
              type="url"
              defaultValue={produto.link_afiliado ?? ""}
              required={produto.status === "publicado"}
            />
            <span className="text-xs font-normal text-stone-500">Obrigatório para publicar; os domínios permitidos são validados no servidor.</span>
          </label>
          <label className="admin-field sm:col-span-2">
            Fonte dos dados
            <input name="fonte_dados" defaultValue={produto.fonte_dados ?? ""} placeholder="Ex.: página do vendedor ou API futura" />
          </label>
        </fieldset>

        <fieldset className="grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
          <legend className="mb-3 text-lg font-bold">Dados legados recebidos da origem</legend>
          <p className="text-sm text-stone-600 sm:col-span-2">
            Esses valores só alimentam a compatibilidade com o cadastro anterior. Ofertas novas têm seus próprios dados externos.
          </p>
          <label className="admin-field">
            Preço atual informado pela origem (R$)
            <input name="preco_atual" type="text" inputMode="decimal" placeholder="5.372,80" defaultValue={produto.preco_atual ?? ""} />
          </label>
          <label className="admin-field">
            Preço anterior informado pela origem (R$)
            <input name="preco_antigo" type="text" inputMode="decimal" placeholder="7.123,56" defaultValue={produto.preco_antigo ?? ""} />
          </label>
          <label className="admin-field">
            Avaliação na origem (0 a 5)
            <input name="avaliacao" type="number" min="0" max="5" step="0.1" defaultValue={produto.avaliacao ?? ""} />
          </label>
          <label className="admin-field">
            Vendas informadas pela origem
            <input name="vendas" type="number" min="0" step="1" defaultValue={produto.vendas ?? ""} />
          </label>
          {produto.atualizado_em && (
            <p className="text-sm text-stone-600 sm:col-span-2">
              Última atualização registrada: {new Date(produto.atualizado_em).toLocaleString("pt-BR")}
            </p>
          )}
        </fieldset>

        <button className="rounded-md bg-orange-700 px-4 py-3 font-bold text-white hover:bg-orange-800">
          Salvar produto
        </button>
      </form>
    </main>
  );
}
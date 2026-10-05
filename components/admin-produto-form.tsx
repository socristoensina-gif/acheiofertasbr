import Link from "next/link";
import { salvarProduto } from "@/app/admin/actions";

type Categoria = { id: string | number; nome: string };
type Produto = {
  id: string;
  nome: string;
  categoria_id: string | number;
  link_afiliado: string;
  imagem: string | null;
  preco_atual: number | string;
  preco_antigo: number | string | null;
  beneficios: unknown;
  descricao: string | null;
  destaque: boolean;
  status: string;
};

export function AdminProdutoForm({
  categorias,
  produto,
  erro,
}: {
  categorias: Categoria[];
  produto?: Produto;
  erro?: string;
}) {
  const beneficios = Array.isArray(produto?.beneficios) ? produto.beneficios.join("\n") : "";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="section-kicker">Produtos</p>
          <h1 className="mt-1 text-2xl font-bold">{produto ? "Editar produto" : "Novo produto"}</h1>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-orange-800">Voltar</Link>
      </div>
      {erro && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          Não foi possível salvar. Confira os dados e se o marketplace está cadastrado.
        </p>
      )}
      <form action={salvarProduto} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-2 sm:p-6">
        {produto && <input type="hidden" name="id" value={produto.id} />}
        <label className="admin-field sm:col-span-2">
          Nome
          <input name="nome" defaultValue={produto?.nome} required />
        </label>
        <label className="admin-field">
          Categoria
          <select name="categoria_id" defaultValue={produto?.categoria_id ?? ""} required>
            <option value="" disabled>Selecione</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          Status
          <select name="status" defaultValue={produto?.status ?? "pausado"}>
            <option value="pausado">Pausado</option>
            <option value="publicado">Publicado</option>
          </select>
        </label>
        <label className="admin-field sm:col-span-2">
          Link de afiliado
          <input name="link_afiliado" type="url" defaultValue={produto?.link_afiliado} required />
        </label>
        <label className="admin-field sm:col-span-2">
          URL da imagem
          <input name="imagem" type="url" defaultValue={produto?.imagem ?? ""} />
        </label>
        <label className="admin-field">
          Preço atual
          <input name="preco_atual" type="number" min="0" step="0.01" defaultValue={produto?.preco_atual} required />
        </label>
        <label className="admin-field">
          Preço antigo
          <input name="preco_antigo" type="number" min="0" step="0.01" defaultValue={produto?.preco_antigo ?? ""} />
        </label>
        <label className="admin-field sm:col-span-2">
          Benefícios (um por linha)
          <textarea name="beneficios" rows={5} defaultValue={beneficios} />
        </label>
        <label className="admin-field sm:col-span-2">
          Descrição
          <textarea name="descricao" rows={5} defaultValue={produto?.descricao ?? ""} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
          <input type="checkbox" name="destaque" defaultChecked={produto?.destaque ?? false} />
          Destacar na página inicial
        </label>
        <button className="rounded-md bg-orange-700 px-4 py-3 font-bold text-white hover:bg-orange-800 sm:col-span-2">
          Salvar produto
        </button>
      </form>
    </main>
  );
}
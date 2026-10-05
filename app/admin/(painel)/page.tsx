import Link from "next/link";
import { alterarStatusProduto, excluirProduto } from "@/app/admin/actions";
import { CATEGORY_SLUGS } from "@/lib/config";
import { supabaseAdmin } from "@/utils/supabase";

export default async function AdminProdutosPage() {
  const db = supabaseAdmin();
  const [{ data: produtos }, { data: categorias }] = await Promise.all([
    db.from("produtos").select("id, nome, slug, status, categoria_id, created_at").order("created_at", { ascending: false }),
    db.from("categorias").select("id, nome").in("slug", CATEGORY_SLUGS),
  ]);
  const nomesCategoria = new Map((categorias ?? []).map((item) => [String(item.id), item.nome]));

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Catálogo</p>
          <h1 className="mt-1 text-2xl font-bold">Produtos</h1>
        </div>
        <Link href="/admin/produtos/novo" className="rounded-md bg-orange-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-800">
          Cadastrar produto
        </Link>
      </div>
      {produtos?.length ? (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-600">
              <tr><th className="p-3">Produto</th><th className="p-3">Categoria</th><th className="p-3">Status</th><th className="p-3">Ações</th></tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id} className="border-t border-stone-200">
                  <td className="p-3 font-semibold">{produto.nome}</td>
                  <td className="p-3">{nomesCategoria.get(String(produto.categoria_id)) ?? "-"}</td>
                  <td className="p-3">{produto.status}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link href={`/admin/produtos/${produto.id}`} className="font-semibold text-orange-800">Editar</Link>
                      <form action={alterarStatusProduto}>
                        <input type="hidden" name="id" value={produto.id} />
                        <input type="hidden" name="status" value={produto.status === "publicado" ? "pausado" : "publicado"} />
                        <button className="font-semibold text-stone-700">
                          {produto.status === "publicado" ? "Pausar" : "Publicar"}
                        </button>
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
    </main>
  );
}
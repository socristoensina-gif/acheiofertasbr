import Link from "next/link";
import { AdminPlanilhaImport } from "@/components/admin-planilha-import";
import { requireAdmin } from "@/lib/admin/auth";
import { COLUNAS_MODELO, LIMITE_LINHAS } from "@/lib/admin/planilha";

export const maxDuration = 60;

export default async function PlanilhaPage() {
  await requireAdmin();
  return (
    <main className="mx-auto w-full max-w-4xl flex-1">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="section-kicker">Produtos</p>
          <h1 className="mt-1 text-2xl font-bold">Importar por planilha</h1>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-orange-800">Voltar</Link>
      </div>
      <div className="mb-6 grid gap-2 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700">
        <p><strong>Colunas</strong> (na primeira linha, nesta ordem ou outra): {COLUNAS_MODELO}.</p>
        <p>Obrigatórias: categoria, nome, link e preco. Outras colunas da sua planilha (como comissão ou vendedor) são ignoradas.</p>
        <p>Categoria: o nome ou o slug. Benefícios: separados por <code>|</code>. Destaque e publicar: sim ou nao (publicar sem imagem fica em análise).</p>
        <p>Até {LIMITE_LINHAS} linhas por envio. Sempre clique em Validar antes de Importar.</p>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-4 sm:p-6">
        <AdminPlanilhaImport />
      </div>
    </main>
  );
}
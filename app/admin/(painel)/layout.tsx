import Link from "next/link";
import { logoutAdmin } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";

export default async function AdminPainelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <nav aria-label="Painel administrativo" className="flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/admin" className="hover:text-orange-700">Produtos</Link>
          <Link href="/admin/estatisticas" className="hover:text-orange-700">Estatísticas</Link>
        </nav>
        <form action={logoutAdmin}>
          <button className="text-sm font-semibold text-stone-600 hover:text-orange-700">Sair</button>
        </form>
      </div>
      {children}
    </div>
  );
}
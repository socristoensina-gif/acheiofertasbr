import { redirect } from "next/navigation";
import { loginAdmin } from "@/app/admin/actions";
import { getAdminUser } from "@/lib/admin/auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await getAdminUser()) redirect("/admin");
  const { erro } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
      <section className="w-full rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="section-kicker">Área restrita</p>
        <h1 className="mb-6 mt-1 text-2xl font-bold">Entrar no painel</h1>
        {erro && <p className="mb-4 text-sm text-red-700">E-mail ou senha inválidos.</p>}
        <form action={loginAdmin} className="grid gap-4">
          <label className="admin-field">
            E-mail
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label className="admin-field">
            Senha
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="mt-2 rounded-md bg-orange-700 px-4 py-3 font-bold text-white hover:bg-orange-800">
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
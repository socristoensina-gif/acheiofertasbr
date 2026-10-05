import type { ReactNode } from "react";

export function InstitutionalPage({ title, children, draft = false }: {
  title: string;
  children: ReactNode;
  draft?: boolean;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <p className="section-kicker">Ache Ofertas BR</p>
      <h1 className="mb-6 mt-1 text-3xl font-bold">{title}</h1>
      {draft && <p className="draft-notice">Rascunho para revisão</p>}
      <div className="prose-copy">{children}</div>
    </main>
  );
}
"use client";

import { useState, type ReactNode } from "react";

export function AdminProdutoTabs({
  produto,
  ofertas,
  quantidadeOfertas,
}: {
  produto: ReactNode;
  ofertas: ReactNode;
  quantidadeOfertas: number;
}) {
  const [abaAtiva, setAbaAtiva] = useState<"produto" | "ofertas">("produto");

  return (
    <div>
      <div role="tablist" aria-label="Dados do produto" className="mb-6 flex border-b border-stone-200">
        <button
          id="tab-produto"
          type="button"
          role="tab"
          aria-selected={abaAtiva === "produto"}
          aria-controls="painel-produto"
          onClick={() => setAbaAtiva("produto")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${
            abaAtiva === "produto"
              ? "border-orange-700 text-orange-800"
              : "border-transparent text-stone-600 hover:text-orange-800"
          }`}
        >
          Produto
        </button>
        <button
          id="tab-ofertas"
          type="button"
          role="tab"
          aria-selected={abaAtiva === "ofertas"}
          aria-controls="painel-ofertas"
          onClick={() => setAbaAtiva("ofertas")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${
            abaAtiva === "ofertas"
              ? "border-orange-700 text-orange-800"
              : "border-transparent text-stone-600 hover:text-orange-800"
          }`}
        >
          Ofertas ({quantidadeOfertas})
        </button>
      </div>

      <section
        id="painel-produto"
        role="tabpanel"
        aria-labelledby="tab-produto"
        hidden={abaAtiva !== "produto"}
      >
        {produto}
      </section>
      <section
        id="painel-ofertas"
        role="tabpanel"
        aria-labelledby="tab-ofertas"
        hidden={abaAtiva !== "ofertas"}
      >
        {ofertas}
      </section>
    </div>
  );
}

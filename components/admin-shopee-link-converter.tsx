"use client";

import { useState, type FormEvent } from "react";

export function AdminShopeeLinkConverter({ apiConfigurada }: { apiConfigurada: boolean }) {
  const [originUrl, setOriginUrl] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function converter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAffiliateLink("");
    setLoading(true);

    try {
      const response = await fetch("/api/shopee/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ originUrl }),
      });
      const result: { affiliateLink?: string; error?: string } = await response.json();
      if (!response.ok || !result.affiliateLink) {
        setError(result.error ?? "Não foi possível converter o link. Tente o cadastro manual.");
        return;
      }
      setAffiliateLink(result.affiliateLink);
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente ou use o cadastro manual.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-8 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-bold">Gerar link afiliado Shopee pela API</h2>
        <p className="mt-1 text-sm text-stone-600">
          Converte uma URL de produto em link afiliado. Esta função não importa título, preço ou mídia;
          para isso, use a captura por link ou o cadastro manual.
        </p>
      </div>
      {apiConfigurada ? (
        <form onSubmit={converter} className="grid gap-4">
          <label className="admin-field">
            URL original do produto Shopee
            <input
              type="url"
              inputMode="url"
              value={originUrl}
              onChange={(event) => setOriginUrl(event.target.value)}
              placeholder="https://shopee.com.br/..."
              maxLength={2048}
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-fit rounded-md bg-orange-700 px-4 py-3 font-bold text-white hover:bg-orange-800 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Convertendo..." : "Gerar link afiliado"}
          </button>
        </form>
      ) : (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Integração preparada, aguardando as variáveis secretas{" "}
          <code>SHOPEE_APP_ID</code> e <code>SHOPEE_SECRET_KEY</code> no ambiente do servidor.
          Não adicione essas chaves ao navegador ou ao repositório.
        </p>
      )}
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {affiliateLink && (
        <label className="admin-field">
          Link afiliado gerado — confira e copie para a importação
          <input type="url" value={affiliateLink} readOnly onFocus={(event) => event.currentTarget.select()} />
        </label>
      )}
    </section>
  );
}

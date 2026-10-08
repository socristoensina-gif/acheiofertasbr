"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Modo = "assistida" | "manual";

const BOOKMARKLET = `javascript:(()=>{const m=s=>document.querySelector(s)?.content||"";const p=document.querySelector('[itemprop="price"]')?.getAttribute("content")||m('meta[property="product:price:amount"]');const d={title:m('meta[property="og:title"]')||document.title,price:p||null,image:m('meta[property="og:image"]')||null,url:location.href};navigator.clipboard.writeText(JSON.stringify(d)).then(()=>alert("Dados do anúncio copiados.")).catch(()=>prompt("Copie o JSON:",JSON.stringify(d)))})()`;

const INPUT_INITIAL = {
  url: "",
  title: "",
  price: "",
  image: "",
  description: "",
  characteristics: "",
};

export function AdminImportacaoAssistida() {
  const router = useRouter();
  const [mode, setMode] = useState<Modo>("assistida");
  const [captureJson, setCaptureJson] = useState("");
  const [manual, setManual] = useState(INPUT_INITIAL);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function enviar(method: Modo, data: unknown) {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/importacoes/captura", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, data }),
      });
      const result: { importacaoId?: string; error?: string } = await response.json();
      if (!response.ok || !result.importacaoId) {
        setError(result.error ?? "Não foi possível registrar esta oferta para revisão.");
        return;
      }
      router.push(`/admin/importar?id=${encodeURIComponent(result.importacaoId)}`);
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function enviarCaptura(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let data: unknown;
    try {
      data = JSON.parse(captureJson);
    } catch {
      setError("O conteúdo colado não é um JSON válido.");
      return;
    }
    await enviar("assistida", data);
  }

  async function enviarManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await enviar("manual", {
      url: manual.url,
      title: manual.title,
      price: manual.price || null,
      image: manual.image || null,
      description: manual.description || null,
      characteristics: manual.characteristics
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }

  async function copiarBookmarklet() {
    try {
      await navigator.clipboard.writeText(BOOKMARKLET);
      setError("Código do favorito copiado. Crie um favorito no navegador e cole o código como endereço/URL.");
    } catch {
      setError("Não foi possível acessar a área de transferência. Selecione e copie o código abaixo.");
    }
  }

  return (
    <section className="mb-8 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-bold">Captura assistida ou cadastro manual</h2>
        <p className="mt-1 text-sm text-stone-600">
          Use captura assistida para copiar dados visíveis da página do marketplace, ou informe os dados manualmente.
          Ambos os caminhos criam somente uma entrada na fila de revisão.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Método para informar os dados da oferta">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "assistida"}
          onClick={() => { setMode("assistida"); setError(""); }}
          className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "assistida" ? "bg-orange-700 text-white" : "bg-stone-100 text-stone-700"}`}
        >
          Colar dados capturados
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "manual"}
          onClick={() => { setMode("manual"); setError(""); }}
          className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "manual" ? "bg-orange-700 text-white" : "bg-stone-100 text-stone-700"}`}
        >
          Cadastro manual
        </button>
      </div>

      {mode === "assistida" ? (
        <div className="grid gap-4">
          <details className="rounded-md bg-stone-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Configurar favorito de captura no navegador</summary>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-stone-600">
              <li>Copie o código abaixo.</li>
              <li>Crie um favorito no navegador e cole o código no campo de endereço do favorito.</li>
              <li>Abra a página do produto normalmente, confira os dados e clique no favorito.</li>
              <li>Cole o JSON copiado aqui e informe/ajuste o link afiliado no campo URL do JSON, se necessário.</li>
            </ol>
            <button
              type="button"
              onClick={copiarBookmarklet}
              className="mt-3 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700"
            >
              Copiar código do favorito
            </button>
            <textarea
              aria-label="Código do favorito de captura"
              readOnly
              value={BOOKMARKLET}
              rows={3}
              className="mt-2 w-full rounded-md border border-stone-300 p-2 font-mono text-xs"
            />
            <p className="mt-2 text-xs text-stone-500">
              O favorito lê somente título, preço/imagem em metadados públicos da página aberta e a URL atual.
              Não envia cookies, não consulta endpoints privados e não contorna verificações do marketplace.
            </p>
          </details>
          <form onSubmit={enviarCaptura} className="grid gap-4">
            <label className="admin-field">
              JSON copiado do favorito
              <textarea
                value={captureJson}
                onChange={(event) => setCaptureJson(event.target.value)}
                rows={5}
                maxLength={32_768}
                placeholder={'{"title":"Nome do anúncio","price":"39.90","image":"https://...","url":"https://..."}'}
                required
              />
            </label>
            <p className="text-xs text-stone-500">
              O servidor valida o título, preço, imagem HTTPS e domínio da URL antes de adicionar à fila.
            </p>
            <button disabled={loading} className="w-fit rounded-md bg-orange-700 px-4 py-3 font-bold text-white disabled:opacity-60">
              {loading ? "Validando..." : "Validar e enviar para revisão"}
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={enviarManual} className="grid gap-4 sm:grid-cols-2">
          <label className="admin-field sm:col-span-2">
            Link afiliado ou URL do produto
            <input
              type="url"
              value={manual.url}
              onChange={(event) => setManual({ ...manual, url: event.target.value })}
              maxLength={2048}
              placeholder="https://..."
              required
            />
          </label>
          <label className="admin-field sm:col-span-2">
            Título conferido no marketplace
            <input
              value={manual.title}
              onChange={(event) => setManual({ ...manual, title: event.target.value })}
              maxLength={300}
              required
            />
          </label>
          <label className="admin-field">
            Preço atual (opcional)
            <input
              type="number"
              min="0"
              step="0.01"
              value={manual.price}
              onChange={(event) => setManual({ ...manual, price: event.target.value })}
            />
          </label>
          <label className="admin-field">
            URL da imagem (opcional, HTTPS)
            <input
              type="url"
              value={manual.image}
              onChange={(event) => setManual({ ...manual, image: event.target.value })}
              maxLength={2048}
            />
          </label>
          <label className="admin-field sm:col-span-2">
            Descrição (opcional)
            <textarea
              value={manual.description}
              onChange={(event) => setManual({ ...manual, description: event.target.value })}
              rows={3}
              maxLength={10_000}
            />
          </label>
          <label className="admin-field sm:col-span-2">
            Características (opcional, uma por linha)
            <textarea
              value={manual.characteristics}
              onChange={(event) => setManual({ ...manual, characteristics: event.target.value })}
              rows={3}
              maxLength={10_000}
            />
          </label>
          <button disabled={loading} className="w-fit rounded-md bg-orange-700 px-4 py-3 font-bold text-white disabled:opacity-60 sm:col-span-2">
            {loading ? "Validando..." : "Adicionar à fila de revisão"}
          </button>
        </form>
      )}

      {error && <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    </section>
  );
}

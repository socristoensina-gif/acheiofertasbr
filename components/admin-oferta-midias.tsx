"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { salvarMidiasProdutoOferta } from "@/app/admin/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  MEDIA_BUCKET,
  MEDIA_FILE_TYPES,
  MAX_OFFER_IMAGES,
  MAX_OFFER_VIDEOS,
  type MediaKind,
  type OfferMedia,
} from "@/lib/media/config";
import { getVideoPlayback } from "@/lib/media/video-playback";

type Item = {
  id: string;
  kind: MediaKind;
  previewUrl: string;
  storagePath: string | null;
  externalUrl: string | null;
  jaAprovada: boolean;
  local: boolean;
  status: "enviando" | "pronto" | "erro";
  erro?: string;
};

const LIMITE: Record<MediaKind, number> = { image: MAX_OFFER_IMAGES, video: MAX_OFFER_VIDEOS };
const ACEITA: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/avif,image/gif",
  video: "video/mp4,video/webm",
};
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
const MAX_IMAGEM_BYTES = 25 * 1024 * 1024;
const MAX_LADO = 1600;

async function otimizarImagem(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

function urlHttps(valor: string) {
  try {
    const u = new URL(valor);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}

export function AdminOfertaMidias({
  ofertaId,
  produtoId,
  initialMedia,
}: {
  ofertaId: string;
  produtoId: string;
  initialMedia: OfferMedia[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [itens, setItens] = useState<Item[]>(() =>
    initialMedia.map((m) => ({
      id: crypto.randomUUID(),
      kind: m.kind,
      previewUrl: m.previewUrl,
      storagePath: m.storagePath,
      externalUrl: m.externalUrl,
      jaAprovada: m.approved,
      local: false,
      status: "pronto" as const,
    })),
  );
  const [descartados, setDescartados] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [link, setLink] = useState("");
  const [alterado, setAlterado] = useState(false);
  const previews = useRef<string[]>([]);
  const ocupado = itens.some((i) => i.status === "enviando");
  const comErro = itens.some((i) => i.status === "erro");

  useEffect(() => () => { previews.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

  const midias = itens
    .filter((i) => i.status === "pronto")
    .map((i) => ({
      tipo: i.kind === "image" ? "imagem" : "video",
      storage_path: i.storagePath,
      url_externa: i.externalUrl,
      aprovado: true,
    }));

  function atualizar(id: string, dados: Partial<Item>) {
    setItens((atual) => atual.map((i) => (i.id === id ? { ...i, ...dados } : i)));
  }

  async function enviar(id: string, kind: MediaKind, arquivo: File) {
    try {
      const resposta = await fetch("/api/admin/media/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, contentType: arquivo.type, fileSize: arquivo.size }),
      });
      const dados: unknown = await resposta.json();
      if (
        !resposta.ok || !dados || typeof dados !== "object" ||
        !("path" in dados) || typeof dados.path !== "string" ||
        !("token" in dados) || typeof dados.token !== "string"
      ) {
        const msg = dados && typeof dados === "object" && "error" in dados && typeof dados.error === "string"
          ? dados.error : "Não foi possível preparar o envio.";
        throw new Error(msg);
      }
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .uploadToSignedUrl(dados.path, dados.token, arquivo, { cacheControl: "31536000", contentType: arquivo.type });
      if (error) throw new Error("O arquivo não foi enviado. Tente novamente.");
      atualizar(id, { status: "pronto", storagePath: dados.path });
    } catch (e) {
      atualizar(id, { status: "erro", erro: e instanceof Error ? e.message : "Falha no envio." });
    }
  }

  async function adicionarArquivos(kind: MediaKind, lista: FileList | File[]) {
    setErro("");
    const arquivos = Array.from(lista);
    if (itens.filter((i) => i.kind === kind).length + arquivos.length > LIMITE[kind]) {
      setErro(kind === "image" ? `Máximo de ${LIMITE.image} imagens por produto.` : `Máximo de ${LIMITE.video} vídeos por produto.`);
      return;
    }
    for (const a of arquivos) {
      if (!Object.hasOwn(MEDIA_FILE_TYPES[kind], a.type)) {
        setErro(kind === "image" ? "Use imagens JPG, PNG, WebP, AVIF ou GIF." : "Use vídeos MP4 ou WebM.");
        return;
      }
      if (kind === "video" && a.size > MAX_VIDEO_BYTES) { setErro("Cada vídeo pode ter até 30 MB."); return; }
      if (kind === "image" && a.size > MAX_IMAGEM_BYTES) { setErro("Imagem muito grande (máximo 25 MB)."); return; }
    }
    setAlterado(true);
    for (const original of arquivos) {
      const id = crypto.randomUUID();
      const arquivo = kind === "image" ? await otimizarImagem(original) : original;
      const preview = URL.createObjectURL(arquivo);
      previews.current.push(preview);
      setItens((atual) => [...atual, {
        id, kind, previewUrl: preview, storagePath: null, externalUrl: null,
        jaAprovada: true, local: true, status: "enviando",
      }]);
      void enviar(id, kind, arquivo);
    }
  }

  function adicionarLink(kind: MediaKind) {
    setErro("");
    const url = urlHttps(link.trim());
    if (!url) { setErro("Informe uma URL HTTPS válida."); return; }
    if (itens.some((i) => i.externalUrl === url)) { setErro("Esta URL já foi adicionada."); return; }
    if (itens.filter((i) => i.kind === kind).length >= LIMITE[kind]) { setErro("Limite de mídias atingido."); return; }
    setItens((atual) => [...atual, {
      id: crypto.randomUUID(), kind, previewUrl: url, storagePath: null, externalUrl: url,
      jaAprovada: true, local: false, status: "pronto",
    }]);
    setAlterado(true);
    setLink("");
  }

  function remover(item: Item) {
    if (item.storagePath) setDescartados((a) => [...new Set([...a, item.storagePath!])]);
    setItens((atual) => atual.filter((i) => i.id !== item.id));
    setAlterado(true);
  }

  function reordenar(kind: MediaKind, nova: (grupo: Item[]) => Item[]) {
    setItens((atual) => {
      const grupo = nova(atual.filter((i) => i.kind === kind));
      let k = 0;
      return atual.map((i) => (i.kind === kind ? grupo[k++] : i));
    });
    setAlterado(true);
  }

  function mover(item: Item, delta: -1 | 1) {
    reordenar(item.kind, (grupo) => {
      const pos = grupo.findIndex((i) => i.id === item.id);
      const novo = pos + delta;
      if (pos < 0 || novo < 0 || novo >= grupo.length) return grupo;
      const copia = [...grupo];
      [copia[pos], copia[novo]] = [copia[novo], copia[pos]];
      return copia;
    });
  }

  function definirCapa(item: Item) {
    reordenar(item.kind, (grupo) => {
      const alvo = grupo.find((i) => i.id === item.id);
      return alvo ? [alvo, ...grupo.filter((i) => i.id !== item.id)] : grupo;
    });
  }

  function miniatura(item: Item) {
    if (item.kind === "image") {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />;
    }
    if (item.local) {
      return <video src={item.previewUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
    }
    const reproducao = getVideoPlayback(item.previewUrl);
    if (reproducao?.kind === "file") {
      return <video src={reproducao.src} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
    }
    return <span className="flex h-full items-center justify-center bg-stone-900 p-2 text-center text-xs text-white">▶ Vídeo</span>;
  }

  function secao(kind: MediaKind, titulo: string) {
    const grupo = itens.filter((i) => i.kind === kind);
    return (
      <section className="grid gap-3" aria-label={titulo}>
        <h4 className="font-semibold">{titulo} ({grupo.length}/{LIMITE[kind]})</h4>
        {grupo.length < LIMITE[kind] && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void adicionarArquivos(kind, e.dataTransfer.files); }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 p-4 text-sm"
          >
            <span>Arraste {kind === "image" ? "as imagens" : "os vídeos"} aqui</span>
            <label className="cursor-pointer rounded-md border border-stone-300 bg-white px-3 py-2 font-semibold">
              Buscar no computador
              <input
                type="file" multiple accept={ACEITA[kind]} className="sr-only"
                onChange={(e) => {
                  if (e.currentTarget.files) void adicionarArquivos(kind, e.currentTarget.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        )}
        {grupo.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {grupo.map((item, indice) => (
              <li key={item.id} className="grid gap-2 rounded-lg border border-stone-200 bg-white p-2">
                <div className="relative aspect-square overflow-hidden rounded bg-stone-100">
                  {miniatura(item)}
                  {indice === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-orange-700 px-2 py-0.5 text-xs font-bold text-white">
                      {kind === "image" ? "Capa" : "Principal"}
                    </span>
                  )}
                  {!item.jaAprovada && (
                    <span className="absolute bottom-1 left-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                      Pendente
                    </span>
                  )}
                  {item.status === "enviando" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold">Enviando...</div>
                  )}
                  {item.status === "erro" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 p-2 text-center text-xs font-semibold text-red-700">{item.erro}</div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button type="button" onClick={() => mover(item, -1)} disabled={indice === 0} aria-label="Mover para antes" className="rounded border border-stone-300 px-2 py-1 text-xs font-bold disabled:opacity-30">←</button>
                  <button type="button" onClick={() => mover(item, 1)} disabled={indice === grupo.length - 1} aria-label="Mover para depois" className="rounded border border-stone-300 px-2 py-1 text-xs font-bold disabled:opacity-30">→</button>
                  <button type="button" onClick={() => definirCapa(item)} disabled={indice === 0} className="rounded border border-stone-300 px-2 py-1 text-xs font-semibold disabled:opacity-30">★ Capa</button>
                  <button type="button" onClick={() => remover(item)} disabled={item.status === "enviando"} aria-label="Remover" className="rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-700 disabled:opacity-30">✕</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <form action={salvarMidiasProdutoOferta} className="mt-4 grid gap-5 border-t border-stone-200 pt-4">
      <input type="hidden" name="produto_id" value={produtoId} />
      <input type="hidden" name="oferta_id" value={ofertaId} />
      <input type="hidden" name="midias" value={JSON.stringify(midias)} />
      <input type="hidden" name="paths_descartados" value={JSON.stringify(descartados)} />
      <div>
        <h3 className="font-semibold">Imagens e vídeos desta oferta</h3>
        <p className="text-xs text-stone-600">
          A primeira imagem é a capa. Ao salvar a galeria, as mídias ficam aprovadas para o público.
        </p>
      </div>
      {secao("image", "Imagens")}
      {secao("video", "Vídeos")}
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">Usar link (imagem ou YouTube/Vimeo)</summary>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="min-w-0 flex-1 rounded border border-stone-300 px-3 py-2" />
          <button type="button" onClick={() => adicionarLink("image")} className="rounded border border-stone-300 px-3 py-2 font-semibold">Como imagem</button>
          <button type="button" onClick={() => adicionarLink("video")} className="rounded border border-stone-300 px-3 py-2 font-semibold">Como vídeo</button>
        </div>
      </details>
      {erro && <p role="alert" className="text-sm font-medium text-red-700">{erro}</p>}
      {comErro && <p role="alert" className="text-sm font-medium text-red-700">Há arquivos com erro de envio. Remova-os ou tente de novo; eles não serão salvos.</p>}
      {alterado && !ocupado && <p className="text-sm text-amber-800">Há alterações ainda não salvas.</p>}
      <button
        disabled={ocupado}
        className="w-fit rounded-md bg-orange-700 px-4 py-3 font-bold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {ocupado ? "Aguarde o envio..." : "Salvar galeria"}
      </button>
    </form>
  );
}
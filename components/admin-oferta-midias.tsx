"use client";

import { useEffect, useRef, useState } from "react";
import { salvarMidiasProdutoOferta } from "@/app/admin/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  MEDIA_BUCKET,
  MEDIA_FILE_TYPES,
  MAX_MEDIA_FILE_SIZE,
  MAX_OFFER_IMAGES,
  MAX_OFFER_VIDEOS,
  type MediaKind,
  type OfferMedia,
} from "@/lib/media/config";
import { getVideoPlayback } from "@/lib/media/video-playback";

type MediaItem = OfferMedia & {
  id: string;
  file?: File;
};

const ACCEPT: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/avif,image/gif",
  video: "video/mp4,video/webm",
};
const LIMIT: Record<MediaKind, number> = {
  image: MAX_OFFER_IMAGES,
  video: MAX_OFFER_VIDEOS,
};

function validHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : null;
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
  const [items, setItems] = useState<MediaItem[]>(() =>
    initialMedia.map((media) => ({ ...media, id: crypto.randomUUID() })),
  );
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [discardedPaths, setDiscardedPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const objectUrls = useRef<string[]>([]);

  useEffect(() => () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const images = items.filter((item) => item.kind === "image");
  const videos = items.filter((item) => item.kind === "video");
  const pending = items.filter((item) => item.file).length;
  const serialized = items.map((item) => ({
    tipo: item.kind === "image" ? "imagem" : "video",
    storage_path: item.storagePath,
    url_externa: item.externalUrl,
    aprovado: item.approved,
  }));

  function addFiles(kind: MediaKind, files: FileList | File[]) {
    if (uploading) return;
    setError("");
    setNotice("");
    const incoming = Array.from(files);
    const count = items.filter((item) => item.kind === kind).length;
    if (count + incoming.length > LIMIT[kind]) {
      setError(kind === "image"
        ? `Uma oferta aceita no máximo ${MAX_OFFER_IMAGES} imagens.`
        : `Uma oferta aceita no máximo ${MAX_OFFER_VIDEOS} vídeos.`);
      return;
    }
    for (const file of incoming) {
      if (!Object.hasOwn(MEDIA_FILE_TYPES[kind], file.type)) {
        setError(kind === "image"
          ? "Use imagens JPG, PNG, WebP, AVIF ou GIF."
          : "Use vídeos MP4 ou WebM.");
        return;
      }
      if (file.size < 1 || file.size > MAX_MEDIA_FILE_SIZE) {
        setError(`Cada arquivo pode ter até ${MAX_MEDIA_FILE_SIZE / (1024 * 1024)} MB.`);
        return;
      }
    }
    const newItems = incoming.map((file): MediaItem => {
      const previewUrl = URL.createObjectURL(file);
      objectUrls.current.push(previewUrl);
      return {
        id: crypto.randomUUID(),
        kind,
        storagePath: null,
        externalUrl: null,
        previewUrl,
        approved: false,
        file,
      };
    });
    setItems((current) => [...current, ...newItems]);
  }

  function addExternalUrl(kind: MediaKind) {
    if (uploading) return;
    const url = validHttpsUrl(kind === "image" ? imageUrl.trim() : videoUrl.trim());
    if (!url) {
      setError("Informe uma URL HTTPS válida.");
      return;
    }
    if (items.some((item) => item.externalUrl === url)) {
      setError("Esta URL já foi adicionada à oferta.");
      return;
    }
    if (items.filter((item) => item.kind === kind).length >= LIMIT[kind]) {
      setError(kind === "image"
        ? `Uma oferta aceita no máximo ${MAX_OFFER_IMAGES} imagens.`
        : `Uma oferta aceita no máximo ${MAX_OFFER_VIDEOS} vídeos.`);
      return;
    }
    setError("");
    setNotice("");
    setItems((current) => [...current, {
      id: crypto.randomUUID(),
      kind,
      storagePath: null,
      externalUrl: url,
      previewUrl: url,
      approved: false,
    }]);
    if (kind === "image") setImageUrl("");
    else setVideoUrl("");
  }

  function removeItem(item: MediaItem) {
    if (uploading) return;
    if (item.file) {
      URL.revokeObjectURL(item.previewUrl);
      objectUrls.current = objectUrls.current.filter((url) => url !== item.previewUrl);
    }
    if (item.storagePath) {
      setDiscardedPaths((current) => [...new Set([...current, item.storagePath!])]);
    }
    setItems((current) => current.filter(({ id }) => id !== item.id));
    setError("");
    setNotice("");
  }

  function setPrimary(item: MediaItem) {
    setItems((current) => {
      const group = current.filter((entry) => entry.kind === item.kind);
      if (group[0]?.id === item.id) return current;
      const reordered = [item, ...group.filter((entry) => entry.id !== item.id)];
      let index = 0;
      return current.map((entry) => entry.kind === item.kind ? reordered[index++] : entry);
    });
  }

  function moveItem(item: MediaItem, offset: -1 | 1) {
    setItems((current) => {
      const group = current.filter((entry) => entry.kind === item.kind);
      const index = group.findIndex((entry) => entry.id === item.id);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= group.length) return current;
      [group[index], group[nextIndex]] = [group[nextIndex], group[index]];
      let groupIndex = 0;
      return current.map((entry) =>
        entry.kind === item.kind ? group[groupIndex++] : entry,
      );
    });
  }

  async function uploadFiles() {
    if (uploading || pending === 0) return;
    setUploading(true);
    setError("");
    setNotice("");
    const uploaded = new Map<string, { path: string; previewUrl?: string }>();
    try {
      const storage = createSupabaseBrowserClient().storage.from(MEDIA_BUCKET);
      for (const item of items.filter((entry) => entry.file)) {
        const file = item.file!;
        const uploadResponse = await fetch("/api/admin/media/upload-url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: item.kind,
            contentType: file.type,
            fileSize: file.size,
          }),
        });
        const uploadData: unknown = await uploadResponse.json();
        if (
          !uploadResponse.ok ||
          !uploadData ||
          typeof uploadData !== "object" ||
          !("path" in uploadData) ||
          typeof uploadData.path !== "string" ||
          !("token" in uploadData) ||
          typeof uploadData.token !== "string"
        ) {
          const message = uploadData && typeof uploadData === "object" &&
            "error" in uploadData && typeof uploadData.error === "string"
            ? uploadData.error
            : "Não foi possível preparar o envio do arquivo.";
          throw new Error(message);
        }

        const { error: uploadError } = await storage.uploadToSignedUrl(
          uploadData.path,
          uploadData.token,
          file,
          { cacheControl: "31536000", contentType: file.type },
        );
        if (uploadError) {
          throw new Error("O arquivo não foi enviado. Confira o bucket e tente novamente.");
        }
        uploaded.set(item.id, { path: uploadData.path });

        const previewResponse = await fetch("/api/admin/media/preview-url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path: uploadData.path }),
        });
        const previewData: unknown = await previewResponse.json();
        if (
          !previewResponse.ok ||
          !previewData ||
          typeof previewData !== "object" ||
          !("previewUrl" in previewData) ||
          typeof previewData.previewUrl !== "string"
        ) {
          throw new Error("Arquivo enviado, mas não foi possível gerar a prévia. Tente atualizar a edição.");
        }
        uploaded.set(item.id, { path: uploadData.path, previewUrl: previewData.previewUrl });
      }

      updateUploadedItems(uploaded);
      setNotice("Arquivos enviados. Aprove as mídias desejadas e salve a galeria.");
    } catch (uploadError) {
      updateUploadedItems(uploaded);
      setError(uploadError instanceof Error ? uploadError.message : "Falha no envio dos arquivos.");
    } finally {
      setUploading(false);
    }
  }

  function updateUploadedItems(uploaded: Map<string, { path: string; previewUrl?: string }>) {
    if (uploaded.size === 0) return;
    setItems((current) => current.map((item) => {
      const saved = uploaded.get(item.id);
      if (!saved) return item;
      URL.revokeObjectURL(item.previewUrl);
      objectUrls.current = objectUrls.current.filter((url) => url !== item.previewUrl);
      return {
        ...item,
        storagePath: saved.path,
        externalUrl: null,
        previewUrl: saved.previewUrl ?? item.previewUrl,
        file: undefined,
      };
    }));
  }

  function renderMedia(item: MediaItem, index: number) {
    if (!item.previewUrl) {
      return <p role="status" className="rounded bg-amber-50 p-3 text-xs text-amber-900">Prévia indisponível; confirme a configuração do Storage.</p>;
    }
    if (item.kind === "image") {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={item.previewUrl} alt={`Imagem ${index + 1} da oferta`} className="h-36 w-full rounded bg-stone-100 object-contain" />;
    }
    const playback = getVideoPlayback(item.previewUrl);
    if (playback?.kind === "file") {
      return <video src={playback.src} controls playsInline preload="metadata" className="max-h-48 w-full rounded bg-black" />;
    }
    if (playback?.kind === "embed") {
      return (
        <iframe
          src={playback.src}
          title={`Vídeo ${index + 1} da oferta`}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="aspect-video w-full rounded border-0"
        />
      );
    }
    return (
      <a href={item.previewUrl} target="_blank" rel="noreferrer noopener" className="break-all text-sm text-orange-800 underline">
        Abrir vídeo na origem
      </a>
    );
  }

  function renderSection(kind: MediaKind, media: MediaItem[], url: string, onUrlChange: (value: string) => void, title: string) {
    const remaining = LIMIT[kind] - media.length;
    return (
      <section className="grid gap-3 rounded-md border border-stone-200 p-3" aria-label={title}>
        <div>
          <h4 className="font-semibold">{title} ({media.length}/{LIMIT[kind]})</h4>
          <p className="text-xs text-stone-600">
            {kind === "image"
              ? "JPEG, PNG, WebP, AVIF ou GIF; até 50 MB por arquivo."
              : "MP4 ou WebM; até 50 MB por arquivo. Também pode usar URL HTTPS do YouTube/Vimeo."}
          </p>
        </div>
        {remaining > 0 && (
          <>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                addFiles(kind, event.dataTransfer.files);
              }}
              className="flex flex-wrap items-center justify-between gap-3 rounded border-2 border-dashed border-stone-300 bg-stone-50 p-3 text-sm"
            >
              <span>Arraste {kind === "image" ? "imagens" : "vídeos"} para cá</span>
              <label className="cursor-pointer rounded border border-stone-300 bg-white px-3 py-2 font-semibold">
                Buscar arquivos
                <input
                  type="file"
                  multiple
                  accept={ACCEPT[kind]}
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => {
                    if (event.currentTarget.files) addFiles(kind, event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                value={url}
                onChange={(event) => onUrlChange(event.target.value)}
                placeholder={`URL HTTPS de ${kind === "image" ? "imagem" : "vídeo"}`}
                className="min-w-0 flex-1 rounded border border-stone-300 px-3 py-2 text-sm"
                disabled={uploading}
              />
              <button
                type="button"
                onClick={() => addExternalUrl(kind)}
                disabled={uploading}
                className="rounded border border-stone-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Adicionar URL
              </button>
            </div>
          </>
        )}
        {media.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {media.map((item, index) => (
              <li key={item.id} className="grid gap-2 rounded border border-stone-200 p-3">
                {renderMedia(item, index)}
                <p className="break-all text-xs text-stone-600">
                  {item.file?.name ?? item.externalUrl ?? item.storagePath}
                  {item.file && ` (${(item.file.size / (1024 * 1024)).toFixed(1)} MB)`}
                </p>
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={item.approved}
                    onChange={(event) => setItems((current) =>
                      current.map((entry) => entry.id === item.id
                        ? { ...entry, approved: event.target.checked }
                        : entry),
                    )}
                    disabled={uploading}
                  />
                  Mídia aprovada para exibição pública
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => moveItem(item, -1)}
                    disabled={uploading || index === 0}
                    aria-label={`Mover mídia ${index + 1} para cima`}
                    className="rounded border border-stone-300 px-2 py-1 text-xs font-semibold disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(item, 1)}
                    disabled={uploading || index === media.length - 1}
                    aria-label={`Mover mídia ${index + 1} para baixo`}
                    className="rounded border border-stone-300 px-2 py-1 text-xs font-semibold disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimary(item)}
                    disabled={uploading || media[0]?.id === item.id}
                    className="rounded border border-stone-300 px-2 py-1 text-xs font-semibold disabled:bg-orange-50 disabled:text-orange-800"
                  >
                    {media[0]?.id === item.id ? "Principal" : "Definir principal"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    disabled={uploading}
                    className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <form action={salvarMidiasProdutoOferta} className="mt-4 grid gap-4 border-t border-stone-200 pt-4">
      <input type="hidden" name="produto_id" value={produtoId} />
      <input type="hidden" name="oferta_id" value={ofertaId} />
      <input type="hidden" name="midias" value={JSON.stringify(serialized)} />
      <input type="hidden" name="paths_descartados" value={JSON.stringify(discardedPaths)} />
      <div>
        <h3 className="font-semibold">Mídias desta oferta</h3>
        <p className="text-xs text-stone-600">
          O público só acessa mídias aprovadas quando a oferta está ativa e o produto publicado.
        </p>
      </div>
      {renderSection("image", images, imageUrl, setImageUrl, "Imagens")}
      {renderSection("video", videos, videoUrl, setVideoUrl, "Vídeos")}
      {pending > 0 && (
        <button
          type="button"
          disabled={uploading}
          onClick={uploadFiles}
          className="w-fit rounded border border-stone-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {uploading ? "Enviando arquivos..." : `Enviar ${pending} arquivo${pending === 1 ? "" : "s"}`}
        </button>
      )}
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm font-medium text-green-800">{notice}</p>}
      <button
        disabled={pending > 0 || uploading}
        className="w-fit rounded-md bg-orange-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        Salvar galeria da oferta
      </button>
    </form>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  MEDIA_BUCKET,
  MEDIA_FILE_TYPES,
  MAX_MEDIA_FILE_SIZE,
  type MediaKind,
} from "@/lib/media/config";
import { getVideoPlayback } from "@/lib/media/video-playback";

type Props = {
  name: string;
  label: string;
  kind: MediaKind;
  value: string;
  onValueChange: (value: string) => void;
  onUploadStateChange: (active: boolean) => void;
};

const FILE_ACCEPT: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/avif,image/gif",
  video: "video/mp4,video/webm",
};

function mediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function AdminMediaField({
  name,
  label,
  kind,
  value,
  onValueChange,
  onUploadStateChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function resetSelectedFile() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setLocalPreview("");
    setSelectedFile(null);
  }

  function chooseFile(file: File | undefined) {
    if (uploading) return;
    setError("");
    setMessage("");
    if (!file) return;
    const acceptedTypes = MEDIA_FILE_TYPES[kind];
    if (!(file.type in acceptedTypes)) {
      resetSelectedFile();
      setError(kind === "image"
        ? "Escolha uma imagem JPG, PNG, WebP, AVIF ou GIF."
        : "Escolha um vídeo MP4 ou WebM.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_MEDIA_FILE_SIZE) {
      resetSelectedFile();
      setError("O arquivo deve ter até 50 MB.");
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(file);
    setLocalPreview(previewUrlRef.current);
    setSelectedFile(file);
  }

  async function uploadSelectedFile() {
    if (!selectedFile || uploading) return;
    setUploading(true);
    onUploadStateChange(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/media/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          contentType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      });
      const result: unknown = await response.json();
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("path" in result) ||
        typeof result.path !== "string" ||
        !("token" in result) ||
        typeof result.token !== "string"
      ) {
        const message = result && typeof result === "object" && "error" in result &&
          typeof result.error === "string"
          ? result.error
          : "Não foi possível preparar o envio.";
        throw new Error(message);
      }

      const storage = createSupabaseBrowserClient().storage.from(MEDIA_BUCKET);
      const { error: uploadError } = await storage.uploadToSignedUrl(
        result.path,
        result.token,
        selectedFile,
        {
          cacheControl: "31536000",
          contentType: selectedFile.type,
        },
      );
      if (uploadError) throw new Error("O arquivo não foi enviado. Tente novamente.");

      const { data } = storage.getPublicUrl(result.path);
      onValueChange(data.publicUrl);
      resetSelectedFile();
      setMessage("Arquivo enviado. Salve o produto para aplicar a mídia.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Falha no envio do arquivo.");
    } finally {
      setUploading(false);
      onUploadStateChange(false);
    }
  }

  const previewUrl = localPreview || mediaUrl(value);
  const videoPlayback = kind === "video" && previewUrl
    ? getVideoPlayback(previewUrl)
    : null;

  return (
    <div className="grid gap-2 sm:col-span-2">
      <label className="admin-field">
        {label}
        <input
          name={name}
          type="url"
          disabled={uploading}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setMessage("");
          }}
          placeholder="Cole uma URL HTTPS ou envie um arquivo abaixo"
        />
      </label>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (uploading) event.dataTransfer.dropEffect = "none";
        }}
        onDrop={(event) => {
          event.preventDefault();
          chooseFile(event.dataTransfer.files.item(0) ?? undefined);
        }}
        aria-disabled={uploading}
        className={`grid gap-3 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-700 sm:grid-cols-[1fr_auto] sm:items-center${uploading ? " opacity-60" : ""}`}
      >
        <div>
          <p className="font-semibold">
            Arraste {kind === "image" ? "uma imagem" : "um vídeo"} e solte aqui
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {kind === "image"
              ? "JPG, PNG, WebP, AVIF ou GIF."
              : "MP4 ou WebM; esses formatos têm suporte amplo nos navegadores."}{" "}
            Tamanho máximo: 50 MB.
          </p>
          {selectedFile && (
            <p className="mt-2 break-all text-xs font-medium">
              Selecionado: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
            </p>
          )}
        </div>
        <label className="cursor-pointer rounded-md border border-stone-300 bg-white px-3 py-2 text-center font-semibold hover:bg-stone-100">
          Buscar no computador
          <input
            ref={inputRef}
            type="file"
            accept={FILE_ACCEPT[kind]}
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              chooseFile(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {selectedFile && (
        <button
          type="button"
          disabled={uploading}
          onClick={uploadSelectedFile}
          className="w-fit rounded-md bg-stone-800 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-900 disabled:opacity-60"
        >
          {uploading ? "Enviando arquivo..." : "Enviar arquivo"}
        </button>
      )}

      {previewUrl && kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={`Prévia: ${label}`} className="max-h-56 w-fit rounded-md border border-stone-200 object-contain" />
      )}
      {previewUrl && kind === "video" && videoPlayback?.kind === "file" && (
        <video
          src={videoPlayback.src}
          controls
          playsInline
          preload="metadata"
          className="max-h-72 w-full rounded-md bg-black"
        >
          Seu navegador não consegue reproduzir este vídeo.
        </video>
      )}
      {previewUrl && kind === "video" && videoPlayback?.kind === "embed" && (
        <p className="text-xs text-stone-600">Vídeo incorporado suportado na página pública.</p>
      )}
      {previewUrl && kind === "video" && videoPlayback?.kind === "link" && (
        <a href={videoPlayback.src} target="_blank" rel="noreferrer noopener" className="text-xs text-orange-800 underline">
          Este formato não tem reprodução incorporada; abrir vídeo na origem.
        </a>
      )}
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm font-medium text-green-800">{message}</p>}
    </div>
  );
}

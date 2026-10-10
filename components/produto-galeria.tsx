"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { VideoPlayer } from "@/components/video-player";

type Item = { tipo: "imagem" | "video"; url: string };

const MIN_DESLIZE = 40;

export function ProdutoGaleria({
  nome,
  imagens,
  videos,
  videoPrimeiro = false,
}: {
  nome: string;
  imagens: string[];
  videos: string[];
  videoPrimeiro?: boolean;
}) {
  const [atual, setAtual] = useState(0);
  const [falhas, setFalhas] = useState<string[]>([]);
  const [inicioToque, setInicioToque] = useState<number | null>(null);

  const listaImagens: Item[] = imagens.map((url) => ({ tipo: "imagem", url }));
  const listaVideos: Item[] = videos.map((url) => ({ tipo: "video", url }));
  const itens = (videoPrimeiro ? [...listaVideos, ...listaImagens] : [...listaImagens, ...listaVideos])
    .filter((item) => !falhas.includes(item.url));

  if (itens.length === 0) return null;

  const total = itens.length;
  const indice = Math.min(atual, total - 1);
  const item = itens[indice];

  function ir(destino: number) {
    setAtual((destino + total) % total);
  }

  function aoSoltar(x: number) {
    if (inicioToque === null) return;
    const diferenca = x - inicioToque;
    setInicioToque(null);
    if (Math.abs(diferenca) < MIN_DESLIZE) return;
    ir(diferenca < 0 ? indice + 1 : indice - 1);
  }

  function marcarFalha(url: string) {
    setFalhas((anterior) => (anterior.includes(url) ? anterior : [...anterior, url]));
  }

  return (
    <div className="grid gap-3">
      <div
        role="group"
        aria-roledescription="carrossel"
        aria-label={`Fotos e vídeos de ${nome}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") ir(indice - 1);
          if (e.key === "ArrowRight") ir(indice + 1);
        }}
        onTouchStart={(e) => setInicioToque(e.touches[0].clientX)}
        onTouchEnd={(e) => aoSoltar(e.changedTouches[0].clientX)}
        className="relative aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-white outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
      >
        {item.tipo === "imagem" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.url}
            src={item.url}
            alt={`${nome}, imagem ${indice + 1}`}
            referrerPolicy="no-referrer"
            onError={() => marcarFalha(item.url)}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black">
            <div className="w-full">
              <VideoPlayer key={item.url} src={item.url} title={`Vídeo: ${nome}`} />
            </div>
          </div>
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => ir(indice - 1)}
              aria-label="Mídia anterior"
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow hover:bg-white"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => ir(indice + 1)}
              aria-label="Próxima mídia"
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow hover:bg-white"
            >
              <ChevronRight size={22} />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white">
              {indice + 1}/{total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-7">
          {itens.map((miniatura, posicao) => (
            <li key={miniatura.url}>
              <button
                type="button"
                onClick={() => setAtual(posicao)}
                aria-label={miniatura.tipo === "video" ? "Ver vídeo" : `Ver imagem ${posicao + 1}`}
                aria-current={posicao === indice}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-white ${
                  posicao === indice ? "border-orange-600" : "border-stone-200 hover:border-stone-400"
                }`}
              >
                {miniatura.tipo === "imagem" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={miniatura.url}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => marcarFalha(miniatura.url)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-stone-900 text-white">
                    <Play size={22} fill="currentColor" />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

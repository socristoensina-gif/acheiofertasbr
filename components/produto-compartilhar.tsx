"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, MessageCircle, Send } from "lucide-react";

const botao =
  "flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600";

function urlDaPagina() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function ProdutoCompartilhar({ nome }: { nome: string }) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  function abrir(montar: (url: string, texto: string) => string) {
    const destino = montar(encodeURIComponent(urlDaPagina()), encodeURIComponent(nome));
    window.open(destino, "_blank", "noopener,noreferrer");
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(urlDaPagina());
      setCopiado(true);
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie o link:", urlDaPagina());
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold text-stone-700">Compartilhar:</span>
      <button
        type="button"
        onClick={() => abrir((url, texto) => `https://wa.me/?text=${texto}%20${url}`)}
        aria-label="Compartilhar no WhatsApp"
        title="WhatsApp"
        className={`${botao} bg-[#25D366]`}
      >
        <MessageCircle size={18} />
      </button>
      <button
        type="button"
        onClick={() => abrir((url) => `https://www.facebook.com/sharer/sharer.php?u=${url}`)}
        aria-label="Compartilhar no Facebook"
        title="Facebook"
        className={`${botao} bg-[#1877F2]`}
      >
        <span className="text-lg font-black leading-none">f</span>
      </button>
      <button
        type="button"
        onClick={() => abrir((url, texto) => `https://x.com/intent/post?text=${texto}&url=${url}`)}
        aria-label="Compartilhar no X"
        title="X"
        className={`${botao} bg-black`}
      >
        <span className="text-sm font-black leading-none">X</span>
      </button>
      <button
        type="button"
        onClick={() => abrir((url, texto) => `https://t.me/share/url?url=${url}&text=${texto}`)}
        aria-label="Compartilhar no Telegram"
        title="Telegram"
        className={`${botao} bg-[#229ED9]`}
      >
        <Send size={17} />
      </button>
      <button
        type="button"
        onClick={() => void copiar()}
        aria-label="Copiar link do produto"
        title="Copiar link"
        className={`${botao} bg-stone-700`}
      >
        {copiado ? <Check size={18} /> : <Link2 size={18} />}
      </button>
      <span role="status" className="text-xs font-semibold text-green-700">
        {copiado ? "Link copiado" : ""}
      </span>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ProdutoDestaque = {
  id: string | number;
  slug: string;
  nome: string;
  imagem: string | null;
  preco_atual: number | string | null;
  preco_antigo: number | string | null;
};

function descontoProduto(produto: ProdutoDestaque) {
  if (produto.preco_atual === null || produto.preco_antigo === null) return 0;
  const atual = Number(produto.preco_atual);
  const antigo = Number(produto.preco_antigo);
  return Number.isFinite(atual) && Number.isFinite(antigo) && antigo > atual
    ? Math.round((1 - atual / antigo) * 100)
    : 0;
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FeaturedCarousel({ produtos }: { produtos: ProdutoDestaque[] }) {
  const [indice, setIndice] = useState(0);
  if (!produtos.length) return null;

  const produto = produtos[indice];
  const maiorDesconto = Math.max(...produtos.map(descontoProduto));

  function mover(direcao: number) {
    setIndice((atual) => (atual + direcao + produtos.length) % produtos.length);
  }

  return (
    <section className="featured-banner" aria-label="Ofertas em destaque" aria-roledescription="carrossel">
      <div className="featured-copy" aria-live="polite">
        {maiorDesconto > 0 && <span className="featured-discount">Até {maiorDesconto}% OFF</span>}
        <p className="featured-eyebrow">Em destaque</p>
        <h1>{produto.nome}</h1>
        {Number.isFinite(Number(produto.preco_atual)) && (
          <p className="featured-price">{moeda(Number(produto.preco_atual))}</p>
        )}
        <Link href={`/produto/${produto.slug}`} className="featured-button">
          Ver oferta agora <span aria-hidden="true">→</span>
        </Link>
      </div>
      {produto.imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="featured-image" src={produto.imagem} alt={produto.nome} />
      )}
      {produtos.length > 1 && (
        <div className="carousel-controls">
          <button type="button" onClick={() => mover(-1)} aria-label="Oferta anterior" title="Oferta anterior">
            <ChevronLeft size={20} />
          </button>
          <span aria-live="polite">{indice + 1} / {produtos.length}</span>
          <button type="button" onClick={() => mover(1)} aria-label="Próxima oferta" title="Próxima oferta">
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </section>
  );
}
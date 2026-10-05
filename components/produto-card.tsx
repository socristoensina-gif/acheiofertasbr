import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";

type ProdutoCardData = {
  id: string | number;
  slug: string;
  nome: string;
  imagem: string | null;
  preco_atual: number | string | null;
  preco_antigo: number | string | null;
  marketplaces?: { nome?: string } | { nome?: string }[] | null;
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProdutoCard({ produto }: { produto: ProdutoCardData }) {
  const atual = Number(produto.preco_atual);
  const antigo = Number(produto.preco_antigo);
  const temDesconto =
    produto.preco_atual !== null &&
    produto.preco_antigo !== null &&
    Number.isFinite(atual) &&
    Number.isFinite(antigo) &&
    antigo > atual;
  const desconto = temDesconto ? Math.round((1 - atual / antigo) * 100) : 0;
  const marketplace = Array.isArray(produto.marketplaces)
    ? produto.marketplaces[0]?.nome
    : produto.marketplaces?.nome;

  return (
    <article className="product-card group min-w-0">
      <div className="product-image-wrap">
        <Link href={`/produto/${produto.slug}`} className="product-image-link" aria-label={produto.nome}>
          {produto.imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={produto.imagem}
              alt={produto.nome}
              loading="lazy"
              className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-stone-500">
              {produto.nome}
            </div>
          )}
        </Link>
        {temDesconto && <span className="discount-badge">-{desconto}%</span>}
        <FavoriteButton produtoId={String(produto.id)} />
      </div>
      <div className="product-card-content">
          <Link href={`/produto/${produto.slug}`} className="product-title-link">
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-stone-900 sm:text-base">
            {produto.nome}
          </h3>
          </Link>
          <div className="mt-3 flex min-h-5 items-center gap-2">
            {temDesconto && (
              <span className="text-xs text-stone-500 line-through">{moeda(antigo)}</span>
            )}
          </div>
          <p className="mt-0.5 text-xl font-extrabold text-orange-700">
            {Number.isFinite(atual) ? moeda(atual) : "Preço indisponível"}
          </p>
          {marketplace && <p className="marketplace-name">{marketplace}</p>}
          <Link href={`/produto/${produto.slug}`} className="product-card-cta">Ver oferta</Link>
      </div>
    </article>
  );
}
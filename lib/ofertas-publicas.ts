import "server-only";

import { supabaseAdmin } from "@/utils/supabase";

type PublicOffer = {
  produto_id: string;
  marketplace_id: string;
  preco_atual: number | null;
  preco_anterior: number | null;
  disponibilidade: boolean | null;
  principal: boolean;
  ativo: boolean;
};

type LegacyProductOffer = {
  id: string | number;
  preco_atual: number | string | null;
  preco_antigo: number | string | null;
  marketplace?: string | null;
};

export type ProdutoComMelhorOferta<T extends LegacyProductOffer> = T & {
  preco_atual: number | string | null;
  preco_antigo: number | string | null;
  marketplace: string | null;
  oferta_indisponivel: boolean;
};

export async function incluirMelhoresOfertas<T extends LegacyProductOffer>(
  produtos: T[],
): Promise<ProdutoComMelhorOferta<T>[]> {
  if (produtos.length === 0) return [];

  const ids = produtos.map((produto) => String(produto.id));
  const { data, error } = await supabaseAdmin()
    .from("produto_ofertas")
    .select("produto_id, marketplace_id, preco_atual, preco_anterior, disponibilidade, principal, ativo")
    .in("produto_id", ids)

  if (error) throw error;

  const ofertasPorProduto = new Map<string, PublicOffer[]>();
  for (const oferta of (data ?? []) as PublicOffer[]) {
    const ofertas = ofertasPorProduto.get(oferta.produto_id) ?? [];
    ofertas.push(oferta);
    ofertasPorProduto.set(oferta.produto_id, ofertas);
  }

  return produtos.map((produto) => {
    const ofertas = ofertasPorProduto.get(String(produto.id)) ?? [];
    if (ofertas.length === 0) {
      return {
        ...produto,
        marketplace: produto.marketplace ?? null,
        oferta_indisponivel: false,
      };
    }

    const disponiveis = ofertas
      .filter((oferta) => oferta.ativo && oferta.disponibilidade !== false)
      .sort((a, b) => {
        if (a.principal !== b.principal) return a.principal ? -1 : 1;
        return (a.preco_atual ?? Number.POSITIVE_INFINITY) -
          (b.preco_atual ?? Number.POSITIVE_INFINITY);
      });
    const melhorOferta = disponiveis[0];

    return {
      ...produto,
      preco_atual: melhorOferta?.preco_atual ?? null,
      preco_antigo: melhorOferta?.preco_anterior ?? null,
      marketplace: melhorOferta?.marketplace_id ?? ofertas[0].marketplace_id,
      oferta_indisponivel: !melhorOferta,
    };
  });
}

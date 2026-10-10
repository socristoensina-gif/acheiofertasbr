import { supabase, supabaseAdmin } from "@/utils/supabase";

type ProdutoComOferta = {
  id: string;
  imagem: string | null;
  video?: string | null;
  preco_atual?: number | null;
  preco_antigo?: number | null;
  marketplace?: string | null;
};

type CamposOferta = {
  produto_oferta_id: string | null;
  preco_atual: number | null;
  preco_antigo: number | null;
  link_afiliado: string | null;
  marketplace: string | null;
  oferta_indisponivel: boolean;
};

type OfertaPublica = {
  id: string;
  produto_id: string;
  preco_atual: number | null;
  preco_anterior: number | null;
  link_afiliado: string | null;
  marketplaces: { nome?: string | null } | null;
};

async function capasPorOferta(ids: string[]) {
  const mapa = new Map<string, string>();
  if (!ids.length) return mapa;

  const { data, error } = await supabase
    .from("produto_oferta_midias")
    .select("produto_oferta_id, storage_path, url_externa")
    .in("produto_oferta_id", ids)
    .eq("tipo", "imagem")
    .eq("principal", true);
  if (error) {
    console.error("Erro ao buscar capas das ofertas", error.message);
    return mapa;
  }

  const caminhos = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.url_externa) mapa.set(item.produto_oferta_id, item.url_externa);
    else if (item.storage_path) caminhos.set(item.storage_path, item.produto_oferta_id);
  }

  if (caminhos.size) {
    const { data: urls, error: erroUrls } = await supabaseAdmin()
      .storage.from("produto-midias")
      .createSignedUrls([...caminhos.keys()], 86400);
    if (erroUrls) console.error("Erro ao assinar capas", erroUrls.message);
    for (const item of urls ?? []) {
      const ofertaId = item.path ? caminhos.get(item.path) : undefined;
      if (ofertaId && item.signedUrl) mapa.set(ofertaId, item.signedUrl);
    }
  }
  return mapa;
}

export async function incluirMelhoresOfertas<T extends ProdutoComOferta>(
  produtos: T[],
): Promise<Array<T & CamposOferta>> {
  if (!produtos.length) return [];

  const { data, error } = await supabase
    .from("produto_ofertas")
    .select("id, produto_id, preco_atual, preco_anterior, link_afiliado, marketplace_id, ativo, principal, marketplaces(nome)")
    .in("produto_id", produtos.map((p) => p.id))
    .eq("ativo", true)
    .order("principal", { ascending: false })
    .order("preco_atual");
  if (error) console.error("Erro ao buscar ofertas públicas", error.message);

  const ofertas = (data ?? []) as unknown as OfertaPublica[];
  const melhores = new Map<string, OfertaPublica>();
  for (const oferta of ofertas) {
    if (!melhores.has(oferta.produto_id)) melhores.set(oferta.produto_id, oferta);
  }
  const capas = await capasPorOferta([...melhores.values()].map((o) => o.id));

  return produtos.map((produto) => {
    const oferta = melhores.get(produto.id);
    const campos: CamposOferta = {
      produto_oferta_id: oferta?.id ?? null,
      preco_atual: oferta?.preco_atual ?? produto.preco_atual ?? null,
      preco_antigo: oferta?.preco_anterior ?? produto.preco_antigo ?? null,
      link_afiliado: oferta?.link_afiliado ?? null,
      marketplace: oferta?.marketplaces?.nome ?? produto.marketplace ?? null,
      oferta_indisponivel: !oferta,
    };
    const imagem = (oferta && capas.get(oferta.id)) || produto.imagem || null;
    return { ...produto, imagem, ...campos } as unknown as T & CamposOferta;
  });
}

export async function buscarTodasOfertasProduto(produtoId: string) {
  const { data, error } = await supabase
    .from("produto_ofertas")
    .select("id, produto_id, preco_atual, preco_anterior, link_afiliado, marketplace_id, ativo, principal, marketplaces(nome)")
    .eq("produto_id", produtoId)
    .eq("ativo", true)
    .order("principal", { ascending: false })
    .order("preco_atual", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
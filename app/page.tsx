import Link from "next/link";
import { connection } from "next/server";
import { MessageCircle } from "lucide-react";
import { FeaturedCarousel } from "@/components/featured-carousel";
import { ProdutoCard } from "@/components/produto-card";
import { CATEGORIAS } from "@/lib/categorias";
import { WHATSAPP_CHANNEL_URL } from "@/lib/config";
import { incluirMelhoresOfertas } from "@/lib/ofertas-publicas";
import { supabase } from "@/utils/supabase";
import { supabaseAdmin } from "@/utils/supabase";

type CliqueRecente = { produto_id: string };

async function buscarMaisProcurados() {
  const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const admin = supabaseAdmin();
  const { data: cliques } = await admin
    .from("cliques")
    .select("produto_id")
    .gte("criado_em", desde);

  const contagem = new Map<string, number>();
  for (const clique of (cliques ?? []) as CliqueRecente[]) {
    const id = clique.produto_id;
    contagem.set(id, (contagem.get(id) ?? 0) + 1);
  }
  const idsMaisClicados = [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => id);

  if (idsMaisClicados.length) {
    const { data } = await supabase
      .from("produtos")
      .select("id, slug, nome, imagem, preco_atual, preco_antigo, marketplace")
      .eq("status", "publicado")
      .in("id", idsMaisClicados);
    const ordenarPorCliques = new Map(idsMaisClicados.map((id, index) => [id, index]));
    const publicados = await incluirMelhoresOfertas(data ?? []);
    if (publicados.length) {
      return [...publicados].sort(
        (a, b) => (ordenarPorCliques.get(String(a.id)) ?? Infinity) - (ordenarPorCliques.get(String(b.id)) ?? Infinity),
      );
    }
  }

  const { data: recentes } = await supabase
    .from("produtos")
    .select("id, slug, nome, imagem, preco_atual, preco_antigo, marketplace")
    .eq("status", "publicado")
    .order("criado_em", { ascending: false })
    .limit(6);
  return incluirMelhoresOfertas(recentes ?? []);
}

export default async function Home() {
  await connection();
  const [{ data: ofertasOriginais }, { data: recentesOriginais }, maisProcurados] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, slug, nome, imagem, preco_atual, preco_antigo, marketplace")
      .eq("status", "publicado")
      .eq("destaque", true)
      .order("criado_em", { ascending: false })
      .limit(10),
    supabase
      .from("produtos")
      .select("id, slug, nome, imagem, preco_atual, preco_antigo, marketplace")
      .eq("status", "publicado")
      .order("criado_em", { ascending: false })
      .limit(8),
    buscarMaisProcurados(),
  ]);
  const [ofertas, recentes] = await Promise.all([
    incluirMelhoresOfertas(ofertasOriginais ?? []),
    incluirMelhoresOfertas(recentesOriginais ?? []),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-3 pb-12 pt-4 sm:px-6 lg:px-8">
      {ofertas?.length ? (
        <FeaturedCarousel produtos={ofertas} />
      ) : (
        <section className="featured-empty mb-7">
          <p className="featured-eyebrow">Ache Ofertas BR</p>
          <h1>Ofertas selecionadas para você</h1>
        </section>
      )}

      <section className="category-grid" aria-label="Categorias" id="categorias">
        {CATEGORIAS.map((categoria) => (
          <Link key={categoria.slug} href={`/${categoria.slug}`} className="category-tile">
            <span className="category-emoji" aria-hidden="true">{categoria.icone}</span>
            <span>{categoria.nome}</span>
          </Link>
        ))}
      </section>

      <section className="mb-14" aria-labelledby="ofertas-do-dia">
        <div className="section-heading mb-4">
          <h2 id="ofertas-do-dia" className="section-title"><span aria-hidden="true">🔥</span> Ofertas do Dia</h2>
          <span className="section-note">Produtos em destaque</span>
        </div>
        {ofertas?.length ? (
          <div className="product-grid">
            {ofertas.map((produto) => <ProdutoCard key={produto.id} produto={produto} />)}
          </div>
        ) : (
          <p className="empty-state">Nenhuma oferta em destaque no momento.</p>
        )}
      </section>

      <section className="vip-banner" id="canal-vip">
        <MessageCircle size={42} aria-hidden="true" />
        <div className="vip-copy">
          <h2>Entre no nosso Canal VIP</h2>
          <p>Ofertas exclusivas, cupons e novidades em primeira mão.</p>
        </div>
        {WHATSAPP_CHANNEL_URL ? (
          <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="vip-join-button">
            Quero participar <span aria-hidden="true">→</span>
          </a>
        ) : (
          <span className="vip-join-button is-disabled" aria-disabled="true">Quero participar</span>
        )}
      </section>

      <section className="mb-14" aria-labelledby="mais-procurados">
        <div className="section-heading mb-4">
          <div>
            <p className="section-kicker">Tendências</p>
            <h2 id="mais-procurados" className="section-title"><span aria-hidden="true">▥</span> Mais procurados</h2>
          </div>
          <span className="section-note">Produtos populares nos últimos dias</span>
        </div>
        {maisProcurados.length ? (
          <div className="product-grid">
            {maisProcurados.map((produto) => <ProdutoCard key={produto.id} produto={produto} />)}
          </div>
        ) : (
          <p className="empty-state">Ainda não há produtos publicados.</p>
        )}
      </section>

      <section className="mb-14" aria-labelledby="achadinhos-recentes">
        <div className="section-heading mb-4">
          <h2 id="achadinhos-recentes" className="section-title">Achadinhos recentes</h2>
        </div>
        {recentes?.length ? (
          <div className="product-grid">
            {recentes.map((produto) => <ProdutoCard key={produto.id} produto={produto} />)}
          </div>
        ) : (
          <p className="empty-state">Ainda não há produtos publicados.</p>
        )}
      </section>

    </main>
  );
}

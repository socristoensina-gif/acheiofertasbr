import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ProdutoCard } from "@/components/produto-card";
import { CATEGORIAS } from "@/lib/categorias";
import { incluirMelhoresOfertas } from "@/lib/ofertas-publicas";
import { MARCA } from "@/lib/seo/gerar";
import { supabase } from "@/utils/supabase";

const BASE = "https://acheiofertasbr.online";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string }>;
}): Promise<Metadata> {
  const { categoria: slug } = await params;
  const categoria = CATEGORIAS.find((item) => item.slug === slug);
  if (!categoria) {
    return { title: "Categoria não encontrada", robots: { index: false, follow: false } };
  }
  const titulo = `${categoria.nome} em oferta | ${MARCA}`;
  const descricao = `Ofertas de ${categoria.nome} selecionadas nos principais marketplaces. Compare preços e confira no ${MARCA}.`;
  const url = `${BASE}/${categoria.slug}`;
  return {
    title: { absolute: titulo },
    description: descricao,
    alternates: { canonical: url },
    openGraph: { title: titulo, description: descricao, url, siteName: MARCA, locale: "pt_BR", type: "website" },
    twitter: { card: "summary", title: titulo, description: descricao },
    robots: { index: true, follow: true },
  };
}

export default async function CategoriaPage({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria: slug } = await params;
  const categoria = CATEGORIAS.find((item) => item.slug === slug);
  if (!categoria) notFound();

  await connection();
  const { data, error } = await supabase
    .from("produtos")
    .select("id, slug, nome, imagem, preco_atual, preco_antigo")
    .eq("categoria", categoria.slug)
    .eq("status", "publicado")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  const produtos = await incluirMelhoresOfertas(data ?? []);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <p className="section-kicker">Categoria</p>
      <h1 className="mb-6 mt-1 text-3xl font-bold">{categoria.nome}</h1>
      {produtos?.length ? (
        <div className="product-grid">
          {produtos.map((produto) => <ProdutoCard key={produto.id} produto={produto} />)}
        </div>
      ) : (
        <p className="empty-state">Ainda não há produtos publicados nesta categoria.</p>
      )}
    </main>
  );
}

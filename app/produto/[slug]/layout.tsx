import type { Metadata } from "next";
import type { ReactNode } from "react";
import { gerarSeoProduto, MARCA } from "@/lib/seo/gerar";
import { supabase } from "@/utils/supabase";

const BASE = "https://acheiofertasbr.online";

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: produto } = await supabase
    .from("produtos")
    .select("id, slug, nome, categoria, beneficios, preco_atual, marketplace")
    .eq("slug", slug)
    .eq("status", "publicado")
    .maybeSingle();
  if (!produto) return { title: "Produto não encontrado", robots: { index: false, follow: false } };

  const [{ data: categoria }, { data: oferta }] = await Promise.all([
    supabase.from("categorias").select("nome").eq("slug", produto.categoria).maybeSingle(),
    supabase
      .from("produto_ofertas")
      .select("preco_atual, marketplaces(nome)")
      .eq("produto_id", produto.id)
      .eq("ativo", true)
      .order("principal", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const lojaOferta = (oferta?.marketplaces as unknown as { nome?: string } | null)?.nome;
  const seo = gerarSeoProduto({
    nome: produto.nome,
    categoria: categoria?.nome ?? null,
    marketplace: lojaOferta ?? (produto.marketplace ? capitalizar(produto.marketplace) : null),
    preco: oferta?.preco_atual ?? produto.preco_atual ?? null,
    beneficios: Array.isArray(produto.beneficios)
      ? produto.beneficios.filter((b): b is string => typeof b === "string")
      : [],
  });
  const url = `${BASE}/produto/${produto.slug}`;

  return {
    title: { absolute: seo.titulo },
    description: seo.descricao,
    alternates: { canonical: url },
    openGraph: {
      title: seo.titulo,
      description: seo.descricao,
      url,
      siteName: MARCA,
      locale: "pt_BR",
      type: "website",
    },
    twitter: { card: "summary", title: seo.titulo, description: seo.descricao },
    robots: { index: true, follow: true },
  };
}

export default function ProdutoLayout({ children }: { children: ReactNode }) {
  return children;
}
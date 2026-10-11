import type { MetadataRoute } from "next";
import { SLUGS_CATEGORIAS } from "@/lib/categorias";
import { supabase } from "@/utils/supabase";

export const revalidate = 3600;

const BASE = "https://acheiofertasbr.online";
const PAGINAS = ["", "/sobre", "/como-funciona", "/faq", "/contato", "/newsletter", "/privacidade", "/termos"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabase
    .from("produtos")
    .select("slug, atualizado_em")
    .eq("status", "publicado");

  const agora = new Date();
  return [
    ...PAGINAS.map((caminho) => ({ url: `${BASE}${caminho}`, lastModified: agora })),
    ...SLUGS_CATEGORIAS.map((slug) => ({ url: `${BASE}/${slug}`, lastModified: agora })),
    ...(data ?? []).map((p) => ({
      url: `${BASE}/produto/${p.slug}`,
      lastModified: p.atualizado_em ? new Date(p.atualizado_em) : agora,
    })),
  ];
}
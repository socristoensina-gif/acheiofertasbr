import { notFound } from "next/navigation";
import { AdminProdutoTabs } from "@/components/admin-produto-tabs";
import { AdminProdutoForm } from "@/components/admin-produto-form";
import { AdminProdutoOfertas } from "@/components/admin-produto-ofertas";
import { requireAdmin } from "@/lib/admin/auth";
import { SLUGS_CATEGORIAS } from "@/lib/categorias";
import { supabaseAdmin } from "@/utils/supabase";

export default async function EditarProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { erro, sucesso }] = await Promise.all([params, searchParams]);
  const db = supabaseAdmin();
  const [
    { data: produto, error: erroProduto },
    { data: categorias, error: erroCategorias },
    { data: ofertas, error: erroOfertas },
    { data: fontes, error: erroFontes },
    { data: marketplaces, error: erroMarketplaces },
  ] = await Promise.all([
    db.from("produtos").select("*").eq("id", id).maybeSingle(),
    db.from("categorias").select("slug, nome").in("slug", SLUGS_CATEGORIAS).order("ordem"),
    db.from("produto_ofertas")
      .select("id, marketplace_id, fonte_integracao_id, fonte_dados, id_externo, link_afiliado, preco_atual, preco_anterior, avaliacao, disponibilidade, ativo, principal, ultima_atualizacao")
      .eq("produto_id", id)
      .order("criado_em", { ascending: false }),
    db.from("fontes_integracao")
      .select("id, marketplace_id, nome, tipo_integracao")
      .order("nome"),
    db.from("marketplaces")
      .select("id, nome, ativo")
      .order("nome"),
  ]);
  if (erroProduto) throw erroProduto;
  if (erroCategorias) throw erroCategorias;
  if (erroOfertas) throw erroOfertas;
  if (erroFontes) throw erroFontes;
  if (erroMarketplaces) throw erroMarketplaces;
  if (!produto) notFound();

  let galeriaConfigurada = true;
  const midiasPorOferta: Record<string, {
    kind: "image" | "video";
    storagePath: string | null;
    externalUrl: string | null;
    previewUrl: string;
    approved: boolean;
  }[]> = {};
  if (ofertas?.length) {
    const { data: midias, error: erroMidias } = await db
      .from("produto_oferta_midias")
      .select("produto_oferta_id, tipo, storage_path, url_externa, ordem, principal, aprovado")
      .in("produto_oferta_id", ofertas.map(({ id }) => id))
      .order("principal", { ascending: false })
      .order("ordem");
    if (erroMidias && ["42P01", "PGRST205"].includes(erroMidias.code)) {
      galeriaConfigurada = false;
    } else if (erroMidias) {
      throw erroMidias;
    } else {
      await Promise.all((midias ?? []).map(async (midia) => {
        let previewUrl = midia.url_externa ?? "";
        if (midia.storage_path) {
          const { data: signed, error } = await db.storage
            .from("produto-midias")
            .createSignedUrl(midia.storage_path, 900);
          if (error) {
            console.error("Falha ao gerar prévia administrativa de mídia.", {
              name: error.name,
              status: error.status,
              code: error.statusCode,
            });
          } else {
            previewUrl = signed.signedUrl;
          }
        }
        const offerMedia = midiasPorOferta[midia.produto_oferta_id] ?? [];
        offerMedia.push({
          kind: midia.tipo === "imagem" ? "image" : "video",
          storagePath: midia.storage_path,
          externalUrl: midia.url_externa,
          previewUrl,
          approved: midia.aprovado,
        });
        midiasPorOferta[midia.produto_oferta_id] = offerMedia;
      }));
    }
  }

  return (
    <AdminProdutoTabs
      quantidadeOfertas={ofertas?.length ?? 0}
      produto={
        <AdminProdutoForm
          produto={produto}
          categorias={categorias ?? []}
          erro={erro === "oferta" || erro === "fonte" ? undefined : erro}
        />
      }
      ofertas={
        <AdminProdutoOfertas
          produtoId={id}
          ofertas={ofertas ?? []}
          fontes={fontes ?? []}
          marketplaces={marketplaces ?? []}
          midiasPorOferta={midiasPorOferta}
          galeriaConfigurada={galeriaConfigurada}
          erro={erro}
          sucesso={sucesso}
        />
      }
    />
  );
}
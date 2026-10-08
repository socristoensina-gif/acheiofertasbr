import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase";
import { linkAfiliadoPermitido } from "@/lib/dominios-permitidos";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = supabaseAdmin();

  const { data: p, error: erroProduto } = await db
    .from("produtos")
    .select("id, link_afiliado, marketplace, status")
    .eq("slug", slug)
    .maybeSingle();
  if (erroProduto) throw erroProduto;

  if (!p || p.status !== "publicado") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const { data: ofertas, error: erroOfertas } = await db
    .from("produto_ofertas")
    .select("id, marketplace_id, link_afiliado, preco_atual, disponibilidade, principal, ativo, fonte_integracao_id")
    .eq("produto_id", p.id);
  if (erroOfertas) throw erroOfertas;

  const ofertasExistentes = ofertas ?? [];
  const ofertaSelecionada = ofertasExistentes
    .filter((oferta) => oferta.ativo && oferta.disponibilidade !== false)
    .sort((a, b) =>
      Number(b.principal) - Number(a.principal) ||
      (a.preco_atual ?? Number.POSITIVE_INFINITY) -
        (b.preco_atual ?? Number.POSITIVE_INFINITY),
    )[0];

  const destino = ofertaSelecionada
    ? {
        produto_oferta_id: ofertaSelecionada.id,
        fonte_integracao_id: ofertaSelecionada.fonte_integracao_id,
        marketplace: ofertaSelecionada.marketplace_id,
        link_afiliado: ofertaSelecionada.link_afiliado,
      }
    : ofertasExistentes.length === 0
      ? {
          produto_oferta_id: null,
          fonte_integracao_id: null,
          marketplace: p.marketplace,
          link_afiliado: p.link_afiliado,
        }
      : null;

  if (!destino || !linkAfiliadoPermitido(destino.link_afiliado)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    const { error } = await db.from("cliques").insert({
      produto_id: p.id,
      produto_oferta_id: destino.produto_oferta_id,
      fonte_integracao_id: destino.fonte_integracao_id,
      marketplace: destino.marketplace,
      origem: req.nextUrl.searchParams.get("src") ?? "direto",
      user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    });
    if (error) console.error("Falha ao registrar clique do produto", p.id, error);
  } catch (error) {
    console.error("Falha ao registrar clique do produto", p.id, error);
  }

  return NextResponse.redirect(destino.link_afiliado, 302);
}
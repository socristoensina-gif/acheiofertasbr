import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase";
import { linkAfiliadoPermitido } from "@/lib/dominios-permitidos";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = supabaseAdmin();

  const { data: p } = await db
    .from("produtos")
    .select("id, link_afiliado, marketplace, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!p || p.status !== "publicado" || !linkAfiliadoPermitido(p.link_afiliado)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  await db.from("cliques").insert({
    produto_id: p.id,
    marketplace: p.marketplace,
    origem: req.nextUrl.searchParams.get("src") ?? "direto",
    user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
  });

  return NextResponse.redirect(p.link_afiliado, 302);
}
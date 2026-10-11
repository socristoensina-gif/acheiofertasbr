import { timingSafeEqual } from "node:crypto";
import { getAdminUser } from "@/lib/admin/auth";
import { CATEGORIAS } from "@/lib/categorias";
import { incluirMelhoresOfertas } from "@/lib/ofertas-publicas";
import { beneficiosDe, pacotesDoProduto } from "@/lib/seo/divulgacao";
import { supabase } from "@/utils/supabase";

const COLUNAS = ["slug", "canal", "legenda", "hashtags", "disponivel"];

const campo = (valor: string) => `"${valor.replace(/"/g, '""')}"`;

// Acesso do n8n: cabeçalho "Authorization: Bearer <EXPORT_TOKEN>".
// Sem a variável EXPORT_TOKEN definida, só a sessão de admin funciona.
function tokenValido(request: Request) {
  const esperado = process.env.EXPORT_TOKEN?.trim();
  if (!esperado) return false;
  const cabecalho = request.headers.get("authorization") ?? "";
  const enviado = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7).trim() : "";
  if (!enviado) return false;
  const a = Buffer.from(enviado);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!tokenValido(request) && !(await getAdminUser())) {
    return Response.json({ erro: "Não autorizado." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { data, error } = await supabase
    .from("produtos")
    .select("id, slug, nome, categoria, imagem, video, beneficios, preco_atual, preco_antigo, marketplace")
    .eq("status", "publicado")
    .order("slug");
  if (error) {
    console.error("Falha ao exportar divulgação.", error.code);
    return Response.json({ erro: "Falha ao ler os produtos." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  const produtos = await incluirMelhoresOfertas(data ?? []);
  const linhas = [COLUNAS.join(",")];
  for (const produto of produtos) {
    const categoria = CATEGORIAS.find((item) => item.slug === produto.categoria)?.nome ?? produto.categoria ?? null;
    const precoBruto = produto.preco_atual === null || produto.preco_atual === undefined ? null : Number(produto.preco_atual);
    const preco = precoBruto !== null && Number.isFinite(precoBruto) ? precoBruto : null;
    const pacotes = pacotesDoProduto({
      slug: produto.slug,
      nome: produto.nome,
      categoria,
      marketplace: produto.marketplace,
      preco,
      beneficios: beneficiosDe(produto.beneficios),
    });
    for (const pacote of pacotes) {
      linhas.push(
        [
          produto.slug,
          pacote.canal,
          pacote.legenda,
          pacote.hashtags.join(" "),
          produto.oferta_indisponivel ? "nao" : "sim",
        ]
          .map(campo)
          .join(","),
      );
    }
  }

  const dia = new Date().toISOString().slice(0, 10);
  return new Response(`${linhas.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="divulgacao-${dia}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
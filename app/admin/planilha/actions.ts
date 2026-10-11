"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { marketplaceIdDoLink } from "@/lib/admin/produtos";
import { LIMITE_LINHAS, chave, lerPlanilha, precoBr, simNao, slugDe, urlHttps } from "@/lib/admin/planilha";
import { linkAfiliadoPermitido } from "@/lib/dominios-permitidos";
import type { Json } from "@/lib/supabase/database.types";
import { supabaseAdmin } from "@/utils/supabase";

export type ResultadoLinha = { linha: number; nome: string; ok: boolean; mensagem: string };
export type EstadoPlanilha = {
  modo: "validar" | "importar";
  erro?: string;
  resumo?: string;
  linhas: ResultadoLinha[];
};

async function slugLivre(db: ReturnType<typeof supabaseAdmin>, nome: string) {
  const base = slugDe(nome) || "produto";
  for (let n = 1; n <= 30; n++) {
    const tentativa = n === 1 ? base : `${base}-${n}`;
    const { data, error } = await db.from("produtos").select("id").eq("slug", tentativa).maybeSingle();
    if (error) throw error;
    if (!data) return tentativa;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function processarPlanilha(
  _anterior: EstadoPlanilha,
  formData: FormData,
): Promise<EstadoPlanilha> {
  await requireAdmin();
  const modo = formData.get("modo") === "importar" ? "importar" : "validar";
  const texto = String(formData.get("planilha") ?? "");
  if (!texto.trim()) return { modo, erro: "Cole as linhas da planilha no campo.", linhas: [] };
  if (texto.length > 300_000) return { modo, erro: "Planilha grande demais.", linhas: [] };

  const lida = lerPlanilha(texto);
  if (lida.erro) return { modo, erro: lida.erro, linhas: [] };
  if (lida.linhas.length > LIMITE_LINHAS) {
    return { modo, erro: `Envie no máximo ${LIMITE_LINHAS} linhas por vez.`, linhas: [] };
  }

  const db = supabaseAdmin();
  const links = lida.linhas.map((l) => l.campos.link ?? "").filter(Boolean);
  const [categorias, afiliado, existentes] = await Promise.all([
    db.from("categorias").select("slug, nome"),
    db.from("afiliados").select("id").eq("tipo", "padrao").eq("ativo", true).maybeSingle(),
    db.from("produto_ofertas").select("link_afiliado").in("link_afiliado", links.length ? links : ["-"]),
  ]);
  if (categorias.error || afiliado.error || existentes.error) {
    console.error("Falha ao preparar a planilha.", categorias.error?.code, afiliado.error?.code, existentes.error?.code);
    return { modo, erro: "Não foi possível consultar o banco. Tente novamente.", linhas: [] };
  }
  if (!afiliado.data) return { modo, erro: "O afiliado padrão não existe ou está inativo.", linhas: [] };
  const afiliadoId = afiliado.data.id;

  const porCategoria = new Map<string, string>();
  for (const c of categorias.data ?? []) {
    porCategoria.set(chave(c.slug), c.slug);
    porCategoria.set(chave(c.nome), c.slug);
  }
  const jaCadastrados = new Set((existentes.data ?? []).map((o) => o.link_afiliado));
  const vistosNoLote = new Set<string>();
  const resultados: ResultadoLinha[] = [];
  let importados = 0;

  for (const { linha, campos } of lida.linhas) {
    const nome = (campos.nome ?? "").replace(/\s+/g, " ").trim();
    const erros: string[] = [];
    const avisos: string[] = [];

    const categoria = porCategoria.get(chave(campos.categoria ?? ""));
    if (!categoria) erros.push("categoria desconhecida");
    if (nome.length < 2 || nome.length > 200) erros.push("nome deve ter de 2 a 200 caracteres");

    const link = urlHttps(campos.link ?? "");
    const marketplaceId = link ? marketplaceIdDoLink(link) : null;
    if (!link || !marketplaceId || !linkAfiliadoPermitido(link)) {
      erros.push("link de afiliado inválido ou de domínio não permitido");
    } else if (jaCadastrados.has(link) || vistosNoLote.has(link)) {
      erros.push("link já cadastrado");
    }

    const preco = precoBr(campos.preco ?? "");
    if (preco === null || Number.isNaN(preco) || preco <= 0) erros.push("preço atual inválido");
    let precoAntigo = precoBr(campos.preco_antigo ?? "");
    if (precoAntigo !== null && Number.isNaN(precoAntigo)) {
      erros.push("preço antigo inválido");
      precoAntigo = null;
    } else if (precoAntigo !== null && preco !== null && precoAntigo <= preco) {
      avisos.push("preço antigo ignorado (não é maior que o atual)");
      precoAntigo = null;
    }

    const avaliacao = precoBr(campos.avaliacao ?? "");
    if (avaliacao !== null && (Number.isNaN(avaliacao) || avaliacao < 0 || avaliacao > 5)) erros.push("avaliação deve ser de 0 a 5");
    const vendas = precoBr(campos.vendas ?? "");
    if (vendas !== null && (Number.isNaN(vendas) || !Number.isInteger(vendas) || vendas < 0)) erros.push("vendas inválidas");

    const imagens: string[] = [];
    for (const k of ["imagem1", "imagem2", "imagem3", "imagem4", "imagem5"]) {
      const bruto = campos[k] ?? "";
      if (!bruto) continue;
      const url = urlHttps(bruto);
      if (!url) erros.push(`${k} inválida`);
      else if (!imagens.includes(url)) imagens.push(url);
    }
    const videos: string[] = [];
    for (const k of ["video1", "video2"]) {
      const bruto = campos[k] ?? "";
      if (!bruto) continue;
      const url = urlHttps(bruto);
      if (!url) erros.push(`${k} inválido`);
      else if (!videos.includes(url)) videos.push(url);
    }

    if (erros.length > 0 || !categoria || !link || !marketplaceId || preco === null) {
      resultados.push({ linha, nome: nome || "(sem nome)", ok: false, mensagem: erros.join("; ") });
      continue;
    }
    vistosNoLote.add(link);

    const quer = simNao(campos.publicar ?? "", true);
    const publicar = quer && imagens.length > 0;
    if (quer && imagens.length === 0) avisos.push("sem imagem: ficará em análise, não publicado");
    const destaque = simNao(campos.destaque ?? "", false);
    const beneficios = (campos.beneficios ?? "").split("|").map((b) => b.trim()).filter(Boolean).slice(0, 12);
    const descricao = (campos.descricao ?? "").trim().slice(0, 5000) || null;

    if (modo === "validar") {
      resultados.push({
        linha, nome, ok: true,
        mensagem: avisos.length ? `Pronto. Avisos: ${avisos.join("; ")}` : "Pronto para importar",
      });
      continue;
    }

    try {
      const slug = await slugLivre(db, nome);
      const { data: produto, error: erroProduto } = await db.from("produtos").insert({
        slug, nome, categoria, marketplace: marketplaceId, link_afiliado: link,
        preco_atual: preco, preco_antigo: precoAntigo,
        avaliacao: avaliacao ?? null, vendas: vendas ?? null,
        descricao, beneficios, destaque,
        status: publicar ? "publicado" : "analisando",
      }).select("id").single();
      if (erroProduto || !produto) throw new Error(`produto: ${erroProduto?.code ?? "sem retorno"}`);

      const { data: oferta, error: erroOferta } = await db.from("produto_ofertas").insert({
        produto_id: produto.id, marketplace_id: marketplaceId, afiliado_id: afiliadoId,
        link_afiliado: link, preco_atual: preco, preco_anterior: precoAntigo,
        avaliacao: avaliacao ?? null, quantidade_vendas: vendas ?? null,
        ativo: publicar, principal: publicar, disponibilidade: true,
      }).select("id").single();
      if (erroOferta || !oferta) {
        await db.from("produtos").delete().eq("id", produto.id);
        throw new Error(`oferta: ${erroOferta?.code ?? "sem retorno"}`);
      }

      const midias: Json = [
        ...imagens.map((url) => ({ tipo: "imagem", storage_path: null, url_externa: url, aprovado: true })),
        ...videos.map((url) => ({ tipo: "video", storage_path: null, url_externa: url, aprovado: true })),
      ];
      if (imagens.length + videos.length > 0) {
        const { error: erroMidias } = await db.rpc("salvar_produto_oferta_midias", {
          p_produto_oferta_id: oferta.id,
          p_midias: midias,
        });
        if (erroMidias) {
          await db.from("produtos").delete().eq("id", produto.id);
          throw new Error(`midias: ${erroMidias.code}`);
        }
      }
      importados += 1;
      resultados.push({
        linha, nome, ok: true,
        mensagem: `Importado como ${publicar ? "publicado" : "em análise"} (/produto/${slug})${avisos.length ? `. Avisos: ${avisos.join("; ")}` : ""}`,
      });
    } catch (e) {
      console.error("Falha ao importar linha da planilha.", linha, e instanceof Error ? e.message : e);
      resultados.push({ linha, nome, ok: false, mensagem: "erro ao gravar no banco; a linha foi desfeita" });
    }
  }

  if (modo === "importar" && importados > 0) {
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/produto/[slug]", "page");
  }
  const problemas = resultados.filter((r) => !r.ok).length;
  return {
    modo,
    resumo: modo === "importar"
      ? `${importados} importado(s), ${problemas} com problema.`
      : `${resultados.length - problemas} linha(s) prontas, ${problemas} com problema.`,
    linhas: resultados,
  };
}
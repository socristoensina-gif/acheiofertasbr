"use server";

import { isIP } from "node:net";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { isStatusProduto, marketplaceDoLink, marketplaceIdDoLink } from "@/lib/admin/produtos";
import { linkAfiliadoPermitido } from "@/lib/dominios-permitidos";
import { isCategoriaSlug } from "@/lib/categorias";
import { importarOfertaPorLink, validarPreviaImportacao } from "@/lib/importacoes/ofertas-link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/utils/supabase";

export async function loginAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const adminEmail = process.env.ADMIN_EMAIL?.trim();

  if (!adminEmail || email.toLowerCase() !== adminEmail.toLowerCase() || !password) {
    redirect("/admin/login?erro=credenciais");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || data.user?.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    await supabase.auth.signOut();
    redirect("/admin/login?erro=credenciais");
  }

  redirect("/admin");
}

export async function logoutAdmin() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function numeroOpcional(formData: FormData, campo: string) {
  const valor = texto(formData, campo);
  if (!valor) return null;
  const numero = Number(valor.replace(",", "."));
  return Number.isFinite(numero) ? numero : Number.NaN;
}

function urlHttpsValida(valor: string) {
  if (!valor) return true;
  try {
    return new URL(valor).protocol === "https:";
  } catch {
    return false;
  }
}

function listaUrlsManuais(valor: string): string[] | null {
  const urls = valor.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (urls.length > 4) return null;
  const normalizadas: string[] = [];

  for (const valorUrl of urls) {
    try {
      const url = new URL(valorUrl);
      const host = url.hostname.toLowerCase();
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        (url.port && url.port !== "443") ||
        isIP(host) !== 0 ||
        host === "localhost" ||
        host.endsWith(".localhost") ||
        host.endsWith(".local") ||
        valorUrl.length > 2048 ||
        !urlHttpsValida(valorUrl)
      ) {
        return null;
      }
      normalizadas.push(url.toString());
    } catch {
      return null;
    }
  }

  return [...new Set(normalizadas)];
}

function slugBase(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function slugUnico(nome: string, slugInformado: string, idAtual: string | null) {
  const db = supabaseAdmin();
  const base = slugInformado || slugBase(nome) || "produto";
  let slug = base;
  let sufixo = 2;

  while (true) {
    const { data, error } = await db.from("produtos").select("id").eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (!data || data.id === idAtual) return slug;
    if (slugInformado) return null;
    slug = `${base}-${sufixo}`;
    sufixo += 1;
  }
}

export async function salvarProduto(formData: FormData) {
  await requireAdmin();
  const db = supabaseAdmin();
  const id = texto(formData, "id") || null;
  const nome = texto(formData, "nome");
  const slugInformado = texto(formData, "slug").toLowerCase();
  const linkAfiliado = texto(formData, "link_afiliado");
  const categoriaSlug = texto(formData, "categoria");
  const marketplace = texto(formData, "marketplace");
  const precoAtual = numeroOpcional(formData, "preco_atual");
  const precoAntigo = numeroOpcional(formData, "preco_antigo");
  const avaliacao = numeroOpcional(formData, "avaliacao");
  const vendas = numeroOpcional(formData, "vendas");
  const destaque = formData.get("destaque") === "on";
  const status = texto(formData, "status");
  const imagem = texto(formData, "imagem");
  const video = texto(formData, "video");
  const destinoErro = id ? `/admin/produtos/${id}` : "/admin/produtos/novo";

  if (
    nome.length < 2 ||
    (slugInformado && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugInformado)) ||
    (id && !slugInformado) ||
    !isStatusProduto(status) ||
    !marketplaceDoLink(linkAfiliado) && (status === "publicado" || linkAfiliado) ||
    (linkAfiliado && !linkAfiliadoPermitido(linkAfiliado)) ||
    (linkAfiliado && marketplaceIdDoLink(linkAfiliado) !== marketplace) ||
    (precoAtual === null && !id) ||
    (precoAtual !== null && (!Number.isFinite(precoAtual) || precoAtual < 0)) ||
    (precoAntigo !== null && (!Number.isFinite(precoAntigo) || precoAntigo < 0)) ||
    (avaliacao !== null && (!Number.isFinite(avaliacao) || avaliacao < 0 || avaliacao > 5)) ||
    (vendas !== null && (!Number.isInteger(vendas) || vendas < 0)) ||
    !urlHttpsValida(imagem) ||
    !urlHttpsValida(video)
  ) {
    redirect(`${destinoErro}?erro=campos`);
  }
  if (!isCategoriaSlug(categoriaSlug)) redirect(`${destinoErro}?erro=categoria`);
  if (status === "publicado" && (!linkAfiliado || !linkAfiliadoPermitido(linkAfiliado))) {
    redirect(`${destinoErro}?erro=marketplace`);
  }

  const { data: categoria, error: erroCategoria } = await db
    .from("categorias")
    .select("slug")
    .eq("slug", categoriaSlug)
    .maybeSingle();
  if (erroCategoria) throw erroCategoria;
  if (!categoria) redirect(`${destinoErro}?erro=categoria`);

  const beneficios = texto(formData, "beneficios")
    .split(/\r?\n/)
    .map((beneficio) => beneficio.trim())
    .filter(Boolean);
  const slug = await slugUnico(nome, slugInformado, id);
  if (!slug) redirect(`${destinoErro}?erro=slug`);

  const produto = {
    slug,
    nome,
    categoria: categoriaSlug,
    marketplace: marketplaceIdDoLink(linkAfiliado) ?? marketplace,
    id_externo: texto(formData, "id_externo") || null,
    fonte_dados: texto(formData, "fonte_dados") || null,
    link_afiliado: linkAfiliado,
    imagem: imagem || null,
    video: video || null,
    preco_atual: precoAtual,
    preco_antigo: precoAntigo,
    avaliacao,
    vendas,
    beneficios,
    descricao: texto(formData, "descricao") || null,
    destaque,
    status,
  };

  const resultado = id
    ? await db.from("produtos").update(produto).eq("id", id).select("id").maybeSingle()
    : await db.from("produtos").insert(produto).select("id").single();
  if (resultado.error || !resultado.data) redirect(`${destinoErro}?erro=salvar`);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/estatisticas");
  revalidatePath("/produto/[slug]", "page");
  redirect("/admin?sucesso=produto");
}

export async function importarOfertaLink(formData: FormData) {
  const admin = await requireAdmin();
  const url = texto(formData, "url_origem");
  const result = await importarOfertaPorLink(url, admin.id);

  if (!result.ok) {
    const erro = result.reason === "url"
      ? "url"
      : result.reason === "marketplace"
        ? "marketplace"
        : result.reason === "metadata"
          ? "metadados"
          : "captura";
    const query = new URLSearchParams({ erro });
    if (result.importacaoId) query.set("id", result.importacaoId);
    redirect(`/admin/importar?${query.toString()}`);
  }

  redirect(`/admin/importar?id=${encodeURIComponent(result.importacaoId)}`);
}

export async function completarPreviaImportacaoManual(formData: FormData) {
  const admin = await requireAdmin();
  const importacaoId = texto(formData, "importacao_id");
  const titulo = texto(formData, "titulo");
  const descricao = texto(formData, "descricao");
  const precoAtual = numeroOpcional(formData, "preco_atual");
  const caracteristicas = texto(formData, "caracteristicas")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const imagens = listaUrlsManuais(texto(formData, "imagens"));

  if (
    !uuidValido(importacaoId) ||
    texto(formData, "confirmacao") !== "on" ||
    titulo.length < 2 ||
    titulo.length > 300 ||
    descricao.length > 10_000 ||
    caracteristicas.length > 20 ||
    caracteristicas.some((item) => item.length > 500) ||
    (precoAtual !== null && (!Number.isFinite(precoAtual) || precoAtual < 0)) ||
    imagens === null
  ) {
    redirect(`/admin/importar?id=${encodeURIComponent(importacaoId)}&erro=dados-manual`);
  }

  const db = supabaseAdmin();
  const { data: importacao, error: erroImportacao } = await db
    .from("importacoes_ofertas")
    .select("id, marketplace_id, url_origem, status, criado_por, erro")
    .eq("id", importacaoId)
    .maybeSingle();
  if (erroImportacao) throw erroImportacao;

  const marketplaceNome = importacao?.url_origem
    ? marketplaceDoLink(importacao.url_origem)
    : null;
  const previa = importacao && validarPreviaImportacao({
    origem_captura: "assistida",
    marketplace_id: importacao.marketplace_id,
    marketplace_nome: marketplaceNome ?? "",
    url_origem: importacao.url_origem,
    url_final: importacao.url_origem,
    id_externo: null,
    titulo,
    descricao: descricao || null,
    caracteristicas,
    categoria: null,
    imagens,
    videos: [],
    preco_atual: precoAtual,
    preco_anterior: null,
    avaliacao: null,
    quantidade_avaliacoes: null,
    vendedor: null,
    disponibilidade: null,
  });
  if (
    !importacao ||
    importacao.status !== "erro" ||
    importacao.criado_por !== admin.id ||
    !importacao.url_origem ||
    !marketplaceNome ||
    !previa
  ) {
    redirect(`/admin/importar?id=${encodeURIComponent(importacaoId)}&erro=aprovacao`);
  }

  const { data: atualizada, error } = await db
    .from("importacoes_ofertas")
    .update({
      status: "aguardando_revisao",
      dados_processados: previa,
      processado_em: new Date().toISOString(),
    })
    .eq("id", importacaoId)
    .eq("status", "erro")
    .eq("criado_por", admin.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!atualizada) {
    redirect(`/admin/importar?id=${encodeURIComponent(importacaoId)}&erro=aprovacao`);
  }

  redirect(`/admin/importar?id=${encodeURIComponent(importacaoId)}`);
}

export async function aprovarImportacaoOferta(formData: FormData) {
  await requireAdmin();
  const importacaoId = texto(formData, "importacao_id");
  const categoriaSlug = texto(formData, "categoria");
  if (!uuidValido(importacaoId) || !isCategoriaSlug(categoriaSlug)) {
    redirect(`/admin/importar?erro=aprovacao`);
  }

  const db = supabaseAdmin();
  const { data: importacao, error: erroImportacao } = await db
    .from("importacoes_ofertas")
    .select("id, marketplace_id, url_origem, dados_processados, status")
    .eq("id", importacaoId)
    .maybeSingle();
  if (erroImportacao) throw erroImportacao;

  const previa = validarPreviaImportacao(importacao?.dados_processados);
  if (
    !importacao ||
    importacao.status !== "aguardando_revisao" ||
    !previa ||
    !previa.titulo.trim() ||
    previa.marketplace_id !== importacao.marketplace_id ||
    previa.url_origem !== importacao.url_origem ||
    !linkAfiliadoPermitido(previa.url_origem)
  ) {
    redirect(`/admin/importar?id=${encodeURIComponent(importacaoId)}&erro=aprovacao`);
  }

  const { data: categoria, error: erroCategoria } = await db
    .from("categorias")
    .select("slug")
    .eq("slug", categoriaSlug)
    .maybeSingle();
  if (erroCategoria) throw erroCategoria;
  if (!categoria) redirect(`/admin/importar?id=${encodeURIComponent(importacaoId)}&erro=categoria`);

  const { data: marketplace, error: erroMarketplace } = await db
    .from("marketplaces")
    .select("id")
    .eq("id", previa.marketplace_id)
    .maybeSingle();
  if (erroMarketplace) throw erroMarketplace;
  if (!marketplace) redirect(`/admin/importar?id=${encodeURIComponent(importacaoId)}&erro=marketplace`);

  if (previa.id_externo) {
    const { data: produtoExistente, error: erroExistente } = await db
      .from("produtos")
      .select("id")
      .eq("marketplace", previa.marketplace_id)
      .eq("id_externo", previa.id_externo)
      .maybeSingle();
    if (erroExistente) throw erroExistente;
    if (produtoExistente) {
      redirect(`/admin/importar?id=${encodeURIComponent(importacaoId)}&erro=duplicado`);
    }
  }

  const { data: afiliado, error: erroAfiliado } = await db
    .from("afiliados")
    .select("id")
    .eq("tipo", "padrao")
    .eq("ativo", true)
    .maybeSingle();
  if (erroAfiliado) throw erroAfiliado;
  if (!afiliado) throw new Error("O afiliado padrão não existe ou está inativo.");

  const fonteDados = previa.origem_captura === "api"
    ? "API"
    : previa.origem_captura === "capturada"
      ? "LINK"
      : "MANUAL";
  const { data: fonteExistente, error: erroFonte } = await db
    .from("fontes_integracao")
    .select("id")
    .eq("marketplace_id", previa.marketplace_id)
    .eq("tipo_integracao", fonteDados)
    .eq("status", "ativo")
    .order("criado_em")
    .limit(1)
    .maybeSingle();
  if (erroFonte) throw erroFonte;
  let fonteIntegracaoId = fonteExistente?.id;
  if (!fonteIntegracaoId) {
    const { data: fonteNova, error: erroFonteNova } = await db
      .from("fontes_integracao")
      .insert({
        marketplace_id: previa.marketplace_id,
        nome: `${fonteDados === "MANUAL" ? "Revisão manual" : fonteDados === "API" ? "Importação por API" : "Importação por link"} - ${previa.marketplace_nome}`,
        tipo_integracao: fonteDados,
      })
      .select("id")
      .single();
    if (erroFonteNova) throw erroFonteNova;
    fonteIntegracaoId = fonteNova.id;
  }

  const slug = await slugUnico(previa.titulo, "", null);
  if (!slug) redirect(`/admin/importar?id=${encodeURIComponent(importacaoId)}&erro=aprovacao`);

  const { data: importacaoEmProcessamento, error: erroReserva } = await db
    .from("importacoes_ofertas")
    .update({ status: "processando" })
    .eq("id", importacaoId)
    .eq("status", "aguardando_revisao")
    .select("id")
    .maybeSingle();
  if (erroReserva) throw erroReserva;
  if (!importacaoEmProcessamento) {
    redirect(`/admin/importar?id=${encodeURIComponent(importacaoId)}&erro=aprovacao`);
  }

  const { data: produto, error: erroProduto } = await db
    .from("produtos")
    .insert({
      slug,
      nome: previa.titulo,
      categoria: categoriaSlug,
      marketplace: previa.marketplace_id,
      id_externo: previa.id_externo,
      link_afiliado: previa.url_origem,
      imagem: previa.imagens[0] ?? null,
      video: previa.videos[0] ?? null,
      descricao: null,
      beneficios: previa.caracteristicas,
      preco_atual: previa.preco_atual,
      preco_antigo: previa.preco_anterior,
      avaliacao: previa.avaliacao,
      vendas: null,
      status: "analisando",
      destaque: false,
      fonte_dados: fonteDados,
    })
    .select("id")
    .single();
  if (erroProduto) {
    const { error: erroRestauracao } = await db
      .from("importacoes_ofertas")
      .update({ status: "aguardando_revisao" })
      .eq("id", importacaoId)
      .eq("status", "processando");
    if (erroRestauracao) {
      throw new Error(`Produto não criado (${erroProduto.code}); importação não restaurada (${erroRestauracao.code}).`);
    }
    throw erroProduto;
  }

  const { data: oferta, error: erroOferta } = await db
    .from("produto_ofertas")
    .insert({
      produto_id: produto.id,
      marketplace_id: previa.marketplace_id,
      afiliado_id: afiliado.id,
      fonte_integracao_id: fonteIntegracaoId,
      id_externo: previa.id_externo,
      url_original: previa.url_final,
      link_afiliado: previa.url_origem,
      titulo_original: previa.titulo,
      descricao_original: previa.descricao,
      imagem_original: previa.imagens,
      video_original: previa.videos,
      preco_atual: previa.preco_atual,
      preco_anterior: previa.preco_anterior,
      avaliacao: previa.avaliacao,
      quantidade_vendas: null,
      disponibilidade: previa.disponibilidade,
      ativo: false,
      principal: false,
      fonte_dados: fonteDados,
    })
    .select("id")
    .single();
  if (erroOferta) {
    const { error: erroRollback } = await db.from("produtos").delete().eq("id", produto.id);
    if (erroRollback) {
      throw new Error(`Oferta não criada (${erroOferta.code}); falha ao remover produto incompleto (${erroRollback.code}).`);
    }
    const { error: erroRestauracao } = await db
      .from("importacoes_ofertas")
      .update({ status: "aguardando_revisao" })
      .eq("id", importacaoId)
      .eq("status", "processando");
    if (erroRestauracao) {
      throw new Error(`Oferta não criada (${erroOferta.code}); importação não restaurada (${erroRestauracao.code}).`);
    }
    throw erroOferta;
  }

  const { data: importacaoAtualizada, error: erroFinalizacao } = await db
    .from("importacoes_ofertas")
    .update({
      status: "importado",
      afiliado_id: afiliado.id,
      oferta_id: oferta.id,
      processado_em: new Date().toISOString(),
      erro: null,
    })
    .eq("id", importacaoId)
    .eq("status", "processando")
    .select("id")
    .maybeSingle();
  if (erroFinalizacao || !importacaoAtualizada) {
    const { error: erroRollback } = await db.from("produtos").delete().eq("id", produto.id);
    if (erroRollback) {
      throw new Error(`Importação não finalizada (${erroFinalizacao?.code ?? "sem registro"}); falha ao remover produto incompleto (${erroRollback.code}).`);
    }
    const { error: erroRestauracao } = await db
      .from("importacoes_ofertas")
      .update({ status: "aguardando_revisao" })
      .eq("id", importacaoId)
      .eq("status", "processando");
    if (erroRestauracao) {
      throw new Error(`Importação não finalizada; registro não restaurado (${erroRestauracao.code}).`);
    }
    if (erroFinalizacao) throw erroFinalizacao;
    throw new Error("A importação deixou de estar em processamento antes da finalização.");
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/produto/[slug]", "page");
  redirect(`/admin/produtos/${produto.id}?sucesso=importacao`);
}

export async function alterarStatusProduto(formData: FormData) {
  await requireAdmin();
  const id = texto(formData, "id");
  const status = texto(formData, "status");
  if (!id || !isStatusProduto(status)) redirect("/admin?erro=status");

  const { data, error } = await supabaseAdmin()
    .from("produtos")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect("/admin?erro=status");
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/produto/[slug]", "page");
  redirect("/admin?sucesso=status");
}

export async function excluirProduto(formData: FormData) {
  await requireAdmin();
  const id = texto(formData, "id");
  if (!id) return;

  const { data, error } = await supabaseAdmin()
    .from("produtos")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect("/admin?erro=excluir");
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/estatisticas");
  revalidatePath("/produto/[slug]", "page");
  redirect("/admin?sucesso=excluir");
}

function destinoProduto(id: string, nomeResultado: "erro" | "sucesso", valor: "oferta" | "fonte" = "oferta") {
  return `/admin/produtos/${id}?${nomeResultado}=${valor}`;
}

function uuidValido(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function booleanoOpcional(valor: string) {
  if (valor === "") return null;
  if (valor === "true") return true;
  if (valor === "false") return false;
  return undefined;
}

function isTipoIntegracao(valor: string): valor is "API" | "LINK" | "MANUAL" | "N8N" {
  return valor === "API" || valor === "LINK" || valor === "MANUAL" || valor === "N8N";
}

function valoresOfertaValidos(
  precoAtual: number | null,
  precoAntigo: number | null,
  avaliacao: number | null,
) {
  return (
    (precoAtual === null || (Number.isFinite(precoAtual) && precoAtual >= 0)) &&
    (precoAntigo === null || (Number.isFinite(precoAntigo) && precoAntigo >= 0)) &&
    (avaliacao === null ||
      (Number.isFinite(avaliacao) && avaliacao >= 0 && avaliacao <= 5))
  );
}

export async function criarProdutoOferta(formData: FormData) {
  await requireAdmin();
  const produtoId = texto(formData, "produto_id");
  const marketplaceId = texto(formData, "marketplace_id");
  const fonteIntegracaoId = texto(formData, "fonte_integracao_id");
  const idExterno = texto(formData, "id_externo");
  const linkAfiliado = texto(formData, "link_afiliado");
  const urlOriginal = texto(formData, "url_original");
  const precoAtual = numeroOpcional(formData, "preco_atual");
  const precoAntigo = numeroOpcional(formData, "preco_anterior");
  const avaliacao = numeroOpcional(formData, "avaliacao");
  const disponibilidade = booleanoOpcional(texto(formData, "disponibilidade"));

  if (
    !uuidValido(produtoId) ||
    !marketplaceId ||
    (fonteIntegracaoId && !uuidValido(fonteIntegracaoId)) ||
    !linkAfiliadoPermitido(linkAfiliado) ||
    marketplaceIdDoLink(linkAfiliado) !== marketplaceId ||
    !urlHttpsValida(urlOriginal) ||
    !valoresOfertaValidos(precoAtual, precoAntigo, avaliacao) ||
    disponibilidade === undefined
  ) {
    redirect(destinoProduto(produtoId, "erro"));
  }

  const db = supabaseAdmin();
  const [{ data: afiliado, error: erroAfiliado }, { data: marketplace, error: erroMarketplace }, fonte] = await Promise.all([
    db.from("afiliados").select("id").eq("tipo", "padrao").eq("ativo", true).maybeSingle(),
    db.from("marketplaces").select("id, ativo").eq("id", marketplaceId).maybeSingle(),
    fonteIntegracaoId
      ? db.from("fontes_integracao")
          .select("id, marketplace_id")
          .eq("id", fonteIntegracaoId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (erroAfiliado) throw erroAfiliado;
  if (erroMarketplace) throw erroMarketplace;
  if (fonte.error) throw fonte.error;
  if (!afiliado) throw new Error("O afiliado padrão não existe ou está inativo.");
  if (!marketplace?.ativo) redirect(destinoProduto(produtoId, "erro"));
  if (fonteIntegracaoId && (!fonte.data || (fonte.data.marketplace_id && fonte.data.marketplace_id !== marketplaceId))) {
    redirect(destinoProduto(produtoId, "erro"));
  }

  const { error } = await db.from("produto_ofertas").insert({
    produto_id: produtoId,
    marketplace_id: marketplaceId,
    afiliado_id: afiliado.id,
    fonte_integracao_id: fonteIntegracaoId || null,
    id_externo: idExterno || null,
    url_original: urlOriginal || null,
    link_afiliado: linkAfiliado,
    preco_atual: precoAtual,
    preco_anterior: precoAntigo,
    avaliacao,
    disponibilidade,
  });
  if (error) throw error;

  revalidarProdutoOferta(produtoId);
  redirect(destinoProduto(produtoId, "sucesso"));
}

export async function atualizarProdutoOferta(formData: FormData) {
  await requireAdmin();
  const produtoId = texto(formData, "produto_id");
  const ofertaId = texto(formData, "oferta_id");
  const marketplaceId = texto(formData, "marketplace_id");
  const fonteIntegracaoId = texto(formData, "fonte_integracao_id");
  const idExterno = texto(formData, "id_externo");
  const linkAfiliado = texto(formData, "link_afiliado");
  const precoAtual = numeroOpcional(formData, "preco_atual");
  const precoAntigo = numeroOpcional(formData, "preco_anterior");
  const avaliacao = numeroOpcional(formData, "avaliacao");
  const disponibilidade = booleanoOpcional(texto(formData, "disponibilidade"));
  const ativo = texto(formData, "ativo") === "on";

  if (
    !uuidValido(produtoId) ||
    !uuidValido(ofertaId) ||
    !marketplaceId ||
    (fonteIntegracaoId && !uuidValido(fonteIntegracaoId)) ||
    !linkAfiliadoPermitido(linkAfiliado) ||
    marketplaceIdDoLink(linkAfiliado) !== marketplaceId ||
    !valoresOfertaValidos(precoAtual, precoAntigo, avaliacao) ||
    disponibilidade === undefined
  ) {
    redirect(destinoProduto(produtoId, "erro"));
  }

  const db = supabaseAdmin();
  const [{ data: ofertaAtual, error: erroOfertaAtual }, { data: marketplace, error: erroMarketplace }, fonte] = await Promise.all([
    db.from("produto_ofertas")
      .select("marketplace_id, fonte_dados, preco_atual, preco_anterior, avaliacao, disponibilidade")
      .eq("id", ofertaId)
      .eq("produto_id", produtoId)
      .maybeSingle(),
    db.from("marketplaces")
      .select("id, ativo")
      .eq("id", marketplaceId)
      .maybeSingle(),
    fonteIntegracaoId
      ? db.from("fontes_integracao")
          .select("id, marketplace_id")
          .eq("id", fonteIntegracaoId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (erroOfertaAtual) throw erroOfertaAtual;
  if (erroMarketplace) throw erroMarketplace;
  if (fonte.error) throw fonte.error;
  if (!ofertaAtual || !marketplace || (!marketplace.ativo && ofertaAtual.marketplace_id !== marketplaceId)) {
    redirect(destinoProduto(produtoId, "erro"));
  }
  const dadosComerciais = ofertaAtual.fonte_dados === "LINK"
    ? {
        preco_atual: ofertaAtual.preco_atual,
        preco_anterior: ofertaAtual.preco_anterior,
        avaliacao: ofertaAtual.avaliacao,
        disponibilidade: ofertaAtual.disponibilidade,
      }
    : {
        preco_atual: precoAtual,
        preco_anterior: precoAntigo,
        avaliacao,
        disponibilidade,
      };
  if (fonteIntegracaoId && (!fonte.data || (fonte.data.marketplace_id && fonte.data.marketplace_id !== marketplaceId))) {
    redirect(destinoProduto(produtoId, "erro"));
  }

  const { error, data } = await db
    .from("produto_ofertas")
    .update({
      marketplace_id: marketplaceId,
      fonte_integracao_id: fonteIntegracaoId || null,
      id_externo: idExterno || null,
      link_afiliado: linkAfiliado,
      ...dadosComerciais,
      ativo,
      ...(!ativo ? { principal: false } : {}),
      ultima_atualizacao: new Date().toISOString(),
    })
    .eq("id", ofertaId)
    .eq("produto_id", produtoId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) redirect(destinoProduto(produtoId, "erro"));

  revalidarProdutoOferta(produtoId);
  redirect(destinoProduto(produtoId, "sucesso"));
}

export async function definirProdutoOfertaPrincipal(formData: FormData) {
  await requireAdmin();
  const produtoId = texto(formData, "produto_id");
  const ofertaId = texto(formData, "oferta_id");
  if (!uuidValido(produtoId) || !uuidValido(ofertaId)) {
    redirect(destinoProduto(produtoId, "erro"));
  }

  const { error } = await supabaseAdmin().rpc("selecionar_produto_oferta_principal", {
    p_oferta_id: ofertaId,
  });
  if (error) throw error;

  revalidarProdutoOferta(produtoId);
  redirect(destinoProduto(produtoId, "sucesso"));
}

export async function excluirProdutoOferta(formData: FormData) {
  await requireAdmin();
  const produtoId = texto(formData, "produto_id");
  const ofertaId = texto(formData, "oferta_id");
  if (!uuidValido(produtoId) || !uuidValido(ofertaId)) {
    redirect(destinoProduto(produtoId, "erro"));
  }

  const { error, data } = await supabaseAdmin()
    .from("produto_ofertas")
    .delete()
    .eq("id", ofertaId)
    .eq("produto_id", produtoId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) redirect(destinoProduto(produtoId, "erro"));

  revalidarProdutoOferta(produtoId);
  redirect(destinoProduto(produtoId, "sucesso"));
}

export async function criarFonteIntegracao(formData: FormData) {
  await requireAdmin();
  const produtoId = texto(formData, "produto_id");
  const nome = texto(formData, "nome");
  const marketplaceId = texto(formData, "marketplace_id");
  const tipoIntegracao = texto(formData, "tipo_integracao");

  if (
    !uuidValido(produtoId) ||
    nome.length < 2 ||
    !isTipoIntegracao(tipoIntegracao)
  ) {
    redirect(destinoProduto(produtoId, "erro", "fonte"));
  }

  const { error } = await supabaseAdmin().from("fontes_integracao").insert({
    nome,
    marketplace_id: marketplaceId || null,
    tipo_integracao: tipoIntegracao,
  });
  if (error) throw error;

  revalidatePath(`/admin/produtos/${produtoId}`);
  redirect(destinoProduto(produtoId, "sucesso", "fonte"));
}

function revalidarProdutoOferta(produtoId: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/produtos/${produtoId}`);
  revalidatePath("/produto/[slug]", "page");
}
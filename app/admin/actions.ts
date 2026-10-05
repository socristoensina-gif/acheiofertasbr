"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { linkAfiliadoPermitido } from "@/lib/dominios-permitidos";
import { isCategoriaSlug } from "@/lib/categorias";
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

function slugBase(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function slugUnico(nome: string, idAtual: string | null) {
  const db = supabaseAdmin();
  const base = slugBase(nome) || "produto";
  let slug = base;
  let sufixo = 2;

  while (true) {
    const { data } = await db.from("produtos").select("id").eq("slug", slug).maybeSingle();
    if (!data || data.id === idAtual) return slug;
    slug = `${base}-${sufixo}`;
    sufixo += 1;
  }
}

function marketplaceDoLink(link: string) {
  const host = new URL(link).hostname.toLowerCase();
  const dominosPorMarketplace: [string, string][] = [
    ["shopee.com.br", "Shopee"],
    ["amazon.com.br", "Amazon"],
    ["amzn.to", "Amazon"],
    ["mercadolivre.com.br", "Mercado Livre"],
    ["meli.la", "Mercado Livre"],
    ["aliexpress.com", "AliExpress"],
    ["magazineluiza.com.br", "Magalu"],
    ["magalu.com.br", "Magalu"],
  ];

  return dominosPorMarketplace.find(([dominio]) =>
    host === dominio || host.endsWith(`.${dominio}`),
  )?.[1];
}

export async function salvarProduto(formData: FormData) {
  await requireAdmin();
  const db = supabaseAdmin();
  const id = texto(formData, "id") || null;
  const nome = texto(formData, "nome");
  const linkAfiliado = texto(formData, "link_afiliado");
  const categoriaSlug = texto(formData, "categoria");
  const precoAtual = Number(texto(formData, "preco_atual").replace(",", "."));
  const precoAntigoTexto = texto(formData, "preco_antigo");
  const precoAntigo = precoAntigoTexto ? Number(precoAntigoTexto.replace(",", ".")) : null;
  const destaque = formData.get("destaque") === "on";
  const status = texto(formData, "status");
  const destinoErro = id ? `/admin/produtos/${id}` : "/admin/produtos/novo";

  if (
    !nome || !linkAfiliado || !linkAfiliadoPermitido(linkAfiliado) ||
    !Number.isFinite(precoAtual) || precoAtual < 0 ||
    (precoAntigo !== null && (!Number.isFinite(precoAntigo) || precoAntigo < 0)) ||
    !["publicado", "pausado"].includes(status)
  ) {
    redirect(`${destinoErro}?erro=campos`);
  }
  if (!isCategoriaSlug(categoriaSlug)) redirect(`${destinoErro}?erro=categoria`);

  const nomeMarketplace = marketplaceDoLink(linkAfiliado);
  if (!nomeMarketplace) redirect(`${destinoErro}?erro=marketplace`);

  const { data: categoria } = await db
    .from("categorias")
    .select("slug")
    .eq("slug", categoriaSlug)
    .maybeSingle();
  if (!categoria) redirect(`${destinoErro}?erro=categoria`);

  const beneficios = texto(formData, "beneficios")
    .split(/\r?\n/)
    .map((beneficio) => beneficio.trim())
    .filter(Boolean);
  const produto = {
    slug: await slugUnico(nome, id),
    nome,
    categoria: categoriaSlug,
    marketplace: nomeMarketplace,
    link_afiliado: linkAfiliado,
    imagem: texto(formData, "imagem") || null,
    preco_atual: precoAtual,
    preco_antigo: precoAntigo,
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
  redirect("/admin?sucesso=produto");
}

export async function alterarStatusProduto(formData: FormData) {
  await requireAdmin();
  const id = texto(formData, "id");
  const status = texto(formData, "status");
  if (!id || !["publicado", "pausado"].includes(status)) return;

  const { data, error } = await supabaseAdmin()
    .from("produtos")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) redirect("/admin?erro=status");
  revalidatePath("/");
  revalidatePath("/admin");
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
  redirect("/admin?sucesso=excluir");
}
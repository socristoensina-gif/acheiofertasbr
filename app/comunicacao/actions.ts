"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CATEGORIAS } from "@/lib/categorias";
import { enviarEmailDoPortal } from "@/lib/email";
import { supabaseAdmin } from "@/utils/supabase";

export type FormularioStatus = { erro?: string; sucesso?: boolean };

const frequencias = ["diaria", "semanal", "quinzenal", "mensal"] as const;
const motivos = ["sugestao", "reclamacao", "pedido", "parceria_midia"] as const;
const estados = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

function campo(formData: FormData, nome: string) {
  return String(formData.get(nome) ?? "").trim();
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function pertenceA<T extends readonly string[]>(opcoes: T, valor: string): valor is T[number] {
  return (opcoes as readonly string[]).includes(valor);
}

export async function inscreverNewsletter(
  _estadoAnterior: FormularioStatus,
  formData: FormData,
): Promise<FormularioStatus> {
  if (campo(formData, "website")) return { sucesso: true };

  const nome = campo(formData, "nome").slice(0, 120);
  const email = campo(formData, "email").toLowerCase().slice(0, 254);
  const categorias = formData.getAll("categorias").map(String);
  const periodicidade = campo(formData, "periodicidade");
  const termosAceitos = formData.get("aceite_termos") === "on";
  const slugsPermitidos = new Set(CATEGORIAS.map((categoria) => categoria.slug));
  const categoriasValidas = categorias.filter((slug) => slugsPermitidos.has(slug as never));

  if (nome.length < 2 || !emailValido(email)) return { erro: "Informe seu nome e um e-mail válido." };
  if (!categoriasValidas.length) return { erro: "Escolha ao menos uma categoria de interesse." };
  if (!pertenceA(frequencias, periodicidade)) return { erro: "Escolha a periodicidade dos envios." };
  if (!termosAceitos) return { erro: "É necessário aceitar os termos para se inscrever." };
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return { erro: "O envio ainda não está configurado. Tente novamente mais tarde." };
  }

  const db = supabaseAdmin();
  const { error: erroBanco } = await db.from("newsletter_assinantes").upsert({
    nome,
    email,
    categorias: [...new Set(categoriasValidas)],
    periodicidade,
    termos_aceitos_em: new Date().toISOString(),
  }, { onConflict: "email" });

  if (erroBanco) return { erro: "Não foi possível registrar sua inscrição. Tente novamente." };

  const nomesCategorias = CATEGORIAS
    .filter((categoria) => categoriasValidas.includes(categoria.slug))
    .map((categoria) => categoria.nome)
    .join(", ");
  const enviado = await enviarEmailDoPortal(
    "Nova inscrição na newsletter | Ache Ofertas BR",
    `Nome: ${nome}\nE-mail: ${email}\nCategorias: ${nomesCategorias}\nPeriodicidade: ${periodicidade}\nTermos aceitos: sim`,
  );

  return enviado
    ? { sucesso: true }
    : { erro: "A inscrição foi salva, mas o aviso por e-mail falhou. Tente novamente mais tarde." };
}

export async function enviarContato(
  _estadoAnterior: FormularioStatus,
  formData: FormData,
): Promise<FormularioStatus> {
  if (campo(formData, "website")) return { sucesso: true };

  const nome = campo(formData, "nome").slice(0, 120);
  const email = campo(formData, "email").toLowerCase().slice(0, 254);
  const estado = campo(formData, "estado").toUpperCase();
  const cidade = campo(formData, "cidade").slice(0, 120);
  const motivo = campo(formData, "motivo");
  const mensagem = campo(formData, "mensagem").slice(0, 5000);

  if (nome.length < 2 || !emailValido(email)) return { erro: "Informe seu nome e um e-mail válido." };
  if (!estados.has(estado) || cidade.length < 2) return { erro: "Selecione seu estado e município." };
  if (!pertenceA(motivos, motivo)) return { erro: "Selecione o motivo do contato." };
  if (mensagem.length < 5) return { erro: "Escreva uma mensagem com pelo menos cinco caracteres." };
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return { erro: "O envio ainda não está configurado. Tente novamente mais tarde." };
  }

  const motivoLegivel: Record<string, string> = {
    sugestao: "Sugestão",
    reclamacao: "Reclamação",
    pedido: "Pedido",
    parceria_midia: "Parceria de mídia",
  };
  const { error } = await supabaseAdmin().from("contatos").insert({
    nome,
    email,
    estado,
    cidade,
    motivo,
    mensagem,
  });
  if (error) return { erro: "Não foi possível registrar sua mensagem. Tente novamente." };

  const enviado = await enviarEmailDoPortal(
    `Contato do portal: ${motivoLegivel[motivo]}`,
    `Nome: ${nome}\nE-mail: ${email}\nEstado: ${estado}\nCidade: ${cidade}\nMotivo: ${motivoLegivel[motivo]}\n\nMensagem:\n${mensagem}`,
  );

  return enviado
    ? { sucesso: true }
    : { erro: "A mensagem foi registrada, mas o aviso por e-mail falhou. Tente novamente mais tarde." };
}

async function iniciarOAuth(provider: "google" | "facebook") {
  const headersAtuais = await headers();
  const origem = headersAtuais.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const callback = new URL("/auth/callback?next=/newsletter", origem).toString();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback },
  });

  if (error || !data.url) redirect("/newsletter?erro=oauth");
  redirect(data.url);
}

export async function entrarComGoogle() {
  await iniciarOAuth("google");
}

export async function entrarComFacebook() {
  await iniciarOAuth("facebook");
}
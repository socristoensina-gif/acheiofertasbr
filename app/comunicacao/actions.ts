"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CATEGORIAS } from "@/lib/categorias";
import { CONSENTIMENTO_TEXTO, CONSENTIMENTO_VERSAO } from "@/lib/consentimento";
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

async function verificarLimite(formulario: "newsletter" | "contato") {
  const sal = process.env.RATE_LIMIT_SALT;
  const cabecalhos = await headers();
  const ip = cabecalhos.get("x-real-ip") ?? cabecalhos.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (!sal || !ip) return "indisponivel" as const;

  const hashVisitante = createHash("sha256").update(`${sal}:${ip}`).digest("hex");
  const janela = new Date();
  janela.setUTCMinutes(0, 0, 0);
  const { data, error } = await supabaseAdmin().rpc("incrementar_rate_limit", {
    p_chave: `${formulario}:${hashVisitante}`,
    p_janela: janela.toISOString(),
  });

  if (error) return "indisponivel" as const;
  return data > 5 ? "excedido" as const : "permitido" as const;
}

export async function inscreverNewsletter(
  _estadoAnterior: FormularioStatus,
  formData: FormData,
): Promise<FormularioStatus> {
  if (campo(formData, "website")) return { sucesso: true };
  const limite = await verificarLimite("newsletter");
  if (limite === "excedido") return { erro: "Limite de envios atingido. Tente novamente mais tarde." };
  if (limite === "indisponivel") return { erro: "Não foi possível processar sua inscrição. Tente novamente mais tarde." };

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
    consentimento_texto: CONSENTIMENTO_TEXTO,
    consentimento_versao: CONSENTIMENTO_VERSAO,
    cancelado_em: null,
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
  const limite = await verificarLimite("contato");
  if (limite === "excedido") return { erro: "Limite de envios atingido. Tente novamente mais tarde." };
  if (limite === "indisponivel") return { erro: "Não foi possível enviar sua mensagem. Tente novamente mais tarde." };

  const nome = campo(formData, "nome").slice(0, 120);
  const email = campo(formData, "email").toLowerCase().slice(0, 254);
  const estadoInformado = campo(formData, "estado").toUpperCase();
  const estado = estadoInformado || null;
  const cidade = campo(formData, "cidade").slice(0, 120);
  const motivo = campo(formData, "motivo");
  const mensagem = campo(formData, "mensagem").slice(0, 5000);

  if (nome.length < 2 || !emailValido(email)) return { erro: "Informe seu nome e um e-mail válido." };
  if ((estado && !estados.has(estado)) || (estado && cidade.length < 2) || (!estado && cidade)) {
    return { erro: "Informe uma UF e um município válidos ou deixe ambos em branco." };
  }
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
    cidade: cidade || null,
    motivo,
    mensagem,
  });
  if (error) return { erro: "Não foi possível registrar sua mensagem. Tente novamente." };

  const enviado = await enviarEmailDoPortal(
    `Contato do portal: ${motivoLegivel[motivo]}`,
    `Nome: ${nome}\nE-mail: ${email}\nEstado: ${estado ?? "não informado"}\nCidade: ${cidade || "não informado"}\nMotivo: ${motivoLegivel[motivo]}\n\nMensagem:\n${mensagem}`,
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

export async function cancelarInscricao(
  _estadoAnterior: FormularioStatus,
  formData: FormData,
): Promise<FormularioStatus> {
  const token = campo(formData, "token");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return { sucesso: true };
  }

  const { error } = await supabaseAdmin()
    .from("newsletter_assinantes")
    .update({ cancelado_em: new Date().toISOString() })
    .eq("token_descadastro", token)
    .is("cancelado_em", null);

  return error
    ? { erro: "Não foi possível processar a solicitação. Tente novamente mais tarde." }
    : { sucesso: true };
}
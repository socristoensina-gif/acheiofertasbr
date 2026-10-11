import { gerarPacoteSocial } from "@/lib/seo/gerar";

// Fonte única dos canais de divulgação: usada pelo painel do admin e pelo CSV do n8n.
export const CANAIS_DIVULGACAO = [
  { id: "instagram", nome: "Instagram" },
  { id: "tiktok", nome: "TikTok" },
  { id: "facebook", nome: "Facebook" },
  { id: "whatsapp", nome: "WhatsApp" },
] as const;

export type CanalDivulgacao = (typeof CANAIS_DIVULGACAO)[number]["id"];

export type ProdutoDivulgacao = {
  slug: string;
  nome: string;
  categoria: string | null;
  marketplace: string | null;
  preco: number | null;
  beneficios: string[];
};

export type PacoteDivulgacao = {
  canal: CanalDivulgacao;
  nome: string;
  legenda: string;
  hashtags: string[];
  url: string;
};

export function beneficiosDe(valor: unknown): string[] {
  return Array.isArray(valor)
    ? valor.filter((item): item is string => typeof item === "string")
    : [];
}

export function pacotesDoProduto(produto: ProdutoDivulgacao): PacoteDivulgacao[] {
  return CANAIS_DIVULGACAO.map(({ id, nome }) => ({
    canal: id,
    nome,
    ...gerarPacoteSocial(produto, id),
  }));
}
import { isIP } from "node:net";
import { parseMarketplaceUrl } from "./marketplace-url.ts";

export type TipoCapturaManual = "assistida" | "manual";

export type CapturaManualNormalizada = {
  origem_captura: TipoCapturaManual;
  marketplace_id: string;
  marketplace_nome: string;
  url_origem: string;
  url_final: string;
  id_externo: string | null;
  titulo: string;
  descricao: string | null;
  caracteristicas: string[];
  categoria: string | null;
  imagens: string[];
  videos: string[];
  preco_atual: number | null;
  preco_anterior: number | null;
  avaliacao: number | null;
  quantidade_avaliacoes: number | null;
  vendedor: string | null;
  disponibilidade: boolean | null;
};

const NOMES_MARKETPLACES: Record<string, string> = {
  shopee: "Shopee",
  mercadolivre: "Mercado Livre",
  amazon: "Amazon",
  magalu: "Magalu",
  aliexpress: "AliExpress",
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function texto(value: unknown, limite: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= limite ? normalized : null;
}

function numero(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value !== "string" || value.length > 32) return null;
  const normalized = value.trim().replace(/[^\d,.-]/g, "");
  if (!normalized) return null;
  const decimal = normalized.includes(",")
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized;
  const parsed = Number(decimal);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function imagemHttps(value: unknown) {
  const source = texto(value, 2048);
  if (!source) return null;
  try {
    const url = new URL(source);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      isIP(host) !== 0 ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local")
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizarCapturaManual(input: unknown, origem: TipoCapturaManual) {
  const data = record(input);
  if (!data) return null;

  const titulo = texto(data.titulo ?? data.title, 300);
  const urlOrigem = texto(data.url ?? data.url_origem ?? data.affiliateUrl, 2048);
  if (!titulo || !urlOrigem) return null;
  const parsedUrl = parseMarketplaceUrl(urlOrigem);
  if (!parsedUrl) return null;

  const priceInput = data.preco ?? data.price;
  const priceValue = priceInput === null || priceInput === "" ? null : numero(priceInput);
  if (priceInput !== undefined && priceInput !== null && priceInput !== "" && priceValue === null) {
    return null;
  }

  const description = texto(data.descricao ?? data.description ?? "", 10_000);
  const descriptionInput = data.descricao ?? data.description;
  if (
    typeof descriptionInput === "string" &&
    descriptionInput.trim().length > 0 &&
    description === null
  ) return null;
  const featuresInput = data.caracteristicas ?? data.characteristics ?? [];
  if (
    !Array.isArray(featuresInput) ||
    featuresInput.length > 20 ||
    featuresInput.some((item) => typeof item !== "string" || item.trim().length > 500)
  ) return null;
  const characteristics = featuresInput
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  const image = imagemHttps(data.imagem ?? data.image);
  if (
    (data.imagem !== undefined && data.imagem !== null && data.imagem !== "" && !image) ||
    (data.image !== undefined && data.image !== null && data.image !== "" && !image)
  ) return null;

  return {
    previa: {
      origem_captura: origem,
      marketplace_id: parsedUrl.marketplaceId,
      marketplace_nome: NOMES_MARKETPLACES[parsedUrl.marketplaceId],
      url_origem: parsedUrl.canonicalUrl,
      url_final: parsedUrl.canonicalUrl,
      id_externo: parsedUrl.externalId,
      titulo,
      descricao: description,
      caracteristicas: [...new Set(characteristics)],
      categoria: null,
      imagens: image ? [image] : [],
      videos: [],
      preco_atual: priceValue,
      preco_anterior: null,
      avaliacao: null,
      quantidade_avaliacoes: null,
      vendedor: null,
      disponibilidade: null,
    } satisfies CapturaManualNormalizada,
    raw: {
      metodo: origem,
      titulo,
      preco: priceValue,
      imagem: image,
      url: parsedUrl.canonicalUrl,
      descricao: description,
      caracteristicas: [...new Set(characteristics)],
      captured_at: new Date().toISOString(),
    },
  };
}

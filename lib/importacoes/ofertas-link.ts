import "server-only";

import { isIP } from "node:net";
import { linkAfiliadoPermitido } from "@/lib/dominios-permitidos";
import { parseMarketplaceUrl } from "@/lib/importacoes/marketplace-url";
import {
  importarOfertaShopee,
  resolverLinkCurtoShopee,
  ShopeeIntegrationError,
  shopeeApiConfigurada,
} from "@/lib/integracoes/shopee";
import { supabaseAdmin } from "@/utils/supabase";

const LIMITE_HTML_BYTES = 1_000_000;
const TEMPO_LIMITE_MS = 10_000;
const MAX_REDIRECTS = 5;

export type PreviaOfertaLink = {
  origem_captura: "capturada" | "assistida" | "manual" | "api";
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

type MetaTags = Record<string, string>;
type JsonRecord = Record<string, unknown>;

const MARKETPLACES_LINK = [
  { id: "shopee", nome: "Shopee" },
  { id: "amazon", nome: "Amazon" },
  { id: "mercadolivre", nome: "Mercado Livre" },
  { id: "aliexpress", nome: "AliExpress" },
  { id: "magalu", nome: "Magalu" },
] as const;

const METADADOS_TEXTUAIS_PERMITIDOS = new Set([
  "description",
  "og:title",
  "og:description",
  "twitter:title",
  "twitter:description",
  "product:price:amount",
  "product:original_price",
  "product:price:currency",
  "product:rating",
]);

function identificarMarketplace(url: URL) {
  const parsed = parseMarketplaceUrl(url.toString());
  if (!parsed) return null;
  const id = parsed.marketplaceId;
  return MARKETPLACES_LINK.find((marketplace) => marketplace.id === id) ?? null;
}

function atributos(tag: string): MetaTags {
  const result: MetaTags = {};
  const expression = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(expression)) {
    result[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, code: string) => {
      if (code[0] === "#") {
        const hex = code[1]?.toLowerCase() === "x";
        const number = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
        return Number.isInteger(number) && number >= 0 && number <= 0x10ffff
          ? String.fromCodePoint(number)
          : entity;
      }
      return ({
        amp: "&",
        quot: '"',
        apos: "'",
        lt: "<",
        gt: ">",
        nbsp: " ",
      })[code.toLowerCase()] ?? entity;
    })
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10_000);
}

function lerMetadados(html: string): MetaTags {
  const meta: MetaTags = {};
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = atributos(match[0]);
    const key = attrs.property ?? attrs.name ?? attrs.itemprop;
    if (key && attrs.content) meta[key.toLowerCase()] = attrs.content;
  }
  return meta;
}

function metadadosSeguros(meta: MetaTags): MetaTags {
  return Object.fromEntries(
    Object.entries(meta).filter(([key]) => METADADOS_TEXTUAIS_PERMITIDOS.has(key)),
  );
}

function tituloDocumento(html: string) {
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? decodeHtml(title) : null;
}

function registrosJsonLd(html: string): JsonRecord[] {
  const records: JsonRecord[] = [];
  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed: unknown = JSON.parse(match[1].trim());
      const pending = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (pending.length) {
        const value: unknown = pending.shift();
        if (!value || typeof value !== "object") continue;
        if (Array.isArray(value)) {
          pending.push(...value);
          continue;
        }
        const record = value as JsonRecord;
        records.push(record);
        if (Array.isArray(record["@graph"])) pending.push(...record["@graph"]);
      }
    } catch {
      continue;
    }
  }
  return records;
}

function texto(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = decodeHtml(String(value));
  return normalized ? normalized.slice(0, 10_000) : null;
}

function listaTextos(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(values.flatMap((item) => {
    const result = texto(item);
    return result ? [result] : [];
  }))].slice(0, 20);
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function encontrarProduto(registros: JsonRecord[]) {
  return registros.find((record) => {
    const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
    return types.some((type) => typeof type === "string" && type.toLowerCase() === "product");
  }) ?? null;
}

function numero(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim().replace(/[^\d,.-]/g, "");
  if (!normalized) return null;
  const decimal = normalized.includes(",")
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized;
  const parsed = Number(decimal);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function urlAbsoluta(value: unknown, baseUrl: string): string | null {
  const source = texto(value);
  if (!source) return null;
  try {
    const url = new URL(source, baseUrl);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      isIP(host) ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local")
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function valoresDeImagem(value: unknown, baseUrl: string): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(values.flatMap((item) => {
    const record = asRecord(item);
    const url = urlAbsoluta(record?.url ?? record?.contentUrl ?? item, baseUrl);
    return url ? [url] : [];
  }))].slice(0, 20);
}

function disponibilidade(value: unknown): boolean | null {
  const status = texto(value)?.toLowerCase();
  if (!status) return null;
  if (/instock|limitedavailability|onlineonly|preorder/.test(status)) return true;
  if (/outofstock|soldout|discontinued/.test(status)) return false;
  return null;
}

function normalizarPrevia(
  html: string,
  urlOrigem: string,
  urlFinal: string,
  marketplaceId: string,
  externalIdFromUrl: string | null,
): PreviaOfertaLink | null {
  const meta = lerMetadados(html);
  const product = encontrarProduto(registrosJsonLd(html));
  const offersRaw = product?.offers;
  const offer = asRecord(Array.isArray(offersRaw) ? offersRaw[0] : offersRaw);
  const aggregate = asRecord(product?.aggregateRating);
  const seller = asRecord(offer?.seller);
  const marketplace = MARKETPLACES_LINK.find(({ id }) => id === marketplaceId);
  if (!marketplace) return null;

  const title = texto(product?.name) ??
    meta["og:title"] ??
    meta["twitter:title"] ??
    meta.title ??
    tituloDocumento(html);
  if (!title) return null;

  const images = [
    ...valoresDeImagem(product?.image, urlFinal),
    ...[meta["og:image"], meta["twitter:image"]]
      .map((image) => urlAbsoluta(image, urlFinal))
      .filter((image): image is string => Boolean(image)),
  ];
  const videos = [
    ...valoresDeImagem(product?.video, urlFinal),
    ...["og:video", "og:video:url", "twitter:player:stream"]
      .map((key) => urlAbsoluta(meta[key], urlFinal))
      .filter((video): video is string => Boolean(video)),
  ];
  const characteristics = Array.isArray(product?.additionalProperty)
    ? product.additionalProperty.flatMap((item) => {
        const property = asRecord(item);
        const name = texto(property?.name);
        const value = texto(property?.value);
        return name && value ? [`${name}: ${value}`] : [];
      })
    : [];
  const currency = texto(offer?.priceCurrency ?? meta["product:price:currency"])?.toUpperCase();
  const price = currency && currency !== "BRL"
    ? null
    : numero(offer?.price ?? offer?.lowPrice) ??
      numero(meta["product:price:amount"] ?? meta["og:price:amount"]);
  const previousPrice = numero(meta["product:original_price"]);
  const rating = numero(aggregate?.ratingValue ?? meta["product:rating"]);
  const ratingCount = numero(aggregate?.reviewCount ?? aggregate?.ratingCount);
  const final = new URL(urlFinal);
  const idExterno = (externalIdFromUrl ??
    texto(product?.sku ?? product?.productID ?? product?.mpn) ??
    final.pathname.match(/(?:dp|product|item|p)\/([A-Z0-9-]{5,})/i)?.[1] ??
    null)?.slice(0, 256) ?? null;

  return {
    origem_captura: "capturada",
    marketplace_id: marketplaceId,
    marketplace_nome: marketplace.nome,
    url_origem: urlOrigem,
    url_final: urlFinal,
    id_externo: idExterno,
    titulo: title,
    descricao: texto(product?.description) ?? meta["og:description"] ?? meta.description ?? null,
    caracteristicas: [...new Set([
      ...characteristics,
      ...listaTextos(product?.description ? [] : meta["product:feature"]),
    ])].slice(0, 20),
    categoria: texto(product?.category),
    imagens: [...new Set(images)].slice(0, 20),
    videos: [...new Set(videos)].slice(0, 20),
    preco_atual: price,
    preco_anterior: previousPrice,
    avaliacao: rating !== null && rating <= 5 ? rating : null,
    quantidade_avaliacoes: ratingCount,
    vendedor: texto(seller?.name),
    disponibilidade: disponibilidade(offer?.availability),
  };
}

async function lerCorpoLimitado(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > LIMITE_HTML_BYTES) {
        await reader.cancel();
        throw new Error("PAGE_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function capturarPagina(urlInicial: URL, marketplaceId: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TEMPO_LIMITE_MS);
  let current = urlInicial;

  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      if (identificarMarketplace(current)?.id !== marketplaceId) {
        throw new Error("REDIRECT_MARKETPLACE_MISMATCH");
      }
      let response: Response;
      try {
        response = await fetch(current, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            accept: "text/html,application/xhtml+xml",
            "user-agent": "AcheiOfertasBR/1.0 (product metadata preview)",
          },
        });
      } catch {
        console.info(JSON.stringify({
          event: "marketplace_page_response",
          marketplace: marketplaceId,
          http_status: null,
          content_type: null,
          redirect_count: redirects,
        }));
        throw new Error("PAGE_UNAVAILABLE");
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        console.info(JSON.stringify({
          event: "marketplace_page_response",
          marketplace: marketplaceId,
          http_status: response.status,
          content_type: response.headers.get("content-type")?.split(";")[0] ?? null,
          redirect_count: redirects + 1,
        }));
        await response.body?.cancel();
        if (!location || redirects === MAX_REDIRECTS) throw new Error("REDIRECT_LIMIT");
        current = new URL(location, current);
        continue;
      }
      console.info(JSON.stringify({
        event: "marketplace_page_response",
        marketplace: marketplaceId,
        http_status: response.status,
        content_type: response.headers.get("content-type")?.split(";")[0] ?? null,
        redirect_count: redirects,
      }));
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error("PAGE_UNAVAILABLE");
      }
      if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
        await response.body?.cancel();
        throw new Error("PAGE_NOT_HTML");
      }
      return {
        html: await lerCorpoLimitado(response),
        urlFinal: current.toString(),
        redirects,
      };
    }
    throw new Error("REDIRECT_LIMIT");
  } finally {
    clearTimeout(timeout);
  }
}

export async function importarOfertaPorLink(urlInput: string, criadoPor: string) {
  const parsedInput = parseMarketplaceUrl(urlInput);
  if (!parsedInput) return { ok: false as const, reason: "url" as const };
  const urlOrigem = new URL(parsedInput.canonicalUrl);
  const marketplace = identificarMarketplace(urlOrigem);
  if (!marketplace) return { ok: false as const, reason: "marketplace" as const };

  const db = supabaseAdmin();
  const { data: importacao, error: erroInsert } = await db
    .from("importacoes_ofertas")
    .insert({
      marketplace_id: marketplace.id,
      tipo_importacao: "link",
      url_origem: urlOrigem.toString(),
      status: "processando",
      criado_por: criadoPor,
    })
    .select("id")
    .single();
  if (erroInsert) throw erroInsert;

  if (parsedInput.marketplaceId === "shopee") {
    let urlProduto = parsedInput;
    let redirects = 0;
    try {
      if (parsedInput.isShortLink) {
        const resolved = await resolverLinkCurtoShopee(urlOrigem);
        redirects = resolved.redirects;
        const parsedResolved = parseMarketplaceUrl(resolved.url.toString());
        if (!parsedResolved?.itemId || !parsedResolved.shopId) {
          throw new ShopeeIntegrationError("MISSING_PRODUCT_IDS");
        }
        urlProduto = parsedResolved;
      }

      if (!urlProduto.itemId || !urlProduto.shopId) {
        throw new ShopeeIntegrationError("MISSING_PRODUCT_IDS");
      }
      if (!shopeeApiConfigurada()) {
        throw new ShopeeIntegrationError("NOT_CONFIGURED");
      }

      const { product, affiliateUrl } = await importarOfertaShopee(urlProduto);
      const urlFinal = product.productUrl ?? urlProduto.canonicalUrl;
      const previa: PreviaOfertaLink = {
        origem_captura: "api",
        marketplace_id: "shopee",
        marketplace_nome: "Shopee",
        url_origem: affiliateUrl,
        url_final: urlFinal,
        id_externo: product.itemId,
        titulo: product.title,
        descricao: null,
        caracteristicas: [],
        categoria: null,
        imagens: product.imageUrl ? [product.imageUrl] : [],
        videos: [],
        preco_atual: product.price,
        preco_anterior: null,
        avaliacao: product.rating,
        quantidade_avaliacoes: null,
        vendedor: null,
        disponibilidade: null,
      };
      const { error } = await db
        .from("importacoes_ofertas")
        .update({
          url_origem: affiliateUrl,
          status: "aguardando_revisao",
          dados_brutos: {
            metodo: "api",
            marketplace_id: "shopee",
            item_id: product.itemId,
            shop_id: product.shopId,
            titulo_original: product.title,
            preco_atual: product.price,
            avaliacao: product.rating,
            quantidade_vendas: product.sales,
            imagem_original: product.imageUrl,
            url_produto: new URL(urlFinal).origin + new URL(urlFinal).pathname,
            redirect_count: redirects,
          },
          dados_processados: previa,
          processado_em: new Date().toISOString(),
          erro: null,
        })
        .eq("id", importacao.id);
      if (error) throw error;
      return { ok: true as const, importacaoId: importacao.id };
    } catch (error) {
      const mensagem = error instanceof ShopeeIntegrationError
        ? error.code === "NOT_CONFIGURED"
          ? "API Shopee não configurada; use captura assistida ou cadastro manual."
          : error.code === "MISSING_PRODUCT_IDS"
            ? "Não foi possível identificar a loja e o produto pelo link; use captura assistida ou cadastro manual."
            : error.code === "UPSTREAM_REJECTED"
              ? "A Shopee bloqueou ou recusou a consulta; use captura assistida ou cadastro manual."
              : error.code === "PRODUCT_NOT_FOUND"
                ? "A API da Shopee não encontrou uma oferta para esse produto; use captura assistida ou cadastro manual."
                : "A API da Shopee não conseguiu importar o produto; use captura assistida ou cadastro manual."
        : "A API da Shopee não conseguiu importar o produto; use captura assistida ou cadastro manual.";
      const { error: erroUpdate } = await db
        .from("importacoes_ofertas")
        .update({
          status: "erro",
          erro: mensagem,
          dados_brutos: {
            metodo: "api",
            marketplace_id: "shopee",
            item_id: urlProduto.itemId,
            shop_id: urlProduto.shopId,
            redirect_count: redirects,
          },
          processado_em: new Date().toISOString(),
        })
        .eq("id", importacao.id);
      if (erroUpdate) throw erroUpdate;
      return { ok: false as const, reason: "capture" as const, importacaoId: importacao.id };
    }
  }

  try {
    const captured = await capturarPagina(urlOrigem, marketplace.id);
    const parsedFinal = parseMarketplaceUrl(captured.urlFinal);
    const previa = normalizarPrevia(
      captured.html,
      urlOrigem.toString(),
      captured.urlFinal,
      marketplace.id,
      parsedFinal?.externalId ?? null,
    );
    if (!previa) {
      const { error } = await db
        .from("importacoes_ofertas")
        .update({
          status: "erro",
          erro: "A página não disponibilizou título público para prévia.",
          processado_em: new Date().toISOString(),
        })
        .eq("id", importacao.id);
      if (error) throw error;
      return { ok: false as const, reason: "metadata" as const, importacaoId: importacao.id };
    }

    const dadosBrutos = {
      captured_at: new Date().toISOString(),
      url_final: new URL(captured.urlFinal).origin + new URL(captured.urlFinal).pathname,
      meta: metadadosSeguros(lerMetadados(captured.html)),
      json_ld_product: {
        titulo: previa.titulo,
        descricao: previa.descricao,
        caracteristicas: previa.caracteristicas,
        preco_atual: previa.preco_atual,
        preco_anterior: previa.preco_anterior,
        avaliacao: previa.avaliacao,
        quantidade_avaliacoes: previa.quantidade_avaliacoes,
        disponibilidade: previa.disponibilidade,
        vendedor: previa.vendedor,
        id_externo: previa.id_externo,
        categoria: previa.categoria,
      },
    };
    const { error } = await db
      .from("importacoes_ofertas")
      .update({
        status: "aguardando_revisao",
        dados_brutos: dadosBrutos,
        dados_processados: previa,
        processado_em: new Date().toISOString(),
      })
      .eq("id", importacao.id);
    if (error) throw error;

    return { ok: true as const, importacaoId: importacao.id };
  } catch (error) {
    const erroSeguro = error instanceof Error && error.message === "PAGE_TOO_LARGE"
      ? "A página excede o limite permitido para captura."
      : error instanceof Error && error.message === "PAGE_NOT_HTML"
        ? "O endereço não retornou uma página HTML de produto."
        : error instanceof Error && error.message === "REDIRECT_MARKETPLACE_MISMATCH"
          ? "O redirecionamento levou a outro marketplace."
          : error instanceof Error && error.message === "REDIRECT_LIMIT"
            ? "A página excedeu o limite de redirecionamentos."
            : "Não foi possível capturar os dados públicos desta página.";
    const { error: erroUpdate } = await db
      .from("importacoes_ofertas")
      .update({
        status: "erro",
        erro: erroSeguro,
        processado_em: new Date().toISOString(),
      })
      .eq("id", importacao.id);
    if (erroUpdate) throw erroUpdate;
    return { ok: false as const, reason: "capture" as const, importacaoId: importacao.id };
  }
}

export function validarPreviaImportacao(value: unknown): PreviaOfertaLink | null {
  const record = asRecord(value);
  if (
    !record ||
    !["capturada", "assistida", "manual", "api"].includes(String(record.origem_captura)) ||
    typeof record.marketplace_id !== "string" ||
    typeof record.marketplace_nome !== "string" ||
    typeof record.url_origem !== "string" ||
    typeof record.url_final !== "string" ||
    typeof record.titulo !== "string" ||
    (record.id_externo !== null && typeof record.id_externo !== "string") ||
    (record.descricao !== null && typeof record.descricao !== "string") ||
    (record.categoria !== null && typeof record.categoria !== "string") ||
    (record.preco_atual !== null && typeof record.preco_atual !== "number") ||
    (record.preco_anterior !== null && typeof record.preco_anterior !== "number") ||
    (record.avaliacao !== null && typeof record.avaliacao !== "number") ||
    (record.quantidade_avaliacoes !== null && typeof record.quantidade_avaliacoes !== "number") ||
    (record.vendedor !== null && typeof record.vendedor !== "string") ||
    (record.disponibilidade !== null && typeof record.disponibilidade !== "boolean") ||
    !Array.isArray(record.caracteristicas) ||
    !Array.isArray(record.imagens) ||
    !Array.isArray(record.videos) ||
    !record.caracteristicas.every((item) => typeof item === "string") ||
    !record.imagens.every((item) => typeof item === "string") ||
    !record.videos.every((item) => typeof item === "string")
  ) {
    return null;
  }
  const marketplace = MARKETPLACES_LINK.find(({ id }) => id === record.marketplace_id);
  if (!marketplace || marketplace.nome !== record.marketplace_nome) return null;
  const urlOrigem = parseMarketplaceUrl(record.url_origem);
  const urlFinal = parseMarketplaceUrl(record.url_final);
  if (
    urlOrigem?.marketplaceId !== marketplace.id ||
    urlFinal?.marketplaceId !== marketplace.id ||
    !linkAfiliadoPermitido(urlOrigem.canonicalUrl) ||
    !linkAfiliadoPermitido(urlFinal.canonicalUrl)
  ) {
    return null;
  }

  return {
    origem_captura: record.origem_captura as PreviaOfertaLink["origem_captura"],
    marketplace_id: record.marketplace_id,
    marketplace_nome: marketplace.nome,
    url_origem: urlOrigem.canonicalUrl,
    url_final: urlFinal.canonicalUrl,
    id_externo: record.id_externo,
    titulo: record.titulo,
    descricao: record.descricao,
    caracteristicas: record.caracteristicas,
    categoria: record.categoria,
    imagens: record.imagens,
    videos: record.videos,
    preco_atual: record.preco_atual,
    preco_anterior: record.preco_anterior,
    avaliacao: record.avaliacao,
    quantidade_avaliacoes: record.quantidade_avaliacoes,
    vendedor: record.vendedor,
    disponibilidade: record.disponibilidade,
  };
}

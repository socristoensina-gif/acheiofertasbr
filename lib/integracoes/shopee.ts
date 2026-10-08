import "server-only";

import { authorizationShopee } from "@/lib/integracoes/shopee-signature";
import {
  normalizeShopeeProductResponse,
  normalizeShopeeShortLinkResponse,
  type ShopeeProductPreview,
} from "@/lib/integracoes/shopee-response";
import type { MarketplaceUrl } from "@/lib/importacoes/marketplace-url";

const SHOPEE_GRAPHQL_ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 64_000;

export type ShopeeIntegrationErrorCode =
  | "NOT_CONFIGURED"
  | "INVALID_URL"
  | "MISSING_PRODUCT_IDS"
  | "PRODUCT_NOT_FOUND"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_REJECTED"
  | "INVALID_RESPONSE";

export class ShopeeIntegrationError extends Error {
  constructor(readonly code: ShopeeIntegrationErrorCode) {
    super(code);
    this.name = "ShopeeIntegrationError";
  }
}

function credenciais() {
  const appId = process.env.SHOPEE_APP_ID?.trim();
  const secretKey = process.env.SHOPEE_SECRET_KEY?.trim();
  if (!appId || !secretKey || appId.length > 128 || secretKey.length > 512) {
    throw new ShopeeIntegrationError("NOT_CONFIGURED");
  }
  return { appId, secretKey };
}

async function lerRespostaLimitada(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ShopeeIntegrationError("INVALID_RESPONSE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

function urlShopeeValida(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      (hostname === "shopee.com.br" || hostname.endsWith(".shopee.com.br"));
  } catch {
    return false;
  }
}

export function shopeeApiConfigurada() {
  const appId = process.env.SHOPEE_APP_ID?.trim();
  const secretKey = process.env.SHOPEE_SECRET_KEY?.trim();
  return Boolean(
    appId &&
    secretKey &&
    appId.length <= 128 &&
    secretKey.length <= 512,
  );
}

async function consultarShopee<T>(
  operation: string,
  payload: { query: string; variables?: Record<string, unknown>; operationName?: string },
  normalize: (value: unknown) => T | null,
): Promise<T> {
  const { appId, secretKey } = credenciais();
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let httpStatus: number | null = null;
  let contentType: string | null = null;

  try {
    const response = await fetch(SHOPEE_GRAPHQL_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        authorization: authorizationShopee(appId, timestamp, body, secretKey),
        "content-type": "application/json",
      },
      body,
    });
    httpStatus = response.status;
    contentType = response.headers.get("content-type");
    console.info(JSON.stringify({
      event: "marketplace_api_response",
      marketplace: "shopee",
      operation,
      http_status: httpStatus,
      content_type: contentType?.split(";")[0] ?? null,
      redirect_count: 0,
    }));

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
      throw new ShopeeIntegrationError("INVALID_RESPONSE");
    }

    const responseText = await lerRespostaLimitada(response);

    let result: unknown;
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new ShopeeIntegrationError("INVALID_RESPONSE");
    }
    if (!response.ok) throw new ShopeeIntegrationError("UPSTREAM_UNAVAILABLE");
    if (!result || typeof result !== "object") {
      throw new ShopeeIntegrationError("INVALID_RESPONSE");
    }

    const responseData = result as { errors?: unknown };
    if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
      throw new ShopeeIntegrationError("UPSTREAM_REJECTED");
    }

    const value = normalize(result);
    if (value === null) {
      throw new ShopeeIntegrationError(
        operation === "productOfferV2" ? "PRODUCT_NOT_FOUND" : "INVALID_RESPONSE",
      );
    }
    return value;
  } catch (error) {
    if (error instanceof ShopeeIntegrationError) throw error;
    console.info(JSON.stringify({
      event: "marketplace_api_failure",
      marketplace: "shopee",
      operation,
      http_status: httpStatus,
      content_type: contentType?.split(";")[0] ?? null,
      redirect_count: 0,
    }));
    throw new ShopeeIntegrationError("UPSTREAM_UNAVAILABLE");
  } finally {
    clearTimeout(timeout);
  }
}

export async function buscarOfertaProdutoShopee(url: MarketplaceUrl) {
  if (
    url.marketplaceId !== "shopee" ||
    !url.itemId ||
    !url.shopId ||
    !/^\d{1,24}$/.test(url.itemId) ||
    !/^\d{1,24}$/.test(url.shopId)
  ) {
    throw new ShopeeIntegrationError("MISSING_PRODUCT_IDS");
  }

  const query = [
    "{",
    `  productOfferV2(shopId: ${url.shopId}, itemId: ${url.itemId}, limit: 1) {`,
    "    nodes {",
    "      itemId shopId productName productLink offerLink imageUrl",
    "      priceMin priceMax ratingStar sales",
    "    }",
    "  }",
    "}",
  ].join("\n");
  const product = await consultarShopee<ShopeeProductPreview>(
    "productOfferV2",
    { query },
    normalizeShopeeProductResponse,
  );
  if (product.itemId !== url.itemId || product.shopId !== url.shopId) {
    throw new ShopeeIntegrationError("INVALID_RESPONSE");
  }
  return product;
}

export async function gerarLinkAfiliadoShopee(originUrl: string) {
  if (originUrl.length > 2048 || !urlShopeeValida(originUrl)) {
    throw new ShopeeIntegrationError("INVALID_URL");
  }

  const parsedOriginUrl = new URL(originUrl);
  parsedOriginUrl.hash = "";
  const payload = {
    query: [
      "mutation generateShortLink($input: GenerateShortLinkInput!) {",
      "  generateShortLink(input: $input) {",
      "    shortLink",
      "  }",
      "}",
    ].join("\n"),
    variables: {
      input: { originUrl: parsedOriginUrl.toString() },
    },
    operationName: "generateShortLink",
  };
  return consultarShopee(
    "generateShortLink",
    payload,
    normalizeShopeeShortLinkResponse,
  );
}

export async function importarOfertaShopee(url: MarketplaceUrl) {
  const product = await buscarOfertaProdutoShopee(url);
  const baseUrl = product.productUrl ?? url.canonicalUrl;
  const affiliateUrl = await gerarLinkAfiliadoShopee(baseUrl);
  return { product, affiliateUrl };
}

export async function resolverLinkCurtoShopee(urlInicial: URL) {
  const timeout = AbortSignal.timeout(8_000);
  let current = urlInicial;
  let redirects = 0;

  for (; redirects <= 5; redirects += 1) {
    const parsed = new URL(current);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      !(
        parsed.hostname.toLowerCase() === "shopee.com.br" ||
        parsed.hostname.toLowerCase().endsWith(".shopee.com.br")
      )
    ) {
      throw new ShopeeIntegrationError("INVALID_URL");
    }

    let response: Response;
    try {
      response = await fetch(parsed, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: timeout,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "AcheiOfertasBR/1.0 (affiliate link resolution)",
        },
      });
    } catch {
      console.info(JSON.stringify({
        event: "marketplace_link_resolution",
        marketplace: "shopee",
        http_status: null,
        content_type: null,
        redirect_count: redirects,
      }));
      throw new ShopeeIntegrationError("UPSTREAM_UNAVAILABLE");
    }
    const contentType = response.headers.get("content-type");
    console.info(JSON.stringify({
      event: "marketplace_link_resolution",
      marketplace: "shopee",
      http_status: response.status,
      content_type: contentType?.split(";")[0] ?? null,
      redirect_count: redirects,
    }));

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || redirects === 5) {
        throw new ShopeeIntegrationError("UPSTREAM_UNAVAILABLE");
      }
      current = new URL(location, parsed);
      continue;
    }

    await response.body?.cancel();
    if (response.status === 401 || response.status === 403 || response.status === 429) {
      throw new ShopeeIntegrationError("UPSTREAM_REJECTED");
    }
    if (!response.ok) throw new ShopeeIntegrationError("UPSTREAM_UNAVAILABLE");
    return { url: parsed, redirects };
  }

  throw new ShopeeIntegrationError("UPSTREAM_UNAVAILABLE");
}

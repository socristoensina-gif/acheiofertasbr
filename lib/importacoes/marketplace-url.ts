export type MarketplaceId = "shopee" | "mercadolivre" | "amazon" | "magalu" | "aliexpress";

export type MarketplaceUrl = {
  marketplaceId: MarketplaceId;
  canonicalUrl: string;
  externalId: string | null;
  itemId: string | null;
  shopId: string | null;
  isShortLink: boolean;
};

const DOMAINS: Record<MarketplaceId, readonly string[]> = {
  shopee: ["shopee.com.br"],
  mercadolivre: ["mercadolivre.com.br", "meli.la"],
  amazon: ["amazon.com.br", "amzn.to"],
  magalu: ["magazineluiza.com.br", "magalu.com.br"],
  aliexpress: ["aliexpress.com"],
};

function marketplaceForHost(hostname: string): MarketplaceId | null {
  const host = hostname.toLowerCase();
  for (const [marketplaceId, domains] of Object.entries(DOMAINS) as [MarketplaceId, readonly string[]][]) {
    if (domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
      return marketplaceId;
    }
  }
  return null;
}

function numericIdentifier(value: string | null) {
  return value && /^\d{1,24}$/.test(value) ? value : null;
}

export function parseMarketplaceUrl(input: string): MarketplaceUrl | null {
  if (!input || input.length > 2048) return null;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    return null;
  }

  const marketplaceId = marketplaceForHost(url.hostname);
  if (!marketplaceId) return null;

  const path = url.pathname;
  let itemId: string | null = null;
  let shopId: string | null = null;
  let externalId: string | null = null;
  let isShortLink = false;

  if (marketplaceId === "shopee") {
    isShortLink = url.hostname.toLowerCase() === "s.shopee.com.br";
    const productPath = path.match(/\/product\/(\d{1,24})\/(\d{1,24})(?:\/|$)/i);
    const compactProductPath = path.match(/-i\.(\d{1,24})\.(\d{1,24})(?:\/|$)/i);
    shopId = numericIdentifier(url.searchParams.get("shopId"))
      ?? productPath?.[1]
      ?? compactProductPath?.[1]
      ?? null;
    itemId = numericIdentifier(url.searchParams.get("itemId"))
      ?? productPath?.[2]
      ?? compactProductPath?.[2]
      ?? null;
    externalId = itemId;
  } else if (marketplaceId === "mercadolivre") {
    const listingId = path.match(/(?:^|\/)(MLB-?\d{6,})(?=[/-]|$)/i)?.[1]
      ?? url.searchParams.get("wid")
      ?? url.searchParams.get("item_id");
    externalId = listingId?.replace("-", "").toUpperCase() ?? null;
  } else if (marketplaceId === "amazon") {
    externalId = path.match(/\/(?:dp|gp\/(?:product|aw\/d))\/([A-Z0-9]{10})(?:\/|$)/i)?.[1]?.toUpperCase()
      ?? null;
  } else if (marketplaceId === "magalu") {
    externalId = path.match(/\/(?:p|produto)\/([a-z0-9-]{5,})(?:\/|$)/i)?.[1]
      ?? url.searchParams.get("sku")
      ?? null;
  } else if (marketplaceId === "aliexpress") {
    externalId = path.match(/\/item\/(\d{5,})(?:\.html)?(?:\/|$)/i)?.[1] ?? null;
  }

  url.hash = "";
  return {
    marketplaceId,
    canonicalUrl: url.toString(),
    externalId,
    itemId,
    shopId,
    isShortLink,
  };
}

export function safeMarketplaceUrl(input: string, expectedMarketplace?: MarketplaceId) {
  const parsed = parseMarketplaceUrl(input);
  return parsed && (!expectedMarketplace || parsed.marketplaceId === expectedMarketplace)
    ? parsed
    : null;
}

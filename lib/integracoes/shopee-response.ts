import { parseMarketplaceUrl } from "../importacoes/marketplace-url.ts";

export type ShopeeProductPreview = {
  itemId: string;
  shopId: string;
  title: string;
  productUrl: string | null;
  affiliateUrl: string | null;
  imageUrl: string | null;
  price: number | null;
  rating: number | null;
  sales: number | null;
};

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : null;
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : null;
}

function price(value: unknown) {
  const source = text(value);
  if (source === null || source === "") return null;
  const parsed = Number(source);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function safeShopeeUrl(value: unknown) {
  const source = text(value);
  if (!source) return null;
  const parsed = parseMarketplaceUrl(source);
  return parsed?.marketplaceId === "shopee" ? parsed.canonicalUrl : null;
}

function safeImageUrl(value: unknown) {
  const source = text(value);
  if (!source) return null;
  try {
    const url = new URL(source);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function normalizeShopeeProductResponse(value: unknown): ShopeeProductPreview | null {
  const root = asRecord(value);
  const data = asRecord(root?.data);
  const offers = asRecord(data?.productOfferV2);
  const nodes = offers?.nodes;
  const product = Array.isArray(nodes) ? asRecord(nodes[0]) : null;
  if (!product) return null;

  const itemId = text(product.itemId);
  const shopId = text(product.shopId);
  const title = text(product.productName);
  if (
    !itemId ||
    !/^\d{1,24}$/.test(itemId) ||
    !shopId ||
    !/^\d{1,24}$/.test(shopId) ||
    !title ||
    title.length > 300
  ) {
    return null;
  }

  const imageUrl = safeImageUrl(product.imageUrl);
  const productUrl = safeShopeeUrl(product.productLink);
  const affiliateUrl = safeShopeeUrl(product.offerLink);
  const rating = price(product.ratingStar);
  const sales = price(product.sales);

  return {
    itemId,
    shopId,
    title,
    productUrl,
    affiliateUrl,
    imageUrl,
    price: price(product.priceMin),
    rating: rating !== null && rating <= 5 ? rating : null,
    sales: sales !== null && Number.isInteger(sales) ? sales : null,
  };
}

export function normalizeShopeeShortLinkResponse(value: unknown) {
  const root = asRecord(value);
  const data = asRecord(root?.data);
  const result = asRecord(data?.generateShortLink);
  return safeShopeeUrl(result?.shortLink);
}

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseMarketplaceUrl } from "../lib/importacoes/marketplace-url.ts";
import { normalizarCapturaManual } from "../lib/importacoes/captura-manual.ts";
import { assinarRequisicaoShopee } from "../lib/integracoes/shopee-signature.ts";
import {
  normalizeShopeeProductResponse,
  normalizeShopeeShortLinkResponse,
} from "../lib/integracoes/shopee-response.ts";

const fixture = async (name) => JSON.parse(
  await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8"),
);

test("parses marketplace IDs without making network requests", () => {
  assert.deepEqual(
    parseMarketplaceUrl("https://shopee.com.br/produto-i.283238461.23398539116"),
    {
      marketplaceId: "shopee",
      canonicalUrl: "https://shopee.com.br/produto-i.283238461.23398539116",
      externalId: "23398539116",
      itemId: "23398539116",
      shopId: "283238461",
      isShortLink: false,
    },
  );
  assert.equal(
    parseMarketplaceUrl("https://www.amazon.com.br/dp/B012345678")?.externalId,
    "B012345678",
  );
  assert.equal(
    parseMarketplaceUrl("https://produto.mercadolivre.com.br/MLB-1234567890-exemplo")?.externalId,
    "MLB1234567890",
  );
  assert.equal(
    parseMarketplaceUrl("https://www.magazineluiza.com.br/produto/p/abcde12345")?.externalId,
    "abcde12345",
  );
  assert.equal(
    parseMarketplaceUrl("http://shopee.com.br/product/1/2"),
    null,
  );
  assert.equal(
    parseMarketplaceUrl("https://shopee.com.br.evil.example/product/1/2"),
    null,
  );
  assert.equal(
    parseMarketplaceUrl("https://s.shopee.com.br/2LYtbqzptB")?.isShortLink,
    true,
  );
  assert.equal(
    parseMarketplaceUrl("https://shopee.com.br/product/283238461/23398539116?shopId=1&itemId=2")?.shopId,
    "1",
  );
  assert.equal(
    parseMarketplaceUrl("https://shopee.com.br:444/product/1/2"),
    null,
  );
});

test("normalizes Shopee ProductOfferV2 and short-link fixtures", async () => {
  const offer = await fixture("shopee-product-offer.json");
  const link = await fixture("shopee-generate-short-link.json");
  const normalized = normalizeShopeeProductResponse(offer);

  assert.equal(normalized?.itemId, "23398539116");
  assert.equal(normalized?.shopId, "283238461");
  assert.equal(normalized?.title, "Produto de teste Shopee");
  assert.equal(normalized?.price, 19.9);
  assert.equal(normalized?.rating, 4.8);
  assert.equal(normalized?.affiliateUrl, "https://s.shopee.com.br/affiliate-test");
  assert.equal(normalizeShopeeShortLinkResponse(link), "https://s.shopee.com.br/affiliate-test");
  assert.equal(
    normalizeShopeeProductResponse({
      data: { productOfferV2: { nodes: [{ ...offer.data.productOfferV2.nodes[0], itemId: "bad" }] } },
    }),
    null,
  );
});

test("signs the exact serialized body and timestamp", async () => {
  const data = await fixture("shopee-signature.json");
  assert.equal(
    assinarRequisicaoShopee(data.appId, data.timestamp, data.body, data.secret),
    "443a359fd894c8d5f3efa920e3f4aa773df3a0796a92b33deb0e2475b2607144",
  );
});

test("validates browser-assisted capture before it can enter review", () => {
  const result = normalizarCapturaManual({
    title: "Título confirmado no anúncio",
    price: "39,90",
    image: "https://images.example.test/product.jpg",
    url: "https://shopee.com.br/product/283238461/23398539116",
  }, "assistida");

  assert.equal(result?.previa.marketplace_id, "shopee");
  assert.equal(result?.previa.id_externo, "23398539116");
  assert.equal(result?.previa.preco_atual, 39.9);
  assert.equal(normalizarCapturaManual({
    title: "Não aceitar HTTP",
    url: "http://shopee.com.br/product/1/2",
  }, "manual"), null);
});

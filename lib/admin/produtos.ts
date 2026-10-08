export const STATUS_PRODUTO = [
  { valor: "encontrado", nome: "Encontrado" },
  { valor: "analisando", nome: "Em análise" },
  { valor: "publicado", nome: "Publicado" },
  { valor: "pausado", nome: "Pausado" },
  { valor: "encerrado", nome: "Encerrado" },
] as const;

export type StatusProduto = (typeof STATUS_PRODUTO)[number]["valor"];

export const MARKETPLACES = [
  "Shopee",
  "Amazon",
  "Mercado Livre",
  "AliExpress",
  "Magalu",
] as const;

const MARKETPLACE_IDS: Record<(typeof MARKETPLACES)[number], string> = {
  Shopee: "shopee",
  Amazon: "amazon",
  "Mercado Livre": "mercadolivre",
  AliExpress: "aliexpress",
  Magalu: "magalu",
};

export function isMarketplace(valor: string): valor is (typeof MARKETPLACES)[number] {
  return MARKETPLACES.some((marketplace) => marketplace === valor);
}

export function marketplaceIdDoValor(valor: string) {
  if (isMarketplace(valor)) return MARKETPLACE_IDS[valor];
  return Object.values(MARKETPLACE_IDS).includes(valor) ? valor : null;
}

export function isStatusProduto(valor: string): valor is StatusProduto {
  return STATUS_PRODUTO.some((status) => status.valor === valor);
}

export function marketplaceDoLink(link: string) {
  try {
    const host = new URL(link).hostname.toLowerCase();
    const dominiosPorMarketplace: [string, (typeof MARKETPLACES)[number]][] = [
      ["shopee.com.br", "Shopee"],
      ["amazon.com.br", "Amazon"],
      ["amzn.to", "Amazon"],
      ["mercadolivre.com.br", "Mercado Livre"],
      ["meli.la", "Mercado Livre"],
      ["aliexpress.com", "AliExpress"],
      ["magazineluiza.com.br", "Magalu"],
      ["magalu.com.br", "Magalu"],
    ];

    return dominiosPorMarketplace.find(([dominio]) =>
      host === dominio || host.endsWith(`.${dominio}`),
    )?.[1] ?? null;
  } catch {
    return null;
  }
}

export function marketplaceIdDoLink(link: string) {
  const nome = marketplaceDoLink(link);
  return nome ? MARKETPLACE_IDS[nome] : null;
}

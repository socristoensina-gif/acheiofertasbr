export type EntradaSeo = {
  nome: string;
  categoria?: string | null;
  marketplace?: string | null;
  preco?: number | null;
  beneficios?: string[];
};

export type SaidaSeo = {
  titulo: string;
  descricao: string;
  palavrasChave: string[];
  hashtags: string[];
};

export const MARCA = "Ache Ofertas BR";
const BASE = "https://acheiofertasbr.online";

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "para", "com", "sem", "por", "um", "uma",
  "no", "na", "nos", "nas", "ao", "ou", "pcs", "und", "novo", "nova",
]);

const TAGS_CATEGORIA: Array<[string, string[]]> = [
  ["moda", ["#moda", "#look", "#modafeminina", "#modamasculina"]],
  ["eletronicos", ["#tecnologia", "#celular", "#gadgets", "#eletronicos"]],
  ["beleza", ["#beleza", "#skincare", "#autocuidado", "#maquiagem"]],
  ["eletrodomesticos", ["#eletrodomesticos", "#cozinha", "#casa", "#utilidades"]],
  ["esportes", ["#fitness", "#treino", "#esporte", "#vidasaudavel"]],
  ["casa", ["#casa", "#decoracao", "#organizacao", "#utilidades"]],
  ["maquinas", ["#ferramentas", "#maquinas", "#diy", "#manutencao"]],
];

const GANCHOS = ["Achado do dia:", "Olha o que encontramos:", "Separamos para você:", "Oferta que vale conferir:"];

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cortar(texto: string, max: number, reticencias = false) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= max) return limpo;
  const corte = limpo.slice(0, max - (reticencias ? 1 : 0));
  const espaco = corte.lastIndexOf(" ");
  const base = (espaco > max * 0.6 ? corte.slice(0, espaco) : corte).replace(/[\s,;:.\-–—]+$/, "");
  return reticencias ? `${base}…` : base;
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function palavrasDoTexto(texto: string) {
  const vistas = new Set<string>();
  for (const bruta of semAcento(texto).toLowerCase().split(/[^a-z0-9]+/)) {
    if (bruta.length < 3 || /^\d+$/.test(bruta) || STOPWORDS.has(bruta)) continue;
    vistas.add(bruta);
  }
  return [...vistas];
}

function tagDe(texto: string) {
  const t = semAcento(texto).toLowerCase().replace(/[^a-z0-9]/g, "");
  return t.length >= 3 && t.length <= 30 ? `#${t}` : null;
}

function precoValido(preco: number | null | undefined): preco is number {
  return typeof preco === "number" && Number.isFinite(preco);
}

export function gerarSeoProduto(entrada: EntradaSeo): SaidaSeo {
  const nome = entrada.nome.replace(/\s+/g, " ").trim();
  const loja = entrada.marketplace?.trim() ?? "";
  const sufixo = loja ? ` na ${loja} | ${MARCA}` : ` | ${MARCA}`;
  const titulo = `${cortar(nome, Math.max(20, 60 - sufixo.length))}${sufixo}`;

  const beneficio = entrada.beneficios?.map((b) => b.trim()).find((b) => b.length > 0);
  const partes = [
    `Veja ${nome}${precoValido(entrada.preco) ? ` por ${brl(entrada.preco)}` : ""}${loja ? ` na ${loja}` : ""}.`,
    beneficio ? `${cortar(beneficio, 70).replace(/[.!\s]+$/, "")}.` : "",
    `Confira os detalhes no ${MARCA}.`,
  ].filter(Boolean);
  const descricao = cortar(partes.join(" "), 155, true);

  const palavras = palavrasDoTexto(nome);
  const categoriaNorm = semAcento(entrada.categoria ?? "").toLowerCase();
  const tagsCategoria = TAGS_CATEGORIA.find(([chave]) => categoriaNorm.includes(chave))?.[1] ?? [];

  const tags: string[] = [];
  const add = (t: string | null) => {
    if (t && !tags.includes(t)) tags.push(t);
  };
  if (loja) add(tagDe(loja));
  for (const t of tagsCategoria) add(t);
  for (const p of palavras.filter((w) => w.length >= 4).slice(0, 4)) add(tagDe(p));
  add("#achadinhos");
  add("#ofertas");

  const palavrasChave = [
    ...new Set([
      ...palavras,
      ...palavrasDoTexto(entrada.categoria ?? "").filter((p) => p.length >= 4),
      ...(loja ? [semAcento(loja).toLowerCase()] : []),
      "oferta",
      "preco",
    ]),
  ].slice(0, 12);

  return { titulo, descricao, palavrasChave, hashtags: tags.slice(0, 12) };
}

function indiceEstavel(texto: string, tamanho: number) {
  let h = 0;
  for (const c of texto) h = (h * 31 + (c.codePointAt(0) ?? 0)) >>> 0;
  return h % tamanho;
}

export function gerarPacoteSocial(entrada: EntradaSeo & { slug: string }, canal = "instagram") {
  const seo = gerarSeoProduto(entrada);
  const url = `${BASE}/produto/${entrada.slug}?src=${encodeURIComponent(canal)}`;
  const gancho = GANCHOS[indiceEstavel(entrada.slug, GANCHOS.length)];
  const preco = precoValido(entrada.preco) ? ` por ${brl(entrada.preco)}` : "";
  const loja = entrada.marketplace ? ` na ${entrada.marketplace}` : "";
  const legenda = [
    "#publi Link de afiliado: podemos receber comissão, sem custo extra para você. Preço e estoque podem mudar.",
    "",
    `${gancho} ${entrada.nome}${preco}${loja}.`,
    `Veja os detalhes: ${url}`,
    "",
    seo.hashtags.join(" "),
  ].join("\n");
  return { legenda, url, hashtags: seo.hashtags };
}
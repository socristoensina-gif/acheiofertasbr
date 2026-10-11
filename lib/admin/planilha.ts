export const LIMITE_LINHAS = 50;

export const COLUNAS_MODELO =
  "categoria, nome, link, preco, preco_antigo, avaliacao, vendas, beneficios, descricao, destaque, publicar, imagem1, imagem2, imagem3, imagem4, imagem5, video1, video2";

export type LinhaPlanilha = { linha: number; campos: Record<string, string> };

export function chave(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const SINONIMOS: Record<string, string> = {
  categoria: "categoria", nome: "nome", titulo: "nome",
  link: "link", linkafiliado: "link", url: "link",
  preco: "preco", precoatual: "preco",
  precoantigo: "preco_antigo", precoanterior: "preco_antigo",
  avaliacao: "avaliacao", nota: "avaliacao",
  vendas: "vendas", beneficios: "beneficios", descricao: "descricao",
  destaque: "destaque", publicar: "publicar",
  imagem1: "imagem1", imagem2: "imagem2", imagem3: "imagem3", imagem4: "imagem4", imagem5: "imagem5",
  video1: "video1", video2: "video2",
};

function separador(primeira: string) {
  const conta = (c: string) => primeira.split(c).length - 1;
  const tab = conta("\t");
  const pontoVirgula = conta(";");
  const virgula = conta(",");
  if (tab > 0 && tab >= pontoVirgula && tab >= virgula) return "\t";
  return pontoVirgula > virgula ? ";" : ",";
}

function lerTabela(texto: string): string[][] {
  const limpo = texto.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const sep = separador(limpo.split("\n", 1)[0] ?? "");
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo.charAt(i);
    if (aspas) {
      if (c === '"') {
        if (limpo.charAt(i + 1) === '"') { campo += '"'; i++; } else aspas = false;
      } else campo += c;
    } else if (c === '"' && campo === "") aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else campo += c;
  }
  if (campo !== "" || linha.length > 0) { linha.push(campo); linhas.push(linha); }
  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

export function lerPlanilha(texto: string): { linhas: LinhaPlanilha[]; erro?: string } {
  const tabela = lerTabela(texto);
  if (tabela.length < 2) return { linhas: [], erro: "Inclua a linha de títulos e pelo menos uma linha de produto." };
  const colunas = tabela[0].map((titulo) => {
    const k = chave(titulo);
    return Object.hasOwn(SINONIMOS, k) ? SINONIMOS[k] : "";
  });
  const faltando = ["categoria", "nome", "link", "preco"].filter((c) => !colunas.includes(c));
  if (faltando.length > 0) return { linhas: [], erro: `Faltam as colunas: ${faltando.join(", ")}.` };
  const linhas = tabela.slice(1).map((celulas, i) => {
    const campos: Record<string, string> = {};
    colunas.forEach((nome, posicao) => {
      if (nome) campos[nome] = (celulas[posicao] ?? "").trim();
    });
    return { linha: i + 2, campos };
  });
  return { linhas };
}

export function precoBr(valor: string): number | null {
  const bruto = valor.replace(/\s|R\$/gi, "");
  if (!bruto) return null;
  const normalizado = bruto.includes(",")
    ? bruto.replace(/\./g, "").replace(",", ".")
    : /^\d+\.\d{1,2}$/.test(bruto) ? bruto : bruto.replace(/\./g, "");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : Number.NaN;
}

export function simNao(valor: string, padrao: boolean) {
  const k = chave(valor);
  if (["sim", "s", "1", "true", "x", "yes"].includes(k)) return true;
  if (["nao", "n", "0", "false", "no"].includes(k)) return false;
  return padrao;
}

export function slugDe(nome: string) {
  return nome
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/g, "");
}

export function urlHttps(valor: string): string | null {
  if (!valor || valor.length > 2048) return null;
  try {
    const url = new URL(valor);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}
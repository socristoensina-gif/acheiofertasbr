import { ImageResponse } from "next/og";
import { supabase } from "@/utils/supabase";

export const alt = "Oferta no Ache Ofertas BR";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const brl = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function cortar(texto: string, maximo: number) {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1).trimEnd()}…` : texto;
}

function Marca() {
  return (
    <div style={{ display: "flex", fontSize: 42, fontWeight: 700, letterSpacing: 1 }}>
      <span style={{ color: "#ffffff" }}>ACHE</span>
      <span style={{ color: "#facc15", marginLeft: 12 }}>OFERTAS BR</span>
    </div>
  );
}

const fundo = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  padding: 56,
  color: "#ffffff",
  background: "linear-gradient(135deg, #0b1220 0%, #16213a 100%)",
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: produto } = await supabase
    .from("produtos")
    .select("id, nome, preco_atual, preco_antigo, marketplace")
    .eq("slug", slug)
    .eq("status", "publicado")
    .maybeSingle();

  // Sem produto: cartão genérico da marca (a página em si responde 404).
  if (!produto) {
    return new ImageResponse(
      (
        <div style={fundo}>
          <Marca />
          <div style={{ display: "flex", fontSize: 60, lineHeight: 1.15 }}>
            Ofertas selecionadas dos principais marketplaces
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#cbd5e1" }}>acheiofertasbr.online</div>
        </div>
      ),
      size,
    );
  }

  const { data: oferta } = await supabase
    .from("produto_ofertas")
    .select("preco_atual, preco_anterior, marketplaces(nome)")
    .eq("produto_id", produto.id)
    .eq("ativo", true)
    .order("principal", { ascending: false })
    .order("preco_atual")
    .limit(1)
    .maybeSingle();

  const loja =
    (oferta?.marketplaces as unknown as { nome?: string | null } | null)?.nome ??
    produto.marketplace ??
    null;
  const precoBruto = oferta?.preco_atual ?? produto.preco_atual;
  const antigoBruto = oferta?.preco_anterior ?? produto.preco_antigo;
  const preco = precoBruto === null || precoBruto === undefined ? Number.NaN : Number(precoBruto);
  const antigo = antigoBruto === null || antigoBruto === undefined ? Number.NaN : Number(antigoBruto);
  const temPreco = Number.isFinite(preco);
  const desconto =
    temPreco && Number.isFinite(antigo) && antigo > preco ? Math.round((1 - preco / antigo) * 100) : null;

  const nome = cortar(produto.nome, 120);
  const tamanhoNome = nome.length <= 60 ? 66 : nome.length <= 100 ? 56 : 48;

  return new ImageResponse(
    (
      <div style={fundo}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Marca />
          {loja && (
            <div
              style={{
                display: "flex",
                fontSize: 30,
                color: "#0b1220",
                background: "#facc15",
                padding: "8px 24px",
                borderRadius: 999,
              }}
            >
              {`na ${loja}`}
            </div>
          )}
        </div>

        <div style={{ display: "flex", fontSize: tamanhoNome, lineHeight: 1.15, maxWidth: 1088 }}>{nome}</div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {desconto !== null && (
              <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 34, color: "#94a3b8", textDecoration: "line-through" }}>{brl(antigo)}</span>
                <span
                  style={{
                    fontSize: 30,
                    color: "#ffffff",
                    background: "#16a34a",
                    padding: "4px 16px",
                    borderRadius: 8,
                    marginLeft: 20,
                  }}
                >
                  {`${desconto}% OFF`}
                </span>
              </div>
            )}
            {temPreco && <div style={{ display: "flex", fontSize: 104, color: "#fb923c" }}>{brl(preco)}</div>}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#cbd5e1" }}>acheiofertasbr.online</div>
        </div>
      </div>
    ),
    size,
  );
}

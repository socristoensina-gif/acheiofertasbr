import { notFound } from "next/navigation";
import { supabase } from "@/utils/supabase";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function ProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { slug } = await params;
  const { src } = await searchParams;

  const { data: p } = await supabase
    .from("produtos")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!p) notFound();

  const precoAtual = p.preco_atual ?? 0;
  const precoAntigo = p.preco_antigo ?? 0;
  const desconto =
    precoAntigo > precoAtual
      ? Math.round((1 - precoAtual / precoAntigo) * 100)
      : null;
  const loja: string = p.marketplace ?? "a loja";
  const beneficios = Array.isArray(p.beneficios)
    ? p.beneficios.filter((beneficio): beneficio is string => typeof beneficio === "string")
    : [];
  const destino = `/go/${p.slug}?src=${encodeURIComponent(src ?? "site")}`;

  return (
    <main className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
          {p.imagem && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imagem} alt={p.nome} className="h-full w-full object-cover" />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold md:text-3xl">{p.nome}</h1>

          <div className="flex flex-wrap items-baseline gap-3">
            {desconto && (
              <span className="text-gray-500 line-through">{brl(precoAntigo)}</span>
            )}
            {desconto && (
              <span className="rounded bg-green-600 px-2 py-0.5 text-sm font-bold text-white">
                {desconto}% OFF
              </span>
            )}
          </div>
          {p.preco_atual !== null && (
            <p className="text-4xl font-extrabold text-orange-600">{brl(precoAtual)}</p>
          )}

          {beneficios.length > 0 && (
            <ul className="list-disc pl-5 text-gray-700">
              {beneficios.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}

          <a
            href={destino}
            rel="nofollow sponsored"
            className="rounded-full bg-orange-600 px-6 py-4 text-center text-lg font-bold text-white hover:bg-orange-700"
          >
            VER OFERTA NA {loja.toUpperCase()}
          </a>

          <p className="text-xs text-gray-500">
            Link de afiliado: podemos receber comissão, sem custo extra para você. Preço e
            estoque podem mudar na loja.
          </p>
        </div>
      </div>
    </main>
  );
}
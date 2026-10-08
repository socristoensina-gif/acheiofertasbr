import { connection } from "next/server";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/video-player";
import { incluirMelhoresOfertas } from "@/lib/ofertas-publicas";
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

  await connection();
  const { data: produto, error } = await supabase
    .from("produtos")
    .select("id, slug, nome, imagem, video, descricao, beneficios, preco_atual, preco_antigo, marketplace")
    .eq("slug", slug)
    .eq("status", "publicado")
    .maybeSingle();
  if (error) throw error;
  if (!produto) notFound();
  const [p] = await incluirMelhoresOfertas([produto]);

  const precoAtual = p.preco_atual === null ? null : Number(p.preco_atual);
  const precoAntigo = p.preco_antigo ?? 0;
  const desconto =
    precoAtual !== null && precoAntigo > Number(precoAtual)
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
        <div className="grid content-start gap-4">
          <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
            {p.imagem && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imagem} alt={p.nome} className="h-full w-full object-cover" />
            )}
          </div>
          {p.video && (
            <section className="grid gap-2">
              <h2 className="text-lg font-bold">Vídeo do produto</h2>
              <VideoPlayer src={p.video} title={`Vídeo: ${p.nome}`} />
            </section>
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
          {precoAtual !== null && Number.isFinite(precoAtual) && (
            <p className="text-4xl font-extrabold text-orange-600">{brl(precoAtual)}</p>
          )}
          {p.oferta_indisponivel && (
            <p className="font-semibold text-stone-600">Oferta indisponível no momento.</p>
          )}

          {beneficios.length > 0 && (
            <ul className="list-disc pl-5 text-gray-700">
              {beneficios.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}

          {p.oferta_indisponivel ? (
            <span className="rounded-full bg-stone-300 px-6 py-4 text-center text-lg font-bold text-stone-700">
              OFERTA INDISPONÍVEL
            </span>
          ) : (
            <a
              href={destino}
              rel="nofollow sponsored"
              className="rounded-full bg-orange-600 px-6 py-4 text-center text-lg font-bold text-white hover:bg-orange-700"
            >
              VER OFERTA NA {loja.toUpperCase()}
            </a>
          )}

          <p className="text-xs text-gray-500">
            Link de afiliado: podemos receber comissão, sem custo extra para você. Preço e
            estoque podem mudar na loja.
          </p>
        </div>
      </div>
    </main>
  );
}
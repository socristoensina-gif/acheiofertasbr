type Oferta = {
  id: string;
  marketplace: string | null;
  preco_atual: number | string | null;
  preco_anterior: number | string | null;
  link_afiliado: string | null;
};

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function OfertaComparador({ ofertas }: { ofertas: Oferta[] }) {
  if (!ofertas.length) return null;
  const ordenadas = [...ofertas].sort((a,b)=>Number(a.preco_atual ?? Infinity)-Number(b.preco_atual ?? Infinity));
  return (
    <section className="mt-6 grid gap-3">
      <h2 className="text-xl font-bold">Compare as ofertas</h2>
      {ordenadas.map((oferta,index)=>(
        <div key={oferta.id} className="rounded-xl border border-stone-200 p-4">
          <div className="flex justify-between gap-3">
            <div>
              {index===0 && <span className="text-sm font-bold text-orange-700">Melhor oferta</span>}
              <p className="font-semibold">{oferta.marketplace ?? "Marketplace"}</p>
              <p className="text-xl font-extrabold">{oferta.preco_atual ? moeda(Number(oferta.preco_atual)) : "Consultar preço"}</p>
            </div>
            {oferta.link_afiliado && <a href={oferta.link_afiliado} target="_blank" rel="noopener noreferrer" className="self-center rounded-lg bg-orange-600 px-4 py-2 text-white">Ver oferta</a>}
          </div>
        </div>
      ))}
    </section>
  );
}

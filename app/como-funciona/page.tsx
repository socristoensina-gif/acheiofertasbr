import { InstitutionalPage } from "@/components/institutional-page";

export default function ComoFuncionaPage() {
  return (
    <InstitutionalPage title="Como funciona">
      <ol>
        <li>Você chega ao portal por uma busca, publicação ou indicação em nossos canais.</li>
        <li>Pesquisa e compara os produtos apresentados no Ache Ofertas BR.</li>
        <li>Ao selecionar uma oferta, segue para o marketplace ou site do vendedor para consultar as condições atualizadas e, se desejar, concluir a compra.</li>
      </ol>
      <p>Priorizamos ofertas que ajudam a sustentar o portal por meio de comissões e publicidade identificada. Também queremos apresentar opções úteis mesmo quando não geram comissão, para que você encontre o que procura.</p>
      <p>O Ache Ofertas BR não vende produtos nem processa pagamentos. Preços, disponibilidade, entrega, trocas e devoluções são tratados pelo marketplace ou vendedor.</p>
    </InstitutionalPage>
  );
}
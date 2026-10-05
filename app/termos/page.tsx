import { InstitutionalPage } from "@/components/institutional-page";

export default function TermosPage() {
  return (
    <InstitutionalPage title="Termos de uso" draft>
      <p>Este texto é um rascunho para revisão jurídica e operacional. Os termos definitivos serão publicados após revisão.</p>
      <h2>O que o portal oferece</h2>
      <p>O Ache Ofertas BR organiza informações e links para produtos disponíveis em marketplaces e sites de vendedores. Não somos parte da venda e não garantimos preço, estoque ou condições exibidas por terceiros.</p>
      <h2>Compras e atendimento</h2>
      <p>Compras, pagamentos, entrega, garantia, trocas e devoluções são realizados e atendidos pelo marketplace ou vendedor responsável.</p>
      <h2>Links de afiliados</h2>
      <p>Alguns links podem gerar comissão ao portal, sem custo adicional ao consumidor. A existência de comissão não altera as condições definidas pelo vendedor.</p>
    </InstitutionalPage>
  );
}
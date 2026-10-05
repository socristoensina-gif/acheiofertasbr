import { InstitutionalPage } from "@/components/institutional-page";

export default function PrivacidadePage() {
  return (
    <InstitutionalPage title="Política de privacidade" draft>
      <p>Este texto é um rascunho para revisão jurídica e operacional. Ele não substitui a política definitiva do portal.</p>
      <h2>Dados de navegação</h2>
      <p>Ao acessar um link de saída, podemos registrar o produto, o marketplace, a origem do acesso e informações técnicas da requisição para medir o funcionamento das ofertas.</p>
      <h2>Favoritos</h2>
      <p>Os produtos favoritos são guardados no armazenamento local do navegador e não são enviados ao servidor para criar uma conta.</p>
      <h2>Links externos</h2>
      <p>Ao seguir para um marketplace ou site de vendedor, o tratamento de dados passa a seguir as políticas daquele serviço.</p>
    </InstitutionalPage>
  );
}
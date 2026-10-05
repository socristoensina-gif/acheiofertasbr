import { InstitutionalPage } from "@/components/institutional-page";
import { ContactForm } from "@/components/contact-form";

export default function ContatoPage() {
  return (
    <InstitutionalPage title="Contato">
      <p>Envie sua mensagem para nossa equipe. Sobre pagamento, entrega, troca ou devolução, fale diretamente com o marketplace ou vendedor da compra.</p>
      <ContactForm />
    </InstitutionalPage>
  );
}
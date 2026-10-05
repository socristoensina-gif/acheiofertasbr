import Link from "next/link";
import { InstitutionalPage } from "@/components/institutional-page";
import { SITE_CONFIG } from "@/lib/config";

export default function ContatoPage() {
  return (
    <InstitutionalPage title="Contato">
      <p>Para falar sobre conteúdo, parcerias ou funcionamento do portal, entre em contato por um de nossos canais sociais:</p>
      <ul>
        {SITE_CONFIG.socialLinks.map((social) => (
          <li key={social.name}><Link href={social.href} target="_blank" rel="noopener noreferrer">{social.name}</Link></li>
        ))}
      </ul>
      <p>Para dúvidas sobre pagamento, entrega, trocas ou devoluções de uma compra, procure o marketplace ou vendedor responsável pelo pedido.</p>
    </InstitutionalPage>
  );
}
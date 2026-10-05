import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";

const links = [
  ["Sobre", "/sobre"],
  ["Como funciona", "/como-funciona"],
  ["Newsletter", "/newsletter"],
  ["Perguntas frequentes", "/faq"],
  ["Contato", "/contato"],
  ["Privacidade", "/privacidade"],
  ["Termos de uso", "/termos"],
  ["Trocas e devoluções", "/trocas"],
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer mt-auto">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:grid-cols-[1fr_2fr] sm:px-6 lg:px-8">
        <div>
          <Link href="/" className="footer-brand">ACHE <span>OFERTAS BR</span></Link>
          <p className="mt-3 max-w-sm text-xs leading-5 text-slate-300">
            Um hub de pesquisa e descoberta. O Ache Ofertas BR não vende produtos: a compra é feita diretamente no marketplace.
          </p>
          <p className="mt-3 max-w-sm text-xs leading-5 text-slate-300">
            Alguns links são de afiliados. Podemos receber comissão, sem custo adicional para você.
          </p>
        </div>
        <div className="footer-navigation">
          <nav aria-label="Informações institucionais" className="footer-links">
            {links.map(([nome, href]) => <Link href={href} key={href}>{nome}</Link>)}
          </nav>
          <section className="footer-social" aria-labelledby="footer-social-title">
            <h2 id="footer-social-title">Siga nossas redes</h2>
            <div className="footer-social-links">
              {SITE_CONFIG.socialLinks.map((social) => social.href ? (
                <a href={social.href} key={social.name} target="_blank" rel="noopener noreferrer">{social.name}</a>
              ) : (
                <span key={social.name} title="Link do perfil a configurar">{social.name}</span>
              ))}
            </div>
          </section>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} Ache Ofertas BR</div>
    </footer>
  );
}
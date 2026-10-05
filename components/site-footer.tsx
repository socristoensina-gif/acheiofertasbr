import Link from "next/link";

const links = [
  ["Sobre", "/sobre"],
  ["Como funciona", "/como-funciona"],
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
        <nav aria-label="Informações institucionais" className="footer-links">
          {links.map(([nome, href]) => <Link href={href} key={href}>{nome}</Link>)}
        </nav>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} Ache Ofertas BR</div>
    </footer>
  );
}
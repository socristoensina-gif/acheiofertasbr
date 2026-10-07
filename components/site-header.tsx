"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AtSign, Camera, ChevronDown, Heart, Menu, Music2, Search, ThumbsUp } from "lucide-react";
import { CATEGORIAS } from "@/lib/categorias";
import { SITE_CONFIG, WHATSAPP_CHANNEL_URL } from "@/lib/config";

const iconesSocial = { Instagram: Camera, TikTok: Music2, Facebook: ThumbsUp, X: AtSign };
export function SiteHeader() {
  const pathname = usePathname();
  const [categoriasAbertasEm, setCategoriasAbertasEm] = useState<string | null>(null);
  const categoriasAbertas = categoriasAbertasEm === pathname;
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const fecharAoClicarFora = (event: MouseEvent) => {
      if (event.target instanceof Node && !dropdownRef.current?.contains(event.target)) {
        setCategoriasAbertasEm(null);
      }
    };

    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("click", fecharAoClicarFora);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("click", fecharAoClicarFora);
    };
  }, []);

  return (
    <header className="site-header">
      <div className="header-topline">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <span>{SITE_CONFIG.topMessage}</span>
          <nav className="social-links" aria-label="Redes sociais">
            {SITE_CONFIG.socialLinks.map((social) => {
              const Icon = iconesSocial[social.platform as keyof typeof iconesSocial];
              return (
                social.href ? (
                  <a href={social.href} key={social.name} aria-label={social.name} target="_blank" rel="noopener noreferrer" title={social.name}>
                    <Icon size={15} />
                  </a>
                ) : (
                  <span className="social-link-pending" key={social.name} aria-label={`${social.name}: link a configurar`} title={`${social.name}: link a configurar`}>
                    <Icon size={15} />
                  </span>
                )
              );
            })}
          </nav>
        </div>
      </div>
      <div className="header-main mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:gap-7 lg:px-8">
        <Link href="/" className="brand-mark shrink-0" aria-label="Ache Ofertas BR, página inicial">
          <span className="brand-wordmark">
            <span>ACHE</span>
            <span>OFERTAS <b>BR</b></span>
          </span>
        </Link>
        <form action="/busca" method="get" className="site-search order-3 flex h-11 w-full overflow-hidden rounded-md sm:order-none sm:w-auto sm:flex-1">
          <label className="sr-only" htmlFor="busca-site">Buscar produtos</label>
          <input
            id="busca-site"
            name="q"
            type="search"
            placeholder="O que você está procurando?"
            className="min-w-0 flex-1 bg-white px-4 text-sm text-stone-900 outline-none placeholder:text-stone-500"
          />
          <button className="flex w-12 items-center justify-center bg-yellow-400 text-slate-950 transition-colors hover:bg-yellow-300" type="submit" aria-label="Buscar" title="Buscar">
            <Search size={19} />
          </button>
        </form>
        <details className="category-menu" ref={dropdownRef} open={categoriasAbertas}>
          <summary
            aria-label="Abrir categorias"
            onClick={(event) => {
              event.preventDefault();
              setCategoriasAbertasEm(categoriasAbertas ? null : pathname);
            }}
          >
            <Menu size={20} /><span>Categorias</span><ChevronDown size={13} />
          </summary>
          <div className="category-menu-popover">
            {CATEGORIAS.map((categoria) => (
              <Link key={categoria.slug} href={`/${categoria.slug}`} onClick={() => setCategoriasAbertasEm(null)}>
                <span aria-hidden="true">{categoria.icone}</span>{categoria.nome}
              </Link>
            ))}
          </div>
        </details>
        <Link href="/favoritos" className="header-favorites"><Heart size={19} /><span>Favoritos</span></Link>
        {WHATSAPP_CHANNEL_URL ? (
          <a className="vip-button" href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
            <span className="vip-mark" aria-hidden="true">◉</span><span><b>CANAL VIP</b><small>Ofertas exclusivas</small></span>
          </a>
        ) : (
          <span className="vip-button is-disabled" title="Canal VIP não configurado" aria-disabled="true">
            <span className="vip-mark" aria-hidden="true">◉</span><span><b>CANAL VIP</b><small>Ofertas exclusivas</small></span>
          </span>
        )}
      </div>
    </header>
  );
}
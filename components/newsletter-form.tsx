"use client";

import Link from "next/link";
import { useActionState } from "react";
import { inscreverNewsletter } from "@/app/comunicacao/actions";
import { CATEGORIAS } from "@/lib/categorias";

export function NewsletterForm({ nomeInicial, emailInicial }: { nomeInicial: string; emailInicial: string }) {
  const [estado, action, pendente] = useActionState(inscreverNewsletter, {});

  return (
    <form action={action} className="communication-form">
      <label className="admin-field">
        Nome
        <input name="nome" autoComplete="name" defaultValue={nomeInicial} maxLength={120} required />
      </label>
      <label className="admin-field">
        E-mail
        <input name="email" type="email" autoComplete="email" defaultValue={emailInicial} maxLength={254} required />
      </label>
      <fieldset className="choice-fieldset">
        <legend>Quais ofertas você quer receber?</legend>
        <div className="category-choices">
          {CATEGORIAS.map((categoria) => (
            <label className="category-choice" key={categoria.slug}>
              <input type="checkbox" name="categorias" value={categoria.slug} />
              <span>{categoria.nome}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="choice-fieldset">
        <legend>Com que frequência?</legend>
        <div className="frequency-choices">
          {[
            ["diaria", "Diária"],
            ["semanal", "Semanal"],
            ["quinzenal", "Quinzenal"],
            ["mensal", "Mensal"],
          ].map(([valor, texto]) => (
            <label className="frequency-choice" key={valor}>
              <input type="radio" name="periodicidade" value={valor} required />
              <span>{texto}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="terms-consent">
        <input type="checkbox" name="aceite_termos" required />
        <span>Concordo com a <Link href="/privacidade">Política de Privacidade</Link> e os <Link href="/termos">Termos de Uso</Link>.</span>
      </label>
      <label className="honeypot" aria-hidden="true">
        Site
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {estado.erro && <p role="alert" className="form-error">{estado.erro}</p>}
      {estado.sucesso && <p role="status" className="form-success">Inscrição recebida. Você receberá as ofertas escolhidas.</p>}
      <button type="submit" className="form-submit" disabled={pendente}>
        {pendente ? "Enviando..." : "Quero receber ofertas"}
      </button>
    </form>
  );
}
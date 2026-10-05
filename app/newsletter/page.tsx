import { InstitutionalPage } from "@/components/institutional-page";
import { NewsletterForm } from "@/components/newsletter-form";
import { entrarComFacebook, entrarComGoogle } from "@/app/comunicacao/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const [{ erro }, supabase] = await Promise.all([searchParams, createSupabaseServerClient()]);
  const { data: { user } } = await supabase.auth.getUser();
  const nome = String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "");

  return (
    <InstitutionalPage title="Receba ofertas por e-mail">
      <p>Escolha os assuntos e a frequência com que deseja receber ofertas.</p>
      {erro === "oauth" && <p role="alert" className="form-error">Não foi possível entrar com essa rede social. Verifique a configuração e tente novamente.</p>}
      {!user && (
        <div className="oauth-options">
          <form action={entrarComGoogle}>
            <button type="submit" className="oauth-button">Continuar com Google</button>
          </form>
          <form action={entrarComFacebook}>
            <button type="submit" className="oauth-button">Continuar com Facebook</button>
          </form>
        </div>
      )}
      <NewsletterForm nomeInicial={nome} emailInicial={user?.email ?? ""} />
    </InstitutionalPage>
  );
}
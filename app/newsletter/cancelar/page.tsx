import { NewsletterCancelForm } from "@/components/newsletter-cancel-form";

export default async function CancelarNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const parametros = await searchParams;
  const token = typeof parametros.token === "string" ? parametros.token : "";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 mt-1 text-3xl font-bold">Cancelar inscrição</h1>
      <p>Confirme para cancelar o recebimento de ofertas por e-mail.</p>
      <NewsletterCancelForm token={token} />
    </main>
  );
}
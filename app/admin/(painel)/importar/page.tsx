import Link from "next/link";
import { AdminImportacaoAssistida } from "@/components/admin-importacao-assistida";
import { AdminShopeeLinkConverter } from "@/components/admin-shopee-link-converter";
import {
  aprovarImportacaoOferta,
  completarPreviaImportacaoManual,
  importarOfertaLink,
} from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import { validarPreviaImportacao } from "@/lib/importacoes/ofertas-link";
import { SLUGS_CATEGORIAS } from "@/lib/categorias";
import { supabaseAdmin } from "@/utils/supabase";
import { shopeeApiConfigurada } from "@/lib/integracoes/shopee";

export const maxDuration = 15;

const MENSAGENS_ERRO: Record<string, string> = {
  url: "Informe um link HTTPS válido de um marketplace suportado.",
  marketplace: "Não foi possível identificar um marketplace suportado pelo link.",
  metadados: "A página não forneceu dados suficientes para criar uma prévia.",
  captura: "Não foi possível capturar os dados públicos desse anúncio.",
  aprovacao: "Esta importação não está disponível para aprovação.",
  categoria: "Selecione uma categoria válida.",
  duplicado: "Já existe um produto cadastrado com o identificador capturado.",
  "dados-manual": "Revise os dados informados. O título e a confirmação de conferência são obrigatórios; os links de mídia devem ser HTTPS.",
};
const ERROS_IMPORTACAO = new Set(["url", "marketplace", "metadados", "captura"]);

export default async function ImportarOfertaPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; erro?: string }>;
}) {
  const [{ id, erro }, admin] = await Promise.all([searchParams, requireAdmin()]);
  const db = supabaseAdmin();
  const [{ data: categorias, error: erroCategorias }, importacoesResult] = await Promise.all([
    db.from("categorias")
      .select("slug, nome")
      .in("slug", SLUGS_CATEGORIAS)
      .order("ordem"),
    db.from("importacoes_ofertas")
      .select("id, url_origem, status, erro, dados_processados, criado_em")
      .eq("criado_por", admin.id)
      .order("criado_em", { ascending: false })
      .limit(20),
  ]);
  if (erroCategorias) throw erroCategorias;
  if (importacoesResult.error) throw importacoesResult.error;

  const importacoes = importacoesResult.data ?? [];
  const filaRevisao = importacoes.filter((item) => item.status === "aguardando_revisao");
  const historico = importacoes.filter((item) => item.status !== "aguardando_revisao");
  const importacao = id && /^[0-9a-f-]{36}$/i.test(id)
    ? importacoes.find((item) => item.id === id) ?? null
    : null;
  const previa = validarPreviaImportacao(importacao?.dados_processados);
  const mensagemErro = erro ? MENSAGENS_ERRO[erro] : undefined;
  const falhaImportacao = importacao?.status === "erro" ||
    Boolean(erro && ERROS_IMPORTACAO.has(erro));
  const linhasImportacoes = (items: typeof importacoes) => (
    <ul className="grid gap-2">
      {items.map((item) => {
        const itemPrevia = validarPreviaImportacao(item.dados_processados);
        return (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-2">
            <Link href={`/admin/importar?id=${item.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-orange-800">
              {itemPrevia?.titulo ?? item.url_origem ?? item.id}
            </Link>
            <span className="text-xs text-stone-600">
              {item.status === "aguardando_revisao" ? "Aguardando revisão" : item.status}
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="section-kicker">Entrada de ofertas</p>
          <h1 className="mt-1 text-2xl font-bold">Importar oferta por link</h1>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-orange-800">Voltar ao painel</Link>
      </div>

      <p className="mb-6 max-w-3xl text-sm text-stone-600">
        Escolha entre importar pela API autorizada, capturar dados da página aberta ou cadastrar manualmente.
        Todas as entradas ficam aguardando revisão; nada é publicado automaticamente.
      </p>

      <section className="mb-8 rounded-lg border border-stone-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-bold">1. Importar por link / API</h2>
        <p className="mb-4 mt-1 text-sm text-stone-600">
          A Shopee usa a API oficial para buscar os dados quando as credenciais estiverem configuradas.
          Sem credenciais, links Shopee não são raspados: use captura assistida ou cadastro manual.
          Para outros marketplaces, o sistema tenta capturar somente metadados públicos da página.
        </p>
        <AdminShopeeLinkConverter apiConfigurada={shopeeApiConfigurada()} />
        <form action={importarOfertaLink} className="grid gap-4">
          <label className="admin-field">
            Link do produto ou link afiliado
            <input
              name="url_origem"
              type="url"
              inputMode="url"
              placeholder="https://..."
              required
              maxLength={2048}
            />
          </label>
          <p className="text-xs text-stone-500">
            Marketplace identificado pelo domínio: Shopee, Amazon, Mercado Livre, AliExpress ou Magalu.
            Links curtos Shopee têm somente os redirecionamentos seguidos; o sistema não tenta contornar bloqueios.
          </p>
          <button className="w-fit rounded-md bg-orange-700 px-4 py-3 font-bold text-white hover:bg-orange-800">
            Tentar importação
          </button>
        </form>
      </section>

      <AdminImportacaoAssistida />

      {falhaImportacao ? (
        <div role="alert" className="mb-4 grid gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
          <p>Falha na importação do produto. Use o cadastro manual.</p>
          {mensagemErro && <p>{mensagemErro}</p>}
          {importacao?.erro && <p>{importacao.erro}</p>}
          {importacao?.status === "erro" && importacao.url_origem ? (
            <Link href="#cadastro-manual" className="w-fit font-semibold underline">
              Continuar no cadastro manual da oferta
            </Link>
          ) : (
            <Link href="/admin/produtos/novo" className="w-fit font-semibold underline">
              Abrir cadastro manual
            </Link>
          )}
        </div>
      ) : mensagemErro ? (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {mensagemErro}
        </p>
      ) : null}

      {filaRevisao.length > 0 && (
        <section className="mb-8 rounded-lg border border-stone-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-bold">Fila de revisão ({filaRevisao.length})</h2>
          <p className="mb-3 text-sm text-stone-600">
            Itens aguardando revisão precisam de categoria e aprovação antes de criar produto e oferta.
          </p>
          {linhasImportacoes(filaRevisao)}
        </section>
      )}

      {historico.length > 0 && (
        <section className="mb-8 rounded-lg border border-stone-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-bold">Importações recentes</h2>
          {linhasImportacoes(historico)}
        </section>
      )}

      {importacao && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 sm:p-6">
          <p className="section-kicker">
            {importacao.status === "aguardando_revisao"
              ? "Aguardando revisão"
              : importacao.status === "erro"
                ? "Captura não concluída"
                : importacao.status}
          </p>
          {previa ? (
            <>
              <h2 className="mb-4 mt-1 text-xl font-bold">Prévia do anúncio</h2>
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="grid grid-cols-2 gap-3">
                  {previa.imagens.slice(0, 4).map((imagem, index) => (
                    <div key={imagem} className="aspect-square overflow-hidden rounded-md bg-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagem} alt={`Imagem capturada ${index + 1} de ${previa.titulo}`} className="h-full w-full object-contain" />
                    </div>
                  ))}
                  {previa.imagens.length === 0 && (
                    <p className="col-span-2 rounded-md bg-stone-100 p-6 text-sm text-stone-500">
                      A origem não disponibilizou imagens nos metadados públicos.
                    </p>
                  )}
                </div>

                <div className="grid content-start gap-3">
                  <p className="text-sm font-semibold text-stone-600">{previa.marketplace_nome}</p>
                  {previa.origem_captura !== "capturada" && (
                    <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                      {previa.origem_captura === "api"
                        ? "Dados obtidos pela API Shopee. Confira a correspondência com o anúncio antes de aprovar."
                        : previa.origem_captura === "manual"
                          ? "Dados cadastrados manualmente pelo administrador; confira-os no marketplace."
                          : "Prévia capturada com assistência do administrador; confira os dados no marketplace."}
                      {importacao.erro ? ` Captura automática: ${importacao.erro}` : ""}
                    </p>
                  )}
                  <h3 className="text-lg font-bold">{previa.titulo}</h3>
                  {previa.preco_atual !== null && (
                    <p className="text-2xl font-extrabold text-orange-700">
                      {previa.preco_atual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  )}
                  {previa.descricao && <p className="whitespace-pre-line text-sm text-stone-700">{previa.descricao}</p>}
                  {previa.caracteristicas.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
                      {previa.caracteristicas.map((caracteristica) => <li key={caracteristica}>{caracteristica}</li>)}
                    </ul>
                  )}
                  {previa.videos.length > 0 && (
                    <div className="grid gap-1 text-sm text-stone-600">
                      <p>Vídeos encontrados:</p>
                      {previa.videos.slice(0, 4).map((video, index) => (
                        <a key={video} href={video} target="_blank" rel="noreferrer noopener" className="break-all text-orange-800 underline">
                          Abrir vídeo {index + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  {previa.vendedor && <p className="text-sm text-stone-600">Vendedor: {previa.vendedor}</p>}
                  <p className="break-all text-xs text-stone-500">Link afiliado: {previa.url_origem}</p>
                  <p className="text-xs text-stone-500">
                    {previa.preco_atual === null
                      ? "A origem não forneceu preço legível. A importação pode ser aprovada, mas o preço ficará sem valor até atualização confiável."
                      : "Preço e demais dados capturados são informativos e podem mudar na origem."}
                  </p>
                </div>
              </div>

              {importacao.status === "aguardando_revisao" ? (
                <form action={aprovarImportacaoOferta} className="mt-6 grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
                  <input type="hidden" name="importacao_id" value={importacao.id} />
                  <label className="admin-field">
                    Categoria para organização da vitrine
                    <select name="categoria" defaultValue="" required>
                      <option value="" disabled>Selecione</option>
                      {categorias?.map((categoria) => (
                        <option key={categoria.slug} value={categoria.slug}>{categoria.nome}</option>
                      ))}
                    </select>
                  </label>
                  <p className="self-end text-sm text-stone-600">
                    Aprovar cria produto e oferta como “Em análise” e inativa. Não haverá publicação automática.
                  </p>
                  <button className="w-fit rounded-md bg-green-700 px-4 py-3 font-bold text-white hover:bg-green-800 sm:col-span-2">
                    Aprovar e criar produto + oferta
                  </button>
                </form>
              ) : (
                <p className="mt-5 border-t border-stone-200 pt-4 text-sm text-stone-600">
                  Esta importação não está aguardando revisão.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="mt-2 grid gap-2 text-sm text-stone-600">
                {importacao.url_origem && <p className="break-all">Link: {importacao.url_origem}</p>}
                {importacao.erro && <p>{importacao.erro}</p>}
              </div>
              {importacao.status === "erro" && importacao.url_origem && (
                <form id="cadastro-manual" action={completarPreviaImportacaoManual} className="mt-5 grid gap-4 border-t border-stone-200 pt-5">
                  <input type="hidden" name="importacao_id" value={importacao.id} />
                  <div>
                    <h2 className="text-lg font-bold">Cadastro manual da oferta</h2>
                    <p className="mt-1 text-sm text-stone-600">
                      O link afiliado desta tentativa será mantido na oferta. Consulte o anúncio e informe
                      manualmente os dados que conseguir confirmar; eles serão identificados como cadastro manual.
                    </p>
                  </div>
                  <label className="admin-field">
                    Título exibido no marketplace
                    <input name="titulo" required minLength={2} maxLength={300} />
                  </label>
                  <label className="admin-field">
                    Preço atual (opcional; transcreva o valor exibido na origem)
                    <input name="preco_atual" type="number" min="0" step="0.01" inputMode="decimal" />
                  </label>
                  <label className="admin-field">
                    Descrição (opcional)
                    <textarea name="descricao" rows={4} maxLength={10000} />
                  </label>
                  <label className="admin-field">
                    Características (opcional, uma por linha)
                    <textarea name="caracteristicas" rows={4} maxLength={10000} />
                  </label>
                  <label className="admin-field">
                    URLs de imagens (opcional, uma por linha, HTTPS)
                    <textarea name="imagens" rows={3} maxLength={8192} />
                  </label>
                  <label className="flex items-start gap-2 text-sm text-stone-700">
                    <input type="checkbox" name="confirmacao" required className="mt-1" />
                    Conferi o anúncio original e transcrevi os dados exibidos no marketplace.
                  </label>
                  <button className="w-fit rounded-md bg-orange-700 px-4 py-3 font-bold text-white hover:bg-orange-800">
                    Gerar prévia para revisão
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}

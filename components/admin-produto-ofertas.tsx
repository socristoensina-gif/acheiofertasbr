import {
  atualizarProdutoOferta,
  criarFonteIntegracao,
  criarProdutoOferta,
  definirProdutoOfertaPrincipal,
  excluirProdutoOferta,
} from "@/app/admin/actions";
import { AdminOfertaMidias } from "@/components/admin-oferta-midias";
import type { OfferMedia } from "@/lib/media/config";

type FonteIntegracao = {
  id: string;
  marketplace_id: string | null;
  nome: string;
  tipo_integracao: string;
};

type Marketplace = {
  id: string;
  nome: string;
  ativo: boolean;
};

type ProdutoOferta = {
  id: string;
  marketplace_id: string;
  fonte_integracao_id: string | null;
  fonte_dados: string | null;
  id_externo: string | null;
  link_afiliado: string;
  preco_atual: number | string | null;
  preco_anterior: number | string | null;
  avaliacao: number | string | null;
  disponibilidade: boolean | null;
  ativo: boolean;
  principal: boolean;
  ultima_atualizacao: string;
};

function formatarPreco(valor: number | string | null) {
  if (valor === null) return "Sem preço";
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "Preço inválido";
}

function disponibilidade(valor: boolean | null) {
  if (valor === null) return "Não verificada";
  return valor ? "Disponível" : "Indisponível";
}

export function AdminProdutoOfertas({
  produtoId,
  ofertas,
  fontes,
  marketplaces,
  midiasPorOferta,
  galeriaConfigurada,
  erro,
  sucesso,
}: {
  produtoId: string;
  ofertas: ProdutoOferta[];
  fontes: FonteIntegracao[];
  marketplaces: Marketplace[];
  midiasPorOferta: Record<string, OfferMedia[]>;
  galeriaConfigurada: boolean;
  erro?: string;
  sucesso?: string;
}) {
  return (
    <section id="ofertas-vinculadas" className="scroll-mt-6 mt-8 rounded-lg border border-stone-200 bg-white p-4 sm:p-6">
      <p className="section-kicker">Dados externos</p>
      <h2 className="mb-4 mt-1 text-xl font-bold">Ofertas vinculadas</h2>
      {erro === "oferta" && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          Não foi possível salvar a oferta. Confira os campos e se o ID do marketplace existe.
        </p>
      )}
      {erro === "midias" && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          Não foi possível salvar a galeria da oferta. Verifique as mídias e tente novamente.
        </p>
      )}
      {erro === "midias-bucket" && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          O bucket privado de mídia não está configurado. Aplique a migration 20261007000600_storage_midias.sql.
        </p>
      )}
      {erro === "midias-cleanup" && (
        <p role="alert" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          A alteração foi salva, mas alguns arquivos sem uso não puderam ser apagados do Storage. Verifique os logs do servidor.
        </p>
      )}
      {sucesso === "midias" && (
        <p role="status" className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Galeria da oferta salva.
        </p>
      )}
      {!galeriaConfigurada && (
        <p role="status" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Galeria indisponível até aplicar a migration 20261007000600_storage_midias.sql no Supabase.
        </p>
      )}
      {sucesso === "oferta" && (
        <p role="status" className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Oferta atualizada.
        </p>
      )}
      {erro === "fonte" && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          Não foi possível cadastrar a fonte. Confira o ID do marketplace e os campos.
        </p>
      )}
      {sucesso === "fonte" && (
        <p role="status" className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Fonte de integração cadastrada.
        </p>
      )}

      {ofertas.length ? (
        <ul className="mb-8 grid gap-4">
          {ofertas.map((oferta) => (
            <li key={oferta.id} className="rounded-md border border-stone-200 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">
                    Marketplace: {marketplaces.find((marketplace) => marketplace.id === oferta.marketplace_id)?.nome ?? oferta.marketplace_id}
                    {oferta.principal && (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                        Principal
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-stone-600">
                    {formatarPreco(oferta.preco_atual)} · {disponibilidade(oferta.disponibilidade)}
                    {!oferta.ativo && " · Pausada"}
                  </p>
                </div>
                <p className="text-xs text-stone-500">
                  Atualizada: {new Date(oferta.ultima_atualizacao).toLocaleString("pt-BR")}
                </p>
              </div>

              <form action={atualizarProdutoOferta} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="produto_id" value={produtoId} />
                <input type="hidden" name="oferta_id" value={oferta.id} />
                <label className="admin-field">
                  Marketplace
                  <select name="marketplace_id" required defaultValue={oferta.marketplace_id}>
                    {marketplaces.map((marketplace) => (
                      <option key={marketplace.id} value={marketplace.id} disabled={!marketplace.ativo}>
                        {marketplace.nome}{marketplace.ativo ? "" : " (inativo)"}
                      </option>
                    ))}
                    {!marketplaces.some((marketplace) => marketplace.id === oferta.marketplace_id) && (
                      <option value={oferta.marketplace_id}>{oferta.marketplace_id} (legado)</option>
                    )}
                  </select>
                </label>
                <label className="admin-field">
                  ID externo
                  <input name="id_externo" defaultValue={oferta.id_externo ?? ""} />
                </label>
                <label className="admin-field">
                  Fonte de integração
                  <select name="fonte_integracao_id" defaultValue={oferta.fonte_integracao_id ?? ""}>
                    <option value="">Cadastro manual</option>
                    {fontes.map((fonte) => (
                      <option key={fonte.id} value={fonte.id}>
                        {fonte.nome}{fonte.marketplace_id ? ` (${fonte.marketplace_id})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field sm:col-span-2">
                  Link afiliado
                  <input name="link_afiliado" type="url" required defaultValue={oferta.link_afiliado} />
                </label>
                <label className="admin-field">
                  {oferta.fonte_dados === "LINK" ? "Preço capturado (R$)" : "Preço atual (R$)"}
                  <input
                    name="preco_atual"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={oferta.preco_atual ?? ""}
                    disabled={oferta.fonte_dados === "LINK"}
                  />
                </label>
                <label className="admin-field">
                  {oferta.fonte_dados === "LINK" ? "Preço anterior capturado (R$)" : "Preço anterior (R$)"}
                  <input
                    name="preco_anterior"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={oferta.preco_anterior ?? ""}
                    disabled={oferta.fonte_dados === "LINK"}
                  />
                </label>
                <label className="admin-field">
                  Avaliação (0 a 5)
                  <input
                    name="avaliacao"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    defaultValue={oferta.avaliacao ?? ""}
                    disabled={oferta.fonte_dados === "LINK"}
                  />
                </label>
                <label className="admin-field">
                  Disponibilidade
                  <select
                    name="disponibilidade"
                    defaultValue={oferta.disponibilidade === null ? "" : String(oferta.disponibilidade)}
                    disabled={oferta.fonte_dados === "LINK"}
                  >
                    <option value="">Não verificada</option>
                    <option value="true">Disponível</option>
                    <option value="false">Indisponível</option>
                  </select>
                </label>
                {oferta.fonte_dados === "LINK" && (
                  <p className="text-xs text-stone-500 sm:col-span-2">
                    Dados comerciais importados são somente leitura nesta edição. Atualizações futuras devem vir de nova captura ou integração confiável.
                  </p>
                )}
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" name="ativo" defaultChecked={oferta.ativo} />
                  Oferta ativa
                </label>
                <button className="rounded-md bg-orange-700 px-3 py-2 text-sm font-bold text-white sm:col-span-2">
                  Salvar oferta
                </button>
              </form>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {oferta.ativo && oferta.disponibilidade !== false && !oferta.principal && (
                  <form action={definirProdutoOfertaPrincipal}>
                    <input type="hidden" name="produto_id" value={produtoId} />
                    <input type="hidden" name="oferta_id" value={oferta.id} />
                    <button className="text-sm font-semibold text-green-800">Definir como principal</button>
                  </form>
                )}
                <form action={excluirProdutoOferta}>
                  <input type="hidden" name="produto_id" value={produtoId} />
                  <input type="hidden" name="oferta_id" value={oferta.id} />
                  <button className="text-sm font-semibold text-red-700">Excluir oferta</button>
                </form>
              </div>
              {oferta.fonte_integracao_id && (
                <p className="mt-3 text-xs text-stone-500">
                  Fonte de integração: {fontes.find((fonte) => fonte.id === oferta.fonte_integracao_id)?.nome ?? oferta.fonte_integracao_id}
                </p>
              )}
              {galeriaConfigurada && (
                <AdminOfertaMidias
                  ofertaId={oferta.id}
                  produtoId={produtoId}
                  initialMedia={midiasPorOferta[oferta.id] ?? []}
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-8 text-sm text-stone-600">
          Ainda não há ofertas vinculadas. A oferta legada do cadastro atual continua disponível até uma oferta nova ser cadastrada.
        </p>
      )}

      <form action={criarProdutoOferta} className="grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
        <input type="hidden" name="produto_id" value={produtoId} />
        <h3 className="text-lg font-bold sm:col-span-2">Adicionar oferta externa</h3>
        <p className="text-sm text-stone-600 sm:col-span-2">
          Vincule uma oportunidade externa. Dados internos e credenciais técnicas não são exibidos na vitrine.
        </p>
        <label className="admin-field">
          Marketplace
          <select name="marketplace_id" required defaultValue="">
            <option value="" disabled>Selecione</option>
            {marketplaces.filter((marketplace) => marketplace.ativo).map((marketplace) => (
              <option key={marketplace.id} value={marketplace.id}>{marketplace.nome}</option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          Fonte de integração
          <select name="fonte_integracao_id" defaultValue="">
            <option value="">Cadastro manual</option>
            {fontes.map((fonte) => (
              <option key={fonte.id} value={fonte.id}>
                {fonte.nome}{fonte.marketplace_id ? ` (${fonte.marketplace_id})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          ID externo
          <input name="id_externo" />
        </label>
        <label className="admin-field sm:col-span-2">
          URL original (opcional)
          <input name="url_original" type="url" />
        </label>
        <label className="admin-field sm:col-span-2">
          Link afiliado
          <input name="link_afiliado" type="url" required />
        </label>
        <label className="admin-field">
          Preço atual (R$)
          <input name="preco_atual" type="number" min="0" step="0.01" />
        </label>
        <label className="admin-field">
          Preço anterior (R$)
          <input name="preco_anterior" type="number" min="0" step="0.01" />
        </label>
        <label className="admin-field">
          Avaliação (0 a 5)
          <input name="avaliacao" type="number" min="0" max="5" step="0.1" />
        </label>
        <label className="admin-field">
          Disponibilidade
          <select name="disponibilidade" defaultValue="">
            <option value="">Não verificada</option>
            <option value="true">Disponível</option>
            <option value="false">Indisponível</option>
          </select>
        </label>
        <button className="rounded-md bg-orange-700 px-4 py-3 font-bold text-white sm:col-span-2">
          Adicionar oferta
        </button>
      </form>

      <form action={criarFonteIntegracao} className="mt-8 grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
        <input type="hidden" name="produto_id" value={produtoId} />
        <h3 className="text-lg font-bold sm:col-span-2">Cadastrar fonte de integração</h3>
        <p className="text-sm text-stone-600 sm:col-span-2">
          Registre apenas o tipo e a identificação da origem. Não informe nem armazene chaves ou segredos de API aqui.
        </p>
        <label className="admin-field">
          Nome da fonte
          <input name="nome" minLength={2} required />
        </label>
        <label className="admin-field">
          Tipo
          <select name="tipo_integracao" defaultValue="MANUAL" required>
            <option value="API">API</option>
            <option value="LINK">LINK</option>
            <option value="MANUAL">MANUAL</option>
            <option value="N8N">N8N</option>
          </select>
        </label>
        <label className="admin-field sm:col-span-2">
          ID do marketplace (opcional)
          <input name="marketplace_id" />
        </label>
        <button className="rounded-md border border-stone-300 px-4 py-3 font-bold text-stone-800 sm:col-span-2">
          Cadastrar fonte
        </button>
      </form>
    </section>
  );
}

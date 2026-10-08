# Banco de dados

## Escopo e fonte da informação

Este documento descreve o schema confirmado no código e nas migrations versionadas. As migrations `20261007_*` definem novas estruturas e validam tipos/chaves preexistentes antes de criar relações com o catálogo. Elas foram criadas, mas não aplicadas ao Supabase nesta implementação. Antes de aplicá-las, confira o schema remoto e a ordem de implantação.

## Tabelas

### `produtos`

- **Finalidade:** catálogo de ofertas exibidas ao público e gerenciadas pelo painel.
- **Campos tipados:** `id`, `slug`, `nome`, `categoria`, `marketplace`, `id_externo`, `link_afiliado`, `imagem`, `video`, `descricao`, `beneficios`, `preco_atual`, `preco_antigo`, `avaliacao`, `vendas`, `status`, `destaque`, `atualizado_em`, `criado_em`, `verificado_em`, `falhas_verificacao`, `fonte_dados`.
- **Semântica administrativa:** `nome`, `descricao` e `beneficios` são o nome público e o conteúdo editorial; `marketplace`, `id_externo`, `link_afiliado`, preços, avaliação, vendas, imagem, vídeo, fonte e atualização descrevem a origem externa. O schema não tem colunas distintas para nome ou descrição original do marketplace.
- **Status:** o código administrativo usa `encontrado`, `analisando`, `publicado`, `pausado` e `encerrado`. O tipo local define `status` como `string` e as migrations disponíveis não definem enum ou constraint que limite os valores; conferir o schema remoto antes de pressupor validação no banco.
- **Relacionamentos usados:** `categoria` contém o slug de `categorias.slug`; o código trata isso como vínculo lógico e não declara a constraint nas migrations versionadas. `cliques.produto_id` identifica o produto clicado.
- **Observação:** o schema inicial e as constraints desta tabela não estão incluídos nas migrations versionadas.

### `categorias`

- **Finalidade:** lista canônica das categorias usadas na navegação, formulários e catálogo.
- **Campos tipados:** `slug`, `nome`, `ordem`.
- **Relacionamentos usados:** produtos usam `categorias.slug` em `produtos.categoria`. A migration `20261005000000_categorias-marketplace.sql` atualiza sete categorias e remapeia slugs legados; não declara chave estrangeira.

### `marketplaces`

- **Finalidade:** tabela solicitada no inventário funcional para representar marketplaces.
- **Campos e relacionamentos:** o schema base completo não está versionado. As novas migrations exigem `marketplaces.id` do tipo `text`; não presumem outras colunas. `fontes_integracao.marketplace_id` e `produto_ofertas.marketplace_id` referenciam esse ID.
- **Próximo cuidado:** verificar o tipo real de `marketplaces.id` e quais IDs estão cadastrados antes da implantação. O Admin pede o ID existente, sem presumir o formato nem o nome de exibição.

### `afiliados`

- **Finalidade:** associar internamente cada oferta à entidade afiliada responsável.
- **Campos:** `id`, `nome`, `email` opcional, `tipo`, `ativo`, `criado_em`.
- **Registro inicial:** a migration insere `Ache Ofertas BR` como afiliado `padrao`, sem inventar endereço de e-mail. Um índice único parcial impede mais de um registro com esse tipo.
- **Acesso:** RLS habilitado; acesso concedido ao `service_role`, sem leitura pública.

### `fontes_integracao`

- **Finalidade:** identificar a origem/tipo de integração dos dados de uma oferta.
- **Campos:** `id`, `marketplace_id`, `nome`, `tipo_integracao`, `status`, `ultima_sincronizacao`, `criado_em`.
- **Tipos aceitos:** `API`, `LINK`, `MANUAL`, `N8N`.
- **Segredos:** a tabela não possui campos de credenciais ou chaves de API.
- **Acesso:** RLS habilitado; somente operações de servidor com `service_role`.

### `produto_ofertas`

- **Finalidade:** armazenar várias oportunidades externas para um mesmo produto editorial.
- **Relacionamentos:** `produto_id` referencia `produtos.id`; `marketplace_id` referencia `marketplaces.id`; `afiliado_id` referencia `afiliados.id`; `fonte_integracao_id` referencia `fontes_integracao.id`.
- **Dados:** IDs/URLs externos, conteúdo original, preços, avaliação, quantidade reportada pela origem, disponibilidade, estado ativo/principal, comissão interna, fonte e datas de atualização.
- **Regra principal:** índice único parcial em `produto_id` para linhas `principal = true`.
- **Acesso público:** a policy exige oferta ativa e produto publicado. Grants de coluna para `anon` e `authenticated` omitem links, conteúdo bruto, identificadores de origem e `comissao_interna`. Páginas do Next leem um DTO explícito no servidor; a chave `service_role` não sai do backend.
- **Admin:** leitura e gravação passam por ações autenticadas que verificam `requireAdmin()` e usam a chave de serviço no servidor.
- **Compatibilidade:** as colunas legadas em `produtos` não são removidas nem copiadas automaticamente. A vitrine e `/go/[slug]` continuam usando esses campos somente quando o produto ainda não tem nenhuma linha em `produto_ofertas`. Quando há ofertas, apenas uma ativa e não indisponível pode ser escolhida; caso contrário, a oferta é mostrada como indisponível.

### `cliques`

- **Finalidade:** registrar encaminhamentos de visitantes para destinos de produtos e permitir métricas de popularidade.
- **Campos tipados:** `id`, `produto_id`, `produto_oferta_id`, `fonte_integracao_id`, `origem`, `marketplace`, `user_agent`, `criado_em`.
- **Relacionamentos usados:** `produto_id` é associado pelo código a `produtos.id`; a constraint física não está descrita nas migrations versionadas.
- **Compatibilidade histórica:** as duas colunas novas são opcionais. FKs para oferta/fonte usam `ON DELETE SET NULL`, preservando linhas antigas de cliques.

### `precos_historico`

- **Finalidade:** tabela solicitada para histórico de preços.
- **Campos e relacionamentos:** não há definição nas migrations, nos tipos TypeScript nem consultas encontradas no código. Schema, chave do produto e política de retenção precisam ser confirmados no Supabase; não presumir nomes de campos.

### `newsletter_assinantes`

- **Finalidade:** armazenar inscrição, preferências, evidência de consentimento e estado de confirmação/cancelamento.
- **Campos:** `id`, `nome`, `email`, `categorias`, `periodicidade`, `termos_aceitos_em`, `consentimento_texto`, `consentimento_versao`, `token_descadastro`, `confirmado_em`, `cancelado_em`, `criado_em`, `atualizado_em`.
- **Relacionamentos:** não há relacionamento com outras tabelas declarado.
- **Restrições documentadas:** `email` é único; `periodicidade` aceita `diaria`, `semanal`, `quinzenal` ou `mensal`; `token_descadastro` tem índice único. RLS é habilitado, sem políticas públicas criadas por essa migration.

### `contatos`

- **Finalidade:** registrar mensagens enviadas pelo formulário de contato.
- **Campos:** `id`, `nome`, `email`, `estado`, `cidade`, `motivo`, `mensagem`, `criado_em`.
- **Relacionamentos:** não há relacionamento com outras tabelas declarado.
- **Restrições documentadas:** `motivo` aceita `sugestao`, `reclamacao`, `pedido` ou `parceria_midia`. `estado` e `cidade` tornaram-se opcionais pela migration `20261006000000_newsletter-conformidade.sql`. RLS é habilitado, sem políticas públicas criadas por essas migrations.

### `rate_limits`

- **Finalidade:** manter contadores por chave e janela horária para limitar envios dos formulários de newsletter e contato.
- **Campos:** `chave`, `janela`, `contagem`; chave primária composta por `chave` e `janela`.
- **Relacionamentos:** não há relacionamento com outras tabelas.
- **Acesso:** RLS habilitado; a migration revoga acesso de `PUBLIC`, `anon` e `authenticated`, e concede operações à role `service_role`. A função `incrementar_rate_limit(p_chave, p_janela)` também é executável somente por `service_role`.

## Tipos TypeScript

`lib/supabase/database.types.ts` tipa as novas tabelas e as relações criadas pelas migrations. `marketplaces` contém somente a coluna `id` conhecida pela especificação; os demais campos do schema remoto e `precos_historico` ainda não estão tipados. Os tipos não substituem uma inspeção do schema remoto.

## Migrations disponíveis

1. `20261005000000_categorias-marketplace.sql`: upsert das sete categorias canônicas e atualização de slugs em produtos existentes.
2. `20261005000100_newsletter-contato.sql`: criação de `newsletter_assinantes` e `contatos`, com constraints e RLS habilitado.
3. `20261006000000_newsletter-conformidade.sql`: campos de consentimento e cancelamento, campos opcionais de localização de contato, tabela/função de rate limit e grants/revokes.
4. `20261007000000_afiliados.sql`: tabela de afiliados e cadastro idempotente do afiliado padrão.
5. `20261007000100_fontes_integracao.sql`: fontes de integração sem credenciais, com validação da existência/tipo de `marketplaces.id`.
6. `20261007000200_produto_ofertas.sql`: ofertas, cliques associados, integridade referencial, RLS/grants e função de seleção da oferta principal.

As migrations são armazenadas em `supabase/migrations/` para serem reconhecidas pela CLI. A listagem remota atual mostra as seis migrations como pendentes; nenhuma foi aplicada por esta preparação. As etapas de fontes e ofertas validam as premissas do schema legado antes de prosseguir.

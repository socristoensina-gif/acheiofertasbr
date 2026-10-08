# Estado atual do projeto

**Auditoria:** 07/10/2026
**Branch observada antes das alterações de documentação:** `main`
**Estado Git observado antes das alterações:** limpo, sem arquivos modificados ou não rastreados.

## Resumo

O Ache Ofertas BR é uma aplicação Next.js com catálogo público, navegação por categorias, busca, favoritos locais, redirecionamento para marketplaces e formulários de newsletter/contato. Supabase fornece autenticação e persistência; Resend notifica novas inscrições e mensagens.

## Funcionalidades e estrutura presentes

- Home, páginas de produto e categoria, busca, páginas institucionais e favoritos em `app/`.
- Painel existente em `/admin`, com autenticação, CRUD/status de produtos e estatísticas de cliques.
- Componentes compartilhados em `components/`, incluindo formulário usado pelo painel.
- Lógica compartilhada em `lib/`; clientes Supabase em `lib/supabase/server.ts` e `utils/supabase.ts`.
- Integrações com Resend e IBGE. A importação por link tenta capturar metadados públicos e permite revisão manual quando a captura falha.
- O conversor de link afiliado da Shopee está preparado no backend, mas permanece desativado até a configuração de credenciais privadas; ele converte links e não coleta dados de produto.
- O formulário legado de produto mantém seus campos de imagem/vídeo por URL. A galeria nova fica vinculada a cada oferta, não ao produto.
- O produto público reproduz arquivos MP4/WebM e incorpora links válidos do YouTube/Vimeo; formatos externos não compatíveis permanecem como link para a origem. Streams externos só reproduzem se o host aceitar acesso do navegador e fornecer formato compatível.
- O schema legado de `produtos` mantém somente uma imagem principal e um vídeo principal; imagens e vídeos importados passam a ficar na galeria da oferta e não são publicados pelo fallback legado.
- A migration `20261007000600_storage_midias.sql` cria o bucket privado `produto-midias` (até 50 MB por arquivo; imagens JPEG/PNG/WebP/AVIF/GIF e vídeos MP4/WebM), a tabela `produto_oferta_midias`, RLS e a função de gravação da galeria. Upload e gerenciamento são feitos pelo backend autenticado; público pode ler apenas mídias aprovadas vinculadas a uma oferta ativa de produto publicado. A migration ainda precisa ser aplicada antes de usar o Storage.
- As migrations `20261007000000` a `20261007000300` estão aplicadas no Supabase; `20261007000600_storage_midias.sql` permanece pendente. O estado foi confirmado com `supabase migration list --linked`; nenhuma migration foi aplicada nesta tarefa.
- O schema base completo de produtos, categorias, cliques e tabelas de marketplace/preços não está representado integralmente nas migrations disponíveis. Conferir o projeto Supabase antes de qualquer mudança de banco.

## Galeria de mídia por oferta

O Admin permite adicionar até cinco imagens e dois vídeos por oferta, por upload (seleção/arrastar e soltar) ou URL HTTPS. Cada mídia pode ser ordenada, definida como principal, removida e aprovada para exibição pública. Uploads usam URLs assinadas emitidas apenas após autenticação administrativa; a chave `service_role` permanece no servidor.

As linhas da galeria são salvas em `produto_oferta_midias`; mídia de importação começa não aprovada e não é copiada para `produtos.imagem`/`produtos.video`. A página pública consulta somente mídias aprovadas de uma oferta ativa e só as apresenta quando o produto está publicado. Arquivos no bucket privado são entregues com URLs assinadas. A validade da URL emitida é de uma hora e ela permanece utilizável até expirar mesmo que a aprovação seja removida.

Para ativar upload, prévia e galeria, aplicar `supabase/migrations/20261007000600_storage_midias.sql` no Supabase. A aplicação de migrations remotas não foi feita nesta alteração.

## Base de importação de ofertas

A migration `20261007000300_importacoes_ofertas.sql` cria a estrutura de entrada de importações, com dados brutos/processados, status e acesso exclusivo ao backend via `service_role`. Os campos `afiliado_id`, `oferta_id` e `criado_por` não têm chaves estrangeiras nesta fase.

O Admin `/admin/importar` oferece importação por link/API, captura assistida por JSON copiado da página aberta e cadastro manual. O endpoint de captura assistida exige administrador, mesma origem, payload limitado e validação de título, preço, imagem HTTPS e domínio de marketplace. As entradas são associadas ao administrador e ficam em `aguardando_revisao`; aprovação cria produto em análise e oferta inativa.

O parser local extrai marketplace e IDs Shopee (loja/item), Mercado Livre (MLB), Amazon (ASIN), Magalu e AliExpress, sem rede. Para Shopee, não é feita captura HTML: links curtos seguem apenas redirecionamentos HTTPS limitados, com timeout e User-Agent identificável. Bloqueios e falhas levam ao modo assistido/manual; não há tentativa de contornar verificações.

### Shopee Open API

O cliente server-only da Shopee suporta `productOfferV2` por `itemId`/`shopId` e `generateShortLink`. As chamadas assinam o corpo JSON exato com timestamp e SHA-256. Quando configurada, a importação via URL Shopee tenta API de produto e grava a prévia na fila, sem publicação automática; o conversor manual de link afiliado continua disponível.

As chaves ainda não estão configuradas. Para habilitar, cadastrar `SHOPEE_APP_ID` e `SHOPEE_SECRET_KEY` como variáveis privadas no projeto Vercel `acheiofertasbr`, nos ambientes necessários, e fazer novo deploy. Os nomes estão listados sem valores em `.env.example`; nunca usar prefixo `NEXT_PUBLIC_`, gravar chaves no repositório ou enviá-las pelo navegador. Enquanto ausentes, o Admin informa que a API não está configurada e mantém disponíveis a captura por link e o cadastro manual.

### Próximas etapas

- Configurar credenciais Shopee na Vercel e validar a consulta de produto e geração de link com uma conta autorizada.
- Avaliar endpoints oficiais de produto para Amazon, Mercado Livre, Magalu e AliExpress.
- Centralizar configurações futuras em `integracoes_marketplace`, mantendo segredos somente nas variáveis de ambiente do servidor.

Logs de rede registram somente marketplace/operação, status HTTP, tipo de conteúdo e número de redirecionamentos; nunca HTML bruto, cookies, URLs com parâmetros de afiliado ou credenciais. Segredos devem existir somente em variáveis de ambiente da Vercel. O n8n nunca deve receber `SUPABASE_SERVICE_ROLE_KEY`.

## Documentação canônica

- [arquitetura.md](./arquitetura.md): componentes, integrações e fluxo de dados.
- [banco.md](./banco.md): tabelas, campos confirmados e lacunas do schema.
- [roadmap.md](./roadmap.md): cinco fases da evolução.
- [admin-planejamento.md](./admin-planejamento.md): escopo do painel existente e sua evolução.
- [checklist-seguranca-admin.md](./checklist-seguranca-admin.md): verificações de segurança.

## Configuração

O `.env.example` documenta parte das variáveis. O código também espera `ADMIN_EMAIL` e pode usar `NEXT_PUBLIC_LOGIN_SOCIAL` e `NEXT_PUBLIC_SITE_URL`, ausentes do exemplo atual. `SUPABASE_SERVICE_ROLE_KEY`, Resend e salt de limite são valores secretos de servidor; não incluir valores no Git ou na documentação. Nunca abrir ou reproduzir o conteúdo de `.env.local` em documentação.

## Situação do Git

A implementação da galeria por oferta e a documentação estão modificadas localmente na branch `main`. Lint e build passaram. A migration `20261007000600_storage_midias.sql` não foi aplicada, e estas alterações não foram commitadas nem enviadas ao remoto.

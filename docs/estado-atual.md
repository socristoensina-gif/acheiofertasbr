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
- O formulário legado de produto oferece URL HTTPS ou envio de imagem/vídeo pelo computador, com arrastar e soltar e prévia. O upload usa URL assinada criada somente após autenticação administrativa; o bucket é de leitura pública e não permite upload público.
- O produto público reproduz arquivos MP4/WebM e incorpora links válidos do YouTube/Vimeo; formatos externos não compatíveis permanecem como link para a origem. Streams externos só reproduzem se o host aceitar acesso do navegador e fornecer formato compatível.
- O schema legado de `produtos` mantém somente uma imagem principal e um vídeo principal. Prévia de importação pode conter várias mídias, mas aprovação ainda associa somente a primeira imagem e o primeiro vídeo; galeria exige evolução de schema e admin separada.
- A migration `20261007000400_produto_midias_storage.sql` cria o bucket público de leitura `produto-midias` (até 50 MB por arquivo; imagens JPEG/PNG/WebP/AVIF/GIF e vídeos MP4/WebM). Ela é local e precisa ser aplicada ao Supabase antes do primeiro envio. Nenhuma migration foi aplicada remotamente nesta alteração.
- Sete migrations versionadas anteriores: três originais, três para afiliados/fontes/ofertas e uma para a base de importação. As migrations `20261007000000` a `20261007000200` foram aplicadas no Supabase; `20261007000300_importacoes_ofertas.sql` permanece local e pendente.
- O schema base completo de produtos, categorias, cliques e tabelas de marketplace/preços não está representado integralmente nas migrations disponíveis. Conferir o projeto Supabase antes de qualquer mudança de banco.

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

A auditoria iniciou na branch `main`, com árvore de trabalho limpa. As únicas alterações desta organização são documentação: os arquivos criados/atualizados e a consolidação de documentos duplicados são relatados no resumo da tarefa. Não foi feito commit nem push.

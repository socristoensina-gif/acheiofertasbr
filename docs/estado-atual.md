# Estado Atual do Projeto

**Atualizado em:** 05/10/2026
**Branch:** `main`
**Commit mais recente:** `810b413` — `Centraliza categorias e corrige migração` (local, sem push)
**Commit anterior:** `610e65c` — `Add newsletter and contact forms`

Este documento resume o que existe, o que ainda depende de configuração e os cuidados para continuar o trabalho sem sobrescrever alterações locais.

## Visão do produto

O Ache Ofertas BR é um hub de pesquisa e descoberta que conecta canais de mídia a produtos e, em seguida, aos marketplaces/vendedores. O portal não vende, não processa pagamentos e não atende pedidos. Alguns links geram comissão; uma futura pesquisa agregada pode incluir resultados sem comissão, com prioridade comercial transparente para fontes monetizadas.

## Implementado

- Home com destaques, ofertas recentes, mais procurados, categorias canônicas, Canal VIP e estados vazios quando não há produtos publicados.
- Fonte única das sete categorias em `lib/categorias.ts`, com slug, nome, ordem e ícone. Menu, home, rotas, formulário da newsletter e admin usam essa lista; slugs fora dela retornam 404.
- Páginas de categoria e busca. A busca atual usa `ilike` no catálogo de produtos publicados do Supabase; ainda não consulta vários marketplaces externos.
- Redirecionamento `/go/[slug]` com allowlist HTTPS em `lib/dominios-permitidos.ts` e registro de cliques.
- Admin protegido por Supabase Auth, com CRUD de produtos, detecção de marketplace e estatísticas de cliques.
- Favoritos no `localStorage`.
- Newsletter em `/newsletter`: nome/e-mail, categorias múltiplas, periodicidade diária/semanal/quinzenal/mensal, checkbox obrigatório de consentimento desmarcado por padrão, com link para privacidade e termos, e entrada opcional com Google/Facebook.
- Contato em `/contato`: nome, e-mail, UF, município dependente da UF (API pública do IBGE), motivo e mensagem.
- Notificações de newsletter/contato enviadas pelo servidor via API REST do Resend para `acheiofertas@gmail.com`. Newsletter grava nome, e-mail, categorias, periodicidade e data do aceite em `newsletter_assinantes`; contato grava nome, e-mail, estado, cidade, motivo e mensagem em `contatos`. As gravações usam `supabaseAdmin()` com service role.
- Os dois formulários têm honeypot e validação de e-mail no servidor. Não há limite de envios nem fluxo de descadastro implementado.
- Páginas institucionais em português, incluindo política de privacidade e termos marcados como rascunhos.
- O botão Canal VIP usa o link em `lib/config.ts` ou o valor de `NEXT_PUBLIC_WHATSAPP_CHANNEL_URL`.

## Verificações

Na validação do commit `810b413`, passaram `npm run lint` e `npm run build` (inclui typecheck e geração de rotas).

Também foram testados no navegador os formulários responsivos e a carga de municípios: selecionar São Paulo retornou municípios da API do IBGE.

## Configuração Pendente

### Supabase

Aplicar manualmente no projeto Supabase, nesta ordem:

1. `database/migrations/20261005_categorias-marketplace.sql`
2. `database/migrations/20261005_newsletter-contato.sql`
3. `database/migrations/20261006_newsletter-conformidade.sql`

`20261005_newsletter-contato.sql` cria `newsletter_assinantes` e `contatos` e habilita RLS, sem políticas públicas. A migration `20261006_newsletter-conformidade.sql` depende dessas tabelas: adiciona campos de consentimento/descadastro, torna UF e município opcionais e cria `rate_limits` e a função `incrementar_rate_limit`. Portanto, ela deve ser aplicada somente depois da migration base. `20261005_categorias-marketplace.sql` insere/atualiza as sete linhas em `categorias`, remapeia produtos e remove slugs antigos; pressupõe que as tabelas `categorias` e `produtos` já existam e não altera o schema de produtos. Antes de executar, confira no Supabase quais migrations já foram aplicadas.

O código usa `produtos.categoria` como slug relacionado a `categorias.slug`. O admin valida o slug e grava diretamente em `produtos.categoria`; as páginas públicas filtram pela mesma coluna.

### E-mail

Definir no ambiente do servidor:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

O domínio do remetente precisa estar verificado no Resend. Sem essas variáveis, os formulários mostram erro de configuração e não simulam sucesso. O `.env.example` contém os nomes das variáveis; `.env.local` não deve ser lido, alterado ou compartilhado sem pedido explícito.

### Login social

Habilitar Google e Facebook em Supabase Auth > Providers e autorizar `/auth/callback` como URL de redirect. A interface e o callback estão implementados, mas o fluxo depende dos providers configurados no Supabase.

### Redes sociais

Os campos `href` de `socialLinks` em `lib/config.ts` ainda estão vazios. Os perfis são exibidos como pendentes, sem links inventados. Os antigos nomes de canais do Facebook foram removidos; configurar apenas os perfis sociais que serão usados.

## Ainda Não Implementado

- Disparo programado da newsletter conforme periodicidade e categorias. Hoje as preferências são armazenadas e há notificação da inscrição para o e-mail do portal; não há cron/worker para enviar ofertas aos assinantes.
- Fluxo de descadastro/cancelamento da newsletter.
- Pesquisa federada por APIs de marketplaces e sites afiliados. `lib/marketplaces/index.ts` é apenas uma interface e `fetchProduct()` retorna `null`.
- Cadastro/gestão de anúncios pagos e regras de ranking patrocinado.
- URLs reais de Instagram, TikTok, Facebook e X.

## Estado Local a Preservar

O commit `810b413` está apenas local; não foi feito push. Permanecem fora dele e devem ser preservados:

- `utils/supabase.ts` modificado localmente.
- `app/produto/` não rastreado.
- `atualizacao0510.md` não rastreado.
- `docs/estado-atual.md` não rastreado (este documento).

Não sobrescrever, apagar ou incluir esses caminhos em commits sem confirmação.

## Próximas Etapas Sugeridas

1. Aplicar e conferir as duas migrações no Supabase.
2. Configurar Resend e providers OAuth; preencher os URLs sociais reais.
3. Fazer testes de ponta a ponta de inscrição e contato em ambiente configurado.
4. Implementar descadastro e worker/cron para entregas segmentadas da newsletter.
5. Planejar integrações de pesquisa externa e anúncios com regras explícitas de transparência e prioridade comercial.

## Base de importação de ofertas (07/10/2026)

A migration local `20261007000300_importacoes_ofertas.sql` cria a estrutura de entrada de importações, com dados brutos/processados, status e acesso exclusivo ao backend via `service_role`. Ela não foi aplicada ao banco nem enviada por push. Os campos `afiliado_id`, `oferta_id` e `criado_por` são reservados, sem chaves estrangeiras nesta fase. A captura, revisão e integração com marketplaces não foram implementadas.

### Fases futuras

- **Fase 2:** criar `integracoes_marketplace` para estado ativo, parâmetros não secretos e o nome da variável de ambiente que contém o segredo; adicionar ação administrativa para testar conexão.
- **Fase 3:** criar rota de servidor autenticada e exclusiva para administradores; validar domínio, chamar a API do marketplace, gravar dados brutos e processados e encaminhar o resultado para revisão.
- **Fase 4:** adicionar ao Admin o botão “Importar oferta”.

Segredos devem existir somente em variáveis de ambiente da Vercel. O n8n nunca deve receber `SUPABASE_SERVICE_ROLE_KEY`.

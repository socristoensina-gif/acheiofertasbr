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
- Integrações com Resend e IBGE; interfaces para marketplace ainda sem coleta efetiva por API.
- Sete migrations versionadas: três originais, três para afiliados/fontes/ofertas e uma para a base de importação. As migrations `20261007000000` a `20261007000200` foram aplicadas no Supabase; `20261007000300_importacoes_ofertas.sql` permanece local e pendente.
- O schema base completo de produtos, categorias, cliques e tabelas de marketplace/preços não está representado integralmente nas migrations disponíveis. Conferir o projeto Supabase antes de qualquer mudança de banco.

## Base de importação de ofertas

A migration local `20261007000300_importacoes_ofertas.sql` cria a estrutura de entrada de importações, com dados brutos/processados, status e acesso exclusivo ao backend via `service_role`. Ela não foi aplicada ao banco nem enviada por push. Os campos `afiliado_id`, `oferta_id` e `criado_por` são reservados, sem chaves estrangeiras nesta fase. A captura de dados, revisão e integração com marketplaces não foram implementadas.

### Fases futuras

- **Fase 2:** criar `integracoes_marketplace` para estado ativo, parâmetros não secretos e o nome da variável de ambiente que contém o segredo; adicionar ação administrativa para testar conexão.
- **Fase 3:** criar rota de servidor autenticada e exclusiva para administradores; validar domínio, chamar a API do marketplace, gravar dados brutos e processados e encaminhar o resultado para revisão.
- **Fase 4:** adicionar ao Admin o botão “Importar oferta”.

Segredos devem existir somente em variáveis de ambiente da Vercel. O n8n nunca deve receber `SUPABASE_SERVICE_ROLE_KEY`.

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

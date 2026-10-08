# Arquitetura do Ache Ofertas BR

## Visão geral

O Ache Ofertas BR é um catálogo público de ofertas que encaminha o visitante ao marketplace ou vendedor. O portal não processa pagamentos nem pedidos. A aplicação atual combina páginas públicas, rotas de servidor e um painel administrativo parcial.

## Tecnologias e serviços

- **Next.js 16 / React 19 / TypeScript:** aplicação web com App Router, páginas e layouts no diretório `app/`, componentes reutilizáveis em `components/` e lógica compartilhada em `lib/` e `utils/`.
- **Vercel:** plataforma de hospedagem prevista para a aplicação. Não há configuração de deploy específica versionada no repositório; as variáveis devem ser configuradas no ambiente de deploy.
- **Supabase:** PostgreSQL, autenticação e acesso ao banco pela API Supabase. O cliente público usa a chave anon; operações privilegiadas usam a service role no servidor.
- **Resend:** envio de avisos de novas inscrições e contatos pela API REST. O e-mail é enviado no servidor e depende do domínio remetente verificado.
- **IBGE:** a tela de contato consulta a API pública de localidades para carregar municípios.

## Fluxo de dados

1. As páginas públicas consultam os dados editoriais do produto e as categorias no Supabase. A busca e as páginas de categoria consideram o catálogo publicado.
2. Ofertas externas ficam em `produto_ofertas`, vinculadas a produto, marketplace, afiliado e fonte de integração. Um DTO server-only entrega à vitrine somente marketplace, preço, avaliação, disponibilidade e estado principal; comissão, credenciais, links e conteúdo bruto não são passados aos componentes públicos.
3. A home exibe destaques, produtos recentes e produtos mais clicados. Cliques são lidos para calcular popularidade; as estatísticas administrativas também agrupam por oferta e marketplace quando o novo ID do clique está disponível.
4. `/go/[slug]` escolhe a oferta ativa principal disponível (ou a oferta ativa disponível de menor preço), valida o domínio permitido, registra `produto_id`, `produto_oferta_id`, `fonte_integracao_id` e marketplace, e redireciona ao destino afiliado.
5. Durante a transição, se o produto ainda não tiver nenhuma linha em `produto_ofertas`, a vitrine e `/go/[slug]` usam os campos antigos de `produtos`; esses campos não são apagados nem migrados automaticamente.
6. Ações de newsletter e contato validam os dados no servidor, aplicam honeypot e limite de envios, gravam no Supabase com service role e enviam notificação via Resend.
7. O painel usa Supabase Auth para autenticação; cada ação administrativa verifica autorização no servidor e usa service role somente no backend para administrar produtos, ofertas e fontes.
8. Favoritos são mantidos no `localStorage` do navegador.

## Integrações Supabase

- `utils/supabase.ts` exporta um cliente com chave anon para leituras públicas e `supabaseAdmin()` para operações privilegiadas.
- `lib/supabase/server.ts` cria o cliente SSR ligado aos cookies da requisição, usado no fluxo de autenticação.
- `lib/supabase/database.types.ts` tipa as tabelas conhecidas pelo código e as relações criadas pelas migrations novas. A ausência de tipos completos para tabelas legadas não comprova ausência de constraints no banco remoto.
- As migrations versionadas estão em `supabase/migrations/`, no padrão do Supabase CLI. Elas cobrem categorias, newsletter, contatos, limites e o novo modelo de ofertas; não constituem o schema inicial completo de produtos e cliques.
- As migrations de ofertas `20261007000000_afiliados.sql`, `20261007000100_fontes_integracao.sql` e `20261007000200_produto_ofertas.sql` adicionam o modelo novo sem remover os campos legados. A última restringe os grants públicos por coluna para que `comissao_interna` e links afiliados não sejam consultáveis via chave anon. As migrations não são aplicadas automaticamente pelo build.

## Fontes de integração e automação futura

`fontes_integracao` registra o tipo e a identificação da origem (`API`, `LINK`, `MANUAL` ou `N8N`), sem armazenar chaves ou segredos. Uma integração futura deve receber atualizações por um backend seguro e autenticado; o n8n não deve receber `SUPABASE_SERVICE_ROLE_KEY` nem acesso direto privilegiado ao banco.

```text
Marketplace/API → n8n → backend autenticado → Supabase → vitrine
```

## Resend

`lib/email.ts` envia e-mails de texto pela API REST do Resend. O endereço remetente, chave e destinatário são lidos exclusivamente no servidor. Falhas de configuração ou envio são reportadas pelas ações dos formulários; não há fila de e-mail ou worker de envio de campanhas.

## Estrutura atual

```text
app/                  Rotas públicas, callback OAuth, server actions e painel /admin
components/           Componentes públicos e formulário usado pelo painel
supabase/migrations/  Migrations SQL versionadas e reconhecidas pela CLI
docs/                 Documentação técnica e planejamento
lib/                  Domínio, autenticação, Supabase SSR, e-mail e helpers
utils/                Cliente Supabase público e cliente privilegiado de servidor
```

O projeto também contém `public/` para assets. A estrutura administrativa já existente inclui `app/admin/`, `app/admin/actions.ts`, `lib/admin/auth.ts` e `components/admin-produto-form.tsx`; não há atualmente os diretórios `components/admin/` ou `types/admin/`.

## Variáveis de ambiente esperadas

Configurar os valores conforme o ambiente; nunca publicar segredos ou copiar valores reais para a documentação.

| Variável | Uso | Exposição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Acesso público sujeito às políticas RLS | Pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Operações administrativas e formulários no servidor | Segredo de servidor |
| `ADMIN_EMAIL` | E-mail autorizado no painel | Servidor |
| `RESEND_API_KEY` | Autenticação na API Resend | Segredo de servidor |
| `RESEND_FROM_EMAIL` | Endereço remetente verificado | Servidor |
| `CONTACT_NOTIFY_EMAIL` | Destinatário das notificações | Servidor |
| `RATE_LIMIT_SALT` | Salt usado ao derivar chave de limite a partir do IP | Segredo de servidor |
| `NEXT_PUBLIC_LOGIN_SOCIAL` | Habilita botões OAuth quando igual a `true` | Pública; opcional |
| `NEXT_PUBLIC_SITE_URL` | Origem alternativa para o callback OAuth | Pública; fallback opcional |
| `NEXT_PUBLIC_WHATSAPP_CHANNEL_URL` | Link do Canal WhatsApp; há fallback em `lib/config.ts` | Pública; opcional |

O Admin autentica via Supabase Auth com e-mail e senha (`signInWithPassword`). O usuário precisa existir em **Supabase Auth → Users** no mesmo projeto da aplicação; a autorização é concedida somente quando o e-mail autenticado corresponde a `ADMIN_EMAIL`, configurado no servidor. Não há tabela própria de usuários ou senha administrativa no banco da aplicação. Cadastre/convide o usuário pelo Supabase Auth e configure `ADMIN_EMAIL` com o mesmo e-mail, sem incluir senha em variáveis, código ou tabelas. `.env.example` documenta a variável sem valor real. O arquivo `.env.local` não é documentação e seus valores não devem ser expostos.

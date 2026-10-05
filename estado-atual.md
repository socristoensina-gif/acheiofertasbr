Estado Atual do Projeto

Atualizado em: 05/10/2026

Branch: main

Commit mais recente: 810b413 — Centraliza categorias e corrige migração (local, sem push)

Commit anterior: 610e65c — Add newsletter and contact forms



Este documento resume o que existe, o que ainda depende de configuração e os cuidados para continuar o trabalho sem sobrescrever alterações locais.



Visão do produto

O Ache Ofertas BR é um hub de pesquisa e descoberta que conecta canais de mídia a produtos e, em seguida, aos marketplaces/vendedores. O portal não vende, não processa pagamentos e não atende pedidos. Alguns links geram comissão; uma futura pesquisa agregada pode incluir resultados sem comissão, com prioridade comercial transparente para fontes monetizadas.



Implementado

Home com destaques, ofertas recentes, mais procurados, categorias canônicas, Canal VIP e estados vazios quando não há produtos publicados.

Fonte única das sete categorias em lib/categorias.ts, com slug, nome, ordem e ícone. Menu, home, rotas, newsletter e admin usam essa lista; slugs fora dela retornam 404.

Páginas de categoria e busca. A busca atual usa ilike no catálogo de produtos publicados do Supabase; ainda não consulta vários marketplaces externos.

Redirecionamento /go/\[slug] com allowlist HTTPS em lib/dominios-permitidos.ts e registro de cliques.

Admin protegido por Supabase Auth, com CRUD de produtos, detecção de marketplace e estatísticas de cliques.

Favoritos no localStorage.

Newsletter em /newsletter: nome/e-mail, categorias múltiplas, periodicidade diária/semanal/quinzenal/mensal, checkbox obrigatório de consentimento desmarcado por padrão, com links para privacidade e termos, e entrada opcional com Google/Facebook.

Contato em /contato: nome, e-mail, UF, município dependente da UF (API pública do IBGE), motivo e mensagem.

Notificações de newsletter/contato enviadas pelo servidor via API REST do Resend para acheiofertas@gmail.com. Newsletter grava nome, e-mail, categorias, periodicidade e data do aceite em newsletter_assinantes; contato grava nome, e-mail, estado, cidade, motivo e mensagem em contatos. As gravações usam supabaseAdmin() com service role.

Os dois formulários têm honeypot e validação de e-mail no servidor. Não há limite de envios nem fluxo de descadastro implementado.

Páginas institucionais em português, incluindo política de privacidade e termos marcados como rascunhos.

O botão Canal VIP usa o link em lib/config.ts ou o valor de NEXT\_PUBLIC\_WHATSAPP\_CHANNEL\_URL.

Verificações

Na validação do commit 810b413, passaram npm run lint e npm run build (inclui typecheck e geração de rotas).



npx tsc --noEmit

npm run lint

npm run build

Também foram testados no navegador os formulários responsivos e a carga de municípios: selecionar São Paulo retornou municípios da API do IBGE.



Configuração Pendente

Supabase

Aplicar as duas migrações manualmente no projeto Supabase:



database/migrations/20261005\_categorias-marketplace.sql

database/migrations/20261005\_newsletter-contato.sql

20261005_newsletter-contato.sql cria newsletter_assinantes e contatos e habilita RLS, sem políticas públicas. 20261005_categorias-marketplace.sql insere/atualiza as sete linhas em categorias, remapeia produtos e remove slugs antigos; não cria as tabelas categorias ou produtos. Nenhuma das migrações foi executada nesta sessão.

O código usa produtos.categoria como slug relacionado a categorias.slug. O admin valida o slug e grava diretamente em produtos.categoria; as páginas públicas filtram pela mesma coluna.

Depois de aplicar a migração de categorias, conferir as categorias e os produtos remapeados no banco. Os formulários do admin dependem da existência das categorias canônicas na tabela.



E-mail

Definir no ambiente do servidor:



RESEND\_API\_KEY

RESEND\_FROM\_EMAIL

O domínio do remetente precisa estar verificado no Resend. Sem essas variáveis, os formulários mostram erro de configuração e não simulam sucesso. O .env.example contém os nomes das variáveis; .env.local não deve ser lido, alterado ou compartilhado sem pedido explícito.



Login social

Habilitar Google e Facebook em Supabase Auth > Providers e autorizar /auth/callback como URL de redirect. A interface e o callback estão implementados, mas o fluxo depende dos providers configurados no Supabase.



Redes sociais

Os campos href de socialLinks em lib/config.ts ainda estão vazios. Os perfis são exibidos como pendentes, sem links inventados. Os antigos nomes de canais do Facebook foram removidos; configurar apenas os perfis sociais que serão usados.



Ainda Não Implementado

Disparo programado da newsletter conforme periodicidade e categorias. Hoje as preferências são armazenadas e há notificação da inscrição para o e-mail do portal; não há cron/worker para enviar ofertas aos assinantes.

Fluxo de descadastro/cancelamento da newsletter.

Pesquisa federada por APIs de marketplaces e sites afiliados. lib/marketplaces/index.ts é apenas uma interface e fetchProduct() retorna null.

Cadastro/gestão de anúncios pagos e regras de ranking patrocinado.

URLs reais de Instagram, TikTok, Facebook/X e das cinco páginas Facebook.

Limite de envios/rate limiting para newsletter e contato.

Estado Local a Preservar

O commit 810b413 está apenas local; não foi feito push. Permanecem fora dele e devem ser preservados:



utils/supabase.ts modificado localmente.

app/produto/ não rastreado.

atualizacao0510.md não rastreado.

docs/estado-atual.md não rastreado.

Não sobrescrever, apagar ou incluir esses caminhos em commits sem confirmação.



Próximas Etapas Sugeridas

Conferir se produtos.categoria continua relacionado a categorias.slug e aplicar as migrações no Supabase.

Configurar Resend e providers OAuth; preencher os URLs sociais reais.

Fazer testes de ponta a ponta de inscrição e contato em ambiente configurado.

Implementar descadastro e worker/cron para entregas segmentadas da newsletter.

Planejar integrações de pesquisa externa e anúncios com regras explícitas de transparência e prioridade comercial.


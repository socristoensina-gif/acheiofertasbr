# Planejamento do Admin

## Objetivo

Central de gerenciamento do Ache Ofertas BR para administrar o catálogo de ofertas, publicar conteúdo e acompanhar métricas operacionais.

## Estado atual

Já existe uma primeira área `/admin`: login por Supabase Auth com verificação de `ADMIN_EMAIL`, páginas de produtos e estatísticas, cadastro/edição, publicação/pausa e exclusão. As ações de escrita verificam autorização no servidor e usam a service role. Este documento planeja a evolução do painel; não afirma que a área administrativa ainda não existe.

Antes de ampliar o painel, validar os pontos de segurança em [checklist-seguranca-admin.md](./checklist-seguranca-admin.md) e confirmar no Supabase a estrutura completa de produtos e categorias.

## Recursos V1

- Autenticação segura integrada ao Supabase Auth.
- Dashboard com resumo operacional e métricas úteis.
- Cadastro e edição de produtos.
- Publicação e pausa, com estados e transições explícitos.
- Controle de status e autorização verificada em cada ação de servidor, não apenas na interface.

Parte do cadastro, edição, status e estatísticas já existe. Dashboard dedicado, definição final de status e critérios de segurança precisam ser fechados antes de iniciar o trabalho de V1.

O dashboard V1 deve resumir contagens de produtos por status e marketplace, cliques totais e produtos sem imagem/link a partir das colunas existentes. Preço, avaliação, vendas e mídia devem ser apresentados como dados informados pela origem; não há sincronização automática nesta fase. O campo `nome` continua sendo o título mostrado publicamente e não existe campo separado para o título original da loja.

## Recursos futuros

- Importação assistida por URL.
- Integração com APIs afiliadas dos marketplaces.
- Automações de atualização e verificação.
- Ranking inteligente e critérios transparentes.
- Campanhas patrocinadas sinalizadas para o público.

## Estrutura sugerida para evolução

Os caminhos abaixo são uma sugestão de organização futura, não arquivos ou pastas a criar nesta etapa:

```text
app/admin/          Rotas e layouts do painel (já existe)
components/admin/   Componentes específicos do painel
lib/admin/          Autorização, regras e serviços administrativos (parte já existe)
types/admin/        Tipos administrativos específicos, se necessários
```

Atualmente o formulário administrativo está em `components/admin-produto-form.tsx`, as ações em `app/admin/actions.ts` e a autorização em `lib/admin/auth.ts`. Evitar mover esses arquivos sem necessidade funcional e testes de regressão.

## Preparação para distribuição

O catálogo e o campo `slug` permitem compor um link do portal para compartilhamento. O schema atual não possui campos próprios para legendas por rede, roteiros, hashtags ou campanhas; nesta fase não criar colunas/tabelas, publicar automaticamente ou alegar que esses conteúdos estão armazenados. O modelo editorial e os fluxos de aprovação devem ser desenhados antes de propor persistência específica.

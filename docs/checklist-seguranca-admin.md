# Checklist de segurança antes de evoluir o Admin

Use este checklist como gate antes de ampliar o painel ou disponibilizá-lo para novos usuários. Os itens anotados como já existentes são controles observados no código, não uma certificação de segurança.

## Autenticação

- [x] Usar Supabase Auth para sessão e verificação de usuário no servidor.
- [x] Restringir o acesso atual pelo endereço configurado em `ADMIN_EMAIL`.
- [ ] Definir política de senha, recuperação, MFA e procedimento de revogação de acesso.
- [ ] Testar usuário ausente, sessão expirada, usuário não autorizado e erros do provedor em todas as páginas/ações.

## Autorização

- [x] Verificar usuário autorizado nas páginas do painel por `requireAdmin()`.
- [x] Verificar autorização novamente nas ações que alteram produtos.
- [ ] Se houver múltiplos administradores, substituir a allowlist singular por papéis/grupos e matriz de permissões explícita.
- [ ] Definir permissões por operação (ler, criar, editar, publicar, excluir) e aplicar no servidor.
- [ ] Verificar autorização antes de qualquer operação privilegiada; não confiar em controles de interface ou valores enviados pelo cliente.

## Proteção de rotas e ações

- [x] O layout do painel exige usuário autorizado; ações administrativas também fazem verificação no servidor.
- [ ] Revisar toda rota, Server Action, Route Handler e futura API administrativa para autenticação e autorização próprias.
- [ ] Definir resposta apropriada para acesso não autorizado, sem revelar existência de registros ou detalhes internos.
- [ ] Manter validação de entrada no servidor, incluindo status, categoria, identificadores e URLs externas.
- [ ] Confirmar a allowlist de destinos afiliados antes de persistir ou redirecionar para links externos.

## Variáveis de ambiente e service role

- [x] O cliente de service role está encapsulado para uso no servidor e sem persistência de sessão.
- [ ] Garantir que `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` e `RATE_LIMIT_SALT` existam somente em ambientes de servidor.
- [ ] Nunca prefixar segredos com `NEXT_PUBLIC_`, incluí-los em logs, documentação, screenshots ou artefatos de build.
- [ ] Separar chaves e configuração de desenvolvimento, preview e produção; revisar acessos na Vercel e no Supabase.
- [ ] Validar variáveis obrigatórias no deploy sem expor seus valores; manter `.env.local` fora do controle de versão.
- [ ] Incluir no `.env.example` as variáveis públicas opcionais e `ADMIN_EMAIL` que o código espera, sem valores secretos.

## Logs e auditoria

- [ ] Registrar operações administrativas relevantes (ator, ação, alvo e horário) com retenção definida.
- [ ] Não registrar tokens, senhas, chaves, IP bruto, dados pessoais desnecessários ou conteúdo integral de mensagens.
- [ ] Padronizar logs de falha com contexto seguro e identificadores de correlação.
- [ ] Definir monitoramento e alertas para tentativas de acesso, falhas repetidas e alterações sensíveis.

## Permissões Supabase e RLS

- [x] `newsletter_assinantes`, `contatos` e `rate_limits` têm RLS habilitado pelas migrations versionadas; migrations de formulário não criam políticas públicas.
- [x] `rate_limits` e a função `incrementar_rate_limit` restringem grants à `service_role`.
- [ ] Inspecionar no projeto Supabase as políticas efetivamente implantadas para todas as tabelas, especialmente `produtos`, `categorias` e `cliques`.
- [ ] Aplicar menor privilégio para `anon`, `authenticated` e `service_role`; verificar grants e policies para cada operação.
- [ ] Confirmar que operações com service role nunca são importadas ou executadas em componentes de cliente.
- [ ] Testar diretamente acesso permitido e negado com as roles anon, usuário autenticado comum e administrador.

## Critério de saída

Não ampliar o Admin para gestão multiusuário ou automações até que autorização, policies reais, ambiente de deploy e estratégia de auditoria tenham sido verificados e testados.

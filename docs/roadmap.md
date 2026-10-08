# Roadmap do projeto

Este roadmap registra a sequência de desenvolvimento pretendida. O escopo de cada fase deve ser detalhado antes de sua implementação.

## FASE 1 — Base pública atual

- Manter o catálogo público, categorias, busca, favoritos e redirecionamento com registro de cliques.
- Preservar os formulários de newsletter e contato, autenticação social opcional e páginas institucionais.
- Confirmar no Supabase os schemas base que não estão definidos pelas migrations versionadas e documentar a configuração dos serviços.
- Estado: base pública implementada; configurações remotas e detalhes do banco ainda dependem de conferência operacional.

## FASE 2 — Admin V1

- Evoluir o painel já existente com escopo funcional e controles de segurança acordados.
- Consolidar autenticação, autorização, dashboard, cadastro/edição/publicação e transições de status.
- Validar permissões, registros de auditoria, experiência de erro e comportamento em produção.
- Planejamento detalhado: [admin-planejamento.md](./admin-planejamento.md) e [checklist-seguranca-admin.md](./checklist-seguranca-admin.md).

## FASE 3 — Importação de produtos

- Projetar importação assistida a partir de URL, com validação, revisão humana e detecção de duplicidade.
- Definir fontes confiáveis, tratamento de falhas e atualização explícita dos dados antes de automatizar.

## FASE 4 — Integração com APIs de marketplaces

- Avaliar APIs oficiais e programas de afiliados para cada marketplace.
- Definir credenciais, limites, contratos, normalização de catálogo, preços e disponibilidade.
- Implementar integrações somente depois de validar termos de uso e comportamento de falha.

## FASE 5 — Inteligência e ranking

- Evoluir ranking com critérios explicáveis de relevância, qualidade e atualização.
- Planejar campanhas patrocinadas com identificação transparente e separação entre relevância e promoção.
- Usar métricas confiáveis do catálogo e dos cliques; definir monitoramento e revisão periódica.

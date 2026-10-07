BEGIN;

CREATE TABLE IF NOT EXISTS public.importacoes_ofertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_id text NOT NULL,
  tipo_importacao text NOT NULL DEFAULT 'link'
    CHECK (tipo_importacao IN ('link', 'api', 'arquivo')),
  url_origem text
    CHECK (url_origem IS NULL OR url_origem LIKE 'https://%'),
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN (
      'pendente',
      'processando',
      'importado',
      'erro',
      'aguardando_revisao'
    )),
  dados_brutos jsonb,
  dados_processados jsonb,
  erro text,
  afiliado_id uuid,
  oferta_id uuid,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz
);

COMMENT ON TABLE public.importacoes_ofertas IS
  'Registra entradas de importação de ofertas; os identificadores de afiliado, oferta e autor estão reservados para fases futuras.';
COMMENT ON COLUMN public.importacoes_ofertas.afiliado_id IS
  'Reservado para associação futura com afiliado; sem chave estrangeira nesta fase.';
COMMENT ON COLUMN public.importacoes_ofertas.oferta_id IS
  'Reservado para associação futura com produto_ofertas; sem chave estrangeira nesta fase.';
COMMENT ON COLUMN public.importacoes_ofertas.criado_por IS
  'Reservado para associação futura com o usuário que iniciou a importação; sem chave estrangeira nesta fase.';
COMMENT ON COLUMN public.importacoes_ofertas.dados_brutos IS
  'Nunca gravar credenciais, tokens ou cabeçalhos de requisição neste campo.';
COMMENT ON COLUMN public.importacoes_ofertas.erro IS
  'Mensagem curta e segura; nunca incluir credenciais, tokens ou cabeçalhos de requisição.';

CREATE INDEX IF NOT EXISTS importacoes_ofertas_status_criado_em_idx
  ON public.importacoes_ofertas (status, criado_em DESC);

ALTER TABLE public.importacoes_ofertas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.importacoes_ofertas FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.importacoes_ofertas TO service_role;

COMMIT;

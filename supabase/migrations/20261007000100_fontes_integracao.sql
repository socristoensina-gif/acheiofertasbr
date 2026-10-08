BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'marketplaces'
      AND column_name = 'id'
      AND data_type = 'text'
  ) THEN
    RAISE EXCEPTION
      'Expected public.marketplaces(id) with type text before creating fontes_integracao';
  END IF;
END;
$$;

CREATE TABLE public.fontes_integracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_id text REFERENCES public.marketplaces(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  tipo_integracao text NOT NULL CHECK (tipo_integracao IN ('API', 'LINK', 'MANUAL', 'N8N')),
  status text NOT NULL DEFAULT 'ativo',
  ultima_sincronizacao timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fontes_integracao_marketplace_id_idx
  ON public.fontes_integracao (marketplace_id);

ALTER TABLE public.fontes_integracao ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.fontes_integracao FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.fontes_integracao TO service_role;

CREATE POLICY fontes_integracao_acesso_servidor
  ON public.fontes_integracao
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;

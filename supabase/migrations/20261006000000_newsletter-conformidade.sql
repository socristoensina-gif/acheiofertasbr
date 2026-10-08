BEGIN;

ALTER TABLE public.newsletter_assinantes
  ADD COLUMN IF NOT EXISTS consentimento_texto text,
  ADD COLUMN IF NOT EXISTS consentimento_versao text,
  ADD COLUMN IF NOT EXISTS token_descadastro uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmado_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelado_em timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_assinantes_token_descadastro_uidx
  ON public.newsletter_assinantes (token_descadastro);

ALTER TABLE public.contatos
  ALTER COLUMN estado DROP NOT NULL,
  ALTER COLUMN cidade DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  chave text NOT NULL,
  janela timestamptz NOT NULL,
  contagem int NOT NULL DEFAULT 0,
  PRIMARY KEY (chave, janela)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.incrementar_rate_limit(
  p_chave text,
  p_janela timestamptz
)
RETURNS int
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  nova_contagem int;
BEGIN
  DELETE FROM public.rate_limits
  WHERE janela < p_janela - interval '24 hours';

  INSERT INTO public.rate_limits (chave, janela, contagem)
  VALUES (p_chave, p_janela, 1)
  ON CONFLICT (chave, janela)
  DO UPDATE SET contagem = public.rate_limits.contagem + 1
  RETURNING contagem INTO nova_contagem;

  RETURN nova_contagem;
END;
$$;

REVOKE ALL ON FUNCTION public.incrementar_rate_limit(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.incrementar_rate_limit(text, timestamptz) TO service_role;

COMMIT;
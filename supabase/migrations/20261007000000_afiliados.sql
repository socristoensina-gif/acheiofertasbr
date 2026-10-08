BEGIN;

CREATE TABLE public.afiliados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text,
  tipo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX afiliados_tipo_padrao_uidx
  ON public.afiliados (tipo)
  WHERE tipo = 'padrao';

INSERT INTO public.afiliados (nome, tipo, ativo)
VALUES ('Ache Ofertas BR', 'padrao', true)
ON CONFLICT (tipo) WHERE tipo = 'padrao' DO NOTHING;

ALTER TABLE public.afiliados ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.afiliados FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.afiliados TO service_role;

CREATE POLICY afiliados_acesso_servidor
  ON public.afiliados
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;

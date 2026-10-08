BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'produtos'
      AND column_name = 'id'
      AND data_type = 'uuid'
  ) THEN
    RAISE EXCEPTION
      'Expected public.produtos(id) with type uuid before creating produto_ofertas';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'marketplaces'
      AND column_name = 'id'
      AND data_type = 'text'
  ) THEN
    RAISE EXCEPTION
      'Expected public.marketplaces(id) with type text before creating produto_ofertas';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cliques'
  ) THEN
    RAISE EXCEPTION
      'Expected public.cliques before adding offer click references';
  END IF;
END;
$$;

CREATE TABLE public.produto_ofertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL
    REFERENCES public.produtos(id) ON DELETE CASCADE,
  marketplace_id text NOT NULL
    REFERENCES public.marketplaces(id) ON DELETE RESTRICT,
  afiliado_id uuid NOT NULL
    REFERENCES public.afiliados(id) ON DELETE RESTRICT,
  fonte_integracao_id uuid
    REFERENCES public.fontes_integracao(id) ON DELETE SET NULL,
  id_externo text,
  url_original text,
  link_afiliado text NOT NULL,
  titulo_original text,
  descricao_original text,
  imagem_original jsonb,
  video_original jsonb,
  preco_atual numeric CHECK (preco_atual IS NULL OR preco_atual >= 0),
  preco_anterior numeric CHECK (preco_anterior IS NULL OR preco_anterior >= 0),
  avaliacao numeric CHECK (avaliacao IS NULL OR avaliacao BETWEEN 0 AND 5),
  quantidade_vendas integer
    CHECK (quantidade_vendas IS NULL OR quantidade_vendas >= 0),
  disponibilidade boolean,
  comissao_interna numeric,
  ativo boolean NOT NULL DEFAULT true,
  principal boolean NOT NULL DEFAULT false,
  fonte_dados text,
  ultima_atualizacao timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX produto_ofertas_produto_id_idx
  ON public.produto_ofertas (produto_id);
CREATE INDEX produto_ofertas_marketplace_id_idx
  ON public.produto_ofertas (marketplace_id);
CREATE INDEX produto_ofertas_fonte_integracao_id_idx
  ON public.produto_ofertas (fonte_integracao_id);
CREATE INDEX produto_ofertas_ativas_preco_idx
  ON public.produto_ofertas (produto_id, preco_atual)
  WHERE ativo = true;
CREATE UNIQUE INDEX produto_ofertas_principal_uidx
  ON public.produto_ofertas (produto_id)
  WHERE principal = true;

ALTER TABLE public.cliques
  ADD COLUMN IF NOT EXISTS produto_oferta_id uuid,
  ADD COLUMN IF NOT EXISTS fonte_integracao_id uuid;

ALTER TABLE public.cliques
  ADD CONSTRAINT cliques_produto_oferta_id_fkey
    FOREIGN KEY (produto_oferta_id)
    REFERENCES public.produto_ofertas(id)
    ON DELETE SET NULL,
  ADD CONSTRAINT cliques_fonte_integracao_id_fkey
    FOREIGN KEY (fonte_integracao_id)
    REFERENCES public.fontes_integracao(id)
    ON DELETE SET NULL;

CREATE INDEX cliques_produto_oferta_id_idx
  ON public.cliques (produto_oferta_id);
CREATE INDEX cliques_fonte_integracao_id_idx
  ON public.cliques (fonte_integracao_id);

ALTER TABLE public.produto_ofertas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.produto_ofertas FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  produto_id,
  marketplace_id,
  preco_atual,
  preco_anterior,
  avaliacao,
  disponibilidade,
  ativo,
  principal,
  ultima_atualizacao
) ON TABLE public.produto_ofertas TO anon, authenticated;
GRANT ALL ON TABLE public.produto_ofertas TO service_role;

CREATE POLICY produto_ofertas_leitura_publica
  ON public.produto_ofertas
  FOR SELECT
  TO anon, authenticated
  USING (
    ativo = true
    AND EXISTS (
      SELECT 1
      FROM public.produtos
      WHERE produtos.id = produto_ofertas.produto_id
        AND produtos.status = 'publicado'
    )
  );

CREATE POLICY produto_ofertas_acesso_servidor
  ON public.produto_ofertas
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.selecionar_produto_oferta_principal(
  p_oferta_id uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_produto_id uuid;
BEGIN
  SELECT produto_id
  INTO v_produto_id
  FROM public.produto_ofertas
  WHERE id = p_oferta_id
    AND ativo = true
  FOR UPDATE;

  IF v_produto_id IS NULL THEN
    RAISE EXCEPTION 'Active product offer % was not found', p_oferta_id;
  END IF;

  UPDATE public.produto_ofertas
  SET principal = false
  WHERE produto_id = v_produto_id
    AND principal = true;

  UPDATE public.produto_ofertas
  SET principal = true
  WHERE id = p_oferta_id;
END;
$$;

REVOKE ALL ON FUNCTION public.selecionar_produto_oferta_principal(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.selecionar_produto_oferta_principal(uuid)
  TO service_role;

COMMIT;

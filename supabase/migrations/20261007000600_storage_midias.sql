BEGIN;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'produto-midias',
  'produto-midias',
  false,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'video/mp4',
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.produto_oferta_midias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_oferta_id uuid NOT NULL
    REFERENCES public.produto_ofertas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('imagem', 'video')),
  storage_path text,
  url_externa text,
  ordem smallint NOT NULL DEFAULT 0,
  principal boolean NOT NULL DEFAULT false,
  aprovado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT produto_oferta_midias_uma_origem_check
    CHECK ((storage_path IS NOT NULL) <> (url_externa IS NOT NULL)),
  CONSTRAINT produto_oferta_midias_url_https_check
    CHECK (url_externa IS NULL OR url_externa LIKE 'https://%'),
  CONSTRAINT produto_oferta_midias_path_check
    CHECK (
      storage_path IS NULL
      OR (
        (tipo = 'imagem'
          AND storage_path ~ '^image/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif|gif)$')
        OR (tipo = 'video'
          AND storage_path ~ '^video/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm)$')
      )
    ),
  CONSTRAINT produto_oferta_midias_ordem_por_tipo_check
    CHECK (
      (tipo = 'imagem' AND ordem BETWEEN 0 AND 4)
      OR (tipo = 'video' AND ordem BETWEEN 0 AND 1)
    )
);

CREATE INDEX IF NOT EXISTS produto_oferta_midias_oferta_tipo_ordem_idx
  ON public.produto_oferta_midias (produto_oferta_id, tipo, principal DESC, ordem);

CREATE UNIQUE INDEX IF NOT EXISTS produto_oferta_midias_storage_path_uidx
  ON public.produto_oferta_midias (storage_path)
  WHERE storage_path IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS produto_oferta_midias_principal_uidx
  ON public.produto_oferta_midias (produto_oferta_id, tipo)
  WHERE principal = true;

ALTER TABLE public.produto_oferta_midias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.produto_oferta_midias FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.produto_oferta_midias TO anon, authenticated;
GRANT ALL ON TABLE public.produto_oferta_midias TO service_role;

DROP POLICY IF EXISTS produto_oferta_midias_leitura_aprovada
  ON public.produto_oferta_midias;
CREATE POLICY produto_oferta_midias_leitura_aprovada
  ON public.produto_oferta_midias
  FOR SELECT
  TO anon, authenticated
  USING (
    aprovado = true
    AND EXISTS (
      SELECT 1
      FROM public.produto_ofertas AS ofertas
      JOIN public.produtos AS produtos
        ON produtos.id = ofertas.produto_id
      WHERE ofertas.id = produto_oferta_midias.produto_oferta_id
        AND ofertas.ativo = true
        AND produtos.status = 'publicado'
    )
  );

DROP POLICY IF EXISTS produto_oferta_midias_acesso_servidor
  ON public.produto_oferta_midias;
CREATE POLICY produto_oferta_midias_acesso_servidor
  ON public.produto_oferta_midias
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.salvar_produto_oferta_midias(
  p_produto_oferta_id uuid,
  p_midias jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_imagens integer;
  v_videos integer;
BEGIN
  IF jsonb_typeof(p_midias) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Media list must be a JSON array';
  END IF;

  PERFORM 1
  FROM public.produto_ofertas
  WHERE id = p_produto_oferta_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product offer % was not found', p_produto_oferta_id;
  END IF;

  SELECT
    count(*) FILTER (WHERE item ->> 'tipo' = 'imagem'),
    count(*) FILTER (WHERE item ->> 'tipo' = 'video')
  INTO v_imagens, v_videos
  FROM jsonb_array_elements(p_midias) AS media(item);

  IF v_imagens > 5 OR v_videos > 2 THEN
    RAISE EXCEPTION 'Media limits exceeded';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_midias) AS media(item)
    WHERE jsonb_typeof(item) IS DISTINCT FROM 'object'
      OR item ->> 'tipo' NOT IN ('imagem', 'video')
      OR (
        CASE WHEN nullif(item ->> 'storage_path', '') IS NULL THEN 0 ELSE 1 END
        + CASE WHEN nullif(item ->> 'url_externa', '') IS NULL THEN 0 ELSE 1 END
      ) <> 1
      OR (
        nullif(item ->> 'url_externa', '') IS NOT NULL
        AND item ->> 'url_externa' NOT LIKE 'https://%'
      )
      OR (
        item ? 'aprovado'
        AND jsonb_typeof(item -> 'aprovado') IS DISTINCT FROM 'boolean'
      )
  ) THEN
    RAISE EXCEPTION 'Invalid product offer media';
  END IF;

  DELETE FROM public.produto_oferta_midias
  WHERE produto_oferta_id = p_produto_oferta_id;

  INSERT INTO public.produto_oferta_midias (
    produto_oferta_id,
    tipo,
    storage_path,
    url_externa,
    ordem,
    principal,
    aprovado
  )
  SELECT
    p_produto_oferta_id,
    media.item ->> 'tipo',
    nullif(media.item ->> 'storage_path', ''),
    nullif(media.item ->> 'url_externa', ''),
    (row_number() OVER (
      PARTITION BY media.item ->> 'tipo'
      ORDER BY media.position
    ) - 1)::smallint,
    row_number() OVER (
      PARTITION BY media.item ->> 'tipo'
      ORDER BY media.position
    ) = 1,
    coalesce((media.item ->> 'aprovado')::boolean, false)
  FROM jsonb_array_elements(p_midias) WITH ORDINALITY AS media(item, position);
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_produto_oferta_midias(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_produto_oferta_midias(uuid, jsonb)
  TO service_role;

DROP POLICY IF EXISTS produto_midias_leitura_aprovada ON storage.objects;
CREATE POLICY produto_midias_leitura_aprovada
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'produto-midias'
    AND EXISTS (
      SELECT 1
      FROM public.produto_oferta_midias AS midias
      JOIN public.produto_ofertas AS ofertas
        ON ofertas.id = midias.produto_oferta_id
      JOIN public.produtos AS produtos
        ON produtos.id = ofertas.produto_id
      WHERE midias.storage_path = name
        AND midias.aprovado = true
        AND ofertas.ativo = true
        AND produtos.status = 'publicado'
    )
  );

DROP POLICY IF EXISTS produto_midias_gerenciamento_servidor
  ON storage.objects;
CREATE POLICY produto_midias_gerenciamento_servidor
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'produto-midias')
  WITH CHECK (bucket_id = 'produto-midias');

COMMIT;

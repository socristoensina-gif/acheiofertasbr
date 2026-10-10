BEGIN;

ALTER TABLE public.produto_ofertas
  ADD COLUMN IF NOT EXISTS video_primeiro boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.produto_ofertas.video_primeiro IS
  'Quando true, o vídeo aparece como primeira mídia da galeria pública.';

COMMIT;

BEGIN;

UPDATE public.categorias AS categoria
SET nome = novas.nome
FROM (VALUES
  ('Moda e Vestuário', 'moda-vestuario'),
  ('Eletrônicos e Celulares', 'eletronicos-celulares'),
  ('Beleza e Cuidado Pessoal', 'beleza-cuidado-pessoal'),
  ('Eletrodomésticos', 'eletrodomesticos'),
  ('Esportes e Fitness', 'esportes-fitness'),
  ('Casa, Utilidades e Decoração', 'casa-utilidades-decoracao'),
  ('Máquinas e Peças', 'maquinas-pecas')
) AS novas(nome, slug)
WHERE categoria.slug = novas.slug;

INSERT INTO public.categorias (nome, slug)
SELECT novas.nome, novas.slug
FROM (VALUES
  ('Moda e Vestuário', 'moda-vestuario'),
  ('Eletrônicos e Celulares', 'eletronicos-celulares'),
  ('Beleza e Cuidado Pessoal', 'beleza-cuidado-pessoal'),
  ('Eletrodomésticos', 'eletrodomesticos'),
  ('Esportes e Fitness', 'esportes-fitness'),
  ('Casa, Utilidades e Decoração', 'casa-utilidades-decoracao'),
  ('Máquinas e Peças', 'maquinas-pecas')
) AS novas(nome, slug)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categorias AS existente
  WHERE existente.slug = novas.slug
);

COMMIT;
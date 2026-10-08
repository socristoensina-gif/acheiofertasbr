BEGIN;

CREATE TABLE IF NOT EXISTS public.newsletter_assinantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  categorias text[] NOT NULL,
  periodicidade text NOT NULL CHECK (periodicidade IN ('diaria', 'semanal', 'quinzenal', 'mensal')),
  termos_aceitos_em timestamptz NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL,
  estado char(2) NOT NULL,
  cidade text NOT NULL,
  motivo text NOT NULL CHECK (motivo IN ('sugestao', 'reclamacao', 'pedido', 'parceria_midia')),
  mensagem text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_assinantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;

COMMIT;
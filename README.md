\# Ache Ofertas BR



Plataforma inteligente de curadoria de ofertas.



\## Objetivo



Conectar consumidores às melhores ofertas de marketplaces como:



\- Shopee

\- Amazon

\- Mercado Livre

\- Outros



\## Tecnologia



Frontend:

Next.js



Banco:

Supabase



Hospedagem:

Vercel



Automação:

n8n



IA:

Ollama

## Newsletter e contato

Antes de ativar os formulários:

1. Depois de revisar `supabase migration list`, aplique as migrations versionadas em `supabase/migrations/` com o Supabase CLI.
2. Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_NOTIFY_EMAIL` e um segredo aleatório em `RATE_LIMIT_SALT` no ambiente do servidor. O domínio do remetente precisa estar verificado no Resend; `CONTACT_NOTIFY_EMAIL` recebe as notificações dos formulários.
3. O login Google/Facebook fica desligado por padrão. Para habilitá-lo, configure `NEXT_PUBLIC_LOGIN_SOCIAL=true`, ative os providers em **Supabase Auth > Providers** e permita a URL `/auth/callback` na lista de redirects do projeto.
4. Informe os links reais de Instagram, TikTok, Facebook e X, além dos cinco canais do Facebook, em `lib/config.ts`. Os campos começam vazios para evitar links incorretos.

As listas de municípios do formulário de contato são carregadas da API pública de Localidades do IBGE.

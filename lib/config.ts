export const SITE_CONFIG = {
  topMessage: "Ofertas selecionadas para você",
  socialLinks: [
    { name: "Facebook", platform: "Facebook", href: "" },
    { name: "Instagram", platform: "Instagram", href: "" },
    { name: "TikTok", platform: "TikTok", href: "" },
    { name: "X", platform: "X", href: "" },
  ],
  facebookPages: [
    { name: "Face Compras", href: "" },
    { name: "Tech Boa Dica", href: "" },
    { name: "Crianças e Brinquedos", href: "" },
    { name: "AutoEstima", href: "" },
    { name: "Achados do Mestre", href: "" },
  ],
};

export const CATEGORIES = [
  { nome: "Moda e Vestuário", slug: "moda-vestuario" },
  { nome: "Eletrônicos e Celulares", slug: "eletronicos-celulares" },
  { nome: "Beleza e Cuidado Pessoal", slug: "beleza-cuidado-pessoal" },
  { nome: "Eletrodomésticos", slug: "eletrodomesticos" },
  { nome: "Esportes e Fitness", slug: "esportes-fitness" },
  { nome: "Casa, Utilidades e Decoração", slug: "casa-utilidades-decoracao" },
  { nome: "Máquinas e Peças", slug: "maquinas-pecas" },
] as const;

export const CATEGORY_SLUGS = CATEGORIES.map((categoria) => categoria.slug);

export const CATEGORY_ICONS: Record<string, string> = {
  "moda-vestuario": "👕",
  "eletronicos-celulares": "📱",
  "beleza-cuidado-pessoal": "🧴",
  eletrodomesticos: "🧊",
  "esportes-fitness": "🏋️",
  "casa-utilidades-decoracao": "🛋️",
  "maquinas-pecas": "⚙️",
};

export const WHATSAPP_CHANNEL_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL ||
  "https://whatsapp.com/channel/0029VbDx14qDTkKBmzT7d017";
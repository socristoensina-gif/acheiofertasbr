export const CATEGORIAS = [
  { slug: "moda-vestuario", nome: "Moda e Vestuário", ordem: 1, icone: "👕" },
  { slug: "eletronicos-celulares", nome: "Eletrônicos e Celulares", ordem: 2, icone: "📱" },
  { slug: "beleza-cuidado-pessoal", nome: "Beleza e Cuidado Pessoal", ordem: 3, icone: "🧴" },
  { slug: "eletrodomesticos", nome: "Eletrodomésticos", ordem: 4, icone: "🧊" },
  { slug: "esportes-fitness", nome: "Esportes e Fitness", ordem: 5, icone: "🏋️" },
  { slug: "casa-utilidades-decoracao", nome: "Casa, Utilidades e Decoração", ordem: 6, icone: "🛋️" },
  { slug: "maquinas-pecas", nome: "Máquinas e Peças", ordem: 7, icone: "⚙️" },
] as const;

export type CategoriaSlug = (typeof CATEGORIAS)[number]["slug"];

export const SLUGS_CATEGORIAS = CATEGORIAS.map((categoria) => categoria.slug);

export function isCategoriaSlug(slug: string): slug is CategoriaSlug {
  return CATEGORIAS.some((categoria) => categoria.slug === slug);
}
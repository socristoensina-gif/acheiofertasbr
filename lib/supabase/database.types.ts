export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type CategoriaRow = {
  slug: string;
  nome: string;
  ordem: number | null;
};

type ProdutoRow = {
  id: string;
  slug: string;
  nome: string;
  categoria: string;
  marketplace: string;
  id_externo: string | null;
  link_afiliado: string;
  imagem: string | null;
  video: string | null;
  descricao: string | null;
  beneficios: Json | null;
  preco_atual: number;
  preco_antigo: number | null;
  avaliacao: number | null;
  vendas: number | null;
  status: string;
  destaque: boolean;
  atualizado_em: string | null;
  criado_em: string | null;
  verificado_em: string | null;
  falhas_verificacao: number | null;
  fonte_dados: string | null;
};

type CliqueRow = {
  id: string;
  produto_id: string;
  origem: string | null;
  marketplace: string;
  user_agent: string | null;
  criado_em: string;
};

type NewsletterAssinanteRow = {
  id: string;
  nome: string;
  email: string;
  categorias: string[];
  periodicidade: "diaria" | "semanal" | "quinzenal" | "mensal";
  termos_aceitos_em: string;
  criado_em: string;
  atualizado_em: string;
};

type ContatoRow = {
  id: string;
  nome: string;
  email: string;
  estado: string;
  cidade: string;
  motivo: "sugestao" | "reclamacao" | "pedido" | "parceria_midia";
  mensagem: string;
  criado_em: string;
};

export type Database = {
  public: {
    Tables: {
      categorias: Table<
        CategoriaRow,
        { slug: string; nome: string; ordem?: number | null },
        { slug?: string; nome?: string; ordem?: number | null }
      >;
      produtos: Table<
        ProdutoRow,
        {
          id?: string;
          slug: string;
          nome: string;
          categoria: string;
          marketplace: string;
          id_externo?: string | null;
          link_afiliado: string;
          imagem?: string | null;
          video?: string | null;
          descricao?: string | null;
          beneficios?: Json | null;
          preco_atual: number;
          preco_antigo: number | null;
          avaliacao?: number | null;
          vendas?: number | null;
          status: string;
          destaque: boolean;
          atualizado_em?: string | null;
          criado_em?: string | null;
          verificado_em?: string | null;
          falhas_verificacao?: number | null;
          fonte_dados?: string | null;
        }
      >;
      cliques: Table<
        CliqueRow,
        Omit<CliqueRow, "id" | "criado_em"> & { id?: string; criado_em?: string }
      >;
      newsletter_assinantes: Table<
        NewsletterAssinanteRow,
        Omit<NewsletterAssinanteRow, "id" | "criado_em" | "atualizado_em"> & {
          id?: string;
          criado_em?: string;
          atualizado_em?: string;
        }
      >;
      contatos: Table<
        ContatoRow,
        Omit<ContatoRow, "id" | "criado_em"> & { id?: string; criado_em?: string }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
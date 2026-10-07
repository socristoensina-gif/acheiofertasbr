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

type ImportacaoOfertaRow = {
  id: string;
  marketplace_id: string;
  tipo_importacao: "link" | "api" | "arquivo";
  url_origem: string | null;
  status: "pendente" | "processando" | "importado" | "erro" | "aguardando_revisao";
  dados_brutos: Json | null;
  dados_processados: Json | null;
  erro: string | null;
  afiliado_id: string | null;
  oferta_id: string | null;
  criado_por: string | null;
  criado_em: string;
  processado_em: string | null;
};
type NewsletterAssinanteRow = {
  id: string;
  nome: string;
  email: string;
  categorias: string[];
  periodicidade: "diaria" | "semanal" | "quinzenal" | "mensal";
  termos_aceitos_em: string;
  consentimento_texto: string | null;
  consentimento_versao: string | null;
  token_descadastro: string;
  confirmado_em: string | null;
  cancelado_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

type ContatoRow = {
  id: string;
  nome: string;
  email: string;
  estado: string | null;
  cidade: string | null;
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
      importacoes_ofertas: Table<
        ImportacaoOfertaRow,
        {
          id?: string;
          marketplace_id: string;
          tipo_importacao?: ImportacaoOfertaRow["tipo_importacao"];
          url_origem?: string | null;
          status?: ImportacaoOfertaRow["status"];
          dados_brutos?: Json | null;
          dados_processados?: Json | null;
          erro?: string | null;
          afiliado_id?: string | null;
          oferta_id?: string | null;
          criado_por?: string | null;
          criado_em?: string;
          processado_em?: string | null;
        }
      >;      newsletter_assinantes: Table<
        NewsletterAssinanteRow,
        Omit<NewsletterAssinanteRow, "id" | "criado_em" | "atualizado_em" | "token_descadastro" | "consentimento_texto" | "consentimento_versao" | "confirmado_em" | "cancelado_em"> & {
          id?: string;
          criado_em?: string;
          atualizado_em?: string;
          token_descadastro?: string;
          consentimento_texto?: string | null;
          consentimento_versao?: string | null;
          confirmado_em?: string | null;
          cancelado_em?: string | null;
        }
      >;
      contatos: Table<
        ContatoRow,
        Omit<ContatoRow, "id" | "criado_em" | "estado" | "cidade"> & {
          id?: string;
          criado_em?: string;
          estado?: string | null;
          cidade?: string | null;
        }
      >;
      rate_limits: Table<
        { chave: string; janela: string; contagem: number },
        { chave: string; janela: string; contagem?: number }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      incrementar_rate_limit: {
        Args: { p_chave: string; p_janela: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
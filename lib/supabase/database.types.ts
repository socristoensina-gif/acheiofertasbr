export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<
  Row,
  Insert,
  Update = Partial<Insert>,
  Relationships extends Relationship[] = [],
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

type FonteIntegracaoRelationships = [
  {
    foreignKeyName: "fontes_integracao_marketplace_id_fkey";
    columns: ["marketplace_id"];
    isOneToOne: false;
    referencedRelation: "marketplaces";
    referencedColumns: ["id"];
  },
];

type ProdutoOfertaRelationships = [
  {
    foreignKeyName: "produto_ofertas_produto_id_fkey";
    columns: ["produto_id"];
    isOneToOne: false;
    referencedRelation: "produtos";
    referencedColumns: ["id"];
  },
  {
    foreignKeyName: "produto_ofertas_marketplace_id_fkey";
    columns: ["marketplace_id"];
    isOneToOne: false;
    referencedRelation: "marketplaces";
    referencedColumns: ["id"];
  },
  {
    foreignKeyName: "produto_ofertas_afiliado_id_fkey";
    columns: ["afiliado_id"];
    isOneToOne: false;
    referencedRelation: "afiliados";
    referencedColumns: ["id"];
  },
  {
    foreignKeyName: "produto_ofertas_fonte_integracao_id_fkey";
    columns: ["fonte_integracao_id"];
    isOneToOne: false;
    referencedRelation: "fontes_integracao";
    referencedColumns: ["id"];
  },
];

type CliqueRelationships = [
  {
    foreignKeyName: "cliques_produto_oferta_id_fkey";
    columns: ["produto_oferta_id"];
    isOneToOne: false;
    referencedRelation: "produto_ofertas";
    referencedColumns: ["id"];
  },
  {
    foreignKeyName: "cliques_fonte_integracao_id_fkey";
    columns: ["fonte_integracao_id"];
    isOneToOne: false;
    referencedRelation: "fontes_integracao";
    referencedColumns: ["id"];
  },
];

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
  preco_atual: number | null;
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
  produto_oferta_id: string | null;
  fonte_integracao_id: string | null;
  origem: string | null;
  marketplace: string;
  user_agent: string | null;
  criado_em: string;
};

type AfiliadoRow = {
  id: string;
  nome: string;
  email: string | null;
  tipo: string;
  ativo: boolean;
  criado_em: string;
};

type FonteIntegracaoRow = {
  id: string;
  marketplace_id: string | null;
  nome: string;
  tipo_integracao: "API" | "LINK" | "MANUAL" | "N8N";
  status: string;
  ultima_sincronizacao: string | null;
  criado_em: string;
};

type ProdutoOfertaRow = {
  id: string;
  produto_id: string;
  marketplace_id: string;
  afiliado_id: string;
  fonte_integracao_id: string | null;
  id_externo: string | null;
  url_original: string | null;
  link_afiliado: string;
  titulo_original: string | null;
  descricao_original: string | null;
  imagem_original: Json | null;
  video_original: Json | null;
  preco_atual: number | null;
  preco_anterior: number | null;
  avaliacao: number | null;
  quantidade_vendas: number | null;
  disponibilidade: boolean | null;
  comissao_interna: number | null;
  ativo: boolean;
  principal: boolean;
  fonte_dados: string | null;
  ultima_atualizacao: string;
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
          preco_atual: number | null;
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
      marketplaces: Table<
        { id: string; nome: string; ativo: boolean },
        { id: string; nome: string; ativo?: boolean },
        Partial<{ id: string; nome: string; ativo: boolean }>
      >;
      cliques: Table<
        CliqueRow,
        Omit<CliqueRow, "id" | "criado_em" | "produto_oferta_id" | "fonte_integracao_id"> & {
          id?: string;
          criado_em?: string;
          produto_oferta_id?: string | null;
          fonte_integracao_id?: string | null;
        },
        Partial<Omit<CliqueRow, "id" | "criado_em">>,
        CliqueRelationships
      >;
      afiliados: Table<
        AfiliadoRow,
        {
          id?: string;
          nome: string;
          email?: string | null;
          tipo: string;
          ativo?: boolean;
          criado_em?: string;
        }
      >;
      fontes_integracao: Table<
        FonteIntegracaoRow,
        {
          id?: string;
          marketplace_id?: string | null;
          nome: string;
          tipo_integracao: FonteIntegracaoRow["tipo_integracao"];
          status?: string;
          ultima_sincronizacao?: string | null;
          criado_em?: string;
        },
        Partial<{
          marketplace_id: string | null;
          nome: string;
          tipo_integracao: FonteIntegracaoRow["tipo_integracao"];
          status: string;
          ultima_sincronizacao: string | null;
        }>,
        FonteIntegracaoRelationships
      >;
      produto_ofertas: Table<
        ProdutoOfertaRow,
        {
          id?: string;
          produto_id: string;
          marketplace_id: string;
          afiliado_id: string;
          fonte_integracao_id?: string | null;
          id_externo?: string | null;
          url_original?: string | null;
          link_afiliado: string;
          titulo_original?: string | null;
          descricao_original?: string | null;
          imagem_original?: Json | null;
          video_original?: Json | null;
          preco_atual?: number | null;
          preco_anterior?: number | null;
          avaliacao?: number | null;
          quantidade_vendas?: number | null;
          disponibilidade?: boolean | null;
          comissao_interna?: number | null;
          ativo?: boolean;
          principal?: boolean;
          fonte_dados?: string | null;
          ultima_atualizacao?: string;
          criado_em?: string;
        },
        Partial<Omit<ProdutoOfertaRow, "id" | "criado_em">>,
        ProdutoOfertaRelationships
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
        },
        Partial<Omit<ImportacaoOfertaRow, "id" | "criado_em">>
      >;
      newsletter_assinantes: Table<
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
      selecionar_produto_oferta_principal: {
        Args: { p_oferta_id: string };
        Returns: undefined;
      };
      incrementar_rate_limit: {
        Args: { p_chave: string; p_janela: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
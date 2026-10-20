export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academy_content: {
        Row: {
          capa_url: string | null
          criado_em: string
          descricao: string
          id: string
          tipo: string
          titulo: string
          url_conteudo: string
        }
        Insert: {
          capa_url?: string | null
          criado_em?: string
          descricao: string
          id?: string
          tipo: string
          titulo: string
          url_conteudo: string
        }
        Update: {
          capa_url?: string | null
          criado_em?: string
          descricao?: string
          id?: string
          tipo?: string
          titulo?: string
          url_conteudo?: string
        }
        Relationships: []
      }
      dentist_lab_links: {
        Row: {
          criado_em: string
          dentist_id: string
          id: string
          lab_id: string
        }
        Insert: {
          criado_em?: string
          dentist_id: string
          id?: string
          lab_id: string
        }
        Update: {
          criado_em?: string
          dentist_id?: string
          id?: string
          lab_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dentist_lab_links_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dentist_lab_links_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      dentists: {
        Row: {
          criado_em: string
          cro: string | null
          email: string
          id: string
          lab_id: string | null
          nome: string
          revisao_status: string
          telefone: string | null
          uf: string | null
          user_id: string | null
        }
        Insert: {
          criado_em?: string
          cro?: string | null
          email: string
          id?: string
          lab_id?: string | null
          nome: string
          revisao_status?: string
          telefone?: string | null
          uf?: string | null
          user_id?: string | null
        }
        Update: {
          criado_em?: string
          cro?: string | null
          email?: string
          id?: string
          lab_id?: string | null
          nome?: string
          revisao_status?: string
          telefone?: string | null
          uf?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dentists_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_members: {
        Row: {
          id: string
          lab_id: string
          user_id: string
        }
        Insert: {
          id?: string
          lab_id: string
          user_id: string
        }
        Update: {
          id?: string
          lab_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_members_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          asaas_wallet_id: string | null
          assinatura_status: string
          cep: string | null
          cnpj: string | null
          comissao_percentual: number
          cor_destaque: string
          criado_em: string
          email_contato: string | null
          endereco: string | null
          endereco_numero: string | null
          id: string
          logo_url: string | null
          modo_recebimento: string
          nome: string
          responsavel: string | null
          revisao_status: string
          subdominio: string
          telefone: string | null
          visivel_diretorio: boolean
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          asaas_wallet_id?: string | null
          assinatura_status?: string
          cep?: string | null
          cnpj?: string | null
          comissao_percentual?: number
          cor_destaque?: string
          criado_em?: string
          email_contato?: string | null
          endereco?: string | null
          endereco_numero?: string | null
          id?: string
          logo_url?: string | null
          modo_recebimento?: string
          nome: string
          responsavel?: string | null
          revisao_status?: string
          subdominio: string
          telefone?: string | null
          visivel_diretorio?: boolean
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          asaas_wallet_id?: string | null
          assinatura_status?: string
          cep?: string | null
          cnpj?: string | null
          comissao_percentual?: number
          cor_destaque?: string
          criado_em?: string
          email_contato?: string | null
          endereco?: string | null
          endereco_numero?: string | null
          id?: string
          logo_url?: string | null
          modo_recebimento?: string
          nome?: string
          responsavel?: string | null
          revisao_status?: string
          subdominio?: string
          telefone?: string | null
          visivel_diretorio?: boolean
        }
        Relationships: []
      }
      benefits: {
        Row: {
          capa_url: string | null
          criado_em: string
          cupom: string | null
          descricao: string
          id: string
          titulo: string
          url_conteudo: string
        }
        Insert: {
          capa_url?: string | null
          criado_em?: string
          cupom?: string | null
          descricao: string
          id?: string
          titulo: string
          url_conteudo: string
        }
        Update: {
          capa_url?: string | null
          criado_em?: string
          cupom?: string | null
          descricao?: string
          id?: string
          titulo?: string
          url_conteudo?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          asaas_payment_id: string | null
          cor: string | null
          criado_em: string
          cro_pendente: string | null
          data_desejada: string | null
          dentes: string[] | null
          dentist_id: string | null
          id: string
          lab_id: string
          material: string | null
          nome_dentista_pendente: string | null
          observacoes: string | null
          paciente: string | null
          product_id: string
          status: string
          uf_pendente: string | null
          unidades: number | null
          urgente: boolean
          valor: number
        }
        Insert: {
          asaas_payment_id?: string | null
          cor?: string | null
          criado_em?: string
          cro_pendente?: string | null
          data_desejada?: string | null
          dentes?: string[] | null
          dentist_id?: string | null
          id?: string
          lab_id: string
          material?: string | null
          nome_dentista_pendente?: string | null
          observacoes?: string | null
          paciente?: string | null
          product_id: string
          status?: string
          uf_pendente?: string | null
          unidades?: number | null
          urgente?: boolean
          valor: number
        }
        Update: {
          asaas_payment_id?: string | null
          cor?: string | null
          criado_em?: string
          cro_pendente?: string | null
          data_desejada?: string | null
          dentes?: string[] | null
          dentist_id?: string | null
          id?: string
          lab_id?: string
          material?: string | null
          nome_dentista_pendente?: string | null
          observacoes?: string | null
          paciente?: string | null
          product_id?: string
          status?: string
          uf_pendente?: string | null
          unidades?: number | null
          urgente?: boolean
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_files: {
        Row: {
          content_type: string | null
          criado_em: string
          enviado_por: string
          id: string
          nome_original: string
          order_id: string
          storage_path: string
          tamanho_bytes: number
          tipo: string
        }
        Insert: {
          content_type?: string | null
          criado_em?: string
          enviado_por?: string
          id?: string
          nome_original: string
          order_id: string
          storage_path: string
          tamanho_bytes: number
          tipo: string
        }
        Update: {
          content_type?: string | null
          criado_em?: string
          enviado_por?: string
          id?: string
          nome_original?: string
          order_id?: string
          storage_path?: string
          tamanho_bytes?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          autor: string | null
          criado_em: string
          de_status: string | null
          descricao: string
          id: string
          order_id: string
          para_status: string | null
          tipo: "status" | "arquivo"
        }
        Insert: {
          autor?: string | null
          criado_em?: string
          de_status?: string | null
          descricao: string
          id?: string
          order_id: string
          para_status?: string | null
          tipo: "status" | "arquivo"
        }
        Update: {
          autor?: string | null
          criado_em?: string
          de_status?: string | null
          descricao?: string
          id?: string
          order_id?: string
          para_status?: string | null
          tipo?: "status" | "arquivo"
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          arquivos_obrigatorios: string[]
          ativo: boolean
          campos_pedido: Json
          criado_em: string
          descricao: string | null
          id: string
          lab_id: string
          materiais: string[]
          nome: string
          prazo_dias: number
          preco: number
        }
        Insert: {
          arquivos_obrigatorios?: string[]
          ativo?: boolean
          campos_pedido?: Json
          criado_em?: string
          descricao?: string | null
          id?: string
          lab_id: string
          materiais?: string[]
          nome: string
          prazo_dias?: number
          preco: number
        }
        Update: {
          arquivos_obrigatorios?: string[]
          ativo?: boolean
          campos_pedido?: Json
          criado_em?: string
          descricao?: string | null
          id?: string
          lab_id?: string
          materiais?: string[]
          nome?: string
          prazo_dias?: number
          preco?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "lab" | "dentist"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "lab", "dentist"],
    },
  },
} as const

export type CampoEstado = "desligado" | "opcional" | "obrigatorio";

export type CamposPedido = {
  dentes: CampoEstado;
  cor: CampoEstado;
  material: CampoEstado;
  unidades: CampoEstado;
  data_desejada: CampoEstado;
  observacoes: CampoEstado;
  urgente: CampoEstado;
};

export const DEFAULT_CAMPOS_PEDIDO: CamposPedido = {
  dentes: "opcional",
  cor: "opcional",
  material: "desligado",
  unidades: "desligado",
  data_desejada: "opcional",
  observacoes: "opcional",
  urgente: "desligado",
};

export type OrderEvent = Database["public"]["Tables"]["order_events"]["Row"];
export type OrderFile = Database["public"]["Tables"]["order_files"]["Row"];



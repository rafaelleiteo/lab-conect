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
          comissao_percentual: number
          cor_destaque: string
          criado_em: string
          id: string
          logo_url: string | null
          modo_recebimento: string
          nome: string
          revisao_status: string
          subdominio: string
          visivel_diretorio: boolean
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          asaas_wallet_id?: string | null
          assinatura_status?: string
          comissao_percentual?: number
          cor_destaque?: string
          criado_em?: string
          id?: string
          logo_url?: string | null
          modo_recebimento?: string
          nome: string
          revisao_status?: string
          subdominio: string
          visivel_diretorio?: boolean
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          asaas_wallet_id?: string | null
          assinatura_status?: string
          comissao_percentual?: number
          cor_destaque?: string
          criado_em?: string
          id?: string
          logo_url?: string | null
          modo_recebimento?: string
          nome?: string
          revisao_status?: string
          subdominio?: string
          visivel_diretorio?: boolean
        }
        Relationships: []
      }
      orders: {
        Row: {
          asaas_payment_id: string | null
          criado_em: string
          dentist_id: string
          id: string
          lab_id: string
          paciente: string | null
          product_id: string
          status: string
          valor: number
        }
        Insert: {
          asaas_payment_id?: string | null
          criado_em?: string
          dentist_id: string
          id?: string
          lab_id: string
          paciente?: string | null
          product_id: string
          status?: string
          valor: number
        }
        Update: {
          asaas_payment_id?: string | null
          criado_em?: string
          dentist_id?: string
          id?: string
          lab_id?: string
          paciente?: string | null
          product_id?: string
          status?: string
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
      products: {
        Row: {
          arquivos_obrigatorios: string[]
          ativo: boolean
          criado_em: string
          id: string
          lab_id: string
          nome: string
          prazo_dias: number
          preco: number
        }
        Insert: {
          arquivos_obrigatorios?: string[]
          ativo?: boolean
          criado_em?: string
          id?: string
          lab_id: string
          nome: string
          prazo_dias?: number
          preco: number
        }
        Update: {
          arquivos_obrigatorios?: string[]
          ativo?: boolean
          criado_em?: string
          id?: string
          lab_id?: string
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

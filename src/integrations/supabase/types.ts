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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      email_processing_log: {
        Row: {
          created_at: string | null
          email_from: string | null
          email_subject: string | null
          email_uid: string
          id: string
          nfe_keys: string[] | null
          organization_id: string
          processed_at: string | null
          reason: string | null
          status: string
          xmls_count: number | null
        }
        Insert: {
          created_at?: string | null
          email_from?: string | null
          email_subject?: string | null
          email_uid: string
          id?: string
          nfe_keys?: string[] | null
          organization_id: string
          processed_at?: string | null
          reason?: string | null
          status: string
          xmls_count?: number | null
        }
        Update: {
          created_at?: string | null
          email_from?: string | null
          email_subject?: string | null
          email_uid?: string
          id?: string
          nfe_keys?: string[] | null
          organization_id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string
          xmls_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_processing_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_id: string | null
          member_invitation_id: string | null
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_id?: string | null
          member_invitation_id?: string | null
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_id?: string | null
          member_invitation_id?: string | null
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "email_verification_codes_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_verification_codes_member_invitation_id_fkey"
            columns: ["member_invitation_id"]
            isOneToOne: false
            referencedRelation: "member_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          created_at: string | null
          due_date: string | null
          id: string
          installment_number: number
          organization_id: string
          paid_at: string | null
          sale_id: string
          status: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          installment_number: number
          organization_id: string
          paid_at?: string | null
          sale_id: string
          status?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          installment_number?: number
          organization_id?: string
          paid_at?: string | null
          sale_id?: string
          status?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "installments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          base_commission_pct: number | null
          base_price: number | null
          created_at: string | null
          id: string
          internal_code: string | null
          model_name: string
          organization_id: string
          quantity: number | null
        }
        Insert: {
          base_commission_pct?: number | null
          base_price?: number | null
          created_at?: string | null
          id?: string
          internal_code?: string | null
          model_name: string
          organization_id: string
          quantity?: number | null
        }
        Update: {
          base_commission_pct?: number | null
          base_price?: number | null
          created_at?: string | null
          id?: string
          internal_code?: string | null
          model_name?: string
          organization_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          last_sent_at: string | null
          organization_name: string | null
          status: string | null
          token: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          last_sent_at?: string | null
          organization_name?: string | null
          status?: string | null
          token?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          last_sent_at?: string | null
          organization_name?: string | null
          status?: string | null
          token?: string | null
        }
        Relationships: []
      }
      member_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          guest_name: string | null
          id: string
          invited_by: string
          last_sent_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          guest_name?: string | null
          id?: string
          invited_by: string
          last_sent_at?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          guest_name?: string | null
          id?: string
          invited_by?: string
          last_sent_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean | null
          automation_active: boolean | null
          created_at: string | null
          id: string
          imap_allowed_domains: string[] | null
          imap_allowed_emails: string[] | null
          imap_host: string | null
          imap_password: string | null
          imap_port: number | null
          imap_user: string | null
          name: string
          slug: string
        }
        Insert: {
          active?: boolean | null
          automation_active?: boolean | null
          created_at?: string | null
          id?: string
          imap_allowed_domains?: string[] | null
          imap_allowed_emails?: string[] | null
          imap_host?: string | null
          imap_password?: string | null
          imap_port?: number | null
          imap_user?: string | null
          name: string
          slug: string
        }
        Update: {
          active?: boolean | null
          automation_active?: boolean | null
          created_at?: string | null
          id?: string
          imap_allowed_domains?: string[] | null
          imap_allowed_emails?: string[] | null
          imap_host?: string | null
          imap_password?: string | null
          imap_port?: number | null
          imap_user?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          client_cnpj: string | null
          client_name: string | null
          commission_calculated: number | null
          created_at: string | null
          emission_date: string | null
          emitente_cnpj: string | null
          emitente_nome: string | null
          emitente_uf: string | null
          icms: number | null
          id: string
          internal_seller_id: string | null
          ir_csll: number | null
          nfe_email_from: string | null
          nfe_filename: string | null
          nfe_key: string | null
          nfe_model: string | null
          nfe_number: string | null
          nfe_processed_at: string | null
          nfe_series: string | null
          organization_id: string
          over_price: number | null
          payment_method: string | null
          pis_cofins: number | null
          representative_id: string | null
          status: string | null
          table_value: number | null
          total_ipi: number | null
          total_produtos: number | null
          total_value: number | null
          uf_destiny: string | null
        }
        Insert: {
          client_cnpj?: string | null
          client_name?: string | null
          commission_calculated?: number | null
          created_at?: string | null
          emission_date?: string | null
          emitente_cnpj?: string | null
          emitente_nome?: string | null
          emitente_uf?: string | null
          icms?: number | null
          id?: string
          internal_seller_id?: string | null
          ir_csll?: number | null
          nfe_email_from?: string | null
          nfe_filename?: string | null
          nfe_key?: string | null
          nfe_model?: string | null
          nfe_number?: string | null
          nfe_processed_at?: string | null
          nfe_series?: string | null
          organization_id: string
          over_price?: number | null
          payment_method?: string | null
          pis_cofins?: number | null
          representative_id?: string | null
          status?: string | null
          table_value?: number | null
          total_ipi?: number | null
          total_produtos?: number | null
          total_value?: number | null
          uf_destiny?: string | null
        }
        Update: {
          client_cnpj?: string | null
          client_name?: string | null
          commission_calculated?: number | null
          created_at?: string | null
          emission_date?: string | null
          emitente_cnpj?: string | null
          emitente_nome?: string | null
          emitente_uf?: string | null
          icms?: number | null
          id?: string
          internal_seller_id?: string | null
          ir_csll?: number | null
          nfe_email_from?: string | null
          nfe_filename?: string | null
          nfe_key?: string | null
          nfe_model?: string | null
          nfe_number?: string | null
          nfe_processed_at?: string | null
          nfe_series?: string | null
          organization_id?: string
          over_price?: number | null
          payment_method?: string | null
          pis_cofins?: number | null
          representative_id?: string | null
          status?: string | null
          table_value?: number | null
          total_ipi?: number | null
          total_produtos?: number | null
          total_value?: number | null
          uf_destiny?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      create_organization_for_user: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "seller"
        | "representative"
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
      app_role: ["super_admin", "admin", "manager", "seller", "representative"],
    },
  },
} as const

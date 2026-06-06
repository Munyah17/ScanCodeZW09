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
      api_keys: {
        Row: {
          active: boolean
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          scopes: string[]
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          scopes?: string[]
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          scopes?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: number
          is_agent: boolean
          sender_id: string | null
          sender_name: string
          session_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: number
          is_agent?: boolean
          sender_id?: string | null
          sender_name: string
          session_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: number
          is_agent?: boolean
          sender_id?: string | null
          sender_name?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          agent_id: string | null
          assigned_at: string | null
          ended_at: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          started_at: string
          status: string
          ticket_id: number | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          assigned_at?: string | null
          ended_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          started_at?: string
          status?: string
          ticket_id?: number | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          assigned_at?: string | null
          ended_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          started_at?: string
          status?: string
          ticket_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_credentials: {
        Row: {
          active: boolean
          created_at: string
          credential_type: string
          encrypted_value: string
          id: string
          name: string
          provider: string
          purpose: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          credential_type?: string
          encrypted_value: string
          id?: string
          name: string
          provider: string
          purpose?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          credential_type?: string
          encrypted_value?: string
          id?: string
          name?: string
          provider?: string
          purpose?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_usd: number
          created_at: string
          id: number
          method: string
          paid_at: string | null
          paynow_poll_url: string | null
          paynow_ref: string | null
          plan: string
          reference: string
          status: string
          stripe_pi: string | null
          user_id: string | null
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: number
          method: string
          paid_at?: string | null
          paynow_poll_url?: string | null
          paynow_ref?: string | null
          plan: string
          reference: string
          status?: string
          stripe_pi?: string | null
          user_id?: string | null
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: number
          method?: string
          paid_at?: string | null
          paynow_poll_url?: string | null
          paynow_ref?: string | null
          plan?: string
          reference?: string
          status?: string
          stripe_pi?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          id: number
          product_name: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: number
          product_name: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: number
          product_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_notes: string | null
          created_at: string
          deletion_warned_at: string | null
          enterprise_config: Json | null
          id: string
          override_by: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_type: string
          suspended: boolean | null
          updated_at: string
          user_type: string
          username: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          deletion_warned_at?: string | null
          enterprise_config?: Json | null
          id: string
          override_by?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_type?: string
          suspended?: boolean | null
          updated_at?: string
          user_type?: string
          username: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          deletion_warned_at?: string | null
          enterprise_config?: Json | null
          id?: string
          override_by?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_type?: string
          suspended?: boolean | null
          updated_at?: string
          user_type?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_override_by_fkey"
            columns: ["override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean
          features: string | null
          features_json: Json | null
          id: string
          max_products: number | null
          max_variations_per_product: number | null
          name: string
          price_usd: number | null
        }
        Insert: {
          active?: boolean
          features?: string | null
          features_json?: Json | null
          id: string
          max_products?: number | null
          max_variations_per_product?: number | null
          name: string
          price_usd?: number | null
        }
        Update: {
          active?: boolean
          features?: string | null
          features_json?: Json | null
          id?: string
          max_products?: number | null
          max_variations_per_product?: number | null
          name?: string
          price_usd?: number | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          body: string
          created_at: string
          guest_email: string
          guest_name: string | null
          id: number
          priority: string
          resolved_at: string | null
          source: string
          status: string
          subject: string
          ticket_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          body: string
          created_at?: string
          guest_email: string
          guest_name?: string | null
          id?: number
          priority?: string
          resolved_at?: string | null
          source?: string
          status?: string
          subject: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          body?: string
          created_at?: string
          guest_email?: string
          guest_name?: string | null
          id?: number
          priority?: string
          resolved_at?: string | null
          source?: string
          status?: string
          subject?: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_replies: {
        Row: {
          body: string
          created_at: string
          id: number
          is_agent: boolean
          sender_id: string | null
          sender_name: string
          ticket_id: number
        }
        Insert: {
          body: string
          created_at?: string
          id?: number
          is_agent?: boolean
          sender_id?: string | null
          sender_name: string
          ticket_id: number
        }
        Update: {
          body?: string
          created_at?: string
          id?: number
          is_agent?: boolean
          sender_id?: string | null
          sender_name?: string
          ticket_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      variations: {
        Row: {
          barcode_country: string
          barcode_data: string
          barcode_format: string
          created_at: string
          id: number
          product_id: number
          qr_code_url: string | null
          qrcode_generated: boolean
          user_id: string
          variation_type: string
          variation_value: string
        }
        Insert: {
          barcode_country?: string
          barcode_data: string
          barcode_format?: string
          created_at?: string
          id?: number
          product_id: number
          qr_code_url?: string | null
          qrcode_generated?: boolean
          user_id: string
          variation_type: string
          variation_value: string
        }
        Update: {
          barcode_country?: string
          barcode_data?: string
          barcode_format?: string
          created_at?: string
          id?: number
          product_id?: number
          qr_code_url?: string | null
          qrcode_generated?: boolean
          user_id?: string
          variation_type?: string
          variation_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

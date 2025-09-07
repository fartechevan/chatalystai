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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_conversations: {
        Row: {
          added_to_knowledge_base: boolean | null
          created_at: string | null
          id: string
          knowledge_chunk_id: string | null
          knowledge_document_id: string | null
          knowledge_used: Json | null
          message_content: string | null
          message_timestamp: string | null
          needs_review: boolean | null
          sender_type: Database["public"]["Enums"]["sender_type"]
          session_id: string | null
        }
        Insert: {
          added_to_knowledge_base?: boolean | null
          created_at?: string | null
          id?: string
          knowledge_chunk_id?: string | null
          knowledge_document_id?: string | null
          knowledge_used?: Json | null
          message_content?: string | null
          message_timestamp?: string | null
          needs_review?: boolean | null
          sender_type: Database["public"]["Enums"]["sender_type"]
          session_id?: string | null
        }
        Update: {
          added_to_knowledge_base?: boolean | null
          created_at?: string | null
          id?: string
          knowledge_chunk_id?: string | null
          knowledge_document_id?: string | null
          knowledge_used?: Json | null
          message_content?: string | null
          message_timestamp?: string | null
          needs_review?: boolean | null
          sender_type?: Database["public"]["Enums"]["sender_type"]
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_knowledge_chunk_id_fkey"
            columns: ["knowledge_chunk_id"]
            isOneToOne: false
            referencedRelation: "knowledge_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_knowledge_document_id_fkey"
            columns: ["knowledge_document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_channels: {
        Row: {
          activation_mode: string | null
          agent_id: string
          created_at: string | null
          error_message: string | null
          id: string
          integrations_config_id: string
          is_enabled_on_channel: boolean | null
          keyword_trigger: string | null
          session_timeout_minutes: number | null
          stop_keywords: string[] | null
          updated_at: string | null
        }
        Insert: {
          activation_mode?: string | null
          agent_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          integrations_config_id: string
          is_enabled_on_channel?: boolean | null
          keyword_trigger?: string | null
          session_timeout_minutes?: number | null
          stop_keywords?: string[] | null
          updated_at?: string | null
        }
        Update: {
          activation_mode?: string | null
          agent_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          integrations_config_id?: string
          is_enabled_on_channel?: boolean | null
          keyword_trigger?: string | null
          session_timeout_minutes?: number | null
          stop_keywords?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_channels_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_channels_integrations_config_id_fkey"
            columns: ["integrations_config_id"]
            isOneToOne: false
            referencedRelation: "integrations_config"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_sessions: {
        Row: {
          agent_id: string | null
          contact_identifier: string
          conversation_history: Json | null
          created_at: string | null
          ended_at: string | null
          id: string
          integrations_config_id: string | null
          last_interaction_timestamp: string | null
          status: Database["public"]["Enums"]["ai_session_status"]
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          contact_identifier: string
          conversation_history?: Json | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          integrations_config_id?: string | null
          last_interaction_timestamp?: string | null
          status?: Database["public"]["Enums"]["ai_session_status"]
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          contact_identifier?: string
          conversation_history?: Json | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          integrations_config_id?: string | null
          last_interaction_timestamp?: string | null
          status?: Database["public"]["Enums"]["ai_session_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_sessions_integrations_config_id_fkey"
            columns: ["integrations_config_id"]
            isOneToOne: false
            referencedRelation: "integrations_config"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          agent_type: string
          created_at: string
          custom_agent_config: Json | null
          id: string
          is_enabled: boolean | null
          knowledge_document_ids: string[] | null
          name: string
          prompt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_type?: string
          created_at?: string
          custom_agent_config?: Json | null
          id?: string
          is_enabled?: boolean | null
          knowledge_document_ids?: string[] | null
          name: string
          prompt: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_type?: string
          created_at?: string
          custom_agent_config?: Json | null
          id?: string
          is_enabled?: boolean | null
          knowledge_document_ids?: string[] | null
          name?: string
          prompt?: string
          updated_at?: string
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
      agent_activation_mode: "keyword" | "always_on"
      ai_session_status: "active" | "closed" | "error"
      app_role: "admin" | "user" | "customer"
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      integration_status: "available" | "coming_soon"
      message_log_status:
        | "pending"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
        | "blocked_quota"
        | "blocked_rule"
      message_log_type:
        | "text"
        | "image"
        | "video"
        | "audio"
        | "document"
        | "template"
        | "interactive_buttons"
        | "interactive_list"
        | "location"
        | "contact"
        | "sticker"
        | "unknown"
      new_app_role: "user" | "admin"
      role_enum: "admin" | "member"
      sender_type: "user" | "ai"
      sentiment_enum: "good" | "moderate" | "bad" | "unknown"
      sentiment_level: "bad" | "moderate" | "good"
      sentiment_type: "bad" | "moderate" | "good"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "unpaid"
      sync_status: "pending" | "completed" | "failed"
      task_status: "follow-up" | "meeting"
      team_role: "owner" | "admin" | "member"
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
      agent_activation_mode: ["keyword", "always_on"],
      ai_session_status: ["active", "closed", "error"],
      app_role: ["admin", "user", "customer"],
      day_of_week: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      integration_status: ["available", "coming_soon"],
      message_log_status: [
        "pending",
        "sent",
        "delivered",
        "read",
        "failed",
        "blocked_quota",
        "blocked_rule",
      ],
      message_log_type: [
        "text",
        "image",
        "video",
        "audio",
        "document",
        "template",
        "interactive_buttons",
        "interactive_list",
        "location",
        "contact",
        "sticker",
        "unknown",
      ],
      new_app_role: ["user", "admin"],
      role_enum: ["admin", "member"],
      sender_type: ["user", "ai"],
      sentiment_enum: ["good", "moderate", "bad", "unknown"],
      sentiment_level: ["bad", "moderate", "good"],
      sentiment_type: ["bad", "moderate", "good"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "unpaid",
      ],
      sync_status: ["pending", "completed", "failed"],
      task_status: ["follow-up", "meeting"],
      team_role: ["owner", "admin", "member"],
    },
  },
} as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_availability_settings: {
        Row: {
          agent_id: string
          appointment_duration_minutes: number | null
          buffer_time_minutes: number | null
          created_at: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string | null
          id: string
          is_available: boolean | null
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          appointment_duration_minutes?: number | null
          buffer_time_minutes?: number | null
          created_at?: string | null
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          appointment_duration_minutes?: number | null
          buffer_time_minutes?: number | null
          created_at?: string | null
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_availability_settings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_google_calendar_settings: {
        Row: {
          access_token: string | null
          agent_id: string
          calendar_id: string | null
          created_at: string | null
          id: string
          refresh_token: string | null
          token_expiry_timestamp: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          agent_id: string
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          refresh_token?: string | null
          token_expiry_timestamp?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          agent_id?: string
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          refresh_token?: string | null
          token_expiry_timestamp?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_google_calendar_settings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_integrations: {
        Row: {
          agent_id: string
          created_at: string
          integration_id: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          integration_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          integration_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_integrations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_integrations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_knowledge_documents: {
        Row: {
          agent_id: string
          created_at: string
          document_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          document_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_knowledge_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_knowledge_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
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
          id: string
          integration_id: string | null
          is_active: boolean | null
          last_interaction_timestamp: string | null
          status: Database["public"]["Enums"]["ai_session_status"]
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          contact_identifier: string
          conversation_history?: Json | null
          created_at?: string | null
          id?: string
          integration_id?: string | null
          is_active?: boolean | null
          last_interaction_timestamp?: string | null
          status?: Database["public"]["Enums"]["ai_session_status"]
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          contact_identifier?: string
          conversation_history?: Json | null
          created_at?: string | null
          id?: string
          integration_id?: string | null
          is_active?: boolean | null
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
            foreignKeyName: "ai_agent_sessions_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          activation_mode:
            | Database["public"]["Enums"]["agent_activation_mode"]
            | null
          created_at: string
          id: string
          is_enabled: boolean | null
          keyword_trigger: string | null
          knowledge_document_ids: string[] | null
          name: string
          prompt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activation_mode?:
            | Database["public"]["Enums"]["agent_activation_mode"]
            | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          keyword_trigger?: string | null
          knowledge_document_ids?: string[] | null
          name: string
          prompt: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activation_mode?:
            | Database["public"]["Enums"]["agent_activation_mode"]
            | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          keyword_trigger?: string | null
          knowledge_document_ids?: string[] | null
          name?: string
          prompt?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      batch_sentiment_analysis: {
        Row: {
          bad_count: number | null
          conversation_ids: string[] | null
          created_at: string | null
          end_date: string
          good_count: number | null
          id: string
          moderate_count: number | null
          overall_sentiment: string | null
          start_date: string
          summary: string | null
          unknown_count: number | null
        }
        Insert: {
          bad_count?: number | null
          conversation_ids?: string[] | null
          created_at?: string | null
          end_date: string
          good_count?: number | null
          id?: string
          moderate_count?: number | null
          overall_sentiment?: string | null
          start_date: string
          summary?: string | null
          unknown_count?: number | null
        }
        Update: {
          bad_count?: number | null
          conversation_ids?: string[] | null
          created_at?: string | null
          end_date?: string
          good_count?: number | null
          id?: string
          moderate_count?: number | null
          overall_sentiment?: string | null
          start_date?: string
          summary?: string | null
          unknown_count?: number | null
        }
        Relationships: []
      }
      batch_sentiment_analysis_details: {
        Row: {
          batch_analysis_id: string
          conversation_id: string
          created_at: string
          description: string | null
          id: number
          sentiment: Database["public"]["Enums"]["sentiment_enum"]
        }
        Insert: {
          batch_analysis_id: string
          conversation_id: string
          created_at?: string
          description?: string | null
          id?: never
          sentiment: Database["public"]["Enums"]["sentiment_enum"]
        }
        Update: {
          batch_analysis_id?: string
          conversation_id?: string
          created_at?: string
          description?: string | null
          id?: never
          sentiment?: Database["public"]["Enums"]["sentiment_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "batch_sentiment_analysis_details_batch_analysis_id_fkey"
            columns: ["batch_analysis_id"]
            isOneToOne: false
            referencedRelation: "batch_sentiment_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_sentiment_analysis_details_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["conversation_id"]
          },
        ]
      }
      conversations: {
        Row: {
          channel: string | null
          conversation_id: string
          created_at: string
          last_message_at: string
          started_at: string
          status: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          channel?: string | null
          conversation_id?: string
          created_at?: string
          last_message_at?: string
          started_at?: string
          status?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string | null
          conversation_id?: string
          created_at?: string
          last_message_at?: string
          started_at?: string
          status?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          api_key: string | null
          base_url: string | null
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_connected: boolean | null
          name: string
          status: Database["public"]["Enums"]["integration_status"]
          team_id: string | null
          team_visibility: boolean | null
          updated_at: string
          webhook_events: Json | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_connected?: boolean | null
          name: string
          status?: Database["public"]["Enums"]["integration_status"]
          team_id?: string | null
          team_visibility?: boolean | null
          updated_at?: string
          webhook_events?: Json | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_connected?: boolean | null
          name?: string
          status?: Database["public"]["Enums"]["integration_status"]
          team_id?: string | null
          team_visibility?: boolean | null
          updated_at?: string
          webhook_events?: Json | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations_config: {
        Row: {
          created_at: string
          id: string
          instance_display_name: string | null
          instance_id: string | null
          integration_id: string
          owner_id: string | null
          pipeline_id: string | null
          status: string | null
          token: string | null
          updated_at: string
          user_reference_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instance_display_name?: string | null
          instance_id?: string | null
          integration_id: string
          owner_id?: string | null
          pipeline_id?: string | null
          status?: string | null
          token?: string | null
          updated_at?: string
          user_reference_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instance_display_name?: string | null
          instance_id?: string | null
          integration_id?: string
          owner_id?: string | null
          pipeline_id?: string | null
          status?: string | null
          token?: string | null
          updated_at?: string
          user_reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_config_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: true
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_config_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          chunking_method: string | null
          content: string
          created_at: string
          custom_chunk_size: number | null
          file_path: string | null
          file_type: string | null
          id: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          chunking_method?: string | null
          content: string
          created_at?: string
          custom_chunk_size?: number | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          chunking_method?: string | null
          content?: string
          created_at?: string
          custom_chunk_size?: number | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pipelines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          integrations_allowed: number | null
          messages_per_month: number | null
          name: string
          owner_id: string | null
          price: number
          team_id: string | null
          token_allocation: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          integrations_allowed?: number | null
          messages_per_month?: number | null
          name: string
          owner_id?: string | null
          price?: number
          team_id?: string | null
          token_allocation?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          integrations_allowed?: number | null
          messages_per_month?: number | null
          name?: string
          owner_id?: string | null
          price?: number
          team_id?: string | null
          token_allocation?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          plan_id: string
          profile_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          subscribed_at: string
          team_id: string | null
          trial_end_date: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          ended_at?: string | null
          id?: string
          plan_id: string
          profile_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          subscribed_at?: string
          team_id?: string | null
          trial_end_date?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          plan_id?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          subscribed_at?: string
          team_id?: string | null
          trial_end_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_users: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_users_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_new_team: {
        Args: { p_name: string }
        Returns: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }[]
      }
      is_user_team_admin_or_owner: {
        Args: { p_user_id: string; p_team_id: string }
        Returns: boolean
      }
      is_user_team_member: {
        Args: { p_user_id: string; p_team_id: string }
        Returns: boolean
      }
      update_pipeline_name: {
        Args: { pipeline_id: string; new_name: string }
        Returns: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          team_id: string | null
          updated_at: string
          user_id: string
        }[]
      }
    }
    Enums: {
      agent_activation_mode: "keyword" | "always_on"
      ai_session_status: "active" | "closed" | "error"
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      integration_status: "available" | "coming_soon"
      sentiment_enum: "good" | "moderate" | "bad" | "unknown"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "incomplete"
        | "incomplete_expired"
        | "paused"
      team_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; name: string; owner: string; metadata: Json }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_legacy_v1: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v1_optimised: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v2: {
        Args: {
          prefix: string
          bucket_name: string
          limits?: number
          levels?: number
          start_after?: string
        }
        Returns: {
          key: string
          name: string
          id: string
          updated_at: string
          created_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      agent_activation_mode: ["keyword", "always_on"],
      ai_session_status: ["active", "closed", "error"],
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
      sentiment_enum: ["good", "moderate", "bad", "unknown"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
        "incomplete_expired",
        "paused",
      ],
      team_role: ["owner", "admin", "member"],
    },
  },
  storage: {
    Enums: {},
  },
} as const


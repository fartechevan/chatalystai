export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      ai_agent_integrations: {
        Row: {
          activation_mode: string | null
          agent_id: string
          created_at: string
          error_message: string | null
          integration_id: string
          session_timeout_minutes: number | null
          stop_keywords: string[] | null
          updated_at: string
        }
        Insert: {
          activation_mode?: string | null
          agent_id: string
          created_at?: string
          error_message?: string | null
          integration_id: string
          session_timeout_minutes?: number | null
          stop_keywords?: string[] | null
          updated_at?: string
        }
        Update: {
          activation_mode?: string | null
          agent_id?: string
          created_at?: string
          error_message?: string | null
          integration_id?: string
          session_timeout_minutes?: number | null
          stop_keywords?: string[] | null
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
          agent_type: string
          created_at: string
          custom_agent_config: Json | null
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
          agent_type?: string
          created_at?: string
          custom_agent_config?: Json | null
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
          agent_type?: string
          created_at?: string
          custom_agent_config?: Json | null
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
      appointments: {
        Row: {
          contact_identifier: string | null
          created_at: string
          end_time: string | null
          id: string
          notes: string | null
          source_channel: string | null
          start_time: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          contact_identifier?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          source_channel?: string | null
          start_time?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_identifier?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          source_channel?: string | null
          start_time?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      batch_sentiment_analysis: {
        Row: {
          conversation_ids: string[] | null
          created_at: string | null
          end_date: string
          id: string
          negative_count: number | null
          neutral_count: number | null
          overall_sentiment: string | null
          positive_count: number | null
          start_date: string
          summary: string | null
        }
        Insert: {
          conversation_ids?: string[] | null
          created_at?: string | null
          end_date: string
          id?: string
          negative_count?: number | null
          neutral_count?: number | null
          overall_sentiment?: string | null
          positive_count?: number | null
          start_date: string
          summary?: string | null
        }
        Update: {
          conversation_ids?: string[] | null
          created_at?: string | null
          end_date?: string
          id?: string
          negative_count?: number | null
          neutral_count?: number | null
          overall_sentiment?: string | null
          positive_count?: number | null
          start_date?: string
          summary?: string | null
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
      broadcast_recipients: {
        Row: {
          broadcast_id: string
          customer_id: string | null
          error_message: string | null
          id: string
          phone_number: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          broadcast_id: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          phone_number: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          broadcast_id?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          phone_number?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_at: string
          id: string
          instance_id: string | null
          integration_id: string | null
          message_text: string
          segment_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id?: string | null
          integration_id?: string | null
          message_text: string
          segment_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string | null
          integration_id?: string | null
          message_text?: string
          segment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_broadcasts_segment_id"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          customer_id: string | null
          external_user_identifier: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          role: Database["public"]["Enums"]["role_enum"] | null
        }
        Insert: {
          conversation_id: string
          customer_id?: string | null
          external_user_identifier?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: Database["public"]["Enums"]["role_enum"] | null
        }
        Update: {
          conversation_id?: string
          customer_id?: string | null
          external_user_identifier?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: Database["public"]["Enums"]["role_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "conversation_participants_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_summaries: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          summary: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          summary: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["conversation_id"]
          },
        ]
      }
      conversations: {
        Row: {
          conversation_id: string
          created_at: string
          integrations_id: string | null
          lead_id: string | null
          updated_at: string
        }
        Insert: {
          conversation_id?: string
          created_at?: string
          integrations_id?: string | null
          lead_id?: string | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          integrations_id?: string | null
          lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_integrations_id_fkey"
            columns: ["integrations_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company_address: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          metadata: Json | null
          name: string
          phone_number: string
          updated_at: string
        }
        Insert: {
          company_address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          name: string
          phone_number: string
          updated_at?: string
        }
        Update: {
          company_address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          phone_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          filename: string | null
          id: number
          image_summary: string | null
          metadata: Json | null
          source: string | null
          total_images: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          filename?: string | null
          id?: number
          image_summary?: string | null
          metadata?: Json | null
          source?: string | null
          total_images?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          filename?: string | null
          id?: number
          image_summary?: string | null
          metadata?: Json | null
          source?: string | null
          total_images?: number | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id: string
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      evolution_webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json
          processing_status: string
          source_identifier: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload: Json
          processing_status: string
          source_identifier?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processing_status?: string
          source_identifier?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          api_key: string | null
          base_url: string | null
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_connected: boolean | null
          name: string
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string | null
          webhook_events: Json | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_connected?: boolean | null
          name: string
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string | null
          webhook_events?: Json | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_connected?: boolean | null
          name?: string
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string | null
          webhook_events?: Json | null
          webhook_url?: string | null
        }
        Relationships: []
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
            isOneToOne: false
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
      knowledge_chunks: {
        Row: {
          content: string
          created_at: string | null
          document_id: string | null
          embedding: string | null
          enabled: boolean
          id: string
          metadata: string | null
          sequence: number | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          enabled?: boolean
          id?: string
          metadata?: string | null
          sequence?: number | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          enabled?: boolean
          id?: string
          metadata?: string | null
          sequence?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          chunking_method: string | null
          content: string
          created_at: string | null
          custom_chunk_size: number | null
          file_path: string | null
          file_type: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          chunking_method?: string | null
          content: string
          created_at?: string | null
          custom_chunk_size?: number | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          chunking_method?: string | null
          content?: string
          created_at?: string | null
          custom_chunk_size?: number | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lead_pipeline: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          pipeline_id: string
          position: number
          stage_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          pipeline_id: string
          position?: number
          stage_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          pipeline_id?: string
          position?: number
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_pipeline_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipeline_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipeline_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          pipeline_stage_id: string | null
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          pipeline_stage_id?: string | null
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          pipeline_stage_id?: string | null
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          is_read: boolean
          message_id: string
          sender_participant_id: string
          wamid: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          is_read?: boolean
          message_id?: string
          sender_participant_id: string
          wamid?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          is_read?: boolean
          message_id?: string
          sender_participant_id?: string
          wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "messages_sender_participant_id_fkey"
            columns: ["sender_participant_id"]
            isOneToOne: false
            referencedRelation: "conversation_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          created_at: string
          id: string
          name: string
          pipeline_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pipeline_id: string
          position: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pipeline_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          token_allocation: number | null
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          integrations_allowed?: number | null
          messages_per_month?: number | null
          name: string
          owner_id?: string | null
          price: number
          token_allocation?: number | null
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
          token_allocation?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_integration_access: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          integration_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          integration_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          integration_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_integration_access_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_integration_access_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_integration_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      schema_embeddings: {
        Row: {
          column_name: string | null
          created_at: string | null
          description: string
          embedding: string | null
          id: string
          schema_name: string
          table_name: string
        }
        Insert: {
          column_name?: string | null
          created_at?: string | null
          description: string
          embedding?: string | null
          id?: string
          schema_name: string
          table_name: string
        }
        Update: {
          column_name?: string | null
          created_at?: string | null
          description?: string
          embedding?: string | null
          id?: string
          schema_name?: string
          table_name?: string
        }
        Relationships: []
      }
      segment_contacts: {
        Row: {
          added_at: string
          contact_id: string
          segment_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          segment_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_contacts_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
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
            foreignKeyName: "subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string
          created_at: string
          created_by: string
          due_date: string
          id: string
          title: string
          type: Database["public"]["Enums"]["task_status"] | null
          updated_at: string
        }
        Insert: {
          assignee_id: string
          created_at?: string
          created_by: string
          due_date: string
          id?: string
          title: string
          type?: Database["public"]["Enums"]["task_status"] | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string
          created_at?: string
          created_by?: string
          due_date?: string
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["task_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      token_allocations: {
        Row: {
          created_at: string | null
          id: string
          monthly_tokens: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          monthly_tokens?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          monthly_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_allocations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_blast_limits: {
        Row: {
          blast_limit: number
          count: number
          date: string
          id: string
          integration_id: string
        }
        Insert: {
          blast_limit: number
          count?: number
          date: string
          id?: string
          integration_id: string
        }
        Update: {
          blast_limit?: number
          count?: number
          date?: string
          id?: string
          integration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_blast_limits_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      execute_dynamic_sql: {
        Args: { sql_query: string }
        Returns: Json
      }
      get_current_month: {
        Args: Record<PropertyKey, never>
        Returns: {
          today_date: string
          month_number: number
        }[]
      }
      get_current_week: {
        Args: Record<PropertyKey, never>
        Returns: {
          today_date: string
          week_of_month: number
        }[]
      }
      get_evolution_api_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_user_team_admin_or_owner: {
        Args: { p_user_id: string; p_team_id: string }
        Returns: boolean
      }
      is_user_team_member: {
        Args: { p_user_id: string; p_team_id: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      match_chunks: {
        Args:
          | {
              query_embedding: string
              match_threshold: number
              match_count: number
            }
          | {
              query_embedding: string
              match_threshold: number
              match_count: number
              filter_document_ids?: string[]
            }
        Returns: {
          id: string
          document_id: string
          content: string
          similarity: number
        }[]
      }
      match_documents: {
        Args:
          | { query_embedding: string; match_count?: number; filter?: Json }
          | {
              query_embedding: string
              match_threshold?: number
              match_count?: number
              filter_source?: string
              fetch_k?: number
            }
        Returns: {
          id: number
          content: string
          metadata: Json
          source: string
          filename: string
          total_images: number
          image_summary: string
          similarity: number
        }[]
      }
      match_knowledge_chunks: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
          document_id: string
        }
        Returns: {
          id: string
          content: string
          similarity: number
        }[]
      }
      match_schema_embeddings: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          schema_name: string
          table_name: string
          column_name: string
          description: string
          similarity: number
        }[]
      }
      n8n_match_knowledge_chunks_test: {
        Args: {
          p_filter: string
          p_match_count: number
          p_query_embedding: string
        }
        Returns: {
          id: string
          content: string
          similarity: number
        }[]
      }
      profile_has_integration_access: {
        Args: { _profile_id: string; _integration_config_id: string }
        Returns: boolean
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_pipeline_name: {
        Args: { pipeline_id: string; new_name: string }
        Returns: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }[]
      }
      upsert_integration_config: {
        Args: {
          p_integration_id: string
          p_instance_id: string
          p_instance_display_name: string
          p_token: string
          p_owner_id: string
          p_user_reference_id: string
          p_pipeline_id: string
          p_status: string
        }
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
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

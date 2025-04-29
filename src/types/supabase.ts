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
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id?: string | null
          integration_id?: string | null
          message_text: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string | null
          integration_id?: string | null
          message_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
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
          webhook_events: Json | null // Add webhook_events
          webhook_url: string | null // Add webhook_url
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
          webhook_events?: Json | null // Add webhook_events
          webhook_url?: string | null // Add webhook_url
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
          webhook_events?: Json | null // Add webhook_events
          webhook_url?: string | null // Add webhook_url
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
      token_usage: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          tokens_used: number
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          tokens_used: number
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          tokens_used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "token_usage_user_id_fkey"
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
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          document_id: string
          content: string
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
      ai_session_status: "active" | "closed" | "error"
      app_role: "admin" | "user" | "customer"
      integration_status: "available" | "coming_soon"
      new_app_role: "user" | "admin"
      role_enum: "admin" | "member"
      sender_type: "user" | "ai"
      sentiment_level: "bad" | "moderate" | "good"
      sentiment_type: "bad" | "moderate" | "good"
      sync_status: "pending" | "completed" | "failed"
      task_status: "follow-up" | "meeting"
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
      ai_session_status: ["active", "closed", "error"],
      app_role: ["admin", "user", "customer"],
      integration_status: ["available", "coming_soon"],
      new_app_role: ["user", "admin"],
      role_enum: ["admin", "member"],
      sender_type: ["user", "ai"],
      sentiment_level: ["bad", "moderate", "good"],
      sentiment_type: ["bad", "moderate", "good"],
      sync_status: ["pending", "completed", "failed"],
      task_status: ["follow-up", "meeting"],
    },
  },
} as const

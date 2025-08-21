// This is a placeholder for your Supabase database types.
// You would typically generate this file using Supabase CLI:
// `supabase gen types typescript --project-id "your-project-id" --schema public > src/types/supabase.ts`
// For now, we'll define a minimal structure to satisfy the current usage.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      batch_sentiment_analysis: {
        Row: {
          id: string;
          conversation_ids: string[] | null;
          start_date: string | null;
          end_date: string | null;
          positive_count: number | null;
          negative_count: number | null;
          neutral_count: number | null;
          unknown_count: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_ids?: string[] | null;
          start_date?: string | null;
          end_date?: string | null;
          positive_count?: number | null;
          negative_count?: number | null;
          neutral_count?: number | null;
          unknown_count?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_ids?: string[] | null;
          start_date?: string | null;
          end_date?: string | null;
          positive_count?: number | null;
          negative_count?: number | null;
          neutral_count?: number | null;
          unknown_count?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      batch_sentiment_analysis_details: {
        Row: {
          id: string;
          batch_analysis_id: string;
          conversation_id: string;
          sentiment: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_analysis_id: string;
          conversation_id: string;
          sentiment: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          batch_analysis_id?: string;
          conversation_id?: string;
          sentiment?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "batch_sentiment_analysis_details_batch_analysis_id_fkey";
            columns: ["batch_analysis_id"];
            isOneToOne: false;
            referencedRelation: "batch_sentiment_analysis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "batch_sentiment_analysis_details_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["conversation_id"];
          }
        ];
      };
      conversations: {
        Row: {
          conversation_id: string;
          created_at: string;
          updated_at: string;
          integration_config_id: string | null;
        };
        Insert: {
          conversation_id?: string;
          created_at?: string;
          updated_at?: string;
          integration_config_id?: string | null;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          updated_at?: string;
          integration_config_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_integration_config_id_fkey";
            columns: ["integration_config_id"];
            isOneToOne: false;
            referencedRelation: "integrations_config";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          message_id: string;
          conversation_id: string;
          content: string | null;
          created_at: string;
          sender_participant_id: string | null;
        };
        Insert: {
          message_id?: string;
          conversation_id: string;
          content?: string | null;
          created_at?: string;
          sender_participant_id?: string | null;
        };
        Update: {
          message_id?: string;
          conversation_id?: string;
          content?: string | null;
          created_at?: string;
          sender_participant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["conversation_id"];
          },
          {
            foreignKeyName: "messages_sender_participant_id_fkey";
            columns: ["sender_participant_id"];
            isOneToOne: false;
            referencedRelation: "conversation_participants";
            referencedColumns: ["participant_id"];
          }
        ];
      };
      conversation_participants: {
        Row: {
          participant_id: string;
          conversation_id: string;
          customer_id: string | null;
          role: string; // e.g., 'member', 'agent'
          created_at: string;
        };
        Insert: {
          participant_id?: string;
          conversation_id: string;
          customer_id?: string | null;
          role: string;
          created_at?: string;
        };
        Update: {
          participant_id?: string;
          conversation_id?: string;
          customer_id?: string | null;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["conversation_id"];
          },
          {
            foreignKeyName: "conversation_participants_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      customers: {
        Row: {
          id: string;
          created_at: string;
          name: string | null;
          email: string | null;
          phone: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      integrations_config: {
        Row: {
          id: string;
          name: string;
          type: string;
          config: Json | null;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
          instance_display_name: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          config?: Json | null;
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
          instance_display_name?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          config?: Json | null;
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
          instance_display_name?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

-- Merged migration: SCHEMA
-- Consolidates 4 migrations:
-- - 20250722112200_refactor_ai_agent_schema.sql
-- - 20250722112300_schema_from_source.sql
-- - 20250820063021_add_customer_id_to_appointments_final.sql
-- - 20250909114041_remote_schema.sql
-- Generated on: 2025-09-09T16:27:43.109Z

-- ============================================================================
-- Migration 1/4: 20250722112200_refactor_ai_agent_schema.sql
-- ============================================================================

-- Step 1: Create the new ai_agent_channels table
CREATE TABLE public.ai_agent_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  integrations_config_id UUID NOT NULL REFERENCES public.integrations_config(id) ON DELETE CASCADE,
  is_enabled_on_channel BOOLEAN DEFAULT TRUE,
  activation_mode TEXT CHECK (activation_mode IN ('keyword', 'always_on')),
  keyword_trigger TEXT,
  stop_keywords TEXT[],
  session_timeout_minutes INTEGER DEFAULT 60,
  error_message TEXT DEFAULT 'Sorry, I can''t help with that right now, we''ll get in touch with you shortly.',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Migrate data from ai_agent_integrations to ai_agent_channels with proper type casting
INSERT INTO public.ai_agent_channels (agent_id, integrations_config_id, activation_mode, stop_keywords, session_timeout_minutes, error_message, created_at, updated_at)
SELECT
  agent_id,
  integration_id,
  activation_mode,
  stop_keywords,
  session_timeout_minutes,
  error_message,
  created_at,
  updated_at
FROM public.ai_agent_integrations;

-- Step 3: Drop the old ai_agent_integrations table
DROP TABLE public.ai_agent_integrations;

-- Step 4: Alter the ai_agents table
ALTER TABLE public.ai_agents
DROP COLUMN IF EXISTS activation_mode,
DROP COLUMN IF EXISTS keyword_trigger,
DROP COLUMN IF EXISTS knowledge_document_ids;


-- ============================================================================
-- Migration 2/4: 20250722112300_schema_from_source.sql
-- ============================================================================



-- ============================================================================
-- Migration 3/4: 20250820063021_add_customer_id_to_appointments_final.sql
-- ============================================================================

-- Only add customer_id column if appointments table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
        ALTER TABLE public.appointments
        ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
    END IF;
END $$;


-- ============================================================================
-- Migration 4/4: 20250909114041_remote_schema.sql
-- ============================================================================

create type "public"."message_log_status" as enum ('pending', 'sent', 'delivered', 'read', 'failed', 'blocked_quota', 'blocked_rule');

create type "public"."message_log_type" as enum ('text', 'image', 'video', 'audio', 'document', 'template', 'interactive_buttons', 'interactive_list', 'location', 'contact', 'sticker', 'unknown');

drop trigger if exists "set_agent_availability_settings_updated_at" on "public"."agent_availability_settings";

drop trigger if exists "set_agent_google_calendar_settings_updated_at" on "public"."agent_google_calendar_settings";

drop trigger if exists "set_broadcasts_updated_at" on "public"."broadcasts";

drop trigger if exists "set_message_logs_updated_at" on "public"."message_logs";

drop policy "Allow users to delete their own agents" on "public"."ai_agents";

drop policy "Allow users to insert their own agents" on "public"."ai_agents";

drop policy "Allow users to update their own agents" on "public"."ai_agents";

drop policy "Allow users to view their own agents" on "public"."ai_agents";

drop policy "Allow authenticated users to read integration configs" on "public"."integrations_config";

drop policy "Profiles can only view integration configs they have access to" on "public"."integrations_config";

drop policy "Users can insert their own leads" on "public"."leads";

drop policy "Users can update their own leads" on "public"."leads";

drop policy "Users can view their own leads" on "public"."leads";

drop policy "Users can manage stages of their pipelines" on "public"."pipeline_stages";

drop policy "Users can manage their own pipelines" on "public"."pipelines";

drop policy if exists "Allow team admins or owners to create plans" on "public"."plans";

drop policy if exists "Allow team admins or owners to delete plans" on "public"."plans";

drop policy if exists "Allow team admins or owners to update plans" on "public"."plans";

drop policy if exists "Allow users to see their team's or own plans" on "public"."plans";

-- Skip dropping policies for profile_integration_access as table was already dropped
-- drop policy if exists "Only admins can delete access records" on "public"."profile_integration_access";
-- drop policy if exists "Only admins can insert access records" on "public"."profile_integration_access";
-- drop policy if exists "Profiles can view their own access records" on "public"."profile_integration_access";

drop policy "Allow owners/admins to delete subscriptions" on "public"."subscriptions";

drop policy "Allow users to create subscriptions for self or admined teams" on "public"."subscriptions";

drop policy "Allow users to see their own or team subscriptions" on "public"."subscriptions";

drop policy "Allow users to update their own or admined team subscriptions" on "public"."subscriptions";

drop policy "Allow members to view users in their team" on "public"."team_users";

drop policy "Allow owners/admins to manage team members" on "public"."team_users";

drop policy "Allow owners/admins to remove users from their team" on "public"."team_users";

drop policy "Allow users to leave a team" on "public"."team_users";

drop policy "DEBUG - Allow any authenticated insert into team_users" on "public"."team_users";

drop policy "Allow authenticated users to create teams" on "public"."teams";

drop policy "Allow members to view their teams" on "public"."teams";

drop policy "Allow owners to delete their teams" on "public"."teams";

drop policy "Allow owners/admins to update their teams" on "public"."teams";

revoke delete on table "public"."agent_availability_settings" from "anon";

revoke insert on table "public"."agent_availability_settings" from "anon";

revoke references on table "public"."agent_availability_settings" from "anon";

revoke select on table "public"."agent_availability_settings" from "anon";

revoke trigger on table "public"."agent_availability_settings" from "anon";

revoke truncate on table "public"."agent_availability_settings" from "anon";

revoke update on table "public"."agent_availability_settings" from "anon";

revoke delete on table "public"."agent_availability_settings" from "authenticated";

revoke insert on table "public"."agent_availability_settings" from "authenticated";

revoke references on table "public"."agent_availability_settings" from "authenticated";

revoke select on table "public"."agent_availability_settings" from "authenticated";

revoke trigger on table "public"."agent_availability_settings" from "authenticated";

revoke truncate on table "public"."agent_availability_settings" from "authenticated";

revoke update on table "public"."agent_availability_settings" from "authenticated";

revoke delete on table "public"."agent_availability_settings" from "service_role";

revoke insert on table "public"."agent_availability_settings" from "service_role";

revoke references on table "public"."agent_availability_settings" from "service_role";

revoke select on table "public"."agent_availability_settings" from "service_role";

revoke trigger on table "public"."agent_availability_settings" from "service_role";

revoke truncate on table "public"."agent_availability_settings" from "service_role";

revoke update on table "public"."agent_availability_settings" from "service_role";

revoke delete on table "public"."agent_conversations" from "anon";

revoke insert on table "public"."agent_conversations" from "anon";

revoke references on table "public"."agent_conversations" from "anon";

revoke select on table "public"."agent_conversations" from "anon";

revoke trigger on table "public"."agent_conversations" from "anon";

revoke truncate on table "public"."agent_conversations" from "anon";

revoke update on table "public"."agent_conversations" from "anon";

revoke delete on table "public"."agent_conversations" from "authenticated";

revoke insert on table "public"."agent_conversations" from "authenticated";

revoke references on table "public"."agent_conversations" from "authenticated";

revoke select on table "public"."agent_conversations" from "authenticated";

revoke trigger on table "public"."agent_conversations" from "authenticated";

revoke truncate on table "public"."agent_conversations" from "authenticated";

revoke update on table "public"."agent_conversations" from "authenticated";

revoke delete on table "public"."agent_conversations" from "service_role";

revoke insert on table "public"."agent_conversations" from "service_role";

revoke references on table "public"."agent_conversations" from "service_role";

revoke select on table "public"."agent_conversations" from "service_role";

revoke trigger on table "public"."agent_conversations" from "service_role";

revoke truncate on table "public"."agent_conversations" from "service_role";

revoke update on table "public"."agent_conversations" from "service_role";

revoke delete on table "public"."agent_google_calendar_settings" from "anon";

revoke insert on table "public"."agent_google_calendar_settings" from "anon";

revoke references on table "public"."agent_google_calendar_settings" from "anon";

revoke select on table "public"."agent_google_calendar_settings" from "anon";

revoke trigger on table "public"."agent_google_calendar_settings" from "anon";

revoke truncate on table "public"."agent_google_calendar_settings" from "anon";

revoke update on table "public"."agent_google_calendar_settings" from "anon";

revoke delete on table "public"."agent_google_calendar_settings" from "authenticated";

revoke insert on table "public"."agent_google_calendar_settings" from "authenticated";

revoke references on table "public"."agent_google_calendar_settings" from "authenticated";

revoke select on table "public"."agent_google_calendar_settings" from "authenticated";

revoke trigger on table "public"."agent_google_calendar_settings" from "authenticated";

revoke truncate on table "public"."agent_google_calendar_settings" from "authenticated";

revoke update on table "public"."agent_google_calendar_settings" from "authenticated";

revoke delete on table "public"."agent_google_calendar_settings" from "service_role";

revoke insert on table "public"."agent_google_calendar_settings" from "service_role";

revoke references on table "public"."agent_google_calendar_settings" from "service_role";

revoke select on table "public"."agent_google_calendar_settings" from "service_role";

revoke trigger on table "public"."agent_google_calendar_settings" from "service_role";

revoke truncate on table "public"."agent_google_calendar_settings" from "service_role";

revoke update on table "public"."agent_google_calendar_settings" from "service_role";

-- Table ai_agent_integrations was already dropped in migration 20250722112200_refactor_ai_agent_schema.sql
-- revoke delete on table "public"."ai_agent_integrations" from "anon";
-- revoke insert on table "public"."ai_agent_integrations" from "anon";
-- revoke references on table "public"."ai_agent_integrations" from "anon";
-- revoke select on table "public"."ai_agent_integrations" from "anon";
-- revoke trigger on table "public"."ai_agent_integrations" from "anon";
-- revoke truncate on table "public"."ai_agent_integrations" from "anon";
-- revoke update on table "public"."ai_agent_integrations" from "anon";
-- revoke delete on table "public"."ai_agent_integrations" from "authenticated";
-- revoke insert on table "public"."ai_agent_integrations" from "authenticated";
-- revoke references on table "public"."ai_agent_integrations" from "authenticated";
-- revoke select on table "public"."ai_agent_integrations" from "authenticated";
-- revoke trigger on table "public"."ai_agent_integrations" from "authenticated";
-- revoke truncate on table "public"."ai_agent_integrations" from "authenticated";
-- revoke update on table "public"."ai_agent_integrations" from "authenticated";
-- revoke delete on table "public"."ai_agent_integrations" from "service_role";
-- revoke insert on table "public"."ai_agent_integrations" from "service_role";
-- revoke references on table "public"."ai_agent_integrations" from "service_role";
-- revoke select on table "public"."ai_agent_integrations" from "service_role";
-- revoke trigger on table "public"."ai_agent_integrations" from "service_role";
-- revoke truncate on table "public"."ai_agent_integrations" from "service_role";
-- revoke update on table "public"."ai_agent_integrations" from "service_role";

-- Table ai_agent_knowledge_documents was dropped in earlier migration
-- revoke delete on table "public"."ai_agent_knowledge_documents" from "anon";
-- revoke insert on table "public"."ai_agent_knowledge_documents" from "anon";
-- revoke references on table "public"."ai_agent_knowledge_documents" from "anon";
-- revoke select on table "public"."ai_agent_knowledge_documents" from "anon";
-- revoke trigger on table "public"."ai_agent_knowledge_documents" from "anon";
-- revoke truncate on table "public"."ai_agent_knowledge_documents" from "anon";
-- revoke update on table "public"."ai_agent_knowledge_documents" from "anon";
-- revoke delete on table "public"."ai_agent_knowledge_documents" from "authenticated";
-- revoke insert on table "public"."ai_agent_knowledge_documents" from "authenticated";
-- revoke references on table "public"."ai_agent_knowledge_documents" from "authenticated";
-- revoke select on table "public"."ai_agent_knowledge_documents" from "authenticated";
-- revoke trigger on table "public"."ai_agent_knowledge_documents" from "authenticated";
-- revoke truncate on table "public"."ai_agent_knowledge_documents" from "authenticated";
-- revoke update on table "public"."ai_agent_knowledge_documents" from "authenticated";
-- revoke delete on table "public"."ai_agent_knowledge_documents" from "service_role";
-- revoke insert on table "public"."ai_agent_knowledge_documents" from "service_role";
-- revoke references on table "public"."ai_agent_knowledge_documents" from "service_role";
-- revoke select on table "public"."ai_agent_knowledge_documents" from "service_role";
-- revoke trigger on table "public"."ai_agent_knowledge_documents" from "service_role";
-- revoke truncate on table "public"."ai_agent_knowledge_documents" from "service_role";
-- revoke update on table "public"."ai_agent_knowledge_documents" from "service_role";

revoke delete on table "public"."ai_agent_sessions" from "anon";

revoke insert on table "public"."ai_agent_sessions" from "anon";

revoke references on table "public"."ai_agent_sessions" from "anon";

revoke select on table "public"."ai_agent_sessions" from "anon";

revoke trigger on table "public"."ai_agent_sessions" from "anon";

revoke truncate on table "public"."ai_agent_sessions" from "anon";

revoke update on table "public"."ai_agent_sessions" from "anon";

revoke delete on table "public"."ai_agent_sessions" from "authenticated";

revoke insert on table "public"."ai_agent_sessions" from "authenticated";

revoke references on table "public"."ai_agent_sessions" from "authenticated";

revoke select on table "public"."ai_agent_sessions" from "authenticated";

revoke trigger on table "public"."ai_agent_sessions" from "authenticated";

revoke truncate on table "public"."ai_agent_sessions" from "authenticated";

revoke update on table "public"."ai_agent_sessions" from "authenticated";

revoke delete on table "public"."ai_agent_sessions" from "service_role";

revoke insert on table "public"."ai_agent_sessions" from "service_role";

revoke references on table "public"."ai_agent_sessions" from "service_role";

revoke select on table "public"."ai_agent_sessions" from "service_role";

revoke trigger on table "public"."ai_agent_sessions" from "service_role";

revoke truncate on table "public"."ai_agent_sessions" from "service_role";

revoke update on table "public"."ai_agent_sessions" from "service_role";

revoke delete on table "public"."ai_agents" from "anon";

revoke insert on table "public"."ai_agents" from "anon";

revoke references on table "public"."ai_agents" from "anon";

revoke select on table "public"."ai_agents" from "anon";

revoke trigger on table "public"."ai_agents" from "anon";

revoke truncate on table "public"."ai_agents" from "anon";

revoke update on table "public"."ai_agents" from "anon";

revoke delete on table "public"."ai_agents" from "authenticated";

revoke insert on table "public"."ai_agents" from "authenticated";

revoke references on table "public"."ai_agents" from "authenticated";

revoke select on table "public"."ai_agents" from "authenticated";

revoke trigger on table "public"."ai_agents" from "authenticated";

revoke truncate on table "public"."ai_agents" from "authenticated";

revoke update on table "public"."ai_agents" from "authenticated";

revoke delete on table "public"."ai_agents" from "service_role";

revoke insert on table "public"."ai_agents" from "service_role";

revoke references on table "public"."ai_agents" from "service_role";

revoke select on table "public"."ai_agents" from "service_role";

revoke trigger on table "public"."ai_agents" from "service_role";

revoke truncate on table "public"."ai_agents" from "service_role";

revoke update on table "public"."ai_agents" from "service_role";

revoke delete on table "public"."batch_sentiment_analysis" from "anon";

revoke insert on table "public"."batch_sentiment_analysis" from "anon";

revoke references on table "public"."batch_sentiment_analysis" from "anon";

revoke select on table "public"."batch_sentiment_analysis" from "anon";

revoke trigger on table "public"."batch_sentiment_analysis" from "anon";

revoke truncate on table "public"."batch_sentiment_analysis" from "anon";

revoke update on table "public"."batch_sentiment_analysis" from "anon";

revoke delete on table "public"."batch_sentiment_analysis" from "authenticated";

revoke insert on table "public"."batch_sentiment_analysis" from "authenticated";

revoke references on table "public"."batch_sentiment_analysis" from "authenticated";

revoke select on table "public"."batch_sentiment_analysis" from "authenticated";

revoke trigger on table "public"."batch_sentiment_analysis" from "authenticated";

revoke truncate on table "public"."batch_sentiment_analysis" from "authenticated";

revoke update on table "public"."batch_sentiment_analysis" from "authenticated";

revoke delete on table "public"."batch_sentiment_analysis" from "service_role";

revoke insert on table "public"."batch_sentiment_analysis" from "service_role";

revoke references on table "public"."batch_sentiment_analysis" from "service_role";

revoke select on table "public"."batch_sentiment_analysis" from "service_role";

revoke trigger on table "public"."batch_sentiment_analysis" from "service_role";

revoke truncate on table "public"."batch_sentiment_analysis" from "service_role";

revoke update on table "public"."batch_sentiment_analysis" from "service_role";

revoke delete on table "public"."batch_sentiment_analysis_details" from "anon";

revoke insert on table "public"."batch_sentiment_analysis_details" from "anon";

revoke references on table "public"."batch_sentiment_analysis_details" from "anon";

revoke select on table "public"."batch_sentiment_analysis_details" from "anon";

revoke trigger on table "public"."batch_sentiment_analysis_details" from "anon";

revoke truncate on table "public"."batch_sentiment_analysis_details" from "anon";

revoke update on table "public"."batch_sentiment_analysis_details" from "anon";

revoke delete on table "public"."batch_sentiment_analysis_details" from "authenticated";

revoke insert on table "public"."batch_sentiment_analysis_details" from "authenticated";

revoke references on table "public"."batch_sentiment_analysis_details" from "authenticated";

revoke select on table "public"."batch_sentiment_analysis_details" from "authenticated";

revoke trigger on table "public"."batch_sentiment_analysis_details" from "authenticated";

revoke truncate on table "public"."batch_sentiment_analysis_details" from "authenticated";

revoke update on table "public"."batch_sentiment_analysis_details" from "authenticated";

revoke delete on table "public"."batch_sentiment_analysis_details" from "service_role";

revoke insert on table "public"."batch_sentiment_analysis_details" from "service_role";

revoke references on table "public"."batch_sentiment_analysis_details" from "service_role";

revoke select on table "public"."batch_sentiment_analysis_details" from "service_role";

revoke trigger on table "public"."batch_sentiment_analysis_details" from "service_role";

revoke truncate on table "public"."batch_sentiment_analysis_details" from "service_role";

revoke update on table "public"."batch_sentiment_analysis_details" from "service_role";

revoke delete on table "public"."broadcast_recipients" from "anon";

revoke insert on table "public"."broadcast_recipients" from "anon";

revoke references on table "public"."broadcast_recipients" from "anon";

revoke select on table "public"."broadcast_recipients" from "anon";

revoke trigger on table "public"."broadcast_recipients" from "anon";

revoke truncate on table "public"."broadcast_recipients" from "anon";

revoke update on table "public"."broadcast_recipients" from "anon";

revoke delete on table "public"."broadcast_recipients" from "authenticated";

revoke insert on table "public"."broadcast_recipients" from "authenticated";

revoke references on table "public"."broadcast_recipients" from "authenticated";

revoke select on table "public"."broadcast_recipients" from "authenticated";

revoke trigger on table "public"."broadcast_recipients" from "authenticated";

revoke truncate on table "public"."broadcast_recipients" from "authenticated";

revoke update on table "public"."broadcast_recipients" from "authenticated";

revoke delete on table "public"."broadcast_recipients" from "service_role";

revoke insert on table "public"."broadcast_recipients" from "service_role";

revoke references on table "public"."broadcast_recipients" from "service_role";

revoke select on table "public"."broadcast_recipients" from "service_role";

revoke trigger on table "public"."broadcast_recipients" from "service_role";

revoke truncate on table "public"."broadcast_recipients" from "service_role";

revoke update on table "public"."broadcast_recipients" from "service_role";

revoke delete on table "public"."broadcasts" from "anon";

revoke insert on table "public"."broadcasts" from "anon";

revoke references on table "public"."broadcasts" from "anon";

revoke select on table "public"."broadcasts" from "anon";

revoke trigger on table "public"."broadcasts" from "anon";

revoke truncate on table "public"."broadcasts" from "anon";

revoke update on table "public"."broadcasts" from "anon";

revoke delete on table "public"."broadcasts" from "authenticated";

revoke insert on table "public"."broadcasts" from "authenticated";

revoke references on table "public"."broadcasts" from "authenticated";

revoke select on table "public"."broadcasts" from "authenticated";

revoke trigger on table "public"."broadcasts" from "authenticated";

revoke truncate on table "public"."broadcasts" from "authenticated";

revoke update on table "public"."broadcasts" from "authenticated";

revoke delete on table "public"."broadcasts" from "service_role";

revoke insert on table "public"."broadcasts" from "service_role";

revoke references on table "public"."broadcasts" from "service_role";

revoke select on table "public"."broadcasts" from "service_role";

revoke trigger on table "public"."broadcasts" from "service_role";

revoke truncate on table "public"."broadcasts" from "service_role";

revoke update on table "public"."broadcasts" from "service_role";

revoke delete on table "public"."conversation_participants" from "anon";

revoke insert on table "public"."conversation_participants" from "anon";

revoke references on table "public"."conversation_participants" from "anon";

revoke select on table "public"."conversation_participants" from "anon";

revoke trigger on table "public"."conversation_participants" from "anon";

revoke truncate on table "public"."conversation_participants" from "anon";

revoke update on table "public"."conversation_participants" from "anon";

revoke delete on table "public"."conversation_participants" from "authenticated";

revoke insert on table "public"."conversation_participants" from "authenticated";

revoke references on table "public"."conversation_participants" from "authenticated";

revoke select on table "public"."conversation_participants" from "authenticated";

revoke trigger on table "public"."conversation_participants" from "authenticated";

revoke truncate on table "public"."conversation_participants" from "authenticated";

revoke update on table "public"."conversation_participants" from "authenticated";

revoke delete on table "public"."conversation_participants" from "service_role";

revoke insert on table "public"."conversation_participants" from "service_role";

revoke references on table "public"."conversation_participants" from "service_role";

revoke select on table "public"."conversation_participants" from "service_role";

revoke trigger on table "public"."conversation_participants" from "service_role";

revoke truncate on table "public"."conversation_participants" from "service_role";

revoke update on table "public"."conversation_participants" from "service_role";

revoke delete on table "public"."conversation_summaries" from "anon";

revoke insert on table "public"."conversation_summaries" from "anon";

revoke references on table "public"."conversation_summaries" from "anon";

revoke select on table "public"."conversation_summaries" from "anon";

revoke trigger on table "public"."conversation_summaries" from "anon";

revoke truncate on table "public"."conversation_summaries" from "anon";

revoke update on table "public"."conversation_summaries" from "anon";

revoke delete on table "public"."conversation_summaries" from "authenticated";

revoke insert on table "public"."conversation_summaries" from "authenticated";

revoke references on table "public"."conversation_summaries" from "authenticated";

revoke select on table "public"."conversation_summaries" from "authenticated";

revoke trigger on table "public"."conversation_summaries" from "authenticated";

revoke truncate on table "public"."conversation_summaries" from "authenticated";

revoke update on table "public"."conversation_summaries" from "authenticated";

revoke delete on table "public"."conversation_summaries" from "service_role";

revoke insert on table "public"."conversation_summaries" from "service_role";

revoke references on table "public"."conversation_summaries" from "service_role";

revoke select on table "public"."conversation_summaries" from "service_role";

revoke trigger on table "public"."conversation_summaries" from "service_role";

revoke truncate on table "public"."conversation_summaries" from "service_role";

revoke update on table "public"."conversation_summaries" from "service_role";

revoke delete on table "public"."conversations" from "anon";

revoke insert on table "public"."conversations" from "anon";

revoke references on table "public"."conversations" from "anon";

revoke select on table "public"."conversations" from "anon";

revoke trigger on table "public"."conversations" from "anon";

revoke truncate on table "public"."conversations" from "anon";

revoke update on table "public"."conversations" from "anon";

revoke delete on table "public"."conversations" from "authenticated";

revoke insert on table "public"."conversations" from "authenticated";

revoke references on table "public"."conversations" from "authenticated";

revoke select on table "public"."conversations" from "authenticated";

revoke trigger on table "public"."conversations" from "authenticated";

revoke truncate on table "public"."conversations" from "authenticated";

revoke update on table "public"."conversations" from "authenticated";

revoke delete on table "public"."conversations" from "service_role";

revoke insert on table "public"."conversations" from "service_role";

revoke references on table "public"."conversations" from "service_role";

revoke select on table "public"."conversations" from "service_role";

revoke trigger on table "public"."conversations" from "service_role";

revoke truncate on table "public"."conversations" from "service_role";

revoke update on table "public"."conversations" from "service_role";

revoke delete on table "public"."customers" from "anon";

revoke insert on table "public"."customers" from "anon";

revoke references on table "public"."customers" from "anon";

revoke select on table "public"."customers" from "anon";

revoke trigger on table "public"."customers" from "anon";

revoke truncate on table "public"."customers" from "anon";

revoke update on table "public"."customers" from "anon";

revoke delete on table "public"."customers" from "authenticated";

revoke insert on table "public"."customers" from "authenticated";

revoke references on table "public"."customers" from "authenticated";

revoke select on table "public"."customers" from "authenticated";

revoke trigger on table "public"."customers" from "authenticated";

revoke truncate on table "public"."customers" from "authenticated";

revoke update on table "public"."customers" from "authenticated";

revoke delete on table "public"."customers" from "service_role";

revoke insert on table "public"."customers" from "service_role";

revoke references on table "public"."customers" from "service_role";

revoke select on table "public"."customers" from "service_role";

revoke trigger on table "public"."customers" from "service_role";

revoke truncate on table "public"."customers" from "service_role";

revoke update on table "public"."customers" from "service_role";

revoke delete on table "public"."evolution_webhook_events" from "anon";

revoke insert on table "public"."evolution_webhook_events" from "anon";

revoke references on table "public"."evolution_webhook_events" from "anon";

revoke select on table "public"."evolution_webhook_events" from "anon";

revoke trigger on table "public"."evolution_webhook_events" from "anon";

revoke truncate on table "public"."evolution_webhook_events" from "anon";

revoke update on table "public"."evolution_webhook_events" from "anon";

revoke delete on table "public"."evolution_webhook_events" from "authenticated";

revoke insert on table "public"."evolution_webhook_events" from "authenticated";

revoke references on table "public"."evolution_webhook_events" from "authenticated";

revoke select on table "public"."evolution_webhook_events" from "authenticated";

revoke trigger on table "public"."evolution_webhook_events" from "authenticated";

revoke truncate on table "public"."evolution_webhook_events" from "authenticated";

revoke update on table "public"."evolution_webhook_events" from "authenticated";

revoke delete on table "public"."evolution_webhook_events" from "service_role";

revoke insert on table "public"."evolution_webhook_events" from "service_role";

revoke references on table "public"."evolution_webhook_events" from "service_role";

revoke select on table "public"."evolution_webhook_events" from "service_role";

revoke trigger on table "public"."evolution_webhook_events" from "service_role";

revoke truncate on table "public"."evolution_webhook_events" from "service_role";

revoke update on table "public"."evolution_webhook_events" from "service_role";

revoke delete on table "public"."integrations" from "anon";

revoke insert on table "public"."integrations" from "anon";

revoke references on table "public"."integrations" from "anon";

revoke select on table "public"."integrations" from "anon";

revoke trigger on table "public"."integrations" from "anon";

revoke truncate on table "public"."integrations" from "anon";

revoke update on table "public"."integrations" from "anon";

revoke delete on table "public"."integrations" from "authenticated";

revoke insert on table "public"."integrations" from "authenticated";

revoke references on table "public"."integrations" from "authenticated";

revoke select on table "public"."integrations" from "authenticated";

revoke trigger on table "public"."integrations" from "authenticated";

revoke truncate on table "public"."integrations" from "authenticated";

revoke update on table "public"."integrations" from "authenticated";

revoke delete on table "public"."integrations" from "service_role";

revoke insert on table "public"."integrations" from "service_role";

revoke references on table "public"."integrations" from "service_role";

revoke select on table "public"."integrations" from "service_role";

revoke trigger on table "public"."integrations" from "service_role";

revoke truncate on table "public"."integrations" from "service_role";

revoke update on table "public"."integrations" from "service_role";

revoke delete on table "public"."integrations_config" from "anon";

revoke insert on table "public"."integrations_config" from "anon";

revoke references on table "public"."integrations_config" from "anon";

revoke select on table "public"."integrations_config" from "anon";

revoke trigger on table "public"."integrations_config" from "anon";

revoke truncate on table "public"."integrations_config" from "anon";

revoke update on table "public"."integrations_config" from "anon";

revoke delete on table "public"."integrations_config" from "authenticated";

revoke insert on table "public"."integrations_config" from "authenticated";

revoke references on table "public"."integrations_config" from "authenticated";

revoke select on table "public"."integrations_config" from "authenticated";

revoke trigger on table "public"."integrations_config" from "authenticated";

revoke truncate on table "public"."integrations_config" from "authenticated";

revoke update on table "public"."integrations_config" from "authenticated";

revoke delete on table "public"."integrations_config" from "service_role";

revoke insert on table "public"."integrations_config" from "service_role";

revoke references on table "public"."integrations_config" from "service_role";

revoke select on table "public"."integrations_config" from "service_role";

revoke trigger on table "public"."integrations_config" from "service_role";

revoke truncate on table "public"."integrations_config" from "service_role";

revoke update on table "public"."integrations_config" from "service_role";

revoke delete on table "public"."knowledge_chunks" from "anon";

revoke insert on table "public"."knowledge_chunks" from "anon";

revoke references on table "public"."knowledge_chunks" from "anon";

revoke select on table "public"."knowledge_chunks" from "anon";

revoke trigger on table "public"."knowledge_chunks" from "anon";

revoke truncate on table "public"."knowledge_chunks" from "anon";

revoke update on table "public"."knowledge_chunks" from "anon";

revoke delete on table "public"."knowledge_chunks" from "authenticated";

revoke insert on table "public"."knowledge_chunks" from "authenticated";

revoke references on table "public"."knowledge_chunks" from "authenticated";

revoke select on table "public"."knowledge_chunks" from "authenticated";

revoke trigger on table "public"."knowledge_chunks" from "authenticated";

revoke truncate on table "public"."knowledge_chunks" from "authenticated";

revoke update on table "public"."knowledge_chunks" from "authenticated";

revoke delete on table "public"."knowledge_chunks" from "service_role";

revoke insert on table "public"."knowledge_chunks" from "service_role";

revoke references on table "public"."knowledge_chunks" from "service_role";

revoke select on table "public"."knowledge_chunks" from "service_role";

revoke trigger on table "public"."knowledge_chunks" from "service_role";

revoke truncate on table "public"."knowledge_chunks" from "service_role";

revoke update on table "public"."knowledge_chunks" from "service_role";

revoke delete on table "public"."knowledge_documents" from "anon";

revoke insert on table "public"."knowledge_documents" from "anon";

revoke references on table "public"."knowledge_documents" from "anon";

revoke select on table "public"."knowledge_documents" from "anon";

revoke trigger on table "public"."knowledge_documents" from "anon";

revoke truncate on table "public"."knowledge_documents" from "anon";

revoke update on table "public"."knowledge_documents" from "anon";

revoke delete on table "public"."knowledge_documents" from "authenticated";

revoke insert on table "public"."knowledge_documents" from "authenticated";

revoke references on table "public"."knowledge_documents" from "authenticated";

revoke select on table "public"."knowledge_documents" from "authenticated";

revoke trigger on table "public"."knowledge_documents" from "authenticated";

revoke truncate on table "public"."knowledge_documents" from "authenticated";

revoke update on table "public"."knowledge_documents" from "authenticated";

revoke delete on table "public"."knowledge_documents" from "service_role";

revoke insert on table "public"."knowledge_documents" from "service_role";

revoke references on table "public"."knowledge_documents" from "service_role";

revoke select on table "public"."knowledge_documents" from "service_role";

revoke trigger on table "public"."knowledge_documents" from "service_role";

revoke truncate on table "public"."knowledge_documents" from "service_role";

revoke update on table "public"."knowledge_documents" from "service_role";

revoke delete on table "public"."lead_pipeline" from "anon";

revoke insert on table "public"."lead_pipeline" from "anon";

revoke references on table "public"."lead_pipeline" from "anon";

revoke select on table "public"."lead_pipeline" from "anon";

revoke trigger on table "public"."lead_pipeline" from "anon";

revoke truncate on table "public"."lead_pipeline" from "anon";

revoke update on table "public"."lead_pipeline" from "anon";

revoke delete on table "public"."lead_pipeline" from "authenticated";

revoke insert on table "public"."lead_pipeline" from "authenticated";

revoke references on table "public"."lead_pipeline" from "authenticated";

revoke select on table "public"."lead_pipeline" from "authenticated";

revoke trigger on table "public"."lead_pipeline" from "authenticated";

revoke truncate on table "public"."lead_pipeline" from "authenticated";

revoke update on table "public"."lead_pipeline" from "authenticated";

revoke delete on table "public"."lead_pipeline" from "service_role";

revoke insert on table "public"."lead_pipeline" from "service_role";

revoke references on table "public"."lead_pipeline" from "service_role";

revoke select on table "public"."lead_pipeline" from "service_role";

revoke trigger on table "public"."lead_pipeline" from "service_role";

revoke truncate on table "public"."lead_pipeline" from "service_role";

revoke update on table "public"."lead_pipeline" from "service_role";

revoke delete on table "public"."lead_tags" from "anon";

revoke insert on table "public"."lead_tags" from "anon";

revoke references on table "public"."lead_tags" from "anon";

revoke select on table "public"."lead_tags" from "anon";

revoke trigger on table "public"."lead_tags" from "anon";

revoke truncate on table "public"."lead_tags" from "anon";

revoke update on table "public"."lead_tags" from "anon";

revoke delete on table "public"."lead_tags" from "authenticated";

revoke insert on table "public"."lead_tags" from "authenticated";

revoke references on table "public"."lead_tags" from "authenticated";

revoke select on table "public"."lead_tags" from "authenticated";

revoke trigger on table "public"."lead_tags" from "authenticated";

revoke truncate on table "public"."lead_tags" from "authenticated";

revoke update on table "public"."lead_tags" from "authenticated";

revoke delete on table "public"."lead_tags" from "service_role";

revoke insert on table "public"."lead_tags" from "service_role";

revoke references on table "public"."lead_tags" from "service_role";

revoke select on table "public"."lead_tags" from "service_role";

revoke trigger on table "public"."lead_tags" from "service_role";

revoke truncate on table "public"."lead_tags" from "service_role";

revoke update on table "public"."lead_tags" from "service_role";

revoke delete on table "public"."leads" from "anon";

revoke insert on table "public"."leads" from "anon";

revoke references on table "public"."leads" from "anon";

revoke select on table "public"."leads" from "anon";

revoke trigger on table "public"."leads" from "anon";

revoke truncate on table "public"."leads" from "anon";

revoke update on table "public"."leads" from "anon";

revoke delete on table "public"."leads" from "authenticated";

revoke insert on table "public"."leads" from "authenticated";

revoke references on table "public"."leads" from "authenticated";

revoke select on table "public"."leads" from "authenticated";

revoke trigger on table "public"."leads" from "authenticated";

revoke truncate on table "public"."leads" from "authenticated";

revoke update on table "public"."leads" from "authenticated";

revoke delete on table "public"."leads" from "service_role";

revoke insert on table "public"."leads" from "service_role";

revoke references on table "public"."leads" from "service_role";

revoke select on table "public"."leads" from "service_role";

revoke trigger on table "public"."leads" from "service_role";

revoke truncate on table "public"."leads" from "service_role";

revoke update on table "public"."leads" from "service_role";

revoke delete on table "public"."message_logs" from "anon";

revoke insert on table "public"."message_logs" from "anon";

revoke references on table "public"."message_logs" from "anon";

revoke select on table "public"."message_logs" from "anon";

revoke trigger on table "public"."message_logs" from "anon";

revoke truncate on table "public"."message_logs" from "anon";

revoke update on table "public"."message_logs" from "anon";

revoke delete on table "public"."message_logs" from "authenticated";

revoke insert on table "public"."message_logs" from "authenticated";

revoke references on table "public"."message_logs" from "authenticated";

revoke select on table "public"."message_logs" from "authenticated";

revoke trigger on table "public"."message_logs" from "authenticated";

revoke truncate on table "public"."message_logs" from "authenticated";

revoke update on table "public"."message_logs" from "authenticated";

revoke delete on table "public"."message_logs" from "service_role";

revoke insert on table "public"."message_logs" from "service_role";

revoke references on table "public"."message_logs" from "service_role";

revoke select on table "public"."message_logs" from "service_role";

revoke trigger on table "public"."message_logs" from "service_role";

revoke truncate on table "public"."message_logs" from "service_role";

revoke update on table "public"."message_logs" from "service_role";

revoke delete on table "public"."messages" from "anon";

revoke insert on table "public"."messages" from "anon";

revoke references on table "public"."messages" from "anon";

revoke select on table "public"."messages" from "anon";

revoke trigger on table "public"."messages" from "anon";

revoke truncate on table "public"."messages" from "anon";

revoke update on table "public"."messages" from "anon";

revoke delete on table "public"."messages" from "authenticated";

revoke insert on table "public"."messages" from "authenticated";

revoke references on table "public"."messages" from "authenticated";

revoke select on table "public"."messages" from "authenticated";

revoke trigger on table "public"."messages" from "authenticated";

revoke truncate on table "public"."messages" from "authenticated";

revoke update on table "public"."messages" from "authenticated";

revoke delete on table "public"."messages" from "service_role";

revoke insert on table "public"."messages" from "service_role";

revoke references on table "public"."messages" from "service_role";

revoke select on table "public"."messages" from "service_role";

revoke trigger on table "public"."messages" from "service_role";

revoke truncate on table "public"."messages" from "service_role";

revoke update on table "public"."messages" from "service_role";

revoke delete on table "public"."pipeline_stages" from "anon";

revoke insert on table "public"."pipeline_stages" from "anon";

revoke references on table "public"."pipeline_stages" from "anon";

revoke select on table "public"."pipeline_stages" from "anon";

revoke trigger on table "public"."pipeline_stages" from "anon";

revoke truncate on table "public"."pipeline_stages" from "anon";

revoke update on table "public"."pipeline_stages" from "anon";

revoke delete on table "public"."pipeline_stages" from "authenticated";

revoke insert on table "public"."pipeline_stages" from "authenticated";

revoke references on table "public"."pipeline_stages" from "authenticated";

revoke select on table "public"."pipeline_stages" from "authenticated";

revoke trigger on table "public"."pipeline_stages" from "authenticated";

revoke truncate on table "public"."pipeline_stages" from "authenticated";

revoke update on table "public"."pipeline_stages" from "authenticated";

revoke delete on table "public"."pipeline_stages" from "service_role";

revoke insert on table "public"."pipeline_stages" from "service_role";

revoke references on table "public"."pipeline_stages" from "service_role";

revoke select on table "public"."pipeline_stages" from "service_role";

revoke trigger on table "public"."pipeline_stages" from "service_role";

revoke truncate on table "public"."pipeline_stages" from "service_role";

revoke update on table "public"."pipeline_stages" from "service_role";

revoke delete on table "public"."pipelines" from "anon";

revoke insert on table "public"."pipelines" from "anon";

revoke references on table "public"."pipelines" from "anon";

revoke select on table "public"."pipelines" from "anon";

revoke trigger on table "public"."pipelines" from "anon";

revoke truncate on table "public"."pipelines" from "anon";

revoke update on table "public"."pipelines" from "anon";

revoke delete on table "public"."pipelines" from "authenticated";

revoke insert on table "public"."pipelines" from "authenticated";

revoke references on table "public"."pipelines" from "authenticated";

revoke select on table "public"."pipelines" from "authenticated";

revoke trigger on table "public"."pipelines" from "authenticated";

revoke truncate on table "public"."pipelines" from "authenticated";

revoke update on table "public"."pipelines" from "authenticated";

revoke delete on table "public"."pipelines" from "service_role";

revoke insert on table "public"."pipelines" from "service_role";

revoke references on table "public"."pipelines" from "service_role";

revoke select on table "public"."pipelines" from "service_role";

revoke trigger on table "public"."pipelines" from "service_role";

revoke truncate on table "public"."pipelines" from "service_role";

revoke update on table "public"."pipelines" from "service_role";

revoke delete on table "public"."plans" from "anon";

revoke insert on table "public"."plans" from "anon";

revoke references on table "public"."plans" from "anon";

revoke select on table "public"."plans" from "anon";

revoke trigger on table "public"."plans" from "anon";

revoke truncate on table "public"."plans" from "anon";

revoke update on table "public"."plans" from "anon";

revoke delete on table "public"."plans" from "authenticated";

revoke insert on table "public"."plans" from "authenticated";

revoke references on table "public"."plans" from "authenticated";

revoke select on table "public"."plans" from "authenticated";

revoke trigger on table "public"."plans" from "authenticated";

revoke truncate on table "public"."plans" from "authenticated";

revoke update on table "public"."plans" from "authenticated";

revoke delete on table "public"."plans" from "service_role";

revoke insert on table "public"."plans" from "service_role";

revoke references on table "public"."plans" from "service_role";

revoke select on table "public"."plans" from "service_role";

revoke trigger on table "public"."plans" from "service_role";

revoke truncate on table "public"."plans" from "service_role";

revoke update on table "public"."plans" from "service_role";

-- Table profile_integration_access was dropped in migration 20250701143500_drop_profile_integration_access.sql
-- revoke delete on table "public"."profile_integration_access" from "anon";

-- revoke insert on table "public"."profile_integration_access" from "anon";

-- revoke references on table "public"."profile_integration_access" from "anon";

-- revoke select on table "public"."profile_integration_access" from "anon";

-- revoke trigger on table "public"."profile_integration_access" from "anon";

-- revoke truncate on table "public"."profile_integration_access" from "anon";

-- revoke update on table "public"."profile_integration_access" from "anon";

-- revoke delete on table "public"."profile_integration_access" from "authenticated";

-- revoke insert on table "public"."profile_integration_access" from "authenticated";

-- revoke references on table "public"."profile_integration_access" from "authenticated";

-- revoke select on table "public"."profile_integration_access" from "authenticated";

-- revoke trigger on table "public"."profile_integration_access" from "authenticated";

-- revoke truncate on table "public"."profile_integration_access" from "authenticated";

-- revoke update on table "public"."profile_integration_access" from "authenticated";

-- revoke delete on table "public"."profile_integration_access" from "service_role";

-- revoke insert on table "public"."profile_integration_access" from "service_role";

-- revoke references on table "public"."profile_integration_access" from "service_role";

-- revoke select on table "public"."profile_integration_access" from "service_role";

-- revoke trigger on table "public"."profile_integration_access" from "service_role";

-- revoke truncate on table "public"."profile_integration_access" from "service_role";

-- revoke update on table "public"."profile_integration_access" from "service_role";}]}}

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke select on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

revoke delete on table "public"."schema_embeddings" from "anon";

revoke insert on table "public"."schema_embeddings" from "anon";

revoke references on table "public"."schema_embeddings" from "anon";

revoke select on table "public"."schema_embeddings" from "anon";

revoke trigger on table "public"."schema_embeddings" from "anon";

revoke truncate on table "public"."schema_embeddings" from "anon";

revoke update on table "public"."schema_embeddings" from "anon";

revoke delete on table "public"."schema_embeddings" from "authenticated";

revoke insert on table "public"."schema_embeddings" from "authenticated";

revoke references on table "public"."schema_embeddings" from "authenticated";

revoke select on table "public"."schema_embeddings" from "authenticated";

revoke trigger on table "public"."schema_embeddings" from "authenticated";

revoke truncate on table "public"."schema_embeddings" from "authenticated";

revoke update on table "public"."schema_embeddings" from "authenticated";

revoke delete on table "public"."schema_embeddings" from "service_role";

revoke insert on table "public"."schema_embeddings" from "service_role";

revoke references on table "public"."schema_embeddings" from "service_role";

revoke select on table "public"."schema_embeddings" from "service_role";

revoke trigger on table "public"."schema_embeddings" from "service_role";

revoke truncate on table "public"."schema_embeddings" from "service_role";

revoke update on table "public"."schema_embeddings" from "service_role";

revoke delete on table "public"."segment_contacts" from "anon";

revoke insert on table "public"."segment_contacts" from "anon";

revoke references on table "public"."segment_contacts" from "anon";

revoke select on table "public"."segment_contacts" from "anon";

revoke trigger on table "public"."segment_contacts" from "anon";

revoke truncate on table "public"."segment_contacts" from "anon";

revoke update on table "public"."segment_contacts" from "anon";

revoke delete on table "public"."segment_contacts" from "authenticated";

revoke insert on table "public"."segment_contacts" from "authenticated";

revoke references on table "public"."segment_contacts" from "authenticated";

revoke select on table "public"."segment_contacts" from "authenticated";

revoke trigger on table "public"."segment_contacts" from "authenticated";

revoke truncate on table "public"."segment_contacts" from "authenticated";

revoke update on table "public"."segment_contacts" from "authenticated";

revoke delete on table "public"."segment_contacts" from "service_role";

revoke insert on table "public"."segment_contacts" from "service_role";

revoke references on table "public"."segment_contacts" from "service_role";

revoke select on table "public"."segment_contacts" from "service_role";

revoke trigger on table "public"."segment_contacts" from "service_role";

revoke truncate on table "public"."segment_contacts" from "service_role";

revoke update on table "public"."segment_contacts" from "service_role";

revoke delete on table "public"."segments" from "anon";

revoke insert on table "public"."segments" from "anon";

revoke references on table "public"."segments" from "anon";

revoke select on table "public"."segments" from "anon";

revoke trigger on table "public"."segments" from "anon";

revoke truncate on table "public"."segments" from "anon";

revoke update on table "public"."segments" from "anon";

revoke delete on table "public"."segments" from "authenticated";

revoke insert on table "public"."segments" from "authenticated";

revoke references on table "public"."segments" from "authenticated";

revoke select on table "public"."segments" from "authenticated";

revoke trigger on table "public"."segments" from "authenticated";

revoke truncate on table "public"."segments" from "authenticated";

revoke update on table "public"."segments" from "authenticated";

revoke delete on table "public"."segments" from "service_role";

revoke insert on table "public"."segments" from "service_role";

revoke references on table "public"."segments" from "service_role";

revoke select on table "public"."segments" from "service_role";

revoke trigger on table "public"."segments" from "service_role";

revoke truncate on table "public"."segments" from "service_role";

revoke update on table "public"."segments" from "service_role";

revoke delete on table "public"."subscriptions" from "anon";

revoke insert on table "public"."subscriptions" from "anon";

revoke references on table "public"."subscriptions" from "anon";

revoke select on table "public"."subscriptions" from "anon";

revoke trigger on table "public"."subscriptions" from "anon";

revoke truncate on table "public"."subscriptions" from "anon";

revoke update on table "public"."subscriptions" from "anon";

revoke delete on table "public"."subscriptions" from "authenticated";

revoke insert on table "public"."subscriptions" from "authenticated";

revoke references on table "public"."subscriptions" from "authenticated";

revoke select on table "public"."subscriptions" from "authenticated";

revoke trigger on table "public"."subscriptions" from "authenticated";

revoke truncate on table "public"."subscriptions" from "authenticated";

revoke update on table "public"."subscriptions" from "authenticated";

revoke delete on table "public"."subscriptions" from "service_role";

revoke insert on table "public"."subscriptions" from "service_role";

revoke references on table "public"."subscriptions" from "service_role";

revoke select on table "public"."subscriptions" from "service_role";

revoke trigger on table "public"."subscriptions" from "service_role";

revoke truncate on table "public"."subscriptions" from "service_role";

revoke update on table "public"."subscriptions" from "service_role";

revoke delete on table "public"."tags" from "anon";

revoke insert on table "public"."tags" from "anon";

revoke references on table "public"."tags" from "anon";

revoke select on table "public"."tags" from "anon";

revoke trigger on table "public"."tags" from "anon";

revoke truncate on table "public"."tags" from "anon";

revoke update on table "public"."tags" from "anon";

revoke delete on table "public"."tags" from "authenticated";

revoke insert on table "public"."tags" from "authenticated";

revoke references on table "public"."tags" from "authenticated";

revoke select on table "public"."tags" from "authenticated";

revoke trigger on table "public"."tags" from "authenticated";

revoke truncate on table "public"."tags" from "authenticated";

revoke update on table "public"."tags" from "authenticated";

revoke delete on table "public"."tags" from "service_role";

revoke insert on table "public"."tags" from "service_role";

revoke references on table "public"."tags" from "service_role";

revoke select on table "public"."tags" from "service_role";

revoke trigger on table "public"."tags" from "service_role";

revoke truncate on table "public"."tags" from "service_role";

revoke update on table "public"."tags" from "service_role";

revoke delete on table "public"."tasks" from "anon";

revoke insert on table "public"."tasks" from "anon";

revoke references on table "public"."tasks" from "anon";

revoke select on table "public"."tasks" from "anon";

revoke trigger on table "public"."tasks" from "anon";

revoke truncate on table "public"."tasks" from "anon";

revoke update on table "public"."tasks" from "anon";

revoke delete on table "public"."tasks" from "authenticated";

revoke insert on table "public"."tasks" from "authenticated";

revoke references on table "public"."tasks" from "authenticated";

revoke select on table "public"."tasks" from "authenticated";

revoke trigger on table "public"."tasks" from "authenticated";

revoke truncate on table "public"."tasks" from "authenticated";

revoke update on table "public"."tasks" from "authenticated";

revoke delete on table "public"."tasks" from "service_role";

revoke insert on table "public"."tasks" from "service_role";

revoke references on table "public"."tasks" from "service_role";

revoke select on table "public"."tasks" from "service_role";

revoke trigger on table "public"."tasks" from "service_role";

revoke truncate on table "public"."tasks" from "service_role";

revoke update on table "public"."tasks" from "service_role";

revoke delete on table "public"."team_users" from "anon";

revoke insert on table "public"."team_users" from "anon";

revoke references on table "public"."team_users" from "anon";

revoke select on table "public"."team_users" from "anon";

revoke trigger on table "public"."team_users" from "anon";

revoke truncate on table "public"."team_users" from "anon";

revoke update on table "public"."team_users" from "anon";

revoke delete on table "public"."team_users" from "authenticated";

revoke insert on table "public"."team_users" from "authenticated";

revoke references on table "public"."team_users" from "authenticated";

revoke select on table "public"."team_users" from "authenticated";

revoke trigger on table "public"."team_users" from "authenticated";

revoke truncate on table "public"."team_users" from "authenticated";

revoke update on table "public"."team_users" from "authenticated";

revoke delete on table "public"."team_users" from "service_role";

revoke insert on table "public"."team_users" from "service_role";

revoke references on table "public"."team_users" from "service_role";

revoke select on table "public"."team_users" from "service_role";

revoke trigger on table "public"."team_users" from "service_role";

revoke truncate on table "public"."team_users" from "service_role";

revoke update on table "public"."team_users" from "service_role";

revoke delete on table "public"."teams" from "anon";

revoke insert on table "public"."teams" from "anon";

revoke references on table "public"."teams" from "anon";

revoke select on table "public"."teams" from "anon";

revoke trigger on table "public"."teams" from "anon";

revoke truncate on table "public"."teams" from "anon";

revoke update on table "public"."teams" from "anon";

revoke delete on table "public"."teams" from "authenticated";

revoke insert on table "public"."teams" from "authenticated";

revoke references on table "public"."teams" from "authenticated";

revoke select on table "public"."teams" from "authenticated";

revoke trigger on table "public"."teams" from "authenticated";

revoke truncate on table "public"."teams" from "authenticated";

revoke update on table "public"."teams" from "authenticated";

revoke delete on table "public"."teams" from "service_role";

revoke insert on table "public"."teams" from "service_role";

revoke references on table "public"."teams" from "service_role";

revoke select on table "public"."teams" from "service_role";

revoke trigger on table "public"."teams" from "service_role";

revoke truncate on table "public"."teams" from "service_role";

revoke update on table "public"."teams" from "service_role";

revoke delete on table "public"."token_allocations" from "anon";

revoke insert on table "public"."token_allocations" from "anon";

revoke references on table "public"."token_allocations" from "anon";

revoke select on table "public"."token_allocations" from "anon";

revoke trigger on table "public"."token_allocations" from "anon";

revoke truncate on table "public"."token_allocations" from "anon";

revoke update on table "public"."token_allocations" from "anon";

revoke delete on table "public"."token_allocations" from "authenticated";

revoke insert on table "public"."token_allocations" from "authenticated";

revoke references on table "public"."token_allocations" from "authenticated";

revoke select on table "public"."token_allocations" from "authenticated";

revoke trigger on table "public"."token_allocations" from "authenticated";

revoke truncate on table "public"."token_allocations" from "authenticated";

revoke update on table "public"."token_allocations" from "authenticated";

revoke delete on table "public"."token_allocations" from "service_role";

revoke insert on table "public"."token_allocations" from "service_role";

revoke references on table "public"."token_allocations" from "service_role";

revoke select on table "public"."token_allocations" from "service_role";

revoke trigger on table "public"."token_allocations" from "service_role";

revoke truncate on table "public"."token_allocations" from "service_role";

revoke update on table "public"."token_allocations" from "service_role";

revoke delete on table "public"."token_usage" from "anon";

revoke insert on table "public"."token_usage" from "anon";

revoke references on table "public"."token_usage" from "anon";

revoke select on table "public"."token_usage" from "anon";

revoke trigger on table "public"."token_usage" from "anon";

revoke truncate on table "public"."token_usage" from "anon";

revoke update on table "public"."token_usage" from "anon";

revoke delete on table "public"."token_usage" from "authenticated";

revoke insert on table "public"."token_usage" from "authenticated";

revoke references on table "public"."token_usage" from "authenticated";

revoke select on table "public"."token_usage" from "authenticated";

revoke trigger on table "public"."token_usage" from "authenticated";

revoke truncate on table "public"."token_usage" from "authenticated";

revoke update on table "public"."token_usage" from "authenticated";

revoke delete on table "public"."token_usage" from "service_role";

revoke insert on table "public"."token_usage" from "service_role";

revoke references on table "public"."token_usage" from "service_role";

revoke select on table "public"."token_usage" from "service_role";

revoke trigger on table "public"."token_usage" from "service_role";

revoke truncate on table "public"."token_usage" from "service_role";

revoke update on table "public"."token_usage" from "service_role";

alter table "public"."agent_availability_settings" drop constraint "agent_availability_settings_agent_id_day_of_week_key";

alter table "public"."agent_availability_settings" drop constraint "agent_availability_settings_agent_id_fkey";

alter table "public"."agent_google_calendar_settings" drop constraint "agent_google_calendar_settings_agent_id_fkey";

-- alter table "public"."ai_agent_integrations" drop constraint "ai_agent_integrations_integration_id_fkey";

-- alter table "public"."ai_agent_sessions" drop constraint "ai_agent_sessions_contact_identifier_agent_id_integration_i_key";

alter table "public"."ai_agent_sessions" drop constraint "ai_agent_sessions_integration_id_fkey";

alter table "public"."integrations" drop constraint "integrations_team_id_fkey";

alter table "public"."leads" drop constraint "leads_team_id_fkey";

alter table "public"."pipelines" drop constraint "pipelines_team_id_fkey";

alter table "public"."plans" drop constraint "plans_team_id_fkey";

-- alter table "public"."profile_integration_access" drop constraint "profile_integration_access_created_by_fkey";

-- alter table "public"."profile_integration_access" drop constraint "profile_integration_access_integration_id_fkey";

-- alter table "public"."profile_integration_access" drop constraint "profile_integration_access_profile_id_fkey";

-- alter table "public"."profile_integration_access" drop constraint "unique_profile_integration";}]}]}}}

alter table "public"."subscriptions" drop constraint "subscriptions_team_id_fkey";

alter table "public"."team_users" drop constraint "team_users_role_check";

alter table "public"."team_users" drop constraint "team_users_team_id_fkey";

alter table "public"."team_users" drop constraint "team_users_team_id_user_id_key";

alter table "public"."team_users" drop constraint "team_users_user_id_fkey";

alter table "public"."token_usage" drop constraint "token_usage_conversation_id_fkey";

alter table "public"."token_usage" drop constraint "token_usage_user_id_fkey";

alter table "public"."message_logs" drop constraint "message_logs_integration_config_id_fkey";

drop function if exists "public"."create_new_team"(p_name text);

alter table "public"."agent_availability_settings" drop constraint "agent_availability_settings_pkey";

alter table "public"."agent_google_calendar_settings" drop constraint "agent_google_calendar_settings_pkey";

-- alter table "public"."ai_agent_integrations" drop constraint "ai_agent_integrations_pkey"; -- Table dropped in earlier migration

-- alter table "public"."profile_integration_access" drop constraint "profile_integration_access_pkey";

alter table "public"."team_users" drop constraint "team_users_pkey";

alter table "public"."teams" drop constraint "teams_pkey";

alter table "public"."token_usage" drop constraint "token_usage_pkey";

drop index if exists "public"."agent_availability_settings_agent_id_day_of_week_key";

drop index if exists "public"."agent_availability_settings_pkey";

drop index if exists "public"."agent_google_calendar_settings_pkey";

-- drop index if exists "public"."ai_agent_integrations_pkey";

-- drop index if exists "public"."ai_agent_sessions_contact_identifier_agent_id_integration_i_key";

-- drop index if exists "public"."idx_ai_agent_integrations_integration_id";

drop index if exists "public"."idx_ai_agent_sessions_contact_agent_integration";

-- drop index if exists "public"."idx_profile_integration_access_integration_id";

drop index if exists "public"."idx_subscriptions_team_id";

-- drop index if exists "public"."profile_integration_access_pkey";

drop index if exists "public"."team_users_pkey";

drop index if exists "public"."team_users_team_id_user_id_key";

drop index if exists "public"."teams_pkey";

drop index if exists "public"."token_usage_pkey";

drop index if exists "public"."unique_profile_integration";

drop index if exists "public"."uq_team_active_subscription";

drop table "public"."agent_availability_settings";

drop table "public"."agent_google_calendar_settings";

-- drop table "public"."profile_integration_access"; -- Already dropped in migration 20250701143500_drop_profile_integration_access.sql

drop table "public"."team_users";

drop table "public"."teams";

drop table "public"."token_usage";


  create table "public"."appointments" (
    "id" uuid not null default gen_random_uuid(),
    "title" text,
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "contact_identifier" text,
    "source_channel" text default 'whatsapp'::text,
    "status" text default 'scheduled'::text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."blacklisted_customers" (
    "id" uuid not null,
    "phone_number" text not null
      );



  create table "public"."documents" (
    "id" uuid not null,
    "content" text,
    "embedding" vector(1536),
    "metadata" jsonb
      );



  create table "public"."plan_message_usage" (
    "id" uuid not null default gen_random_uuid(),
    "subscription_id" uuid not null,
    "billing_cycle_year" integer not null,
    "billing_cycle_month" integer not null,
    "messages_sent_this_cycle" integer not null default 0,
    "last_counted_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
      );



  create table "public"."vector_db_v1" (
    "id" uuid not null default gen_random_uuid(),
    "content" text,
    "metadata" jsonb,
    "embedding" vector(1536),
    "document_id" uuid not null,
    "chunk_type" text default 'text'::text
      );



  create table "public"."vector_db_v2" (
    "id" bigint generated always as identity not null,
    "content" text,
    "fts" tsvector generated always as (to_tsvector('english'::regconfig, content)) stored,
    "embedding" vector(1536),
    "document_id" uuid not null,
    "chunk_type" text default 'text'::text,
    "metadata" jsonb
      );



  create table "public"."whatsapp_blast_limits" (
    "id" uuid not null default gen_random_uuid(),
    "date" date not null,
    "blast_limit" integer not null,
    "count" integer not null default 0
      );


-- alter table "public"."ai_agent_integrations" drop column "integration_id";

-- alter table "public"."ai_agent_integrations" add column "integrations_config_id" uuid;

alter table "public"."ai_agent_sessions" drop column "integration_id";

alter table "public"."ai_agent_sessions" add column "integrations_config_id" uuid;

alter table "public"."ai_agents" add column "agent_type" text not null default 'chattalyst'::text;

alter table "public"."ai_agents" add column "custom_agent_config" jsonb;

alter table "public"."batch_sentiment_analysis" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."batch_sentiment_analysis_details" disable row level security;

-- alter table "public"."broadcasts" drop column "image_url"; -- Column does not exist

alter table "public"."broadcasts" drop column "recipient_count";

alter table "public"."broadcasts" drop column "scheduled_at";

-- alter table "public"."broadcasts" add column "segment_id" uuid; -- Column already exists

alter table "public"."broadcasts" alter column "updated_at" set default now();

alter table "public"."broadcasts" alter column "updated_at" drop not null;

alter table "public"."integrations" drop column "team_id";

alter table "public"."integrations" drop column "team_visibility";

alter table "public"."lead_pipeline" disable row level security;

alter table "public"."lead_tags" enable row level security;

alter table "public"."leads" drop column "team_id";

alter table "public"."leads" disable row level security;

alter table "public"."message_logs" alter column "direction" set default 'outgoing'::text;

alter table "public"."message_logs" alter column "direction" set not null;

alter table "public"."message_logs" alter column "message_type" set default 'unknown'::message_log_type;

alter table "public"."message_logs" alter column "message_type" set not null;

alter table "public"."message_logs" alter column "message_type" set data type message_log_type using "message_type"::message_log_type;

alter table "public"."message_logs" alter column "recipient_identifier" set not null;

alter table "public"."message_logs" alter column "status" set default 'pending'::message_log_status;

alter table "public"."message_logs" alter column "status" set not null;

alter table "public"."message_logs" alter column "status" set data type message_log_status using "status"::message_log_status;

alter table "public"."messages" add column "media_data" jsonb;

alter table "public"."messages" add column "media_type" text;

alter table "public"."messages" alter column "content" drop not null;

alter table "public"."pipeline_stages" disable row level security;

alter table "public"."pipelines" drop column "team_id";

alter table "public"."pipelines" disable row level security;

alter table "public"."plans" drop column "team_id";

alter table "public"."subscriptions" drop column "team_id";

alter table "public"."subscriptions" disable row level security;

alter table "public"."tags" enable row level security;

CREATE UNIQUE INDEX ai_agent_sessions_contact_agent_integrations_config_unique ON public.ai_agent_sessions USING btree (contact_identifier, agent_id, integrations_config_id);

CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id);

CREATE UNIQUE INDEX blacklisted_customers_phone_number_key ON public.blacklisted_customers USING btree (phone_number);

CREATE UNIQUE INDEX blacklisted_customers_pkey ON public.blacklisted_customers USING btree (id);

CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);

CREATE INDEX idx_ai_agent_sessions_integrations_config_id ON public.ai_agent_sessions USING btree (integrations_config_id);

CREATE INDEX idx_appointments_contact_identifier ON public.appointments USING btree (contact_identifier);

CREATE INDEX idx_appointments_start_time ON public.appointments USING btree (start_time);

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);

CREATE INDEX idx_integrations_config_integration_id ON public.integrations_config USING btree (integration_id);

CREATE INDEX idx_message_logs_created_at ON public.message_logs USING btree (created_at);

CREATE INDEX idx_message_logs_integration_config_id ON public.message_logs USING btree (integration_config_id);

CREATE INDEX idx_message_logs_profile_id ON public.message_logs USING btree (profile_id);

CREATE INDEX idx_message_logs_recipient_identifier ON public.message_logs USING btree (recipient_identifier);

CREATE INDEX idx_message_logs_status ON public.message_logs USING btree (status);

CREATE INDEX idx_plan_message_usage_subscription_cycle ON public.plan_message_usage USING btree (subscription_id, billing_cycle_year, billing_cycle_month);

CREATE UNIQUE INDEX plan_message_usage_pkey ON public.plan_message_usage USING btree (id);

CREATE UNIQUE INDEX unique_integration_instance_owner_null_idx ON public.integrations_config USING btree (integration_id, instance_id) WHERE ((owner_id IS NULL) AND (instance_id IS NOT NULL));

CREATE UNIQUE INDEX unique_integration_owner_instance_not_null_idx ON public.integrations_config USING btree (integration_id, owner_id, instance_id) WHERE ((owner_id IS NOT NULL) AND (instance_id IS NOT NULL));

CREATE UNIQUE INDEX uq_subscription_billing_cycle ON public.plan_message_usage USING btree (subscription_id, billing_cycle_year, billing_cycle_month);

CREATE INDEX vector_db_v1_embedding_idx ON public.vector_db_v1 USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');

CREATE UNIQUE INDEX vector_db_v1_pkey ON public.vector_db_v1 USING btree (id);

CREATE INDEX vector_db_v2_embedding_idx ON public.vector_db_v2 USING hnsw (embedding vector_ip_ops);

CREATE INDEX vector_db_v2_fts_idx ON public.vector_db_v2 USING gin (fts);

CREATE UNIQUE INDEX vector_db_v2_pkey ON public.vector_db_v2 USING btree (id);

CREATE UNIQUE INDEX whatsapp_blast_limits_pkey ON public.whatsapp_blast_limits USING btree (id);

alter table "public"."appointments" add constraint "appointments_pkey" PRIMARY KEY using index "appointments_pkey";

alter table "public"."blacklisted_customers" add constraint "blacklisted_customers_pkey" PRIMARY KEY using index "blacklisted_customers_pkey";

alter table "public"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

alter table "public"."plan_message_usage" add constraint "plan_message_usage_pkey" PRIMARY KEY using index "plan_message_usage_pkey";

alter table "public"."vector_db_v1" add constraint "vector_db_v1_pkey" PRIMARY KEY using index "vector_db_v1_pkey";

alter table "public"."vector_db_v2" add constraint "vector_db_v2_pkey" PRIMARY KEY using index "vector_db_v2_pkey";

alter table "public"."whatsapp_blast_limits" add constraint "whatsapp_blast_limits_pkey" PRIMARY KEY using index "whatsapp_blast_limits_pkey";

-- alter table "public"."ai_agent_integrations" add constraint "ai_agent_integrations_integrations_config_id_fkey" FOREIGN KEY (integrations_config_id) REFERENCES integrations_config(id) ON DELETE CASCADE not valid;

-- alter table "public"."ai_agent_integrations" validate constraint "ai_agent_integrations_integrations_config_id_fkey";

alter table "public"."ai_agent_sessions" add constraint "ai_agent_sessions_contact_agent_integrations_config_unique" UNIQUE using index "ai_agent_sessions_contact_agent_integrations_config_unique";

alter table "public"."ai_agent_sessions" add constraint "ai_agent_sessions_integrations_config_id_fkey" FOREIGN KEY (integrations_config_id) REFERENCES integrations_config(id) ON DELETE SET NULL not valid;

alter table "public"."ai_agent_sessions" validate constraint "ai_agent_sessions_integrations_config_id_fkey";

alter table "public"."blacklisted_customers" add constraint "blacklisted_customers_id_fkey" FOREIGN KEY (id) REFERENCES customers(id) ON DELETE CASCADE not valid;

alter table "public"."blacklisted_customers" validate constraint "blacklisted_customers_id_fkey";

alter table "public"."blacklisted_customers" add constraint "blacklisted_customers_phone_number_key" UNIQUE using index "blacklisted_customers_phone_number_key";

alter table "public"."broadcasts" add constraint "fk_broadcasts_segment_id" FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE SET NULL not valid;

alter table "public"."broadcasts" validate constraint "fk_broadcasts_segment_id";

alter table "public"."message_logs" add constraint "message_logs_direction_check" CHECK ((direction = 'outgoing'::text)) not valid;

alter table "public"."message_logs" validate constraint "message_logs_direction_check";

alter table "public"."plan_message_usage" add constraint "plan_message_usage_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE not valid;

alter table "public"."plan_message_usage" validate constraint "plan_message_usage_subscription_id_fkey";

alter table "public"."plan_message_usage" add constraint "uq_subscription_billing_cycle" UNIQUE using index "uq_subscription_billing_cycle";

alter table "public"."vector_db_v1" add constraint "fk_vector_to_document" FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE not valid;

alter table "public"."vector_db_v1" validate constraint "fk_vector_to_document";

alter table "public"."vector_db_v1" add constraint "vector_chunk_type_check" CHECK ((chunk_type = ANY (ARRAY['text'::text, 'image'::text]))) not valid;

alter table "public"."vector_db_v1" validate constraint "vector_chunk_type_check";

alter table "public"."vector_db_v2" add constraint "fk_vector_to_document" FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE not valid;

alter table "public"."vector_db_v2" validate constraint "fk_vector_to_document";

alter table "public"."vector_db_v2" add constraint "vector_chunk_type_check" CHECK ((chunk_type = ANY (ARRAY['text'::text, 'image'::text]))) not valid;

alter table "public"."vector_db_v2" validate constraint "vector_chunk_type_check";

alter table "public"."message_logs" add constraint "message_logs_integration_config_id_fkey" FOREIGN KEY (integration_config_id) REFERENCES integrations_config(id) ON DELETE CASCADE not valid;

alter table "public"."message_logs" validate constraint "message_logs_integration_config_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_last_10_convo()
 RETURNS TABLE(customer_id uuid, phone_number text, name text, conversation_id uuid, content text)
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
WITH recent_conversations_cte AS (
    SELECT c_tbl.conversation_id
    FROM public.conversations c_tbl
    WHERE c_tbl.updated_at < NOW() - INTERVAL '1 hour'
),
participants_cte AS (
    SELECT cp_tbl.customer_id, cp_tbl.conversation_id AS p_conversation_id
    FROM public.conversation_participants cp_tbl
    JOIN recent_conversations_cte rc_cte ON cp_tbl.conversation_id = rc_cte.conversation_id
),
ranked_messages_cte AS (
    SELECT m_tbl.conversation_id AS rm_conversation_id, m_tbl.content,
           ROW_NUMBER() OVER (PARTITION BY m_tbl.conversation_id ORDER BY m_tbl.created_at DESC) AS rn
    FROM public.messages m_tbl
    JOIN recent_conversations_cte rc_cte ON m_tbl.conversation_id = rc_cte.conversation_id
)
SELECT p_cte.customer_id, cust_tbl.phone_number, cust_tbl.name, rm_cte.rm_conversation_id AS conversation_id, rm_cte.content
FROM participants_cte p_cte
JOIN public.customers cust_tbl ON p_cte.customer_id = cust_tbl.id
JOIN ranked_messages_cte rm_cte ON p_cte.p_conversation_id = rm_cte.rm_conversation_id
WHERE rm_cte.rn <= 10;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation_and_participants(p_integration_id uuid, p_customer_id uuid, p_profile_id uuid, p_customer_external_id text)
 RETURNS TABLE(conversation_id uuid, sender_participant_id uuid, recipient_participant_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_conversation_id uuid;
    v_sender_participant_id uuid;
    v_recipient_participant_id uuid;
BEGIN
    -- Step 1: Find or create the conversation and the recipient (customer) participant
    -- Try to find an existing conversation for this customer via this integration
    SELECT cp.conversation_id, cp.id
    INTO v_conversation_id, v_recipient_participant_id
    FROM public.conversation_participants cp
    JOIN public.conversations c ON cp.conversation_id = c.conversation_id
    WHERE cp.customer_id = p_customer_id 
      AND c.integrations_id = p_integration_id
    LIMIT 1;

    IF v_conversation_id IS NULL THEN
        -- No existing conversation for this customer and integration, create new
        INSERT INTO public.conversations (integrations_id)
        VALUES (p_integration_id)
        RETURNING public.conversations.conversation_id INTO v_conversation_id;

        -- Create participant entry for the customer
        INSERT INTO public.conversation_participants (conversation_id, customer_id, external_user_identifier, role)
        VALUES (v_conversation_id, p_customer_id, p_customer_external_id, NULL) 
        RETURNING id INTO v_recipient_participant_id;
    END IF;

    -- Step 2: Find or create the sender (profile) participant for this conversation
    SELECT cp.id
    INTO v_sender_participant_id
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = v_conversation_id
      AND cp.external_user_identifier = p_profile_id::text 
      AND cp.customer_id IS NULL -- Differentiates from customer participants
    LIMIT 1;

    IF v_sender_participant_id IS NULL THEN
        -- Create participant entry for the sender (profile)
        INSERT INTO public.conversation_participants (conversation_id, external_user_identifier, role)
        VALUES (v_conversation_id, p_profile_id::text, 'member') 
        RETURNING id INTO v_sender_participant_id;
    END IF;

    RETURN QUERY SELECT v_conversation_id, v_sender_participant_id, v_recipient_participant_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_message_usage(p_subscription_id uuid, p_year integer, p_month integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.plan_message_usage (
        subscription_id,
        billing_cycle_year,
        billing_cycle_month,
        messages_sent_this_cycle,
        last_counted_at
    )
    VALUES (
        p_subscription_id,
        p_year,
        p_month,
        1, -- Start with 1 for the new cycle or new message
        timezone('utc'::text, now())
    )
    ON CONFLICT (subscription_id, billing_cycle_year, billing_cycle_month)
    DO UPDATE SET
        messages_sent_this_cycle = public.plan_message_usage.messages_sent_this_cycle + 1,
        last_counted_at = timezone('utc'::text, now());
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_documents(query_embedding vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.match_vector_db_v1(query_embedding vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id uuid, content text, metadata jsonb, embedding jsonb, similarity double precision)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    (embedding::text)::jsonb as embedding,
    1 - (vector_db_v1.embedding <=> query_embedding) as similarity
  from vector_db_v1
  where metadata @> filter
  order by vector_db_v1.embedding <=> query_embedding
  limit match_count;
end;
$function$
;

-- Function commented out because it references dropped table ai_agent_knowledge_documents
/*
CREATE OR REPLACE FUNCTION public.match_vector_db_v1_for_agent(query_embedding vector, p_agent_id uuid, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id uuid, content text, metadata jsonb, embedding jsonb, similarity double precision, document_id uuid, chunk_type text, image_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
    SELECT
      v.id,
      v.content,
      v.metadata,
      (v.embedding::TEXT)::JSONB AS embedding,
      1 - (v.embedding <=> query_embedding) AS similarity,
      v.document_id,
      v.chunk_type,
      CASE
        WHEN v.chunk_type = 'image'
          AND jsonb_typeof(v.metadata->'image_info') = 'array'
          AND jsonb_array_length(v.metadata->'image_info') > 0
        THEN (v.metadata->'image_info'->0->>'public_url')
        ELSE NULL
      END AS image_url
    FROM vector_db_v1 v
    JOIN ai_agent_knowledge_documents akd
      ON v.document_id = akd.document_id
    WHERE akd.agent_id = p_agent_id
      AND v.metadata @> filter
    ORDER BY v.embedding <=> query_embedding
    LIMIT match_count;
END;
$function$
;
*/

CREATE OR REPLACE FUNCTION public.match_vector_db_v1_for_n8n(query_embedding vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id uuid, content text, metadata jsonb, embedding jsonb, similarity double precision, document_id uuid, chunk_type text, image_url text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
    SELECT
      v.id,
      v.content,
      v.metadata,
      (v.embedding::TEXT)::JSONB AS embedding,
      1 - (v.embedding <=> query_embedding) AS similarity,
      v.document_id,
      v.chunk_type,
      CASE
        WHEN v.chunk_type = 'image'
          AND jsonb_typeof(v.metadata->'image_info') = 'array'
          AND jsonb_array_length(v.metadata->'image_info') > 0
        THEN (v.metadata->'image_info'->0->>'public_url')
        ELSE NULL
      END AS image_url
    FROM vector_db_v1 v
    WHERE v.metadata @> filter
    ORDER BY v.embedding <=> query_embedding
    LIMIT match_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_vector_db_v2_for_n8n(filter jsonb, match_count integer, query_embedding vector, full_text_weight double precision DEFAULT 1, semantic_weight double precision DEFAULT 1, rrf_k integer DEFAULT 50, query_text text DEFAULT ''::text)
 RETURNS TABLE(id bigint, content text, metadata jsonb, embedding jsonb, similarity double precision, document_id uuid, chunk_type text, image_url text, rrf_score double precision)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  WITH full_text AS (
    SELECT
      v.id,
      ROW_NUMBER() OVER(ORDER BY ts_rank_cd(v.fts, websearch_to_tsquery(query_text)) DESC) as rank_ix
    FROM
      vector_db_v2 v
    WHERE
      v.fts @@ websearch_to_tsquery(query_text)
      AND v.metadata @> filter
    ORDER BY rank_ix
    LIMIT LEAST(match_count, 30) * 2
  ),
  semantic AS (
    SELECT
      v.id,
      ROW_NUMBER() OVER(ORDER BY v.embedding <=> query_embedding) as rank_ix
    FROM
      vector_db_v2 v
    WHERE
      v.metadata @> filter
    ORDER BY rank_ix
    LIMIT LEAST(match_count, 30) * 2
  )
  SELECT
    v.id,
    v.content,
    v.metadata,
    (v.embedding::TEXT)::JSONB AS embedding,
    1 - (v.embedding <=> query_embedding) AS similarity,
    v.document_id,
    v.chunk_type,
    CASE
      WHEN v.chunk_type = 'image'
        AND jsonb_typeof(v.metadata->'image_info') = 'array'
        AND jsonb_array_length(v.metadata->'image_info') > 0
      THEN (v.metadata->'image_info'->0->>'public_url')
      ELSE NULL
    END AS image_url,
    COALESCE(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight +
    COALESCE(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight AS rrf_score
  FROM
    full_text
    FULL OUTER JOIN semantic ON full_text.id = semantic.id
    JOIN vector_db_v2 v ON COALESCE(full_text.id, semantic.id) = v.id
  WHERE
    v.metadata @> filter
  ORDER BY
    rrf_score DESC
  LIMIT
    LEAST(match_count, 30);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mwtestt()
 RETURNS TABLE(recipient_identifier text, customer_name text, customer_email text, message_content text, direction text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
WITH LastOutgoingMessage AS (
    -- Find the last message sent by the business (outgoing) to each recipient
    SELECT
        ml.recipient_identifier,
        MAX(ml.created_at) AS last_outgoing_message_time
    FROM
        public.message_logs ml
    WHERE
        ml.direction = 'outgoing'
    GROUP BY
        ml.recipient_identifier
),
CustomerReplies AS (
    -- Find if the customer replied (incoming) after the last outgoing message
    SELECT
        lom.recipient_identifier,
        lom.last_outgoing_message_time,
        MAX(CASE WHEN ml_reply.direction = 'incoming' THEN ml_reply.created_at ELSE NULL END) AS last_reply_time
    FROM
        LastOutgoingMessage lom
    LEFT JOIN
        public.message_logs ml_reply ON lom.recipient_identifier = ml_reply.recipient_identifier
                                    AND ml_reply.direction = 'incoming'
                                    AND ml_reply.created_at > lom.last_outgoing_message_time
    GROUP BY
        lom.recipient_identifier, lom.last_outgoing_message_time
),
CustomersWithoutReplies AS (
    -- Filter for customers who haven't replied after the last outgoing message
    SELECT
        cr.recipient_identifier
    FROM
        CustomerReplies cr
    WHERE
        cr.last_reply_time IS NULL
),
RankedMessages AS (
    -- Get all messages for these customers and rank them by time to get the last 5
    SELECT
        ml.recipient_identifier,
        ml.message_content,
        ml.direction,
        ml.created_at,
        c.name AS customer_name,
        c.email AS customer_email,
        ROW_NUMBER() OVER (PARTITION BY ml.recipient_identifier ORDER BY ml.created_at DESC) as rn
    FROM
        public.message_logs ml
    JOIN
        CustomersWithoutReplies cwr ON ml.recipient_identifier = cwr.recipient_identifier
    LEFT JOIN
        public.customers c ON ml.recipient_identifier = c.phone_number -- Assuming recipient_identifier is phone_number
)
-- Select the last 5 messages for each customer who hasn't replied
SELECT
    rm.recipient_identifier,
    rm.customer_name,
    rm.customer_email,
    rm.message_content,
    rm.direction,
    rm.created_at
FROM
    RankedMessages rm
WHERE
    rm.rn <= 5
ORDER BY
    rm.recipient_identifier,
    rm.created_at DESC;
END;$function$
;

CREATE OR REPLACE FUNCTION public.n8n_match_knowledge_chunks_test(p_filter text, p_match_count integer, p_query_embedding vector)
 RETURNS TABLE(id uuid, content text, similarity real)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_match_threshold REAL := 0.7; -- You can adjust this default threshold
    v_document_id UUID := NULL;
BEGIN
    -- Try to convert p_filter to UUID. If it fails, v_document_id remains NULL.
    BEGIN
        IF p_filter IS NOT NULL AND p_filter <> '' THEN
            v_document_id := p_filter::UUID;
        END IF;
    EXCEPTION
        WHEN invalid_text_representation THEN
            RAISE NOTICE 'p_filter "%" is not a valid UUID. Proceeding without document_id filter.', p_filter;
            v_document_id := NULL; -- Ensure it's NULL if conversion fails
    END;

    RETURN QUERY
    SELECT
        kc.id,
        kc.content,
        (1 - (kc.embedding <=> p_query_embedding)) AS similarity -- Cosine similarity for pgvector
    FROM
        public.knowledge_chunks kc
    WHERE
        (v_document_id IS NULL OR kc.document_id = v_document_id) AND -- Apply document_id filter if valid
        kc.enabled = TRUE AND -- Only search enabled chunks
        (1 - (kc.embedding <=> p_query_embedding)) >= v_match_threshold
    ORDER BY
        similarity DESC
    LIMIT
        p_match_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_blacklist_customer_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Lookup the customer ID by phone number
  select c.id into NEW.id
  from customers c
  where c.phone_number = NEW.phone_number;

  -- If no match found, raise an error
  if NEW.id is null then
    raise exception 'Customer with phone number % not found.', NEW.phone_number;
  end if;

  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_integration_config(p_integration_id uuid, p_instance_id text, p_instance_display_name text, p_token text, p_owner_id uuid, p_user_reference_id text, p_pipeline_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Case 1: owner_id IS NOT NULL and instance_id IS NOT NULL
    IF p_owner_id IS NOT NULL AND p_instance_id IS NOT NULL THEN
        INSERT INTO public.integrations_config (
            integration_id, instance_id, owner_id, instance_display_name, token, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, p_owner_id, p_instance_display_name, p_token, p_user_reference_id, p_pipeline_id, p_status
        )
        ON CONFLICT (integration_id, owner_id, instance_id) WHERE owner_id IS NOT NULL AND instance_id IS NOT NULL -- Match unique_integration_owner_instance_not_null_idx
        DO UPDATE SET
            instance_display_name = EXCLUDED.instance_display_name,
            token = EXCLUDED.token,
            user_reference_id = EXCLUDED.user_reference_id,
            pipeline_id = EXCLUDED.pipeline_id,
            status = EXCLUDED.status,
            updated_at = NOW();
            -- integration_id, owner_id, and instance_id are conflict keys, so they don't change in the SET clause.

    -- Case 2: owner_id IS NULL and instance_id IS NOT NULL
    ELSIF p_owner_id IS NULL AND p_instance_id IS NOT NULL THEN
        INSERT INTO public.integrations_config (
            integration_id, instance_id, owner_id, instance_display_name, token, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, NULL, p_instance_display_name, p_token, p_user_reference_id, p_pipeline_id, p_status
        )
        ON CONFLICT (integration_id, instance_id) WHERE owner_id IS NULL AND instance_id IS NOT NULL -- Match unique_integration_instance_owner_null_idx
        DO UPDATE SET
            instance_display_name = EXCLUDED.instance_display_name,
            token = EXCLUDED.token,
            user_reference_id = EXCLUDED.user_reference_id,
            pipeline_id = EXCLUDED.pipeline_id,
            status = EXCLUDED.status,
            updated_at = NOW();
            -- integration_id and instance_id are part of conflict or don't change. owner_id is NULL.
            
    -- Case 3: instance_id IS NULL (and owner_id might be null or not null)
    -- This case requires a different unique constraint if upsert is needed.
    -- For example, ON CONFLICT (integration_id, owner_id) WHERE instance_id IS NULL
    -- Assuming for now that instance_id is always provided for upsert scenarios.
    -- If instance_id can be NULL and still needs an upsert, the table needs another unique constraint
    -- (e.g., on integration_id, owner_id allowing null instance_id, if that makes sense for the business logic).
    -- The current unique indexes unique_owner_instance_not_null_idx and unique_instance_owner_null_idx
    -- both require instance_id IS NOT NULL.
    -- So, if p_instance_id IS NULL, it will be a direct insert or fail if it violates other constraints (like a primary key if id is not auto-generated and passed in).
    ELSE
        INSERT INTO public.integrations_config (
            integration_id, instance_id, owner_id, instance_display_name, token, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, p_owner_id, p_instance_display_name, p_token, p_user_reference_id, p_pipeline_id, p_status
        );
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.execute_dynamic_sql(sql_query text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  -- Basic validation: only allow SELECT statements for safety
  IF lower(sql_query) LIKE 'select%' THEN
    -- Execute the query and aggregate results into a JSON array
    EXECUTE format('SELECT json_agg(t) FROM (%s) t', sql_query) INTO result;
    RETURN coalesce(result, '[]'::json); -- Return empty JSON array if no results
  ELSE
    RAISE EXCEPTION 'Invalid query type: Only SELECT statements are allowed.';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_subscription_details_for_profile(profile_id_param uuid)
 RETURNS TABLE(subscription_id uuid, plan_id uuid, plan_name text, messages_per_month integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS subscription_id,
    s.plan_id,
    p.name AS plan_name,
    p.messages_per_month
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.profile_id = profile_id_param
    AND s.status IN ('active', 'trialing', 'past_due')
  LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_month()
 RETURNS TABLE(today_date date, month_number integer)
 LANGUAGE sql
AS $function$
    SELECT 
        CURRENT_DATE AS today_date,
        EXTRACT(MONTH FROM CURRENT_DATE)::integer AS month_number;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_week()
 RETURNS TABLE(today_date date, week_of_month integer)
 LANGUAGE sql
AS $function$
    SELECT 
        CURRENT_DATE AS today_date,
        (EXTRACT(WEEK FROM CURRENT_DATE) - 
         EXTRACT(WEEK FROM DATE_TRUNC('month', CURRENT_DATE)) + 1)::integer AS week_of_month;
$function$
;

CREATE OR REPLACE FUNCTION public.get_evolution_api_key()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  api_key TEXT;
BEGIN
  SELECT secret INTO api_key FROM vault.secrets WHERE name = 'evolution_api_key';
  RETURN api_key;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, name, email, role)
  values (new.id, new.raw_user_meta_data->>'name', new.email, 'user');
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.integrations_encrypt_secret_api_key()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
		BEGIN
		        new.api_key = CASE WHEN new.api_key IS NULL THEN NULL ELSE
			CASE WHEN 'a712b0cc-782f-4f9d-8215-749debba1ae0' IS NULL THEN NULL ELSE
					pgsodium.crypto_aead_det_encrypt(new.api_key::bytea, pg_catalog.convert_to((new.id::text)::text, 'utf8'),
			'a712b0cc-782f-4f9d-8215-749debba1ae0'::uuid,
			new.api_key_nonce
		  ) END END;
		RETURN new;
		END;
		$function$
;

CREATE OR REPLACE FUNCTION public.is_user_team_admin_or_owner(p_user_id uuid, p_team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.team_users
        WHERE user_id = p_user_id
          AND team_id = p_team_id
          AND (role = 'owner' OR role = 'admin')
    );
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_team_member(p_user_id uuid, p_team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.team_users
        WHERE user_id = p_user_id
          AND team_id = p_team_id
        -- Any role constitutes membership for this check
    );
$function$
;

CREATE OR REPLACE FUNCTION public.match_chunks(query_embedding vector, match_threshold double precision, match_count integer)
 RETURNS TABLE(id uuid, document_id uuid, content text, similarity double precision)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity -- Using cosine distance operator
  FROM knowledge_chunks kc
  WHERE kc.enabled = TRUE -- <<< Added this filter
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$function$
;

CREATE OR REPLACE FUNCTION public.match_chunks(query_embedding vector, match_threshold double precision, match_count integer, filter_document_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(id uuid, document_id uuid, content text, similarity double precision)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    kc.enabled = TRUE
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
    -- Add the filter condition:
    -- Only include chunks where document_id is in the filter array,
    -- OR if the filter array is NULL (meaning no filter applied).
    AND (filter_document_ids IS NULL OR kc.document_id = ANY(filter_document_ids))
  ORDER BY similarity DESC
  LIMIT match_count;
$function$
;

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(query_embedding vector, match_threshold real, match_count integer, document_id uuid)
 RETURNS TABLE(id uuid, content text, similarity real)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    id,
    content,
    1 - (knowledge_chunks.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks
  WHERE 1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold
  AND knowledge_chunks.document_id = document_id
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_schema_embeddings(query_embedding vector, match_threshold double precision, match_count integer)
 RETURNS TABLE(id uuid, schema_name text, table_name text, column_name text, description text, similarity double precision)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT
    se.id,
    se.schema_name,
    se.table_name,
    se.column_name,
    se.description,
    1 - (se.embedding <=> query_embedding) AS similarity -- Cosine similarity calculation
  FROM schema_embeddings se -- The table containing your schema embeddings
  WHERE 1 - (se.embedding <=> query_embedding) > match_threshold -- Filter results by similarity
  ORDER BY similarity DESC -- Return the most similar results first
  LIMIT match_count; -- Limit the number of results
$function$
;

-- Function references dropped table profile_integration_access
/*
CREATE OR REPLACE FUNCTION public.profile_has_integration_access(_profile_id uuid, _integration_config_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _profile_id AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.profile_integration_access 
    WHERE profile_id = _profile_id AND integration_config_id = _integration_config_id
  );
$function$
;
*/

CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE conversations
    SET updated_at = NEW.created_at
    WHERE conversation_id = NEW.conversation_id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_pipeline_name(pipeline_id uuid, new_name text)
 RETURNS SETOF pipelines
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if the new name is empty or null
    IF new_name IS NULL OR trim(new_name) = '' THEN
        RAISE EXCEPTION 'Pipeline name cannot be empty.';
    END IF;

    -- Update the pipeline name only if the user owns it
    RETURN QUERY
    UPDATE public.pipelines
    SET name = trim(new_name) -- Trim whitespace
    WHERE id = pipeline_id AND user_id = auth.uid()
    RETURNING *; -- Return the updated row

    -- Check if the update affected any row (i.e., if the user owns the pipeline)
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pipeline not found or permission denied.';
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;


  create policy "Allow authenticated users to delete sentiment analysis"
  on "public"."batch_sentiment_analysis"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Allow authenticated users to insert sentiment analysis"
  on "public"."batch_sentiment_analysis"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow authenticated users to read sentiment analysis"
  on "public"."batch_sentiment_analysis"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow authenticated users to update sentiment analysis"
  on "public"."batch_sentiment_analysis"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Allow all authenticated users to delete customers"
  on "public"."customers"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Allow all authenticated users to insert customers"
  on "public"."customers"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow all authenticated users to read customers"
  on "public"."customers"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow all authenticated users to update customers"
  on "public"."customers"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Allow all authenticated users to write customers"
  on "public"."customers"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Authenticated users can read integration types"
  on "public"."integrations"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow all authenticated users to read lead_pipeline"
  on "public"."lead_pipeline"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow all authenticated users to write lead_pipeline"
  on "public"."lead_pipeline"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow all authenticated users to read lead_tags"
  on "public"."lead_tags"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow all authenticated users to write lead_tags"
  on "public"."lead_tags"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow all authenticated users to read leads"
  on "public"."leads"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow all authenticated users to write leads"
  on "public"."leads"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to insert their own message_logs"
  on "public"."message_logs"
  as permissive
  for insert
  to authenticated
with check ((profile_id = auth.uid()));



  create policy "Allow authenticated users to update their own message_logs"
  on "public"."message_logs"
  as permissive
  for update
  to authenticated
using ((profile_id = auth.uid()))
with check ((profile_id = auth.uid()));



  create policy "Allow service_role full access to message_logs"
  on "public"."message_logs"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Allow all authenticated users to read pipeline_stages"
  on "public"."pipeline_stages"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow all authenticated users to write pipeline_stages"
  on "public"."pipeline_stages"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Enable read access for all users"
  on "public"."pipeline_stages"
  as permissive
  for select
  to public
using (true);



  create policy "Allow all authenticated users to read pipelines"
  on "public"."pipelines"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow all authenticated users to write pipelines"
  on "public"."pipelines"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));



  create policy "Enable read access for all users"
  on "public"."pipelines"
  as permissive
  for select
  to public
using (true);



  create policy "Allow service_role full access to plan_message_usage"
  on "public"."plan_message_usage"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Allow all authenticated users to read tags"
  on "public"."tags"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow all authenticated users to write tags"
  on "public"."tags"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));


CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER before_insert_blacklist BEFORE INSERT ON public.blacklisted_customers FOR EACH ROW WHEN ((new.id IS NULL)) EXECUTE FUNCTION set_blacklist_customer_id();

CREATE TRIGGER on_broadcasts_updated_at BEFORE UPDATE ON public.broadcasts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_message_logs_updated_at BEFORE UPDATE ON public.message_logs FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_plan_message_usage_updated_at BEFORE UPDATE ON public.plan_message_usage FOR EACH ROW EXECUTE FUNCTION handle_updated_at();





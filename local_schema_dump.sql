

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."agent_activation_mode" AS ENUM (
    'keyword',
    'always_on'
);


ALTER TYPE "public"."agent_activation_mode" OWNER TO "postgres";


CREATE TYPE "public"."ai_session_status" AS ENUM (
    'active',
    'closed',
    'error'
);


ALTER TYPE "public"."ai_session_status" OWNER TO "postgres";


CREATE TYPE "public"."day_of_week" AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
);


ALTER TYPE "public"."day_of_week" OWNER TO "postgres";


CREATE TYPE "public"."integration_status" AS ENUM (
    'available',
    'coming_soon'
);


ALTER TYPE "public"."integration_status" OWNER TO "postgres";


CREATE TYPE "public"."sentiment_enum" AS ENUM (
    'good',
    'moderate',
    'bad',
    'unknown'
);


ALTER TYPE "public"."sentiment_enum" OWNER TO "postgres";


COMMENT ON TYPE "public"."sentiment_enum" IS 'Enumerated type for sentiment analysis results.';



CREATE TYPE "public"."subscription_status" AS ENUM (
    'active',
    'trialing',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."team_role" AS ENUM (
    'owner',
    'admin',
    'member'
);


ALTER TYPE "public"."team_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_user_to_team_on_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  invited_team_id UUID;
  user_role TEXT;
BEGIN
  -- Extract team_id from the new user's metadata
  -- This metadata is set by the invite-team-member function
  invited_team_id := (NEW.raw_user_meta_data->>'team_id')::UUID;
  user_role := 'member'; -- Default role for invited users

  -- If team_id is present in metadata, add the user to the team_users table
  IF invited_team_id IS NOT NULL THEN
    INSERT INTO public.team_users (team_id, user_id, role)
    VALUES (invited_team_id, NEW.id, user_role)
    ON CONFLICT (team_id, user_id) DO NOTHING; -- Avoid error if user is already in team (should not happen for new signups)
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_user_to_team_on_signup"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_user_to_team_on_signup"() IS 'Adds a newly signed-up user to a team if they were invited with team_id in metadata.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON TABLE "public"."teams" IS 'Stores team information';



COMMENT ON COLUMN "public"."teams"."id" IS 'Unique identifier for the team';



COMMENT ON COLUMN "public"."teams"."name" IS 'Name of the team';



COMMENT ON COLUMN "public"."teams"."created_at" IS 'Timestamp of when the team was created';



COMMENT ON COLUMN "public"."teams"."updated_at" IS 'Timestamp of when the team was last updated';



CREATE OR REPLACE FUNCTION "public"."create_new_team"("p_name" "text") RETURNS SETOF "public"."teams"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- This INSERT runs as the function owner, bypassing RLS for 'teams' table.
  RETURN QUERY
  INSERT INTO public.teams (name)
  VALUES (p_name)
  RETURNING *;
  -- Note: If you need to ensure the calling user (auth.uid()) is logged,
  -- you might add a check like: IF auth.uid() IS NULL THEN RAISE EXCEPTION ...;
  -- However, Supabase client usually ensures auth before .rpc() calls.
END;
$$;


ALTER FUNCTION "public"."create_new_team"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_trial_subscription_for_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  trial_plan_id UUID;
  trial_duration INTERVAL := INTERVAL '7 days'; -- Define trial duration, e.g., 7 days
BEGIN
  -- Get the ID of the 'Trial' plan
  SELECT id INTO trial_plan_id FROM public.plans WHERE name = 'Trial' LIMIT 1;

  -- If Trial plan exists, insert a new subscription for the new user
  IF trial_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (profile_id, plan_id, status, subscribed_at, current_period_start, current_period_end, trial_end_date)
    VALUES (
      NEW.id, -- Assuming NEW.id is the user_id from the profiles table
      trial_plan_id,
      'trialing',
      NOW(),
      NOW(),
      NOW() + trial_duration,
      NOW() + trial_duration
    );
  ELSE
    -- Optionally, raise a notice or log if the Trial plan is not found
    RAISE NOTICE 'Trial plan not found. Cannot create trial subscription for user %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_trial_subscription_for_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at_plans"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at_plans"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at_profiles"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at_subscriptions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at_subscriptions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_team_admin_or_owner"("p_user_id" "uuid", "p_team_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.team_users
        WHERE user_id = p_user_id
          AND team_id = p_team_id
          AND (role = 'owner' OR role = 'admin')
    );
$$;


ALTER FUNCTION "public"."is_user_team_admin_or_owner"("p_user_id" "uuid", "p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_team_member"("p_user_id" "uuid", "p_team_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.team_users
        WHERE user_id = p_user_id
          AND team_id = p_team_id
        -- Any role constitutes membership for this check
    );
$$;


ALTER FUNCTION "public"."is_user_team_member"("p_user_id" "uuid", "p_team_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_id" "uuid"
);


ALTER TABLE "public"."pipelines" OWNER TO "postgres";


COMMENT ON TABLE "public"."pipelines" IS 'Stores sales or process pipelines.';



COMMENT ON COLUMN "public"."pipelines"."name" IS 'Name of the pipeline.';



COMMENT ON COLUMN "public"."pipelines"."is_default" IS 'Indicates if this is the default pipeline for the user.';



COMMENT ON COLUMN "public"."pipelines"."team_id" IS 'Foreign key referencing the teams table, for team-specific pipelines';



CREATE OR REPLACE FUNCTION "public"."update_pipeline_name"("pipeline_id" "uuid", "new_name" "text") RETURNS SETOF "public"."pipelines"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."update_pipeline_name"("pipeline_id" "uuid", "new_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_pipeline_name"("pipeline_id" "uuid", "new_name" "text") IS 'Updates the name of a specific pipeline owned by the current user.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_availability_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "day_of_week" "public"."day_of_week" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "is_available" boolean DEFAULT true,
    "appointment_duration_minutes" integer DEFAULT 60,
    "buffer_time_minutes" integer DEFAULT 15,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_availability_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_availability_settings" IS 'Stores availability settings for AI agents, such as working hours and appointment configurations.';



COMMENT ON COLUMN "public"."agent_availability_settings"."agent_id" IS 'Foreign key referencing the AI agent.';



COMMENT ON COLUMN "public"."agent_availability_settings"."day_of_week" IS 'The day of the week for this availability setting.';



COMMENT ON COLUMN "public"."agent_availability_settings"."start_time" IS 'The time the agent starts working on this specific day.';



COMMENT ON COLUMN "public"."agent_availability_settings"."end_time" IS 'The time the agent stops working on this specific day.';



COMMENT ON COLUMN "public"."agent_availability_settings"."is_available" IS 'Indicates if the agent is available on this day.';



COMMENT ON COLUMN "public"."agent_availability_settings"."appointment_duration_minutes" IS 'Default duration for appointments booked with this agent.';



COMMENT ON COLUMN "public"."agent_availability_settings"."buffer_time_minutes" IS 'Buffer time to add after each appointment.';



CREATE TABLE IF NOT EXISTS "public"."agent_google_calendar_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "calendar_id" "text",
    "access_token" "text",
    "refresh_token" "text",
    "token_expiry_timestamp" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_google_calendar_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_google_calendar_settings" IS 'Stores Google Calendar integration settings for AI agents.';



COMMENT ON COLUMN "public"."agent_google_calendar_settings"."agent_id" IS 'Foreign key referencing the AI agent.';



COMMENT ON COLUMN "public"."agent_google_calendar_settings"."calendar_id" IS 'The ID of the Google Calendar to use for bookings.';



COMMENT ON COLUMN "public"."agent_google_calendar_settings"."access_token" IS 'OAuth 2.0 access token for Google Calendar API.';



COMMENT ON COLUMN "public"."agent_google_calendar_settings"."refresh_token" IS 'OAuth 2.0 refresh token for Google Calendar API.';



COMMENT ON COLUMN "public"."agent_google_calendar_settings"."token_expiry_timestamp" IS 'Timestamp when the access token expires.';



CREATE TABLE IF NOT EXISTS "public"."ai_agent_integrations" (
    "agent_id" "uuid" NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_agent_integrations" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_agent_integrations" IS 'Join table linking AI agents to specific integrations (channels).';



CREATE TABLE IF NOT EXISTS "public"."ai_agent_knowledge_documents" (
    "agent_id" "uuid" NOT NULL,
    "document_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_agent_knowledge_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_agent_knowledge_documents" IS 'Join table linking AI agents to the knowledge documents they can access.';



CREATE TABLE IF NOT EXISTS "public"."ai_agent_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid",
    "integration_id" "uuid",
    "contact_identifier" "text" NOT NULL,
    "conversation_history" "json",
    "is_active" boolean DEFAULT true,
    "last_interaction_timestamp" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."ai_session_status" DEFAULT 'active'::"public"."ai_session_status" NOT NULL
);


ALTER TABLE "public"."ai_agent_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_agent_sessions" IS 'Stores active and past conversation sessions handled by AI agents.';



COMMENT ON COLUMN "public"."ai_agent_sessions"."contact_identifier" IS 'Identifier for the external contact (e.g., phone number).';



COMMENT ON COLUMN "public"."ai_agent_sessions"."conversation_history" IS 'Stored history of the conversation for context.';



COMMENT ON COLUMN "public"."ai_agent_sessions"."is_active" IS 'Indicates if the session is currently active.';



COMMENT ON COLUMN "public"."ai_agent_sessions"."last_interaction_timestamp" IS 'Timestamp of the last message exchange.';



COMMENT ON COLUMN "public"."ai_agent_sessions"."status" IS 'The current status of the AI agent session.';



CREATE TABLE IF NOT EXISTS "public"."ai_agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "prompt" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "knowledge_document_ids" "uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "keyword_trigger" "text",
    "activation_mode" "public"."agent_activation_mode" DEFAULT 'keyword'::"public"."agent_activation_mode"
);


ALTER TABLE "public"."ai_agents" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_agents" IS 'Stores configuration for AI agents.';



COMMENT ON COLUMN "public"."ai_agents"."name" IS 'User-defined name for the AI agent.';



COMMENT ON COLUMN "public"."ai_agents"."prompt" IS 'The system prompt defining the agent''s behavior.';



COMMENT ON COLUMN "public"."ai_agents"."is_enabled" IS 'Whether the agent is currently active.';



COMMENT ON COLUMN "public"."ai_agents"."knowledge_document_ids" IS 'Array of knowledge document IDs the agent can access.';



COMMENT ON COLUMN "public"."ai_agents"."keyword_trigger" IS 'Keyword or phrase that triggers this agent in a connected channel.';



COMMENT ON COLUMN "public"."ai_agents"."activation_mode" IS 'Defines how the agent activates: by keyword or always on.';



CREATE TABLE IF NOT EXISTS "public"."batch_sentiment_analysis" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "overall_sentiment" "text",
    "summary" "text",
    "conversation_ids" "uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "good_count" integer DEFAULT 0,
    "moderate_count" integer DEFAULT 0,
    "bad_count" integer DEFAULT 0,
    "unknown_count" integer DEFAULT 0
);


ALTER TABLE "public"."batch_sentiment_analysis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_sentiment_analysis_details" (
    "id" bigint NOT NULL,
    "batch_analysis_id" "uuid" NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sentiment" "public"."sentiment_enum" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."batch_sentiment_analysis_details" OWNER TO "postgres";


COMMENT ON TABLE "public"."batch_sentiment_analysis_details" IS 'Stores the individual sentiment analysis result for each conversation within a specific batch run.';



COMMENT ON COLUMN "public"."batch_sentiment_analysis_details"."batch_analysis_id" IS 'Foreign key referencing the batch analysis run.';



COMMENT ON COLUMN "public"."batch_sentiment_analysis_details"."conversation_id" IS 'Foreign key referencing the conversation analyzed.';



COMMENT ON COLUMN "public"."batch_sentiment_analysis_details"."sentiment" IS 'The determined sentiment for the conversation in this batch.';



COMMENT ON COLUMN "public"."batch_sentiment_analysis_details"."description" IS 'Optional description or reason for the sentiment classification.';



ALTER TABLE "public"."batch_sentiment_analysis_details" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."batch_sentiment_analysis_details_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "conversation_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel" "text",
    "started_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "last_message_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "status" "text" DEFAULT 'open'::"text",
    "team_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversations" IS 'Stores conversation records.';



CREATE TABLE IF NOT EXISTS "public"."integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon_url" "text",
    "status" "public"."integration_status" DEFAULT 'available'::"public"."integration_status" NOT NULL,
    "is_connected" boolean DEFAULT false,
    "api_key" "text",
    "base_url" "text",
    "webhook_url" "text",
    "webhook_events" "json",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."integrations" OWNER TO "postgres";


COMMENT ON TABLE "public"."integrations" IS 'Stores details about available third-party integrations (global catalog).';



COMMENT ON COLUMN "public"."integrations"."name" IS 'Display name of the integration.';



COMMENT ON COLUMN "public"."integrations"."status" IS 'Availability status of the integration.';



COMMENT ON COLUMN "public"."integrations"."is_connected" IS 'Indicates if the integration is currently connected/configured.';



COMMENT ON COLUMN "public"."integrations"."api_key" IS 'API key for the integration, if applicable.';



COMMENT ON COLUMN "public"."integrations"."base_url" IS 'Base URL for the integration API, if applicable.';



COMMENT ON COLUMN "public"."integrations"."webhook_url" IS 'URL for receiving webhooks from the integration.';



COMMENT ON COLUMN "public"."integrations"."webhook_events" IS 'JSON array of event types subscribed to via webhook.';



CREATE TABLE IF NOT EXISTS "public"."integrations_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "instance_id" "text",
    "instance_display_name" "text",
    "token" "text",
    "owner_id" "text",
    "user_reference_id" "text",
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pipeline_id" "uuid",
    "tenant_id" "uuid"
);


ALTER TABLE "public"."integrations_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."integrations_config" IS 'Stores instance-specific configuration for connected integrations.';



COMMENT ON COLUMN "public"."integrations_config"."instance_id" IS 'Identifier for a specific instance of the integration (e.g., Evolution API instance name).';



COMMENT ON COLUMN "public"."integrations_config"."instance_display_name" IS 'User-friendly display name for the instance.';



COMMENT ON COLUMN "public"."integrations_config"."token" IS 'API token or secret specific to this instance connection.';



COMMENT ON COLUMN "public"."integrations_config"."owner_id" IS 'Identifier of the owner associated with this instance (e.g., WhatsApp JID).';



COMMENT ON COLUMN "public"."integrations_config"."user_reference_id" IS 'Sanitized or user-friendly reference ID derived from owner_id.';



COMMENT ON COLUMN "public"."integrations_config"."status" IS 'Connection status specific to this instance.';



COMMENT ON COLUMN "public"."integrations_config"."tenant_id" IS 'Foreign key referencing the tenant that owns this integration configuration.';



CREATE TABLE IF NOT EXISTS "public"."knowledge_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "file_path" "text",
    "file_type" "text",
    "chunking_method" "text",
    "custom_chunk_size" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."knowledge_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."knowledge_documents" IS 'Stores documents used as knowledge sources for AI agents.';



COMMENT ON COLUMN "public"."knowledge_documents"."title" IS 'Title of the knowledge document.';



COMMENT ON COLUMN "public"."knowledge_documents"."content" IS 'Full content of the document or reference to its storage.';



COMMENT ON COLUMN "public"."knowledge_documents"."file_path" IS 'Original file path if imported from a file.';



COMMENT ON COLUMN "public"."knowledge_documents"."file_type" IS 'MIME type or extension of the original file.';



COMMENT ON COLUMN "public"."knowledge_documents"."chunking_method" IS 'Method used to split the document into chunks.';



COMMENT ON COLUMN "public"."knowledge_documents"."custom_chunk_size" IS 'Custom size used for chunking, if applicable.';



CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "messages_per_month" integer,
    "token_allocation" integer,
    "features" "jsonb",
    "owner_id" "uuid",
    "team_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "integrations_allowed" integer
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."plans" IS 'Stores subscription plan details.';



COMMENT ON COLUMN "public"."plans"."price" IS 'Monthly price of the plan.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Stores public user profile information linked to auth.users.';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "status" "public"."subscription_status" NOT NULL,
    "subscribed_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "trial_end_date" timestamp with time zone
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscriptions" IS 'Stores user subscription information.';



COMMENT ON COLUMN "public"."subscriptions"."status" IS 'Current status of the subscription.';



CREATE TABLE IF NOT EXISTS "public"."team_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."team_role" DEFAULT 'member'::"public"."team_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_users_role_check" CHECK (("role" = ANY (ARRAY['owner'::"public"."team_role", 'admin'::"public"."team_role", 'member'::"public"."team_role"])))
);


ALTER TABLE "public"."team_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_users" IS 'Stores team membership and roles';



COMMENT ON COLUMN "public"."team_users"."id" IS 'Unique identifier for the team user mapping';



COMMENT ON COLUMN "public"."team_users"."team_id" IS 'Foreign key referencing the teams table';



COMMENT ON COLUMN "public"."team_users"."user_id" IS 'Foreign key referencing the auth.users table';



COMMENT ON COLUMN "public"."team_users"."role" IS 'Role of the user in the team (owner, admin, member)';



COMMENT ON COLUMN "public"."team_users"."created_at" IS 'Timestamp of when the user was added to the team';



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "owner_profile_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenants" IS 'Stores tenant information, linking a team to an owner profile.';



COMMENT ON COLUMN "public"."tenants"."team_id" IS 'Foreign key referencing the team associated with this tenant.';



COMMENT ON COLUMN "public"."tenants"."owner_profile_id" IS 'Foreign key referencing the profile of the user who owns this tenant.';



ALTER TABLE ONLY "public"."agent_availability_settings"
    ADD CONSTRAINT "agent_availability_settings_agent_id_day_of_week_key" UNIQUE ("agent_id", "day_of_week");



ALTER TABLE ONLY "public"."agent_availability_settings"
    ADD CONSTRAINT "agent_availability_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_google_calendar_settings"
    ADD CONSTRAINT "agent_google_calendar_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_agent_integrations"
    ADD CONSTRAINT "ai_agent_integrations_pkey" PRIMARY KEY ("agent_id", "integration_id");



ALTER TABLE ONLY "public"."ai_agent_knowledge_documents"
    ADD CONSTRAINT "ai_agent_knowledge_documents_pkey" PRIMARY KEY ("agent_id", "document_id");



ALTER TABLE ONLY "public"."ai_agent_sessions"
    ADD CONSTRAINT "ai_agent_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_agents"
    ADD CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_sentiment_analysis_details"
    ADD CONSTRAINT "batch_sentiment_analysis_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_sentiment_analysis"
    ADD CONSTRAINT "batch_sentiment_analysis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("conversation_id");



ALTER TABLE ONLY "public"."integrations_config"
    ADD CONSTRAINT "integrations_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipelines"
    ADD CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_users"
    ADD CONSTRAINT "team_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_users"
    ADD CONSTRAINT "team_users_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_owner_profile_id_key" UNIQUE ("owner_profile_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_team_id_key" UNIQUE ("team_id");



ALTER TABLE ONLY "public"."batch_sentiment_analysis_details"
    ADD CONSTRAINT "unique_batch_conversation" UNIQUE ("batch_analysis_id", "conversation_id");



CREATE INDEX "idx_ai_agent_integrations_agent_id" ON "public"."ai_agent_integrations" USING "btree" ("agent_id");



CREATE INDEX "idx_ai_agent_integrations_integration_id" ON "public"."ai_agent_integrations" USING "btree" ("integration_id");



CREATE INDEX "idx_ai_agent_knowledge_documents_agent_id" ON "public"."ai_agent_knowledge_documents" USING "btree" ("agent_id");



CREATE INDEX "idx_ai_agent_knowledge_documents_document_id" ON "public"."ai_agent_knowledge_documents" USING "btree" ("document_id");



CREATE INDEX "idx_ai_agent_sessions_agent_id" ON "public"."ai_agent_sessions" USING "btree" ("agent_id");



CREATE INDEX "idx_ai_agent_sessions_contact_identifier" ON "public"."ai_agent_sessions" USING "btree" ("contact_identifier");



CREATE INDEX "idx_ai_agent_sessions_integration_id" ON "public"."ai_agent_sessions" USING "btree" ("integration_id");



CREATE INDEX "idx_ai_agent_sessions_is_active" ON "public"."ai_agent_sessions" USING "btree" ("is_active");



CREATE INDEX "idx_ai_agent_sessions_status" ON "public"."ai_agent_sessions" USING "btree" ("status");



CREATE INDEX "idx_ai_agents_user_id" ON "public"."ai_agents" USING "btree" ("user_id");



CREATE INDEX "idx_batch_sentiment_details_batch_id" ON "public"."batch_sentiment_analysis_details" USING "btree" ("batch_analysis_id");



CREATE INDEX "idx_batch_sentiment_details_conversation_id" ON "public"."batch_sentiment_analysis_details" USING "btree" ("conversation_id");



CREATE INDEX "idx_integrations_config_instance_id" ON "public"."integrations_config" USING "btree" ("instance_id");



CREATE INDEX "idx_integrations_config_integration_id" ON "public"."integrations_config" USING "btree" ("integration_id");



CREATE INDEX "idx_integrations_config_owner_id" ON "public"."integrations_config" USING "btree" ("owner_id");



CREATE INDEX "idx_integrations_config_pipeline_id" ON "public"."integrations_config" USING "btree" ("pipeline_id");



CREATE INDEX "idx_integrations_config_tenant_id" ON "public"."integrations_config" USING "btree" ("tenant_id");



CREATE INDEX "idx_integrations_name" ON "public"."integrations" USING "btree" ("name");



CREATE INDEX "idx_integrations_status" ON "public"."integrations" USING "btree" ("status");



CREATE INDEX "idx_knowledge_documents_title" ON "public"."knowledge_documents" USING "btree" ("title");



CREATE INDEX "idx_knowledge_documents_user_id" ON "public"."knowledge_documents" USING "btree" ("user_id");



CREATE INDEX "idx_pipelines_is_default" ON "public"."pipelines" USING "btree" ("is_default");



CREATE INDEX "idx_pipelines_user_id" ON "public"."pipelines" USING "btree" ("user_id");



CREATE INDEX "idx_tenants_owner_profile_id" ON "public"."tenants" USING "btree" ("owner_profile_id");



CREATE INDEX "idx_tenants_team_id" ON "public"."tenants" USING "btree" ("team_id");



CREATE UNIQUE INDEX "uq_profile_active_subscription" ON "public"."subscriptions" USING "btree" ("profile_id", "status") WHERE ("status" = ANY (ARRAY['active'::"public"."subscription_status", 'trialing'::"public"."subscription_status", 'past_due'::"public"."subscription_status"]));



CREATE OR REPLACE TRIGGER "on_ai_agent_integrations_updated" BEFORE UPDATE ON "public"."ai_agent_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_ai_agent_sessions_updated" BEFORE UPDATE ON "public"."ai_agent_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_ai_agents_updated" BEFORE UPDATE ON "public"."ai_agents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_conversations_updated" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_integrations_config_updated" BEFORE UPDATE ON "public"."integrations_config" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_integrations_updated" BEFORE UPDATE ON "public"."integrations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_knowledge_documents_updated" BEFORE UPDATE ON "public"."knowledge_documents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_new_profile_created_create_trial_subscription" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."create_trial_subscription_for_new_user"();



CREATE OR REPLACE TRIGGER "on_pipelines_updated" BEFORE UPDATE ON "public"."pipelines" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_plans_updated" BEFORE UPDATE ON "public"."plans" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at_plans"();



CREATE OR REPLACE TRIGGER "on_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at_profiles"();



CREATE OR REPLACE TRIGGER "on_subscriptions_updated" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at_subscriptions"();



CREATE OR REPLACE TRIGGER "on_tenants_updated" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_agent_availability_settings_updated_at" BEFORE UPDATE ON "public"."agent_availability_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_agent_google_calendar_settings_updated_at" BEFORE UPDATE ON "public"."agent_google_calendar_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."agent_availability_settings"
    ADD CONSTRAINT "agent_availability_settings_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_google_calendar_settings"
    ADD CONSTRAINT "agent_google_calendar_settings_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agent_integrations"
    ADD CONSTRAINT "ai_agent_integrations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agent_integrations"
    ADD CONSTRAINT "ai_agent_integrations_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agent_knowledge_documents"
    ADD CONSTRAINT "ai_agent_knowledge_documents_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agent_knowledge_documents"
    ADD CONSTRAINT "ai_agent_knowledge_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agent_sessions"
    ADD CONSTRAINT "ai_agent_sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_agent_sessions"
    ADD CONSTRAINT "ai_agent_sessions_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_agents"
    ADD CONSTRAINT "ai_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_sentiment_analysis_details"
    ADD CONSTRAINT "batch_sentiment_analysis_details_batch_analysis_id_fkey" FOREIGN KEY ("batch_analysis_id") REFERENCES "public"."batch_sentiment_analysis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_sentiment_analysis_details"
    ADD CONSTRAINT "batch_sentiment_analysis_details_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("conversation_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."integrations_config"
    ADD CONSTRAINT "integrations_config_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."integrations_config"
    ADD CONSTRAINT "integrations_config_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."integrations_config"
    ADD CONSTRAINT "integrations_config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pipelines"
    ADD CONSTRAINT "pipelines_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipelines"
    ADD CONSTRAINT "pipelines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_users"
    ADD CONSTRAINT "team_users_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_users"
    ADD CONSTRAINT "team_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_owner_profile_id_fkey" FOREIGN KEY ("owner_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



CREATE POLICY "Allow admin full access to plans" ON "public"."plans" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Allow authenticated users to create teams" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read batch details" ON "public"."batch_sentiment_analysis_details" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow members to view their teams" ON "public"."teams" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_users"
  WHERE (("team_users"."team_id" = "teams"."id") AND ("team_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow members to view users in their team" ON "public"."team_users" FOR SELECT TO "authenticated" USING ("public"."is_user_team_member"("auth"."uid"(), "team_id"));



CREATE POLICY "Allow owners to delete their teams" ON "public"."teams" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_users"
  WHERE (("team_users"."team_id" = "teams"."id") AND ("team_users"."user_id" = "auth"."uid"()) AND ("team_users"."role" = 'owner'::"public"."team_role")))));



CREATE POLICY "Allow owners/admins to manage team members" ON "public"."team_users" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_users" "tu_admin"
  WHERE (("tu_admin"."team_id" = "team_users"."team_id") AND ("tu_admin"."user_id" = "auth"."uid"()) AND (("tu_admin"."role" = 'owner'::"public"."team_role") OR ("tu_admin"."role" = 'admin'::"public"."team_role")))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."team_users" "tu_admin"
  WHERE (("tu_admin"."team_id" = "team_users"."team_id") AND ("tu_admin"."user_id" = "auth"."uid"()) AND (("tu_admin"."role" = 'owner'::"public"."team_role") OR ("tu_admin"."role" = 'admin'::"public"."team_role"))))) AND (NOT (("role" = 'owner'::"public"."team_role") AND (( SELECT "team_users_1"."role"
   FROM "public"."team_users" "team_users_1"
  WHERE ("team_users_1"."id" = "team_users_1"."id")) <> 'owner'::"public"."team_role") AND (NOT (EXISTS ( SELECT 1
   FROM "public"."team_users" "team_users_1"
  WHERE (("team_users_1"."team_id" = "team_users_1"."team_id") AND ("team_users_1"."user_id" = "auth"."uid"()) AND ("team_users_1"."role" = 'owner'::"public"."team_role"))))))) AND (NOT ((( SELECT "team_users_1"."role"
   FROM "public"."team_users" "team_users_1"
  WHERE ("team_users_1"."id" = "team_users_1"."id")) = 'owner'::"public"."team_role") AND ("user_id" <> "auth"."uid"()) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."team_users" "team_users_1"
  WHERE (("team_users_1"."team_id" = "team_users_1"."team_id") AND ("team_users_1"."user_id" = "auth"."uid"()) AND ("team_users_1"."role" = 'owner'::"public"."team_role")))))))));



CREATE POLICY "Allow owners/admins to remove users from their team" ON "public"."team_users" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."team_users" "tu_admin"
  WHERE (("tu_admin"."team_id" = "team_users"."team_id") AND ("tu_admin"."user_id" = "auth"."uid"()) AND (("tu_admin"."role" = 'owner'::"public"."team_role") OR ("tu_admin"."role" = 'admin'::"public"."team_role"))))) AND (NOT (("user_id" = "auth"."uid"()) AND ("role" = 'owner'::"public"."team_role") AND (( SELECT "count"(*) AS "count"
   FROM "public"."team_users" "team_users_1"
  WHERE (("team_users_1"."team_id" = "team_users_1"."team_id") AND ("team_users_1"."role" = 'owner'::"public"."team_role"))) = 1))) AND (NOT ((( SELECT "team_users_1"."role"
   FROM "public"."team_users" "team_users_1"
  WHERE ("team_users_1"."id" = "team_users_1"."id")) = 'owner'::"public"."team_role") AND (NOT (EXISTS ( SELECT 1
   FROM "public"."team_users" "team_users_1"
  WHERE (("team_users_1"."team_id" = "team_users_1"."team_id") AND ("team_users_1"."user_id" = "auth"."uid"()) AND ("team_users_1"."role" = 'owner'::"public"."team_role")))))))));



CREATE POLICY "Allow owners/admins to update their teams" ON "public"."teams" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_users"
  WHERE (("team_users"."team_id" = "teams"."id") AND ("team_users"."user_id" = "auth"."uid"()) AND (("team_users"."role" = 'owner'::"public"."team_role") OR ("team_users"."role" = 'admin'::"public"."team_role")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."team_users"
  WHERE (("team_users"."team_id" = "teams"."id") AND ("team_users"."user_id" = "auth"."uid"()) AND (("team_users"."role" = 'owner'::"public"."team_role") OR ("team_users"."role" = 'admin'::"public"."team_role"))))));



CREATE POLICY "Allow public read access to plans" ON "public"."plans" FOR SELECT USING (true);



CREATE POLICY "Allow service_role full access" ON "public"."batch_sentiment_analysis_details" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Allow service_role full access to subscriptions" ON "public"."subscriptions" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Allow users to leave a team" ON "public"."team_users" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND (NOT (("role" = 'owner'::"public"."team_role") AND (( SELECT "count"(*) AS "count"
   FROM "public"."team_users" "team_users_1"
  WHERE (("team_users_1"."team_id" = "team_users_1"."team_id") AND ("team_users_1"."role" = 'owner'::"public"."team_role"))) = 1)))));



CREATE POLICY "Allow users to read their own subscriptions" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "DEBUG - Allow any authenticated insert into team_users" ON "public"."team_users" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."batch_sentiment_analysis_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


























































































































































































GRANT ALL ON FUNCTION "public"."add_user_to_team_on_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_user_to_team_on_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_user_to_team_on_signup"() TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_new_team"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_new_team"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_new_team"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_trial_subscription_for_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_trial_subscription_for_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_trial_subscription_for_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at_plans"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at_plans"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at_plans"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at_profiles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at_subscriptions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_team_admin_or_owner"("p_user_id" "uuid", "p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_team_admin_or_owner"("p_user_id" "uuid", "p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_team_admin_or_owner"("p_user_id" "uuid", "p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_team_member"("p_user_id" "uuid", "p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_team_member"("p_user_id" "uuid", "p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_team_member"("p_user_id" "uuid", "p_team_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."pipelines" TO "anon";
GRANT ALL ON TABLE "public"."pipelines" TO "authenticated";
GRANT ALL ON TABLE "public"."pipelines" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pipeline_name"("pipeline_id" "uuid", "new_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_pipeline_name"("pipeline_id" "uuid", "new_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pipeline_name"("pipeline_id" "uuid", "new_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."agent_availability_settings" TO "anon";
GRANT ALL ON TABLE "public"."agent_availability_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_availability_settings" TO "service_role";



GRANT ALL ON TABLE "public"."agent_google_calendar_settings" TO "anon";
GRANT ALL ON TABLE "public"."agent_google_calendar_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_google_calendar_settings" TO "service_role";



GRANT ALL ON TABLE "public"."ai_agent_integrations" TO "anon";
GRANT ALL ON TABLE "public"."ai_agent_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_agent_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."ai_agent_knowledge_documents" TO "anon";
GRANT ALL ON TABLE "public"."ai_agent_knowledge_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_agent_knowledge_documents" TO "service_role";



GRANT ALL ON TABLE "public"."ai_agent_sessions" TO "anon";
GRANT ALL ON TABLE "public"."ai_agent_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_agent_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."ai_agents" TO "anon";
GRANT ALL ON TABLE "public"."ai_agents" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_agents" TO "service_role";



GRANT ALL ON TABLE "public"."batch_sentiment_analysis" TO "anon";
GRANT ALL ON TABLE "public"."batch_sentiment_analysis" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_sentiment_analysis" TO "service_role";



GRANT ALL ON TABLE "public"."batch_sentiment_analysis_details" TO "anon";
GRANT ALL ON TABLE "public"."batch_sentiment_analysis_details" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_sentiment_analysis_details" TO "service_role";



GRANT ALL ON SEQUENCE "public"."batch_sentiment_analysis_details_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."batch_sentiment_analysis_details_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."batch_sentiment_analysis_details_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."integrations" TO "anon";
GRANT ALL ON TABLE "public"."integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."integrations" TO "service_role";



GRANT ALL ON TABLE "public"."integrations_config" TO "anon";
GRANT ALL ON TABLE "public"."integrations_config" TO "authenticated";
GRANT ALL ON TABLE "public"."integrations_config" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_documents" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_documents" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."team_users" TO "anon";
GRANT ALL ON TABLE "public"."team_users" TO "authenticated";
GRANT ALL ON TABLE "public"."team_users" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;

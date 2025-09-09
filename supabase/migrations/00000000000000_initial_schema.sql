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


CREATE SCHEMA IF NOT EXISTS "bigquery";


ALTER SCHEMA "bigquery" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";


CREATE SCHEMA IF NOT EXISTS "pgmq";


CREATE EXTENSION IF NOT EXISTS "pgmq" WITH SCHEMA "pgmq";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






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


DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE "public"."app_role" AS ENUM (
            'admin',
            'user',
            'customer'
        );
    END IF;
END
$$;


ALTER TYPE "public"."app_role" OWNER TO "postgres";


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


CREATE TYPE "public"."new_app_role" AS ENUM (
    'user',
    'admin'
);


ALTER TYPE "public"."new_app_role" OWNER TO "postgres";


CREATE TYPE "public"."role_enum" AS ENUM (
    'admin',
    'member'
);


ALTER TYPE "public"."role_enum" OWNER TO "postgres";


CREATE TYPE "public"."sender_type" AS ENUM (
    'user',
    'ai'
);


ALTER TYPE "public"."sender_type" OWNER TO "postgres";


CREATE TYPE "public"."sentiment_enum" AS ENUM (
    'good',
    'moderate',
    'bad',
    'unknown'
);


ALTER TYPE "public"."sentiment_enum" OWNER TO "postgres";


COMMENT ON TYPE "public"."sentiment_enum" IS 'Enumerated type for sentiment analysis results.';



CREATE TYPE "public"."sentiment_level" AS ENUM (
    'bad',
    'moderate',
    'good'
);


ALTER TYPE "public"."sentiment_level" OWNER TO "postgres";


CREATE TYPE "public"."sentiment_type" AS ENUM (
    'bad',
    'moderate',
    'good'
);


ALTER TYPE "public"."sentiment_type" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'active',
    'trialing',
    'past_due',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'unpaid'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."sync_status" AS ENUM (
    'pending',
    'completed',
    'failed'
);


ALTER TYPE "public"."sync_status" OWNER TO "postgres";


CREATE TYPE "public"."task_status" AS ENUM (
    'follow-up',
    'meeting'
);


ALTER TYPE "public"."task_status" OWNER TO "postgres";


CREATE TYPE "public"."team_role" AS ENUM (
    'owner',
    'admin',
    'member'
);


ALTER TYPE "public"."team_role" OWNER TO "postgres";

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


CREATE OR REPLACE FUNCTION "public"."execute_dynamic_sql"("sql_query" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."execute_dynamic_sql"("sql_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_month"() RETURNS TABLE("today_date" "date", "month_number" integer)
    LANGUAGE "sql"
    AS $$
    SELECT 
        CURRENT_DATE AS today_date,
        EXTRACT(MONTH FROM CURRENT_DATE)::integer AS month_number;
$$;


ALTER FUNCTION "public"."get_current_month"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_week"() RETURNS TABLE("today_date" "date", "week_of_month" integer)
    LANGUAGE "sql"
    AS $$
    SELECT 
        CURRENT_DATE AS today_date,
        (EXTRACT(WEEK FROM CURRENT_DATE) - 
         EXTRACT(WEEK FROM DATE_TRUNC('month', CURRENT_DATE)) + 1)::integer AS week_of_month;
$$;


ALTER FUNCTION "public"."get_current_week"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_evolution_api_key"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  api_key TEXT;
BEGIN
  SELECT secret INTO api_key FROM vault.secrets WHERE name = 'evolution_api_key';
  RETURN api_key;
END;
$$;


ALTER FUNCTION "public"."get_evolution_api_key"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, name, email, role)
  values (new.id, new.raw_user_meta_data->>'name', new.email, 'user');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."integrations_encrypt_secret_api_key"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
		BEGIN
		        new.api_key = CASE WHEN new.api_key IS NULL THEN NULL ELSE
			CASE WHEN 'a712b0cc-782f-4f9d-8215-749debba1ae0' IS NULL THEN NULL ELSE
					pgsodium.crypto_aead_det_encrypt(new.api_key::bytea, pg_catalog.convert_to((new.id::text)::text, 'utf8'),
			'a712b0cc-782f-4f9d-8215-749debba1ae0'::uuid,
			new.api_key_nonce
		  ) END END;
		RETURN new;
		END;
		$$;


ALTER FUNCTION "public"."integrations_encrypt_secret_api_key"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" "uuid", "document_id" "uuid", "content" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_document_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS TABLE("id" "uuid", "document_id" "uuid", "content" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_document_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" real, "match_count" integer, "document_id" "uuid") RETURNS TABLE("id" "uuid", "content" "text", "similarity" real)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" real, "match_count" integer, "document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_schema_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" "uuid", "schema_name" "text", "table_name" "text", "column_name" "text", "description" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."match_schema_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profile_has_integration_access"("_profile_id" "uuid", "_integration_config_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _profile_id AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.profile_integration_access 
    WHERE profile_id = _profile_id AND integration_config_id = _integration_config_id
  );
$$;


ALTER FUNCTION "public"."profile_has_integration_access"("_profile_id" "uuid", "_integration_config_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NEW.created_at
    WHERE conversation_id = NEW.conversation_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_timestamp"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "team_id" "uuid"
);


ALTER TABLE "public"."pipelines" OWNER TO "postgres";


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



CREATE TABLE IF NOT EXISTS "public"."agent_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "message_timestamp" timestamp with time zone DEFAULT "now"(),
    "sender_type" "public"."sender_type" NOT NULL,
    "message_content" "text",
    "knowledge_used" "jsonb",
    "needs_review" boolean DEFAULT true,
    "added_to_knowledge_base" boolean DEFAULT false,
    "knowledge_document_id" "uuid",
    "knowledge_chunk_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_conversations" IS 'Logs messages exchanged during AI agent sessions for review and retraining.';



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
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "activation_mode" "text" DEFAULT 'keyword'::"text",
    "stop_keywords" "text"[] DEFAULT '{}'::"text"[],
    "session_timeout_minutes" integer DEFAULT 60,
    "error_message" "text" DEFAULT 'Sorry, I can''t help with that right now, we''ll get in touch with you shortly.'::"text",
    CONSTRAINT "ai_agent_integrations_activation_mode_check" CHECK (("activation_mode" = ANY (ARRAY['keyword'::"text", 'always_on'::"text"])))
);


ALTER TABLE "public"."ai_agent_integrations" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_agent_integrations" IS 'Join table linking AI agents to specific integrations (channels).';



COMMENT ON COLUMN "public"."ai_agent_integrations"."activation_mode" IS 'How the agent is activated: keyword or always_on.';



COMMENT ON COLUMN "public"."ai_agent_integrations"."stop_keywords" IS 'Keywords or phrases to deactivate the agent session.';



COMMENT ON COLUMN "public"."ai_agent_integrations"."session_timeout_minutes" IS 'Minutes of inactivity before the AI session automatically deactivates.';



COMMENT ON COLUMN "public"."ai_agent_integrations"."error_message" IS 'Default message sent by the agent on error.';



CREATE TABLE IF NOT EXISTS "public"."ai_agent_knowledge_documents" (
    "agent_id" "uuid" NOT NULL,
    "document_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_agent_knowledge_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_agent_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_identifier" "text" NOT NULL,
    "agent_id" "uuid",
    "integration_id" "uuid",
    "is_active" boolean DEFAULT false,
    "last_interaction_timestamp" timestamp with time zone DEFAULT "now"(),
    "conversation_history" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."ai_session_status" DEFAULT 'active'::"public"."ai_session_status" NOT NULL
);


ALTER TABLE "public"."ai_agent_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_agent_sessions" IS 'Tracks active AI agent sessions for specific contacts and integrations.';



COMMENT ON COLUMN "public"."ai_agent_sessions"."status" IS 'The current status of the AI agent session.';



CREATE TABLE IF NOT EXISTS "public"."ai_agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "prompt" "text" NOT NULL,
    "knowledge_document_ids" "uuid"[],
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "keyword_trigger" "text",
    "is_enabled" boolean DEFAULT true,
    "activation_mode" "public"."agent_activation_mode" DEFAULT 'keyword'::"public"."agent_activation_mode"
);


ALTER TABLE "public"."ai_agents" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_agents" IS 'Stores configurations for AI agents used in the application.';



COMMENT ON COLUMN "public"."ai_agents"."id" IS 'Unique identifier for the AI agent';



COMMENT ON COLUMN "public"."ai_agents"."user_id" IS 'The user who owns this agent, references auth.users';



COMMENT ON COLUMN "public"."ai_agents"."name" IS 'User-defined name for the agent';



COMMENT ON COLUMN "public"."ai_agents"."prompt" IS 'The system prompt defining the agent''s behavior and instructions';



COMMENT ON COLUMN "public"."ai_agents"."knowledge_document_ids" IS 'Array of knowledge document UUIDs linked to this agent for RAG';



COMMENT ON COLUMN "public"."ai_agents"."created_at" IS 'Timestamp of when the agent was created';



COMMENT ON COLUMN "public"."ai_agents"."updated_at" IS 'Timestamp of when the agent was last updated';



COMMENT ON COLUMN "public"."ai_agents"."is_enabled" IS 'Whether the AI agent is globally enabled or disabled.';



COMMENT ON COLUMN "public"."ai_agents"."activation_mode" IS 'Defines how the agent activates: by keyword or always on.';



CREATE TABLE IF NOT EXISTS "public"."batch_sentiment_analysis" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "overall_sentiment" "text",
    "summary" "text",
    "conversation_ids" "uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "positive_count" integer DEFAULT 0,
    "negative_count" integer DEFAULT 0,
    "neutral_count" integer DEFAULT 0
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



CREATE TABLE IF NOT EXISTS "public"."broadcast_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "broadcast_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "phone_number" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."broadcast_recipients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."broadcasts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_text" "text" NOT NULL,
    "integration_id" "uuid",
    "instance_id" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."broadcasts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "conversation_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "joined_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "left_at" timestamp without time zone,
    "role" "public"."role_enum",
    "external_user_identifier" character varying(255),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "summary" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."conversation_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "conversation_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "lead_id" "uuid",
    "integrations_id" "uuid"
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone_number" "text" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "company_name" "text",
    "company_address" "text"
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evolution_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "payload" "jsonb" NOT NULL,
    "processing_status" character varying(20) NOT NULL,
    "source_identifier" character varying(255),
    "event_type" character varying(100) NOT NULL
);


ALTER TABLE "public"."evolution_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL,
    "description" "text",
    "icon_url" character varying,
    "status" "public"."integration_status" DEFAULT 'coming_soon'::"public"."integration_status" NOT NULL,
    "is_connected" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "base_url" "text" DEFAULT 'https://api.evoapicloud.com'::"text",
    "api_key" "text",
    "webhook_url" "text",
    "webhook_events" "jsonb",
    "team_id" "uuid",
    "team_visibility" boolean DEFAULT false
);


ALTER TABLE "public"."integrations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."integrations"."webhook_url" IS 'Webhook URL provided by the user for the integration.';



COMMENT ON COLUMN "public"."integrations"."webhook_events" IS 'JSONB array of events the user wants to subscribe to for the webhook.';



COMMENT ON COLUMN "public"."integrations"."team_id" IS 'Foreign key referencing the teams table, if the integration is team-specific';



COMMENT ON COLUMN "public"."integrations"."team_visibility" IS 'Indicates if the integration is visible to the team';



CREATE TABLE IF NOT EXISTS "public"."integrations_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "instance_id" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_reference_id" "text",
    "token" "text",
    "instance_display_name" "text",
    "owner_id" "text",
    "status" "text",
    "pipeline_id" "uuid"
);


ALTER TABLE "public"."integrations_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid",
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sequence" integer,
    "metadata" "text",
    "enabled" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."knowledge_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "file_path" "text",
    "file_type" "text",
    "chunking_method" "text",
    "custom_chunk_size" integer
);


ALTER TABLE "public"."knowledge_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_pipeline" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "pipeline_id" "uuid" NOT NULL,
    "stage_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."lead_pipeline" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."lead_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "value" numeric DEFAULT 0,
    "pipeline_stage_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "customer_id" "uuid",
    "team_id" "uuid"
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


COMMENT ON COLUMN "public"."leads"."team_id" IS 'Foreign key referencing the teams table, for team-specific leads';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "message_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_participant_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "wamid" "text"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pipeline_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."pipeline_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric NOT NULL,
    "messages_per_month" integer,
    "token_allocation" integer,
    "features" "jsonb",
    "owner_id" "uuid",
    "team_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "integrations_allowed" integer
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."plans" IS 'Stores billing plans and their details.';



COMMENT ON COLUMN "public"."plans"."name" IS 'Name of the billing plan (e.g., Starter, Professional).';



COMMENT ON COLUMN "public"."plans"."price" IS 'Price of the plan per month.';



COMMENT ON COLUMN "public"."plans"."messages_per_month" IS 'Number of messages included in the plan per month.';



COMMENT ON COLUMN "public"."plans"."token_allocation" IS 'Number of tokens allocated in the plan per month.';



COMMENT ON COLUMN "public"."plans"."features" IS 'JSON array of features included in the plan.';



COMMENT ON COLUMN "public"."plans"."owner_id" IS 'Identifier of the user who owns or is assigned this plan.';



COMMENT ON COLUMN "public"."plans"."team_id" IS 'Identifier of the team this plan is associated with.';



COMMENT ON COLUMN "public"."plans"."created_at" IS 'Timestamp of when the plan record was created.';



CREATE TABLE IF NOT EXISTS "public"."profile_integration_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "integration_id" "uuid" NOT NULL
);


ALTER TABLE "public"."profile_integration_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "email" "text" NOT NULL,
    "role" "public"."app_role" DEFAULT 'user'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schema_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schema_name" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "column_name" "text",
    "description" "text" NOT NULL,
    "embedding" "public"."vector"(1536),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schema_embeddings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."segment_contacts" (
    "segment_id" "uuid" NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."segment_contacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."segment_contacts" IS 'Links customers to specific segments.';



CREATE TABLE IF NOT EXISTS "public"."segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."segments" OWNER TO "postgres";


COMMENT ON TABLE "public"."segments" IS 'Stores user-defined customer segments.';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "status" "public"."subscription_status" NOT NULL,
    "subscribed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."subscriptions" IS 'Stores user and team subscriptions to billing plans.';



COMMENT ON COLUMN "public"."subscriptions"."profile_id" IS 'The user (profile) who is subscribed.';



COMMENT ON COLUMN "public"."subscriptions"."plan_id" IS 'The plan to which the user/team is subscribed.';



COMMENT ON COLUMN "public"."subscriptions"."team_id" IS 'The team associated with this subscription, if applicable.';



COMMENT ON COLUMN "public"."subscriptions"."status" IS 'The current status of the subscription.';



COMMENT ON COLUMN "public"."subscriptions"."subscribed_at" IS 'Timestamp when the subscription was initially created/started.';



COMMENT ON COLUMN "public"."subscriptions"."current_period_start" IS 'Start date of the current billing cycle.';



COMMENT ON COLUMN "public"."subscriptions"."current_period_end" IS 'End date of the current billing cycle.';



COMMENT ON COLUMN "public"."subscriptions"."cancel_at_period_end" IS 'If true, the subscription will be canceled at the end of the current period.';



COMMENT ON COLUMN "public"."subscriptions"."canceled_at" IS 'Timestamp when the subscription was canceled.';



COMMENT ON COLUMN "public"."subscriptions"."ended_at" IS 'Timestamp when the subscription fully ended (e.g., after cancellation period).';



CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "due_date" timestamp with time zone NOT NULL,
    "assignee_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "type" "public"."task_status"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


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



CREATE TABLE IF NOT EXISTS "public"."token_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "monthly_tokens" integer DEFAULT 1000 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."token_allocations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."token_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tokens_used" integer NOT NULL,
    "conversation_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."token_usage" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agent_availability_settings"
    ADD CONSTRAINT "agent_availability_settings_agent_id_day_of_week_key" UNIQUE ("agent_id", "day_of_week");



ALTER TABLE ONLY "public"."agent_availability_settings"
    ADD CONSTRAINT "agent_availability_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_google_calendar_settings"
    ADD CONSTRAINT "agent_google_calendar_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_agent_integrations"
    ADD CONSTRAINT "ai_agent_integrations_pkey" PRIMARY KEY ("agent_id", "integration_id");



ALTER TABLE ONLY "public"."ai_agent_knowledge_documents"
    ADD CONSTRAINT "ai_agent_knowledge_documents_pkey" PRIMARY KEY ("agent_id", "document_id");



ALTER TABLE ONLY "public"."ai_agent_sessions"
    ADD CONSTRAINT "ai_agent_sessions_contact_identifier_agent_id_integration_i_key" UNIQUE ("contact_identifier", "agent_id", "integration_id");



ALTER TABLE ONLY "public"."ai_agent_sessions"
    ADD CONSTRAINT "ai_agent_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_agents"
    ADD CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_sentiment_analysis_details"
    ADD CONSTRAINT "batch_sentiment_analysis_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_sentiment_analysis"
    ADD CONSTRAINT "batch_sentiment_analysis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."broadcast_recipients"
    ADD CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."broadcasts"
    ADD CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_summaries"
    ADD CONSTRAINT "conversation_summaries_conversation_id_key" UNIQUE ("conversation_id");



ALTER TABLE ONLY "public"."conversation_summaries"
    ADD CONSTRAINT "conversation_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("conversation_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evolution_webhook_events"
    ADD CONSTRAINT "evolution_webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrations_config"
    ADD CONSTRAINT "integrations_config_integration_id_key" UNIQUE ("integration_id");



ALTER TABLE ONLY "public"."integrations_config"
    ADD CONSTRAINT "integrations_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_pipeline"
    ADD CONSTRAINT "lead_pipeline_lead_id_pipeline_id_key" UNIQUE ("lead_id", "pipeline_id");



ALTER TABLE ONLY "public"."lead_pipeline"
    ADD CONSTRAINT "lead_pipeline_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_tags"
    ADD CONSTRAINT "lead_tags_lead_id_tag_id_key" UNIQUE ("lead_id", "tag_id");



ALTER TABLE ONLY "public"."lead_tags"
    ADD CONSTRAINT "lead_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_wamid_unique" UNIQUE ("wamid");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipelines"
    ADD CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_integration_access"
    ADD CONSTRAINT "profile_integration_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schema_embeddings"
    ADD CONSTRAINT "schema_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."segment_contacts"
    ADD CONSTRAINT "segment_contacts_pkey" PRIMARY KEY ("segment_id", "contact_id");



ALTER TABLE ONLY "public"."segments"
    ADD CONSTRAINT "segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_users"
    ADD CONSTRAINT "team_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_users"
    ADD CONSTRAINT "team_users_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "temp_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."token_allocations"
    ADD CONSTRAINT "token_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."token_allocations"
    ADD CONSTRAINT "token_allocations_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."token_usage"
    ADD CONSTRAINT "token_usage_pkey" PRIMARY KEY ("id");


-- Moved message_logs table definition and its constraints here
CREATE TABLE IF NOT EXISTS "public"."message_logs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "profile_id" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
    "integration_config_id" uuid REFERENCES "public"."integrations_config"("id") ON DELETE SET NULL,
    "recipient_identifier" TEXT,
    "message_content" TEXT,
    "media_url" TEXT,
    "media_details" JSONB,
    "message_type" TEXT, -- Consider creating an ENUM type if values are fixed e.g. public.message_log_type
    "status" TEXT DEFAULT 'pending',
    "direction" TEXT, -- e.g., 'outgoing', 'incoming'
    "provider_message_id" TEXT,
    "sent_at" TIMESTAMP WITH TIME ZONE,
    "error_message" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE "public"."message_logs" IS 'Logs all messages sent or received through integrations.';
COMMENT ON COLUMN "public"."message_logs"."profile_id" IS 'User profile associated with the message.';
COMMENT ON COLUMN "public"."message_logs"."integration_config_id" IS 'Configuration of the integration used for the message.';
COMMENT ON COLUMN "public"."message_logs"."media_url" IS 'URL of the media sent, if applicable.';

-- Trigger for updated_at on message_logs
CREATE OR REPLACE TRIGGER set_message_logs_updated_at
BEFORE UPDATE ON "public"."message_logs"
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();


ALTER TABLE ONLY "public"."batch_sentiment_analysis_details"
    ADD CONSTRAINT "unique_batch_conversation" UNIQUE ("batch_analysis_id", "conversation_id");



ALTER TABLE ONLY "public"."profile_integration_access"
    ADD CONSTRAINT "unique_profile_integration" UNIQUE ("profile_id", "integration_id");



CREATE INDEX "evolution_webhook_events_created_at_desc_idx" ON "public"."evolution_webhook_events" USING "btree" ("created_at" DESC);



CREATE INDEX "evolution_webhook_events_source_status_idx" ON "public"."evolution_webhook_events" USING "btree" ("source_identifier", "processing_status");



CREATE INDEX "idx_agent_conversations_needs_review" ON "public"."agent_conversations" USING "btree" ("needs_review") WHERE ("needs_review" = true);



CREATE INDEX "idx_agent_conversations_session_id" ON "public"."agent_conversations" USING "btree" ("session_id");



CREATE INDEX "idx_ai_agent_integrations_agent_id" ON "public"."ai_agent_integrations" USING "btree" ("agent_id");



CREATE INDEX "idx_ai_agent_integrations_integration_id" ON "public"."ai_agent_integrations" USING "btree" ("integration_id");



CREATE INDEX "idx_ai_agent_knowledge_documents_agent_id" ON "public"."ai_agent_knowledge_documents" USING "btree" ("agent_id");



CREATE INDEX "idx_ai_agent_knowledge_documents_document_id" ON "public"."ai_agent_knowledge_documents" USING "btree" ("document_id");



CREATE INDEX "idx_ai_agent_sessions_contact_agent_integration" ON "public"."ai_agent_sessions" USING "btree" ("contact_identifier", "agent_id", "integration_id");



CREATE INDEX "idx_ai_agent_sessions_status" ON "public"."ai_agent_sessions" USING "btree" ("status");



CREATE INDEX "idx_ai_agents_user_id" ON "public"."ai_agents" USING "btree" ("user_id");



CREATE INDEX "idx_batch_sentiment_details_batch_id" ON "public"."batch_sentiment_analysis_details" USING "btree" ("batch_analysis_id");



CREATE INDEX "idx_batch_sentiment_details_conversation_id" ON "public"."batch_sentiment_analysis_details" USING "btree" ("conversation_id");



CREATE INDEX "idx_broadcast_recipients_broadcast_id" ON "public"."broadcast_recipients" USING "btree" ("broadcast_id");



CREATE INDEX "idx_conversations_lead_id" ON "public"."conversations" USING "btree" ("lead_id");



CREATE INDEX "idx_integrations_config_pipeline_id" ON "public"."integrations_config" USING "btree" ("pipeline_id");



CREATE INDEX "idx_knowledge_chunks_enabled" ON "public"."knowledge_chunks" USING "btree" ("enabled");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_participant_id");



CREATE INDEX "idx_profile_integration_access_integration_id" ON "public"."profile_integration_access" USING "btree" ("integration_id");



CREATE INDEX "idx_subscriptions_plan_id" ON "public"."subscriptions" USING "btree" ("plan_id");



CREATE INDEX "idx_subscriptions_profile_id" ON "public"."subscriptions" USING "btree" ("profile_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_team_id" ON "public"."subscriptions" USING "btree" ("team_id");



CREATE INDEX "schema_embeddings_embedding_idx" ON "public"."schema_embeddings" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE UNIQUE INDEX "uq_profile_active_subscription" ON "public"."subscriptions" USING "btree" ("profile_id", "status") WHERE ("status" = ANY (ARRAY['active'::"public"."subscription_status", 'trialing'::"public"."subscription_status", 'past_due'::"public"."subscription_status"]));



CREATE UNIQUE INDEX "uq_team_active_subscription" ON "public"."subscriptions" USING "btree" ("team_id", "status") WHERE (("status" = ANY (ARRAY['active'::"public"."subscription_status", 'trialing'::"public"."subscription_status", 'past_due'::"public"."subscription_status"])) AND ("team_id" IS NOT NULL));



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."lead_pipeline" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."lead_tags" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."pipeline_stages" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."pipelines" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."tags" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_ai_agent_sessions_updated" BEFORE UPDATE ON "public"."ai_agent_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_ai_agents_updated" BEFORE UPDATE ON "public"."ai_agents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_agent_availability_settings_updated_at" BEFORE UPDATE ON "public"."agent_availability_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_agent_google_calendar_settings_updated_at" BEFORE UPDATE ON "public"."agent_google_calendar_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_broadcast_recipients_timestamp" BEFORE UPDATE ON "public"."broadcast_recipients" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."integrations_config" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_knowledge_chunks" BEFORE UPDATE ON "public"."knowledge_chunks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_knowledge_documents" BEFORE UPDATE ON "public"."knowledge_documents" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_conversation_timestamp" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



ALTER TABLE ONLY "public"."agent_availability_settings"
    ADD CONSTRAINT "agent_availability_settings_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_knowledge_chunk_id_fkey" FOREIGN KEY ("knowledge_chunk_id") REFERENCES "public"."knowledge_chunks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_knowledge_document_id_fkey" FOREIGN KEY ("knowledge_document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agent_conversations"
    ADD CONSTRAINT "agent_conversations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."ai_agent_sessions"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "ai_agent_sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agent_sessions"
    ADD CONSTRAINT "ai_agent_sessions_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_agents"
    ADD CONSTRAINT "ai_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_sentiment_analysis_details"
    ADD CONSTRAINT "batch_sentiment_analysis_details_batch_analysis_id_fkey" FOREIGN KEY ("batch_analysis_id") REFERENCES "public"."batch_sentiment_analysis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_sentiment_analysis_details"
    ADD CONSTRAINT "batch_sentiment_analysis_details_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("conversation_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."broadcast_recipients"
    ADD CONSTRAINT "broadcast_recipients_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."broadcast_recipients"
    ADD CONSTRAINT "broadcast_recipients_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."broadcasts"
    ADD CONSTRAINT "broadcasts_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("conversation_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."conversation_summaries"
    ADD CONSTRAINT "conversation_summaries_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("conversation_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_integrations_id_fkey" FOREIGN KEY ("integrations_id") REFERENCES "public"."integrations"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id");



ALTER TABLE ONLY "public"."integrations_config"
    ADD CONSTRAINT "integrations_config_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id");



ALTER TABLE ONLY "public"."integrations_config"
    ADD CONSTRAINT "integrations_config_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."knowledge_chunks"
    ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_documents"
    ADD CONSTRAINT "knowledge_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lead_pipeline"
    ADD CONSTRAINT "lead_pipeline_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_pipeline"
    ADD CONSTRAINT "lead_pipeline_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_pipeline"
    ADD CONSTRAINT "lead_pipeline_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_tags"
    ADD CONSTRAINT "lead_tags_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_tags"
    ADD CONSTRAINT "lead_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pipeline_stage_id_fkey" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("conversation_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_participant_id_fkey" FOREIGN KEY ("sender_participant_id") REFERENCES "public"."conversation_participants"("id");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipelines"
    ADD CONSTRAINT "pipelines_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipelines"
    ADD CONSTRAINT "pipelines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_integration_access"
    ADD CONSTRAINT "profile_integration_access_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profile_integration_access"
    ADD CONSTRAINT "profile_integration_access_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_integration_access"
    ADD CONSTRAINT "profile_integration_access_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."segment_contacts"
    ADD CONSTRAINT "segment_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."segment_contacts"
    ADD CONSTRAINT "segment_contacts_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."segments"
    ADD CONSTRAINT "segments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."team_users"
    ADD CONSTRAINT "team_users_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_users"
    ADD CONSTRAINT "team_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "temp_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."token_allocations"
    ADD CONSTRAINT "token_allocations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."token_usage"
    ADD CONSTRAINT "token_usage_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("conversation_id");



ALTER TABLE ONLY "public"."token_usage"
    ADD CONSTRAINT "token_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Allow authenticated users to create teams" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to delete chunks" ON "public"."knowledge_chunks" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert chunks" ON "public"."knowledge_chunks" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read batch details" ON "public"."batch_sentiment_analysis_details" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read broadcasts" ON "public"."broadcasts" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read integration configs" ON "public"."integrations_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read their broadcast recipients" ON "public"."broadcast_recipients" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."broadcasts" "b"
  WHERE ("b"."id" = "broadcast_recipients"."broadcast_id")))));



CREATE POLICY "Allow authenticated users to update chunks" ON "public"."knowledge_chunks" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to view chunks" ON "public"."knowledge_chunks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow full access to contacts in own segments" ON "public"."segment_contacts" USING ((EXISTS ( SELECT 1
   FROM "public"."segments" "s"
  WHERE (("s"."id" = "segment_contacts"."segment_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."segments" "s"
  WHERE (("s"."id" = "segment_contacts"."segment_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow full access to own segments" ON "public"."segments" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow members to view their teams" ON "public"."teams" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_users"
  WHERE (("team_users"."team_id" = "teams"."id") AND ("team_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow members to view users in their team" ON "public"."team_users" FOR SELECT TO "authenticated" USING ("public"."is_user_team_member"("auth"."uid"(), "team_id"));



CREATE POLICY "Allow owners to delete their teams" ON "public"."teams" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_users"
  WHERE (("team_users"."team_id" = "teams"."id") AND ("team_users"."user_id" = "auth"."uid"()) AND ("team_users"."role" = 'owner'::"public"."team_role")))));



CREATE POLICY "Allow owners/admins to delete subscriptions" ON "public"."subscriptions" FOR DELETE USING ((("profile_id" = "auth"."uid"()) OR (("team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."team_users" "tu"
  WHERE (("tu"."team_id" = "subscriptions"."team_id") AND ("tu"."user_id" = "auth"."uid"()) AND ("tu"."role" = ANY (ARRAY['admin'::"public"."team_role", 'owner'::"public"."team_role"]))))))));



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



CREATE POLICY "Allow service_role full access" ON "public"."batch_sentiment_analysis_details" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Allow service_role to manage broadcast recipients" ON "public"."broadcast_recipients" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Allow service_role to manage broadcasts" ON "public"."broadcasts" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Allow team admins or owners to create plans" ON "public"."plans" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."team_users" "tu"
  WHERE (("tu"."team_id" = "plans"."team_id") AND ("tu"."user_id" = "auth"."uid"()) AND ("tu"."role" = 'admin'::"public"."team_role")))) OR (("owner_id" = "auth"."uid"()) AND ("team_id" IS NULL))));



CREATE POLICY "Allow team admins or owners to delete plans" ON "public"."plans" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."team_users" "tu"
  WHERE (("tu"."team_id" = "plans"."team_id") AND ("tu"."user_id" = "auth"."uid"()) AND ("tu"."role" = 'admin'::"public"."team_role")))) OR (("owner_id" = "auth"."uid"()) AND ("team_id" IS NULL))));



CREATE POLICY "Allow team admins or owners to update plans" ON "public"."plans" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."team_users" "tu"
  WHERE (("tu"."team_id" = "plans"."team_id") AND ("tu"."user_id" = "auth"."uid"()) AND ("tu"."role" = 'admin'::"public"."team_role")))) OR (("owner_id" = "auth"."uid"()) AND ("team_id" IS NULL))));



CREATE POLICY "Allow users to create subscriptions for self or admined teams" ON "public"."subscriptions" FOR INSERT WITH CHECK ((("profile_id" = "auth"."uid"()) OR (("team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."team_users" "tu"
  WHERE (("tu"."team_id" = "subscriptions"."team_id") AND ("tu"."user_id" = "auth"."uid"()) AND ("tu"."role" = ANY (ARRAY['admin'::"public"."team_role", 'owner'::"public"."team_role"]))))))));



CREATE POLICY "Allow users to delete their own agents" ON "public"."ai_agents" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to insert their own agents" ON "public"."ai_agents" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to leave a team" ON "public"."team_users" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND (NOT (("role" = 'owner'::"public"."team_role") AND (( SELECT "count"(*) AS "count"
   FROM "public"."team_users" "team_users_1"
  WHERE (("team_users_1"."team_id" = "team_users_1"."team_id") AND ("team_users_1"."role" = 'owner'::"public"."team_role"))) = 1)))));



CREATE POLICY "Allow users to see their own or team subscriptions" ON "public"."subscriptions" FOR SELECT USING ((("profile_id" = "auth"."uid"()) OR (("team_id" IS NOT NULL) AND ("team_id" IN ( SELECT "tu"."team_id"
   FROM "public"."team_users" "tu"
  WHERE ("tu"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Allow users to see their team's or own plans" ON "public"."plans" FOR SELECT USING ((("team_id" IN ( SELECT "team_users"."team_id"
   FROM "public"."team_users"
  WHERE ("team_users"."user_id" = "auth"."uid"()))) OR ("owner_id" = "auth"."uid"())));



CREATE POLICY "Allow users to update their own agents" ON "public"."ai_agents" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to update their own or admined team subscriptions" ON "public"."subscriptions" FOR UPDATE USING ((("profile_id" = "auth"."uid"()) OR (("team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."team_users" "tu"
  WHERE (("tu"."team_id" = "subscriptions"."team_id") AND ("tu"."user_id" = "auth"."uid"()) AND ("tu"."role" = ANY (ARRAY['admin'::"public"."team_role", 'owner'::"public"."team_role"]))))))));



CREATE POLICY "Allow users to view their own agents" ON "public"."ai_agents" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "DEBUG - Allow any authenticated insert into team_users" ON "public"."team_users" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Only admins can delete access records" ON "public"."profile_integration_access" FOR DELETE TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."app_role"))));



CREATE POLICY "Only admins can insert access records" ON "public"."profile_integration_access" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."app_role"))));



CREATE POLICY "Profiles can only view integration configs they have access to" ON "public"."integrations_config" FOR SELECT TO "authenticated" USING ("public"."profile_has_integration_access"("auth"."uid"(), "id"));



CREATE POLICY "Profiles can view their own access records" ON "public"."profile_integration_access" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "profile_id") OR ("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Users can create tasks" ON "public"."tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can delete chunks of their documents" ON "public"."knowledge_chunks" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."knowledge_documents"
  WHERE (("knowledge_documents"."id" = "knowledge_chunks"."document_id") AND ("knowledge_documents"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own documents" ON "public"."knowledge_documents" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own tasks" ON "public"."tasks" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert chunks for their documents" ON "public"."knowledge_chunks" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."knowledge_documents"
  WHERE (("knowledge_documents"."id" = "knowledge_chunks"."document_id") AND ("knowledge_documents"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert pipeline leads" ON "public"."lead_pipeline" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pipelines"
  WHERE (("pipelines"."id" = "lead_pipeline"."pipeline_id") AND ("pipelines"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own documents" ON "public"."knowledge_documents" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own leads" ON "public"."leads" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage stages of their pipelines" ON "public"."pipeline_stages" USING ((EXISTS ( SELECT 1
   FROM "public"."pipelines" "p"
  WHERE (("p"."id" = "pipeline_stages"."pipeline_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own pipelines" ON "public"."pipelines" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update chunks of their documents" ON "public"."knowledge_chunks" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."knowledge_documents"
  WHERE (("knowledge_documents"."id" = "knowledge_chunks"."document_id") AND ("knowledge_documents"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update pipeline leads" ON "public"."lead_pipeline" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pipelines"
  WHERE (("pipelines"."id" = "lead_pipeline"."pipeline_id") AND ("pipelines"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own documents" ON "public"."knowledge_documents" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own leads" ON "public"."leads" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own tasks and tasks assigned to them" ON "public"."tasks" FOR UPDATE USING ((("auth"."uid"() = "created_by") OR ("auth"."uid"() = "assignee_id")));



CREATE POLICY "Users can view chunks of their documents" ON "public"."knowledge_chunks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."knowledge_documents"
  WHERE (("knowledge_documents"."id" = "knowledge_chunks"."document_id") AND ("knowledge_documents"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own documents" ON "public"."knowledge_documents" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own leads" ON "public"."leads" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own tasks and tasks assigned to them" ON "public"."tasks" FOR SELECT USING ((("auth"."uid"() = "created_by") OR ("auth"."uid"() = "assignee_id")));



CREATE POLICY "Users can view their pipeline leads" ON "public"."lead_pipeline" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."pipelines"
  WHERE (("pipelines"."id" = "lead_pipeline"."pipeline_id") AND ("pipelines"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."batch_sentiment_analysis_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_pipeline" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipelines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_integration_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."evolution_webhook_events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."integrations_config";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";









































































































































































































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_new_team"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_new_team"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_new_team"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_dynamic_sql"("sql_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_dynamic_sql"("sql_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_dynamic_sql"("sql_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_month"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_month"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_month"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_week"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_week"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_week"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_evolution_api_key"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_evolution_api_key"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_evolution_api_key"() TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."integrations_encrypt_secret_api_key"() TO "anon";
GRANT ALL ON FUNCTION "public"."integrations_encrypt_secret_api_key"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."integrations_encrypt_secret_api_key"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_team_admin_or_owner"("p_user_id" "uuid", "p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_team_admin_or_owner"("p_user_id" "uuid", "p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_team_admin_or_owner"("p_user_id" "uuid", "p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_team_member"("p_user_id" "uuid", "p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_team_member"("p_user_id" "uuid", "p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_team_member"("p_user_id" "uuid", "p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_document_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_document_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_document_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" real, "match_count" integer, "document_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" real, "match_count" integer, "document_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_knowledge_chunks"("query_embedding" "public"."vector", "match_threshold" real, "match_count" integer, "document_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_schema_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_schema_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_schema_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."profile_has_integration_access"("_profile_id" "uuid", "_integration_config_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."profile_has_integration_access"("_profile_id" "uuid", "_integration_config_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."profile_has_integration_access"("_profile_id" "uuid", "_integration_config_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "service_role";



GRANT ALL ON TABLE "public"."pipelines" TO "anon";
GRANT ALL ON TABLE "public"."pipelines" TO "authenticated";
GRANT ALL ON TABLE "public"."pipelines" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pipeline_name"("pipeline_id" "uuid", "new_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_pipeline_name"("pipeline_id" "uuid", "new_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pipeline_name"("pipeline_id" "uuid", "new_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";





















GRANT ALL ON TABLE "public"."agent_availability_settings" TO "anon";
GRANT ALL ON TABLE "public"."agent_availability_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_availability_settings" TO "service_role";



GRANT ALL ON TABLE "public"."agent_conversations" TO "anon";
GRANT ALL ON TABLE "public"."agent_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_conversations" TO "service_role";



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



GRANT ALL ON TABLE "public"."broadcast_recipients" TO "anon";
GRANT ALL ON TABLE "public"."broadcast_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."broadcast_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."broadcasts" TO "anon";
GRANT ALL ON TABLE "public"."broadcasts" TO "authenticated";
GRANT ALL ON TABLE "public"."broadcasts" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_summaries" TO "anon";
GRANT ALL ON TABLE "public"."conversation_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."evolution_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."evolution_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."evolution_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."integrations" TO "anon";
GRANT ALL ON TABLE "public"."integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."integrations" TO "service_role";



GRANT ALL ON TABLE "public"."integrations_config" TO "anon";
GRANT ALL ON TABLE "public"."integrations_config" TO "authenticated";
GRANT ALL ON TABLE "public"."integrations_config" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_chunks" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_documents" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_documents" TO "service_role";



GRANT ALL ON TABLE "public"."lead_pipeline" TO "anon";
GRANT ALL ON TABLE "public"."lead_pipeline" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_pipeline" TO "service_role";



GRANT ALL ON TABLE "public"."lead_tags" TO "anon";
GRANT ALL ON TABLE "public"."lead_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_tags" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_stages" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."profile_integration_access" TO "anon";
GRANT ALL ON TABLE "public"."profile_integration_access" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_integration_access" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."schema_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."schema_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."schema_embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."segment_contacts" TO "anon";
GRANT ALL ON TABLE "public"."segment_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."segment_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."segments" TO "anon";
GRANT ALL ON TABLE "public"."segments" TO "authenticated";
GRANT ALL ON TABLE "public"."segments" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."team_users" TO "anon";
GRANT ALL ON TABLE "public"."team_users" TO "authenticated";
GRANT ALL ON TABLE "public"."team_users" TO "service_role";



GRANT ALL ON TABLE "public"."token_allocations" TO "anon";
GRANT ALL ON TABLE "public"."token_allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."token_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."token_usage" TO "anon";
GRANT ALL ON TABLE "public"."token_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."token_usage" TO "service_role";



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

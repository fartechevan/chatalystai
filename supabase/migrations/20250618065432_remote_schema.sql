create schema if not exists "bigquery";


create extension if not exists "wrappers" with schema "extensions";


create extension if not exists "vector" with schema "public" version '0.8.0';

create type "public"."app_role" as enum ('admin', 'user', 'customer');

create type "public"."message_log_status" as enum ('pending', 'sent', 'delivered', 'read', 'failed', 'blocked_quota', 'blocked_rule');

create type "public"."message_log_type" as enum ('text', 'image', 'video', 'audio', 'document', 'template', 'interactive_buttons', 'interactive_list', 'location', 'contact', 'sticker', 'unknown');

create type "public"."new_app_role" as enum ('user', 'admin');

create type "public"."role_enum" as enum ('admin', 'member');

create type "public"."sender_type" as enum ('user', 'ai');

create type "public"."sentiment_level" as enum ('bad', 'moderate', 'good');

create type "public"."sentiment_type" as enum ('bad', 'moderate', 'good');

create type "public"."sync_status" as enum ('pending', 'completed', 'failed');

create type "public"."task_status" as enum ('follow-up', 'meeting');

drop trigger if exists "set_agent_availability_settings_updated_at" on "public"."agent_availability_settings";

drop trigger if exists "set_agent_google_calendar_settings_updated_at" on "public"."agent_google_calendar_settings";

drop trigger if exists "on_ai_agent_integrations_updated" on "public"."ai_agent_integrations";

drop trigger if exists "on_conversations_updated" on "public"."conversations";

drop trigger if exists "on_integrations_updated" on "public"."integrations";

drop trigger if exists "on_integrations_config_updated" on "public"."integrations_config";

drop trigger if exists "on_knowledge_documents_updated" on "public"."knowledge_documents";

drop trigger if exists "on_pipelines_updated" on "public"."pipelines";

drop trigger if exists "on_plans_updated" on "public"."plans";

drop trigger if exists "on_new_profile_created_create_trial_subscription" on "public"."profiles";

drop trigger if exists "on_profiles_updated" on "public"."profiles";

drop trigger if exists "on_new_subscription_create_personal_tenant_trigger" on "public"."subscriptions";

drop trigger if exists "on_subscriptions_updated" on "public"."subscriptions";

drop trigger if exists "on_new_team_owner_create_tenant_trigger" on "public"."team_users";

drop trigger if exists "on_tenants_updated" on "public"."tenants";

drop policy "Allow admin full access to plans" on "public"."plans";

drop policy "Allow public read access to plans" on "public"."plans";

drop policy "Public profiles are viewable by everyone." on "public"."profiles";

drop policy "Users can insert their own profile." on "public"."profiles";

drop policy "Users can update own profile." on "public"."profiles";

drop policy "Allow service_role full access to subscriptions" on "public"."subscriptions";

drop policy "Allow users to read their own subscriptions" on "public"."subscriptions";

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

revoke delete on table "public"."tenants" from "anon";

revoke insert on table "public"."tenants" from "anon";

revoke references on table "public"."tenants" from "anon";

revoke select on table "public"."tenants" from "anon";

revoke trigger on table "public"."tenants" from "anon";

revoke truncate on table "public"."tenants" from "anon";

revoke update on table "public"."tenants" from "anon";

revoke delete on table "public"."tenants" from "authenticated";

revoke insert on table "public"."tenants" from "authenticated";

revoke references on table "public"."tenants" from "authenticated";

revoke select on table "public"."tenants" from "authenticated";

revoke trigger on table "public"."tenants" from "authenticated";

revoke truncate on table "public"."tenants" from "authenticated";

revoke update on table "public"."tenants" from "authenticated";

revoke delete on table "public"."tenants" from "service_role";

revoke insert on table "public"."tenants" from "service_role";

revoke references on table "public"."tenants" from "service_role";

revoke select on table "public"."tenants" from "service_role";

revoke trigger on table "public"."tenants" from "service_role";

revoke truncate on table "public"."tenants" from "service_role";

revoke update on table "public"."tenants" from "service_role";

alter table "public"."agent_availability_settings" drop constraint "agent_availability_settings_agent_id_day_of_week_key";

alter table "public"."agent_availability_settings" drop constraint "agent_availability_settings_agent_id_fkey";

alter table "public"."agent_google_calendar_settings" drop constraint "agent_google_calendar_settings_agent_id_fkey";

alter table "public"."ai_agent_integrations" drop constraint "ai_agent_integrations_integration_id_fkey";

alter table "public"."ai_agent_sessions" drop constraint "ai_agent_sessions_integration_id_fkey";

alter table "public"."conversations" drop constraint "conversations_team_id_fkey";

alter table "public"."integrations_config" drop constraint "integrations_config_tenant_id_fkey";

alter table "public"."pipelines" drop constraint "pipelines_team_id_fkey";

alter table "public"."plans" drop constraint "plans_name_key";

alter table "public"."plans" drop constraint "plans_team_id_fkey";

alter table "public"."profiles" drop constraint "profiles_id_fkey";

alter table "public"."subscriptions" drop constraint "subscriptions_team_id_fkey";

alter table "public"."team_users" drop constraint "team_users_role_check";

alter table "public"."team_users" drop constraint "team_users_team_id_fkey";

alter table "public"."team_users" drop constraint "team_users_team_id_user_id_key";

alter table "public"."team_users" drop constraint "team_users_user_id_fkey";

alter table "public"."tenants" drop constraint "tenants_owner_profile_id_fkey";

alter table "public"."tenants" drop constraint "tenants_team_id_fkey";

alter table "public"."tenants" drop constraint "tenants_team_id_unique_if_not_null";

alter table "public"."ai_agent_sessions" drop constraint "ai_agent_sessions_agent_id_fkey";

alter table "public"."integrations_config" drop constraint "integrations_config_integration_id_fkey";

alter table "public"."knowledge_documents" drop constraint "knowledge_documents_user_id_fkey";

alter table "public"."plans" drop constraint "plans_owner_id_fkey";

alter table "public"."subscriptions" drop constraint "subscriptions_profile_id_fkey";

drop function if exists "public"."add_user_to_team_on_signup"();

drop function if exists "public"."create_new_team"(p_name text);

drop function if exists "public"."create_trial_subscription_for_new_user"();

drop function if exists "public"."handle_new_subscription_create_personal_tenant"();

drop function if exists "public"."handle_new_team_owner_create_tenant"();

drop function if exists "public"."handle_updated_at_plans"();

drop function if exists "public"."handle_updated_at_profiles"();

drop function if exists "public"."handle_updated_at_subscriptions"();

drop function if exists "public"."upsert_integration_config"(p_integration_id uuid, p_instance_id text, p_tenant_id uuid, p_instance_display_name text, p_token text, p_owner_id text, p_user_reference_id text, p_pipeline_id uuid, p_status text);

alter table "public"."agent_availability_settings" drop constraint "agent_availability_settings_pkey";

alter table "public"."agent_google_calendar_settings" drop constraint "agent_google_calendar_settings_pkey";

alter table "public"."ai_agent_integrations" drop constraint "ai_agent_integrations_pkey";

alter table "public"."profiles" drop constraint "profiles_pkey";

alter table "public"."team_users" drop constraint "team_users_pkey";

alter table "public"."teams" drop constraint "teams_pkey";

alter table "public"."tenants" drop constraint "tenants_pkey";

drop index if exists "public"."agent_availability_settings_agent_id_day_of_week_key";

drop index if exists "public"."agent_availability_settings_pkey";

drop index if exists "public"."agent_google_calendar_settings_pkey";

drop index if exists "public"."ai_agent_integrations_pkey";

drop index if exists "public"."idx_ai_agent_integrations_integration_id";

drop index if exists "public"."idx_ai_agent_sessions_agent_id";

drop index if exists "public"."idx_ai_agent_sessions_contact_identifier";

drop index if exists "public"."idx_ai_agent_sessions_integration_id";

drop index if exists "public"."idx_ai_agent_sessions_is_active";

drop index if exists "public"."idx_integrations_config_owner_id";

drop index if exists "public"."idx_integrations_config_tenant_id";

drop index if exists "public"."idx_integrations_name";

drop index if exists "public"."idx_integrations_status";

drop index if exists "public"."idx_knowledge_documents_title";

drop index if exists "public"."idx_knowledge_documents_user_id";

drop index if exists "public"."idx_pipelines_is_default";

drop index if exists "public"."idx_pipelines_user_id";

drop index if exists "public"."idx_tenants_owner_profile_id";

drop index if exists "public"."idx_tenants_team_id";

drop index if exists "public"."idx_tenants_unique_personal_tenant";

drop index if exists "public"."plans_name_key";

drop index if exists "public"."profiles_pkey";

drop index if exists "public"."team_users_pkey";

drop index if exists "public"."team_users_team_id_user_id_key";

drop index if exists "public"."teams_pkey";

drop index if exists "public"."tenants_pkey";

drop index if exists "public"."tenants_team_id_unique_if_not_null";

drop index if exists "public"."uq_integrations_config_instance_id_if_tenant_is_null";

drop index if exists "public"."uq_integrations_config_tenant_id_instance_id_if_tenant_is_not_n";

drop table "public"."agent_availability_settings";

drop table "public"."agent_google_calendar_settings";

drop table "public"."team_users";

drop table "public"."teams";

drop table "public"."tenants";

alter type "public"."subscription_status" rename to "subscription_status__old_version_to_be_dropped";

create type "public"."subscription_status" as enum ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid');

create table "public"."agent_conversations" (
    "id" uuid not null default gen_random_uuid(),
    "session_id" uuid,
    "message_timestamp" timestamp with time zone default now(),
    "sender_type" sender_type not null,
    "message_content" text,
    "knowledge_used" jsonb,
    "needs_review" boolean default true,
    "added_to_knowledge_base" boolean default false,
    "knowledge_document_id" uuid,
    "knowledge_chunk_id" uuid,
    "created_at" timestamp with time zone default now()
);


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


create table "public"."broadcast_recipients" (
    "id" uuid not null default gen_random_uuid(),
    "broadcast_id" uuid not null,
    "customer_id" uuid,
    "phone_number" text not null,
    "status" text not null default 'pending'::text,
    "error_message" text,
    "sent_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


create table "public"."broadcasts" (
    "id" uuid not null default gen_random_uuid(),
    "message_text" text not null,
    "integration_id" uuid,
    "instance_id" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "segment_id" uuid,
    "status" text default 'pending'::text,
    "updated_at" timestamp with time zone default now(),
    "integration_config_id" uuid
);


create table "public"."conversation_participants" (
    "conversation_id" uuid not null,
    "customer_id" uuid,
    "joined_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "left_at" timestamp without time zone,
    "role" role_enum,
    "external_user_identifier" character varying(255),
    "id" uuid not null default gen_random_uuid()
);


create table "public"."conversation_summaries" (
    "id" uuid not null default gen_random_uuid(),
    "conversation_id" uuid not null,
    "summary" text not null,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
);


create table "public"."customers" (
    "id" uuid not null default gen_random_uuid(),
    "phone_number" text not null,
    "name" text not null,
    "email" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "company_name" text,
    "company_address" text
);


create table "public"."documents" (
    "id" uuid not null,
    "content" text,
    "embedding" vector(1536),
    "metadata" jsonb
);


create table "public"."evolution_webhook_events" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "payload" jsonb not null,
    "processing_status" character varying(20) not null,
    "source_identifier" character varying(255),
    "event_type" character varying(100) not null
);


create table "public"."knowledge_chunks" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid,
    "content" text not null,
    "embedding" vector(1536),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "sequence" integer,
    "metadata" text,
    "enabled" boolean not null default true
);


create table "public"."lead_pipeline" (
    "id" uuid not null default gen_random_uuid(),
    "lead_id" uuid not null,
    "pipeline_id" uuid not null,
    "stage_id" uuid not null,
    "position" integer not null default 0,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


create table "public"."lead_tags" (
    "id" uuid not null default gen_random_uuid(),
    "lead_id" uuid not null,
    "tag_id" uuid not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."lead_tags" enable row level security;

create table "public"."leads" (
    "id" uuid not null default gen_random_uuid(),
    "value" numeric default 0,
    "pipeline_stage_id" uuid,
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "customer_id" uuid
);


create table "public"."message_logs" (
    "id" uuid not null default gen_random_uuid(),
    "profile_id" uuid,
    "integration_config_id" uuid,
    "recipient_identifier" text not null,
    "message_content" text,
    "media_details" jsonb,
    "message_type" message_log_type not null default 'unknown'::message_log_type,
    "status" message_log_status not null default 'pending'::message_log_status,
    "sent_at" timestamp with time zone,
    "provider_message_id" text,
    "error_message" text,
    "direction" text not null default 'outgoing'::text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


create table "public"."messages" (
    "message_id" uuid not null default gen_random_uuid(),
    "conversation_id" uuid not null,
    "sender_participant_id" uuid not null,
    "content" text,
    "is_read" boolean not null default false,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "wamid" text,
    "media_type" text,
    "media_data" jsonb
);


create table "public"."pipeline_stages" (
    "id" uuid not null default gen_random_uuid(),
    "pipeline_id" uuid not null,
    "name" text not null,
    "position" integer not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
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


create table "public"."profile_integration_access" (
    "id" uuid not null default gen_random_uuid(),
    "profile_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "integration_id" uuid not null
);


create table "public"."schema_embeddings" (
    "id" uuid not null default gen_random_uuid(),
    "schema_name" text not null,
    "table_name" text not null,
    "column_name" text,
    "description" text not null,
    "embedding" vector(1536),
    "created_at" timestamp with time zone default now()
);


create table "public"."segment_contacts" (
    "segment_id" uuid not null,
    "contact_id" uuid not null,
    "added_at" timestamp with time zone not null default now()
);


create table "public"."segments" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."tags" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."tags" enable row level security;

create table "public"."tasks" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "due_date" timestamp with time zone not null,
    "assignee_id" uuid not null,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "type" task_status
);


alter table "public"."tasks" enable row level security;

create table "public"."token_allocations" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "monthly_tokens" integer not null default 1000,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
);


create table "public"."vector_db_v1" (
    "id" uuid not null default gen_random_uuid(),
    "content" text,
    "metadata" jsonb,
    "embedding" vector(1536)
);


create table "public"."whatsapp_blast_limits" (
    "id" uuid not null default gen_random_uuid(),
    "date" date not null,
    "blast_limit" integer not null,
    "count" integer not null default 0,
    "integration_id" uuid not null
);


alter table "public"."subscriptions" alter column status type "public"."subscription_status" using status::text::"public"."subscription_status";

drop type "public"."subscription_status__old_version_to_be_dropped";

alter table "public"."ai_agent_integrations" drop column "integration_id";

alter table "public"."ai_agent_integrations" add column "activation_mode" text default 'keyword'::text;

alter table "public"."ai_agent_integrations" add column "error_message" text default 'Sorry, I can''t help with that right now, we''ll get in touch with you shortly.'::text;

alter table "public"."ai_agent_integrations" add column "integrations_config_id" uuid;

alter table "public"."ai_agent_integrations" add column "session_timeout_minutes" integer default 60;

alter table "public"."ai_agent_integrations" add column "stop_keywords" text[] default '{}'::text[];

alter table "public"."ai_agent_sessions" drop column "integration_id";

alter table "public"."ai_agent_sessions" add column "integrations_config_id" uuid;

alter table "public"."ai_agent_sessions" alter column "conversation_history" set data type jsonb using "conversation_history"::jsonb;

alter table "public"."ai_agent_sessions" alter column "is_active" set default false;

alter table "public"."ai_agent_sessions" alter column "last_interaction_timestamp" set default now();

alter table "public"."ai_agents" add column "agent_type" text not null default 'chattalyst'::text;

alter table "public"."ai_agents" add column "custom_agent_config" jsonb;

alter table "public"."ai_agents" alter column "created_at" set default timezone('utc'::text, now());

alter table "public"."ai_agents" alter column "updated_at" set default timezone('utc'::text, now());

alter table "public"."batch_sentiment_analysis" drop column "bad_count";

alter table "public"."batch_sentiment_analysis" drop column "good_count";

alter table "public"."batch_sentiment_analysis" drop column "moderate_count";

alter table "public"."batch_sentiment_analysis" drop column "unknown_count";

alter table "public"."batch_sentiment_analysis" add column "negative_count" integer default 0;

alter table "public"."batch_sentiment_analysis" add column "neutral_count" integer default 0;

alter table "public"."batch_sentiment_analysis" add column "positive_count" integer default 0;

alter table "public"."batch_sentiment_analysis_details" disable row level security;

alter table "public"."conversations" drop column "channel";

alter table "public"."conversations" drop column "last_message_at";

alter table "public"."conversations" drop column "started_at";

alter table "public"."conversations" drop column "status";

alter table "public"."conversations" drop column "team_id";

alter table "public"."conversations" add column "integrations_id" uuid;

alter table "public"."conversations" add column "lead_id" uuid;

alter table "public"."integrations" alter column "base_url" set default 'https://api.evoapicloud.com'::text;

alter table "public"."integrations" alter column "created_at" set default timezone('utc'::text, now());

alter table "public"."integrations" alter column "created_at" drop not null;

alter table "public"."integrations" alter column "icon_url" set data type character varying using "icon_url"::character varying;

alter table "public"."integrations" alter column "name" set data type character varying using "name"::character varying;

alter table "public"."integrations" alter column "status" set default 'coming_soon'::integration_status;

alter table "public"."integrations" alter column "updated_at" set default timezone('utc'::text, now());

alter table "public"."integrations" alter column "updated_at" drop not null;

alter table "public"."integrations" alter column "webhook_events" set data type jsonb using "webhook_events"::jsonb;

alter table "public"."integrations_config" drop column "tenant_id";

alter table "public"."integrations_config" alter column "created_at" set default timezone('utc'::text, now());

alter table "public"."integrations_config" alter column "updated_at" set default timezone('utc'::text, now());

alter table "public"."knowledge_documents" alter column "created_at" drop not null;

alter table "public"."knowledge_documents" alter column "updated_at" drop not null;

alter table "public"."pipelines" drop column "team_id";

alter table "public"."pipelines" alter column "created_at" set default timezone('utc'::text, now());

alter table "public"."pipelines" alter column "updated_at" set default timezone('utc'::text, now());

alter table "public"."plans" drop column "team_id";

alter table "public"."plans" drop column "updated_at";

alter table "public"."plans" alter column "created_at" set default now();

alter table "public"."plans" alter column "price" drop default;

alter table "public"."plans" alter column "price" set data type numeric using "price"::numeric;

alter table "public"."plans" disable row level security;

alter table "public"."profiles" drop column "avatar_url";

alter table "public"."profiles" drop column "full_name";

alter table "public"."profiles" drop column "updated_at";

alter table "public"."profiles" add column "created_at" timestamp with time zone not null default timezone('utc'::text, now());

alter table "public"."profiles" add column "email" text not null;

alter table "public"."profiles" add column "name" text;

alter table "public"."profiles" add column "role" app_role not null default 'user'::app_role;

alter table "public"."profiles" disable row level security;

alter table "public"."subscriptions" drop column "team_id";

alter table "public"."subscriptions" drop column "trial_end_date";

alter table "public"."subscriptions" alter column "created_at" set default now();

alter table "public"."subscriptions" alter column "subscribed_at" set default now();

alter table "public"."subscriptions" alter column "updated_at" set default now();

alter table "public"."subscriptions" disable row level security;

CREATE UNIQUE INDEX agent_conversations_pkey ON public.agent_conversations USING btree (id);

CREATE UNIQUE INDEX appointments_pkey ON public.appointments USING btree (id);

CREATE UNIQUE INDEX broadcast_recipients_pkey ON public.broadcast_recipients USING btree (id);

CREATE UNIQUE INDEX broadcasts_pkey ON public.broadcasts USING btree (id);

CREATE UNIQUE INDEX conversation_participants_pkey ON public.conversation_participants USING btree (id);

CREATE UNIQUE INDEX conversation_summaries_conversation_id_key ON public.conversation_summaries USING btree (conversation_id);

CREATE UNIQUE INDEX conversation_summaries_pkey ON public.conversation_summaries USING btree (id);

CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);

CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);

CREATE INDEX evolution_webhook_events_created_at_desc_idx ON public.evolution_webhook_events USING btree (created_at DESC);

CREATE UNIQUE INDEX evolution_webhook_events_pkey ON public.evolution_webhook_events USING btree (id);

CREATE INDEX evolution_webhook_events_source_status_idx ON public.evolution_webhook_events USING btree (source_identifier, processing_status);

CREATE INDEX idx_agent_conversations_needs_review ON public.agent_conversations USING btree (needs_review) WHERE (needs_review = true);

CREATE INDEX idx_agent_conversations_session_id ON public.agent_conversations USING btree (session_id);

CREATE INDEX idx_ai_agent_sessions_integrations_config_id ON public.ai_agent_sessions USING btree (integrations_config_id);

CREATE INDEX idx_appointments_contact_identifier ON public.appointments USING btree (contact_identifier);

CREATE INDEX idx_appointments_start_time ON public.appointments USING btree (start_time);

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);

CREATE INDEX idx_broadcast_recipients_broadcast_id ON public.broadcast_recipients USING btree (broadcast_id);

CREATE INDEX idx_conversations_lead_id ON public.conversations USING btree (lead_id);

CREATE INDEX idx_knowledge_chunks_enabled ON public.knowledge_chunks USING btree (enabled);

CREATE INDEX idx_message_logs_created_at ON public.message_logs USING btree (created_at);

CREATE INDEX idx_message_logs_integration_config_id ON public.message_logs USING btree (integration_config_id);

CREATE INDEX idx_message_logs_profile_id ON public.message_logs USING btree (profile_id);

CREATE INDEX idx_message_logs_recipient_identifier ON public.message_logs USING btree (recipient_identifier);

CREATE INDEX idx_message_logs_status ON public.message_logs USING btree (status);

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_participant_id);

CREATE INDEX idx_plan_message_usage_subscription_cycle ON public.plan_message_usage USING btree (subscription_id, billing_cycle_year, billing_cycle_month);

CREATE INDEX idx_profile_integration_access_integration_id ON public.profile_integration_access USING btree (integration_id);

CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions USING btree (plan_id);

CREATE INDEX idx_subscriptions_profile_id ON public.subscriptions USING btree (profile_id);

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);

CREATE UNIQUE INDEX integrations_config_integration_id_key ON public.integrations_config USING btree (integration_id);

CREATE UNIQUE INDEX knowledge_chunks_pkey ON public.knowledge_chunks USING btree (id);

CREATE UNIQUE INDEX lead_pipeline_lead_id_pipeline_id_key ON public.lead_pipeline USING btree (lead_id, pipeline_id);

CREATE UNIQUE INDEX lead_pipeline_pkey ON public.lead_pipeline USING btree (id);

CREATE UNIQUE INDEX lead_tags_lead_id_tag_id_key ON public.lead_tags USING btree (lead_id, tag_id);

CREATE UNIQUE INDEX lead_tags_pkey ON public.lead_tags USING btree (id);

CREATE UNIQUE INDEX leads_pkey ON public.leads USING btree (id);

CREATE UNIQUE INDEX message_logs_pkey ON public.message_logs USING btree (id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (message_id);

CREATE UNIQUE INDEX messages_wamid_unique ON public.messages USING btree (wamid);

CREATE UNIQUE INDEX pipeline_stages_pkey ON public.pipeline_stages USING btree (id);

CREATE UNIQUE INDEX plan_message_usage_pkey ON public.plan_message_usage USING btree (id);

CREATE UNIQUE INDEX profile_integration_access_pkey ON public.profile_integration_access USING btree (id);

CREATE INDEX schema_embeddings_embedding_idx ON public.schema_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');

CREATE UNIQUE INDEX schema_embeddings_pkey ON public.schema_embeddings USING btree (id);

CREATE UNIQUE INDEX segment_contacts_pkey ON public.segment_contacts USING btree (segment_id, contact_id);

CREATE UNIQUE INDEX segments_pkey ON public.segments USING btree (id);

CREATE UNIQUE INDEX tags_name_key ON public.tags USING btree (name);

CREATE UNIQUE INDEX tags_pkey ON public.tags USING btree (id);

CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);

CREATE UNIQUE INDEX temp_profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX token_allocations_pkey ON public.token_allocations USING btree (id);

CREATE UNIQUE INDEX token_allocations_user_id_key ON public.token_allocations USING btree (user_id);

CREATE UNIQUE INDEX unique_integration_instance_owner_null_idx ON public.integrations_config USING btree (integration_id, instance_id) WHERE ((owner_id IS NULL) AND (instance_id IS NOT NULL));

CREATE UNIQUE INDEX unique_integration_owner_instance_not_null_idx ON public.integrations_config USING btree (integration_id, owner_id, instance_id) WHERE ((owner_id IS NOT NULL) AND (instance_id IS NOT NULL));

CREATE UNIQUE INDEX unique_profile_integration ON public.profile_integration_access USING btree (profile_id, integration_id);

CREATE UNIQUE INDEX uq_subscription_billing_cycle ON public.plan_message_usage USING btree (subscription_id, billing_cycle_year, billing_cycle_month);

CREATE INDEX vector_db_v1_embedding_idx ON public.vector_db_v1 USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');

CREATE UNIQUE INDEX vector_db_v1_pkey ON public.vector_db_v1 USING btree (id);

CREATE UNIQUE INDEX whatsapp_blast_limits_pkey ON public.whatsapp_blast_limits USING btree (id);

alter table "public"."agent_conversations" add constraint "agent_conversations_pkey" PRIMARY KEY using index "agent_conversations_pkey";

alter table "public"."appointments" add constraint "appointments_pkey" PRIMARY KEY using index "appointments_pkey";

alter table "public"."broadcast_recipients" add constraint "broadcast_recipients_pkey" PRIMARY KEY using index "broadcast_recipients_pkey";

alter table "public"."broadcasts" add constraint "broadcasts_pkey" PRIMARY KEY using index "broadcasts_pkey";

alter table "public"."conversation_participants" add constraint "conversation_participants_pkey" PRIMARY KEY using index "conversation_participants_pkey";

alter table "public"."conversation_summaries" add constraint "conversation_summaries_pkey" PRIMARY KEY using index "conversation_summaries_pkey";

alter table "public"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "public"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

alter table "public"."evolution_webhook_events" add constraint "evolution_webhook_events_pkey" PRIMARY KEY using index "evolution_webhook_events_pkey";

alter table "public"."knowledge_chunks" add constraint "knowledge_chunks_pkey" PRIMARY KEY using index "knowledge_chunks_pkey";

alter table "public"."lead_pipeline" add constraint "lead_pipeline_pkey" PRIMARY KEY using index "lead_pipeline_pkey";

alter table "public"."lead_tags" add constraint "lead_tags_pkey" PRIMARY KEY using index "lead_tags_pkey";

alter table "public"."leads" add constraint "leads_pkey" PRIMARY KEY using index "leads_pkey";

alter table "public"."message_logs" add constraint "message_logs_pkey" PRIMARY KEY using index "message_logs_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."pipeline_stages" add constraint "pipeline_stages_pkey" PRIMARY KEY using index "pipeline_stages_pkey";

alter table "public"."plan_message_usage" add constraint "plan_message_usage_pkey" PRIMARY KEY using index "plan_message_usage_pkey";

alter table "public"."profile_integration_access" add constraint "profile_integration_access_pkey" PRIMARY KEY using index "profile_integration_access_pkey";

alter table "public"."profiles" add constraint "temp_profiles_pkey" PRIMARY KEY using index "temp_profiles_pkey";

alter table "public"."schema_embeddings" add constraint "schema_embeddings_pkey" PRIMARY KEY using index "schema_embeddings_pkey";

alter table "public"."segment_contacts" add constraint "segment_contacts_pkey" PRIMARY KEY using index "segment_contacts_pkey";

alter table "public"."segments" add constraint "segments_pkey" PRIMARY KEY using index "segments_pkey";

alter table "public"."tags" add constraint "tags_pkey" PRIMARY KEY using index "tags_pkey";

alter table "public"."tasks" add constraint "tasks_pkey" PRIMARY KEY using index "tasks_pkey";

alter table "public"."token_allocations" add constraint "token_allocations_pkey" PRIMARY KEY using index "token_allocations_pkey";

alter table "public"."vector_db_v1" add constraint "vector_db_v1_pkey" PRIMARY KEY using index "vector_db_v1_pkey";

alter table "public"."whatsapp_blast_limits" add constraint "whatsapp_blast_limits_pkey" PRIMARY KEY using index "whatsapp_blast_limits_pkey";

alter table "public"."agent_conversations" add constraint "agent_conversations_knowledge_chunk_id_fkey" FOREIGN KEY (knowledge_chunk_id) REFERENCES knowledge_chunks(id) ON DELETE SET NULL not valid;

alter table "public"."agent_conversations" validate constraint "agent_conversations_knowledge_chunk_id_fkey";

alter table "public"."agent_conversations" add constraint "agent_conversations_knowledge_document_id_fkey" FOREIGN KEY (knowledge_document_id) REFERENCES knowledge_documents(id) ON DELETE SET NULL not valid;

alter table "public"."agent_conversations" validate constraint "agent_conversations_knowledge_document_id_fkey";

alter table "public"."agent_conversations" add constraint "agent_conversations_session_id_fkey" FOREIGN KEY (session_id) REFERENCES ai_agent_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."agent_conversations" validate constraint "agent_conversations_session_id_fkey";

alter table "public"."ai_agent_integrations" add constraint "ai_agent_integrations_activation_mode_check" CHECK ((activation_mode = ANY (ARRAY['keyword'::text, 'always_on'::text]))) not valid;

alter table "public"."ai_agent_integrations" validate constraint "ai_agent_integrations_activation_mode_check";

alter table "public"."ai_agent_integrations" add constraint "ai_agent_integrations_integrations_config_id_fkey" FOREIGN KEY (integrations_config_id) REFERENCES integrations_config(id) ON DELETE CASCADE not valid;

alter table "public"."ai_agent_integrations" validate constraint "ai_agent_integrations_integrations_config_id_fkey";

alter table "public"."ai_agent_sessions" add constraint "ai_agent_sessions_integrations_config_id_fkey" FOREIGN KEY (integrations_config_id) REFERENCES integrations_config(id) ON DELETE SET NULL not valid;

alter table "public"."ai_agent_sessions" validate constraint "ai_agent_sessions_integrations_config_id_fkey";

alter table "public"."broadcast_recipients" add constraint "broadcast_recipients_broadcast_id_fkey" FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE not valid;

alter table "public"."broadcast_recipients" validate constraint "broadcast_recipients_broadcast_id_fkey";

alter table "public"."broadcast_recipients" add constraint "broadcast_recipients_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL not valid;

alter table "public"."broadcast_recipients" validate constraint "broadcast_recipients_customer_id_fkey";

alter table "public"."broadcasts" add constraint "broadcasts_integration_config_id_fkey" FOREIGN KEY (integration_config_id) REFERENCES integrations_config(id) ON DELETE SET NULL not valid;

alter table "public"."broadcasts" validate constraint "broadcasts_integration_config_id_fkey";

alter table "public"."broadcasts" add constraint "broadcasts_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES integrations(id) not valid;

alter table "public"."broadcasts" validate constraint "broadcasts_integration_id_fkey";

alter table "public"."broadcasts" add constraint "fk_broadcasts_segment_id" FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE SET NULL not valid;

alter table "public"."broadcasts" validate constraint "fk_broadcasts_segment_id";

alter table "public"."conversation_participants" add constraint "conversation_participants_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) not valid;

alter table "public"."conversation_participants" validate constraint "conversation_participants_conversation_id_fkey";

alter table "public"."conversation_participants" add constraint "conversation_participants_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) not valid;

alter table "public"."conversation_participants" validate constraint "conversation_participants_customer_id_fkey";

alter table "public"."conversation_summaries" add constraint "conversation_summaries_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) not valid;

alter table "public"."conversation_summaries" validate constraint "conversation_summaries_conversation_id_fkey";

alter table "public"."conversation_summaries" add constraint "conversation_summaries_conversation_id_key" UNIQUE using index "conversation_summaries_conversation_id_key";

alter table "public"."conversations" add constraint "conversations_integrations_id_fkey" FOREIGN KEY (integrations_id) REFERENCES integrations(id) not valid;

alter table "public"."conversations" validate constraint "conversations_integrations_id_fkey";

alter table "public"."conversations" add constraint "conversations_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) not valid;

alter table "public"."conversations" validate constraint "conversations_lead_id_fkey";

alter table "public"."integrations_config" add constraint "integrations_config_integration_id_key" UNIQUE using index "integrations_config_integration_id_key";

alter table "public"."knowledge_chunks" add constraint "knowledge_chunks_document_id_fkey" FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE not valid;

alter table "public"."knowledge_chunks" validate constraint "knowledge_chunks_document_id_fkey";

alter table "public"."lead_pipeline" add constraint "lead_pipeline_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE not valid;

alter table "public"."lead_pipeline" validate constraint "lead_pipeline_lead_id_fkey";

alter table "public"."lead_pipeline" add constraint "lead_pipeline_lead_id_pipeline_id_key" UNIQUE using index "lead_pipeline_lead_id_pipeline_id_key";

alter table "public"."lead_pipeline" add constraint "lead_pipeline_pipeline_id_fkey" FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE not valid;

alter table "public"."lead_pipeline" validate constraint "lead_pipeline_pipeline_id_fkey";

alter table "public"."lead_pipeline" add constraint "lead_pipeline_stage_id_fkey" FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE CASCADE not valid;

alter table "public"."lead_pipeline" validate constraint "lead_pipeline_stage_id_fkey";

alter table "public"."lead_tags" add constraint "lead_tags_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE not valid;

alter table "public"."lead_tags" validate constraint "lead_tags_lead_id_fkey";

alter table "public"."lead_tags" add constraint "lead_tags_lead_id_tag_id_key" UNIQUE using index "lead_tags_lead_id_tag_id_key";

alter table "public"."lead_tags" add constraint "lead_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE not valid;

alter table "public"."lead_tags" validate constraint "lead_tags_tag_id_fkey";

alter table "public"."leads" add constraint "leads_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) not valid;

alter table "public"."leads" validate constraint "leads_customer_id_fkey";

alter table "public"."leads" add constraint "leads_pipeline_stage_id_fkey" FOREIGN KEY (pipeline_stage_id) REFERENCES pipeline_stages(id) not valid;

alter table "public"."leads" validate constraint "leads_pipeline_stage_id_fkey";

alter table "public"."leads" add constraint "leads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."leads" validate constraint "leads_user_id_fkey";

alter table "public"."message_logs" add constraint "message_logs_direction_check" CHECK ((direction = 'outgoing'::text)) not valid;

alter table "public"."message_logs" validate constraint "message_logs_direction_check";

alter table "public"."message_logs" add constraint "message_logs_integration_config_id_fkey" FOREIGN KEY (integration_config_id) REFERENCES integrations_config(id) ON DELETE CASCADE not valid;

alter table "public"."message_logs" validate constraint "message_logs_integration_config_id_fkey";

alter table "public"."message_logs" add constraint "message_logs_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."message_logs" validate constraint "message_logs_profile_id_fkey";

alter table "public"."messages" add constraint "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) not valid;

alter table "public"."messages" validate constraint "messages_conversation_id_fkey";

alter table "public"."messages" add constraint "messages_sender_participant_id_fkey" FOREIGN KEY (sender_participant_id) REFERENCES conversation_participants(id) not valid;

alter table "public"."messages" validate constraint "messages_sender_participant_id_fkey";

alter table "public"."messages" add constraint "messages_wamid_unique" UNIQUE using index "messages_wamid_unique";

alter table "public"."pipeline_stages" add constraint "pipeline_stages_pipeline_id_fkey" FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE not valid;

alter table "public"."pipeline_stages" validate constraint "pipeline_stages_pipeline_id_fkey";

alter table "public"."plan_message_usage" add constraint "plan_message_usage_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE not valid;

alter table "public"."plan_message_usage" validate constraint "plan_message_usage_subscription_id_fkey";

alter table "public"."plan_message_usage" add constraint "uq_subscription_billing_cycle" UNIQUE using index "uq_subscription_billing_cycle";

alter table "public"."profile_integration_access" add constraint "profile_integration_access_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) not valid;

alter table "public"."profile_integration_access" validate constraint "profile_integration_access_created_by_fkey";

alter table "public"."profile_integration_access" add constraint "profile_integration_access_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE not valid;

alter table "public"."profile_integration_access" validate constraint "profile_integration_access_integration_id_fkey";

alter table "public"."profile_integration_access" add constraint "profile_integration_access_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."profile_integration_access" validate constraint "profile_integration_access_profile_id_fkey";

alter table "public"."profile_integration_access" add constraint "unique_profile_integration" UNIQUE using index "unique_profile_integration";

alter table "public"."profiles" add constraint "temp_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "temp_profiles_id_fkey";

alter table "public"."segment_contacts" add constraint "segment_contacts_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES customers(id) ON DELETE CASCADE not valid;

alter table "public"."segment_contacts" validate constraint "segment_contacts_contact_id_fkey";

alter table "public"."segment_contacts" add constraint "segment_contacts_segment_id_fkey" FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE not valid;

alter table "public"."segment_contacts" validate constraint "segment_contacts_segment_id_fkey";

alter table "public"."segments" add constraint "segments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."segments" validate constraint "segments_user_id_fkey";

alter table "public"."tags" add constraint "tags_name_key" UNIQUE using index "tags_name_key";

alter table "public"."tasks" add constraint "tasks_assignee_id_fkey" FOREIGN KEY (assignee_id) REFERENCES profiles(id) not valid;

alter table "public"."tasks" validate constraint "tasks_assignee_id_fkey";

alter table "public"."tasks" add constraint "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) not valid;

alter table "public"."tasks" validate constraint "tasks_created_by_fkey";

alter table "public"."token_allocations" add constraint "token_allocations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) not valid;

alter table "public"."token_allocations" validate constraint "token_allocations_user_id_fkey";

alter table "public"."token_allocations" add constraint "token_allocations_user_id_key" UNIQUE using index "token_allocations_user_id_key";

alter table "public"."whatsapp_blast_limits" add constraint "whatsapp_blast_limits_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES integrations(id) not valid;

alter table "public"."whatsapp_blast_limits" validate constraint "whatsapp_blast_limits_integration_id_fkey";

alter table "public"."ai_agent_sessions" add constraint "ai_agent_sessions_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE not valid;

alter table "public"."ai_agent_sessions" validate constraint "ai_agent_sessions_agent_id_fkey";

alter table "public"."integrations_config" add constraint "integrations_config_integration_id_fkey" FOREIGN KEY (integration_id) REFERENCES integrations(id) not valid;

alter table "public"."integrations_config" validate constraint "integrations_config_integration_id_fkey";

alter table "public"."knowledge_documents" add constraint "knowledge_documents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."knowledge_documents" validate constraint "knowledge_documents_user_id_fkey";

alter table "public"."plans" add constraint "plans_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."plans" validate constraint "plans_owner_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_profile_id_fkey";

set check_function_bodies = off;

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

grant delete on table "public"."agent_conversations" to "anon";

grant insert on table "public"."agent_conversations" to "anon";

grant references on table "public"."agent_conversations" to "anon";

grant select on table "public"."agent_conversations" to "anon";

grant trigger on table "public"."agent_conversations" to "anon";

grant truncate on table "public"."agent_conversations" to "anon";

grant update on table "public"."agent_conversations" to "anon";

grant delete on table "public"."agent_conversations" to "authenticated";

grant insert on table "public"."agent_conversations" to "authenticated";

grant references on table "public"."agent_conversations" to "authenticated";

grant select on table "public"."agent_conversations" to "authenticated";

grant trigger on table "public"."agent_conversations" to "authenticated";

grant truncate on table "public"."agent_conversations" to "authenticated";

grant update on table "public"."agent_conversations" to "authenticated";

grant delete on table "public"."agent_conversations" to "service_role";

grant insert on table "public"."agent_conversations" to "service_role";

grant references on table "public"."agent_conversations" to "service_role";

grant select on table "public"."agent_conversations" to "service_role";

grant trigger on table "public"."agent_conversations" to "service_role";

grant truncate on table "public"."agent_conversations" to "service_role";

grant update on table "public"."agent_conversations" to "service_role";

grant delete on table "public"."appointments" to "anon";

grant insert on table "public"."appointments" to "anon";

grant references on table "public"."appointments" to "anon";

grant select on table "public"."appointments" to "anon";

grant trigger on table "public"."appointments" to "anon";

grant truncate on table "public"."appointments" to "anon";

grant update on table "public"."appointments" to "anon";

grant delete on table "public"."appointments" to "authenticated";

grant insert on table "public"."appointments" to "authenticated";

grant references on table "public"."appointments" to "authenticated";

grant select on table "public"."appointments" to "authenticated";

grant trigger on table "public"."appointments" to "authenticated";

grant truncate on table "public"."appointments" to "authenticated";

grant update on table "public"."appointments" to "authenticated";

grant delete on table "public"."appointments" to "service_role";

grant insert on table "public"."appointments" to "service_role";

grant references on table "public"."appointments" to "service_role";

grant select on table "public"."appointments" to "service_role";

grant trigger on table "public"."appointments" to "service_role";

grant truncate on table "public"."appointments" to "service_role";

grant update on table "public"."appointments" to "service_role";

grant delete on table "public"."broadcast_recipients" to "anon";

grant insert on table "public"."broadcast_recipients" to "anon";

grant references on table "public"."broadcast_recipients" to "anon";

grant select on table "public"."broadcast_recipients" to "anon";

grant trigger on table "public"."broadcast_recipients" to "anon";

grant truncate on table "public"."broadcast_recipients" to "anon";

grant update on table "public"."broadcast_recipients" to "anon";

grant delete on table "public"."broadcast_recipients" to "authenticated";

grant insert on table "public"."broadcast_recipients" to "authenticated";

grant references on table "public"."broadcast_recipients" to "authenticated";

grant select on table "public"."broadcast_recipients" to "authenticated";

grant trigger on table "public"."broadcast_recipients" to "authenticated";

grant truncate on table "public"."broadcast_recipients" to "authenticated";

grant update on table "public"."broadcast_recipients" to "authenticated";

grant delete on table "public"."broadcast_recipients" to "service_role";

grant insert on table "public"."broadcast_recipients" to "service_role";

grant references on table "public"."broadcast_recipients" to "service_role";

grant select on table "public"."broadcast_recipients" to "service_role";

grant trigger on table "public"."broadcast_recipients" to "service_role";

grant truncate on table "public"."broadcast_recipients" to "service_role";

grant update on table "public"."broadcast_recipients" to "service_role";

grant delete on table "public"."broadcasts" to "anon";

grant insert on table "public"."broadcasts" to "anon";

grant references on table "public"."broadcasts" to "anon";

grant select on table "public"."broadcasts" to "anon";

grant trigger on table "public"."broadcasts" to "anon";

grant truncate on table "public"."broadcasts" to "anon";

grant update on table "public"."broadcasts" to "anon";

grant delete on table "public"."broadcasts" to "authenticated";

grant insert on table "public"."broadcasts" to "authenticated";

grant references on table "public"."broadcasts" to "authenticated";

grant select on table "public"."broadcasts" to "authenticated";

grant trigger on table "public"."broadcasts" to "authenticated";

grant truncate on table "public"."broadcasts" to "authenticated";

grant update on table "public"."broadcasts" to "authenticated";

grant delete on table "public"."broadcasts" to "service_role";

grant insert on table "public"."broadcasts" to "service_role";

grant references on table "public"."broadcasts" to "service_role";

grant select on table "public"."broadcasts" to "service_role";

grant trigger on table "public"."broadcasts" to "service_role";

grant truncate on table "public"."broadcasts" to "service_role";

grant update on table "public"."broadcasts" to "service_role";

grant delete on table "public"."conversation_participants" to "anon";

grant insert on table "public"."conversation_participants" to "anon";

grant references on table "public"."conversation_participants" to "anon";

grant select on table "public"."conversation_participants" to "anon";

grant trigger on table "public"."conversation_participants" to "anon";

grant truncate on table "public"."conversation_participants" to "anon";

grant update on table "public"."conversation_participants" to "anon";

grant delete on table "public"."conversation_participants" to "authenticated";

grant insert on table "public"."conversation_participants" to "authenticated";

grant references on table "public"."conversation_participants" to "authenticated";

grant select on table "public"."conversation_participants" to "authenticated";

grant trigger on table "public"."conversation_participants" to "authenticated";

grant truncate on table "public"."conversation_participants" to "authenticated";

grant update on table "public"."conversation_participants" to "authenticated";

grant delete on table "public"."conversation_participants" to "service_role";

grant insert on table "public"."conversation_participants" to "service_role";

grant references on table "public"."conversation_participants" to "service_role";

grant select on table "public"."conversation_participants" to "service_role";

grant trigger on table "public"."conversation_participants" to "service_role";

grant truncate on table "public"."conversation_participants" to "service_role";

grant update on table "public"."conversation_participants" to "service_role";

grant delete on table "public"."conversation_summaries" to "anon";

grant insert on table "public"."conversation_summaries" to "anon";

grant references on table "public"."conversation_summaries" to "anon";

grant select on table "public"."conversation_summaries" to "anon";

grant trigger on table "public"."conversation_summaries" to "anon";

grant truncate on table "public"."conversation_summaries" to "anon";

grant update on table "public"."conversation_summaries" to "anon";

grant delete on table "public"."conversation_summaries" to "authenticated";

grant insert on table "public"."conversation_summaries" to "authenticated";

grant references on table "public"."conversation_summaries" to "authenticated";

grant select on table "public"."conversation_summaries" to "authenticated";

grant trigger on table "public"."conversation_summaries" to "authenticated";

grant truncate on table "public"."conversation_summaries" to "authenticated";

grant update on table "public"."conversation_summaries" to "authenticated";

grant delete on table "public"."conversation_summaries" to "service_role";

grant insert on table "public"."conversation_summaries" to "service_role";

grant references on table "public"."conversation_summaries" to "service_role";

grant select on table "public"."conversation_summaries" to "service_role";

grant trigger on table "public"."conversation_summaries" to "service_role";

grant truncate on table "public"."conversation_summaries" to "service_role";

grant update on table "public"."conversation_summaries" to "service_role";

grant delete on table "public"."customers" to "anon";

grant insert on table "public"."customers" to "anon";

grant references on table "public"."customers" to "anon";

grant select on table "public"."customers" to "anon";

grant trigger on table "public"."customers" to "anon";

grant truncate on table "public"."customers" to "anon";

grant update on table "public"."customers" to "anon";

grant delete on table "public"."customers" to "authenticated";

grant insert on table "public"."customers" to "authenticated";

grant references on table "public"."customers" to "authenticated";

grant select on table "public"."customers" to "authenticated";

grant trigger on table "public"."customers" to "authenticated";

grant truncate on table "public"."customers" to "authenticated";

grant update on table "public"."customers" to "authenticated";

grant delete on table "public"."customers" to "service_role";

grant insert on table "public"."customers" to "service_role";

grant references on table "public"."customers" to "service_role";

grant select on table "public"."customers" to "service_role";

grant trigger on table "public"."customers" to "service_role";

grant truncate on table "public"."customers" to "service_role";

grant update on table "public"."customers" to "service_role";

grant delete on table "public"."documents" to "anon";

grant insert on table "public"."documents" to "anon";

grant references on table "public"."documents" to "anon";

grant select on table "public"."documents" to "anon";

grant trigger on table "public"."documents" to "anon";

grant truncate on table "public"."documents" to "anon";

grant update on table "public"."documents" to "anon";

grant delete on table "public"."documents" to "authenticated";

grant insert on table "public"."documents" to "authenticated";

grant references on table "public"."documents" to "authenticated";

grant select on table "public"."documents" to "authenticated";

grant trigger on table "public"."documents" to "authenticated";

grant truncate on table "public"."documents" to "authenticated";

grant update on table "public"."documents" to "authenticated";

grant delete on table "public"."documents" to "service_role";

grant insert on table "public"."documents" to "service_role";

grant references on table "public"."documents" to "service_role";

grant select on table "public"."documents" to "service_role";

grant trigger on table "public"."documents" to "service_role";

grant truncate on table "public"."documents" to "service_role";

grant update on table "public"."documents" to "service_role";

grant delete on table "public"."evolution_webhook_events" to "anon";

grant insert on table "public"."evolution_webhook_events" to "anon";

grant references on table "public"."evolution_webhook_events" to "anon";

grant select on table "public"."evolution_webhook_events" to "anon";

grant trigger on table "public"."evolution_webhook_events" to "anon";

grant truncate on table "public"."evolution_webhook_events" to "anon";

grant update on table "public"."evolution_webhook_events" to "anon";

grant delete on table "public"."evolution_webhook_events" to "authenticated";

grant insert on table "public"."evolution_webhook_events" to "authenticated";

grant references on table "public"."evolution_webhook_events" to "authenticated";

grant select on table "public"."evolution_webhook_events" to "authenticated";

grant trigger on table "public"."evolution_webhook_events" to "authenticated";

grant truncate on table "public"."evolution_webhook_events" to "authenticated";

grant update on table "public"."evolution_webhook_events" to "authenticated";

grant delete on table "public"."evolution_webhook_events" to "service_role";

grant insert on table "public"."evolution_webhook_events" to "service_role";

grant references on table "public"."evolution_webhook_events" to "service_role";

grant select on table "public"."evolution_webhook_events" to "service_role";

grant trigger on table "public"."evolution_webhook_events" to "service_role";

grant truncate on table "public"."evolution_webhook_events" to "service_role";

grant update on table "public"."evolution_webhook_events" to "service_role";

grant delete on table "public"."knowledge_chunks" to "anon";

grant insert on table "public"."knowledge_chunks" to "anon";

grant references on table "public"."knowledge_chunks" to "anon";

grant select on table "public"."knowledge_chunks" to "anon";

grant trigger on table "public"."knowledge_chunks" to "anon";

grant truncate on table "public"."knowledge_chunks" to "anon";

grant update on table "public"."knowledge_chunks" to "anon";

grant delete on table "public"."knowledge_chunks" to "authenticated";

grant insert on table "public"."knowledge_chunks" to "authenticated";

grant references on table "public"."knowledge_chunks" to "authenticated";

grant select on table "public"."knowledge_chunks" to "authenticated";

grant trigger on table "public"."knowledge_chunks" to "authenticated";

grant truncate on table "public"."knowledge_chunks" to "authenticated";

grant update on table "public"."knowledge_chunks" to "authenticated";

grant delete on table "public"."knowledge_chunks" to "service_role";

grant insert on table "public"."knowledge_chunks" to "service_role";

grant references on table "public"."knowledge_chunks" to "service_role";

grant select on table "public"."knowledge_chunks" to "service_role";

grant trigger on table "public"."knowledge_chunks" to "service_role";

grant truncate on table "public"."knowledge_chunks" to "service_role";

grant update on table "public"."knowledge_chunks" to "service_role";

grant delete on table "public"."lead_pipeline" to "anon";

grant insert on table "public"."lead_pipeline" to "anon";

grant references on table "public"."lead_pipeline" to "anon";

grant select on table "public"."lead_pipeline" to "anon";

grant trigger on table "public"."lead_pipeline" to "anon";

grant truncate on table "public"."lead_pipeline" to "anon";

grant update on table "public"."lead_pipeline" to "anon";

grant delete on table "public"."lead_pipeline" to "authenticated";

grant insert on table "public"."lead_pipeline" to "authenticated";

grant references on table "public"."lead_pipeline" to "authenticated";

grant select on table "public"."lead_pipeline" to "authenticated";

grant trigger on table "public"."lead_pipeline" to "authenticated";

grant truncate on table "public"."lead_pipeline" to "authenticated";

grant update on table "public"."lead_pipeline" to "authenticated";

grant delete on table "public"."lead_pipeline" to "service_role";

grant insert on table "public"."lead_pipeline" to "service_role";

grant references on table "public"."lead_pipeline" to "service_role";

grant select on table "public"."lead_pipeline" to "service_role";

grant trigger on table "public"."lead_pipeline" to "service_role";

grant truncate on table "public"."lead_pipeline" to "service_role";

grant update on table "public"."lead_pipeline" to "service_role";

grant delete on table "public"."lead_tags" to "anon";

grant insert on table "public"."lead_tags" to "anon";

grant references on table "public"."lead_tags" to "anon";

grant select on table "public"."lead_tags" to "anon";

grant trigger on table "public"."lead_tags" to "anon";

grant truncate on table "public"."lead_tags" to "anon";

grant update on table "public"."lead_tags" to "anon";

grant delete on table "public"."lead_tags" to "authenticated";

grant insert on table "public"."lead_tags" to "authenticated";

grant references on table "public"."lead_tags" to "authenticated";

grant select on table "public"."lead_tags" to "authenticated";

grant trigger on table "public"."lead_tags" to "authenticated";

grant truncate on table "public"."lead_tags" to "authenticated";

grant update on table "public"."lead_tags" to "authenticated";

grant delete on table "public"."lead_tags" to "service_role";

grant insert on table "public"."lead_tags" to "service_role";

grant references on table "public"."lead_tags" to "service_role";

grant select on table "public"."lead_tags" to "service_role";

grant trigger on table "public"."lead_tags" to "service_role";

grant truncate on table "public"."lead_tags" to "service_role";

grant update on table "public"."lead_tags" to "service_role";

grant delete on table "public"."leads" to "anon";

grant insert on table "public"."leads" to "anon";

grant references on table "public"."leads" to "anon";

grant select on table "public"."leads" to "anon";

grant trigger on table "public"."leads" to "anon";

grant truncate on table "public"."leads" to "anon";

grant update on table "public"."leads" to "anon";

grant delete on table "public"."leads" to "authenticated";

grant insert on table "public"."leads" to "authenticated";

grant references on table "public"."leads" to "authenticated";

grant select on table "public"."leads" to "authenticated";

grant trigger on table "public"."leads" to "authenticated";

grant truncate on table "public"."leads" to "authenticated";

grant update on table "public"."leads" to "authenticated";

grant delete on table "public"."leads" to "service_role";

grant insert on table "public"."leads" to "service_role";

grant references on table "public"."leads" to "service_role";

grant select on table "public"."leads" to "service_role";

grant trigger on table "public"."leads" to "service_role";

grant truncate on table "public"."leads" to "service_role";

grant update on table "public"."leads" to "service_role";

grant delete on table "public"."message_logs" to "anon";

grant insert on table "public"."message_logs" to "anon";

grant references on table "public"."message_logs" to "anon";

grant select on table "public"."message_logs" to "anon";

grant trigger on table "public"."message_logs" to "anon";

grant truncate on table "public"."message_logs" to "anon";

grant update on table "public"."message_logs" to "anon";

grant delete on table "public"."message_logs" to "authenticated";

grant insert on table "public"."message_logs" to "authenticated";

grant references on table "public"."message_logs" to "authenticated";

grant select on table "public"."message_logs" to "authenticated";

grant trigger on table "public"."message_logs" to "authenticated";

grant truncate on table "public"."message_logs" to "authenticated";

grant update on table "public"."message_logs" to "authenticated";

grant delete on table "public"."message_logs" to "service_role";

grant insert on table "public"."message_logs" to "service_role";

grant references on table "public"."message_logs" to "service_role";

grant select on table "public"."message_logs" to "service_role";

grant trigger on table "public"."message_logs" to "service_role";

grant truncate on table "public"."message_logs" to "service_role";

grant update on table "public"."message_logs" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."pipeline_stages" to "anon";

grant insert on table "public"."pipeline_stages" to "anon";

grant references on table "public"."pipeline_stages" to "anon";

grant select on table "public"."pipeline_stages" to "anon";

grant trigger on table "public"."pipeline_stages" to "anon";

grant truncate on table "public"."pipeline_stages" to "anon";

grant update on table "public"."pipeline_stages" to "anon";

grant delete on table "public"."pipeline_stages" to "authenticated";

grant insert on table "public"."pipeline_stages" to "authenticated";

grant references on table "public"."pipeline_stages" to "authenticated";

grant select on table "public"."pipeline_stages" to "authenticated";

grant trigger on table "public"."pipeline_stages" to "authenticated";

grant truncate on table "public"."pipeline_stages" to "authenticated";

grant update on table "public"."pipeline_stages" to "authenticated";

grant delete on table "public"."pipeline_stages" to "service_role";

grant insert on table "public"."pipeline_stages" to "service_role";

grant references on table "public"."pipeline_stages" to "service_role";

grant select on table "public"."pipeline_stages" to "service_role";

grant trigger on table "public"."pipeline_stages" to "service_role";

grant truncate on table "public"."pipeline_stages" to "service_role";

grant update on table "public"."pipeline_stages" to "service_role";

grant delete on table "public"."plan_message_usage" to "anon";

grant insert on table "public"."plan_message_usage" to "anon";

grant references on table "public"."plan_message_usage" to "anon";

grant select on table "public"."plan_message_usage" to "anon";

grant trigger on table "public"."plan_message_usage" to "anon";

grant truncate on table "public"."plan_message_usage" to "anon";

grant update on table "public"."plan_message_usage" to "anon";

grant delete on table "public"."plan_message_usage" to "authenticated";

grant insert on table "public"."plan_message_usage" to "authenticated";

grant references on table "public"."plan_message_usage" to "authenticated";

grant select on table "public"."plan_message_usage" to "authenticated";

grant trigger on table "public"."plan_message_usage" to "authenticated";

grant truncate on table "public"."plan_message_usage" to "authenticated";

grant update on table "public"."plan_message_usage" to "authenticated";

grant delete on table "public"."plan_message_usage" to "service_role";

grant insert on table "public"."plan_message_usage" to "service_role";

grant references on table "public"."plan_message_usage" to "service_role";

grant select on table "public"."plan_message_usage" to "service_role";

grant trigger on table "public"."plan_message_usage" to "service_role";

grant truncate on table "public"."plan_message_usage" to "service_role";

grant update on table "public"."plan_message_usage" to "service_role";

grant delete on table "public"."profile_integration_access" to "anon";

grant insert on table "public"."profile_integration_access" to "anon";

grant references on table "public"."profile_integration_access" to "anon";

grant select on table "public"."profile_integration_access" to "anon";

grant trigger on table "public"."profile_integration_access" to "anon";

grant truncate on table "public"."profile_integration_access" to "anon";

grant update on table "public"."profile_integration_access" to "anon";

grant delete on table "public"."profile_integration_access" to "authenticated";

grant insert on table "public"."profile_integration_access" to "authenticated";

grant references on table "public"."profile_integration_access" to "authenticated";

grant select on table "public"."profile_integration_access" to "authenticated";

grant trigger on table "public"."profile_integration_access" to "authenticated";

grant truncate on table "public"."profile_integration_access" to "authenticated";

grant update on table "public"."profile_integration_access" to "authenticated";

grant delete on table "public"."profile_integration_access" to "service_role";

grant insert on table "public"."profile_integration_access" to "service_role";

grant references on table "public"."profile_integration_access" to "service_role";

grant select on table "public"."profile_integration_access" to "service_role";

grant trigger on table "public"."profile_integration_access" to "service_role";

grant truncate on table "public"."profile_integration_access" to "service_role";

grant update on table "public"."profile_integration_access" to "service_role";

grant delete on table "public"."schema_embeddings" to "anon";

grant insert on table "public"."schema_embeddings" to "anon";

grant references on table "public"."schema_embeddings" to "anon";

grant select on table "public"."schema_embeddings" to "anon";

grant trigger on table "public"."schema_embeddings" to "anon";

grant truncate on table "public"."schema_embeddings" to "anon";

grant update on table "public"."schema_embeddings" to "anon";

grant delete on table "public"."schema_embeddings" to "authenticated";

grant insert on table "public"."schema_embeddings" to "authenticated";

grant references on table "public"."schema_embeddings" to "authenticated";

grant select on table "public"."schema_embeddings" to "authenticated";

grant trigger on table "public"."schema_embeddings" to "authenticated";

grant truncate on table "public"."schema_embeddings" to "authenticated";

grant update on table "public"."schema_embeddings" to "authenticated";

grant delete on table "public"."schema_embeddings" to "service_role";

grant insert on table "public"."schema_embeddings" to "service_role";

grant references on table "public"."schema_embeddings" to "service_role";

grant select on table "public"."schema_embeddings" to "service_role";

grant trigger on table "public"."schema_embeddings" to "service_role";

grant truncate on table "public"."schema_embeddings" to "service_role";

grant update on table "public"."schema_embeddings" to "service_role";

grant delete on table "public"."segment_contacts" to "anon";

grant insert on table "public"."segment_contacts" to "anon";

grant references on table "public"."segment_contacts" to "anon";

grant select on table "public"."segment_contacts" to "anon";

grant trigger on table "public"."segment_contacts" to "anon";

grant truncate on table "public"."segment_contacts" to "anon";

grant update on table "public"."segment_contacts" to "anon";

grant delete on table "public"."segment_contacts" to "authenticated";

grant insert on table "public"."segment_contacts" to "authenticated";

grant references on table "public"."segment_contacts" to "authenticated";

grant select on table "public"."segment_contacts" to "authenticated";

grant trigger on table "public"."segment_contacts" to "authenticated";

grant truncate on table "public"."segment_contacts" to "authenticated";

grant update on table "public"."segment_contacts" to "authenticated";

grant delete on table "public"."segment_contacts" to "service_role";

grant insert on table "public"."segment_contacts" to "service_role";

grant references on table "public"."segment_contacts" to "service_role";

grant select on table "public"."segment_contacts" to "service_role";

grant trigger on table "public"."segment_contacts" to "service_role";

grant truncate on table "public"."segment_contacts" to "service_role";

grant update on table "public"."segment_contacts" to "service_role";

grant delete on table "public"."segments" to "anon";

grant insert on table "public"."segments" to "anon";

grant references on table "public"."segments" to "anon";

grant select on table "public"."segments" to "anon";

grant trigger on table "public"."segments" to "anon";

grant truncate on table "public"."segments" to "anon";

grant update on table "public"."segments" to "anon";

grant delete on table "public"."segments" to "authenticated";

grant insert on table "public"."segments" to "authenticated";

grant references on table "public"."segments" to "authenticated";

grant select on table "public"."segments" to "authenticated";

grant trigger on table "public"."segments" to "authenticated";

grant truncate on table "public"."segments" to "authenticated";

grant update on table "public"."segments" to "authenticated";

grant delete on table "public"."segments" to "service_role";

grant insert on table "public"."segments" to "service_role";

grant references on table "public"."segments" to "service_role";

grant select on table "public"."segments" to "service_role";

grant trigger on table "public"."segments" to "service_role";

grant truncate on table "public"."segments" to "service_role";

grant update on table "public"."segments" to "service_role";

grant delete on table "public"."tags" to "anon";

grant insert on table "public"."tags" to "anon";

grant references on table "public"."tags" to "anon";

grant select on table "public"."tags" to "anon";

grant trigger on table "public"."tags" to "anon";

grant truncate on table "public"."tags" to "anon";

grant update on table "public"."tags" to "anon";

grant delete on table "public"."tags" to "authenticated";

grant insert on table "public"."tags" to "authenticated";

grant references on table "public"."tags" to "authenticated";

grant select on table "public"."tags" to "authenticated";

grant trigger on table "public"."tags" to "authenticated";

grant truncate on table "public"."tags" to "authenticated";

grant update on table "public"."tags" to "authenticated";

grant delete on table "public"."tags" to "service_role";

grant insert on table "public"."tags" to "service_role";

grant references on table "public"."tags" to "service_role";

grant select on table "public"."tags" to "service_role";

grant trigger on table "public"."tags" to "service_role";

grant truncate on table "public"."tags" to "service_role";

grant update on table "public"."tags" to "service_role";

grant delete on table "public"."tasks" to "anon";

grant insert on table "public"."tasks" to "anon";

grant references on table "public"."tasks" to "anon";

grant select on table "public"."tasks" to "anon";

grant trigger on table "public"."tasks" to "anon";

grant truncate on table "public"."tasks" to "anon";

grant update on table "public"."tasks" to "anon";

grant delete on table "public"."tasks" to "authenticated";

grant insert on table "public"."tasks" to "authenticated";

grant references on table "public"."tasks" to "authenticated";

grant select on table "public"."tasks" to "authenticated";

grant trigger on table "public"."tasks" to "authenticated";

grant truncate on table "public"."tasks" to "authenticated";

grant update on table "public"."tasks" to "authenticated";

grant delete on table "public"."tasks" to "service_role";

grant insert on table "public"."tasks" to "service_role";

grant references on table "public"."tasks" to "service_role";

grant select on table "public"."tasks" to "service_role";

grant trigger on table "public"."tasks" to "service_role";

grant truncate on table "public"."tasks" to "service_role";

grant update on table "public"."tasks" to "service_role";

grant delete on table "public"."token_allocations" to "anon";

grant insert on table "public"."token_allocations" to "anon";

grant references on table "public"."token_allocations" to "anon";

grant select on table "public"."token_allocations" to "anon";

grant trigger on table "public"."token_allocations" to "anon";

grant truncate on table "public"."token_allocations" to "anon";

grant update on table "public"."token_allocations" to "anon";

grant delete on table "public"."token_allocations" to "authenticated";

grant insert on table "public"."token_allocations" to "authenticated";

grant references on table "public"."token_allocations" to "authenticated";

grant select on table "public"."token_allocations" to "authenticated";

grant trigger on table "public"."token_allocations" to "authenticated";

grant truncate on table "public"."token_allocations" to "authenticated";

grant update on table "public"."token_allocations" to "authenticated";

grant delete on table "public"."token_allocations" to "service_role";

grant insert on table "public"."token_allocations" to "service_role";

grant references on table "public"."token_allocations" to "service_role";

grant select on table "public"."token_allocations" to "service_role";

grant trigger on table "public"."token_allocations" to "service_role";

grant truncate on table "public"."token_allocations" to "service_role";

grant update on table "public"."token_allocations" to "service_role";

grant delete on table "public"."vector_db_v1" to "anon";

grant insert on table "public"."vector_db_v1" to "anon";

grant references on table "public"."vector_db_v1" to "anon";

grant select on table "public"."vector_db_v1" to "anon";

grant trigger on table "public"."vector_db_v1" to "anon";

grant truncate on table "public"."vector_db_v1" to "anon";

grant update on table "public"."vector_db_v1" to "anon";

grant delete on table "public"."vector_db_v1" to "authenticated";

grant insert on table "public"."vector_db_v1" to "authenticated";

grant references on table "public"."vector_db_v1" to "authenticated";

grant select on table "public"."vector_db_v1" to "authenticated";

grant trigger on table "public"."vector_db_v1" to "authenticated";

grant truncate on table "public"."vector_db_v1" to "authenticated";

grant update on table "public"."vector_db_v1" to "authenticated";

grant delete on table "public"."vector_db_v1" to "service_role";

grant insert on table "public"."vector_db_v1" to "service_role";

grant references on table "public"."vector_db_v1" to "service_role";

grant select on table "public"."vector_db_v1" to "service_role";

grant trigger on table "public"."vector_db_v1" to "service_role";

grant truncate on table "public"."vector_db_v1" to "service_role";

grant update on table "public"."vector_db_v1" to "service_role";

grant delete on table "public"."whatsapp_blast_limits" to "anon";

grant insert on table "public"."whatsapp_blast_limits" to "anon";

grant references on table "public"."whatsapp_blast_limits" to "anon";

grant select on table "public"."whatsapp_blast_limits" to "anon";

grant trigger on table "public"."whatsapp_blast_limits" to "anon";

grant truncate on table "public"."whatsapp_blast_limits" to "anon";

grant update on table "public"."whatsapp_blast_limits" to "anon";

grant delete on table "public"."whatsapp_blast_limits" to "authenticated";

grant insert on table "public"."whatsapp_blast_limits" to "authenticated";

grant references on table "public"."whatsapp_blast_limits" to "authenticated";

grant select on table "public"."whatsapp_blast_limits" to "authenticated";

grant trigger on table "public"."whatsapp_blast_limits" to "authenticated";

grant truncate on table "public"."whatsapp_blast_limits" to "authenticated";

grant update on table "public"."whatsapp_blast_limits" to "authenticated";

grant delete on table "public"."whatsapp_blast_limits" to "service_role";

grant insert on table "public"."whatsapp_blast_limits" to "service_role";

grant references on table "public"."whatsapp_blast_limits" to "service_role";

grant select on table "public"."whatsapp_blast_limits" to "service_role";

grant trigger on table "public"."whatsapp_blast_limits" to "service_role";

grant truncate on table "public"."whatsapp_blast_limits" to "service_role";

grant update on table "public"."whatsapp_blast_limits" to "service_role";

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


create policy "Allow authenticated users to read their broadcast recipients"
on "public"."broadcast_recipients"
as permissive
for select
to public
using (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM broadcasts b
  WHERE (b.id = broadcast_recipients.broadcast_id)))));


create policy "Allow service_role to manage broadcast recipients"
on "public"."broadcast_recipients"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


create policy "Allow authenticated users to read broadcasts"
on "public"."broadcasts"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Allow service_role to manage broadcasts"
on "public"."broadcasts"
as permissive
for all
to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));


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


create policy "Allow authenticated users to delete chunks"
on "public"."knowledge_chunks"
as permissive
for delete
to authenticated
using (true);


create policy "Allow authenticated users to insert chunks"
on "public"."knowledge_chunks"
as permissive
for insert
to authenticated
with check (true);


create policy "Allow authenticated users to update chunks"
on "public"."knowledge_chunks"
as permissive
for update
to authenticated
using (true);


create policy "Allow authenticated users to view chunks"
on "public"."knowledge_chunks"
as permissive
for select
to authenticated
using (true);


create policy "Users can delete chunks of their documents"
on "public"."knowledge_chunks"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM knowledge_documents
  WHERE ((knowledge_documents.id = knowledge_chunks.document_id) AND (knowledge_documents.user_id = auth.uid())))));


create policy "Users can insert chunks for their documents"
on "public"."knowledge_chunks"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM knowledge_documents
  WHERE ((knowledge_documents.id = knowledge_chunks.document_id) AND (knowledge_documents.user_id = auth.uid())))));


create policy "Users can update chunks of their documents"
on "public"."knowledge_chunks"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM knowledge_documents
  WHERE ((knowledge_documents.id = knowledge_chunks.document_id) AND (knowledge_documents.user_id = auth.uid())))));


create policy "Users can view chunks of their documents"
on "public"."knowledge_chunks"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM knowledge_documents
  WHERE ((knowledge_documents.id = knowledge_chunks.document_id) AND (knowledge_documents.user_id = auth.uid())))));


create policy "Users can delete their own documents"
on "public"."knowledge_documents"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own documents"
on "public"."knowledge_documents"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own documents"
on "public"."knowledge_documents"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own documents"
on "public"."knowledge_documents"
as permissive
for select
to public
using ((auth.uid() = user_id));


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


create policy "Users can insert pipeline leads"
on "public"."lead_pipeline"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM pipelines
  WHERE ((pipelines.id = lead_pipeline.pipeline_id) AND (pipelines.user_id = auth.uid())))));


create policy "Users can update pipeline leads"
on "public"."lead_pipeline"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM pipelines
  WHERE ((pipelines.id = lead_pipeline.pipeline_id) AND (pipelines.user_id = auth.uid())))));


create policy "Users can view their pipeline leads"
on "public"."lead_pipeline"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM pipelines
  WHERE ((pipelines.id = lead_pipeline.pipeline_id) AND (pipelines.user_id = auth.uid())))));


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


create policy "Only admins can delete access records"
on "public"."profile_integration_access"
as permissive
for delete
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.role = 'admin'::app_role))));


create policy "Only admins can insert access records"
on "public"."profile_integration_access"
as permissive
for insert
to authenticated
with check ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.role = 'admin'::app_role))));


create policy "Profiles can view their own access records"
on "public"."profile_integration_access"
as permissive
for select
to authenticated
using (((auth.uid() = profile_id) OR (auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.role = 'admin'::app_role)))));


create policy "Allow full access to contacts in own segments"
on "public"."segment_contacts"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM segments s
  WHERE ((s.id = segment_contacts.segment_id) AND (s.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM segments s
  WHERE ((s.id = segment_contacts.segment_id) AND (s.user_id = auth.uid())))));


create policy "Allow full access to own segments"
on "public"."segments"
as permissive
for all
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


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


create policy "Users can create tasks"
on "public"."tasks"
as permissive
for insert
to public
with check ((auth.uid() = created_by));


create policy "Users can delete their own tasks"
on "public"."tasks"
as permissive
for delete
to public
using ((auth.uid() = created_by));


create policy "Users can update their own tasks and tasks assigned to them"
on "public"."tasks"
as permissive
for update
to public
using (((auth.uid() = created_by) OR (auth.uid() = assignee_id)));


create policy "Users can view their own tasks and tasks assigned to them"
on "public"."tasks"
as permissive
for select
to public
using (((auth.uid() = created_by) OR (auth.uid() = assignee_id)));


CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_broadcast_recipients_timestamp BEFORE UPDATE ON public.broadcast_recipients FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER on_broadcasts_updated_at BEFORE UPDATE ON public.broadcasts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.integrations_config FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_knowledge_chunks BEFORE UPDATE ON public.knowledge_chunks FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_timestamp_knowledge_documents BEFORE UPDATE ON public.knowledge_documents FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.lead_pipeline FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.lead_tags FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_message_logs_updated_at BEFORE UPDATE ON public.message_logs FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_conversation_timestamp AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.pipelines FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_plan_message_usage_updated_at BEFORE UPDATE ON public.plan_message_usage FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION handle_updated_at();



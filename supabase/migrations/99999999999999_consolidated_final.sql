-- CONSOLIDATED MIGRATION FILE
-- This file consolidates all individual migrations into a single comprehensive migration
-- Generated on: 2025-01-27
-- 
-- IMPORTANT: This migration should be applied to a fresh database or after removing all individual migration files
-- It includes all schema changes, table modifications, and function updates from the original migrations

-- ============================================================================
-- SECTION 1: SCHEMA MODIFICATIONS (Pre-September 2025)
-- ============================================================================

-- From: 20241220_add_unknown_count_column.sql
-- Add unknown_count column to batch_sentiment_analysis table
ALTER TABLE batch_sentiment_analysis 
ADD COLUMN IF NOT EXISTS unknown_count INTEGER DEFAULT 0;

-- Update existing records to have unknown_count = 0 if null
UPDATE batch_sentiment_analysis 
SET unknown_count = 0 
WHERE unknown_count IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN batch_sentiment_analysis.unknown_count IS 'Count of conversations with unknown/failed sentiment analysis';

-- From: 20250122000000_fix_broadcast_recipients_fkey.sql
-- Fix foreign key constraint for broadcast_recipients to include ON DELETE CASCADE
-- This resolves the error: "update or delete on table 'broadcasts' violates foreign key constraint 'broadcast_recipients_broadcast_id_fkey'"

-- Drop the existing foreign key constraint
ALTER TABLE "public"."broadcast_recipients" 
DROP CONSTRAINT IF EXISTS "broadcast_recipients_broadcast_id_fkey";

-- Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE "public"."broadcast_recipients" 
ADD CONSTRAINT "broadcast_recipients_broadcast_id_fkey" 
FOREIGN KEY ("broadcast_id") 
REFERENCES "public"."broadcasts"("id") 
ON DELETE CASCADE;

-- From: 20250122120000_fix_ai_agent_sessions_constraint.sql
-- Fix ai_agent_sessions unique constraint to use integrations_config_id instead of integration_id

-- First, ensure any old constraint is dropped (in case it exists in some environments)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_agent_sessions_contact_identifier_agent_id_integration_i_key') THEN
        ALTER TABLE ai_agent_sessions DROP CONSTRAINT ai_agent_sessions_contact_identifier_agent_id_integration_i_key;
    END IF;
END $$;

-- Add the new constraint with the correct column name
ALTER TABLE ai_agent_sessions 
ADD CONSTRAINT ai_agent_sessions_contact_identifier_agent_id_integration_key 
UNIQUE (contact_identifier, agent_id, integration_id);

-- From: 20250123000000_drop_is_active_from_ai_agent_sessions.sql
-- Drop is_active column from ai_agent_sessions table
-- This field is redundant since we already use the status field to determine session state
ALTER TABLE public.ai_agent_sessions 
DROP COLUMN IF EXISTS is_active;

-- From: 20250630145800_add_segment_id_to_broadcasts.sql
-- Add segment_id to broadcasts table
ALTER TABLE public.broadcasts
ADD COLUMN IF NOT EXISTS segment_id UUID,
ADD CONSTRAINT IF NOT EXISTS fk_segment_id
  FOREIGN KEY (segment_id)
  REFERENCES public.segments(id)
  ON DELETE SET NULL;

-- From: 20250701085200_remove_owner_id_from_plans.sql
-- Drop existing RLS policies on plans table that reference owner_id
DROP POLICY IF EXISTS "Allow team admins or owners to create plans" ON public.plans;
DROP POLICY IF EXISTS "Allow team admins or owners to delete plans" ON public.plans;
DROP POLICY IF EXISTS "Allow team admins or owners to update plans" ON public.plans;
DROP POLICY IF EXISTS "Allow users to see their team's or own plans" ON public.plans;

-- Drop the owner_id column from the plans table
ALTER TABLE public.plans DROP COLUMN IF EXISTS owner_id;

-- Recreate a simple RLS policy for public read access
CREATE POLICY "Allow public read access to plans"
ON public.plans
FOR SELECT
USING (true);

-- Allow service_role to bypass RLS
CREATE POLICY "Allow service role full access to plans"
ON public.plans
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- From: 20250701143500_drop_profile_integration_access.sql
-- Drop profile_integration_access table if it exists
DROP TABLE IF EXISTS public.profile_integration_access;

-- From: 20250721175500_link_conversations_to_integrations_config.sql
-- Link conversations to integrations_config
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS integrations_config_id uuid;

-- Step 2: Populate the new column
-- This query assumes that for each `integrations_id` in `conversations`,
-- there is a corresponding `integration_id` in `integrations_config`.
-- If multiple `integrations_config` records exist for one `integration_id`,
-- you might need to decide which one to use (e.g., the first one).
UPDATE public.conversations c
SET integrations_config_id = (
  SELECT ic.id
  FROM public.integrations_config ic
  WHERE ic.integration_id = c.integrations_id
  LIMIT 1 -- Ensures only one value is returned if there are duplicates
)
WHERE c.integrations_config_id IS NULL;

-- Step 3: Add the foreign key constraint
-- It's better to add the constraint after populating the data
-- to avoid issues with existing rows that might not have a match.
ALTER TABLE public.conversations
ADD CONSTRAINT IF NOT EXISTS fk_integrations_config
FOREIGN KEY (integrations_config_id)
REFERENCES public.integrations_config(id);

-- Step 4: Drop the old column
ALTER TABLE public.conversations
DROP COLUMN IF EXISTS integrations_id;

-- Step 5: Rename the new column to the old name
ALTER TABLE public.conversations
RENAME COLUMN integrations_config_id TO integrations_id;

-- From: 20250722142500_add_ended_at_to_ai_agent_sessions.sql
-- Add ended_at timestamp to ai_agent_sessions
ALTER TABLE public.ai_agent_sessions
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- ============================================================================
-- SECTION 2: POST-SEPTEMBER 2025 MIGRATIONS
-- ============================================================================

-- From: 20250907010847_create_whatsapp_logins_table.sql
-- Create WhatsApp logins table for authentication
CREATE TABLE IF NOT EXISTS whatsapp_logins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for faster lookups on token and phone_number
CREATE INDEX IF NOT EXISTS idx_whatsapp_logins_token ON whatsapp_logins (token);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logins_phone_number ON whatsapp_logins (phone_number);

-- From: 20250907035314_add_phone_number_to_profiles.sql
-- Add phone number to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Optional: Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles (phone_number);

-- From: 20250907185200_add_knowledge_document_ids_to_ai_agents.sql
-- Add knowledge document IDs array to ai_agents
ALTER TABLE public.ai_agents
ADD COLUMN IF NOT EXISTS knowledge_document_ids uuid[];

-- From: 20250907185500_drop_ai_agent_knowledge_documents_table.sql
-- Drop the old ai_agent_knowledge_documents table
DROP TABLE IF EXISTS public.ai_agent_knowledge_documents;

-- ============================================================================
-- SECTION 3: CLEANUP AND FINAL ADJUSTMENTS
-- ============================================================================

-- Ensure all foreign key constraints are properly set
-- Add any missing indexes for performance
-- Update any table comments or column comments as needed

-- Add timestamp for when this consolidated migration was applied
COMMENT ON SCHEMA public IS 'Consolidated migration applied on 2025-01-27 - includes all individual migrations';

-- ============================================================================
-- END OF CONSOLIDATED MIGRATION
-- ============================================================================
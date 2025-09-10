-- Merged migration: 6-12_months_ago
-- Consolidates 11 migrations:
-- - 20241220_add_unknown_count_column.sql
-- - 20250108000000_fix_metadata_type_in_match_function.sql
-- - 20250108000001_fix_embedding_type_in_match_function.sql
-- - 20250109000000_add_commands_to_ai_agents.sql
-- - 20250109000000_add_enabled_filter_to_match_function.sql
-- - 20250122000000_fix_broadcast_recipients_fkey.sql
-- - 20250122120000_fix_ai_agent_sessions_constraint.sql
-- - 20250123000000_drop_is_active_from_ai_agent_sessions.sql
-- - 20250125120000_drop_redundant_match_knowledge_chunks.sql
-- - 20250125130000_fix_match_chunks_overload.sql
-- - 20250125140000_force_fix_match_chunks_overload.sql
-- Generated on: 2025-09-09T16:27:48.527Z

-- ============================================================================
-- Migration 1/11: 20241220_add_unknown_count_column.sql
-- ============================================================================

-- Add unknown_count column to batch_sentiment_analysis table
ALTER TABLE batch_sentiment_analysis 
ADD COLUMN unknown_count INTEGER DEFAULT 0;

-- Update existing records to have unknown_count = 0 if null
UPDATE batch_sentiment_analysis 
SET unknown_count = 0 
WHERE unknown_count IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN batch_sentiment_analysis.unknown_count IS 'Count of conversations with unknown/failed sentiment analysis';

-- ============================================================================
-- Migration 2/11: 20250108000000_fix_metadata_type_in_match_function.sql
-- ============================================================================

-- Fix metadata type mismatch in match_knowledge_chunks_for_agent function
-- The metadata column in knowledge_chunks table is 'text', not 'jsonb'

-- Drop all overloads of the function
DROP FUNCTION IF EXISTS public.match_knowledge_chunks_for_agent(vector, uuid, integer, float, jsonb);
DROP FUNCTION IF EXISTS public.match_knowledge_chunks_for_agent(vector, uuid, integer, float);
DROP FUNCTION IF EXISTS public.match_knowledge_chunks_for_agent(vector, uuid, integer);
DROP FUNCTION IF EXISTS public.match_knowledge_chunks_for_agent(vector, uuid);

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks_for_agent(
    p_query_embedding vector(1536),
    p_agent_id uuid,
    p_match_count integer,
    p_match_threshold float,
    p_filter jsonb
)
RETURNS TABLE (
    id uuid,
    content text,
    metadata text,  -- Changed from jsonb to text to match actual column type
    embedding jsonb,
    similarity float,
    document_id uuid,
    document_title text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.content,
        kc.metadata,  -- No casting needed since it's already text
        kc.embedding::jsonb,
        1 - (kc.embedding <=> p_query_embedding) AS similarity,
        kc.document_id,
        kd.title AS document_title
    FROM
        public.knowledge_chunks kc
    JOIN
        public.ai_agents a ON kc.document_id = ANY(a.knowledge_document_ids)
    JOIN
        public.knowledge_documents kd ON kc.document_id = kd.id
    WHERE
        a.id = p_agent_id AND 1 - (kc.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY
        similarity DESC
    LIMIT
        p_match_count;
END;
$$;

-- ============================================================================
-- Migration 3/11: 20250108000001_fix_embedding_type_in_match_function.sql
-- ============================================================================

-- Fix embedding type mismatch in match_knowledge_chunks_for_agent function
-- The embedding column in knowledge_chunks table is 'vector', not 'jsonb'

-- Drop all overloads of the function
DROP FUNCTION IF EXISTS public.match_knowledge_chunks_for_agent(vector, uuid, integer, float, jsonb);
DROP FUNCTION IF EXISTS public.match_knowledge_chunks_for_agent(vector, uuid, integer, float);
DROP FUNCTION IF EXISTS public.match_knowledge_chunks_for_agent(vector, uuid, integer);
DROP FUNCTION IF EXISTS public.match_knowledge_chunks_for_agent(vector, uuid);

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks_for_agent(
    p_query_embedding vector(1536),
    p_agent_id uuid,
    p_match_count integer,
    p_match_threshold float,
    p_filter jsonb
)
RETURNS TABLE (
    id uuid,
    content text,
    metadata text,
    embedding vector(1536),  -- Changed from jsonb to vector(1536)
    similarity float,
    document_id uuid,
    document_title text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.content,
        kc.metadata,
        kc.embedding,  -- No casting needed since it's already vector
        1 - (kc.embedding <=> p_query_embedding) AS similarity,
        kc.document_id,
        kd.title AS document_title
    FROM
        public.knowledge_chunks kc
    JOIN
        public.ai_agents a ON kc.document_id = ANY(a.knowledge_document_ids)
    JOIN
        public.knowledge_documents kd ON kc.document_id = kd.id
    WHERE
        a.id = p_agent_id AND 1 - (kc.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY
        similarity DESC
    LIMIT
        p_match_count;
END;
$$;

-- ============================================================================
-- Migration 4/11: 20250109000000_add_commands_to_ai_agents.sql
-- ============================================================================

-- Add commands column to ai_agents table to store keyword-URL mappings
ALTER TABLE public.ai_agents 
ADD COLUMN commands JSONB DEFAULT '{}' NOT NULL;

-- Add comment for the new column
COMMENT ON COLUMN public.ai_agents.commands IS 'JSON object storing keyword-URL/response mappings for direct command responses. Format: {"keyword1": "url1", "keyword2": "response2"}';

-- Create index for efficient JSON queries on commands
CREATE INDEX idx_ai_agents_commands ON public.ai_agents USING GIN (commands);

-- Example of how to use:
-- UPDATE ai_agents SET commands = '{"attachment": "https://example.com/file.pdf", "website": "https://chattalyst.com"}' WHERE id = 'agent-id';

-- ============================================================================
-- Migration 5/11: 20250109000000_add_enabled_filter_to_match_function.sql
-- ============================================================================

-- Add enabled filter to match_knowledge_chunks_for_agent function
-- This ensures only enabled knowledge chunks are returned

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks_for_agent(
    p_query_embedding vector,
    p_agent_id uuid,
    p_match_count integer,
    p_match_threshold double precision,
    p_filter jsonb
)
RETURNS TABLE(
    id uuid,
    content text,
    metadata text,
    embedding vector,
    similarity double precision,
    document_id uuid,
    document_title text
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.content,
        kc.metadata,
        kc.embedding,
        1 - (kc.embedding <=> p_query_embedding) AS similarity,
        kc.document_id,
        kd.title AS document_title
    FROM
        public.knowledge_chunks kc
    JOIN
        public.ai_agents a ON kc.document_id = ANY(a.knowledge_document_ids)
    JOIN
        public.knowledge_documents kd ON kc.document_id = kd.id
    WHERE
        a.id = p_agent_id 
        AND kc.enabled = true  -- Only return enabled chunks
        AND 1 - (kc.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY
        similarity DESC
    LIMIT
        p_match_count;
END;
$function$;

-- ============================================================================
-- Migration 6/11: 20250122000000_fix_broadcast_recipients_fkey.sql
-- ============================================================================

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

-- ============================================================================
-- Migration 7/11: 20250122120000_fix_ai_agent_sessions_constraint.sql
-- ============================================================================

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

-- ============================================================================
-- Migration 8/11: 20250123000000_drop_is_active_from_ai_agent_sessions.sql
-- ============================================================================

-- Drop is_active column from ai_agent_sessions table
-- This field is redundant since we already use the status field to determine session state

ALTER TABLE public.ai_agent_sessions 
DROP COLUMN IF EXISTS is_active;

-- ============================================================================
-- Migration 9/11: 20250125120000_drop_redundant_match_knowledge_chunks.sql
-- ============================================================================

-- Drop the redundant match_knowledge_chunks function
-- This function duplicates functionality already available in match_chunks
-- with the filter_document_ids parameter

DROP FUNCTION IF EXISTS public.match_knowledge_chunks(
  query_embedding vector,
  match_threshold real,
  match_count integer,
  document_id uuid
);

-- ============================================================================
-- Migration 10/11: 20250125130000_fix_match_chunks_overload.sql
-- ============================================================================

-- Fix match_chunks function overloading issue
-- Drop both existing match_chunks functions
DROP FUNCTION IF EXISTS public.match_chunks(query_embedding public.vector, match_threshold double precision, match_count integer);
DROP FUNCTION IF EXISTS public.match_chunks(query_embedding public.vector, match_threshold double precision, match_count integer, filter_document_ids uuid[]);

-- Create single consolidated match_chunks function
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding public.vector,
  match_threshold double precision,
  match_count integer,
  filter_document_ids uuid[] DEFAULT NULL
) RETURNS TABLE(
  id uuid,
  document_id uuid,
  content text,
  similarity double precision
)
LANGUAGE sql STABLE
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
    AND (filter_document_ids IS NULL OR kc.document_id = ANY(filter_document_ids))
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Grant permissions
GRANT ALL ON FUNCTION public.match_chunks(query_embedding public.vector, match_threshold double precision, match_count integer, filter_document_ids uuid[]) TO anon;
GRANT ALL ON FUNCTION public.match_chunks(query_embedding public.vector, match_threshold double precision, match_count integer, filter_document_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.match_chunks(query_embedding public.vector, match_threshold double precision, match_count integer, filter_document_ids uuid[]) TO service_role;

-- ============================================================================
-- Migration 11/11: 20250125140000_force_fix_match_chunks_overload.sql
-- ============================================================================

-- Force fix match_chunks function overloading issue
-- Drop both existing match_chunks functions
DROP FUNCTION IF EXISTS public.match_chunks(query_embedding public.vector, match_threshold double precision, match_count integer);
DROP FUNCTION IF EXISTS public.match_chunks(query_embedding public.vector, match_threshold double precision, match_count integer, filter_document_ids uuid[]);

-- Create single consolidated match_chunks function
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding public.vector,
  match_threshold double precision,
  match_count integer,
  filter_document_ids uuid[] DEFAULT NULL
) RETURNS TABLE(
  id uuid,
  document_id uuid,
  content text,
  similarity double precision
)
LANGUAGE sql STABLE
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
    AND (filter_document_ids IS NULL OR kc.document_id = ANY(filter_document_ids))
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Grant permissions
GRANT ALL ON FUNCTION public.match_chunks(query_embedding public.vector, match_threshold double precision, match_count integer, filter_document_ids uuid[]) TO anon;
GRANT ALL ON FUNCTION public.match_chunks(query_embedding public.vector, match_threshold double precision, match_count integer, filter_document_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.match_chunks(query_embedding public.vector, match_threshold double precision, match_count integer, filter_document_ids uuid[]) TO service_role;


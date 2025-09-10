-- Merged migration: FUNCTIONS
-- Consolidates 15 migrations:
-- - 20250108000000_fix_metadata_type_in_match_function.sql
-- - 20250108000001_fix_embedding_type_in_match_function.sql
-- - 20250109000000_add_enabled_filter_to_match_function.sql
-- - 20250125120000_drop_redundant_match_knowledge_chunks.sql
-- - 20250125130000_fix_match_chunks_overload.sql
-- - 20250125140000_force_fix_match_chunks_overload.sql
-- - 20250616081500_create_get_active_subscription_rpc.sql
-- - 20250616215800_add_image_url_to_broadcasts.sql
-- - 20250704212100_create_delete_agent_with_relations_function.sql
-- - 20250704213100_grant_execute_on_delete_agent_function.sql
-- - 20250907181900_create_match_vector_function.sql
-- - 20250907190000_fix_match_knowledge_chunks_for_agent_function.sql
-- - 20250907200000_correct_match_function_return_type.sql
-- - 20250907210000_add_document_title_to_match_function.sql
-- - [timestamp]_drop_redundant_match_knowledge_chunks.sql
-- Generated on: 2025-09-09T16:27:42.236Z

-- ============================================================================
-- Migration 1/15: 20250108000000_fix_metadata_type_in_match_function.sql
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
-- Migration 2/15: 20250108000001_fix_embedding_type_in_match_function.sql
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
-- Migration 3/15: 20250109000000_add_enabled_filter_to_match_function.sql
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
-- Migration 4/15: 20250125120000_drop_redundant_match_knowledge_chunks.sql
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
-- Migration 5/15: 20250125130000_fix_match_chunks_overload.sql
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
-- Migration 6/15: 20250125140000_force_fix_match_chunks_overload.sql
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

-- ============================================================================
-- Migration 7/15: 20250616081500_create_get_active_subscription_rpc.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_subscription_details_for_profile(profile_id_param uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_id uuid,
  plan_name text,
  messages_per_month integer
)
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a search path to ensure that the function can find the tables
SET search_path = public
AS $$
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
$$;


-- ============================================================================
-- Migration 8/15: 20250616215800_add_image_url_to_broadcasts.sql
-- ============================================================================

-- ALTER TABLE "public"."broadcasts"
-- ADD COLUMN IF NOT EXISTS "image_url" TEXT NULL,
ALTER TABLE "public"."broadcasts"
ADD COLUMN IF NOT EXISTS "status" TEXT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS "recipient_count" INTEGER NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "integration_config_id" UUID NULL,
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Add foreign key constraint for integration_config_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'broadcasts_integration_config_id_fkey'
    ) THEN
        ALTER TABLE "public"."broadcasts"
        ADD CONSTRAINT "broadcasts_integration_config_id_fkey"
        FOREIGN KEY ("integration_config_id")
        REFERENCES "public"."integrations_config"("id")
        ON DELETE SET NULL;
    END IF;
END
$$;

-- Update existing trigger or create new one for updated_at
CREATE OR REPLACE TRIGGER set_broadcasts_updated_at
BEFORE UPDATE ON "public"."broadcasts"
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- COMMENT ON COLUMN "public"."broadcasts"."image_url" IS 'URL of the image attached to the broadcast.';
COMMENT ON COLUMN "public"."broadcasts"."status" IS 'Status of the broadcast (e.g., draft, scheduled, sent, failed).';
COMMENT ON COLUMN "public"."broadcasts"."scheduled_at" IS 'Timestamp when the broadcast is scheduled to be sent.';
COMMENT ON COLUMN "public"."broadcasts"."recipient_count" IS 'Estimated or actual number of recipients for the broadcast.';
COMMENT ON COLUMN "public"."broadcasts"."integration_config_id" IS 'FK to integrations_config table, specifying which configured instance to send from.';
COMMENT ON COLUMN "public"."broadcasts"."updated_at" IS 'Timestamp of the last update to the broadcast record.';

-- Also add image_url to message_logs table as it was added in send-message-handler
ALTER TABLE "public"."message_logs"
ADD COLUMN IF NOT EXISTS "media_url" TEXT NULL;

COMMENT ON COLUMN "public"."message_logs"."media_url" IS 'URL of the media sent, if applicable (e.g., for images, videos).';


-- ============================================================================
-- Migration 9/15: 20250704212100_create_delete_agent_with_relations_function.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_agent_with_relations(p_agent_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Check if the agent belongs to the user making the request
    IF NOT EXISTS (
        SELECT 1
        FROM public.ai_agents
        WHERE id = p_agent_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Agent not found or access denied';
    END IF;

    -- Delete from ai_agent_knowledge_documents
    DELETE FROM public.ai_agent_knowledge_documents
    WHERE agent_id = p_agent_id;

    -- Delete from ai_agent_integrations
    DELETE FROM public.ai_agent_integrations
    WHERE agent_id = p_agent_id;

    -- Finally, delete the agent itself
    DELETE FROM public.ai_agents
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- Migration 10/15: 20250704213100_grant_execute_on_delete_agent_function.sql
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.delete_agent_with_relations(p_agent_id UUID, p_user_id UUID) TO authenticated;


-- ============================================================================
-- Migration 11/15: 20250907181900_create_match_vector_function.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks_for_agent(
    query_embedding vector(1536),
    agent_id uuid,
    match_count integer,
    filter jsonb
)
RETURNS TABLE (
    id uuid,
    content text,
    metadata jsonb,
    embedding jsonb,
    similarity float,
    document_id uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.content,
        kc.metadata::jsonb,
        kc.embedding::jsonb,
        1 - (kc.embedding <=> query_embedding) AS similarity,
        kc.document_id
    FROM
        public.knowledge_chunks kc
    JOIN
        public.ai_agents a ON kc.document_id = ANY(a.knowledge_document_ids)
    WHERE
        a.id = agent_id
    ORDER BY
        similarity DESC
    LIMIT
        match_count;
END;
$$;


-- ============================================================================
-- Migration 12/15: 20250907190000_fix_match_knowledge_chunks_for_agent_function.sql
-- ============================================================================

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
    metadata jsonb,
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
        kc.metadata::jsonb,
        kc.embedding::jsonb,
        1 - (kc.embedding <=> p_query_embedding) AS similarity,
        kc.document_id,
        kd.title AS document_title
    FROM
        public.knowledge_chunks kc
    JOIN
        public.knowledge_documents kd ON kc.document_id = kd.id
    JOIN
        public.ai_agents a ON kc.document_id = ANY(a.knowledge_document_ids)
    WHERE
        a.id = p_agent_id 
        AND kc.enabled = true
        AND 1 - (kc.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY
        similarity DESC
    LIMIT
        p_match_count;
END;
$$;


-- ============================================================================
-- Migration 13/15: 20250907200000_correct_match_function_return_type.sql
-- ============================================================================

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
    metadata jsonb,
    embedding vector, -- Corrected type
    similarity float,
    document_id uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.content,
        kc.metadata, -- No cast needed
        kc.embedding, -- No cast needed
        1 - (kc.embedding <=> p_query_embedding) AS similarity,
        kc.document_id
    FROM
        public.knowledge_chunks kc
    JOIN
        public.ai_agents a ON kc.document_id = ANY(a.knowledge_document_ids)
    WHERE
        a.id = p_agent_id AND 1 - (kc.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY
        similarity DESC
    LIMIT
        p_match_count;
END;
$$;


-- ============================================================================
-- Migration 14/15: 20250907210000_add_document_title_to_match_function.sql
-- ============================================================================

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
    metadata jsonb,
    embedding jsonb,
    similarity float,
    document_id uuid,
    document_title text -- Added document_title
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.content,
        kc.metadata,
        kc.embedding::jsonb,
        1 - (kc.embedding <=> p_query_embedding) AS similarity,
        kc.document_id,
        kd.title AS document_title -- Join to get the title
    FROM
        public.knowledge_chunks kc
    JOIN
        public.ai_agents a ON kc.document_id = ANY(a.knowledge_document_ids)
    JOIN
        public.knowledge_documents kd ON kc.document_id = kd.id -- Join with knowledge_documents
    WHERE
        a.id = p_agent_id AND 1 - (kc.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY
        similarity DESC
    LIMIT
        p_match_count;
END;
$$;


-- ============================================================================
-- Migration 15/15: [timestamp]_drop_redundant_match_knowledge_chunks.sql
-- ============================================================================

-- Drop the redundant match_knowledge_chunks function
DROP FUNCTION IF EXISTS public.match_knowledge_chunks(
  query_embedding vector,
  match_threshold real,
  match_count integer,
  document_id uuid
);


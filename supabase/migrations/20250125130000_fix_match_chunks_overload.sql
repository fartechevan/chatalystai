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
-- Drop the previous function signature (with exact names from error)
DROP FUNCTION IF EXISTS match_chunks(text[], integer, double precision, vector(1536));
-- Drop the signature with reordered params (just in case)
DROP FUNCTION IF EXISTS match_chunks(integer, double precision, vector(1536), text[]);
-- Drop the original signature (just in case)
DROP FUNCTION IF EXISTS match_chunks(vector(1536), double precision, integer);


-- Recreate a simplified match_chunks function WITHOUT the document filter for testing
CREATE OR REPLACE FUNCTION match_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity -- Using cosine distance operator
  FROM knowledge_chunks kc
  WHERE kc.enabled = TRUE
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  -- Removed document_ids_filter condition
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Drop the redundant match_knowledge_chunks function
-- This function duplicates functionality already available in match_chunks
-- with the filter_document_ids parameter

DROP FUNCTION IF EXISTS public.match_knowledge_chunks(
  query_embedding vector,
  match_threshold real,
  match_count integer,
  document_id uuid
);
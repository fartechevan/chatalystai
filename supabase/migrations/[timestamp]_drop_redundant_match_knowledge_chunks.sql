-- Drop the redundant match_knowledge_chunks function
DROP FUNCTION IF EXISTS public.match_knowledge_chunks(
  query_embedding vector,
  match_threshold real,
  match_count integer,
  document_id uuid
);
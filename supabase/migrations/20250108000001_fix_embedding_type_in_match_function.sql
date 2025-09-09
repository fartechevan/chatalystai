-- Fix embedding type mismatch in match_knowledge_chunks_for_agent function
-- The embedding column in knowledge_chunks table is 'vector', not 'jsonb'

DROP FUNCTION IF EXISTS public.match_knowledge_chunks_for_agent;

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
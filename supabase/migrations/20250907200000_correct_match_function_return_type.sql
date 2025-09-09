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

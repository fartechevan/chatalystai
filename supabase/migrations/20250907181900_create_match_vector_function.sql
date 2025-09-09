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

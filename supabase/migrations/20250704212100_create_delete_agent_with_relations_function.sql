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

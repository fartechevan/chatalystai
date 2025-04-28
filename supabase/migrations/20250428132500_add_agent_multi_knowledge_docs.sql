-- Assuming ai_agents table has a knowledge_document_id column referencing knowledge_documents
-- Step 1: Remove the existing foreign key constraint (adjust constraint name if different)
-- You might need to find the actual constraint name first using SQL introspection tools or pgAdmin.
-- Example command to find constraint name (run this in your SQL client if unsure):
-- SELECT conname
-- FROM pg_constraint
-- WHERE conrelid = 'public.ai_agents'::regclass
--   AND confrelid = 'public.knowledge_documents'::regclass
--   AND conname LIKE '%knowledge_document_id%';
-- Replace 'ai_agents_knowledge_document_id_fkey' with the actual name found.
-- ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_knowledge_document_id_fkey;

-- Step 2: Remove the existing knowledge_document_id column
-- ALTER TABLE public.ai_agents DROP COLUMN IF EXISTS knowledge_document_id;

-- Step 3: Create the new join table for the many-to-many relationship
CREATE TABLE public.ai_agent_knowledge_documents (
    agent_id UUID NOT NULL,
    document_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT ai_agent_knowledge_documents_pkey PRIMARY KEY (agent_id, document_id),
    CONSTRAINT ai_agent_knowledge_documents_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    CONSTRAINT ai_agent_knowledge_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.knowledge_documents(id) ON DELETE CASCADE -- Assuming 'knowledge_documents' table exists with 'id' PK
);

-- Add indexes for faster lookups
CREATE INDEX idx_ai_agent_knowledge_documents_agent_id ON public.ai_agent_knowledge_documents(agent_id);
CREATE INDEX idx_ai_agent_knowledge_documents_document_id ON public.ai_agent_knowledge_documents(document_id);

-- Optional: Add RLS policies if needed
-- ALTER TABLE public.ai_agent_knowledge_documents ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow users to manage their agent document links" ON public.ai_agent_knowledge_documents
-- FOR ALL
-- USING (auth.uid() = (SELECT user_id FROM ai_agents WHERE id = agent_id)) -- Adjust based on your ownership logic
-- WITH CHECK (auth.uid() = (SELECT user_id FROM ai_agents WHERE id = agent_id)); -- Adjust based on your ownership logic

COMMENT ON TABLE public.ai_agent_knowledge_documents IS 'Join table linking AI agents to the knowledge documents they can access.';

-- Note: The DROP CONSTRAINT and DROP COLUMN commands are commented out by default.
-- You MUST uncomment and potentially adjust the constraint name before applying this migration
-- if the ai_agents table currently has a direct foreign key to knowledge_documents.
-- If the ai_agents table does NOT currently link to knowledge_documents at all,
-- you can apply this migration as is (keeping the first two ALTER TABLE commands commented out).

-- Define ai_session_status enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_session_status') THEN
    CREATE TYPE public.ai_session_status AS ENUM ('active', 'closed', 'error');
  END IF;
END $$;

-- Create the ai_agents table (Moved Before ai_agent_sessions)
CREATE TABLE public.ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Assuming reference to auth.users
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    knowledge_document_ids UUID[] NULL, -- Array of UUIDs, nullable
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for common lookups
CREATE INDEX idx_ai_agents_user_id ON public.ai_agents(user_id);

-- Optional: Add RLS policies if needed
-- ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow users to manage their own agents" ON public.ai_agents
-- FOR ALL
-- USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id);

-- Trigger function to update updated_at timestamp (if not already created)
-- Ensure the handle_updated_at function exists before creating the trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Apply the trigger to ai_agents table
CREATE TRIGGER on_ai_agents_updated
BEFORE UPDATE ON public.ai_agents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.ai_agents IS 'Stores configuration for AI agents.';
COMMENT ON COLUMN public.ai_agents.name IS 'User-defined name for the AI agent.';
COMMENT ON COLUMN public.ai_agents.prompt IS 'The system prompt defining the agent''s behavior.';
COMMENT ON COLUMN public.ai_agents.is_enabled IS 'Whether the agent is currently active.';
COMMENT ON COLUMN public.ai_agents.knowledge_document_ids IS 'Array of knowledge document IDs the agent can access.';


-- Create the ai_agent_sessions table
CREATE TABLE public.ai_agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NULL REFERENCES public.ai_agents(id) ON DELETE SET NULL, -- Now references the created ai_agents table
    integration_id UUID NULL REFERENCES public.integrations(id) ON DELETE SET NULL,
    contact_identifier TEXT NOT NULL, -- e.g., phone number, user ID
    conversation_history JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_interaction_timestamp TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    -- Note: The 'status' column is added in a later migration (20250427232100)
);

-- Add indexes for sessions
CREATE INDEX idx_ai_agent_sessions_agent_id ON public.ai_agent_sessions(agent_id);
CREATE INDEX idx_ai_agent_sessions_integration_id ON public.ai_agent_sessions(integration_id);
CREATE INDEX idx_ai_agent_sessions_contact_identifier ON public.ai_agent_sessions(contact_identifier);
CREATE INDEX idx_ai_agent_sessions_is_active ON public.ai_agent_sessions(is_active);

COMMENT ON TABLE public.ai_agent_sessions IS 'Stores active and past conversation sessions handled by AI agents.';
COMMENT ON COLUMN public.ai_agent_sessions.contact_identifier IS 'Identifier for the external contact (e.g., phone number).';
COMMENT ON COLUMN public.ai_agent_sessions.conversation_history IS 'Stored history of the conversation for context.';
COMMENT ON COLUMN public.ai_agent_sessions.is_active IS 'Indicates if the session is currently active.';
COMMENT ON COLUMN public.ai_agent_sessions.last_interaction_timestamp IS 'Timestamp of the last message exchange.';


-- Apply the handle_updated_at trigger to ai_agent_sessions table
-- Ensure the function exists first (it should have been created above for ai_agents)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE TRIGGER on_ai_agent_sessions_updated
    BEFORE UPDATE ON public.ai_agent_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

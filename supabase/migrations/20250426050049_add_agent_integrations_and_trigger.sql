-- Add keyword_trigger column to ai_agents table
ALTER TABLE public.ai_agents
ADD COLUMN keyword_trigger TEXT;

-- Create ai_agent_integrations join table
CREATE TABLE public.ai_agent_integrations (
    agent_id UUID NOT NULL,
    integration_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT ai_agent_integrations_pkey PRIMARY KEY (agent_id, integration_id),
    CONSTRAINT ai_agent_integrations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    CONSTRAINT ai_agent_integrations_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.integrations(id) ON DELETE CASCADE -- Assuming 'integrations' table exists with 'id' PK
);

-- Add indexes for faster lookups
CREATE INDEX idx_ai_agent_integrations_agent_id ON public.ai_agent_integrations(agent_id);
CREATE INDEX idx_ai_agent_integrations_integration_id ON public.ai_agent_integrations(integration_id);

-- Optional: Add RLS policies if needed
-- ALTER TABLE public.ai_agent_integrations ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow authenticated users to manage their agent integrations" ON public.ai_agent_integrations
-- FOR ALL
-- USING (auth.uid() = (SELECT user_id FROM ai_agents WHERE id = agent_id)) -- Adjust based on your ownership logic
-- WITH CHECK (auth.uid() = (SELECT user_id FROM ai_agents WHERE id = agent_id)); -- Adjust based on your ownership logic

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to ai_agent_integrations table
CREATE TRIGGER on_ai_agent_integrations_updated
BEFORE UPDATE ON public.ai_agent_integrations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON COLUMN public.ai_agents.keyword_trigger IS 'Keyword or phrase that triggers this agent in a connected channel.';
COMMENT ON TABLE public.ai_agent_integrations IS 'Join table linking AI agents to specific integrations (channels).';

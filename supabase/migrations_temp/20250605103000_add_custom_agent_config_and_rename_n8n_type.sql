-- Add a new JSONB column for custom agent configurations
ALTER TABLE public.ai_agents
ADD COLUMN custom_agent_config JSONB;

COMMENT ON COLUMN public.ai_agents.custom_agent_config IS 'Stores type-specific configuration for custom agents, e.g., webhook_url, authentication details, etc.';

-- Populate the new custom_agent_config from the old n8n_webhook_url for existing 'n8n' agents
UPDATE public.ai_agents
SET custom_agent_config = jsonb_build_object('webhook_url', n8n_webhook_url)
WHERE agent_type = 'n8n' AND n8n_webhook_url IS NOT NULL;

-- Rename agent_type from 'n8n' to 'CustomAgent'
UPDATE public.ai_agents
SET agent_type = 'CustomAgent'
WHERE agent_type = 'n8n';

-- Drop the old n8n_webhook_url column
ALTER TABLE public.ai_agents
DROP COLUMN IF EXISTS n8n_webhook_url;

ALTER TABLE ai_agents
ADD COLUMN n8n_webhook_url TEXT;

COMMENT ON COLUMN ai_agents.n8n_webhook_url IS 'Webhook URL for n8n agent type';

-- Ensure the column is NULL for existing non-n8n agents or if agent_type is not 'n8n'
UPDATE ai_agents
SET n8n_webhook_url = NULL
WHERE agent_type != 'n8n';

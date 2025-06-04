ALTER TABLE ai_agents
ADD COLUMN agent_type TEXT DEFAULT 'chattalyst' NOT NULL;

COMMENT ON COLUMN ai_agents.agent_type IS 'Type of the agent, e.g., chattalyst or n8n';

-- Backfill existing agents to 'chattalyst' if any were NULL (though default should handle)
UPDATE ai_agents
SET agent_type = 'chattalyst'
WHERE agent_type IS NULL;

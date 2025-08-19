-- Fix ai_agent_sessions unique constraint to use integrations_config_id instead of integration_id

-- First, ensure any old constraint is dropped (in case it exists in some environments)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_agent_sessions_contact_identifier_agent_id_integration_i_key') THEN
        ALTER TABLE ai_agent_sessions DROP CONSTRAINT ai_agent_sessions_contact_identifier_agent_id_integration_i_key;
    END IF;
END $$;

-- Add the new constraint with the correct column name
ALTER TABLE ai_agent_sessions 
ADD CONSTRAINT ai_agent_sessions_contact_identifier_agent_id_integrations_config_key 
UNIQUE (contact_identifier, agent_id, integrations_config_id);
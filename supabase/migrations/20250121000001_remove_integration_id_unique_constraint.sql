-- Remove unique constraint on integration_id to allow multiple instances per integration
-- This enables storing multiple WhatsApp instances for the same integration

ALTER TABLE integrations_config DROP CONSTRAINT IF EXISTS integrations_config_integration_id_key;

-- Add a comment to document the change
COMMENT ON TABLE integrations_config IS 'Integration configurations - supports multiple instances per integration after removing unique constraint on integration_id';
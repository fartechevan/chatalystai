ALTER TABLE n8n_integration_config
ADD COLUMN selected_evolution_instance_id UUID REFERENCES integrations(id) ON DELETE SET NULL ON UPDATE CASCADE;

COMMENT ON COLUMN n8n_integration_config.selected_evolution_instance_id IS 'The ID of the Evolution API instance (from integrations table) to be used for sending replies originating from N8N.';

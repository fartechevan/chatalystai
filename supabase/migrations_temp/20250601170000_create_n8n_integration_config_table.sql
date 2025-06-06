CREATE TABLE n8n_integration_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config JSONB
);

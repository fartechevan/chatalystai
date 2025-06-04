-- Drop the n8n_integration_config table as its functionality
-- (global N8N webhook, global enable/disable, and global selected evolution instance for replies)
-- has been moved to per-agent settings or made obsolete.
DROP TABLE IF EXISTS public.n8n_integration_config;

COMMENT ON TABLE public.n8n_integration_config IS 'This table was previously used for global N8N integration settings and global reply instance configuration. It is now obsolete as these settings are managed per AI agent or are no longer applicable.';

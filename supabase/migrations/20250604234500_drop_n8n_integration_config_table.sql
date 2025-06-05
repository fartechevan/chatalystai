-- Drop the n8n_integration_config table as its functionality
-- (global N8N webhook, global enable/disable, and global selected evolution instance for replies)
-- has been moved to per-agent settings or made obsolete.
DROP TABLE IF EXISTS public.n8n_integration_config;

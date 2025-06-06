-- Add integration_id to integrations_config to link to the specific integration type

ALTER TABLE public.integrations_config
ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_integrations_config_integration_id ON public.integrations_config(integration_id);

COMMENT ON COLUMN public.integrations_config.integration_id IS 'Links this configuration to a specific integration type from the integrations table.';

-- Note: Existing configurations will have NULL for integration_id.
-- These will need to be manually updated if the link is known.

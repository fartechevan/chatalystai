-- Create the integrations_config table
-- Depends on: integrations table (created in 20250426040000)
-- Depends on: handle_updated_at function (created in 20250426040000 or earlier)

CREATE TABLE public.integrations_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL UNIQUE REFERENCES public.integrations(id) ON DELETE CASCADE,
    instance_id TEXT NULL, -- Specific instance identifier (e.g., Evolution API instance name)
    instance_display_name TEXT NULL,
    token TEXT NULL, -- API token or secret for the specific instance
    owner_id TEXT NULL, -- Identifier of the owner (e.g., WhatsApp JID)
    user_reference_id TEXT NULL, -- Sanitized owner ID or other reference
    status TEXT NULL, -- Status of the specific instance connection
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    -- Note: pipeline_id will be added in a later migration (20250504134716)
);

-- Add indexes for integrations_config
CREATE INDEX idx_integrations_config_integration_id ON public.integrations_config(integration_id);
CREATE INDEX idx_integrations_config_instance_id ON public.integrations_config(instance_id);
CREATE INDEX idx_integrations_config_owner_id ON public.integrations_config(owner_id);

-- Apply the trigger to integrations_config table
-- Ensure the handle_updated_at function exists first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
     CREATE TRIGGER on_integrations_config_updated
     BEFORE UPDATE ON public.integrations_config
     FOR EACH ROW
     EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

COMMENT ON TABLE public.integrations_config IS 'Stores instance-specific configuration for connected integrations.';
COMMENT ON COLUMN public.integrations_config.instance_id IS 'Identifier for a specific instance of the integration (e.g., Evolution API instance name).';
COMMENT ON COLUMN public.integrations_config.instance_display_name IS 'User-friendly display name for the instance.';
COMMENT ON COLUMN public.integrations_config.token IS 'API token or secret specific to this instance connection.';
COMMENT ON COLUMN public.integrations_config.owner_id IS 'Identifier of the owner associated with this instance (e.g., WhatsApp JID).';
COMMENT ON COLUMN public.integrations_config.user_reference_id IS 'Sanitized or user-friendly reference ID derived from owner_id.';
COMMENT ON COLUMN public.integrations_config.status IS 'Connection status specific to this instance.';

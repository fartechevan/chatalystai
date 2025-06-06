-- Define integration_status enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_status') THEN
    CREATE TYPE public.integration_status AS ENUM ('available', 'coming_soon');
  END IF;
END $$;

-- Create the integrations table
CREATE TABLE public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NULL,
    icon_url TEXT NULL,
    status public.integration_status NOT NULL DEFAULT 'available',
    is_connected BOOLEAN DEFAULT FALSE,
    api_key TEXT NULL,
    base_url TEXT NULL,
    webhook_url TEXT NULL,
    webhook_events JSON NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes
CREATE INDEX idx_integrations_name ON public.integrations(name);
CREATE INDEX idx_integrations_status ON public.integrations(status);

-- Trigger function to update updated_at timestamp (if not already created)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Apply the trigger to integrations table
CREATE TRIGGER on_integrations_updated
BEFORE UPDATE ON public.integrations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.integrations IS 'Stores details about available third-party integrations.';
COMMENT ON COLUMN public.integrations.name IS 'Display name of the integration.';
COMMENT ON COLUMN public.integrations.status IS 'Availability status of the integration.';
COMMENT ON COLUMN public.integrations.is_connected IS 'Indicates if the integration is currently connected/configured.';
COMMENT ON COLUMN public.integrations.api_key IS 'API key for the integration, if applicable.';
COMMENT ON COLUMN public.integrations.base_url IS 'Base URL for the integration API, if applicable.';
COMMENT ON COLUMN public.integrations.webhook_url IS 'URL for receiving webhooks from the integration.';
COMMENT ON COLUMN public.integrations.webhook_events IS 'JSON array of event types subscribed to via webhook.';

-- integrations_config table is now created in migration 20250426045000

-- Add webhook_url and webhook_events columns to the integrations table
ALTER TABLE public.integrations
ADD COLUMN webhook_url TEXT,
ADD COLUMN webhook_events JSONB;

-- Copy data from integrations_config to integrations
UPDATE public.integrations i
SET
    webhook_url = ic.webhook_url,
    webhook_events = to_jsonb(ic.webhook_events) -- Cast text[] to jsonb
FROM public.integrations_config ic
WHERE i.id = ic.integration_id;

-- Remove webhook_url and webhook_events columns from integrations_config
ALTER TABLE public.integrations_config
DROP COLUMN webhook_url,
DROP COLUMN webhook_events;

-- Optional: Add comments for clarity
COMMENT ON COLUMN public.integrations.webhook_url IS 'Webhook URL provided by the user for the integration.';
COMMENT ON COLUMN public.integrations.webhook_events IS 'JSONB array of events the user wants to subscribe to for the webhook.';

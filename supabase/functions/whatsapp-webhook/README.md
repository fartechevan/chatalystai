# WhatsApp Webhook Handler

## Overview

This webhook handler processes incoming messages from WhatsApp via the Evolution API. It supports multiple WhatsApp instances by using the integration configuration ID passed in the URL.

## How It Works

1. The webhook receives events from Evolution API instances
2. It identifies the correct integration configuration using either:
   - The `config` query parameter in the URL (preferred method)
   - The instance ID from the webhook payload (fallback method)
3. It processes messages and stores them in the database with the correct integration configuration

## Webhook URL Format

To ensure messages are properly associated with the correct WhatsApp instance, use the following URL format when configuring webhooks in Evolution API:

```
{SUPABASE_URL}/functions/v1/whatsapp-webhook?config={INTEGRATION_CONFIG_ID}
```

Where:
- `{SUPABASE_URL}` is your Supabase project URL
- `{INTEGRATION_CONFIG_ID}` is the UUID of the specific integration configuration (from the `integrations_config` table)

## Database Tables

- `integrations_config`: Stores configuration for each WhatsApp instance
- `evolution_webhook_events`: Logs incoming webhook events
- `conversations`: Stores conversation threads
- `messages`: Stores individual messages

## Error Handling

The webhook handler includes robust error handling:

1. If the integration config ID is invalid, it falls back to using the instance ID
2. If neither method finds a valid configuration, it returns an error message
3. All errors are logged for debugging purposes

## Debugging

Extensive logging has been added to help debug issues:

- Incoming requests are logged with their config ID
- Integration config lookups are logged with results
- Errors during processing are logged with detailed information

## Database Schema Update

If you're using this with an older database schema, you may need to add the `integration_config_id` column to the `evolution_webhook_events` table:

```sql
ALTER TABLE public.evolution_webhook_events 
ADD COLUMN IF NOT EXISTS integration_config_id UUID 
REFERENCES public.integrations_config(id);
```

The code includes fallback handling if this column doesn't exist yet.
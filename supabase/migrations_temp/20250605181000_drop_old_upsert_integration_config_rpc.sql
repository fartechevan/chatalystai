-- Drop the old upsert_integration_config function signature that does not include profile_id

DROP FUNCTION IF EXISTS public.upsert_integration_config(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT);

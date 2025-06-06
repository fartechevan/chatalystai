-- Ensure integrations_config table has the correct structure and unique constraints.

-- Step 1: Clean up old columns if they exist
ALTER TABLE public.integrations_config
    DROP COLUMN IF EXISTS tenant_id,
    DROP COLUMN IF EXISTS profile_id;

-- Ensure owner_id column exists (it should, based on current types)
-- If it might not exist in some older developer branches, an ADD COLUMN IF NOT EXISTS would be needed,
-- but assuming it's present from prior migrations that removed tenant_id and added owner_id.
-- ALTER TABLE public.integrations_config ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Step 2: Drop old/incorrect unique constraints and indexes
-- These are from previous attempts and iterations.
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS integrations_config_tenant_id_instance_id_key;
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS integrations_config_instance_id_key;
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS unique_tenant_instance_not_null;
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS unique_instance_tenant_null;
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS unique_profile_instance_not_null;
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS unique_instance_profile_null;

DROP INDEX IF EXISTS unique_profile_instance_not_null_idx;
DROP INDEX IF EXISTS unique_instance_profile_null_idx;
DROP INDEX IF EXISTS unique_owner_instance_not_null_idx; -- Old version without integration_id
DROP INDEX IF EXISTS unique_instance_owner_null_idx;   -- Old version without integration_id

-- Step 3: Create the correct unique indexes including integration_id
-- Drop them first if this script is re-run to ensure idempotency
DROP INDEX IF EXISTS unique_integration_owner_instance_not_null_idx;
CREATE UNIQUE INDEX unique_integration_owner_instance_not_null_idx
ON public.integrations_config (integration_id, owner_id, instance_id)
WHERE (owner_id IS NOT NULL AND instance_id IS NOT NULL);

COMMENT ON INDEX unique_integration_owner_instance_not_null_idx IS 'Ensures instance_id is unique per integration_id and owner_id when owner_id is present.';

DROP INDEX IF EXISTS unique_integration_instance_owner_null_idx;
CREATE UNIQUE INDEX unique_integration_instance_owner_null_idx
ON public.integrations_config (integration_id, instance_id)
WHERE (owner_id IS NULL AND instance_id IS NOT NULL);

COMMENT ON INDEX unique_integration_instance_owner_null_idx IS 'Ensures instance_id is unique per integration_id when owner_id is not present.';

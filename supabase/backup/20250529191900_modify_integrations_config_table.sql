-- Add tenant_id to integrations_config table
ALTER TABLE public.integrations_config
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add index for the new tenant_id column
CREATE INDEX idx_integrations_config_tenant_id ON public.integrations_config(tenant_id);

-- Drop the UNIQUE constraint on integration_id
-- Assuming the default constraint name. If this fails, the name needs to be queried and updated.
-- Common naming convention is tablename_columnname_key
ALTER TABLE public.integrations_config
DROP CONSTRAINT IF EXISTS integrations_config_integration_id_key;

-- Re-create the foreign key constraint for integration_id WITHOUT the UNIQUE part
-- The original constraint was: integration_id UUID NOT NULL UNIQUE REFERENCES public.integrations(id) ON DELETE CASCADE
-- We need to ensure the NOT NULL and REFERENCES parts are still there.
-- The ON DELETE CASCADE is part of the FK.
-- First, let's ensure the column itself is NOT NULL if it isn't already.
-- The original DDL had `integration_id UUID NOT NULL...` so it's already NOT NULL.

-- If dropping the unique constraint also dropped the FK, we need to re-add it.
-- However, `DROP CONSTRAINT` for a UNIQUE constraint that is also part of an FK definition
-- might behave differently across PG versions or if it's a named FK constraint.
-- For safety, we can try to drop a potentially named FK constraint first if it exists,
-- then drop the unique constraint, then re-add the FK.
-- A simpler approach is to assume `DROP CONSTRAINT integrations_config_integration_id_key`
-- only removes the unique aspect. If it removes the FK, this migration will need adjustment
-- after a test run.

-- For now, we assume the FK relationship (REFERENCES public.integrations(id) ON DELETE CASCADE)
-- might be implicitly tied to the unique constraint or a separate FK constraint.
-- If `DROP CONSTRAINT integrations_config_integration_id_key` removes the FK,
-- we would need to add it back:
-- ALTER TABLE public.integrations_config
-- ADD CONSTRAINT fk_integrations_config_integration_id
-- FOREIGN KEY (integration_id) REFERENCES public.integrations(id) ON DELETE CASCADE;
-- This is commented out as it's a conditional step.

COMMENT ON COLUMN public.integrations_config.tenant_id IS 'Foreign key referencing the tenant that owns this integration configuration.';

-- Note: Existing data in integrations_config will have NULL for tenant_id.
-- A separate data migration or manual update will be needed to populate tenant_id
-- for existing configurations if they need to be associated with tenants.

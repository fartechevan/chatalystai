-- Migration to ensure instance_id in integrations_config is unique
-- under specific conditions related to tenant_id, while allowing instance_id to be NULL.

-- 1. Drop the existing non-unique index on instance_id.
-- This index is superseded by the more specific unique indexes below.
DROP INDEX IF EXISTS public.idx_integrations_config_instance_id;

-- 2. Add a unique index for instance_id when tenant_id IS NULL and instance_id IS NOT NULL.
-- This ensures that for integration configurations not associated with a specific tenant,
-- the instance_id (if provided and not NULL) is unique among them.
CREATE UNIQUE INDEX uq_integrations_config_instance_id_if_tenant_is_null
ON public.integrations_config (instance_id)
WHERE tenant_id IS NULL AND instance_id IS NOT NULL;

-- 3. Add a unique index for the combination of (tenant_id, instance_id) when tenant_id IS NOT NULL and instance_id IS NOT NULL.
-- This ensures that for integration configurations associated with a specific tenant,
-- the instance_id (if provided and not NULL) is unique *within that tenant*.
CREATE UNIQUE INDEX uq_integrations_config_tenant_id_instance_id_if_tenant_is_not_null
ON public.integrations_config (tenant_id, instance_id)
WHERE tenant_id IS NOT NULL AND instance_id IS NOT NULL;

COMMENT ON TABLE public.integrations_config IS 'Stores instance-specific configuration for connected integrations. Added conditional unique constraints on instance_id based on tenant_id presence and instance_id being non-NULL.';

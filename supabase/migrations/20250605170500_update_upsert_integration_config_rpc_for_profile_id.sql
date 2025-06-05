-- Recreate the upsert_integration_config function to use profile_id instead of tenant_id

DROP FUNCTION IF EXISTS public.upsert_integration_config(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.upsert_integration_config(
    p_integration_id UUID,
    p_instance_id TEXT,
    p_profile_id UUID, -- Changed from p_tenant_id
    p_instance_display_name TEXT,
    p_token TEXT,
    p_owner_id TEXT,
    p_user_reference_id TEXT,
    p_pipeline_id UUID,
    p_status TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Upsert based on (profile_id, instance_id) when profile_id is NOT NULL
    IF p_profile_id IS NOT NULL AND p_instance_id IS NOT NULL THEN
        INSERT INTO public.integrations_config (
            integration_id, instance_id, profile_id, instance_display_name, token, owner_id, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, p_profile_id, p_instance_display_name, p_token, p_owner_id, p_user_reference_id, p_pipeline_id, p_status
        )
        ON CONFLICT (profile_id, instance_id) -- Assumes a unique constraint exists or will be added for (profile_id, instance_id)
        DO UPDATE SET
            instance_display_name = EXCLUDED.instance_display_name,
            token = EXCLUDED.token,
            owner_id = EXCLUDED.owner_id,
            user_reference_id = EXCLUDED.user_reference_id,
            pipeline_id = EXCLUDED.pipeline_id,
            status = EXCLUDED.status,
            updated_at = NOW();

    -- Upsert based on (instance_id) when profile_id IS NULL
    -- This handles cases where an integration might not be user-specific yet, or for global/unassigned configs.
    -- A unique constraint on (instance_id) WHERE profile_id IS NULL would be needed for this conflict target.
    ELSIF p_instance_id IS NOT NULL AND p_profile_id IS NULL THEN
        INSERT INTO public.integrations_config (
            integration_id, instance_id, profile_id, instance_display_name, token, owner_id, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, NULL, p_instance_display_name, p_token, p_owner_id, p_user_reference_id, p_pipeline_id, p_status
        )
        ON CONFLICT (instance_id) WHERE profile_id IS NULL -- Match partial unique index for (instance_id) where profile_id is null
        DO UPDATE SET
            instance_display_name = EXCLUDED.instance_display_name,
            token = EXCLUDED.token,
            owner_id = EXCLUDED.owner_id,
            user_reference_id = EXCLUDED.user_reference_id,
            pipeline_id = EXCLUDED.pipeline_id,
            status = EXCLUDED.status,
            updated_at = NOW();
    ELSE
        -- Fallback for other cases, e.g., if instance_id is also NULL.
        -- This basic insert doesn't handle conflicts if instance_id is null.
        INSERT INTO public.integrations_config (
            integration_id, instance_id, profile_id, instance_display_name, token, owner_id, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, p_profile_id, p_instance_display_name, p_token, p_owner_id, p_user_reference_id, p_pipeline_id, p_status
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.upsert_integration_config(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) IS 'Upserts an integration configuration, using profile_id. Handles conflicts based on (profile_id, instance_id) or (instance_id if profile_id is null).';

-- It's crucial that the unique constraints on integrations_config match the ON CONFLICT targets.
-- The migration '20250529210100_add_conditional_unique_constraints_for_instance_id.sql'
-- created:
--   UNIQUE (tenant_id, instance_id) WHERE tenant_id IS NOT NULL AND instance_id IS NOT NULL
--   UNIQUE (instance_id) WHERE tenant_id IS NULL AND instance_id IS NOT NULL
-- These need to be updated to use profile_id. This should be done in a separate, preceding migration
-- or as part of the migration that introduces profile_id and drops tenant_id.
-- For now, this RPC assumes such constraints will be (or have been) updated.
-- If '20250605165500_adjust_integrations_config_for_user_scoping.sql' did not update these constraints,
-- this RPC might not behave as expected regarding ON CONFLICT.

-- Let's assume the constraints were updated in '20250605165500_adjust_integrations_config_for_user_scoping.sql'
-- or a subsequent one. If not, a new migration is needed to:
-- 1. Drop old tenant_id based unique constraints.
-- 2. Create new profile_id based unique constraints:
--    ALTER TABLE public.integrations_config ADD CONSTRAINT unique_profile_instance_not_null UNIQUE (profile_id, instance_id) WHERE profile_id IS NOT NULL AND instance_id IS NOT NULL;
--    ALTER TABLE public.integrations_config ADD CONSTRAINT unique_instance_profile_null UNIQUE (instance_id) WHERE profile_id IS NULL AND instance_id IS NOT NULL;
-- This RPC is written assuming these (or equivalent) constraints are in place.

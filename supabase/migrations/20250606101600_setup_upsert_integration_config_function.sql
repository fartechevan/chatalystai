-- Define the upsert_integration_config function with correct conflict handling.

-- Step 1: Drop potentially conflicting old function signatures.
-- Drop the version where p_owner_id might have been TEXT.
DROP FUNCTION IF EXISTS public.upsert_integration_config(
    UUID,   -- p_integration_id
    TEXT,   -- p_instance_id
    TEXT,   -- p_instance_display_name
    TEXT,   -- p_token
    TEXT,   -- p_owner_id (conflicting text type)
    TEXT,   -- p_user_reference_id
    UUID,   -- p_pipeline_id
    TEXT    -- p_status
);

-- Drop any version that might have included p_tenant_id.
DROP FUNCTION IF EXISTS public.upsert_integration_config(
    UUID,   -- p_integration_id
    TEXT,   -- p_instance_id
    UUID,   -- p_tenant_id (old parameter)
    TEXT,   -- p_instance_display_name
    TEXT,   -- p_token
    TEXT,   -- p_owner_id (if it was TEXT in this variant)
    TEXT,   -- p_user_reference_id
    UUID,   -- p_pipeline_id
    TEXT    -- p_status
);

DROP FUNCTION IF EXISTS public.upsert_integration_config(
    UUID,   -- p_integration_id
    TEXT,   -- p_instance_id
    UUID,   -- p_tenant_id (old parameter)
    TEXT,   -- p_instance_display_name
    TEXT,   -- p_token
    UUID,   -- p_owner_id (if it was UUID in this variant)
    TEXT,   -- p_user_reference_id
    UUID,   -- p_pipeline_id
    TEXT    -- p_status
);

-- Drop the old upsert_integration_config_v2 if it exists
DROP FUNCTION IF EXISTS public.upsert_integration_config_v2(
    UUID, UUID, TEXT, UUID, TEXT, TEXT, TEXT, UUID, TEXT -- Matches signature of old v2 with tenant_id
);


-- Step 2: Create or Replace the function with the correct signature and logic.
CREATE OR REPLACE FUNCTION public.upsert_integration_config(
    p_integration_id UUID,
    p_instance_id TEXT,
    p_instance_display_name TEXT,
    p_token TEXT,
    p_owner_id UUID, -- Correct type
    p_user_reference_id TEXT,
    p_pipeline_id UUID,
    p_status TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Case 1: owner_id IS NOT NULL and instance_id IS NOT NULL
    IF p_owner_id IS NOT NULL AND p_instance_id IS NOT NULL THEN
        INSERT INTO public.integrations_config (
            integration_id, instance_id, owner_id, instance_display_name, token, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, p_owner_id, p_instance_display_name, p_token, p_user_reference_id, p_pipeline_id, p_status
        )
        ON CONFLICT (integration_id, owner_id, instance_id) WHERE owner_id IS NOT NULL AND instance_id IS NOT NULL -- Match unique_integration_owner_instance_not_null_idx
        DO UPDATE SET
            instance_display_name = EXCLUDED.instance_display_name,
            token = EXCLUDED.token,
            user_reference_id = EXCLUDED.user_reference_id,
            pipeline_id = EXCLUDED.pipeline_id,
            status = EXCLUDED.status,
            updated_at = NOW();

    -- Case 2: owner_id IS NULL and instance_id IS NOT NULL
    ELSIF p_owner_id IS NULL AND p_instance_id IS NOT NULL THEN
        INSERT INTO public.integrations_config (
            integration_id, instance_id, owner_id, instance_display_name, token, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, NULL, p_instance_display_name, p_token, p_user_reference_id, p_pipeline_id, p_status
        )
        ON CONFLICT (integration_id, instance_id) WHERE owner_id IS NULL AND instance_id IS NOT NULL -- Match unique_integration_instance_owner_null_idx
        DO UPDATE SET
            instance_display_name = EXCLUDED.instance_display_name,
            token = EXCLUDED.token,
            user_reference_id = EXCLUDED.user_reference_id,
            pipeline_id = EXCLUDED.pipeline_id,
            status = EXCLUDED.status,
            updated_at = NOW();
            
    -- Case 3: instance_id IS NULL
    -- This path will attempt a direct insert. If instance_id is truly nullable and part of a different
    -- unique key (e.g., (integration_id, owner_id) where instance_id IS NULL), then another
    -- ON CONFLICT clause would be needed for that specific constraint.
    -- For now, assuming instance_id is generally expected for upserts.
    ELSE
        INSERT INTO public.integrations_config (
            integration_id, instance_id, owner_id, instance_display_name, token, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, p_owner_id, p_instance_display_name, p_token, p_user_reference_id, p_pipeline_id, p_status
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.upsert_integration_config(UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT) 
IS 'Upserts an integration configuration. Handles conflicts based on (integration_id, owner_id, instance_id) if owner_id is present, or (integration_id, instance_id) if owner_id is null. Assumes instance_id is usually NOT NULL for conflict resolution.';

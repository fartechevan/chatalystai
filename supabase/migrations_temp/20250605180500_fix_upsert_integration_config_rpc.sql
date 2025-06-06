-- Fix the upsert_integration_config function to correctly match partial unique indexes

DROP FUNCTION IF EXISTS public.upsert_integration_config(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.upsert_integration_config(
    p_integration_id UUID,
    p_instance_id TEXT,
    p_instance_display_name TEXT,
    p_owner_id TEXT,
    p_pipeline_id UUID,
    p_profile_id UUID,
    p_status TEXT,
    p_token TEXT,
    p_user_reference_id TEXT
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
        ON CONFLICT (profile_id, instance_id) WHERE (profile_id IS NOT NULL AND instance_id IS NOT NULL)
        DO UPDATE SET
            instance_display_name = EXCLUDED.instance_display_name,
            token = EXCLUDED.token,
            owner_id = EXCLUDED.owner_id,
            user_reference_id = EXCLUDED.user_reference_id,
            pipeline_id = EXCLUDED.pipeline_id,
            status = EXCLUDED.status,
            updated_at = NOW();

    -- Upsert based on (instance_id) when profile_id IS NULL
    ELSIF p_instance_id IS NOT NULL AND p_profile_id IS NULL THEN
        INSERT INTO public.integrations_config (
            integration_id, instance_id, profile_id, instance_display_name, token, owner_id, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, NULL, p_instance_display_name, p_token, p_owner_id, p_user_reference_id, p_pipeline_id, p_status
        )
        ON CONFLICT (instance_id) WHERE profile_id IS NULL
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
        INSERT INTO public.integrations_config (
            integration_id, instance_id, profile_id, instance_display_name, token, owner_id, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, p_profile_id, p_instance_display_name, p_token, p_owner_id, p_user_reference_id, p_pipeline_id, p_status
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.upsert_integration_config(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) IS 'Upserts an integration configuration, using profile_id. Handles conflicts based on (profile_id, instance_id) or (instance_id if profile_id is null).';

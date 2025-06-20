CREATE OR REPLACE FUNCTION public.upsert_integration_config(
    p_integration_id UUID,
    p_instance_id TEXT,
    p_tenant_id UUID,
    p_instance_display_name TEXT,
    p_token TEXT,
    p_owner_id TEXT,
    p_user_reference_id TEXT,
    p_pipeline_id UUID,
    p_status TEXT -- Added status as it's in the table
)
RETURNS VOID AS $$
BEGIN
    IF p_tenant_id IS NOT NULL AND p_instance_id IS NOT NULL THEN
        INSERT INTO public.integrations_config (
            integration_id, instance_id, tenant_id, instance_display_name, token, owner_id, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, p_tenant_id, p_instance_display_name, p_token, p_owner_id, p_user_reference_id, p_pipeline_id, p_status
        )
        ON CONFLICT (tenant_id, instance_id) WHERE tenant_id IS NOT NULL AND instance_id IS NOT NULL -- Match the partial index predicate
        DO UPDATE SET
            instance_display_name = EXCLUDED.instance_display_name,
            token = EXCLUDED.token,
            owner_id = EXCLUDED.owner_id,
            user_reference_id = EXCLUDED.user_reference_id,
            pipeline_id = EXCLUDED.pipeline_id,
            status = EXCLUDED.status,
            updated_at = NOW();
            -- integration_id should not change on conflict for this key
            -- tenant_id and instance_id are the conflict keys, so they also don't change

    ELSIF p_instance_id IS NOT NULL AND p_tenant_id IS NULL THEN
        INSERT INTO public.integrations_config (
            integration_id, instance_id, tenant_id, instance_display_name, token, owner_id, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, NULL, p_instance_display_name, p_token, p_owner_id, p_user_reference_id, p_pipeline_id, p_status
        )
        ON CONFLICT (instance_id) WHERE tenant_id IS NULL AND instance_id IS NOT NULL -- Match the partial index predicate
        DO UPDATE SET
            instance_display_name = EXCLUDED.instance_display_name,
            token = EXCLUDED.token,
            owner_id = EXCLUDED.owner_id,
            user_reference_id = EXCLUDED.user_reference_id,
            pipeline_id = EXCLUDED.pipeline_id,
            status = EXCLUDED.status,
            updated_at = NOW();
            -- integration_id should not change on conflict for this key
            -- instance_id is the conflict key

    ELSE
        -- Fallback for cases where instance_id might be null (though current app logic seems to always provide it)
        -- Or if other combinations are needed. This basic insert doesn't handle conflicts if instance_id is null.
        -- This part might need refinement based on exact requirements for null instance_id.
        -- For now, assume instance_id is usually provided. If instance_id can be null and still needs upsert logic
        -- based on e.g. integration_id and tenant_id, that would require a different constraint.
        INSERT INTO public.integrations_config (
            integration_id, instance_id, tenant_id, instance_display_name, token, owner_id, user_reference_id, pipeline_id, status
        ) VALUES (
            p_integration_id, p_instance_id, p_tenant_id, p_instance_display_name, p_token, p_owner_id, p_user_reference_id, p_pipeline_id, p_status
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.upsert_integration_config IS 'Upserts an integration configuration, handling conflicts based on partial unique indexes for (tenant_id, instance_id) or (instance_id if tenant_id is null).';

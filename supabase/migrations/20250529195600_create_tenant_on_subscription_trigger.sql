-- Function to create a personal tenant record when a user subscribes without a team
CREATE OR REPLACE FUNCTION public.handle_new_subscription_create_personal_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the subscription is new and does not have a team_id
    -- and the status is one that indicates an active subscription (e.g., 'active', 'trialing')
    IF TG_OP = 'INSERT' AND NEW.team_id IS NULL AND NEW.status IN ('active', 'trialing') THEN
        -- Insert into tenants table with team_id as NULL.
        -- NEW.profile_id from subscriptions corresponds to profiles.id (which is auth.users.id)
        INSERT INTO public.tenants (owner_profile_id, team_id)
        VALUES (NEW.profile_id, NULL)
        -- If a personal tenant already exists for this owner_profile_id (where team_id IS NULL), do nothing.
        -- The unique index idx_tenants_unique_personal_tenant handles this.
        ON CONFLICT (owner_profile_id) WHERE (team_id IS NULL) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger to call the function after a new row is inserted into subscriptions
CREATE TRIGGER on_new_subscription_create_personal_tenant_trigger
AFTER INSERT ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_subscription_create_personal_tenant();

COMMENT ON FUNCTION public.handle_new_subscription_create_personal_tenant() IS 'Trigger function to automatically create a personal tenant record when a user subscribes to a plan without a team.';
COMMENT ON TRIGGER on_new_subscription_create_personal_tenant_trigger ON public.subscriptions IS 'Automatically creates a personal tenant record for new subscriptions without a team_id.';

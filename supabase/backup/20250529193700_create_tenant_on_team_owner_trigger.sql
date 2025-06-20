-- Function to create a tenant record when a team owner is assigned
CREATE OR REPLACE FUNCTION public.handle_new_team_owner_create_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Important for permissions if RLS is on tenants
AS $$
BEGIN
    -- Check if the new role is 'owner'
    IF NEW.role = 'owner' THEN
        -- Insert into tenants table.
        -- NEW.user_id from team_users corresponds to profiles.id (which is auth.users.id)
        -- NEW.team_id is the team_id from team_users
        INSERT INTO public.tenants (team_id, owner_profile_id)
        VALUES (NEW.team_id, NEW.user_id)
        -- If a tenant already exists for this team_id, do nothing.
        -- The UNIQUE constraint on owner_profile_id will still prevent a user from owning multiple tenants
        -- by causing an error if this INSERT attempts to violate it after passing the team_id conflict check.
        ON CONFLICT (team_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger to call the function after a new row is inserted into team_users
CREATE TRIGGER on_new_team_owner_create_tenant_trigger
AFTER INSERT ON public.team_users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_team_owner_create_tenant();

COMMENT ON FUNCTION public.handle_new_team_owner_create_tenant() IS 'Trigger function to automatically create a tenant record when a user is made an owner of a team.';
COMMENT ON TRIGGER on_new_team_owner_create_tenant_trigger ON public.team_users IS 'Automatically creates a tenant record when a new team owner is inserted into team_users.';

-- Function to add a newly signed-up user to a tenant if they were invited
CREATE OR REPLACE FUNCTION public.handle_new_user_add_to_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Necessary to insert into public.tenant_users
AS $$
DECLARE
  invited_tenant_id UUID;
  invited_role TEXT;
BEGIN
  -- Extract tenant_id and role from the new user's metadata (raw_app_meta_data)
  -- This metadata should be set by the 'invite-user-to-tenant' Edge Function
  invited_tenant_id := (NEW.raw_app_meta_data->>'invited_tenant_id')::UUID;
  invited_role := COALESCE(NEW.raw_app_meta_data->>'invited_role', 'member'); -- Default to 'member' if not specified

  -- If invited_tenant_id is present in metadata, add the user to the tenant_users table
  IF invited_tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_users (tenant_id, user_id, role)
    VALUES (invited_tenant_id, NEW.id, invited_role)
    ON CONFLICT (tenant_id, user_id) DO NOTHING; -- Avoid error if user is somehow already in tenant (should not happen for new signups via invite)
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to call the function after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_new_user_created_add_to_tenant ON auth.users;
CREATE TRIGGER on_new_user_created_add_to_tenant
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_add_to_tenant();

COMMENT ON FUNCTION public.handle_new_user_add_to_tenant() IS 'Adds a newly signed-up user to a tenant if they have invitation metadata (invited_tenant_id, invited_role).';
COMMENT ON TRIGGER on_new_user_created_add_to_tenant ON auth.users IS 'When a new user is created, automatically add them to the tenant they were invited to, based on metadata.';

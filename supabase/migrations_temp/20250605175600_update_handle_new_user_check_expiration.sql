-- Function to add a newly signed-up user to a tenant if they were invited
-- and the invitation has not expired.
CREATE OR REPLACE FUNCTION public.handle_new_user_add_to_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Necessary to insert into public.tenant_users
AS $$
DECLARE
  invited_tenant_id UUID;
  invited_role TEXT;
  invitation_expires_at_text TEXT;
  invitation_expires_at_timestamp TIMESTAMPTZ;
BEGIN
  -- Extract tenant_id, role, and expiration from the new user's metadata (raw_app_meta_data)
  invited_tenant_id := (NEW.raw_app_meta_data->>'invited_tenant_id')::UUID;
  invited_role := COALESCE(NEW.raw_app_meta_data->>'invited_role', 'member'); -- Default to 'member' if not specified
  invitation_expires_at_text := NEW.raw_app_meta_data->>'invitation_expires_at';

  -- If invited_tenant_id is present in metadata, proceed with checks
  IF invited_tenant_id IS NOT NULL THEN
    -- Check if invitation_expires_at_text is present and valid
    IF invitation_expires_at_text IS NOT NULL THEN
      BEGIN
        invitation_expires_at_timestamp := invitation_expires_at_text::TIMESTAMPTZ;
        -- Check if the current time is past the expiration time
        IF NOW() > invitation_expires_at_timestamp THEN
          RAISE NOTICE 'Invitation for user % to tenant % has expired at %. User not added.', NEW.id, invited_tenant_id, invitation_expires_at_timestamp;
          RETURN NEW; -- Do not add user to tenant if invitation expired
        END IF;
      EXCEPTION WHEN others THEN
        -- Log a warning if the timestamp format is invalid, but proceed as if no expiration.
        -- Alternatively, one could choose to reject the invitation if the format is invalid.
        RAISE WARNING 'Invalid invitation_expires_at format for user % (tenant %): %. Proceeding without expiration check.', NEW.id, invited_tenant_id, invitation_expires_at_text;
      END;
    END IF;

    -- If no expiration metadata, or if present and not expired, add the user to the tenant_users table
    INSERT INTO public.tenant_users (tenant_id, user_id, role)
    VALUES (invited_tenant_id, NEW.id, invited_role)
    ON CONFLICT (tenant_id, user_id) DO NOTHING; -- Avoid error if user is somehow already in tenant
  END IF;

  RETURN NEW;
END;
$$;

-- It's good practice to drop and recreate the trigger to ensure it picks up the new function definition,
-- especially if the function signature or behavior changes significantly.
-- However, since the signature is the same, simply replacing the function body is often sufficient.
-- For clarity and safety, we'll explicitly drop and recreate.

DROP TRIGGER IF EXISTS on_new_user_created_add_to_tenant ON auth.users;
CREATE TRIGGER on_new_user_created_add_to_tenant
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_add_to_tenant();

COMMENT ON FUNCTION public.handle_new_user_add_to_tenant() IS 'Adds a newly signed-up user to a tenant if they have invitation metadata (invited_tenant_id, invited_role) and the invitation (if time-limited) has not expired.';
COMMENT ON TRIGGER on_new_user_created_add_to_tenant ON auth.users IS 'When a new user is created, automatically add them to the tenant they were invited to, based on metadata and invitation validity (expiration check).';

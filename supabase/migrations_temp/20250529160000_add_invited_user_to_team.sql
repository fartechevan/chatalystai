-- supabase/migrations/20250529160000_add_invited_user_to_team.sql

-- Function to add user to team_users table based on invitation metadata
CREATE OR REPLACE FUNCTION public.add_user_to_team_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Important for accessing auth.users and inserting into team_users
AS $$
DECLARE
  invited_team_id UUID;
  user_role TEXT;
BEGIN
  -- Extract team_id from the new user's metadata
  -- This metadata is set by the invite-team-member function
  invited_team_id := (NEW.raw_user_meta_data->>'team_id')::UUID;
  user_role := 'member'; -- Default role for invited users

  -- If team_id is present in metadata, add the user to the team_users table
  IF invited_team_id IS NOT NULL THEN
    INSERT INTO public.team_users (team_id, user_id, role)
    VALUES (invited_team_id, NEW.id, user_role)
    ON CONFLICT (team_id, user_id) DO NOTHING; -- Avoid error if user is already in team (should not happen for new signups)
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to call the function after a new user is created in auth.users
CREATE TRIGGER on_new_user_created_add_to_team
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.add_user_to_team_on_signup();

-- Grant usage on the sequence if your team_users table has an auto-incrementing ID (if applicable)
-- This is often not needed if team_id and user_id are primary keys.
-- Example: GRANT USAGE, SELECT ON SEQUENCE public.team_users_id_seq TO authenticated, service_role;

COMMENT ON FUNCTION public.add_user_to_team_on_signup() IS 'Adds a newly signed-up user to a team if they were invited with team_id in metadata.';
COMMENT ON TRIGGER on_new_user_created_add_to_team ON auth.users IS 'When a new user is created, automatically add them to the team they were invited to.';

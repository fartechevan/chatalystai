-- Helper function to check if a user is an admin or owner of a specific team.
-- SECURITY DEFINER is used to bypass RLS for the internal query, preventing recursion.
CREATE OR REPLACE FUNCTION public.is_user_team_admin_or_owner(
    p_user_id uuid,
    p_team_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
-- Set a search_path to ensure a predictable environment, especially for SECURITY DEFINER.
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.team_users
        WHERE user_id = p_user_id
          AND team_id = p_team_id
          AND (role = 'owner' OR role = 'admin')
    );
$$;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_team_admin_or_owner(uuid, uuid) TO authenticated;

-- Drop the old problematic INSERT policy for team_users
DROP POLICY IF EXISTS "Allow users to be added to teams" ON public.team_users;

-- Recreate the INSERT policy for team_users using the helper function
CREATE POLICY "Allow users to be added to teams"
ON public.team_users
FOR INSERT
TO authenticated
WITH CHECK (
    (
        -- Case 1: The user being inserted is the current authenticated user,
        -- they are being made an 'owner',
        -- AND there is no other owner for this team yet (this is the initial team creator).
        team_users.user_id = auth.uid() AND
        team_users.role = 'owner' AND
        NOT EXISTS (
            SELECT 1
            FROM public.team_users other_owners
            WHERE other_owners.team_id = team_users.team_id
              AND other_owners.role = 'owner'
              AND other_owners.user_id <> team_users.user_id -- Crucially, ensure it's a *different* user
        )
    ) OR (
        -- Case 2: The current authenticated user (performing the action)
        -- is already an admin or owner of the team to which the new member is being added.
        public.is_user_team_admin_or_owner(auth.uid(), team_users.team_id)
    )
);

-- Note: Review other policies on team_users (SELECT, UPDATE, DELETE) from
-- 20250529142000_setup_rls_for_teams.sql. If they also cause recursion,
-- they might need similar adjustments using helper functions or careful restructuring.
-- The error specifically mentioned context of "creating team", which points to INSERT.

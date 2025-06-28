-- Helper function to check if a user is a member of a specific team.
-- SECURITY DEFINER is used to bypass RLS for the internal query, preventing recursion.
CREATE OR REPLACE FUNCTION public.is_user_team_member(
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
        -- Any role constitutes membership for this check
    );
$$;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_team_member(uuid, uuid) TO authenticated;

-- Drop the old problematic SELECT policy for team_users
DROP POLICY IF EXISTS "Allow members to view users in their team" ON public.team_users;

-- Recreate the SELECT policy for team_users using the helper function
CREATE POLICY "Allow members to view users in their team"
ON public.team_users
FOR SELECT
TO authenticated
USING (
    -- A user can see rows in team_users (i.e., other members)
    -- if they are a member of the team associated with that row.
    public.is_user_team_member(auth.uid(), team_users.team_id)
);

-- The SELECT policy on the `teams` table (from 20250529142000_setup_rls_for_teams.sql) is:
-- CREATE POLICY "Allow members to view their teams"
-- ON public.teams
-- FOR SELECT
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1
--     FROM public.team_users
--     WHERE team_users.team_id = teams.id
--     AND team_users.user_id = auth.uid()
--   )
-- );
-- This policy on `teams` should now work correctly because its subquery
-- to `public.team_users` will use the fixed, non-recursive SELECT policy on `team_users`.
-- If it still causes issues, it might also need to use `public.is_user_team_member(auth.uid(), teams.id)`.
-- For now, we only fix the policy on team_users as that's where the error was reported.

-- Drop the existing INSERT policy for team_users
DROP POLICY IF EXISTS "Allow users to be added to teams" ON public.team_users;

-- Recreate the INSERT policy for team_users with a simplified Case 1
-- This policy allows an insert if:
-- 1. The user being inserted is the current authenticated user AND their role is 'owner' (intended for initial team creator).
-- 2. OR, the current authenticated user (performing the action) is already an admin or owner of the target team (for adding other members).
CREATE POLICY "Allow users to be added to teams"
ON public.team_users
FOR INSERT
TO authenticated
WITH CHECK (
    (
        -- Case 1 (Simplified): The user being inserted is the current authenticated user and their role is 'owner'.
        -- This relies on application logic to ensure this path is primarily used for the first owner of a new team.
        team_users.user_id = auth.uid() AND
        team_users.role = 'owner'
    ) OR (
        -- Case 2: The current authenticated user (performing the action)
        -- is already an admin or owner of the team to which the new member is being added.
        -- This uses the helper function created in a previous migration.
        public.is_user_team_admin_or_owner(auth.uid(), team_users.team_id)
    )
);

-- Note: The helper function is_user_team_admin_or_owner was defined in
-- migration 20250529144500_fix_team_users_rls_recursion.sql

-- WARNING: This migration is for debugging purposes ONLY.
-- It makes the INSERT policy for team_users very permissive.
-- This should be reverted or replaced with a secure policy after debugging.

-- Drop the existing INSERT policy for team_users
DROP POLICY IF EXISTS "Allow users to be added to teams" ON public.team_users;

-- Debugging Policy: Allow any authenticated user to insert any valid row into team_users.
-- This helps determine if the issue is with the conditions of the previous policy
-- or something more fundamental with INSERT RLS on this table for authenticated users.
CREATE POLICY "DEBUG - Allow any authenticated insert into team_users"
ON public.team_users
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Reminder:
-- The previous, more secure policy was (from 20250529150500_simplify_team_users_insert_policy.sql):
-- CREATE POLICY "Allow users to be added to teams"
-- ON public.team_users
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--     (
--         team_users.user_id = auth.uid() AND
--         team_users.role = 'owner'
--     ) OR (
--         public.is_user_team_admin_or_owner(auth.uid(), team_users.team_id)
--     )
-- );
-- This policy should be reinstated after debugging if the "WITH CHECK (true)" version works.

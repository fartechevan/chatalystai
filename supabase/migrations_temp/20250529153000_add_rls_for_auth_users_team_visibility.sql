-- Grant usage on schema auth to authenticated role if not already granted
-- This is often default but good to ensure.
-- Supabase handles this, so this might be redundant but harmless.
-- GRANT USAGE ON SCHEMA auth TO authenticated;

-- Grant select on auth.users to authenticated role if not already granted
-- Supabase handles this, so this might be redundant but harmless.
-- GRANT SELECT ON TABLE auth.users TO authenticated;

-- Enable RLS on auth.users if not already enabled (Supabase default enables it)
-- ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to view basic information (id, email) of other users
-- if they share a common team.
CREATE POLICY "Allow team members to view each other's basic info"
ON auth.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu_current_user -- Team memberships of the currently authenticated user
    JOIN public.team_users tu_target_user -- Team memberships of the user whose profile is being queried
      ON tu_current_user.team_id = tu_target_user.team_id
    WHERE tu_current_user.user_id = auth.uid() -- Link to the currently authenticated user
      AND tu_target_user.user_id = auth.users.id -- Link to the user row in auth.users being considered for selection
  )
);

-- Note: If you have other SELECT policies on auth.users, ensure they are compatible.
-- For example, users should always be able to select their own profile.
-- Supabase's default "Users can view their own data" policy is usually:
-- CREATE POLICY "Users can view their own data" ON auth.users
-- FOR SELECT USING (auth.uid() = id);
-- If such a policy exists, the new policy will act permissively alongside it (OR condition).
-- If no such specific "select own data" policy exists, you might want to add one,
-- or ensure this new policy also covers auth.uid() = auth.users.id implicitly
-- (which it does if a user is in a team with themselves, typically not the case unless they are the only member).
-- However, the common scenario is that a user is always in at least one team they create,
-- and the check `tu_current_user.user_id = auth.uid() AND tu_target_user.user_id = auth.users.id`
-- where `auth.uid() = auth.users.id` would mean `tu_current_user.user_id = tu_target_user.user_id`.
-- If `tu_current_user.team_id = tu_target_user.team_id` holds, this means the user can see their own profile
-- if they are part of any team. A separate "select own data" policy is more robust.
-- Supabase usually has this by default.

-- Enable RLS for teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to create new teams
CREATE POLICY "Allow authenticated users to create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow users to view teams they are a member of
CREATE POLICY "Allow members to view their teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users
    WHERE team_users.team_id = teams.id
    AND team_users.user_id = auth.uid()
  )
);

-- Policy: Allow team owners or admins to update team details
CREATE POLICY "Allow owners/admins to update their teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users
    WHERE team_users.team_id = teams.id
    AND team_users.user_id = auth.uid()
    AND (team_users.role = 'owner' OR team_users.role = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_users
    WHERE team_users.team_id = teams.id
    AND team_users.user_id = auth.uid()
    AND (team_users.role = 'owner' OR team_users.role = 'admin')
  )
);

-- Policy: Allow team owners to delete their teams
CREATE POLICY "Allow owners to delete their teams"
ON public.teams
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users
    WHERE team_users.team_id = teams.id
    AND team_users.user_id = auth.uid()
    AND team_users.role = 'owner'
  )
);


-- Enable RLS for team_users table
ALTER TABLE public.team_users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to be added to a team (e.g., by an admin or as initial owner)
-- This policy is quite open for insert; specific logic for who can add whom is often in security definer functions or app layer.
-- For the `createTeam` flow, the app inserts the current user as 'owner'.
CREATE POLICY "Allow users to be added to teams"
ON public.team_users
FOR INSERT
TO authenticated
WITH CHECK (
    -- Case 1: A user is adding themselves (e.g. as the first owner)
    (user_id = auth.uid()) OR
    -- Case 2: An admin/owner of the team is adding another user
    (EXISTS (
        SELECT 1
        FROM public.team_users tu_admin
        WHERE tu_admin.team_id = team_users.team_id -- team_id of the row being inserted
        AND tu_admin.user_id = auth.uid()
        AND (tu_admin.role = 'owner' OR tu_admin.role = 'admin')
    ))
);


-- Policy: Allow team members to view users in their team
CREATE POLICY "Allow members to view users in their team"
ON public.team_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu_viewer
    WHERE tu_viewer.team_id = team_users.team_id
    AND tu_viewer.user_id = auth.uid()
  )
);

-- Policy: Allow team owners/admins to update roles or remove users from their team
CREATE POLICY "Allow owners/admins to manage team members"
ON public.team_users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu_admin
    WHERE tu_admin.team_id = team_users.team_id
    AND tu_admin.user_id = auth.uid()
    AND (tu_admin.role = 'owner' OR tu_admin.role = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_users tu_admin
    WHERE tu_admin.team_id = team_users.team_id
    AND tu_admin.user_id = auth.uid()
    AND (tu_admin.role = 'owner' OR tu_admin.role = 'admin')
  )
  -- Additional check: Prevent non-owners from making someone else an owner
  -- And prevent non-owners from changing an owner's role
  AND (
    NOT (team_users.role = 'owner' AND (SELECT role FROM public.team_users WHERE id = team_users.id) <> 'owner' AND NOT EXISTS (SELECT 1 FROM public.team_users WHERE team_id = team_users.team_id AND user_id = auth.uid() AND role = 'owner'))
  )
  AND (
    NOT ((SELECT role FROM public.team_users WHERE id = team_users.id) = 'owner' AND team_users.user_id <> auth.uid() AND NOT EXISTS (SELECT 1 FROM public.team_users WHERE team_id = team_users.team_id AND user_id = auth.uid() AND role = 'owner'))
  )
);


CREATE POLICY "Allow owners/admins to remove users from their team"
ON public.team_users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu_admin
    WHERE tu_admin.team_id = team_users.team_id
    AND tu_admin.user_id = auth.uid()
    AND (tu_admin.role = 'owner' OR tu_admin.role = 'admin')
  )
  -- Prevent user from removing themselves if they are the last owner
  AND NOT (
    team_users.user_id = auth.uid() AND
    team_users.role = 'owner' AND
    (SELECT COUNT(*) FROM public.team_users WHERE team_id = team_users.team_id AND role = 'owner') = 1
  )
  -- Prevent non-owners from removing an owner
  AND NOT (
    (SELECT role FROM public.team_users WHERE id = team_users.id) = 'owner' AND
    NOT EXISTS (SELECT 1 FROM public.team_users WHERE team_id = team_users.team_id AND user_id = auth.uid() AND role = 'owner')
  )
);

-- Allow users to remove themselves (leave team), unless they are the last owner.
CREATE POLICY "Allow users to leave a team"
ON public.team_users
FOR DELETE
TO authenticated
USING (
  team_users.user_id = auth.uid()
  AND NOT (
    team_users.role = 'owner' AND
    (SELECT COUNT(*) FROM public.team_users WHERE team_id = team_users.team_id AND role = 'owner') = 1
  )
);

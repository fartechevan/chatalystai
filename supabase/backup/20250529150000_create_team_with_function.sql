-- Function to create a new team, bypassing RLS for the 'teams' table insert.
-- The user creating the team will subsequently be added as an owner by client-side logic,
-- which will be subject to 'team_users' RLS.
CREATE OR REPLACE FUNCTION public.create_new_team(p_name text)
RETURNS SETOF public.teams -- Returns the newly created team row
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a search_path to ensure a predictable environment.
SET search_path = public
AS $$
BEGIN
  -- This INSERT runs as the function owner, bypassing RLS for 'teams' table.
  RETURN QUERY
  INSERT INTO public.teams (name)
  VALUES (p_name)
  RETURNING *;
  -- Note: If you need to ensure the calling user (auth.uid()) is logged,
  -- you might add a check like: IF auth.uid() IS NULL THEN RAISE EXCEPTION ...;
  -- However, Supabase client usually ensures auth before .rpc() calls.
END;
$$;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.create_new_team(text) TO authenticated;

-- It's assumed that the RLS INSERT policy on 'teams' table:
-- "Allow authenticated users to create teams" (TO authenticated WITH CHECK (true))
-- might be causing issues due to session context with RLS.
-- This function provides an alternative way to insert into 'teams'.
-- The original RLS INSERT policy on 'teams' can be kept or removed.
-- If kept, it might serve as a fallback or for other insert paths if any.
-- For now, we leave it, as this function is an additive approach.

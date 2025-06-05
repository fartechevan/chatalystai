-- Add team_id column to customers table
ALTER TABLE public.customers
ADD COLUMN team_id UUID REFERENCES public.teams(id);

COMMENT ON COLUMN public.customers.team_id IS 'Foreign key referencing the team this customer belongs to.';

-- Enable Row Level Security for customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers table

-- Policy: Allow team members to read customers associated with their team
CREATE POLICY "Allow team members to read customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = customers.team_id
    AND tu.user_id = auth.uid()
  )
);

-- Policy: Allow team members to insert customers for their team
CREATE POLICY "Allow team members to insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = customers.team_id -- Ensures the new customer is associated with one of the user's teams
    AND tu.user_id = auth.uid()
  )
  -- It's also good practice to ensure that if team_id is provided, it's a valid team for the user.
  -- The above EXISTS check already covers this if team_id is part of the INSERT statement.
  -- If team_id might be NULL and set by a trigger, the trigger should handle team assignment.
  -- For now, we assume team_id is provided during insert.
);

-- Policy: Allow team owners or admins to update customers associated with their team
CREATE POLICY "Allow team owners or admins to update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = customers.team_id
    AND tu.user_id = auth.uid()
    AND (tu.role = 'owner' OR tu.role = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = customers.team_id
    AND tu.user_id = auth.uid()
    AND (tu.role = 'owner' OR tu.role = 'admin')
  )
  -- Ensure the team_id is not changed to a team the user doesn't have admin/owner rights for, if it's being updated.
  -- This check is implicitly handled if the USING clause must pass for the new row state.
);

-- Policy: Allow team owners to delete customers associated with their team
CREATE POLICY "Allow team owners to delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = customers.team_id
    AND tu.user_id = auth.uid()
    AND tu.role = 'owner'
  )
);

-- Optional: Consider a function and trigger to update the 'updated_at' timestamp if not already present
-- CREATE OR REPLACE FUNCTION public.update_customers_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--    NEW.updated_at = timezone('utc'::text, now());
--    RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- CREATE TRIGGER update_customers_modtime
-- BEFORE UPDATE ON public.customers
-- FOR EACH ROW
-- EXECUTE FUNCTION public.update_customers_updated_at_column();

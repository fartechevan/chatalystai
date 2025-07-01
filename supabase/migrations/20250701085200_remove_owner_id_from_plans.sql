-- Drop existing RLS policies on plans table that reference owner_id
DROP POLICY IF EXISTS "Allow individual access to plans" ON public.plans;
DROP POLICY IF EXISTS "Allow admin update access to plans" ON public.plans;
DROP POLICY IF EXISTS "Allow admin delete access to plans" ON public.plans;
DROP POLICY IF EXISTS "Allow insert for admins and owners" ON public.plans;
DROP POLICY IF EXISTS "Allow admin full access to plans" ON public.plans;

-- Drop the owner_id column from the plans table
ALTER TABLE public.plans DROP COLUMN IF EXISTS owner_id;

-- Recreate a simple RLS policy for public read access
CREATE POLICY "Allow public read access to plans"
ON public.plans
FOR SELECT
USING (true);

-- Allow service_role to bypass RLS
CREATE POLICY "Allow service role full access to plans"
ON public.plans
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

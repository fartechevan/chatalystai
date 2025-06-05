-- Make customers table shared among all authenticated users and update RLS policies

-- Step 1: Drop all existing RLS policies from customers table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
        FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customers' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.customers;';
        END LOOP;
    END IF;
END;
$$;

-- Step 2: Drop the profile_id column (this will also drop associated FK constraints and indexes)
ALTER TABLE public.customers
DROP COLUMN IF EXISTS profile_id;

-- Step 3: Enable Row Level Security (if not already enabled, this is safe to run)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new RLS policies allowing all authenticated users access
CREATE POLICY "Allow all authenticated users to read customers"
ON public.customers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (true);

COMMENT ON TABLE public.customers IS 'Stores customer information, shared among all authenticated users of the project.';

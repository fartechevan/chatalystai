-- Revert the creation of the contacts table and its associated objects

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS update_contacts_modtime ON public.contacts;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.update_contacts_updated_at_column();

-- Drop RLS policies if they exist (these are often dropped when the table is dropped, but explicit is safer)
-- Policy names were:
-- "Users can read their own contacts"
-- "Users can insert their own contacts"
-- "Users can update their own contacts"
-- "Users can delete their own contacts"
-- Supabase handles policy dropping automatically when the table is dropped if policies were created with default naming.
-- If specific names were used and not default, explicit DROP POLICY commands would be needed.
-- For now, we assume policies are dropped with the table or use a generic loop if needed.
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contacts'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_name) || ' ON public.contacts;';
    END LOOP;
END $$;


-- Drop the index if it exists
DROP INDEX IF EXISTS public.idx_contacts_profile_id;

-- Drop the contacts table if it exists
DROP TABLE IF EXISTS public.contacts;

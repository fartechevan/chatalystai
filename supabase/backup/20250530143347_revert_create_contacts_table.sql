-- Drop RLS policies (these are often dropped when the table is dropped, but explicit is safer if any remain)
-- Supabase might handle policy dropping automatically when the table is dropped.
-- If not, specific DROP POLICY commands would be needed here.
-- For now, we assume policies are dropped with the table.

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS update_contacts_modtime ON public.contacts;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.update_contacts_updated_at_column();

-- Drop the contacts table if it exists
DROP TABLE IF EXISTS public.contacts;

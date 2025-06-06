-- Migration to drop the token_usage table

DROP TABLE IF EXISTS public.token_usage;

-- If you had specific RLS policies or grants on this table that were created
-- outside of the original migration and need explicit cleanup, add those DROP statements here.
-- For example:
-- DROP POLICY IF EXISTS "Allow service_role to manage token_usage" ON public.token_usage;
-- DROP POLICY IF EXISTS "Allow authenticated users to view their own usage" ON public.token_usage;
-- etc.

-- However, simply dropping the table usually cascades and removes associated policies and grants.

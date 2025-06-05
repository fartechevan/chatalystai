-- This migration drops the old team_id columns after data has been migrated to tenant_id.
-- Apply this migration AFTER manually populating the new tenant_id columns in all relevant tables.

-- 1. Drop team_id from tenants table
ALTER TABLE public.tenants
DROP CONSTRAINT IF EXISTS tenants_team_id_fkey; -- Adjust constraint name if different
DROP INDEX IF EXISTS public.idx_tenants_team_id;
ALTER TABLE public.tenants
DROP COLUMN IF EXISTS team_id;

-- Update comment for tenants table to reflect final state without team_id
COMMENT ON TABLE public.tenants IS 'Stores tenant information, linked to an owner profile. Users can be added to tenants via the tenant_users table. The team_id column has been removed.';

-- 2. Drop team_id from integrations table
ALTER TABLE public.integrations DROP COLUMN IF EXISTS team_visibility; -- This was tied to team_id
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_team_id_fkey; -- Adjust if name differs
DROP INDEX IF EXISTS public.idx_integrations_team_id; -- If an index was specifically on team_id
ALTER TABLE public.integrations DROP COLUMN IF EXISTS team_id;

-- 3. Drop team_id from leads table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads' AND table_schema = 'public') THEN
        ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_team_id_fkey; -- Adjust if name differs
        DROP INDEX IF EXISTS public.idx_leads_team_id; -- If an index was specifically on team_id
        ALTER TABLE public.leads DROP COLUMN IF EXISTS team_id;
    END IF;
END $$;

-- 4. Drop team_id from pipelines table
ALTER TABLE public.pipelines DROP CONSTRAINT IF EXISTS pipelines_team_id_fkey; -- Adjust if name differs
DROP INDEX IF EXISTS public.idx_pipelines_team_id; -- If an index was specifically on team_id
ALTER TABLE public.pipelines DROP COLUMN IF EXISTS team_id;

-- 5. Drop team_id from batch_sentiment_analysis table
ALTER TABLE public.batch_sentiment_analysis DROP CONSTRAINT IF EXISTS batch_sentiment_analysis_team_id_fkey; -- Adjust if name differs
DROP INDEX IF EXISTS public.idx_batch_sentiment_analysis_team_id; -- If an index was specifically on team_id
ALTER TABLE public.batch_sentiment_analysis DROP COLUMN IF EXISTS team_id;

-- 6. Drop team_id from conversations table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'team_id') THEN
        ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_team_id_fkey; -- Adjust if name differs
        DROP INDEX IF EXISTS public.idx_conversations_team_id; -- If an index was specifically on team_id
        ALTER TABLE public.conversations DROP COLUMN IF EXISTS team_id;
    END IF;
END $$;

-- 7. Drop team_id from customers table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'team_id') THEN
        ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_team_id_fkey; -- Adjust if name differs
        DROP INDEX IF EXISTS public.idx_customers_team_id; -- If an index was specifically on team_id
        ALTER TABLE public.customers DROP COLUMN IF EXISTS team_id;
    END IF;
END $$;

-- 8. Drop team_id from plans table
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_team_id_fkey; -- Adjust if name differs
DROP INDEX IF EXISTS public.idx_plans_team_id; -- If an index was specifically on team_id
ALTER TABLE public.plans DROP COLUMN IF EXISTS team_id;

-- 9. Drop team_id from subscriptions table
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_team_id_fkey; -- Adjust if name differs
DROP INDEX IF EXISTS public.idx_subscriptions_team_id; -- If an index was specifically on team_id
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS team_id;

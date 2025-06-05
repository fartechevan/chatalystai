-- This migration retargets tables that previously used team_id to use tenant_id.
-- IMPORTANT: A data migration step is required between adding tenant_id and dropping team_id.
-- You must manually run SQL queries to populate the new tenant_id columns
-- based on the old team_id and the tenants table (joining via tenants.team_id
-- before that column is removed by the previous migration).
-- Example for one table (run this for each table after adding tenant_id and before dropping team_id):
--
-- UPDATE public.batch_sentiment_analysis bsa
-- SET tenant_id = (SELECT t.id FROM public.tenants t WHERE t.team_id = bsa.team_id)
-- WHERE bsa.team_id IS NOT NULL;
--
-- Repeat for integrations, leads, pipelines, conversations, customers.

-- 1. Table: integrations
ALTER TABLE public.integrations
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON public.integrations(tenant_id);
COMMENT ON COLUMN public.integrations.tenant_id IS 'Foreign key referencing the tenant that owns this integration definition.';
-- (Data migration for integrations.tenant_id should be done here)
-- team_id column, its FK, index, and team_visibility will be dropped in a later migration.

-- 2. Table: leads (assuming 'leads' is the correct table name)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads' AND table_schema = 'public') THEN
        ALTER TABLE public.leads
        ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON public.leads(tenant_id);
        COMMENT ON COLUMN public.leads.tenant_id IS 'Foreign key referencing the tenant that owns this lead.';
        -- (Data migration for leads.tenant_id should be done here)
        -- team_id column, its FK, and index will be dropped in a later migration.
    END IF;
END $$;

-- 3. Table: pipelines
ALTER TABLE public.pipelines
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON public.pipelines(tenant_id);
COMMENT ON COLUMN public.pipelines.tenant_id IS 'Foreign key referencing the tenant that owns this pipeline.';
-- (Data migration for pipelines.tenant_id should be done here)
-- team_id column, its FK, and index will be dropped in a later migration.

-- 4. Table: batch_sentiment_analysis
ALTER TABLE public.batch_sentiment_analysis
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_batch_sentiment_analysis_tenant_id ON public.batch_sentiment_analysis(tenant_id);
COMMENT ON COLUMN public.batch_sentiment_analysis.tenant_id IS 'Foreign key referencing the tenant for this sentiment analysis.';
-- (Data migration for batch_sentiment_analysis.tenant_id should be done here)
-- team_id column, its FK, and index will be dropped in a later migration.

-- 5. Table: conversations
-- Assuming conversations table has team_id. Check its DDL if unsure.
-- The migration 20250529131700_add_team_id_to_tables.sql suggests it might not have been explicitly listed
-- but was a general pattern. If it has team_id, it needs this change.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'team_id') THEN
        ALTER TABLE public.conversations
        ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON public.conversations(tenant_id);
        COMMENT ON COLUMN public.conversations.tenant_id IS 'Foreign key referencing the tenant for this conversation.';
        -- (Data migration for conversations.tenant_id should be done here)
        -- team_id column, its FK, and index will be dropped in a later migration.
    END IF;
END $$;

-- 6. Table: customers
-- (Assuming customers table exists and has team_id from 20250605113530_add_team_id_and_rls_to_customers.sql)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'team_id') THEN
        ALTER TABLE public.customers
        ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
        COMMENT ON COLUMN public.customers.tenant_id IS 'Foreign key referencing the tenant for this customer.';
        -- (Data migration for customers.tenant_id should be done here)
        -- team_id column, its FK, and index will be dropped in a later migration.
    END IF;
END $$;

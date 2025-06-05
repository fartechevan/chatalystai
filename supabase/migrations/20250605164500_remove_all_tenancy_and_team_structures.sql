-- Comprehensive migration to remove all team and tenant structures.

-- Step 1: Drop All RLS Policies from affected tables (MUST RUN FIRST)
DO $$
DECLARE
    table_name_var TEXT;
    policy_record RECORD;
BEGIN
    FOREACH table_name_var IN ARRAY ARRAY[
        'customers', 'batch_sentiment_analysis', 'leads', 'pipelines', 
        'integrations', 'integrations_config', 'plans', 'subscriptions', 
        'ai_agents', -- if it exists and had tenant/team scoping
        'conversations', -- if it exists and had tenant/team scoping
        'tenant_users', 'tenants', 'team_users', 'teams' -- tables to be dropped
    ]
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name_var) THEN
            FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name_var LOOP
                EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.' || quote_ident(table_name_var) || ';';
            END LOOP;
        END IF;
    END LOOP;

    -- Specific known policies on auth.users
    DROP POLICY IF EXISTS "Allow team members to view each other's basic info" ON auth.users;
END;
$$;

-- Step 2: Drop Triggers and Functions related to tenants and teams

-- From ...132000_add_trigger_handle_new_user_to_tenant.sql
DROP TRIGGER IF EXISTS on_new_user_created_add_to_tenant ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_add_to_tenant();

-- From ...115500_simplify_tenancy_add_tenant_users_modify_tenants.sql (tenant owner trigger)
DROP TRIGGER IF EXISTS trigger_add_owner_to_tenant_users ON public.tenants;
DROP FUNCTION IF EXISTS public.add_owner_to_tenant_users();

-- RLS Helper functions from ...115700_update_rls_policies_for_tenant_model.sql
DROP FUNCTION IF EXISTS public.is_tenant_member(UUID, UUID);
DROP FUNCTION IF EXISTS public.has_tenant_role(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.has_any_tenant_role(UUID, UUID, TEXT[]);

-- Batch sentiment analysis trigger (was updated to use tenant_id)
DROP TRIGGER IF EXISTS set_batch_sentiment_analysis_tenant_id_trigger ON public.batch_sentiment_analysis;
DROP FUNCTION IF EXISTS public.set_batch_sentiment_analysis_tenant_id();
-- Also drop the old team-based one if it somehow lingered
DROP TRIGGER IF EXISTS set_batch_sentiment_analysis_team_id_trigger ON public.batch_sentiment_analysis;
DROP FUNCTION IF EXISTS public.set_batch_sentiment_analysis_team_id();


-- Old team-related functions/triggers (from ...115800_cleanup_old_team_objects.sql - defensive drop)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_users') THEN
        DROP TRIGGER IF EXISTS on_new_team_owner_create_tenant_trigger ON public.team_users;
    END IF;
END $$;
DROP FUNCTION IF EXISTS public.handle_new_team_owner_create_tenant();
DROP TRIGGER IF EXISTS on_new_subscription_create_personal_tenant_trigger ON public.subscriptions;
DROP FUNCTION IF EXISTS public.handle_new_subscription_create_personal_tenant();
DROP FUNCTION IF EXISTS public.create_new_team(text);
DROP TRIGGER IF EXISTS on_new_user_created_add_to_team ON auth.users;
DROP FUNCTION IF EXISTS public.add_user_to_team_on_signup();

-- Step 2: Drop All RLS Policies from affected tables
DO $$
DECLARE
    table_name_var TEXT;
    policy_record RECORD;
BEGIN
    FOREACH table_name_var IN ARRAY ARRAY[
        'customers', 'batch_sentiment_analysis', 'leads', 'pipelines', 
        'integrations', 'integrations_config', 'plans', 'subscriptions', 
        'ai_agents', -- if it exists and had tenant/team scoping
        'conversations', -- if it exists and had tenant/team scoping
        'tenant_users', 'tenants', 'team_users', 'teams' -- tables to be dropped
    ]
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name_var) THEN
            FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name_var LOOP
                EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.' || quote_ident(table_name_var) || ';';
            END LOOP;
        END IF;
    END LOOP;

    -- Specific known policies on auth.users
    -- DROP POLICY IF EXISTS "Allow team members to view each other's basic info" ON auth.users; -- This is already in the block at the top
END;
$$;

-- Step 3: Drop tenant_id and team_id columns (and related constraints/indexes) from all relevant tables

-- List of tables that might have had tenant_id or team_id
-- For each table: Drop FK, Drop Index, Drop Column for both tenant_id and team_id
-- Using DO blocks to handle IF EXISTS for tables/columns gracefully.

-- Table: tenants (will be dropped later, but clean its own FKs first if any remained)
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_owner_profile_id_fkey;
-- team_id FK should be gone, but defensive drop:
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_team_id_fkey;

-- Table: integrations_config
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS integrations_config_tenant_id_fkey;
ALTER TABLE public.integrations_config DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS integrations_config_team_id_fkey; -- If it ever had one
ALTER TABLE public.integrations_config DROP COLUMN IF EXISTS team_id; -- If it ever had one

-- Table: integrations
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_tenant_id_fkey;
ALTER TABLE public.integrations DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_team_id_fkey;
ALTER TABLE public.integrations DROP COLUMN IF EXISTS team_visibility;
ALTER TABLE public.integrations DROP COLUMN IF EXISTS team_id;

-- Table: leads
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads' AND table_schema = 'public') THEN
    ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_tenant_id_fkey;
    ALTER TABLE public.leads DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_team_id_fkey;
    ALTER TABLE public.leads DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: pipelines
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pipelines' AND table_schema = 'public') THEN
    ALTER TABLE public.pipelines DROP CONSTRAINT IF EXISTS pipelines_tenant_id_fkey;
    ALTER TABLE public.pipelines DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.pipelines DROP CONSTRAINT IF EXISTS pipelines_team_id_fkey;
    ALTER TABLE public.pipelines DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: batch_sentiment_analysis
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'batch_sentiment_analysis' AND table_schema = 'public') THEN
    ALTER TABLE public.batch_sentiment_analysis DROP CONSTRAINT IF EXISTS batch_sentiment_analysis_tenant_id_fkey;
    ALTER TABLE public.batch_sentiment_analysis DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.batch_sentiment_analysis DROP CONSTRAINT IF EXISTS batch_sentiment_analysis_team_id_fkey;
    ALTER TABLE public.batch_sentiment_analysis DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: conversations
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations' AND table_schema = 'public') THEN
    ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_tenant_id_fkey;
    ALTER TABLE public.conversations DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_team_id_fkey;
    ALTER TABLE public.conversations DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: customers
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
    ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_tenant_id_fkey;
    ALTER TABLE public.customers DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_team_id_fkey;
    ALTER TABLE public.customers DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: plans
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'plans' AND table_schema = 'public') THEN
    ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_tenant_id_fkey;
    ALTER TABLE public.plans DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_team_id_fkey;
    ALTER TABLE public.plans DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: subscriptions
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriptions' AND table_schema = 'public') THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tenant_id_fkey;
    ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_team_id_fkey;
    ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: ai_agents (if it exists and had these columns)
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_agents' AND table_schema = 'public') THEN
    ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_tenant_id_fkey;
    ALTER TABLE public.ai_agents DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_team_id_fkey;
    ALTER TABLE public.ai_agents DROP COLUMN IF EXISTS team_id;
END IF; END $$;


-- Step 4: Drop Tenant and Team Tables
DROP TABLE IF EXISTS public.tenant_users;
DROP TABLE IF EXISTS public.tenants;
DROP TABLE IF EXISTS public.team_users; -- Should be gone, but defensive
DROP TABLE IF EXISTS public.teams;     -- Should be gone, but defensive

-- Step 5: Update comments on any remaining tables if necessary (most are dropped or columns removed)
-- Example: COMMENT ON TABLE public.some_table IS 'Simplified model without team/tenant scoping.';

SELECT 'All team and tenant structures removal script executed.';

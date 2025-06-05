-- This migration updates Row Level Security (RLS) policies to use tenant_id
-- and the new public.tenant_users table, replacing team_id based security.

-- Force drop ALL RLS policies from plans and subscriptions to ensure clean slate
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies from 'plans'
    FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plans' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.plans;';
    END LOOP;

    -- Drop all policies from 'subscriptions'
    FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.subscriptions;';
    END LOOP;
END;
$$;

-- Drop any old RLS policies on tables that are being removed or fundamentally changed
-- These might prevent dropping tables like team_users or teams if they depend on them.

-- For 'teams' table (which will be dropped)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
        DROP POLICY IF EXISTS "Allow members to view their teams" ON public.teams;
        DROP POLICY IF EXISTS "Allow owners/admins to update their teams" ON public.teams;
        DROP POLICY IF EXISTS "Allow owners to delete their teams" ON public.teams;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.teams; -- Common default
        DROP POLICY IF EXISTS "Allow all access to teams for authenticated users" ON public.teams;
        DROP POLICY IF EXISTS "Allow individual insert access" ON public.teams;
        DROP POLICY IF EXISTS "Allow individual update access" ON public.teams;
        DROP POLICY IF EXISTS "Allow individual delete access" ON public.teams;
    END IF;
END $$;

-- For 'auth.users' (policies might reference team_users)
DROP POLICY IF EXISTS "Allow team members to view each other's basic info" ON auth.users;
-- Add any other custom policies on auth.users that might reference team_users or teams

-- For 'plans' table (if it had team-based RLS)
DROP POLICY IF EXISTS "Allow users to see their team's or own plans" ON public.plans;
DROP POLICY IF EXISTS "Allow team admins or owners to create plans" ON public.plans;
DROP POLICY IF EXISTS "Allow team admins or owners to update plans" ON public.plans;
DROP POLICY IF EXISTS "Allow team admins or owners to delete plans" ON public.plans;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.plans;

-- For 'subscriptions' table (if it had team-based RLS)
DROP POLICY IF EXISTS "Allow users to see their own or team subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow users to create subscriptions for self or admined teams" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow users to update their own or admined team subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Allow owners/admins to delete subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.subscriptions;


-- Helper function to check if a user is a member of a tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.tenant_id = p_tenant_id
    AND tu.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if a user has a specific role in a tenant
CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant_id UUID, p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.tenant_id = p_tenant_id
    AND tu.user_id = p_user_id
    AND tu.role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if a user has one of several roles in a tenant
CREATE OR REPLACE FUNCTION public.has_any_tenant_role(p_tenant_id UUID, p_user_id UUID, p_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.tenant_id = p_tenant_id
    AND tu.user_id = p_user_id
    AND tu.role = ANY(p_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. Table: customers
-- Drop old policies
DROP POLICY IF EXISTS "Allow team members to read customers" ON public.customers;
DROP POLICY IF EXISTS "Allow team members to insert customers" ON public.customers;
DROP POLICY IF EXISTS "Allow team owners or admins to update customers" ON public.customers;
DROP POLICY IF EXISTS "Allow team owners to delete customers" ON public.customers;

-- Create new policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY; -- Ensure RLS is on

        CREATE POLICY "Allow tenant members to read customers"
        ON public.customers FOR SELECT TO authenticated
        USING (public.is_tenant_member(customers.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant members to insert customers"
        ON public.customers FOR INSERT TO authenticated
        WITH CHECK (public.is_tenant_member(customers.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant admins or owners to update customers"
        ON public.customers FOR UPDATE TO authenticated
        USING (public.has_any_tenant_role(customers.tenant_id, auth.uid(), ARRAY['admin', 'owner']))
        WITH CHECK (public.has_any_tenant_role(customers.tenant_id, auth.uid(), ARRAY['admin', 'owner']));

        CREATE POLICY "Allow tenant owners to delete customers"
        ON public.customers FOR DELETE TO authenticated
        USING (public.has_tenant_role(customers.tenant_id, auth.uid(), 'owner'));
    ELSE
        RAISE NOTICE 'Skipping RLS policy creation for public.customers as tenant_id column does not exist.';
    END IF;
END $$;


-- 2. Table: batch_sentiment_analysis
-- Drop old policies
DROP POLICY IF EXISTS "Allow team members to read sentiment analysis" ON public.batch_sentiment_analysis;
DROP POLICY IF EXISTS "Allow team members to insert sentiment analysis" ON public.batch_sentiment_analysis;
DROP POLICY IF EXISTS "Allow team owners or admins to update sentiment analysis" ON public.batch_sentiment_analysis;
DROP POLICY IF EXISTS "Allow team owners to delete sentiment analysis" ON public.batch_sentiment_analysis;

-- Create new policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'batch_sentiment_analysis' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.batch_sentiment_analysis ENABLE ROW LEVEL SECURITY; -- Ensure RLS is on

        CREATE POLICY "Allow tenant members to read sentiment analysis"
        ON public.batch_sentiment_analysis FOR SELECT TO authenticated
        USING (public.is_tenant_member(batch_sentiment_analysis.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant members to insert sentiment analysis"
        ON public.batch_sentiment_analysis FOR INSERT TO authenticated
        WITH CHECK (public.is_tenant_member(batch_sentiment_analysis.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant admins or owners to update sentiment analysis"
        ON public.batch_sentiment_analysis FOR UPDATE TO authenticated
        USING (public.has_any_tenant_role(batch_sentiment_analysis.tenant_id, auth.uid(), ARRAY['admin', 'owner']))
        WITH CHECK (public.has_any_tenant_role(batch_sentiment_analysis.tenant_id, auth.uid(), ARRAY['admin', 'owner']));

        CREATE POLICY "Allow tenant owners to delete sentiment analysis"
        ON public.batch_sentiment_analysis FOR DELETE TO authenticated
        USING (public.has_tenant_role(batch_sentiment_analysis.tenant_id, auth.uid(), 'owner'));
    ELSE
        RAISE NOTICE 'Skipping RLS policy creation for public.batch_sentiment_analysis as tenant_id column does not exist.';
    END IF;
END $$;

-- Update the trigger function for batch_sentiment_analysis to use tenant_id from conversations
DROP TRIGGER IF EXISTS set_batch_sentiment_analysis_team_id_trigger ON public.batch_sentiment_analysis;
DROP FUNCTION IF EXISTS public.set_batch_sentiment_analysis_team_id();

CREATE OR REPLACE FUNCTION public.set_batch_sentiment_analysis_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Assuming all conversation_ids belong to the same tenant
  SELECT tenant_id INTO NEW.tenant_id
  FROM public.conversations
  WHERE id = ANY(NEW.conversation_ids)
  LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_batch_sentiment_analysis_tenant_id_trigger ON public.batch_sentiment_analysis;
CREATE TRIGGER set_batch_sentiment_analysis_tenant_id_trigger
BEFORE INSERT ON public.batch_sentiment_analysis
FOR EACH ROW
EXECUTE FUNCTION public.set_batch_sentiment_analysis_tenant_id();


-- 3. Table: leads (assuming similar RLS structure)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads' AND table_schema = 'public') THEN
        -- Drop old policies (names are assumed, adjust if different)
        DROP POLICY IF EXISTS "Allow team members to read leads" ON public.leads;
        DROP POLICY IF EXISTS "Allow team members to insert leads" ON public.leads;
        DROP POLICY IF EXISTS "Allow team owners or admins to update leads" ON public.leads;
        DROP POLICY IF EXISTS "Allow team owners to delete leads" ON public.leads;

        ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow tenant members to read leads"
        ON public.leads FOR SELECT TO authenticated
        USING (public.is_tenant_member(leads.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant members to insert leads"
        ON public.leads FOR INSERT TO authenticated
        WITH CHECK (public.is_tenant_member(leads.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant admins or owners to update leads"
        ON public.leads FOR UPDATE TO authenticated
        USING (public.has_any_tenant_role(leads.tenant_id, auth.uid(), ARRAY['admin', 'owner']))
        WITH CHECK (public.has_any_tenant_role(leads.tenant_id, auth.uid(), ARRAY['admin', 'owner']));

        CREATE POLICY "Allow tenant owners to delete leads"
        ON public.leads FOR DELETE TO authenticated
        USING (public.has_tenant_role(leads.tenant_id, auth.uid(), 'owner'));
    END IF;
END $$;


-- 4. Table: pipelines (assuming similar RLS structure)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pipelines' AND table_schema = 'public') THEN
        -- Drop old policies (names are assumed)
        DROP POLICY IF EXISTS "Allow team members to read pipelines" ON public.pipelines;
        DROP POLICY IF EXISTS "Allow team members to insert pipelines" ON public.pipelines;
        DROP POLICY IF EXISTS "Allow team owners or admins to update pipelines" ON public.pipelines;
        DROP POLICY IF EXISTS "Allow team owners to delete pipelines" ON public.pipelines;

        ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow tenant members to read pipelines"
        ON public.pipelines FOR SELECT TO authenticated
        USING (public.is_tenant_member(pipelines.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant members to insert pipelines"
        ON public.pipelines FOR INSERT TO authenticated
        WITH CHECK (public.is_tenant_member(pipelines.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant admins or owners to update pipelines"
        ON public.pipelines FOR UPDATE TO authenticated
        USING (public.has_any_tenant_role(pipelines.tenant_id, auth.uid(), ARRAY['admin', 'owner']))
        WITH CHECK (public.has_any_tenant_role(pipelines.tenant_id, auth.uid(), ARRAY['admin', 'owner']));

        CREATE POLICY "Allow tenant owners to delete pipelines"
        ON public.pipelines FOR DELETE TO authenticated
        USING (public.has_tenant_role(pipelines.tenant_id, auth.uid(), 'owner'));
    END IF;
END $$;


-- 5. Table: conversations (assuming similar RLS structure)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'tenant_id') THEN
        -- Drop old policies (names are assumed)
        DROP POLICY IF EXISTS "Allow team members to read conversations" ON public.conversations;
        DROP POLICY IF EXISTS "Allow team members to insert conversations" ON public.conversations;
        DROP POLICY IF EXISTS "Allow team owners or admins to update conversations" ON public.conversations;
        DROP POLICY IF EXISTS "Allow team owners to delete conversations" ON public.conversations;

        ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow tenant members to read conversations"
        ON public.conversations FOR SELECT TO authenticated
        USING (public.is_tenant_member(conversations.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant members to insert conversations"
        ON public.conversations FOR INSERT TO authenticated
        WITH CHECK (public.is_tenant_member(conversations.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant admins or owners to update conversations"
        ON public.conversations FOR UPDATE TO authenticated
        USING (public.has_any_tenant_role(conversations.tenant_id, auth.uid(), ARRAY['admin', 'owner']))
        WITH CHECK (public.has_any_tenant_role(conversations.tenant_id, auth.uid(), ARRAY['admin', 'owner']));

        CREATE POLICY "Allow tenant owners to delete conversations"
        ON public.conversations FOR DELETE TO authenticated
        USING (public.has_tenant_role(conversations.tenant_id, auth.uid(), 'owner'));
    END IF;
END $$;


-- 6. Table: integrations (general integrations table, if it had team-based RLS)
-- This table now has tenant_id. Assuming it needs similar RLS.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'integrations' AND column_name = 'tenant_id') THEN
        -- Drop old policies (names are assumed)
        DROP POLICY IF EXISTS "Allow team members to read integrations" ON public.integrations;
        DROP POLICY IF EXISTS "Allow team members to insert integrations" ON public.integrations;
        DROP POLICY IF EXISTS "Allow team owners or admins to update integrations" ON public.integrations;
        DROP POLICY IF EXISTS "Allow team owners to delete integrations" ON public.integrations;

        ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow tenant members to read integrations"
        ON public.integrations FOR SELECT TO authenticated
        USING (public.is_tenant_member(integrations.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant members to insert integrations"
        ON public.integrations FOR INSERT TO authenticated
        WITH CHECK (public.is_tenant_member(integrations.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant admins or owners to update integrations"
        ON public.integrations FOR UPDATE TO authenticated
        USING (public.has_any_tenant_role(integrations.tenant_id, auth.uid(), ARRAY['admin', 'owner']))
        WITH CHECK (public.has_any_tenant_role(integrations.tenant_id, auth.uid(), ARRAY['admin', 'owner']));

        CREATE POLICY "Allow tenant owners to delete integrations"
        ON public.integrations FOR DELETE TO authenticated
        USING (public.has_tenant_role(integrations.tenant_id, auth.uid(), 'owner'));
    END IF;
END $$;

-- 7. Table: tenant_users (RLS for managing tenant memberships)
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owners can manage their tenant users"
ON public.tenant_users FOR ALL TO authenticated
USING (public.has_tenant_role(tenant_id, auth.uid(), 'owner'))
WITH CHECK (public.has_tenant_role(tenant_id, auth.uid(), 'owner'));

CREATE POLICY "Tenant members can view their own membership"
ON public.tenant_users FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Tenant admins can view other members of their tenant"
ON public.tenant_users FOR SELECT TO authenticated
USING (public.has_any_tenant_role(tenant_id, auth.uid(), ARRAY['admin', 'owner']));


-- 8. Table: tenants (RLS for managing tenants themselves)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owners can manage their tenant"
ON public.tenants FOR ALL TO authenticated
USING (owner_profile_id = auth.uid() OR public.has_tenant_role(id, auth.uid(), 'owner')); -- owner_profile_id for creation, role for existing

CREATE POLICY "Tenant members can view their tenant"
ON public.tenants FOR SELECT TO authenticated
USING (public.is_tenant_member(id, auth.uid()));

-- 9. Table: integrations_config (already uses tenant_id, ensure RLS is appropriate)
-- Assuming integrations_config RLS was already tenant-based or needs to be now.
-- If it had policies, they might need adjustment if they indirectly referenced teams.
-- For simplicity, let's assume a similar pattern:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'integrations_config' AND column_name = 'tenant_id') THEN
        -- Drop old policies if they existed and were team-based (names assumed)
        DROP POLICY IF EXISTS "Allow team members to read integration_config" ON public.integrations_config;
        -- ... and for insert, update, delete

        ALTER TABLE public.integrations_config ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow tenant members to read integration_config"
        ON public.integrations_config FOR SELECT TO authenticated
        USING (public.is_tenant_member(integrations_config.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant admins or owners to manage integration_config"
        ON public.integrations_config FOR ALL TO authenticated
        USING (public.has_any_tenant_role(integrations_config.tenant_id, auth.uid(), ARRAY['admin', 'owner']))
        WITH CHECK (public.has_any_tenant_role(integrations_config.tenant_id, auth.uid(), ARRAY['admin', 'owner']));
    END IF;
END $$;

-- 10. Table: plans (New RLS based on tenant_id)
DO $$
-- DECLARE
--     policy_record RECORD; -- Already declared in the block above if we combine, or keep separate if preferred
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'tenant_id') THEN
        -- Policies should have been dropped by the block at the top of the script.
        -- FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plans' LOOP
        --     EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.plans;';
        -- END LOOP;

        ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

        -- Assuming plans can be public or tenant-specific.
        -- Public plans might be viewable by all authenticated users.
        -- Tenant-specific plans are managed by tenant owners/admins.

        CREATE POLICY "Allow authenticated users to read public plans"
        ON public.plans FOR SELECT TO authenticated
        USING (tenant_id IS NULL); -- Example: Public plans have NULL tenant_id

        CREATE POLICY "Allow tenant members to read their tenant-specific plans"
        ON public.plans FOR SELECT TO authenticated
        USING (public.is_tenant_member(plans.tenant_id, auth.uid()));

        CREATE POLICY "Allow tenant admins or owners to manage tenant-specific plans"
        ON public.plans FOR ALL TO authenticated
        USING (public.has_any_tenant_role(plans.tenant_id, auth.uid(), ARRAY['admin', 'owner']))
        WITH CHECK (public.has_any_tenant_role(plans.tenant_id, auth.uid(), ARRAY['admin', 'owner']));
    END IF;
END $$;

-- 11. Table: subscriptions (New RLS based on tenant_id)
DO $$
-- DECLARE
--    policy_record RECORD; -- Already declared in the block above if we combine, or keep separate if preferred
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'tenant_id') THEN
        -- Policies should have been dropped by the block at the top of the script.
        -- FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' LOOP
        --     EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.subscriptions;';
        -- END LOOP;

        ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow tenant members to read their tenant subscriptions"
        ON public.subscriptions FOR SELECT TO authenticated
        USING (public.is_tenant_member(subscriptions.tenant_id, auth.uid()));
        
        CREATE POLICY "Allow tenant admins or owners to manage tenant subscriptions"
        ON public.subscriptions FOR ALL TO authenticated
        USING (public.has_any_tenant_role(subscriptions.tenant_id, auth.uid(), ARRAY['admin', 'owner']))
        WITH CHECK (public.has_any_tenant_role(subscriptions.tenant_id, auth.uid(), ARRAY['admin', 'owner']));

        -- If users can manage their own subscriptions directly (even if not tenant owner/admin for that tenant_id)
        -- you might need a policy like:
        -- CREATE POLICY "Users can manage their own subscriptions"
        -- ON public.subscriptions FOR ALL
        -- USING ( profile_id = auth.uid() ); -- Assuming a profile_id column links to the user
        -- This depends on your exact business logic for subscriptions.
    END IF;
END $$;

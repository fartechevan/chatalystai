-- This migration cleans up old database objects related to the 'teams' system.

-- 1. Drop Triggers and Functions related to team_users and teams

-- From 20250529193700_create_tenant_on_team_owner_trigger.sql
-- This trigger was on public.team_users
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_users') THEN
        DROP TRIGGER IF EXISTS on_new_team_owner_create_tenant_trigger ON public.team_users;
    END IF;
END $$;
DROP FUNCTION IF EXISTS public.handle_new_team_owner_create_tenant();

-- From 20250529195600_create_tenant_on_subscription_trigger.sql
-- This trigger was on public.subscriptions
DROP TRIGGER IF EXISTS on_new_subscription_create_personal_tenant_trigger ON public.subscriptions;
DROP FUNCTION IF EXISTS public.handle_new_subscription_create_personal_tenant();

-- From 20250529150000_create_team_with_function.sql
DROP FUNCTION IF EXISTS public.create_new_team(text);

-- From 20250529160000_add_invited_user_to_team.sql
-- This trigger was on auth.users
DROP TRIGGER IF EXISTS on_new_user_created_add_to_team ON auth.users;
DROP FUNCTION IF EXISTS public.add_user_to_team_on_signup();

-- Any other team-specific functions/triggers should be dropped here.
-- For example, if there were RLS helper functions specifically for teams that are no longer needed.

-- Forcefully drop any remaining RLS policies that might depend on team_users or teams
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop policies from 'teams'
    FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teams' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.teams;';
    END LOOP;

    -- Drop policies from 'plans'
    FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plans' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.plans;';
    END LOOP;

    -- Drop policies from 'subscriptions'
    FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.subscriptions;';
    END LOOP;

    -- Drop specific known policies from 'auth.users' that might reference team_users
    DROP POLICY IF EXISTS "Allow team members to view each other's basic info" ON auth.users;
    -- Add any other specific policy names on auth.users if known
END;
$$;

-- 2. Drop the team_users table
-- RLS policies on team_users are dropped automatically when the table is dropped.
-- Foreign key constraints referencing team_users should have been handled or dropped.
-- The tenants.team_id FK was dropped in 20250605115500.
-- Other tables (batch_sentiment_analysis, customers, etc.) had their team_id FKs
-- (which might have been linked to teams or team_users depending on the specific constraint)
-- removed in 20250605115600.
DROP TABLE IF EXISTS public.team_users;

-- 3. Drop the teams table
-- RLS policies on teams are dropped automatically.
-- Foreign key constraints from other tables to public.teams (like tenants.team_id,
-- integrations.team_id, customers.team_id, batch_sentiment_analysis.team_id, etc.)
-- should have been dropped in migrations 20250605115500 and 20250605115600.
DROP TABLE IF EXISTS public.teams;

-- Update comment on tenants table to reflect final state
COMMENT ON TABLE public.tenants IS 'Stores tenant information, linked to an owner profile. Users can be added to tenants via the tenant_users table. The team layer has been removed from the tenancy model.';

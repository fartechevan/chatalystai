-- This migration retargets 'plans' and 'subscriptions' tables from team_id to tenant_id.

-- IMPORTANT: A data migration step is required for 'plans' and 'subscriptions'
-- if they contain existing data that needs to be mapped from team_id to tenant_id.
-- This should be done AFTER this migration adds the tenant_id columns and BEFORE
-- the team_id columns are dropped by a subsequent migration.
-- Example:
-- UPDATE public.plans p SET tenant_id = (SELECT t.id FROM public.tenants t WHERE t.team_id = p.team_id) WHERE p.team_id IS NOT NULL AND p.tenant_id IS NULL;
-- UPDATE public.subscriptions s SET tenant_id = (SELECT t.id FROM public.tenants t WHERE t.team_id = s.team_id) WHERE s.team_id IS NOT NULL AND s.tenant_id IS NULL;

-- 1. Table: plans
ALTER TABLE public.plans
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_plans_tenant_id ON public.plans(tenant_id);
COMMENT ON COLUMN public.plans.tenant_id IS 'Foreign key referencing the tenant that owns this plan.';
-- The old team_id column, its FK, and index will be dropped in a later migration (e.g., ...115650...).

-- 2. Table: subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
COMMENT ON COLUMN public.subscriptions.tenant_id IS 'Foreign key referencing the tenant for this subscription.';
-- The old team_id column, its FK, and index will be dropped in a later migration (e.g., ...115650...).

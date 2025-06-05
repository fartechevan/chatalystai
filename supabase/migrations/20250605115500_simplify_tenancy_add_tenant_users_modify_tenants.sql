-- Step 1: Create the tenant_users table
CREATE TABLE IF NOT EXISTS public.tenant_users (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- e.g., 'owner', 'admin', 'member'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (tenant_id, user_id)
);

-- Add indexes for tenant_users
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);

-- Trigger function to update updated_at timestamp for tenant_users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'handle_updated_at' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS on_tenant_users_updated ON public.tenant_users;
    CREATE TRIGGER on_tenant_users_updated
    BEFORE UPDATE ON public.tenant_users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  ELSE
    RAISE NOTICE 'handle_updated_at function not found. Trigger for tenant_users.updated_at not created.';
  END IF;
END $$;

COMMENT ON TABLE public.tenant_users IS 'Stores user membership and roles within tenants.';
COMMENT ON COLUMN public.tenant_users.tenant_id IS 'Foreign key referencing the tenant.';
COMMENT ON COLUMN public.tenant_users.user_id IS 'Foreign key referencing the user (profile).';
COMMENT ON COLUMN public.tenant_users.role IS 'Role of the user within the tenant (e.g., owner, admin, member).';

-- Step 2: Modify the tenants table (team_id column will be dropped in a later migration)
-- The team_id column, its FK constraint, and index are temporarily kept for data migration purposes.
-- Update comments for the tenants table
COMMENT ON TABLE public.tenants IS 'Stores tenant information, linked to an owner profile and a team (team_id to be removed). Users can be added to tenants via the tenant_users table.';
-- The owner_profile_id column and its comment remain relevant.

-- Step 3: Create a trigger to add the tenant owner to tenant_users upon tenant creation
CREATE OR REPLACE FUNCTION public.add_owner_to_tenant_users()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tenant_users (tenant_id, user_id, role)
  VALUES (NEW.id, NEW.owner_profile_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_add_owner_to_tenant_users ON public.tenants;
CREATE TRIGGER trigger_add_owner_to_tenant_users
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.add_owner_to_tenant_users();

COMMENT ON FUNCTION public.add_owner_to_tenant_users() IS 'Automatically adds the tenant creator as an owner in the tenant_users table.';

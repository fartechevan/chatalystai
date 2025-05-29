-- Create the tenants table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL UNIQUE REFERENCES public.teams(id) ON DELETE CASCADE,
    owner_profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes
CREATE INDEX idx_tenants_team_id ON public.tenants(team_id);
CREATE INDEX idx_tenants_owner_profile_id ON public.tenants(owner_profile_id);

-- Trigger function to update updated_at timestamp (if not already created)
-- This assumes handle_updated_at function is globally available or defined elsewhere.
-- If not, it should be included or ensured it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'handle_updated_at' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER on_tenants_updated
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  ELSE
    RAISE NOTICE 'handle_updated_at function not found in public schema. Trigger for tenants.updated_at not created.';
  END IF;
END $$;

COMMENT ON TABLE public.tenants IS 'Stores tenant information, linking a team to an owner profile.';
COMMENT ON COLUMN public.tenants.team_id IS 'Foreign key referencing the team associated with this tenant.';
COMMENT ON COLUMN public.tenants.owner_profile_id IS 'Foreign key referencing the profile of the user who owns this tenant.';

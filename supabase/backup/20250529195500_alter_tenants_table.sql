-- Step 1: Make team_id nullable
ALTER TABLE public.tenants ALTER COLUMN team_id DROP NOT NULL;

-- Step 2: Drop the original unique constraint on team_id
-- The name is typically <table_name>_<column_name>_key for UNIQUE constraints defined inline.
-- Using IF EXISTS for safety.
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_team_id_key;

-- Step 3: Add new unique constraint for non-null team_id values
-- This ensures a team can only have one tenant. NULLs are not considered equal by UNIQUE constraints in PostgreSQL.
ALTER TABLE public.tenants ADD CONSTRAINT tenants_team_id_unique_if_not_null UNIQUE (team_id);

-- Step 4: Drop the original unique constraint on owner_profile_id
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_owner_profile_id_key;

-- Step 5: Add partial unique index for personal tenants
-- This ensures a profile can only have one tenant where team_id IS NULL.
CREATE UNIQUE INDEX idx_tenants_unique_personal_tenant ON public.tenants (owner_profile_id) WHERE (team_id IS NULL);

COMMENT ON TABLE public.tenants IS 'Stores tenant information, linking a team to an owner profile, or just an owner profile for personal tenants.';
COMMENT ON COLUMN public.tenants.team_id IS 'Foreign key referencing the team associated with this tenant (nullable for personal tenants).';

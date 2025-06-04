-- Remove the team_id column from the integrations table
ALTER TABLE public.integrations
DROP COLUMN IF EXISTS team_id CASCADE;

-- Remove the team_visibility column from the integrations table
ALTER TABLE public.integrations
DROP COLUMN IF EXISTS team_visibility CASCADE;

COMMENT ON TABLE public.integrations IS 'Stores details about available third-party integrations (global catalog).';

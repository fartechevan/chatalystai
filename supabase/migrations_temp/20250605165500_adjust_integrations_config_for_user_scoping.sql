-- Adjust integrations_config table for user-specific scoping.

-- Ensure tenant_id and team_id are dropped (should have been by previous migrations, but defensive)
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS integrations_config_tenant_id_fkey;
ALTER TABLE public.integrations_config DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS integrations_config_team_id_fkey;
ALTER TABLE public.integrations_config DROP COLUMN IF EXISTS team_id;

-- Add profile_id to link configurations to a user profile
ALTER TABLE public.integrations_config
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add an index on profile_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_integrations_config_profile_id ON public.integrations_config(profile_id);

COMMENT ON COLUMN public.integrations_config.profile_id IS 'Links the integration configuration to a specific user profile.';

-- Note: Existing data in integrations_config will have NULL for profile_id.
-- Manual data migration might be needed if there are existing configs to associate with users.
-- However, since tenant_id was removed, it's likely these configs are currently unowned.

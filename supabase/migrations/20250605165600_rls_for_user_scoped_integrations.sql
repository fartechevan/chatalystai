-- RLS Policies for user-scoped integrations

-- Table: integrations (global list of available integration types)
-- Drop any previous RLS policies first to ensure a clean state
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integrations') THEN
        FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integrations' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.integrations;';
        END LOOP;
    END IF;
END;
$$;

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read integration types"
ON public.integrations
FOR SELECT
TO authenticated
USING (true);

-- Table: integrations_config (user-specific configurations)
-- Drop any previous RLS policies first
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integrations_config') THEN
        FOR policy_record IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'integrations_config' LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.integrations_config;';
        END LOOP;
    END IF;
END;
$$;

ALTER TABLE public.integrations_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own integration configurations"
ON public.integrations_config
FOR ALL
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

COMMENT ON POLICY "Users can manage their own integration configurations" ON public.integrations_config IS 'Users can CRUD their own integration_config records.';
COMMENT ON POLICY "Authenticated users can read integration types" ON public.integrations IS 'All authenticated users can see the available types of integrations.';

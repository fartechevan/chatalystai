-- Ensure the handle_updated_at function exists (idempotent check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at' AND prosrc ILIKE '%NEW.updated_at = NOW()%') THEN
    CREATE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- 1. Customers Table
-- This table reportedly already exists in the database.
-- Creation, indexing, trigger, and comment statements have been removed from this migration.
-- RLS policies for customers are also removed from this migration, assuming they exist or will be managed separately.

-- 2. Tags Table
-- This table reportedly already exists in the database.
-- Creation, indexing, trigger, and comment statements have been removed from this migration.
-- RLS policies for tags are also removed from this migration, assuming they exist or will be managed separately.

-- 3. Leads Table
-- This table reportedly already exists in the database.
-- Creation, indexing, trigger, and comment statements have been removed from this migration.
-- RLS policies for leads are also removed from this migration, assuming they exist or will be managed separately.

-- 4. Pipeline Stages Table
-- This table reportedly already exists in the database.
-- Creation, indexing, trigger, and comment statements have been removed from this migration.
-- RLS policies for pipeline_stages are also removed from this migration, assuming they exist or will be managed separately.

-- 5. Lead Tags (Join Table)
-- This table reportedly already exists in the database.
-- Creation and comment statements have been removed from this migration.
-- RLS policies for lead_tags are also removed from this migration, assuming they exist or will be managed separately.

-- 6. Lead Pipeline (Join Table for Lead's position in a Stage)
-- This table reportedly already exists in the database.
-- Creation, indexing, trigger, and comment statements have been removed from this migration.
-- RLS policies for lead_pipeline are also removed from this migration, assuming they exist or will be managed separately.

-- Add RLS policies (basic examples, adjust as needed)
-- WARNING: The following policies grant broad access to all authenticated users.
-- Review and restrict these policies based on your application's security needs.

-- Policies for 'pipelines' table
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated users to read pipelines" ON public.pipelines;
CREATE POLICY "Allow all authenticated users to read pipelines"
    ON public.pipelines FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow all authenticated users to write pipelines" ON public.pipelines;
CREATE POLICY "Allow all authenticated users to write pipelines"
    ON public.pipelines FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policies for 'customers' table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated users to read customers" ON public.customers;
CREATE POLICY "Allow all authenticated users to read customers"
    ON public.customers FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow all authenticated users to write customers" ON public.customers;
CREATE POLICY "Allow all authenticated users to write customers"
    ON public.customers FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policies for 'tags' table
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated users to read tags" ON public.tags;
CREATE POLICY "Allow all authenticated users to read tags"
    ON public.tags FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow all authenticated users to write tags" ON public.tags;
CREATE POLICY "Allow all authenticated users to write tags"
    ON public.tags FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policies for 'leads' table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated users to read leads" ON public.leads;
CREATE POLICY "Allow all authenticated users to read leads"
    ON public.leads FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow all authenticated users to write leads" ON public.leads;
CREATE POLICY "Allow all authenticated users to write leads"
    ON public.leads FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policies for 'pipeline_stages' table
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated users to read pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Allow all authenticated users to read pipeline_stages"
    ON public.pipeline_stages FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow all authenticated users to write pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Allow all authenticated users to write pipeline_stages"
    ON public.pipeline_stages FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policies for 'lead_tags' table
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated users to read lead_tags" ON public.lead_tags;
CREATE POLICY "Allow all authenticated users to read lead_tags"
    ON public.lead_tags FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow all authenticated users to write lead_tags" ON public.lead_tags;
CREATE POLICY "Allow all authenticated users to write lead_tags"
    ON public.lead_tags FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policies for 'lead_pipeline' table
ALTER TABLE public.lead_pipeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated users to read lead_pipeline" ON public.lead_pipeline;
CREATE POLICY "Allow all authenticated users to read lead_pipeline"
    ON public.lead_pipeline FOR SELECT
    USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Allow all authenticated users to write lead_pipeline" ON public.lead_pipeline;
CREATE POLICY "Allow all authenticated users to write lead_pipeline"
    ON public.lead_pipeline FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Assuming 'profiles' table has 'id' which matches auth.users.id
-- And that user_id on pipeline_stages refers to auth.users.id

-- RLS for customers removed as the table is assumed to exist with its own RLS.
-- ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Profiles can manage their own customers"
--     ON public.customers FOR ALL
--     USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id))
--     WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- RLS for tags removed as the table is assumed to exist with its own RLS.
-- ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Profiles can manage their own tags"
--     ON public.tags FOR ALL
--     USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id))
--     WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- RLS for leads removed as the table is assumed to exist with its own RLS.
-- ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Profiles can manage their own leads"
--     ON public.leads FOR ALL
--     USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id))
--     WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
-- -- Policy for assignees to view/update leads assigned to them might also be needed.

-- RLS for pipeline_stages removed as the table is assumed to exist with its own RLS.
-- ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage pipeline stages for pipelines they own"
--     ON public.pipeline_stages FOR ALL
--     USING (auth.uid() = user_id) -- Assuming user_id on pipeline_stages is the owner
--     WITH CHECK (auth.uid() = user_id);

-- RLS for lead_tags removed as the table is assumed to exist with its own RLS.
-- ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage lead_tags for leads they have access to"
--     ON public.lead_tags FOR ALL
--     USING (
--         (SELECT profile_id FROM public.leads WHERE id = lead_id) IN 
--         (SELECT id FROM public.profiles WHERE user_id = auth.uid())
--     )
--     WITH CHECK (
--         (SELECT profile_id FROM public.leads WHERE id = lead_id) IN 
--         (SELECT id FROM public.profiles WHERE user_id = auth.uid())
--     );

-- RLS for lead_pipeline removed as the table is assumed to exist with its own RLS.
-- ALTER TABLE public.lead_pipeline ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage lead_pipeline entries for leads and stages they have access to"
--     ON public.lead_pipeline FOR ALL
--     USING (
--         (SELECT profile_id FROM public.leads WHERE id = lead_id) IN 
--         (SELECT id FROM public.profiles WHERE user_id = auth.uid())
--         AND
--         (SELECT user_id FROM public.pipeline_stages WHERE id = stage_id) = auth.uid()
--     )
--     WITH CHECK (
--         (SELECT profile_id FROM public.leads WHERE id = lead_id) IN 
--         (SELECT id FROM public.profiles WHERE id = auth.uid()) -- Typo: should be user_id = auth.uid()
--         AND
--         (SELECT user_id FROM public.pipeline_stages WHERE id = stage_id) = auth.uid()
--     );

-- -- Correction for lead_pipeline RLS policy check condition
-- DROP POLICY IF EXISTS "Users can manage lead_pipeline entries for leads and stages they have access to" ON public.lead_pipeline;
-- CREATE POLICY "Users can manage lead_pipeline entries for leads and stages they have access to (corrected)"
--     ON public.lead_pipeline FOR ALL
--     USING (
--         (SELECT profile_id FROM public.leads WHERE id = lead_id) IN 
--         (SELECT id FROM public.profiles WHERE user_id = auth.uid()) -- Assuming profiles.user_id links to auth.uid()
--         AND
--         (SELECT user_id FROM public.pipeline_stages WHERE id = stage_id) = auth.uid() -- Assuming pipeline_stages.user_id links to auth.uid()
--     )
--     WITH CHECK (
--         (SELECT profile_id FROM public.leads WHERE id = lead_id) IN 
--         (SELECT id FROM public.profiles WHERE user_id = auth.uid())
--         AND
--         (SELECT user_id FROM public.pipeline_stages WHERE id = stage_id) = auth.uid()
--     );

-- Note: The RLS policies above assume a 'profiles' table with 'id' (UUID) and 'user_id' (UUID, references auth.users.id).
-- Adjust RLS if your 'profiles' table or user ownership model is different.
-- For example, if pipelines.user_id is the primary scope, RLS should reflect that.
-- The pipeline_stages.user_id is set to auth.users(id) to align with pipelines.user_id.
-- Leads are owned by profile_id. Tags are owned by profile_id. Customers are owned by profile_id.
-- This mixed ownership (auth.uid vs profile_id) in RLS needs careful review based on actual app logic.
-- For simplicity, if 'profile_id' on leads, tags, customers maps to a profile whose 'user_id' is auth.uid(), then it's consistent.

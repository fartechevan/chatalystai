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

-- COMMENT ON MIGRATION IS 'Applies permissive RLS policies (all authenticated users have CRUD) to tables related to leads and pipelines. Review for security.';
-- The above COMMENT ON MIGRATION line caused a syntax error and has been removed.
-- The RLS policies should have been applied in the previous run before the error.

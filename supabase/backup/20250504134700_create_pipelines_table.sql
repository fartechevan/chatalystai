-- Create the pipelines table
CREATE TABLE public.pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Assuming pipelines are user-specific
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes
CREATE INDEX idx_pipelines_user_id ON public.pipelines(user_id);
CREATE INDEX idx_pipelines_is_default ON public.pipelines(is_default);

-- Trigger function to update updated_at timestamp (if not already created)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Apply the trigger to pipelines table
CREATE TRIGGER on_pipelines_updated
BEFORE UPDATE ON public.pipelines
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.pipelines IS 'Stores sales or process pipelines.';
COMMENT ON COLUMN public.pipelines.name IS 'Name of the pipeline.';
COMMENT ON COLUMN public.pipelines.is_default IS 'Indicates if this is the default pipeline for the user.';

-- Note: pipeline_stages table (which references this) should be created in a separate, later migration.
-- Note: lead_pipeline table (which references this) should be created in a separate, later migration.

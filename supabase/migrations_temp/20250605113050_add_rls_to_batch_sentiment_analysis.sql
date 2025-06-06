-- Add team_id column to batch_sentiment_analysis table
ALTER TABLE public.batch_sentiment_analysis
ADD COLUMN team_id UUID REFERENCES public.teams(id);

-- Function to derive team_id from conversation_ids
CREATE OR REPLACE FUNCTION public.set_batch_sentiment_analysis_team_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Assuming all conversation_ids belong to the same team
  SELECT team_id INTO NEW.team_id
  FROM public.conversations
  WHERE id = ANY(NEW.conversation_ids)
  LIMIT 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set team_id when a new row is inserted
CREATE TRIGGER set_batch_sentiment_analysis_team_id_trigger
BEFORE INSERT ON public.batch_sentiment_analysis
FOR EACH ROW
EXECUTE FUNCTION public.set_batch_sentiment_analysis_team_id();

-- Enable RLS for batch_sentiment_analysis table
ALTER TABLE public.batch_sentiment_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow team members to read sentiment analysis data related to their team
CREATE POLICY "Allow team members to read sentiment analysis"
ON public.batch_sentiment_analysis
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = batch_sentiment_analysis.team_id
    AND tu.user_id = auth.uid()
  )
);

-- RLS Policy: Allow team members to insert sentiment analysis data related to their team
CREATE POLICY "Allow team members to insert sentiment analysis"
ON public.batch_sentiment_analysis
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = batch_sentiment_analysis.team_id
    AND tu.user_id = auth.uid()
  )
);

-- RLS Policy: Allow team owners or admins to update sentiment analysis data related to their team
CREATE POLICY "Allow team owners or admins to update sentiment analysis"
ON public.batch_sentiment_analysis
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = batch_sentiment_analysis.team_id
    AND tu.user_id = auth.uid()
    AND (tu.role = 'owner' OR tu.role = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = batch_sentiment_analysis.team_id
    AND tu.user_id = auth.uid()
    AND (tu.role = 'owner' OR tu.role = 'admin')
  )
);

-- RLS Policy: Allow team owners to delete sentiment analysis data related to their team
CREATE POLICY "Allow team owners to delete sentiment analysis"
ON public.batch_sentiment_analysis
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_users tu
    WHERE tu.team_id = batch_sentiment_analysis.team_id
    AND tu.user_id = auth.uid()
    AND tu.role = 'owner'
  )
);

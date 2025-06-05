-- Drop existing RLS policies for batch_sentiment_analysis
DROP POLICY IF EXISTS "Allow team members to read sentiment analysis" ON public.batch_sentiment_analysis;
DROP POLICY IF EXISTS "Allow team members to insert sentiment analysis" ON public.batch_sentiment_analysis;
DROP POLICY IF EXISTS "Allow team owners or admins to update sentiment analysis" ON public.batch_sentiment_analysis;
DROP POLICY IF EXISTS "Allow team owners to delete sentiment analysis" ON public.batch_sentiment_analysis;

-- RLS Policy: Allow all authenticated users to read sentiment analysis data
CREATE POLICY "Allow authenticated users to read sentiment analysis"
ON public.batch_sentiment_analysis
FOR SELECT
TO authenticated
USING (true);

-- RLS Policy: Allow all authenticated users to insert sentiment analysis data
CREATE POLICY "Allow authenticated users to insert sentiment analysis"
ON public.batch_sentiment_analysis
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policy: Allow all authenticated users to update sentiment analysis data
CREATE POLICY "Allow authenticated users to update sentiment analysis"
ON public.batch_sentiment_analysis
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS Policy: Allow all authenticated users to delete sentiment analysis data
CREATE POLICY "Allow authenticated users to delete sentiment analysis"
ON public.batch_sentiment_analysis
FOR DELETE
TO authenticated
USING (true);

ALTER TABLE public.batch_sentiment_analysis
ADD COLUMN good_count INTEGER DEFAULT 0,
ADD COLUMN moderate_count INTEGER DEFAULT 0,
ADD COLUMN bad_count INTEGER DEFAULT 0,
ADD COLUMN unknown_count INTEGER DEFAULT 0;

-- Optional: Comment explaining the change or removing the old comment
-- COMMENT ON TABLE public.batch_sentiment_analysis IS 'Added specific sentiment counts (good, moderate, bad, unknown).';

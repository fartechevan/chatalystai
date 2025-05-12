ALTER TABLE public.batch_sentiment_analysis
ADD COLUMN positive_count INTEGER DEFAULT 0,
ADD COLUMN negative_count INTEGER DEFAULT 0,
ADD COLUMN neutral_count INTEGER DEFAULT 0;

-- Optional: Modify overall_sentiment if it's now redundant or change its purpose
-- For example, make it nullable if counts are primary, or use it for a text summary.
-- ALTER TABLE public.batch_sentiment_analysis
-- ALTER COLUMN overall_sentiment DROP NOT NULL; -- If it was NOT NULL
-- COMMENT ON COLUMN public.batch_sentiment_analysis.overall_sentiment IS 'Textual summary or original aggregated string, counts are now in separate columns.';

-- Add unknown_count column to batch_sentiment_analysis table
ALTER TABLE batch_sentiment_analysis 
ADD COLUMN unknown_count INTEGER DEFAULT 0;

-- Update existing records to have unknown_count = 0 if null
UPDATE batch_sentiment_analysis 
SET unknown_count = 0 
WHERE unknown_count IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN batch_sentiment_analysis.unknown_count IS 'Count of conversations with unknown/failed sentiment analysis';
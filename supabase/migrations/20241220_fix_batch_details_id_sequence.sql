-- Fix batch_sentiment_analysis_details id column to use auto-increment
-- Create a sequence for the id column
CREATE SEQUENCE IF NOT EXISTS batch_sentiment_analysis_details_id_seq;

-- Set the sequence as the default for the id column
ALTER TABLE batch_sentiment_analysis_details 
ALTER COLUMN id SET DEFAULT nextval('batch_sentiment_analysis_details_id_seq');

-- Set the sequence ownership to the id column
ALTER SEQUENCE batch_sentiment_analysis_details_id_seq 
OWNED BY batch_sentiment_analysis_details.id;

-- Set the sequence to start from the next available value
-- (in case there are existing records)
SELECT setval('batch_sentiment_analysis_details_id_seq', 
    COALESCE((SELECT MAX(id) FROM batch_sentiment_analysis_details), 0) + 1, false);

-- Add comment for clarity
COMMENT ON COLUMN batch_sentiment_analysis_details.id IS 'Auto-incrementing primary key for batch sentiment analysis details';
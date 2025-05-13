-- supabase/migrations/20250512233200_create_batch_sentiment_details_table.sql

CREATE TABLE public.batch_sentiment_analysis_details (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    batch_analysis_id uuid NOT NULL REFERENCES public.batch_sentiment_analysis(id) ON DELETE CASCADE,
    conversation_id uuid NOT NULL REFERENCES public.conversations(conversation_id) ON DELETE CASCADE, -- Corrected reference
    sentiment public.sentiment_enum NOT NULL, -- Assuming sentiment_enum exists ('good', 'moderate', 'bad', 'unknown')
    description text NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_batch_conversation UNIQUE (batch_analysis_id, conversation_id) -- Ensure only one entry per conversation per batch
);

-- Add indexes for faster querying
CREATE INDEX idx_batch_sentiment_details_batch_id ON public.batch_sentiment_analysis_details(batch_analysis_id);
CREATE INDEX idx_batch_sentiment_details_conversation_id ON public.batch_sentiment_analysis_details(conversation_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.batch_sentiment_analysis_details ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your actual security requirements)
-- Example: Allow authenticated users to read details
CREATE POLICY "Allow authenticated users to read batch details"
ON public.batch_sentiment_analysis_details
FOR SELECT
USING (auth.role() = 'authenticated');

-- Example: Allow service_role (used by functions) to insert/update/delete
CREATE POLICY "Allow service_role full access"
ON public.batch_sentiment_analysis_details
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.batch_sentiment_analysis_details IS 'Stores the individual sentiment analysis result for each conversation within a specific batch run.';
COMMENT ON COLUMN public.batch_sentiment_analysis_details.batch_analysis_id IS 'Foreign key referencing the batch analysis run.';
COMMENT ON COLUMN public.batch_sentiment_analysis_details.conversation_id IS 'Foreign key referencing the conversation analyzed.';
COMMENT ON COLUMN public.batch_sentiment_analysis_details.sentiment IS 'The determined sentiment for the conversation in this batch.';
COMMENT ON COLUMN public.batch_sentiment_analysis_details.description IS 'Optional description or reason for the sentiment classification.';

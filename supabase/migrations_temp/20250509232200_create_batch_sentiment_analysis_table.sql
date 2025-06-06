CREATE TABLE batch_sentiment_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  overall_sentiment TEXT, -- e.g., 'Positive', 'Negative', 'Neutral', or a numerical score
  summary TEXT, -- Optional summary of the batch analysis
  conversation_ids UUID[], -- Array of conversation IDs included in the batch
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

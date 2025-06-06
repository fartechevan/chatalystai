-- supabase/migrations/20250512233100_create_sentiment_enum_type.sql

CREATE TYPE public.sentiment_enum AS ENUM (
    'good',
    'moderate',
    'bad',
    'unknown'
);

COMMENT ON TYPE public.sentiment_enum IS 'Enumerated type for sentiment analysis results.';

ALTER TABLE public.messages
ADD COLUMN media_type TEXT NULL,
ADD COLUMN media_data JSONB NULL;

ALTER TABLE public.messages
ALTER COLUMN content DROP NOT NULL;

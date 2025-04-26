-- Add the 'enabled' column to the knowledge_chunks table
ALTER TABLE public.knowledge_chunks
ADD COLUMN enabled BOOLEAN DEFAULT TRUE NOT NULL;

-- Add an index for potentially faster filtering on the enabled status
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_enabled ON public.knowledge_chunks (enabled);

-- Optional: Backfill existing nulls if default wasn't applied correctly (shouldn't be needed with NOT NULL DEFAULT TRUE)
-- UPDATE public.knowledge_chunks SET enabled = TRUE WHERE enabled IS NULL;

-- Create the knowledge_documents table
CREATE TABLE public.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable if documents can be system-wide
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Or potentially store file path/reference
    file_path TEXT NULL,
    file_type TEXT NULL,
    chunking_method TEXT NULL,
    custom_chunk_size INT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes
CREATE INDEX idx_knowledge_documents_user_id ON public.knowledge_documents(user_id);
CREATE INDEX idx_knowledge_documents_title ON public.knowledge_documents(title); -- For searching by title

-- Trigger function to update updated_at timestamp (if not already created)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Apply the trigger to knowledge_documents table
CREATE TRIGGER on_knowledge_documents_updated
BEFORE UPDATE ON public.knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.knowledge_documents IS 'Stores documents used as knowledge sources for AI agents.';
COMMENT ON COLUMN public.knowledge_documents.title IS 'Title of the knowledge document.';
COMMENT ON COLUMN public.knowledge_documents.content IS 'Full content of the document or reference to its storage.';
COMMENT ON COLUMN public.knowledge_documents.file_path IS 'Original file path if imported from a file.';
COMMENT ON COLUMN public.knowledge_documents.file_type IS 'MIME type or extension of the original file.';
COMMENT ON COLUMN public.knowledge_documents.chunking_method IS 'Method used to split the document into chunks.';
COMMENT ON COLUMN public.knowledge_documents.custom_chunk_size IS 'Custom size used for chunking, if applicable.';

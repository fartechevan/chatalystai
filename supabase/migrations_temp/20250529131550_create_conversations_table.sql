CREATE TABLE public.conversations (
    conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT,
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'open',
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- Assuming teams table exists
    -- Add other relevant columns for conversations here
    -- e.g., customer_id UUID REFERENCES public.customers(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optional: Add an RLS policy if needed, similar to other tables
-- ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all access to conversations for authenticated users"
-- ON public.conversations
-- FOR ALL
-- TO authenticated
-- USING (true);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_conversations_updated
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.conversations IS 'Stores conversation records.';

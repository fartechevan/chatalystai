-- Add commands column to ai_agents table
ALTER TABLE public.ai_agents 
ADD COLUMN IF NOT EXISTS commands JSONB DEFAULT '{}' NOT NULL;

-- Add comment for the new column
COMMENT ON COLUMN public.ai_agents.commands IS 'JSON object storing keyword-URL/response mappings for direct command responses. Format: {"keyword1": "url1", "keyword2": "response2"}';

-- Create index for efficient JSON queries on commands
CREATE INDEX IF NOT EXISTS idx_ai_agents_commands ON public.ai_agents USING GIN (commands);
-- Create ENUM type for session status
CREATE TYPE public.ai_session_status AS ENUM (
    'active',
    'closed',
    'error'
);

-- Add status column to ai_agent_sessions table
ALTER TABLE public.ai_agent_sessions
ADD COLUMN status public.ai_session_status DEFAULT 'active' NOT NULL;

-- Add index for faster status lookups
CREATE INDEX idx_ai_agent_sessions_status ON public.ai_agent_sessions(status);

-- Optional: Backfill existing rows (assuming they are all active)
-- UPDATE public.ai_agent_sessions SET status = 'active' WHERE status IS NULL;

COMMENT ON COLUMN public.ai_agent_sessions.status IS 'The current status of the AI agent session.';

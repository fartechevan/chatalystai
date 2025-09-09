-- Drop is_active column from ai_agent_sessions table
-- This field is redundant since we already use the status field to determine session state

ALTER TABLE public.ai_agent_sessions 
DROP COLUMN IF EXISTS is_active;
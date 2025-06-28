-- Create an ENUM type for activation_mode for better data integrity
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_activation_mode') THEN
        CREATE TYPE public.agent_activation_mode AS ENUM ('keyword', 'always_on');
    END IF;
END $$;

-- Add the activation_mode column to the ai_agents table
ALTER TABLE public.ai_agents
ADD COLUMN IF NOT EXISTS activation_mode public.agent_activation_mode DEFAULT 'keyword';

-- Add a comment for clarity
COMMENT ON COLUMN public.ai_agents.activation_mode IS 'Defines how the agent activates: by keyword or always on.';

-- Step 1: Create the new ai_agent_channels table
CRETE TABLE public.ai_agent_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  integrations_config_id UUID NOT NULL REFERENCES public.integrations_config(id) ON DELETE CASCADE,
  is_enabled_on_channel BOOLEAN DEFAULT TRUE,
  activation_mode TEXT CHECK (activation_mode IN ('keyword', 'always_on')),
  keyword_trigger TEXT,
  stop_keywords TEXT[],
  session_timeout_minutes INTEGER DEFAULT 60,
  error_message TEXT DEFAULT 'Sorry, I can''t help with that right now, we''ll get in touch with you shortly.',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Migrate data from ai_agent_integrations to ai_agent_channels with proper type casting
INSERT INTO public.ai_agent_channels (agent_id, integrations_config_id, activation_mode, stop_keywords, session_timeout_minutes, error_message, created_at, updated_at)
SELECT
  agent_id,
  integrations_config_id,
  activation_mode,
  CASE 
    WHEN stop_keywords IS NULL THEN NULL
    WHEN jsonb_typeof(stop_keywords::jsonb) = 'array' THEN 
      ARRAY(SELECT jsonb_array_elements_text(stop_keywords::jsonb))
    ELSE stop_keywords
  END as stop_keywords,
  session_timeout_minutes,
  error_message,
  created_at,
  updated_at
FROM public.ai_agent_integrations;

-- Step 3: Drop the old ai_agent_integrations table
DROP TABLE public.ai_agent_integrations;

-- Step 4: Alter the ai_agents table
ALTER TABLE public.ai_agents
DROP COLUMN IF EXISTS activation_mode,
DROP COLUMN IF EXISTS keyword_trigger,
DROP COLUMN IF EXISTS knowledge_document_ids;

-- Dedicated script to ensure all tenant_id and team_id columns and their FK constraints are dropped.

-- Table: integrations_config
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS integrations_config_tenant_id_fkey;
ALTER TABLE public.integrations_config DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS integrations_config_team_id_fkey;
ALTER TABLE public.integrations_config DROP COLUMN IF EXISTS team_id;

-- Table: integrations
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_tenant_id_fkey;
ALTER TABLE public.integrations DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_team_id_fkey;
ALTER TABLE public.integrations DROP COLUMN IF EXISTS team_visibility; -- Also remove this if it was tied to team_id
ALTER TABLE public.integrations DROP COLUMN IF EXISTS team_id;

-- Table: leads
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads' AND table_schema = 'public') THEN
    ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_tenant_id_fkey;
    ALTER TABLE public.leads DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_team_id_fkey;
    ALTER TABLE public.leads DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: pipelines
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pipelines' AND table_schema = 'public') THEN
    ALTER TABLE public.pipelines DROP CONSTRAINT IF EXISTS pipelines_tenant_id_fkey;
    ALTER TABLE public.pipelines DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.pipelines DROP CONSTRAINT IF EXISTS pipelines_team_id_fkey;
    ALTER TABLE public.pipelines DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: batch_sentiment_analysis
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'batch_sentiment_analysis' AND table_schema = 'public') THEN
    ALTER TABLE public.batch_sentiment_analysis DROP CONSTRAINT IF EXISTS batch_sentiment_analysis_tenant_id_fkey;
    ALTER TABLE public.batch_sentiment_analysis DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.batch_sentiment_analysis DROP CONSTRAINT IF EXISTS batch_sentiment_analysis_team_id_fkey;
    ALTER TABLE public.batch_sentiment_analysis DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: conversations
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations' AND table_schema = 'public') THEN
    ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_tenant_id_fkey;
    ALTER TABLE public.conversations DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_team_id_fkey;
    ALTER TABLE public.conversations DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: customers
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
    ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_tenant_id_fkey;
    ALTER TABLE public.customers DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_team_id_fkey;
    ALTER TABLE public.customers DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: plans
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'plans' AND table_schema = 'public') THEN
    ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_tenant_id_fkey;
    ALTER TABLE public.plans DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_team_id_fkey;
    ALTER TABLE public.plans DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: subscriptions
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriptions' AND table_schema = 'public') THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tenant_id_fkey;
    ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_team_id_fkey;
    ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS team_id;
END IF; END $$;

-- Table: ai_agents
DO $$ BEGIN IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_agents' AND table_schema = 'public') THEN
    ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_tenant_id_fkey;
    ALTER TABLE public.ai_agents DROP COLUMN IF EXISTS tenant_id;
    ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_team_id_fkey;
    ALTER TABLE public.ai_agents DROP COLUMN IF EXISTS team_id;
END IF; END $$;

SELECT 'Attempted to drop all remaining tenant_id and team_id columns and constraints.';

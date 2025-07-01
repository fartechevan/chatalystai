CREATE TABLE public.agent_conversations (
    added_to_knowledge_base bool DEFAULT false,
    knowledge_used jsonb,
    knowledge_chunk_id uuid,
    created_at timestamptz DEFAULT now(),
    message_content text,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid,
    knowledge_document_id uuid,
    message_timestamp timestamptz DEFAULT now(),
    sender_type sender_type NOT NULL,
    needs_review bool DEFAULT true
);
CREATE TABLE public.ai_agent_integrations (
    error_message text DEFAULT 'Sorry, I can''t help with that right now, we''ll get in touch with you shortly.'::text,
    session_timeout_minutes int4 DEFAULT 60,
    stop_keywords _text DEFAULT '{}'::text[],
    activation_mode text DEFAULT 'keyword'::text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    agent_id uuid NOT NULL,
    integrations_config_id uuid
);
CREATE TABLE public.ai_agent_knowledge_documents (
    created_at timestamptz NOT NULL DEFAULT now(),
    agent_id uuid NOT NULL,
    document_id uuid NOT NULL
);
CREATE TABLE public.ai_agent_sessions (
    conversation_history jsonb,
    contact_identifier text NOT NULL,
    is_active bool DEFAULT false,
    last_interaction_timestamp timestamptz DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    agent_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    status ai_session_status NOT NULL DEFAULT 'active'::ai_session_status,
    integrations_config_id uuid
);
CREATE TABLE public.ai_agents (
    user_id uuid NOT NULL,
    custom_agent_config jsonb,
    agent_type text NOT NULL DEFAULT 'chattalyst'::text,
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    is_enabled bool DEFAULT true,
    activation_mode agent_activation_mode DEFAULT 'keyword'::agent_activation_mode,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    keyword_trigger text,
    prompt text NOT NULL,
    name text NOT NULL,
    knowledge_document_ids _uuid
);
CREATE TABLE public.appointments (
    start_time timestamptz,
    contact_identifier text,
    source_channel text DEFAULT 'whatsapp'::text,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    status text DEFAULT 'scheduled'::text,
    notes text,
    title text,
    end_time timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.batch_sentiment_analysis (
    start_date date NOT NULL,
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    overall_sentiment text,
    neutral_count int4 DEFAULT 0,
    summary text,
    positive_count int4 DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    conversation_ids _uuid,
    end_date date NOT NULL,
    negative_count int4 DEFAULT 0
);
CREATE TABLE public.batch_sentiment_analysis_details (
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    batch_analysis_id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    description text,
    sentiment sentiment_enum NOT NULL,
    id int8 NOT NULL
);
CREATE TABLE public.broadcast_recipients (
    broadcast_id uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    sent_at timestamptz,
    customer_id uuid,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phone_number text NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    error_message text
);
CREATE TABLE public.broadcasts (
    updated_at timestamptz DEFAULT now(),
    message_text text NOT NULL,
    integration_config_id uuid,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    instance_id text,
    integration_id uuid,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    segment_id uuid,
    status text DEFAULT 'pending'::text
);
CREATE TABLE public.conversation_participants (
    left_at timestamp,
    role role_enum,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL,
    customer_id uuid,
    external_user_identifier varchar(255),
    joined_at timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.conversation_summaries (
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    summary text NOT NULL,
    conversation_id uuid NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid()
);
CREATE TABLE public.conversations (
    integrations_id uuid,
    lead_id uuid,
    conversation_id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE TABLE public.customers (
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    metadata jsonb DEFAULT '{}'::jsonb,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text,
    company_name text,
    company_address text,
    phone_number text NOT NULL
);
CREATE TABLE public.documents (
    metadata jsonb,
    embedding vector,
    id uuid NOT NULL,
    content text
);
CREATE TABLE public.evolution_webhook_events (
    source_identifier varchar(255),
    created_at timestamptz DEFAULT now(),
    payload jsonb NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    processing_status varchar(20) NOT NULL,
    event_type varchar(100) NOT NULL
);
CREATE TABLE public.integrations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    status integration_status NOT NULL DEFAULT 'coming_soon'::integration_status,
    is_connected bool DEFAULT false,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now()),
    webhook_events jsonb,
    webhook_url text,
    name varchar NOT NULL,
    description text,
    icon_url varchar,
    base_url text DEFAULT 'https://api.evoapicloud.com'::text,
    api_key text
);
CREATE TABLE public.integrations_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    status text,
    owner_id text,
    instance_display_name text,
    token text,
    user_reference_id text,
    instance_id text,
    integration_id uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    pipeline_id uuid
);
CREATE TABLE public.knowledge_chunks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid,
    sequence int4,
    enabled bool NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    metadata text,
    content text NOT NULL,
    embedding vector,
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.knowledge_documents (
    user_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    custom_chunk_size int4,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    file_path text,
    content text NOT NULL,
    chunking_method text,
    title text NOT NULL,
    file_type text
);
CREATE TABLE public.lead_pipeline (
    "position" int4 NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    pipeline_id uuid NOT NULL,
    lead_id uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    stage_id uuid NOT NULL
);
CREATE TABLE public.lead_tags (
    lead_id uuid NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tag_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE TABLE public.leads (
    user_id uuid NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    value numeric DEFAULT 0,
    pipeline_stage_id uuid,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    customer_id uuid
);
CREATE TABLE public.message_logs (
    message_content text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    media_url text,
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    media_details jsonb,
    message_type message_log_type NOT NULL DEFAULT 'unknown'::message_log_type,
    status message_log_status NOT NULL DEFAULT 'pending'::message_log_status,
    direction text NOT NULL DEFAULT 'outgoing'::text,
    recipient_identifier text NOT NULL,
    error_message text,
    provider_message_id text,
    sent_at timestamptz,
    integration_config_id uuid,
    profile_id uuid,
    id uuid NOT NULL DEFAULT gen_random_uuid()
);
CREATE TABLE public.messages (
    message_id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL,
    media_type text,
    sender_participant_id uuid NOT NULL,
    is_read bool NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    media_data jsonb,
    wamid text,
    content text
);
CREATE TABLE public.pipeline_stages (
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    name text NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    pipeline_id uuid NOT NULL,
    "position" int4 NOT NULL
);
CREATE TABLE public.pipelines (
    name text NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    is_default bool DEFAULT false,
    user_id uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE TABLE public.plan_message_usage (
    billing_cycle_year int4 NOT NULL,
    subscription_id uuid NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    last_counted_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    messages_sent_this_cycle int4 NOT NULL DEFAULT 0,
    billing_cycle_month int4 NOT NULL
);
CREATE TABLE public.plans (
    integrations_allowed int4,
    name text NOT NULL,
    owner_id uuid,
    features jsonb,
    token_allocation int4,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    messages_per_month int4,
    price numeric NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.profile_integration_access (
    created_by uuid,
    profile_id uuid NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    integration_id uuid NOT NULL
);
CREATE TABLE public.profiles (
    name text,
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    role app_role NOT NULL DEFAULT 'user'::app_role,
    id uuid NOT NULL
);
CREATE TABLE public.schema_embeddings (
    description text NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    embedding vector,
    created_at timestamptz DEFAULT now(),
    schema_name text NOT NULL,
    table_name text NOT NULL,
    column_name text
);
CREATE TABLE public.segment_contacts (
    added_at timestamptz NOT NULL DEFAULT now(),
    contact_id uuid NOT NULL,
    segment_id uuid NOT NULL
);
CREATE TABLE public.segments (
    created_at timestamptz NOT NULL DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    user_id uuid NOT NULL
);
CREATE TABLE public.subscriptions (
    canceled_at timestamptz,
    current_period_end timestamptz NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    current_period_start timestamptz NOT NULL,
    subscribed_at timestamptz NOT NULL DEFAULT now(),
    status subscription_status NOT NULL,
    plan_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    cancel_at_period_end bool DEFAULT false
);
CREATE TABLE public.tags (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE TABLE public.tasks (
    title text NOT NULL,
    due_date timestamptz NOT NULL,
    assignee_id uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    type task_status,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE TABLE public.token_allocations (
    monthly_tokens int4 NOT NULL DEFAULT 1000,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    user_id uuid NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid()
);
CREATE TABLE public.vector_db_v1 (
    document_id uuid NOT NULL,
    chunk_type text DEFAULT 'text'::text,
    content text,
    embedding vector,
    metadata jsonb,
    id uuid NOT NULL DEFAULT gen_random_uuid()
);
CREATE TABLE public.whatsapp_blast_limits (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    date date NOT NULL,
    blast_limit int4 NOT NULL,
    count int4 NOT NULL DEFAULT 0
);

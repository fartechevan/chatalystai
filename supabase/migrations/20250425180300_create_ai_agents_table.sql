-- Migration: Create the ai_agents table and associated policies/triggers

-- Create the ai_agents table
create table public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null, -- Assuming agents belong to users
  name text not null,
  prompt text not null,
  knowledge_document_ids uuid[], -- Array of document UUIDs from the 'documents' table (assuming 'documents' table exists)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes for common query patterns
create index idx_ai_agents_user_id on public.ai_agents(user_id);

-- Enable Row Level Security (RLS)
alter table public.ai_agents enable row level security;

-- RLS Policies
-- Allow users to view their own agents
create policy "Allow users to view their own agents"
on public.ai_agents for select
using (auth.uid() = user_id);

-- Allow users to insert their own agents
create policy "Allow users to insert their own agents"
on public.ai_agents for insert
with check (auth.uid() = user_id);

-- Allow users to update their own agents
create policy "Allow users to update their own agents"
on public.ai_agents for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Allow users to delete their own agents
create policy "Allow users to delete their own agents"
on public.ai_agents for delete
using (auth.uid() = user_id);

-- Function to update updated_at timestamp (reuse if exists, create if not)
-- Check if the function already exists before creating
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'handle_updated_at') then
    create function public.handle_updated_at()
    returns trigger as $function$
    begin
      new.updated_at = timezone('utc'::text, now());
      return new;
    end;
    $function$ language plpgsql security definer;
  end if;
end;
$$;

-- Trigger to update updated_at on modification
-- Drop trigger if exists before creating to avoid errors on re-run
drop trigger if exists on_ai_agents_updated on public.ai_agents;
create trigger on_ai_agents_updated
  before update on public.ai_agents
  for each row execute procedure public.handle_updated_at();

-- Add comments to columns for clarity
comment on table public.ai_agents is 'Stores configurations for AI agents used in the application.';
comment on column public.ai_agents.id is 'Unique identifier for the AI agent';
comment on column public.ai_agents.user_id is 'The user who owns this agent, references auth.users';
comment on column public.ai_agents.name is 'User-defined name for the agent';
comment on column public.ai_agents.prompt is 'The system prompt defining the agent''s behavior and instructions';
comment on column public.ai_agents.knowledge_document_ids is 'Array of knowledge document UUIDs linked to this agent for RAG';
comment on column public.ai_agents.created_at is 'Timestamp of when the agent was created';
comment on column public.ai_agents.updated_at is 'Timestamp of when the agent was last updated';

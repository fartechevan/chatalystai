-- Add pipeline_id column to integrations_config table
alter table public.integrations_config
add column pipeline_id uuid null;

-- Add foreign key constraint to pipelines table
alter table public.integrations_config
add constraint integrations_config_pipeline_id_fkey
foreign key (pipeline_id) references public.pipelines(id)
on delete set null; -- Set to null if the pipeline is deleted

-- Optional: Add an index for faster lookups if needed
create index if not exists idx_integrations_config_pipeline_id
on public.integrations_config (pipeline_id);

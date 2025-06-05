-- Drop old unique constraints that might exist with tenant_id
-- The exact names might vary if they were not explicitly named during creation.
-- Attempt to drop common default naming patterns or specific known names.
-- Supabase/Postgres default naming for unique constraints: {table_name}_{column_names}_key
-- For partial indexes, the naming can be less predictable if not explicitly set.

-- It's safer to find the constraint names first and then drop them.
-- Example: SELECT conname FROM pg_constraint WHERE conrelid = 'public.integrations_config'::regclass AND contype = 'u';
-- For now, we'll try to drop constraints that were likely created by '20250529210100_add_conditional_unique_constraints_for_instance_id.sql'
-- That migration did not explicitly name the constraints, so we assume default names or names based on its logic.
-- If these names are incorrect, the DROP commands will fail gracefully with IF EXISTS.

-- Assuming the old constraints were named based on the columns and conditions:
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS integrations_config_tenant_id_instance_id_key; -- A possible default name
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS integrations_config_instance_id_key; -- A possible default name for the second constraint

-- More robustly, if specific names were used (e.g. from the previous migration file if it named them):
-- The migration '20250529210100_add_conditional_unique_constraints_for_instance_id.sql'
-- did not explicitly name constraints. Let's try to drop based on common patterns or what Supabase might generate.
-- If these were created by `ADD CONSTRAINT unique_tenant_instance_not_null UNIQUE (tenant_id, instance_id) ...`
-- then the names would be `unique_tenant_instance_not_null`.
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS unique_tenant_instance_not_null;
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS unique_instance_tenant_null;


-- Add new unique constraints based on profile_id using unique indexes for partial uniqueness

-- Drop existing constraints/indexes if they were created with the same names by a previous failed attempt
DROP INDEX IF EXISTS unique_profile_instance_not_null_idx;
DROP INDEX IF EXISTS unique_instance_profile_null_idx;
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS unique_profile_instance_not_null;
ALTER TABLE public.integrations_config DROP CONSTRAINT IF EXISTS unique_instance_profile_null;


-- Index for (profile_id, instance_id) where profile_id IS NOT NULL AND instance_id IS NOT NULL
CREATE UNIQUE INDEX unique_profile_instance_not_null_idx
ON public.integrations_config (profile_id, instance_id)
WHERE (profile_id IS NOT NULL AND instance_id IS NOT NULL);

-- Index for (instance_id) where profile_id IS NULL AND instance_id IS NOT NULL
CREATE UNIQUE INDEX unique_instance_profile_null_idx
ON public.integrations_config (instance_id)
WHERE (profile_id IS NULL AND instance_id IS NOT NULL);

COMMENT ON INDEX unique_profile_instance_not_null_idx IS 'Ensures instance_id is unique per profile_id when profile_id is present.';
COMMENT ON INDEX unique_instance_profile_null_idx IS 'Ensures instance_id is unique when profile_id is not present (e.g., for global or unassigned configs).';

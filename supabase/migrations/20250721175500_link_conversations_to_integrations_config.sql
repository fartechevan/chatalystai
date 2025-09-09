ALTER TABLE public.conversations ADD COLUMN integrations_config_id uuid;

-- Step 2: Populate the new column
-- This query assumes that for each `integrations_id` in `conversations`,
-- there is a corresponding `integration_id` in `integrations_config`.
-- If multiple `integrations_config` records exist for one `integration_id`,
-- you might need to decide which one to use (e.g., the first one).
UPDATE public.conversations c
SET integrations_config_id = (
  SELECT ic.id
  FROM public.integrations_config ic
  WHERE ic.integration_id = c.integrations_id
  LIMIT 1 -- Ensures only one value is returned if there are duplicates
);

-- Step 3: Add the foreign key constraint
-- It's better to add the constraint after populating the data
-- to avoid issues with existing rows that might not have a match.
ALTER TABLE public.conversations
ADD CONSTRAINT fk_integrations_config
FOREIGN KEY (integrations_config_id)
REFERENCES public.integrations_config(id);

-- Step 4: Drop the old column
ALTER TABLE public.conversations
DROP COLUMN integrations_id;

-- Step 5: Rename the new column to the old name
ALTER TABLE public.conversations
RENAME COLUMN integrations_config_id TO integrations_id;

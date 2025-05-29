-- Add integrations_allowed column to plans table
ALTER TABLE public.plans
ADD COLUMN integrations_allowed INTEGER;

-- Update existing plans with their integration limits
-- Assuming 'Trial', 'Starter', and 'Professional' plans exist.
-- If 'Starter' or 'Professional' plans are not yet in your DB,
-- these UPDATE statements won't affect any rows for them.
-- You might need a separate migration or manual step to insert them if they don't exist.

UPDATE public.plans
SET integrations_allowed = 1
WHERE name = 'Trial';

UPDATE public.plans
SET integrations_allowed = 3
WHERE name = 'Starter';

UPDATE public.plans
SET integrations_allowed = 10
WHERE name = 'Professional';

-- For 'Enterprise' or other plans, integrations_allowed will be NULL by default
-- after adding the column. You can update them as needed.
-- Example for Enterprise (if it exists and you want to set a specific limit):
-- UPDATE public.plans
-- SET integrations_allowed = 999 -- Or some other indicator for "unlimited" or "custom"
-- WHERE name = 'Enterprise';

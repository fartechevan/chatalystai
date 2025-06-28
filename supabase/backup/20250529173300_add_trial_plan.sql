-- Add trial_end_date to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN trial_end_date TIMESTAMPTZ NULL;

-- Add a new "Trial" plan
INSERT INTO public.plans (name, price, messages_per_month, token_allocation, features)
VALUES
('Trial', 0, 100, 1000, '["Basic Features", "Limited Support"]');

-- Optionally, update existing users to have a trial period if they don't have a subscription
-- This part is commented out as it depends on specific business logic for existing users.
-- UPDATE public.subscriptions
-- SET
--   plan_id = (SELECT id from public.plans WHERE name = 'Trial' LIMIT 1),
--   status = 'trialing',
--   trial_end_date = NOW() + INTERVAL '7 days',
--   current_period_start = NOW(),
--   current_period_end = NOW() + INTERVAL '7 days'
-- WHERE
--   profile_id NOT IN (SELECT DISTINCT profile_id FROM public.subscriptions WHERE status = 'active');

-- Note: Consider adding a unique constraint or logic to ensure a user can only have one trial.

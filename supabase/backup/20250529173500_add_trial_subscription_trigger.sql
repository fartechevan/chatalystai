-- Function to create a trial subscription for a new user
CREATE OR REPLACE FUNCTION public.create_trial_subscription_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Important for accessing auth.users or other restricted schemas if needed
AS $$
DECLARE
  trial_plan_id UUID;
  trial_duration INTERVAL := INTERVAL '7 days'; -- Define trial duration, e.g., 7 days
BEGIN
  -- Get the ID of the 'Trial' plan
  SELECT id INTO trial_plan_id FROM public.plans WHERE name = 'Trial' LIMIT 1;

  -- If Trial plan exists, insert a new subscription for the new user
  IF trial_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (profile_id, plan_id, status, subscribed_at, current_period_start, current_period_end, trial_end_date)
    VALUES (
      NEW.id, -- Assuming NEW.id is the user_id from the profiles table
      trial_plan_id,
      'trialing',
      NOW(),
      NOW(),
      NOW() + trial_duration,
      NOW() + trial_duration
    );
  ELSE
    -- Optionally, raise a notice or log if the Trial plan is not found
    RAISE NOTICE 'Trial plan not found. Cannot create trial subscription for user %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to call the function after a new profile is inserted
-- Assumes you have a 'profiles' table that is populated after user signup
-- and NEW.id in the 'profiles' table is the user's ID.
CREATE TRIGGER on_new_profile_created_create_trial_subscription
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_trial_subscription_for_new_user();

-- Grant usage on the sequence if plan_id in subscriptions uses a sequence (not typical for UUIDs)
-- GRANT USAGE, SELECT ON SEQUENCE public.plans_id_seq TO authenticated; -- Example, adjust if needed

-- Ensure the function owner can insert into subscriptions and select from plans
-- This is usually handled by the user running migrations, but good to be aware of.

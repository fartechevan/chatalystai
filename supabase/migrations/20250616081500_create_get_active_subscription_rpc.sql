CREATE OR REPLACE FUNCTION get_active_subscription_details_for_profile(profile_id_param uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_id uuid,
  plan_name text,
  messages_per_month integer
)
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a search path to ensure that the function can find the tables
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS subscription_id,
    s.plan_id,
    p.name AS plan_name,
    p.messages_per_month
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.profile_id = profile_id_param
    AND s.status IN ('active', 'trialing', 'past_due')
  LIMIT 1;
END;
$$;

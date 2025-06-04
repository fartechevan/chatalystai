CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    messages_per_month INTEGER,
    token_allocation INTEGER,
    -- integrations_allowed INTEGER will be added by a subsequent migration
    features JSONB,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Or profiles(id) if you have a separate profiles table
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- Optional team association for plans
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at_plans()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_plans_updated
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at_plans();

-- RLS Policies (adjust as needed)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to plans"
ON public.plans
FOR SELECT
USING (true);

CREATE POLICY "Allow admin full access to plans" -- Example: for a superuser or admin role
ON public.plans
FOR ALL
USING (auth.role() = 'service_role') -- Or check for a specific admin role
WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.plans IS 'Stores subscription plan details.';
COMMENT ON COLUMN public.plans.price IS 'Monthly price of the plan.';

-- Seed initial plans (Trial, Starter, Professional, Enterprise)
-- The 'integrations_allowed' column will be populated by a later migration (20250529174500_add_integrations_to_plans.sql)
-- The 'Trial' plan is also inserted by 20250529173300_add_trial_plan.sql, which is fine, it will just update it if it runs after this.
-- To avoid potential conflicts if this script runs after 20250529173300_add_trial_plan.sql, we use ON CONFLICT DO NOTHING or UPDATE.
-- However, given the timestamp, this should run before.

INSERT INTO public.plans (name, price, messages_per_month, token_allocation, features)
VALUES
('Starter', 49.00, 5000, 50000, '["Feature A", "Feature B"]'),
('Professional', 99.00, 15000, 150000, '["Feature A", "Feature B", "Feature C", "Priority Support"]'),
('Enterprise', 0.00, NULL, NULL, '["Custom Features", "Dedicated Support", "SLA"]') -- Price 0, contact for quote
ON CONFLICT (name) DO NOTHING; -- Do nothing if a plan with the same name already exists.

-- The Trial plan is specifically handled in 20250529173300_add_trial_plan.sql
-- and its integrations_allowed is set in 20250529174500_add_integrations_to_plans.sql

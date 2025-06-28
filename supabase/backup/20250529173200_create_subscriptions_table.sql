-- Define subscription_status ENUM type
CREATE TYPE public.subscription_status AS ENUM (
    'active',
    'trialing',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused' -- Added based on common Stripe statuses
);

CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- Optional team association
    status public.subscription_status NOT NULL,
    subscribed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure a user has only one active-like subscription using a partial unique index
CREATE UNIQUE INDEX uq_profile_active_subscription
ON public.subscriptions (profile_id, status)
WHERE (status IN ('active', 'trialing', 'past_due'));

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_subscriptions_updated
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at_subscriptions();

-- RLS Policies (adjust as needed)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own subscriptions"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "Allow service_role full access to subscriptions"
ON public.subscriptions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.subscriptions IS 'Stores user subscription information.';
COMMENT ON COLUMN public.subscriptions.status IS 'Current status of the subscription.';

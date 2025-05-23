CREATE TABLE agent_google_calendar_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    calendar_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE agent_google_calendar_settings IS 'Stores Google Calendar integration settings for AI agents.';
COMMENT ON COLUMN agent_google_calendar_settings.agent_id IS 'Foreign key referencing the AI agent.';
COMMENT ON COLUMN agent_google_calendar_settings.calendar_id IS 'The ID of the Google Calendar to use for bookings.';
COMMENT ON COLUMN agent_google_calendar_settings.access_token IS 'OAuth 2.0 access token for Google Calendar API.';
COMMENT ON COLUMN agent_google_calendar_settings.refresh_token IS 'OAuth 2.0 refresh token for Google Calendar API.';
COMMENT ON COLUMN agent_google_calendar_settings.token_expiry_timestamp IS 'Timestamp when the access token expires.';

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_agent_google_calendar_settings_updated_at
BEFORE UPDATE ON agent_google_calendar_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

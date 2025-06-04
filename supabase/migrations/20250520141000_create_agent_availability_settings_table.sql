CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

CREATE TABLE agent_availability_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    start_time TIME, -- Time agent starts working on this day
    end_time TIME,   -- Time agent stops working on this day
    is_available BOOLEAN DEFAULT TRUE, -- Whether the agent is available on this day
    appointment_duration_minutes INTEGER DEFAULT 60, -- Default appointment duration in minutes
    buffer_time_minutes INTEGER DEFAULT 15, -- Default buffer time between appointments in minutes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (agent_id, day_of_week) -- Ensure one entry per agent per day
);

COMMENT ON TABLE agent_availability_settings IS 'Stores availability settings for AI agents, such as working hours and appointment configurations.';
COMMENT ON COLUMN agent_availability_settings.agent_id IS 'Foreign key referencing the AI agent.';
COMMENT ON COLUMN agent_availability_settings.day_of_week IS 'The day of the week for this availability setting.';
COMMENT ON COLUMN agent_availability_settings.start_time IS 'The time the agent starts working on this specific day.';
COMMENT ON COLUMN agent_availability_settings.end_time IS 'The time the agent stops working on this specific day.';
COMMENT ON COLUMN agent_availability_settings.is_available IS 'Indicates if the agent is available on this day.';
COMMENT ON COLUMN agent_availability_settings.appointment_duration_minutes IS 'Default duration for appointments booked with this agent.';
COMMENT ON COLUMN agent_availability_settings.buffer_time_minutes IS 'Buffer time to add after each appointment.';

-- Use the existing trigger function to update the updated_at column
CREATE TRIGGER set_agent_availability_settings_updated_at
BEFORE UPDATE ON agent_availability_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

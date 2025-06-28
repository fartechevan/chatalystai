CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE teams IS 'Stores team information';
COMMENT ON COLUMN teams.id IS 'Unique identifier for the team';
COMMENT ON COLUMN teams.name IS 'Name of the team';
COMMENT ON COLUMN teams.created_at IS 'Timestamp of when the team was created';
COMMENT ON COLUMN teams.updated_at IS 'Timestamp of when the team was last updated';

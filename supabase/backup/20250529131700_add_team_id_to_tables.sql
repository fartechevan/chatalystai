-- Add team_id to integrations table
ALTER TABLE integrations
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

COMMENT ON COLUMN integrations.team_id IS 'Foreign key referencing the teams table, if the integration is team-specific';

-- Add team_visibility to integrations table
ALTER TABLE integrations
ADD COLUMN team_visibility BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN integrations.team_visibility IS 'Indicates if the integration is visible to the team';

-- Add team_id to leads table (assuming leads table exists, if not, this part needs adjustment)
-- Check existing migrations for leads table name if different
-- For now, assuming 'leads' is the table name.
-- If your leads table is named differently, please adjust.
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads' AND table_schema = 'public') THEN
        ALTER TABLE leads
        ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

        COMMENT ON COLUMN leads.team_id IS 'Foreign key referencing the teams table, for team-specific leads';
    END IF;
END $$;

-- Add team_id to pipelines table
ALTER TABLE pipelines
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

COMMENT ON COLUMN pipelines.team_id IS 'Foreign key referencing the teams table, for team-specific pipelines';

-- Note: You might need to update existing data to assign a team_id if these tables already have records.
-- Consider how to handle existing records that are not associated with any team.
-- For example, you could create a default team or leave team_id as NULL for existing records.

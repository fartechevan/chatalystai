CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE team_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role team_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (team_id, user_id),
    CONSTRAINT team_users_role_check CHECK (role IN ('owner', 'admin', 'member'))
);

COMMENT ON TABLE team_users IS 'Stores team membership and roles';
COMMENT ON COLUMN team_users.id IS 'Unique identifier for the team user mapping';
COMMENT ON COLUMN team_users.team_id IS 'Foreign key referencing the teams table';
COMMENT ON COLUMN team_users.user_id IS 'Foreign key referencing the auth.users table';
COMMENT ON COLUMN team_users.role IS 'Role of the user in the team (owner, admin, member)';
COMMENT ON COLUMN team_users.created_at IS 'Timestamp of when the user was added to the team';

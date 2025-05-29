import React from 'react';
import { useTeams } from '@/context/TeamContext';
import TeamDetails from '@/components/teams/TeamDetails'; // To be created
import TeamUsers from '@/components/teams/TeamUsers'; // To be created
import { Button } from '@/components/ui/button'; // For "Create Team" button
import { PlusCircle } from 'lucide-react';

const TeamsPage: React.FC = () => {
  const { teams, currentTeam, setCurrentTeam, createTeam, isLoading } = useTeams();

  // Placeholder for actual UI components
  // For now, just showing a basic structure

  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState('');

  const handleCreateTeam = async () => {
    if (newTeamName.trim()) {
      const newTeam = await createTeam(newTeamName.trim());
      if (newTeam) {
        setNewTeamName('');
        setShowCreateModal(false);
        // Optionally, show a success toast
      } else {
        // Optionally, show an error toast
      }
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Teams Management</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Team
        </Button>
      </div>

      {isLoading && <p>Loading teams...</p>}

      {!isLoading && teams.length === 0 && (
        <div className="text-center py-10">
          <p className="text-lg text-muted-foreground">You are not part of any teams yet.</p>
          <Button onClick={() => setShowCreateModal(true)} className="mt-4">
            Create Your First Team
          </Button>
        </div>
      )}

      {!isLoading && teams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <h2 className="text-xl font-medium mb-3">Your Teams</h2>
            <ul className="space-y-2">
              {teams.map((team) => (
                <li key={team.id}>
                  <Button
                    variant={currentTeam?.id === team.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setCurrentTeam(team)}
                  >
                    {team.name}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            {currentTeam ? (
              <div className="space-y-6">
                <TeamDetails team={currentTeam} />
                <TeamUsers teamId={currentTeam.id} />
              </div>
            ) : (
              <p className="text-muted-foreground">Select a team to see details or create a new one.</p>
            )}
          </div>
        </div>
      )}

      {/* Basic Create Team Modal (can be replaced with ShadCN Dialog) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Create New Team</h3>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Team Name"
              className="w-full p-2 border rounded mb-4 bg-input text-foreground"
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleCreateTeam} disabled={isLoading || !newTeamName.trim()}>
                {isLoading ? 'Creating...' : 'Create Team'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;

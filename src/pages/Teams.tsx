import React, { useEffect } from 'react'; // Import useEffect
import { useTeams } from '@/context/TeamContext';
import TeamDetails from '@/components/teams/TeamDetails';
import TeamUsers from '@/components/teams/TeamUsers';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { usePageActionContext } from '@/context/PageActionContext'; // Import context

const TeamsPage: React.FC = () => {
  const { teams, currentTeam, setCurrentTeam, createTeam, isLoading } = useTeams();
  const { setPrimaryAction } = usePageActionContext(); // Use the context

  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState('');

  useEffect(() => {
    // Set the primary action for the header
    setPrimaryAction({
      id: 'create-new-team',
      label: 'Create New Team',
      icon: PlusCircle,
      action: () => setShowCreateModal(true),
    });

    // Clear the action when the component unmounts
    return () => {
      setPrimaryAction(null);
    };
  }, [setPrimaryAction, setShowCreateModal]);

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
    <> {/* Using a fragment as the new root */}
      {/* Remove the title and button from here, they are now in DashboardLayout or handled by context */}
      {/* <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Teams Management</h1>
      </div> */}
      {/* The page title "Teams" is now set by DashboardLayout based on route */}
      {/* The "Create New Team" button is now in the header via PageActionContext */}

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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6"> {/* Changed md:grid-cols-4 to md:grid-cols-5 */}
          <div className="md:col-span-1"> {/* This now means 1/5 width on md+ screens */}
            {/* <h2 className="text-xl font-medium mb-3">Your Teams</h2> REMOVED TITLE */}
            <ul className="space-y-2"> {/* REMOVED pt-3 */}
              {teams.map((team) => (
                <li key={team.id}>
                  <Button
                    variant={currentTeam?.id === team.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start" // Reverted padding change
                    onClick={() => setCurrentTeam(team)}
                  >
                    {team.name}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-4"> {/* Changed md:col-span-3 to md:col-span-4 */}
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
    </>
  );
};

export default TeamsPage;

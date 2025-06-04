import React, { useState, useEffect } from 'react';
import { Team, useTeams } from '@/context/TeamContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';

interface TeamDetailsProps {
  team: Team;
}

const TeamDetails: React.FC<TeamDetailsProps> = ({ team }) => {
  const { updateTeam, deleteTeam, isCurrentUserAdmin, isCurrentUserOwner, isLoading } = useTeams();
  const [isEditing, setIsEditing] = useState(false);
  const [teamName, setTeamName] = useState(team.name);

  useEffect(() => {
    setTeamName(team.name);
    setIsEditing(false);
  }, [team]);

  const handleUpdateTeam = async () => {
    if (teamName.trim() === '') {
      toast({ title: "Error", description: "Team name cannot be empty.", variant: "destructive" });
      return;
    }
    if (teamName.trim() === team.name) {
      setIsEditing(false);
      return;
    }
    const updatedTeam = await updateTeam(team.id, teamName.trim());
    if (updatedTeam) {
      toast({ title: "Success", description: "Team name updated." });
      setIsEditing(false);
    } else {
      toast({ title: "Error", description: "Failed to update team name.", variant: "destructive" });
    }
  };

  const handleDeleteTeam = async () => {
    // Add a confirmation dialog here for production use
    if (window.confirm(`Are you sure you want to delete the team "${team.name}"? This action cannot be undone.`)) {
      const success = await deleteTeam(team.id);
      if (success) {
        toast({ title: "Success", description: `Team "${team.name}" deleted.` });
        // Current team will be reset by context if it was the one deleted
      } else {
        toast({ title: "Error", description: "Failed to delete team. You might not be the owner.", variant: "destructive" });
      }
    }
  };

  const canManageTeam = isCurrentUserAdmin(team.id);
  const canDeleteTeam = isCurrentUserOwner(team.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Details</CardTitle>
        <CardDescription>Manage your team's information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="teamName">Team Name</Label>
          {isEditing && canManageTeam ? (
            <Input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="mt-1"
              disabled={isLoading}
            />
          ) : (
            <p className="text-lg font-semibold mt-1">{team.name}</p>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Created: {new Date(team.created_at).toLocaleDateString()}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        {canManageTeam && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleUpdateTeam} disabled={isLoading}>Save</Button>
                <Button variant="outline" onClick={() => { setIsEditing(false); setTeamName(team.name); }} disabled={isLoading}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} disabled={isLoading}>Edit Name</Button>
            )}
          </div>
        )}
        {canDeleteTeam && (
          <Button
            variant="destructive"
            onClick={handleDeleteTeam}
            className={!canManageTeam ? 'mt-4 sm:mt-0' : ''} // Add margin if edit buttons aren't shown
            disabled={isLoading}
          >
            Delete Team
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default TeamDetails;

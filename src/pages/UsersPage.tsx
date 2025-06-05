import React, { useEffect } from 'react';
// import { useTeams } from '@/context/TeamContext'; // This will be adapted or replaced
import TeamDetails from '@/components/teams/TeamDetails'; // This component will need to be adapted for Tenant details if used
import TeamUsers from '@/components/teams/TeamUsers';   // This component will list users from tenant_users
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react'; // Icon for inviting users
import { usePageActionContext } from '@/context/PageActionContext';

// Placeholder type for what a "Team" (now Tenant) might look like in the UI
interface DisplayTeam {
  id: string; // This will be the tenant_id
  name: string; // This could be a tenant name or a default like "My Team"
  // Add other properties if TeamDetails uses them
}

// Placeholder type for what a "Team Member" (now TenantUser) might look like
interface DisplayTeamMember {
  user_id: string; // from tenant_users
  email?: string; // from joined profiles/auth.users
  role: string;  // from tenant_users
  // Add other properties if TeamUsers list uses them
}

const UsersPage: React.FC = () => {
  // const { teams, currentTeam, setCurrentTeam, createTeam, isLoading } = useTeams(); // OLD
  // TODO: Replace with logic to fetch the user's tenant and its members
  // For now, using placeholders. The user effectively has one "team" which is their tenant.
  const [currentTeam, setCurrentTeam] = React.useState<DisplayTeam | null>({ id: 'placeholder-tenant-id', name: 'My Team' });
  const [teamMembers, setTeamMembers] = React.useState<DisplayTeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const { setPrimaryAction } = usePageActionContext();

  const [showInviteMemberModal, setShowInviteMemberModal] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('member');

  useEffect(() => {
    // TODO: Fetch the actual current tenant (e.g., based on authUser.id -> tenants.owner_profile_id)
    // TODO: Fetch actual members for that tenant from tenant_users table
    // For now, currentTeam is a placeholder.

    setPrimaryAction({
      id: 'invite-team-member',
      label: 'Invite Member', // Changed from "Create New Team"
      icon: UserPlus,
      action: () => setShowInviteMemberModal(true),
    });

    return () => {
      setPrimaryAction(null);
    };
  }, [setPrimaryAction, setShowInviteMemberModal]);

  const handleInviteMember = async () => {
    if (inviteEmail.trim() && currentTeam) {
      setIsLoading(true);
      console.log(`Inviting ${inviteEmail} to team (tenant) ${currentTeam.id} with role ${inviteRole}`);
      try {
        // const { error } = await supabase.functions.invoke('invite-user-to-tenant', {
        //   body: { email: inviteEmail, tenant_id: currentTeam.id, role: inviteRole }
        // });
        // if (error) throw error;
        // TODO: Show success toast
        // TODO: Refresh teamMembers list
        setInviteEmail('');
        setInviteRole('member');
        setShowInviteMemberModal(false);
      } catch (error) {
        console.error("Failed to invite member:", error);
        // TODO: Show error toast
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // The concept of multiple "teams" to select from is gone for this page.
  // The user is always managing their single "team" (tenant).
  // The left-hand team selection panel is removed.

  return (
    <>
      {isLoading && <p>Loading team information...</p>}

      {!isLoading && !currentTeam && (
        <div className="text-center py-10">
          <p className="text-lg text-muted-foreground">
            No team information available. 
            {/* TODO: Logic for initial tenant/team setup if one doesn't exist for the user */}
          </p>
        </div>
      )}

      {!isLoading && currentTeam && (
        <div className="space-y-6"> {/* Main content area */}
          {/* TeamDetails might show currentTeam.name and other tenant-related info if needed */}
          {/* <TeamDetails team={currentTeam} /> */}
          
          {/* TeamUsers will be adapted to list users from tenant_users for the currentTeam.id (tenant_id) */}
          {/* It will also contain the logic for changing roles or removing members */}
          <TeamUsers teamId={currentTeam.id} /> 
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteMemberModal && currentTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Invite New Member to {currentTeam.name}</h3>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Member's Email"
              className="w-full p-2 border rounded mb-4 bg-input text-foreground"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full p-2 border rounded mb-4 bg-input text-foreground"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              {/* Owner role is typically assigned to the tenant creator */}
            </select>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowInviteMemberModal(false)}>Cancel</Button>
              <Button onClick={handleInviteMember} disabled={isLoading || !inviteEmail.trim()}>
                {isLoading ? 'Sending Invite...' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UsersPage;

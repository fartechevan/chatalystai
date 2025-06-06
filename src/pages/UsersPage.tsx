import React, { useEffect } from 'react';
// import { useTeams } from '@/context/TeamContext'; // OLD - Team/Tenant context removed
// import TeamDetails from '@/components/teams/TeamDetails'; // OLD - Team/Tenant details component
// import TeamUsers from '@/components/teams/TeamUsers';   // OLD - Team/Tenant users component
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react'; // Icon for inviting users
import { usePageActionContext } from '@/context/PageActionContext';

// Removed DisplayTeam and DisplayTeamMember interfaces as they were tenant-based.

const UsersPage: React.FC = () => {
  // Removed state related to currentTeam, teamMembers as they were tenant-based.
  const [isLoading, setIsLoading] = React.useState(false); // Kept for general loading, though its use might change.

  const { setPrimaryAction } = usePageActionContext();

  const [showInviteMemberModal, setShowInviteMemberModal] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('member'); // Default role

  useEffect(() => {
    // Removed TODOs related to fetching tenant data.
    // The primary action "Invite Member" might still be relevant for inviting users to the platform/profile.
    setPrimaryAction({
      id: 'invite-user', // Renamed from 'invite-team-member'
      label: 'Invite User',
      icon: UserPlus,
      action: () => setShowInviteMemberModal(true),
    });

    return () => {
      setPrimaryAction(null);
    };
  }, [setPrimaryAction]); // Removed setShowInviteMemberModal from dependencies as it's stable

  const handleInviteMember = async () => {
    // Removed currentTeam dependency for this action.
    if (inviteEmail.trim()) {
      setIsLoading(true);
      console.log(`Attempting to invite ${inviteEmail} with role ${inviteRole}. Backend logic TBD.`);
      // The actual invitation logic needs to be implemented based on the new user model (e.g., direct profile invitation).
      // The old 'invite-user-to-tenant' Supabase function was removed.
      // try {
      //   // TODO: Implement new invitation logic here if applicable
      //   // Example: await supabase.functions.invoke('invite-user-to-profile', { body: { email: inviteEmail, role: inviteRole } });
      //   console.log('Placeholder for new invite logic.');
      //   // TODO: Show success toast
      //   // TODO: Refresh user list if applicable
      //   setInviteEmail('');
      //   setInviteRole('member');
      //   setShowInviteMemberModal(false);
      // } catch (error) {
      //   console.error("Failed to invite member:", error);
      //   // TODO: Show error toast
      // } finally {
      //   setIsLoading(false);
      // }
      // For now, just simulate closing and resetting
      setTimeout(() => {
        setInviteEmail('');
        setInviteRole('member');
        setShowInviteMemberModal(false);
        setIsLoading(false);
        console.log('Simulated invite completion.');
      }, 1000);
    }
  };
  
  // Comments about team/tenant selection removed.

  return (
    <>
      {/* isLoading state might be used for fetching user list in the future */}
      {isLoading && <p>Loading user information...</p>}

      {/* Placeholder for displaying users. The old currentTeam logic is removed. */}
      {/* The TeamUsers component was tenant-based and is commented out. */}
      {/* A new component or logic would be needed to display users associated with the current authenticated user's profile/account. */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">User Management</h2>
        <p className="text-muted-foreground">
          User listing and management features will be displayed here.
          {/* <TeamUsers teamId={currentTeam.id} />  // OLD, commented out */}
        </p>
      </div>
      

      {/* Invite Member Modal - kept, but context changed */}
      {showInviteMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Invite New User</h3>
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
              {/* Removed comment about tenant creator for owner role */}
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

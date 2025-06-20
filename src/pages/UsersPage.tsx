import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react'; // Icon for inviting users
// import { usePageActionContext } from '@/context/PageActionContext'; // No longer used for primary action here
import { useOutletContext } from 'react-router-dom';
import type { PageHeaderContextType } from '@/components/dashboard/DashboardLayout'; // Import context type
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client
import { toast } from '@/hooks/use-toast'; // Import toast

// Removed DisplayTeam and DisplayTeamMember interfaces as they were tenant-based.

const UsersPage: React.FC = () => {
  // Removed state related to currentTeam, teamMembers as they were tenant-based.
  const [isLoading, setIsLoading] = React.useState(false); // Kept for general loading, though its use might change.

  // const { setPrimaryAction } = usePageActionContext(); // No longer used for primary action here
  const outletContext = useOutletContext<PageHeaderContextType | undefined>();
  const setHeaderActions = outletContext?.setHeaderActions;


  const [showInviteMemberModal, setShowInviteMemberModal] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('member'); // Default role

  useEffect(() => {
    const inviteButton = (
      <Button onClick={() => setShowInviteMemberModal(true)} className="flex items-center gap-2">
        <UserPlus className="h-4 w-4" />
        Invite User
      </Button>
    );
    if (setHeaderActions) {
      setHeaderActions(inviteButton);
    }

    return () => {
      if (setHeaderActions) {
        setHeaderActions(null);
      }
    };
  }, [setHeaderActions, setShowInviteMemberModal]);

  const handleInviteMember = async () => {
    // Removed currentTeam dependency for this action.
    if (inviteEmail.trim()) {
      setIsLoading(true);
      console.log(`Attempting to invite ${inviteEmail} with role ${inviteRole}.`);
      try {
        const { data, error } = await supabase.functions.invoke('invite-user', {
          body: { email: inviteEmail, role: inviteRole },
        });

        if (error) {
          console.error('Error inviting user:', error);
          toast({
            title: 'Invitation Failed',
            description: error.message || 'An unexpected error occurred.',
            variant: 'destructive',
          });
        } else {
          console.log('Invitation successful:', data);
          toast({
            title: 'Invitation Sent',
            description: `An invitation has been sent to ${inviteEmail}.`,
          });
          setInviteEmail('');
          setInviteRole('member');
          setShowInviteMemberModal(false);
          // Optionally, refresh the user list here if it's displayed on this page
          // queryClient.invalidateQueries(['users']); // Example if using react-query
        }
      } catch (error: unknown) {
        console.error('Failed to invoke invite-user function:', error);
        let errorMessage = 'An unexpected error occurred while sending the invitation.';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
          // Safely access message property
          const errObj = error as { message: string };
          errorMessage = errObj.message;
        }
        // Ensure toast is called correctly
        toast({
          title: 'Invitation Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
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

import React, { useState } from 'react';
import { TeamUser, useTeams } from '@/context/TeamContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Table components will be replaced by TeamUsersDataTable
import { UserPlus } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider'; // To get current user's ID
import { TeamUsersDataTable } from './list/TeamUsersDataTable';
import { columns as teamMemberColumns, TeamMember } from './list/columns';

interface TeamUsersProps {
  teamId: string;
}

// Extend TeamUser to include the nested user email for display
interface DisplayTeamUser extends TeamUser {
  user?: {
    id: string;
    email?: string; // Email might be optional depending on your Supabase setup
  };
}

const TeamUsers: React.FC<TeamUsersProps> = ({ teamId }) => {
  const { 
    teamUsers, 
    addUserToTeam, 
    removeUserFromTeam, 
    updateUserRole, 
    isCurrentUserAdmin,
    isCurrentUserOwner,
    isLoading 
  } = useTeams();
  const { user: currentUser } = useAuth(); // Get the currently authenticated user

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState(''); // Assuming we add by email
  const [newUserRole, setNewUserRole] = useState<'admin' | 'member'>('member');

  const canManageUsers = isCurrentUserAdmin(teamId);

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      toast({ title: "Error", description: "User email cannot be empty.", variant: "destructive" });
      return;
    }

    // In a real app, you'd first query Supabase to get the user_id for the given email.
    // For simplicity, this example assumes you have a way to get user_id from email.
    // This is a placeholder. You'll need to implement `getUserIdByEmail`.
    // const userId = await getUserIdByEmail(newUserEmail.trim()); 
    // if (!userId) {
    //   toast({ title: "Error", description: "User not found with that email.", variant: "destructive" });
    //   return;
    // }
    // For now, we'll ask the user for the ID directly for this example, or use a Supabase function.
    // This part needs a robust solution for finding user by email.
    // Let's assume for now the user enters a user_id directly for simplicity in this example.
    // This is NOT production ready for adding by email.

    toast({ title: "Info", description: "Adding user by email requires looking up user ID. This feature is simplified for now."});
    // Placeholder: Use a prompt or a more complex UI to get user ID if adding by email
    // For this example, let's simulate adding if an ID was provided (e.g. newUserEmail is actually a User ID)
    
    // Let's assume newUserEmail is the user_id for this simplified example
    const userIdToAdd = newUserEmail.trim(); 
    if (!userIdToAdd) { // Basic validation for ID
        toast({ title: "Error", description: "User ID cannot be empty.", variant: "destructive" });
        return;
    }


    const addedUser = await addUserToTeam(teamId, userIdToAdd, newUserRole);
    if (addedUser) {
      toast({ title: "Success", description: `User added to team.` });
      setNewUserEmail('');
      setNewUserRole('member');
      setShowAddUserModal(false);
    } else {
      toast({ title: "Error", description: "Failed to add user. They may already be in the team or the ID is invalid.", variant: "destructive" });
    }
  };

  const handleRemoveUser = async (teamUserId: string, userEmail?: string) => {
    const teamUserToRemove = teamUsers.find(tu => tu.id === teamUserId);
    if (teamUserToRemove?.user_id === currentUser?.id) {
        toast({ title: "Error", description: "You cannot remove yourself from the team.", variant: "destructive" });
        return;
    }
    if (window.confirm(`Are you sure you want to remove ${userEmail || 'this user'} from the team?`)) {
      const success = await removeUserFromTeam(teamUserId);
      if (success) {
        toast({ title: "Success", description: `User removed from team.` });
      } else {
        toast({ title: "Error", description: "Failed to remove user.", variant: "destructive" });
      }
    }
  };

  const handleRoleChange = async (teamUserId: string, newRole: 'owner' | 'admin' | 'member') => {
    const teamUserToUpdate = teamUsers.find(tu => tu.id === teamUserId);

    // Prevent self-demotion from owner if last owner
    if (teamUserToUpdate?.user_id === currentUser?.id && teamUserToUpdate?.role === 'owner' && newRole !== 'owner') {
        const owners = teamUsers.filter(tu => tu.role === 'owner');
        if (owners.length <= 1) {
            toast({ title: "Error", description: "Cannot demote the last owner. Assign another owner first.", variant: "destructive" });
            return;
        }
    }
    // Prevent changing role of an owner if not an owner yourself (or if it's yourself and you are not the last owner)
    if (teamUserToUpdate?.role === 'owner' && teamUserToUpdate?.user_id !== currentUser?.id && !isCurrentUserOwner(teamId)) {
        toast({ title: "Error", description: "Only an owner can change another owner's role.", variant: "destructive" });
        return;
    }


    const updatedUser = await updateUserRole(teamUserId, newRole);
    if (updatedUser) {
      toast({ title: "Success", description: "User role updated." });
    } else {
      toast({ title: "Error", description: "Failed to update user role.", variant: "destructive" });
    }
  };

  const displayedTeamUsers = teamUsers as DisplayTeamUser[];

  const transformedTeamMembers: TeamMember[] = displayedTeamUsers.map(member => ({
    id: member.user?.id || member.user_id, // Profile ID
    name: member.user?.email?.split('@')[0] || member.user_id, // Placeholder for name, ideally fetch full profile
    email: member.user?.email || 'N/A',
    role: member.role,
    team_user_id: member.id, // This is the team_users table PK
  }));

  // Pass action handlers to the table via meta
  // This requires modification in TeamUsersDataTable and columns.tsx
  const tableMeta = {
    handleRoleChange,
    handleRemoveUser,
    isCurrentUserOwner: (teamIdToCheck: string) => isCurrentUserOwner(teamIdToCheck), // Pass as function
    isCurrentUserAdmin: (teamIdToCheck: string) => isCurrentUserAdmin(teamIdToCheck), // Pass as function
    currentUserId: currentUser?.id,
    teamId, // current teamId
    isLoading,
  };


  return (
    <Card className="mt-6">
      <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
        <div>
            <CardTitle className="text-xl">Team Members</CardTitle>
            <CardDescription>Manage users and their roles in this team.</CardDescription>
        </div>
        {canManageUsers && (
            <Button onClick={() => setShowAddUserModal(true)} size="sm">
                <UserPlus className="mr-2 h-4 w-4" /> Add User
            </Button>
        )}
      </CardHeader>
      <CardContent className="p-6"> {/* ADDED PADDING p-6 */}
        {isLoading && transformedTeamMembers.length === 0 && <div className="p-6 text-center"><p>Loading members...</p></div>}
        {!isLoading && transformedTeamMembers.length === 0 && 
          <div className="p-6 text-center">
            <p className="text-muted-foreground">No users in this team yet. Add one to get started!</p>
          </div>
        }
        
        {transformedTeamMembers.length > 0 && (
          <TeamUsersDataTable
            columns={teamMemberColumns} // These columns need to be adapted to use meta
            data={transformedTeamMembers}
            // Pass meta to TeamUsersDataTable, which then passes it to useReactTable
            // This requires TeamUsersDataTable to accept a meta prop.
            // For now, this is a conceptual placement. The actual wiring is more complex.
            // Let's assume columns.tsx will be modified to access these via table.options.meta
            meta={tableMeta}
          />
        )}
      </CardContent>

      {/* Add User Modal remains the same */}
      {showAddUserModal && canManageUsers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Add New User to Team</h3>
            <p className="text-sm text-muted-foreground mb-2">Enter the User ID of the user to add. (For a production app, you would typically search by email).</p>
            <Input
              type="text" // Changed to text for User ID
              value={newUserEmail} // Variable name is a bit misleading now, it's User ID
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="User ID" // Changed placeholder
              className="w-full p-2 border rounded mb-4 bg-input text-foreground"
            />
            <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as 'admin' | 'member')}>
              <SelectTrigger className="w-full mb-4">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {isCurrentUserOwner(teamId) && <SelectItem value="owner">Owner (Careful!)</SelectItem>}
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddUserModal(false)}>Cancel</Button>
              <Button onClick={handleAddUser} disabled={isLoading || !newUserEmail.trim()}>
                {isLoading ? 'Adding...' : 'Add User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default TeamUsers;

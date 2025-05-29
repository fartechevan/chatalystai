import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Assuming supabase client is here
import { User } from '@supabase/supabase-js';
import { useAuth } from '@/components/auth/AuthProvider'; // Assuming AuthProvider is here

// Define types for Team and TeamUser
export interface Team {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfileData {
  id: string;
  email?: string | null; // email can be null or not always present
  name?: string | null; // Added name from profiles
}

export interface TeamUser {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  user?: UserProfileData | null; // For the joined user data
}

interface TeamContextType {
  currentTeam: Team | null;
  setCurrentTeam: (team: Team | null) => void;
  teams: Team[];
  fetchTeams: () => Promise<void>;
  createTeam: (name: string) => Promise<Team | null>;
  updateTeam: (teamId: string, name: string) => Promise<Team | null>;
  deleteTeam: (teamId: string) => Promise<boolean>;
  teamUsers: TeamUser[];
  fetchTeamUsers: (teamId: string) => Promise<void>;
  addUserToTeam: (teamId: string, identifier: string, role: 'owner' | 'admin' | 'member', teamNameForInvite?: string) => Promise<TeamUser | null | { invitationSent: boolean; message: string }>;
  removeUserFromTeam: (teamUserId: string) => Promise<boolean>;
  updateUserRole: (teamUserId: string, role: 'owner' | 'admin' | 'member') => Promise<TeamUser | null>;
  isCurrentUserOwner: (teamId?: string) => boolean;
  isCurrentUserAdmin: (teamId?: string) => boolean;
  isLoading: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const setCurrentTeam = (team: Team | null) => {
    setCurrentTeamState(team);
    if (team) {
      localStorage.setItem('currentTeamId', team.id);
      fetchTeamUsers(team.id);
    } else {
      localStorage.removeItem('currentTeamId');
      setTeamUsers([]);
    }
  };

  const fetchTeams = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch teams where the current user is a member
      const { data: teamUserData, error: teamUserError } = await supabase
        .from('team_users')
        .select('team_id')
        .eq('user_id', user.id);

      if (teamUserError) throw teamUserError;

      if (teamUserData && teamUserData.length > 0) {
        const teamIds = teamUserData.map(tu => tu.team_id);
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds)
          .order('name', { ascending: true });

        if (error) throw error;
        setTeams(data || []);

        // Restore current team from localStorage or set to first team
        const storedTeamId = localStorage.getItem('currentTeamId');
        if (storedTeamId && data?.find(t => t.id === storedTeamId)) {
            setCurrentTeam(data.find(t => t.id === storedTeamId) || null);
        } else if (data && data.length > 0 && !currentTeam) {
            setCurrentTeam(data[0]);
        }

      } else {
        setTeams([]);
        setCurrentTeam(null);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createTeam = async (name: string): Promise<Team | null> => {
    if (!user) return null;
    setIsLoading(true);
    try {
      // Call the PostgreSQL function to create the team
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_new_team', { p_name: name });

      if (rpcError) {
        console.error('Error calling create_new_team RPC:', rpcError);
        throw rpcError;
      }

      // The RPC function RETURNS SETOF public.teams, so rpcData should be an array.
      // We expect a single team row to be created and returned.
      const newTeam = rpcData && Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : null;

      if (!newTeam) {
        console.error('create_new_team RPC did not return a team object:', rpcData);
        throw new Error('Failed to create team: No team data returned from RPC.');
      }

      // Add current user as owner
      const { data: newTeamUser, error: teamUserError } = await supabase
        .from('team_users')
        .insert([{ team_id: newTeam.id, user_id: user.id, role: 'owner' }])
        .select()
        .single();
      
      if (teamUserError) {
        // If adding user as owner fails, we should ideally roll back the team creation.
        // However, the team was created in a separate transaction by the RPC call.
        // A true rollback would require a more complex transaction management or a single RPC call for both operations.
        // For now, we'll log and attempt to delete the team if owner setup fails.
        // This is a best-effort cleanup.
        console.error('Failed to add owner to new team. Attempting to delete orphaned team:', teamUserError);
        await supabase.from('teams').delete().eq('id', newTeam.id); // This delete is subject to RLS.
        // If RLS prevents this delete, the team might be orphaned.
        // A SECURITY DEFINER function for cleanup might be needed for robust rollback.
        throw teamUserError;
      }

      await fetchTeams(); // Refresh team list
      setCurrentTeam(newTeam);
      return newTeam;
    } catch (error) {
      console.error('Error creating team:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTeam = async (teamId: string, name: string): Promise<Team | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', teamId)
        .select()
        .single();
      if (error) throw error;
      await fetchTeams(); // Refresh list
      if (currentTeam?.id === teamId) {
        setCurrentTeam(data);
      }
      return data;
    } catch (error) {
      console.error('Error updating team:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTeam = async (teamId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Ensure user is owner before deleting
      if (!isCurrentUserOwner(teamId)) {
          console.error('Only team owner can delete the team.');
          return false;
      }
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
      await fetchTeams(); // Refresh list
      if (currentTeam?.id === teamId) {
        setCurrentTeam(teams.length > 0 ? teams[0] : null);
      }
      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamUsers = async (teamId: string) => {
    if (!teamId) {
      setTeamUsers([]);
      return;
    }
    setIsLoading(true);
    try {
      // Step 1: Fetch basic team_users data
      const { data: teamUsersData, error: teamUsersError } = await supabase
        .from('team_users')
        .select('*') // Fetches all columns from team_users itself
        .eq('team_id', teamId);

      if (teamUsersError) throw teamUsersError;

      if (!teamUsersData) {
        setTeamUsers([]);
        setIsLoading(false);
        return;
      }

      // Step 2: For each team user, fetch their auth.users record (id and email)
      // This relies on the RLS policy on auth.users allowing this select.
      const enrichedTeamUsers = await Promise.all(
        teamUsersData.map(async (tu) => {
          // Ensure tu has user_id and is a valid TeamUser object before fetching
          if (!tu.user_id) {
            console.warn('Team user record missing user_id:', tu);
            return { ...tu, user: null }; 
          }
          // Query public.profiles table for user details
          const { data: profileData, error: profileError } = await supabase
            .from('profiles') 
            .select('id, email, name') // Selecting id, email, and name from profiles
            .eq('id', tu.user_id) // tu.user_id from team_users is the auth.users.id, which should match profiles.id
            .single(); 

          if (profileError) {
            console.error(`Error fetching profile for user ${tu.user_id}:`, profileError.message);
            return { ...tu, user: null }; 
          }
          // Ensure the UserProfileData interface can accommodate 'name' if you want to use it.
          // For now, it expects id and email. If profileData includes name, it will be there.
          return { ...tu, user: profileData as UserProfileData | null };
        })
      );
      setTeamUsers(enrichedTeamUsers as TeamUser[]); // enrichedTeamUsers will not contain nulls based on current map logic

    } catch (error) {
      console.error('Error in fetchTeamUsers process:', error);
      setTeamUsers([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const addUserToTeam = async (
    teamId: string, 
    identifier: string, 
    role: 'owner' | 'admin' | 'member',
    teamNameForInvite?: string
  ): Promise<TeamUser | null | { invitationSent: boolean; message: string }> => {
    setIsLoading(true);
    // Basic check for email format; UUIDs are more complex
    // A more robust UUID check: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    const isEmail = identifier.includes('@') && !/^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/i.test(identifier);

    try {
      if (isEmail) {
        // Invitation flow
        const effectiveTeamName = teamNameForInvite || currentTeam?.name;
        if (!effectiveTeamName) {
          console.error('Team name is required for sending an invitation and could not be determined.');
          return { invitationSent: false, message: 'Team name is required for sending an invitation.' };
        }

        const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-team-member', {
          body: { email: identifier, team_id: teamId, team_name: effectiveTeamName },
        });

        if (inviteError) {
          console.error('Error inviting user to team via function:', inviteError);
          // Try to parse Supabase FunctionError details if possible
          let message = inviteError.message;
          if (inviteError.context && typeof inviteError.context.error === 'string') {
            message = inviteError.context.error;
          } else if (inviteError.context && inviteError.context.message) {
             message = inviteError.context.message;
          }
          return { invitationSent: false, message: `Failed to send invitation: ${message}` };
        }
        
        // The inviteData for a successful invocation might look like: { data: { message: '...', user: {...} } }
        // or just the body directly if the function returns it.
        // Let's assume success if no error.
        console.log('Invitation sent successfully via function call. Response:', inviteData);
        // Note: The user is added to team_users by a backend trigger upon signup.
        // This function call does not return a TeamUser object for an invitation.
        // Type for the data returned by the 'invite-team-member' function
        type InviteSuccessResponse = { message: string; user?: { id: string; email?: string } };
        type InviteErrorResponse = { error: string };
        type InviteResponseData = InviteSuccessResponse | InviteErrorResponse;

        let responseMessage = 'Invitation sent successfully. The user will be added to the team upon accepting the invitation and signing up.';
        
        if (inviteData?.data) {
          const responseData = inviteData.data as InviteResponseData;
          if ('message' in responseData) {
            responseMessage = responseData.message;
          } else if ('error' in responseData) {
            // This case should ideally be caught by inviteError, but good to have a fallback
            responseMessage = `Invitation failed: ${responseData.error}`;
             return { invitationSent: false, message: responseMessage };
          }
        } else if (inviteData?.error && (inviteData.error as { message?: string })?.message) {
           // This case is already handled by the inviteError check above, but as a fallback
          responseMessage = (inviteData.error as { message: string }).message;
           return { invitationSent: false, message: `Failed to send invitation: ${responseMessage}` };
        }
        // If inviteError was null but inviteData.data was also not what we expected, use default success.

        return { invitationSent: true, message: responseMessage };
      } else {
        // Direct add flow (identifier is expected to be a UUID)
        const { data: existingUser, error: existingUserError } = await supabase
          .from('team_users')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', identifier) // identifier is userId (UUID)
          .maybeSingle();

        if (existingUserError) throw existingUserError;
        if (existingUser) {
          console.warn('User already in team. Updating role instead.');
          return updateUserRole(existingUser.id, role);
        }

        const { data, error } = await supabase
          .from('team_users')
          .insert([{ team_id: teamId, user_id: identifier, role }])
          .select()
          .single();
        if (error) throw error; // This is where the original error was triggered
        if (currentTeam?.id === teamId) {
          await fetchTeamUsers(teamId); // Refresh user list for current team
        }
        return data; // Returns a TeamUser object
      }
    } catch (error: unknown) { 
      console.error('Error in addUserToTeam:', error); 
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
        errorMessage = (error as { message: string }).message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // If it's an invitation attempt that failed in a way not caught above
      if (isEmail) {
        return { invitationSent: false, message: `Failed to process invitation: ${errorMessage}` };
      }
      return null; // For direct add failures
    } finally {
      setIsLoading(false);
    }
  };

  const removeUserFromTeam = async (teamUserId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('team_users').delete().eq('id', teamUserId);
      if (error) throw error;
      if (currentTeam) {
        await fetchTeamUsers(currentTeam.id); // Refresh user list
      }
      return true;
    } catch (error) {
      console.error('Error removing user from team:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (teamUserId: string, role: 'owner' | 'admin' | 'member'): Promise<TeamUser | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_users')
        .update({ role })
        .eq('id', teamUserId)
        .select()
        .single();
      if (error) throw error;
      if (currentTeam) {
        await fetchTeamUsers(currentTeam.id); // Refresh user list
      }
      return data;
    } catch (error) {
      console.error('Error updating user role:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleInTeam = (teamIdToCheck?: string): 'owner' | 'admin' | 'member' | null => {
    if (!user) return null;
    const targetTeamId = teamIdToCheck || currentTeam?.id;
    if (!targetTeamId) return null;
    const teamUser = teamUsers.find(tu => tu.user_id === user.id && tu.team_id === targetTeamId);
    return teamUser?.role || null;
  }

  const isCurrentUserOwner = (teamIdToCheck?: string): boolean => {
    return getRoleInTeam(teamIdToCheck) === 'owner';
  };

  const isCurrentUserAdmin = (teamIdToCheck?: string): boolean => {
    const role = getRoleInTeam(teamIdToCheck);
    return role === 'owner' || role === 'admin';
  };

  useEffect(() => {
    if (user) {
      fetchTeams();
    } else {
      setTeams([]);
      setCurrentTeam(null);
      setTeamUsers([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (currentTeam) {
      fetchTeamUsers(currentTeam.id);
    } else {
      setTeamUsers([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeam?.id]);


  return (
    <TeamContext.Provider value={{ 
      currentTeam, 
      setCurrentTeam, 
      teams, 
      fetchTeams,
      createTeam,
      updateTeam,
      deleteTeam,
      teamUsers,
      fetchTeamUsers,
      addUserToTeam,
      removeUserFromTeam,
      updateUserRole,
      isCurrentUserOwner,
      isCurrentUserAdmin,
      isLoading
    }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeams = (): TeamContextType => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeams must be used within a TeamProvider');
  }
  return context;
};

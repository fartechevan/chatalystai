
import React, { useState, useCallback } from 'react'; // Added useState, useCallback
import { DataTable } from "./DataTable";
import { columns } from "./columns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMediaQuery } from "@/hooks/use-media-query"; // Import useMediaQuery
import { Button } from "@/components/ui/button"; // Added Button
import { Loader2, DatabaseZap } from 'lucide-react'; // Added Loader2, DatabaseZap
import { toast } from '@/hooks/use-toast'; // Added toast
import { BillingStats } from "./BillingStats";
import { IntegrationsView } from "./IntegrationsView";
import { ProfileAccessManagement } from "./integration-access/ProfileAccessManagement";
import { UserCardList } from "./UserCardList"; // Import the new card list component
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading state
import { UserPlus } from 'lucide-react'; // Icon for inviting users - ADDED
import type { PageHeaderContextType, IntegrationsTabValue } from "@/components/dashboard/DashboardLayout"; // MODIFIED for PageHeaderContextType

interface SettingsContentProps {
  section: string;
  integrationsTab?: IntegrationsTabValue; 
  setIntegrationsTab?: React.Dispatch<React.SetStateAction<IntegrationsTabValue>>;
  setHeaderActions?: PageHeaderContextType['setHeaderActions']; // ADDED prop
}

export function SettingsContent({ section, integrationsTab, setIntegrationsTab, setHeaderActions }: SettingsContentProps) {
  const isMobile = useMediaQuery("(max-width: 768px)"); 
  const [isVectorizing, setIsVectorizing] = useState(false); 
  const [vectorizeStatus, setVectorizeStatus] = useState<string | null>(null); 

  // State for Invite User Modal (moved from UsersPage.tsx)
  const [showInviteMemberModal, setShowInviteMemberModal] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('member'); // Default role
  const [isInvitingUser, setIsInvitingUser] = React.useState(false); // Loading state for invite

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({ // Removed problematic comment
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          name,
          created_at,
          role
        `);
      
      if (error) throw error;
      return data;
    },
  });

  // useEffect for setting header action when section is 'users'
  React.useEffect(() => {
    if (section === 'users' && setHeaderActions) {
      const inviteButton = (
        <Button onClick={() => setShowInviteMemberModal(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      );
      setHeaderActions(inviteButton);
      return () => {
        setHeaderActions(null);
      };
    } else if (setHeaderActions && section !== 'users') { // Clear if not users section
        setHeaderActions(null);
    }
    // If setHeaderActions is undefined, or section is not 'users',
    // ensure we don't leave a stale action from a previous render of a different section
    // This else if handles the case where the section changes away from 'users'.
    // The initial state of headerActions in DashboardLayout is null, so this is mainly for cleanup.
  }, [section, setHeaderActions, setShowInviteMemberModal]); // Added setShowInviteMemberModal

  // handleInviteMember function (moved from UsersPage.tsx)
  const handleInviteMember = async () => {
    if (inviteEmail.trim()) {
      setIsInvitingUser(true);
      try {
        const { data, error } = await supabase.functions.invoke('invite-user', {
          body: { email: inviteEmail, role: inviteRole },
        });

        if (error) {
          console.error('Error inviting user:', error);
          let specificErrorMessage = 'An unexpected error occurred.';
          // Attempt to get a more specific error message from the function's response
          if (error.context && typeof error.context.json === 'object' && error.context.json !== null && 'error' in error.context.json && typeof error.context.json.error === 'string') {
            specificErrorMessage = error.context.json.error;
          } else if (error.message) {
            specificErrorMessage = error.message; // Fallback to the generic FunctionsHttpError message
          }
          toast({
            title: 'Invitation Failed',
            description: specificErrorMessage,
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
        }
      } catch (error: unknown) {
        console.error('Failed to invoke invite-user function:', error);
        let errorMessage = 'An unexpected error occurred while sending the invitation.';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
          const errObj = error as { message: string };
          errorMessage = errObj.message;
        }
        toast({
          title: 'Invitation Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsInvitingUser(false);
      }
    }
  };

  // Function to trigger schema vectorization - Moved from ConversationStatsView
  const handleVectorizeSchema = useCallback(async () => {
    setIsVectorizing(true);
    setVectorizeStatus("Vectorizing schema...");
    try {
      const { data, error } = await supabase.functions.invoke('vectorize-schema');

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setVectorizeStatus(data?.message || "Schema vectorization completed successfully.");
       toast({ title: "Schema Vectorization Success", description: data?.message });

    } catch (error) { // Explicitly type error as unknown or Error
      console.error("Error vectorizing schema:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setVectorizeStatus(`Error: ${errorMessage}`);
      toast({ title: "Schema Vectorization Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsVectorizing(false);
      // Optionally clear status message after a delay
      setTimeout(() => setVectorizeStatus(null), 5000);
    }
  }, []);


  if (section === 'billing') {
    return (
      <div className="p-6"> {/* Removed max-w-5xl mx-auto */}
        <BillingStats />
      </div>
    );
  }

  if (section === 'users') {
    return (
      <div className="p-4 md:p-6"> {/* Removed max-w-5xl mx-auto */}
        {isLoadingUsers ? ( // MODIFIED to use isLoadingUsers
          // Loading state for both mobile and desktop
          isMobile ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-md" />
              ))}
            </div>
          ) : (
             <div className="rounded-md border p-4">
               <Skeleton className="h-8 w-1/4 mb-4" /> {/* Placeholder for potential search/add */}
               <Skeleton className="h-96 w-full" /> {/* Placeholder for table */}
             </div>
          )
        ) : (
          // Data state
          isMobile ? (
            <UserCardList users={users} />
          ) : (
            <DataTable columns={columns} data={users} />
          )
        )}

        {/* Invite Member Modal - moved from UsersPage.tsx */}
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
              </select>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowInviteMemberModal(false)}>Cancel</Button>
                <Button onClick={handleInviteMember} disabled={isInvitingUser || !inviteEmail.trim()}>
                  {isInvitingUser ? 'Sending Invite...' : 'Send Invite'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (section === 'integrations') {
    // Use responsive padding for the wrapper
    // Ensure integrationsTab and setIntegrationsTab are passed if they exist
    if (integrationsTab === undefined || setIntegrationsTab === undefined) {
      // Fallback or error handling if props are not passed, though they should be
      // This might indicate an issue with how props are threaded through
      console.error("Integrations tab state not provided to SettingsContent");
      return (
        <div className="p-4 md:p-6">
          Error: Integrations tab state missing.
        </div>
      );
    }
    return (
      <div className="p-4 md:p-6"> 
        <IntegrationsView 
          isActive={section === 'integrations'} 
          activeTab={integrationsTab} 
          setActiveTab={setIntegrationsTab} 
        />
      </div>
    );
  }

  if (section === 'access') {
    return (
      <div className="p-6"> {/* Removed max-w-5xl mx-auto */}
        <ProfileAccessManagement />
      </div>
    );
  }

  if (section === 'database') {
    return (
      <div className="p-6 space-y-4">
        {/* Title and subtitle removed */}

        {/* Vectorize Schema Button and Status */}
        <div className="pt-4 border-t">
          <h3 className="text-md font-medium mb-2">Schema Vectorization</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Update the vector embeddings for your database schema. This is used by AI features to understand your data structure.
          </p>
          <Button onClick={handleVectorizeSchema} disabled={isVectorizing} variant="outline" size="sm">
            {isVectorizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
            Vectorize Schema
          </Button>
          {/* Display vectorize status */}
          {vectorizeStatus && <p className={`text-sm ${vectorizeStatus.startsWith('Error') ? 'text-red-500' : 'text-green-600'} mt-2`}>{vectorizeStatus}</p>}
        </div>
      </div>
    );
  }

  // Default fallback for any other section
  return (
    <div className="p-6"> {/* Removed max-w-5xl mx-auto */}
      <h2 className="text-lg font-semibold">{section.charAt(0).toUpperCase() + section.slice(1)}</h2>
      <p className="text-muted-foreground">This section is under development.</p>
    </div>
  );
}

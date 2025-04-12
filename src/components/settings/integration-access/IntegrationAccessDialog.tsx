
import { useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, X, ShieldAlert } from "lucide-react"; // Added ShieldAlert
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react"; // Added useEffect
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Added useMutation, useQueryClient
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Database, Tables } from "@/integrations/supabase/types"; // Import Database and Tables types

// Define Profile type based on Supabase schema
type Profile = Tables<'profiles'>;

// Define types for the access record, explicitly including the Profile type
interface AccessRecord {
  id: string;
  profile_id: string;
  profiles: Profile; 
}


export function IntegrationAccessDialog({
  open,
  setOpen,
  integrationId, // Renamed prop
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  integrationId: string; // Renamed prop type
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient(); // For invalidating queries after mutation
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  // Fetch current user's role
  useEffect(() => {
    const fetchUserRole = async () => {
      setIsCheckingRole(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Error fetching user role:", error);
          toast({ variant: "destructive", title: "Error fetching user role" });
          setCurrentUserRole(null);
        } else {
          setCurrentUserRole(profile?.role || null);
        }
      } else {
        setCurrentUserRole(null);
      }
      setIsCheckingRole(false);
    };

    if (open) {
      fetchUserRole();
    }
  }, [open, toast]);

  const isAdmin = currentUserRole === 'admin';

  // Fetch existing access records for this integration
  const { data: existingAccess, isLoading, refetch } = useQuery<AccessRecord[], Error>({
    queryKey: ['integration-access', integrationId],
    queryFn: async (): Promise<AccessRecord[]> => {
      // 1. Fetch access records directly for the specific integration_id
      const { data: accessData, error: accessError } = await supabase
        .from('profile_integration_access')
        .select('id, profile_id, integration_id') // Select relevant columns
        .eq('integration_id', integrationId); // Filter directly by integration_id

      if (accessError) throw new Error(`Error fetching access records: ${accessError.message}`);
      if (!accessData || accessData.length === 0) return [];

      // 2. Fetch profile details for these access records
      const profileIds = [...new Set(accessData.map(a => a.profile_id).filter(Boolean))];
      let profilesMap = new Map<string, Profile>();
      if (profileIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*') // Select all profile fields to match the Profile type
          .in('id', profileIds);
        if (profilesError) throw new Error(`Error fetching profiles: ${profilesError.message}`);
        if (profilesData) {
          profilesMap = new Map(profilesData.map(p => [p.id, p]));
        }
      }

      // 3. Combine access records with profile details
      const combinedData = accessData
        .map(record => {
          // Ensure record.profile_id is not null before proceeding
          if (!record.profile_id) return null; 
          const profile = profilesMap.get(record.profile_id);
          if (!profile) return null; // Skip if profile not found
          return {
            id: record.id,
            profile_id: record.profile_id,
            profiles: profile, // Assign the full profile object
          };
        })
        .filter((record): record is AccessRecord => record !== null); // Type guard to filter out nulls

      return combinedData;
    },
    enabled: open && !!integrationId, // Enable based on integrationId
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch available profiles that could be granted access
  const { data: availableProfiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ['all-profiles-for-access'], // More specific key
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role');

      if (error) throw error;
      return data;
    },
    enabled: open && isAdmin // Only fetch if dialog is open and user is admin
  });

  // Filter profiles that don't already have access
  const filteredProfiles = availableProfiles?.filter(profile => {
    // Only show profiles that don't already have access
    const hasAccess = existingAccess?.some(access => access.profile_id === profile.id);
    // And match the search query (if any)
    const matchesSearch = !searchQuery || 
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      profile.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return !hasAccess && matchesSearch;
  });

  // --- Mutation for Granting Access (Direct DB Insert) ---
  const grantAccessMutation = useMutation({
    mutationFn: async (profileId: string) => {
      // Direct insert into the join table
      const { data, error } = await supabase
        .from('profile_integration_access')
        .insert([
          { 
            profile_id: profileId, 
            integration_id: integrationId 
            // Assuming created_by is handled by DB trigger or default
          }
        ])
        .select(); // Select to confirm insertion and potentially get the new record ID if needed

      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error(`Failed to grant access: ${error.message}`);
      }
      return data; // Return the result of the insert operation
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-access', integrationId] }); // Use integrationId
      queryClient.invalidateQueries({ queryKey: ['integrations-with-access'] }); // Use updated list view key
    },
    onError: (error) => {
      console.error('Failed to grant access:', error);
      toast({
        variant: "destructive",
        title: "Failed to grant access",
        description: error.message,
      });
    },
  });

  // Handle granting access to selected profiles
  const handleGrantAccess = async () => {
    if (selectedProfiles.length === 0 || !isAdmin) return;

    let successCount = 0;
    for (const profileId of selectedProfiles) {
      try {
        await grantAccessMutation.mutateAsync(profileId);
        successCount++;
      } catch (e) {
        // Error is handled by the mutation's onError
        break; // Stop granting if one fails
      }
    }

    if (successCount > 0) {
      toast({
        title: "Access granted",
        description: `Added ${successCount} users to this integration.`
      });
      setSelectedProfiles([]); // Clear selection on success
      // Refetch is handled by query invalidation
    }
  };

  // --- Mutation for Revoking Access (Direct DB Delete) ---
  const revokeAccessMutation = useMutation({
    mutationFn: async (accessId: string) => {
      // Direct delete from the join table using the access record ID
      const { error } = await supabase
        .from('profile_integration_access')
        .delete()
        .eq('id', accessId);

      if (error) {
        console.error("Supabase delete error:", error);
        throw new Error(`Failed to revoke access: ${error.message}`);
      }
      // No specific data to return on successful delete usually
      return { success: true }; 
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-access', integrationId] }); // Use integrationId
      queryClient.invalidateQueries({ queryKey: ['integrations-with-access'] }); // Use updated list view key
    },
    onError: (error) => {
      console.error('Failed to revoke access:', error);
      toast({
        variant: "destructive",
        title: "Failed to revoke access",
        description: error.message,
      });
    },
  });

  // Handle revoking access for a profile
  const handleRevokeAccess = async (accessId: string, profileName: string) => {
    if (!isAdmin) return;
    try {
      await revokeAccessMutation.mutateAsync(accessId);
      toast({
        title: "Access revoked",
        description: `Removed ${profileName} from this integration.`
      });
      // Refetch is handled by query invalidation
    } catch (e) {
       // Error handled by mutation's onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage Access</DialogTitle>
          <DialogDescription>
            Control who has access to this integration.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-6">
          {/* Current Access List */}
          <div>
            <h3 className="text-sm font-medium mb-2">Current Access</h3>
            <div className="border rounded-md">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : existingAccess && existingAccess.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  <div className="p-4 space-y-2">
                    {existingAccess.map((access) => (
                      <div 
                        key={access.id}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{access.profiles?.name?.substring(0, 2) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{access.profiles?.name || 'Unknown User'}</span>
                            <span className="text-xs text-muted-foreground">
                              {access.profiles?.email || 'No email'} 
                              {access.profiles?.role && ` (${access.profiles.role})`} {/* Display role */}
                            </span>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRevokeAccess(access.id, access.profiles?.name || 'User')}
                            disabled={revokeAccessMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No users have access to this integration yet.
                </div>
              )}
            </div>
          </div>
          {/* Removed extra closing div here */}

          {/* Grant Access Section - Only show if admin */}
          {isAdmin && (
            <div>
              <h3 className="text-sm font-medium mb-2">Grant Access</h3>
              <div className="border rounded-md">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search for users..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 shadow-none focus-visible:ring-0 h-8"
                  />
                </div>
              </div>
              
              <ScrollArea className="h-[200px]">
                <div className="p-4 space-y-2">
                  {loadingProfiles ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : filteredProfiles && filteredProfiles.length > 0 ? (
                    filteredProfiles.map((profile) => (
                      <div 
                        key={profile.id}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id={`profile-${profile.id}`}
                            checked={selectedProfiles.includes(profile.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProfiles([...selectedProfiles, profile.id]);
                              } else {
                                setSelectedProfiles(selectedProfiles.filter(id => id !== profile.id));
                              }
                            }}
                          />
                          <Avatar className="h-8 w-8">
                            {/* Safely handle potentially null profile name */}
                            <AvatarFallback>{profile.name ? profile.name.substring(0, 2) : 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{profile.name || 'Unnamed User'}</span> {/* Also provide fallback here */}
                            <span className="text-xs text-muted-foreground">
                              {profile.email} 
                              {profile.role && ` (${profile.role})`} {/* Display role */}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">
                      No available users found.
                    </div>
                  )}
                </div>
              </ScrollArea>
              </div>
            </div>
          )}
          {/* Show message if not admin */}
          {!isCheckingRole && !isAdmin && (
             <div className="p-4 border rounded-md bg-muted/50 text-muted-foreground text-sm flex items-center gap-2">
               <ShieldAlert className="h-4 w-4" />
               Only administrators can manage integration access.
             </div>
          )}
          {isCheckingRole && (
             <Skeleton className="h-10 w-full" /> // Placeholder while checking role
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          {isAdmin && ( // Only show Grant button if admin
            <Button
              onClick={handleGrantAccess}
              disabled={selectedProfiles.length === 0 || grantAccessMutation.isPending || revokeAccessMutation.isPending}
            >
              {grantAccessMutation.isPending ? 'Granting...' : <><Plus className="h-4 w-4 mr-2" /> Grant Access</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

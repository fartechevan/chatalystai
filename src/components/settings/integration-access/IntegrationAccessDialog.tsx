
import { useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Define types for the access record and profile
interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AccessRecord {
  id: string;
  profile_id: string;
  profiles: Profile; // This should match the structure we'll get from our modified query
}

export function IntegrationAccessDialog({
  open,
  setOpen,
  integrationConfigId,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  integrationConfigId: string;
}) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);

  // Fetch existing access records for this integration config
  const { data: existingAccess, isLoading, refetch } = useQuery({
    queryKey: ['integration-access', integrationConfigId],
    queryFn: async () => {
      // First fetch access records
      const { data: accessData, error: accessError } = await supabase
        .from('profile_integration_access')
        .select('id, profile_id')
        .eq('integration_config_id', integrationConfigId);

      if (accessError) throw new Error(accessError.message);

      // Then fetch profile details for each access record
      const profileData: AccessRecord[] = [];
      
      if (accessData && accessData.length > 0) {
        for (const record of accessData) {
          const { data: profileInfo, error: profileError } = await supabase
            .from('profiles')
            .select('id, name, email, role')
            .eq('id', record.profile_id)
            .single();
          
          if (!profileError && profileInfo) {
            profileData.push({
              id: record.id,
              profile_id: record.profile_id,
              profiles: profileInfo
            });
          }
        }
      }
      
      return profileData;
    },
    enabled: open && !!integrationConfigId
  });

  // Fetch available profiles that could be granted access
  const { data: availableProfiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role');

      if (error) throw error;
      return data;
    },
    enabled: open
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

  // Handle granting access to selected profiles
  const handleGrantAccess = async () => {
    if (selectedProfiles.length === 0) return;
    
    try {
      const newAccessRecords = selectedProfiles.map(profileId => ({
        profile_id: profileId,
        integration_config_id: integrationConfigId
      }));
      
      const { error } = await supabase
        .from('profile_integration_access')
        .insert(newAccessRecords);
        
      if (error) throw error;
      
      toast({
        title: "Access granted",
        description: `Added ${selectedProfiles.length} users to this integration.`
      });
      
      setSelectedProfiles([]);
      refetch();
    } catch (error) {
      console.error('Failed to grant access:', error);
      toast({
        variant: "destructive",
        title: "Failed to grant access",
        description: (error as Error).message,
      });
    }
  };

  // Handle revoking access for a profile
  const handleRevokeAccess = async (accessId: string, profileName: string) => {
    try {
      const { error } = await supabase
        .from('profile_integration_access')
        .delete()
        .eq('id', accessId);
        
      if (error) throw error;
      
      toast({
        title: "Access revoked",
        description: `Removed ${profileName} from this integration.`
      });
      
      refetch();
    } catch (error) {
      console.error('Failed to revoke access:', error);
      toast({
        variant: "destructive",
        title: "Failed to revoke access",
        description: (error as Error).message,
      });
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
                            <span className="text-xs text-muted-foreground">{access.profiles?.email || 'No email'}</span>
                          </div>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleRevokeAccess(access.id, access.profiles?.name || 'User')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
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
          
          {/* Grant Access Section */}
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
                            <AvatarFallback>{profile.name.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{profile.name}</span>
                            <span className="text-xs text-muted-foreground">{profile.email}</span>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleGrantAccess} 
            disabled={selectedProfiles.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Grant Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

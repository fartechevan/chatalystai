import { Button } from "@/components/ui/button";
import { Plus, Users, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMediaQuery } from "@/hooks/use-media-query"; // Import useMediaQuery
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Import Card components
import { IntegrationAccessDialog } from "./IntegrationAccessDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tables } from "@/integrations/supabase/types";

// Define Profile type based on Supabase schema
type Profile = Tables<'profiles'>;

// Define interface for the integration with access details, ensuring profiles matches the Profile type
interface IntegrationWithAccess {
  id: string; // Integration ID
  name: string;
  description?: string | null;
  access: {
    id: string; // profile_integration_access ID
    profile_id: string;
    profiles: Profile; // Use the defined Profile type
  }[];
}

// Define type for the data structure returned by the query function
type QueryFnData = IntegrationWithAccess[];

// Define a more accurate type for the access record based on user confirmation
interface ProfileIntegrationAccessRecord {
  id: string;
  profile_id: string;
  integration_id: string; 
  created_at: string;
  created_by: string | null;
}


export function ProfileAccessManagement() {
  const isMobile = useMediaQuery("(max-width: 768px)"); // Check for mobile screen size
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  // Fetch current user's role and ID
  useEffect(() => {
    const fetchUser = async () => {
      setIsCheckingRole(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Error fetching user role:", error);
          setCurrentUserRole(null);
        } else {
          setCurrentUserRole(profile?.role as string || null); 
        }
      } else {
        setCurrentUserId(null);
        setCurrentUserRole(null);
      }
      setIsCheckingRole(false);
    };
    fetchUser();
  }, []);

  const isAdmin = currentUserRole === 'admin';

  // Fetch integrations with their access records based on user role
  const { data: integrationsWithAccess, isLoading, error: queryError } = useQuery<QueryFnData, Error>({
    queryKey: ['integrations-with-access', isAdmin, currentUserId],
    queryFn: async (): Promise<QueryFnData> => {
      
      let integrationsToFetchIds: string[] | null = null;

      // Non-admin: Determine which integrations they have access to
      if (!isAdmin && currentUserId) {
        // Select integration_id directly, casting result to bypass incorrect types
        const { data: userAccessData, error: userAccessError } = await supabase
          .from('profile_integration_access')
          .select('integration_id') 
          .eq('profile_id', currentUserId);
        
        if (userAccessError) throw userAccessError;
        if (!userAccessData || userAccessData.length === 0) return []; 

        // Cast to expected structure
        const accessRecords = userAccessData as { integration_id: string }[];
        integrationsToFetchIds = [...new Set(accessRecords.map(a => a.integration_id).filter(Boolean))];
        if (integrationsToFetchIds.length === 0) return [];
      }

      // 1. Fetch integrations (all for admin, filtered for non-admin)
      let integrationsData: Tables<'integrations'>[] | null = null;
      try {
        let query = supabase.from('integrations').select('*'); 
        if (integrationsToFetchIds) {
          query = query.in('id', integrationsToFetchIds);
        }
        const { data, error } = await query;
        if (error) throw error;
        integrationsData = data;
        if (!integrationsData || integrationsData.length === 0) return []; 
      } catch (error) {
        console.error("Error fetching integrations:", error);
        throw new Error(`Failed to fetch integrations: ${(error as Error).message}`);
      }

      // 2. Fetch all relevant access records directly linked to the fetched integrations
      const integrationIds = integrationsData.map(i => i.id);
      let allAccessData: ProfileIntegrationAccessRecord[] | null = []; 
      if (integrationIds.length > 0) {
        try {
          const { data, error } = await supabase
            .from('profile_integration_access')
            .select('*') // Select all columns, assuming integration_id is present
            .in('integration_id', integrationIds); // Filter by integration_id
          if (error) throw error;
          // Cast to our defined type that includes integration_id
          allAccessData = data as ProfileIntegrationAccessRecord[]; 
        } catch (error) {
          console.error("Error fetching access records:", error);
          console.warn("Proceeding without access records due to fetch error.");
        }
      }
      allAccessData = allAccessData || [];

      // 3. Fetch necessary profile details
      const uniqueProfileIds = [...new Set(allAccessData.map(a => a.profile_id).filter(Boolean))];
      let profilesMap = new Map<string, Profile>(); 
      if (uniqueProfileIds.length > 0) {
         try {
           const { data: profilesData, error: profilesError } = await supabase
             .from('profiles')
             .select('*') // Select all fields to match Profile type
             .in('id', uniqueProfileIds);
           if (profilesError) throw profilesError;
           if (profilesData) {
             profilesMap = new Map(profilesData.map(p => [p.id, p]));
           }
         } catch (error) {
           console.error("Error fetching profiles:", error);
           console.warn("Proceeding without profile details due to fetch error.");
         }
      }

      // 4. Combine the data
      const processedData: QueryFnData = integrationsData.map(integration => {
        const integrationAccessRecords = allAccessData.filter(
          access => access.integration_id === integration.id && access.profile_id 
        );

        const processedAccess = integrationAccessRecords
          .map(access => {
            const profile = profilesMap.get(access.profile_id!);
            const fallbackProfile: Profile = { 
              id: access.profile_id!, 
              email: 'No email', 
              name: 'Unknown User', 
              created_at: new Date().toISOString(), 
              role: 'user' 
            };
            const profileDetails = profile || fallbackProfile; 
            return {
              id: access.id, 
              profile_id: access.profile_id!,
              profiles: profileDetails, 
            };
          });

        const uniqueAccess = Array.from(new Map(processedAccess.map(item => [item.profile_id, item])).values());

        return {
          id: integration.id,
          name: integration.name,
          description: integration.description,
          access: uniqueAccess,
        };
      });
      
      return processedData;
    },
    enabled: !isCheckingRole
  });

  const handleOpenDialog = (integrationId: string) => { 
    setSelectedIntegrationId(integrationId); 
    setDialogOpen(true);
  };

  return (
    <div className="p-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Integration Access</h2>
          <p className="text-muted-foreground">Manage who can access which integrations</p>
        </div>
      </div>

      {/* Loading State */}
      {(isLoading || isCheckingRole) && (
        isMobile ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-9 w-full mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]"><Skeleton className="h-5 w-24" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                  <TableHead className="text-right w-[150px]"><Skeleton className="h-5 w-20" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      )}

      {/* Error State */}
      {queryError && !isLoading && !isCheckingRole && (
        <div className="text-center py-8 text-destructive flex flex-col items-center gap-2 border rounded-md">
          <ShieldAlert className="h-6 w-6" />
          <span>Error loading integrations: {queryError.message}</span>
        </div>
      )}

      {/* Data State */}
      {!isLoading && !isCheckingRole && !queryError && (
        integrationsWithAccess && integrationsWithAccess.length > 0 ? (
          isMobile ? (
            // Mobile Card View
            <div className="space-y-4">
              {integrationsWithAccess.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <CardTitle>{integration.name}</CardTitle>
                    {integration.description && (
                      <CardDescription>{integration.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <h4 className="text-sm font-medium mb-2">Users with Access:</h4>
                    {integration.access?.length > 0 ? (
                      <div className="space-y-2">
                        {integration.access.map((access) => (
                          <div key={access.id} className="text-sm flex items-center">
                            <Users className="h-3 w-3 mr-1.5 text-muted-foreground flex-shrink-0" />
                            <div>
                              <span className="font-medium">{access.profiles.name}</span>
                              <span className="text-xs text-muted-foreground ml-1">({access.profiles.email})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No users have access yet.
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => handleOpenDialog(integration.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Manage Access
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop Table View
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Integration</TableHead>
                    <TableHead>Users with Access</TableHead>
                    <TableHead className="text-right w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrationsWithAccess.map((integration) => (
                    <TableRow key={integration.id}>
                      <TableCell>
                        <div className="font-medium">{integration.name}</div>
                        {integration.description && (
                          <div className="text-xs text-muted-foreground">{integration.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {integration.access?.length > 0 ? (
                          <div className="flex flex-col space-y-1">
                            {integration.access.map((access) => (
                              <div key={access.id} className="text-sm flex items-center">
                                <Users className="h-3 w-3 mr-1.5 text-muted-foreground flex-shrink-0" />
                                <div>
                                  <span className="font-medium">{access.profiles.name}</span>
                                  <span className="text-xs text-muted-foreground ml-1">({access.profiles.email})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No users have access yet.
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(integration.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Manage Access
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          // No Data State
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            No integrations found or accessible.
          </div>
        )
      )}

      {/* Dialog remains the same */}
      {selectedIntegrationId && (
        <IntegrationAccessDialog
          open={dialogOpen} 
          setOpen={setDialogOpen} 
          integrationId={selectedIntegrationId}
        />
      )}
    </div>
  );
}

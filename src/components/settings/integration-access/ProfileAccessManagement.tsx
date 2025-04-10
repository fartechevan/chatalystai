
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IntegrationAccessDialog } from "./IntegrationAccessDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define interface for the integration config with access details
interface IntegrationConfig {
  id: string;
  integrations: {
    id: string;
    name: string;
  };
  access: {
    id: string;
    profile_id: string;
    profiles: {
      name: string;
      email: string;
    };
  }[];
}

export function ProfileAccessManagement() {
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch integration configs with their access records
  const { data: integrationConfigs, isLoading } = useQuery({
    queryKey: ['integration-configs-with-access'],
    queryFn: async () => {
      // First fetch all integration configs
      const { data: configData, error: configError } = await supabase
        .from('integrations_config')
        .select('id, integration_id');
      
      if (configError) throw configError;
      
      // For each config, fetch the integration details and access records
      const processedData: IntegrationConfig[] = [];
      
      if (configData && configData.length > 0) {
        for (const config of configData) {
          // Get integration details
          const { data: integrationData, error: integrationError } = await supabase
            .from('integrations')
            .select('id, name')
            .eq('id', config.integration_id)
            .single();
          
          if (integrationError) continue;
          
          // Get access records for this config
          const { data: accessData, error: accessError } = await supabase
            .from('profile_integration_access')
            .select('id, profile_id')
            .eq('integration_config_id', config.id);
          
          if (accessError) continue;
          
          // For each access record, fetch the profile details
          const processedAccess = [];
          
          for (const access of accessData || []) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('id', access.profile_id)
              .single();
            
            if (!profileError && profileData) {
              processedAccess.push({
                id: access.id,
                profile_id: access.profile_id,
                profiles: profileData
              });
            }
          }
          
          // Add to the processed data
          processedData.push({
            id: config.id,
            integrations: integrationData,
            access: processedAccess
          });
        }
      }
      
      return processedData;
    }
  });

  const handleOpenDialog = (configId: string) => {
    setSelectedConfigId(configId);
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : integrationConfigs && integrationConfigs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrationConfigs.map((config) => (
            <Card key={config.id} className="overflow-hidden h-[220px]">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-md">{config.integrations.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[120px]">
                  <div className="p-4">
                    {config.access?.length > 0 ? (
                      <div className="space-y-2">
                        {config.access.map((access) => (
                          <div key={access.id} className="text-sm flex items-center">
                            <Users className="h-3 w-3 mr-2 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{access.profiles.name}</span>
                              <span className="text-xs text-muted-foreground ml-1">({access.profiles.email})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-2">
                        No users have access yet.
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleOpenDialog(config.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Manage Access
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No integration configurations found.
        </div>
      )}

      {selectedConfigId && (
        <IntegrationAccessDialog 
          open={dialogOpen} 
          setOpen={setDialogOpen} 
          integrationConfigId={selectedConfigId} 
        />
      )}
    </div>
  );
}

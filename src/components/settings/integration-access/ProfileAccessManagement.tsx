import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IntegrationAccessDialog } from "./IntegrationAccessDialog";

interface IntegrationConfig {
  id: string;
  integrations: {
    id: string;
    name: string;
  } | null;
  access: Array<{
    id: string;
    profile_id: string;
    profiles: {
      name: string | null;
      email: string | null;
    } | null;
  }> | null;
}

export function ProfileAccessManagement() {
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [selectedIntegrationName, setSelectedIntegrationName] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all integrations with their configs
  const { data: integrationConfigs = [], isLoading } = useQuery<IntegrationConfig[]>({
    queryKey: ["integration-configs-with-access"],
    queryFn: async () => {
      // Using direct query instead of RPC
      const { data, error } = await supabase
        .from("integrations_config")
        .select(`
          id,
          integrations:integration_id (id, name),
          access:profile_integration_access (
            id,
            profile_id,
            profiles:profile_id (name, email)
          )
        `);

      if (error) throw error;
      return data || [];
    },
  });

  const openAccessDialog = (configId: string, name: string) => {
    setSelectedConfigId(configId);
    setSelectedIntegrationName(name);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Integration Access Management</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Integration</TableHead>
                  <TableHead>Users with Access</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrationConfigs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No integrations configured
                    </TableCell>
                  </TableRow>
                ) : (
                  integrationConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        {config.integrations?.name || "Unknown Integration"}
                      </TableCell>
                      <TableCell>
                        {config.access?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {config.access.slice(0, 3).map((access) => (
                              <div key={access.id} className="bg-muted text-xs px-2 py-1 rounded">
                                {access.profiles?.name || access.profiles?.email || "Unknown user"}
                              </div>
                            ))}
                            {config.access.length > 3 && (
                              <div className="bg-muted text-xs px-2 py-1 rounded">
                                +{config.access.length - 3} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No users</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => 
                            openAccessDialog(
                              config.id, 
                              config.integrations?.name || "Unknown Integration"
                            )
                          }
                        >
                          Manage Access
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <IntegrationAccessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        integrationConfigId={selectedConfigId}
        integrationName={selectedIntegrationName}
      />
    </>
  );
}

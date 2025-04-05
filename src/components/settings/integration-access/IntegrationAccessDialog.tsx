
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IntegrationAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationConfigId: string | null;
  integrationName: string;
}

export function IntegrationAccessDialog({
  open,
  onOpenChange,
  integrationConfigId,
  integrationName,
}: IntegrationAccessDialogProps) {
  const { toast } = useToast();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all user profiles (admin only)
  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch profiles that already have access to this integration
  const { data: accessList = [], isLoading: isLoadingAccess, refetch: refetchAccess } = useQuery({
    queryKey: ["integration-access", integrationConfigId],
    queryFn: async () => {
      if (!integrationConfigId) return [];

      const { data, error } = await supabase
        .from("profile_integration_access")
        .select(`
          id,
          profile_id,
          profiles:profile_id (id, name, email, role)
        `)
        .eq("integration_config_id", integrationConfigId);

      if (error) throw error;
      return data;
    },
    enabled: !!integrationConfigId && open,
  });

  // Function to grant access to a profile
  const grantAccess = async () => {
    if (!selectedProfileId || !integrationConfigId) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("profile_integration_access")
        .insert({
          profile_id: selectedProfileId,
          integration_config_id: integrationConfigId,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Access already granted",
            description: "This user already has access to this integration.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Access granted",
          description: "The selected user now has access to this integration.",
        });
        refetchAccess();
      }
    } catch (error) {
      console.error("Error granting access:", error);
      toast({
        title: "Error",
        description: `Failed to grant access: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setSelectedProfileId(null);
    }
  };

  // Function to revoke access from a profile
  const revokeAccess = async (accessId: string) => {
    if (!accessId) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("profile_integration_access")
        .delete()
        .eq("id", accessId);

      if (error) throw error;

      toast({
        title: "Access revoked",
        description: "The user no longer has access to this integration.",
      });
      refetchAccess();
    } catch (error) {
      console.error("Error revoking access:", error);
      toast({
        title: "Error",
        description: `Failed to revoke access: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out profiles that already have access
  const availableProfiles = profiles.filter(
    profile => !accessList.some(access => access.profile_id === profile.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Integration Access</DialogTitle>
          <DialogDescription>
            Manage who can access the {integrationName} integration.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">Add Access</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={selectedProfileId || ""}
                  onValueChange={setSelectedProfileId}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProfiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name || profile.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                size="sm"
                onClick={grantAccess}
                disabled={!selectedProfileId || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">Current Access</h4>
            {isLoadingAccess ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : accessList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No users have been granted access yet.</p>
            ) : (
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-2">
                  {accessList.map(access => (
                    <div
                      key={access.id}
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <div className="truncate">
                        <p className="text-sm font-medium">
                          {access.profiles?.name || access.profiles?.email || "Unknown user"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {access.profiles?.role || "user"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => revokeAccess(access.id)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

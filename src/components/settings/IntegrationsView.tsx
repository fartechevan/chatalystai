
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Integration = {
  id: string;
  name: string;
  description: string | null;
  icon_url: string;
  status: 'available' | 'coming_soon';
  is_connected: boolean;
}

const tabs = ["All", "Inbox", "Automations", "Lead sources", "Connected"];

export function IntegrationsView() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [instancesData, setInstancesData] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Integration[];
    },
  });

  const fetchEvolutionInstances = async () => {
    const { data, error } = await supabase.functions.invoke('fetch-evolution-instances');
    if (error) throw error;
    console.log('Evolution API response:', data);
    setInstancesData(data);
    setDialogOpen(true);
    return data;
  };

  const toggleConnectionMutation = useMutation({
    mutationFn: async ({ id, isConnected, name }: { id: string; isConnected: boolean; name: string }) => {
      if (isConnected && name === 'WhatsApp Lite') {
        // First fetch instances when connecting WhatsApp Lite
        await fetchEvolutionInstances();
      }
      
      const { error } = await supabase
        .from('integrations')
        .update({ is_connected: isConnected })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success("Integration status updated");
    },
    onError: (error) => {
      console.error('Connection error:', error);
      toast.error("Failed to update integration status");
    }
  });

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "Connected") {
      return matchesSearch && integration.is_connected;
    }
    return matchesSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WhatsApp Instances</DialogTitle>
            <DialogDescription>
              Here are your Evolution API WhatsApp instances:
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {instancesData ? (
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(instancesData, null, 2)}
              </pre>
            ) : (
              <p>No instance data available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <Input 
          placeholder="Search" 
          className="max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            WEB HOOKS
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            CREATE INTEGRATION
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "Connected" && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {tab}
              </div>
            )}
            {tab !== "Connected" && tab}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Messengers</h2>
        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading integrations...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredIntegrations.map((integration) => (
              <div
                key={integration.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="aspect-video rounded-md bg-gradient-to-br from-blue-50 to-blue-100 mb-4 flex items-center justify-center">
                  <img
                    src={integration.icon_url}
                    alt={integration.name}
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <h3 className="font-medium mb-2">{integration.name}</h3>
                {integration.description && (
                  <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
                )}
                {integration.status === 'coming_soon' ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    Coming Soon
                  </Button>
                ) : (
                  <Button
                    variant={integration.is_connected ? "secondary" : "outline"}
                    className="w-full"
                    onClick={() => {
                      if (!integration.is_connected) {
                        toggleConnectionMutation.mutate({
                          id: integration.id,
                          isConnected: true,
                          name: integration.name
                        });
                      } else {
                        toggleConnectionMutation.mutate({
                          id: integration.id,
                          isConnected: false,
                          name: integration.name
                        });
                      }
                    }}
                  >
                    {integration.is_connected ? "Connected" : "Connect"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

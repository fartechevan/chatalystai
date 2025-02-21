
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

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

  const handleIntegrationClick = (integration: Integration) => {
    setSelectedIntegration(integration);
    setDialogOpen(true);
  };

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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Connect WhatsApp</DialogTitle>
            <DialogDescription>
              Connect multiple WhatsApp numbers to send important conversations straight to your inbox.
              Then nurture them with tools like templates and Salesbot!
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
              <TabsTrigger value="authorization" className="flex-1">Authorization</TabsTrigger>
            </TabsList>
            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                {selectedIntegration && (
                  <div className="aspect-video rounded-md bg-gradient-to-br from-green-50 to-green-100 mb-4 flex items-center justify-center p-8">
                    <img
                      src={selectedIntegration.icon_url}
                      alt={selectedIntegration.name}
                      className="object-contain max-h-32"
                    />
                  </div>
                )}
                <h3 className="text-lg font-semibold">Connect WhatsApp</h3>
                <p className="text-sm text-muted-foreground">
                  Connect multiple WhatsApp numbers to send important conversations straight to your inbox.
                </p>
                <Button className="w-full" size="lg">
                  Connect
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="authorization">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Authorization settings will be available after connecting your WhatsApp account.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          <DialogClose />
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
                    className="object-contain"
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
                    onClick={() => handleIntegrationClick(integration)}
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

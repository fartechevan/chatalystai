
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import type { ConnectionState } from "../hooks/whatsapp/types";
import type { Integration } from "../../types";
import { useState } from "react";

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  selectedIntegration: Integration | null;
  onConnect: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ConnectionStatus({
  connectionState,
  selectedIntegration,
  onConnect,
  onOpenChange,
}: ConnectionStatusProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "authorization">("settings");

  if (connectionState === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
        <h3 className="text-lg font-semibold">Connecting to WhatsApp</h3>
        <p className="text-sm text-muted-foreground text-center">
          We're currently establishing the connection to your WhatsApp account. 
          This process may take a moment.
        </p>
      </div>
    );
  }

  if (connectionState === 'open') {
    return (
      <Tabs defaultValue={activeTab} className="w-full" onValueChange={(value) => setActiveTab(value as "settings" | "authorization")}>
        <TabsList className="w-full">
          <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
          <TabsTrigger value="authorization" className="flex-1">Authorization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings" className="space-y-6">
          <div className="space-y-4">
            {selectedIntegration && (
              <div className="flex items-start space-x-4">
                <div className="w-40 h-40 bg-green-500 rounded-lg flex items-center justify-center p-4">
                  <img
                    src={selectedIntegration.icon_url}
                    alt={selectedIntegration.name}
                    className="object-contain max-h-24"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">WhatsApp for Small Business</h2>
                  <div className="mt-4 flex items-center space-x-4">
                    <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Installed
                    </span>
                    <Button variant="outline" size="sm">
                      Uninstall
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4 mt-8">
              <h3 className="text-xl font-semibold">Backup number</h3>
              <p className="text-gray-500">
                This WhatsApp account will be used in case your other numbers get disconnected.
              </p>
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="text-gray-600">+1 800 555 1234</p>
              </div>
            </div>
            
            <div className="mt-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-gray-500">+1 800 555 0123</TableCell>
                    <TableCell className="text-gray-500">+1 800 555 0123</TableCell>
                    <TableCell>
                      <select className="border rounded-md px-2 py-1">
                        <option>Prospects</option>
                        <option>Customers</option>
                        <option>Leads</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              
              <Button className="mt-4" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add number
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="authorization">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Authorization settings for your WhatsApp connection.
            </p>
            
            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-semibold">API Credentials</h3>
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="font-mono text-sm break-all">7ed9a88f-92a1-4dbc-9bb0-5cbb48ec3f0a</p>
              </div>
              <Button variant="outline" size="sm">
                Regenerate API Key
              </Button>
            </div>
            
            <div className="space-y-4 mt-8">
              <h3 className="text-lg font-semibold">Webhook Configuration</h3>
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="font-mono text-sm break-all">https://api.example.com/whatsapp/webhook</p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </Tabs>
    );
  }
  
  // Default: Not connected state
  return (
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
          <Button className="w-full" size="lg" onClick={onConnect}>
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
  );
}

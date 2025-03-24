import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { CheckCircle, Plus, AlertCircle, X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Integration } from "./types";

interface WhatsAppBusinessSettingsProps {
  selectedIntegration: Integration | null;
  onConnect: () => void;
}

interface WhatsAppInstance {
  id: string;
  name?: string;
  number?: string;
  connectionStatus?: string;
  state?: string;
  status?: string;
  ownerJid?: string;
}

export function WhatsAppBusinessSettings({ selectedIntegration, onConnect }: WhatsAppBusinessSettingsProps) {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInstances = async () => {
      if (!selectedIntegration) return;
      
      setIsLoading(true);
      try {
        console.log('Fetching WhatsApp instances for integration:', selectedIntegration.id);
        
        const { data, error } = await supabase.functions.invoke("integrations", {
          body: { integration_id: selectedIntegration.id }
        });
        
        if (error) {
          console.error('Error fetching WhatsApp instances:', error);
          toast({
            title: "Error",
            description: "Could not fetch WhatsApp instances: " + error.message,
            variant: "destructive"
          });
          setInstances([]);
        } else {
          console.log('WhatsApp instances response:', data);
          if (Array.isArray(data)) {
            setInstances(data);
          } else {
            console.error('Unexpected data format for instances:', data);
            setInstances([]);
          }
        }
      } catch (error) {
        console.error('Exception in fetchInstances:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred while fetching WhatsApp instances",
          variant: "destructive"
        });
        setInstances([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstances();
  }, [selectedIntegration, toast]);

  const getStatusIcon = (instance: WhatsAppInstance) => {
    const isConnected = 
      instance.connectionStatus === 'open' || 
      instance.status === 'open' || 
      instance.state === 'open';
    
    return isConnected ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <AlertCircle className="h-5 w-5 text-amber-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">Backup number</h3>
          <p className="text-gray-500">
            This WhatsApp account will be used in case your other numbers get disconnected.
          </p>
          
          {instances.length > 0 ? (
            <>
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
                    {instances.map(instance => (
                      <TableRow key={instance.id}>
                        <TableCell className="font-medium">{instance.ownerJid || instance.id}</TableCell>
                        <TableCell>{instance.number || 'Unknown'}</TableCell>
                        <TableCell>
                          <select className="border rounded-md px-2 py-1">
                            <option>Pipeline</option>
                            <option>Prospects</option>
                            <option>Customers</option>
                            <option>Leads</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between">
                            {getStatusIcon(instance)}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <X className="h-4 w-4 text-gray-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <Button className="mt-4" variant="outline" onClick={onConnect}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add number
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-8 text-center space-y-4 py-6 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No WhatsApp instances connected</p>
              <Button onClick={onConnect}>
                Connect WhatsApp
              </Button>
            </div>
          )}
        </div>
        
        <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-100">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800">
                Don't forget to use your phone at least <strong>once every 14 days</strong> to stay connected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

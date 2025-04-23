import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label"; // Import Label
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import { supabase } from "@/integrations/supabase/client";
import type { Customer } from "./types/customer";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { sendBroadcastService } from '@/services/broadcast/sendBroadcastService';

// Define a type for the combined integration and instance data
interface IntegrationInstanceInfo {
  integrationId: string;
  instanceId: string;
  name: string; // Integration name for display
}

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BroadcastModal({
  isOpen,
  onClose
}: BroadcastModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'selectCustomers' | 'composeMessage'>('selectCustomers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For loading customers
  const [isSending, setIsSending] = useState(false);
  // Update state to hold IntegrationInstanceInfo
  const [availableIntegrations, setAvailableIntegrations] = useState<IntegrationInstanceInfo[]>([]);
  // State to hold the selected IntegrationInstanceInfo object or just its integrationId
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep('selectCustomers');
      setSelectedCustomers([]);
      setBroadcastMessage('');
      setIsSending(false);
      setSelectedIntegrationId('');
      setAvailableIntegrations([]);
    }
  }, [isOpen]);

  // Fetch customers when the modal opens and step is selectCustomers
  useEffect(() => {
    if (isOpen && step === 'selectCustomers') {
      const fetchCustomers = async () => {
        if (customers.length > 0) return;
        setIsLoading(true);
        try {
          const { data, error } = await supabase.from('customers').select('*');
          if (error) throw error;
          setCustomers(data || []);
        } catch (error) {
          console.error("Error fetching customers:", error);
          toast({ title: "Error", description: "Could not load customers.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchCustomers();
    }
  }, [isOpen, step, customers.length, toast]);

  // Fetch available integrations when switching to compose step
  useEffect(() => {
    if (isOpen && step === 'composeMessage' && availableIntegrations.length === 0) {
      const fetchIntegrations = async () => {
        setIsLoadingIntegrations(true);
        try {
          // 1. Fetch integrations (just ID and name)
          const { data: integrationsData, error: integrationsError } = await supabase
            .from('integrations')
            .select('id, name');
          if (integrationsError) throw integrationsError;
          if (!integrationsData) throw new Error("No integrations found.");

          // 2. Fetch integration configs (integration_id and instance_id)
          const { data: configsData, error: configsError } = await supabase
            .from('integrations_config')
            .select('integration_id, instance_id'); // Fetch relevant fields
          if (configsError) throw configsError;
          if (!configsData) throw new Error("No integration configurations found.");

          // 3. Combine the data, linking integrations to their instance IDs
          const combinedData: IntegrationInstanceInfo[] = integrationsData.map(integration => {
            // Find the first config matching this integration ID
            const config = configsData.find(c => c.integration_id === integration.id);
            return {
              integrationId: integration.id,
              name: integration.name || `Integration ${integration.id}`, // Use name or fallback
              instanceId: config?.instance_id || '', // Store instanceId, empty if no config
            };
          }).filter(item => item.instanceId); // Filter out integrations without a configured instanceId

          if (combinedData.length === 0) {
             console.warn("No integrations with valid configurations (instanceId) found.");
             // Optionally inform the user
          }

          setAvailableIntegrations(combinedData);
          // Set default selection if available
          if (combinedData.length > 0) {
            setSelectedIntegrationId(combinedData[0].integrationId); // Select the first integration ID
          } else {
             setSelectedIntegrationId(''); // Ensure selection is cleared if no valid options
          }

        } catch (error) {
          console.error("Error fetching integrations/configs:", error);
          toast({ title: "Error", description: "Could not load integrations.", variant: "destructive" });
        } finally {
          setIsLoadingIntegrations(false);
        }
      };
      fetchIntegrations();
    }
  }, [isOpen, step, availableIntegrations.length, toast]);


  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prevSelected =>
      prevSelected.includes(customerId)
        ? prevSelected.filter(id => id !== customerId)
        : [...prevSelected, customerId]
    );
  };

  const handleNext = () => {
    setStep('composeMessage');
  };

  const handleBack = () => {
    setStep('selectCustomers');
  };

  // Updated handleSend to call the new frontend service
  const handleSend = async () => {
    if (selectedCustomers.length === 0 || !broadcastMessage.trim()) {
      toast({ title: "Error", description: "Please select customers and enter a message.", variant: "destructive" });
      return;
    }
    if (!selectedIntegrationId) {
      toast({ title: "Error", description: "Please select an integration to send from.", variant: "destructive" });
      return;
    }

    // Find the selected integration's details, including the instanceId
    const selectedIntegrationInfo = availableIntegrations.find(int => int.integrationId === selectedIntegrationId);

    if (!selectedIntegrationInfo || !selectedIntegrationInfo.instanceId) {
       toast({ title: "Error", description: "Selected integration is missing configuration (Instance ID).", variant: "destructive" });
       return;
    }

    setIsSending(true);

    try {
       // Call the service with integrationId and instanceId
       // Remove apiKey and baseUrl as they are fetched within the service now
       const result = await sendBroadcastService({
         integrationId: selectedIntegrationId,
         instanceId: selectedIntegrationInfo.instanceId, // Pass the correct instanceId
         customerIds: selectedCustomers,
         messageText: broadcastMessage,
       });

      // Response handling remains the same
      console.log("Broadcast Service Response:", result);
      const { successfulSends, failedSends, totalAttempted, broadcastId } = result;

      // Removed check for 'warning' as it's not returned by the service
      if (failedSends > 0) {
        toast({
          title: "Broadcast Partially Failed",
          description: `${failedSends} out of ${totalAttempted} messages failed. Broadcast ID: ${broadcastId}. Check server logs for details.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Broadcast Sent Successfully",
          description: `Message sent to ${successfulSends} customer(s). Broadcast ID: ${broadcastId}.`,
        });
      }

      // TODO: Optionally trigger a refetch of broadcasts list on the BroadcastsPage

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while sending the broadcast.";
      console.error("Error sending broadcast via service:", errorMessage);
      toast({
        title: "Broadcast Failed",
        description: `Failed to send broadcast. ${errorMessage}`, // Include service error
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      onClose(); // Close modal regardless of success/failure
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>New Broadcast</DialogTitle>
          <DialogDescription>
            {step === 'selectCustomers'
              ? 'Select customers to send the broadcast message to.'
              : 'Compose your broadcast message.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Customers */}
        {step === 'selectCustomers' && (
          <div className="py-4 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <p>Loading customers...</p>
            ) : customers.length === 0 ? (
               <p>No customers found.</p>
            ) : (
              <ul>
                {customers.map((customer) => (
                  <li key={customer.id} className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer" onClick={() => handleSelectCustomer(customer.id)}>
                    <span>{customer.name} ({customer.phone_number})</span>
                    <input
                      type="checkbox"
                      readOnly
                      checked={selectedCustomers.includes(customer.id)}
                      className="pointer-events-none"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Step 2: Compose Message */}
        {step === 'composeMessage' && (
          <div className="py-4 space-y-4">
            {/* Integration Selector */}
            <div>
              <Label htmlFor="integration-select">Send From:</Label>
              {isLoadingIntegrations ? (
                <p className="text-sm text-muted-foreground">Loading integrations...</p>
              ) : availableIntegrations.length === 0 ? (
                // Update the message for no integrations found
                <p className="text-sm text-red-500">No integrations found.</p> 
              ) : (
                <Select
                  value={selectedIntegrationId}
                  onValueChange={setSelectedIntegrationId}
                >
                  <SelectTrigger id="integration-select" className="w-full mt-1">
                    <SelectValue placeholder="Select integration..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIntegrations.map((integrationInfo) => (
                      // Use integrationId for the value, as that's what's stored in selectedIntegrationId state
                      <SelectItem key={integrationInfo.integrationId} value={integrationInfo.integrationId}>
                        {integrationInfo.name} {/* Display the integration name */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Message Textarea */}
            <Textarea
              placeholder="Type your broadcast message here..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={6}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Sending to {selectedCustomers.length} customer(s).
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'selectCustomers' && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleNext} disabled={selectedCustomers.length === 0 || isLoading}>
                Next ({selectedCustomers.length})
              </Button>
            </>
          )}
          {step === 'composeMessage' && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isSending}>Back</Button>
              {/* Disable Send button if no integration is selected or loading */}
              <Button 
                onClick={handleSend} 
                disabled={!broadcastMessage.trim() || !selectedIntegrationId || isLoadingIntegrations || isSending}
              >
                {isSending ? 'Sending...' : 'Send'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

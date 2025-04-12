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
import type { Database } from "@/integrations/supabase/types"; // Import Database type
import { sendBroadcastService } from '@/services/broadcast/sendBroadcastService'; // Import the new service

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
  const [availableIntegrations, setAvailableIntegrations] = useState<Database['public']['Tables']['integrations']['Row'][]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>(''); // Initialize as empty string
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep('selectCustomers');
      setSelectedCustomers([]);
      setBroadcastMessage('');
      setIsSending(false);
      setSelectedIntegrationId(''); // Reset selected integration
      setAvailableIntegrations([]); // Clear integrations list
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
          // Fetch all integrations including api_key and base_url
          // SECURITY WARNING: Exposing api_key in the frontend is risky!
          const { data, error } = await supabase
            .from('integrations')
            .select('id, name, base_url, api_key'); // Select necessary fields

          if (error) throw error;
          // Filter out integrations missing essential data (handle potential nulls)
          const validIntegrations = (data || []).filter(
            (integration): integration is Database['public']['Tables']['integrations']['Row'] & { api_key: string; base_url: string } =>
              integration.api_key !== null && integration.base_url !== null
          );
          setAvailableIntegrations(validIntegrations);
          // Optionally set a default selected integration
          if (data && data.length > 0) {
            setSelectedIntegrationId(data[0].id); // Select the first one by default
          }
        } catch (error) {
          console.error("Error fetching integrations:", error);
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

    // Find the selected integration details (including API key and base URL)
    const selectedIntegration = availableIntegrations.find(int => int.id === selectedIntegrationId);
    // Ensure the integration and its required fields (api_key, base_url) exist
    if (!selectedIntegration || !selectedIntegration.api_key || !selectedIntegration.base_url) {
       toast({ title: "Error", description: "Selected integration details are missing or incomplete (API Key or Base URL).", variant: "destructive" });
       return;
    }

    setIsSending(true);

    try {
       // Call the new frontend service function
       const result = await sendBroadcastService({
         integrationId: selectedIntegrationId,
         customerIds: selectedCustomers,
         messageText: broadcastMessage,
         apiKey: selectedIntegration.api_key, // Pass API key - SECURITY RISK!
         baseUrl: selectedIntegration.base_url, // Pass base URL
       });

      console.log("Broadcast Service Response:", result);
      const { successfulSends, failedSends, totalAttempted, broadcastId, warning } = result;

      if (warning) {
         toast({ title: "Broadcast Warning", description: warning, variant: "default" });
      } else if (failedSends > 0) {
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
                    {availableIntegrations.map((integration) => (
                      <SelectItem key={integration.id} value={integration.id}>
                        {integration.name} 
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

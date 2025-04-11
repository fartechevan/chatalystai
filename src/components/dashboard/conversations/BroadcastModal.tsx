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
import { supabase } from "@/integrations/supabase/client";
import type { Customer } from "./types/customer";
import { sendTextService } from "@/integrations/evolution-api/services/sendTextService"; // Keep this import
import { getEvolutionCredentials } from "@/integrations/evolution-api/utils/credentials"; // Import credential fetcher
import { useToast } from "@/hooks/use-toast";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep('selectCustomers');
      setSelectedCustomers([]);
      setBroadcastMessage('');
      setIsSending(false);
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

  // Reverted handleSend to use frontend logic with hardcoded ID
  const handleSend = async () => {
    console.log("Selected Customer IDs:", selectedCustomers);
    console.log("Message:", broadcastMessage);

    const hardcodedIntegrationId = "1fe47f4b-3b22-43cf-acf2-6bd3eeb0a96d"; // Hardcoded ID

    // 1. Fetch instance name (still needed for the API path)
    let instanceName: string | null = null;
    try {
      const { data: configData, error: configError } = await supabase
        .from('integrations_config')
        .select('instance_id')
        .eq('integration_id', hardcodedIntegrationId) // Use hardcoded ID
        .maybeSingle();
      if (configError && configError.code !== 'PGRST116') throw configError;
      if (!configData?.instance_id) throw new Error(`No instance configured for integration ${hardcodedIntegrationId}.`);
      instanceName = configData.instance_id;

    } catch (error: unknown) {
       const errorMessage = error instanceof Error ? error.message : "Could not load instance details.";
       console.error("Error fetching instance config for broadcast:", errorMessage);
       toast({ title: "Configuration Error", description: errorMessage, variant: "destructive" });
       return; // Stop execution if config fails
    }

    // Config fetched successfully, now prepare to send
    setIsSending(true);

    // 2. Get phone numbers
    const selectedCustomerDetails = customers.filter(c => selectedCustomers.includes(c.id));
    const phoneNumbers = selectedCustomerDetails.map(c => c.phone_number).filter(Boolean) as string[];
    console.log("Sending to phone numbers:", phoneNumbers);

    if (phoneNumbers.length === 0) {
       toast({ title: "Warning", description: "No valid phone numbers found for selected customers.", variant: "destructive" });
       setIsSending(false);
       return;
    }

    // 3. Send messages sequentially
    let successfulSends = 0;
    let failedSends = 0;
    const totalToSend = phoneNumbers.length;

    // Note: Credentials (API key) are fetched inside sendTextService now
    // We only need to pass the hardcoded integrationId and fetched instanceName

    for (const number of phoneNumbers) {
      try {
        // Call sendTextService directly from frontend
        await sendTextService({
          integrationId: hardcodedIntegrationId, // Pass hardcoded ID
          instance: instanceName!, // Pass fetched instance name
          number,
          text: broadcastMessage,
        });
        successfulSends++;
      } catch (error: unknown) {
        failedSends++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to send broadcast to ${number}:`, errorMessage);
        // Optionally show a toast for each failure, or just summarize at the end
      }
    }

    // 4. Show summary toast
    if (failedSends > 0) {
      toast({
        title: "Broadcast Partially Failed",
        description: `${failedSends} out of ${totalToSend} messages failed. Check console for details.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Broadcast Sent",
        description: `Successfully sent message to ${successfulSends} customer(s).`,
      });
    }

    // 5. Reset state and close modal
    setIsSending(false);
    onClose();
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
          <div className="py-4">
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
              <Button onClick={handleSend} disabled={!broadcastMessage.trim() || isSending}>
                {isSending ? 'Sending...' : 'Send'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

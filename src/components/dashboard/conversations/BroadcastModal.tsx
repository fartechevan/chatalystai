import React, { useState, useEffect, useRef } from 'react';
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Added RadioGroup
import { Upload, ListChecks, Users as UsersIcon } from 'lucide-react'; // Added ListChecks, renamed Users
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from '@/hooks/useAuthUser'; // Import the auth hook
import type { Database } from "@/integrations/supabase/types";
import { sendBroadcastService, type SendBroadcastParams } from '@/services/broadcast/sendBroadcastService'; // Import SendBroadcastParams type

// Define Customer type
type Customer = Database['public']['Tables']['customers']['Row']; // Use type from Database

// Define Segment type
type Segment = Database['public']['Tables']['segments']['Row'];

// Define IntegrationInstanceInfo type
interface IntegrationInstanceInfo {
  integrationId: string;
  instanceId: string;
  name: string;
}

type TargetMode = 'customers' | 'segment' | 'csv'; // Added 'csv' mode

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string; // Add optional prop for initial message
}

export function BroadcastModal({
  isOpen,
  onClose,
  initialMessage // Destructure the new prop
}: BroadcastModalProps) {
  const { toast } = useToast();
  const { userData } = useAuthUser(); // Correctly destructure userData based on TS error
  const [step, setStep] = useState<'selectTarget' | 'composeMessage'>('selectTarget'); // Changed step names
  const [targetMode, setTargetMode] = useState<TargetMode>('customers'); // State for target mode

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Segment state
  const [availableSegments, setAvailableSegments] = useState<Segment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('');
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);

  // CSV state
  // CSV state
  const [csvRecipients, setCsvRecipients] = useState<string[]>([]); // Store ALL phone numbers from CSV
  const [csvFileName, setCsvFileName] = useState<string | null>(null); // Store uploaded file name
  const [isProcessingCsv, setIsProcessingCsv] = useState(false); // Loading state for CSV processing
  const [newContactsFromCsv, setNewContactsFromCsv] = useState<string[]>([]); // Store new phone numbers found
  const [existingContactIdsFromCsv, setExistingContactIdsFromCsv] = useState<string[]>([]); // Store IDs of existing contacts found
  const [addedCustomerIdsFromCsv, setAddedCustomerIdsFromCsv] = useState<string[]>([]); // Store IDs of newly added customers
  const [showAddContactsPrompt, setShowAddContactsPrompt] = useState(false); // State to control the prompt visibility
  const [isAddingContacts, setIsAddingContacts] = useState(false); // Loading state for adding contacts
  const [showCreateSegmentPrompt, setShowCreateSegmentPrompt] = useState(false); // State for create segment prompt
  const [newSegmentName, setNewSegmentName] = useState(''); // State for new segment name
  const [isCreatingSegment, setIsCreatingSegment] = useState(false); // Loading state for segment creation

  // Compose state
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [availableIntegrations, setAvailableIntegrations] = useState<IntegrationInstanceInfo[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep('selectTarget');
      setTargetMode('customers'); // Default to customer selection
      setSelectedCustomers([]);
      setCustomers([]);
      setIsLoadingCustomers(false);
      setSelectedSegmentId('');
      setAvailableSegments([]);
      setIsLoadingSegments(false);
      setCsvRecipients([]);
      setCsvFileName(null);
      setIsProcessingCsv(false);
      setNewContactsFromCsv([]);
      setExistingContactIdsFromCsv([]);
      setAddedCustomerIdsFromCsv([]); // Reset added IDs
      setShowAddContactsPrompt(false); // Reset prompt state
      setIsAddingContacts(false); // Reset adding state
      setShowCreateSegmentPrompt(false);
      setNewSegmentName('');
      setIsCreatingSegment(false);
      setBroadcastMessage(initialMessage || ''); // Set initial message if provided
      setIsSending(false);
      setSelectedIntegrationId('');
      setAvailableIntegrations([]);
      setIsLoadingIntegrations(false);
    } else {
      // If closing, ensure message is cleared even if initialMessage was set
      setBroadcastMessage('');
    }
  // Add initialMessage to dependency array
  }, [isOpen, initialMessage]);

  // Fetch customers when mode is 'customers'
  useEffect(() => {
    if (isOpen && step === 'selectTarget' && targetMode === 'customers') {
      const fetchCustomers = async () => {
        setIsLoadingCustomers(true);
        try {
          const { data, error } = await supabase.from('customers').select('*');
          if (error) throw error;
          setCustomers((data as Customer[]) || []);
        } catch (error) {
          console.error("Error fetching customers:", error);
          toast({ title: "Error", description: "Could not load customers.", variant: "destructive" });
        } finally {
          setIsLoadingCustomers(false);
        }
      };
      fetchCustomers();
    }
  }, [isOpen, step, targetMode, toast]);

  // Fetch segments when mode is 'segment'
  useEffect(() => {
    if (isOpen && step === 'selectTarget' && targetMode === 'segment') {
      const fetchSegments = async () => {
        setIsLoadingSegments(true);
        try {
          // Explicitly use GET method for segment-handler
          const { data, error } = await supabase.functions.invoke('segment-handler/segments', { method: 'GET' });
          if (error) throw error;
          setAvailableSegments((data as Segment[]) || []);
          // Reset segment selection if list is empty or changes
          if (!data || data.length === 0) {
            setSelectedSegmentId('');
          }
        } catch (error) {
          console.error("Error fetching segments:", error);
          toast({ title: "Error", description: "Could not load segments.", variant: "destructive" });
        } finally {
          setIsLoadingSegments(false);
        }
      };
      fetchSegments();
    }
  }, [isOpen, step, targetMode, toast]);


  // Fetch available integrations when switching to compose step
  useEffect(() => {
    if (isOpen && step === 'composeMessage' && availableIntegrations.length === 0) {
      // ... (integration fetching logic remains the same) ...
       const fetchIntegrations = async () => {
        setIsLoadingIntegrations(true);
        try {
          const { data: integrationsData, error: integrationsError } = await supabase
            .from('integrations')
            .select('id, name');
          if (integrationsError) throw integrationsError;
          if (!integrationsData) throw new Error("No integrations found.");

          const { data: configsData, error: configsError } = await supabase
            .from('integrations_config')
            .select('integration_id, instance_id');
          if (configsError) throw configsError;
          if (!configsData) throw new Error("No integration configurations found.");

          const combinedData: IntegrationInstanceInfo[] = integrationsData.map(integration => {
            const config = configsData.find(c => c.integration_id === integration.id);
            return {
              integrationId: integration.id,
              name: integration.name || `Integration ${integration.id}`,
              instanceId: config?.instance_id || '',
            };
          }).filter(item => item.instanceId);

          if (combinedData.length === 0) {
             console.warn("No integrations with valid configurations (instanceId) found.");
          }

          setAvailableIntegrations(combinedData);
          if (combinedData.length > 0) {
            setSelectedIntegrationId(combinedData[0].integrationId);
          } else {
             setSelectedIntegrationId('');
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
    // Validate based on the selected mode
    if (targetMode === 'customers' && selectedCustomers.length === 0) {
       toast({ title: "Error", description: "Please select at least one customer or import a CSV.", variant: "destructive" });
       return;
    }
    if (targetMode === 'segment' && !selectedSegmentId) {
       toast({ title: "Error", description: "Please select a target segment.", variant: "destructive" });
       return;
    }
    setStep('composeMessage');
  };

  const handleBack = () => {
    setStep('selectTarget');
  };

  const handleSend = async () => {
    // Validate based on mode
    if (targetMode === 'customers' && selectedCustomers.length === 0) {
      toast({ title: "Error", description: "Please select customers or import a CSV.", variant: "destructive" });
      return;
    }
     if (targetMode === 'segment' && !selectedSegmentId) {
      toast({ title: "Error", description: "Please select a segment.", variant: "destructive" });
      return;
    }
    if (!broadcastMessage.trim()) {
      toast({ title: "Error", description: "Please enter a message.", variant: "destructive" });
      return;
    }
    if (!selectedIntegrationId) {
      toast({ title: "Error", description: "Please select an integration.", variant: "destructive" });
      return;
    }

    const selectedIntegrationInfo = availableIntegrations.find(int => int.integrationId === selectedIntegrationId);
    if (!selectedIntegrationInfo || !selectedIntegrationInfo.instanceId) {
       toast({ title: "Error", description: "Selected integration is missing configuration.", variant: "destructive" });
       return;
    }

    setIsSending(true);
    try {
       // Prepare params based on mode
       let paramsToSend: SendBroadcastParams;

       if (targetMode === 'segment') {
         paramsToSend = {
           targetMode: 'segment', // Explicitly add mode
           integrationId: selectedIntegrationId,
           instanceId: selectedIntegrationInfo.instanceId,
           messageText: broadcastMessage,
           segmentId: selectedSegmentId,
         };
       } else if (targetMode === 'customers') {
         paramsToSend = {
           targetMode: 'customers', // Explicitly add mode
           integrationId: selectedIntegrationId,
           instanceId: selectedIntegrationInfo.instanceId,
           messageText: broadcastMessage,
           customerIds: selectedCustomers,
         };
       } else { // targetMode === 'csv'
         // Ensure CSV recipients are available
         if (csvRecipients.length === 0) {
            toast({ title: "Error", description: "No recipients found from CSV.", variant: "destructive" });
            setIsSending(false);
            return;
         }
         paramsToSend = {
           targetMode: 'csv', // Explicitly add mode
           integrationId: selectedIntegrationId,
           instanceId: selectedIntegrationInfo.instanceId,
           messageText: broadcastMessage,
           phoneNumbers: csvRecipients, // Pass the raw phone numbers
         };
       }

       const result = await sendBroadcastService(paramsToSend);

      console.log("Broadcast Service Response:", result);
      const { successfulSends, failedSends, totalAttempted, broadcastId } = result;

      if (failedSends > 0) {
        toast({
          title: "Broadcast Partially Failed",
          description: `${failedSends} out of ${totalAttempted} messages failed. Broadcast ID: ${broadcastId}. Check server logs.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Broadcast Sent Successfully",
          description: `Message sent to ${successfulSends} recipient(s). Broadcast ID: ${broadcastId}.`,
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("Error sending broadcast:", errorMessage);
      toast({
        title: "Broadcast Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      onClose();
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Reworked handleFileChange for CSV mode
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || targetMode !== 'csv') return; // Only process if in CSV mode

    let uniquePhoneNumbers: string[] = []; // Reverted back to let as it's reassigned below
    let checkError: Error | null = null; // Declare higher scope

    setCsvFileName(file.name);
    setIsProcessingCsv(true);
    setCsvRecipients([]); // Clear previous recipients

    // Reset file input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const fileContent = await file.text();
      const lines = fileContent.split('\n');
      if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const phoneIndex = headers.indexOf('phone_number');

      if (phoneIndex === -1) throw new Error("CSV must contain a 'phone_number' column header.");

      const phoneNumbers = lines
        .slice(1) // Skip header
        .map(line => line.split(',')[phoneIndex]?.trim()) // Get phone number
        .filter(Boolean); // Remove empty strings/undefined

      if (phoneNumbers.length === 0) throw new Error("No valid phone numbers found in CSV.");

      // Assign to the higher-scoped let variable
      uniquePhoneNumbers = [...new Set(phoneNumbers)];
      setCsvRecipients(uniquePhoneNumbers);
      toast({ title: "CSV Parsed", description: `${uniquePhoneNumbers.length} unique phone numbers found in ${file.name}. Checking database...` });

      // Call backend to check existing/new contacts
      try {
        // Assign to higher scope variable
        const { data: checkResult, error: invokeError } = await supabase.functions.invoke('check-csv-contacts', {
          body: { phoneNumbers: uniquePhoneNumbers },
        });

        if (invokeError) {
          checkError = invokeError instanceof Error ? invokeError : new Error(String(invokeError));
          throw checkError;
        }

        const { existingCustomerIds, newPhoneNumbers: newNumbers } = checkResult as { existingCustomerIds: string[], newPhoneNumbers: string[] };

        setExistingContactIdsFromCsv(existingCustomerIds || []);
        setNewContactsFromCsv(newNumbers || []);

        let resultMessage = `${existingCustomerIds?.length || 0} existing customer(s) found.`;
        if (newNumbers && newNumbers.length > 0) {
          resultMessage += ` ${newNumbers.length} new number(s) found.`;
          // Trigger UI prompt if new numbers are found
          if (newNumbers && newNumbers.length > 0) {
            setShowAddContactsPrompt(true); // Show the prompt
            toast({ title: "Action Required", description: `${newNumbers.length} new phone numbers found in the CSV. Add them?` });
          } else {
            toast({ title: "Check Complete", description: resultMessage });
            setShowAddContactsPrompt(false); // No new contacts, ensure prompt is hidden
          }
        }

      } catch (checkError) {
         const message = checkError instanceof Error ? checkError.message : "Failed to check contacts against database.";
         console.error("Error checking CSV contacts:", checkError);
         toast({ title: "Database Check Error", description: message, variant: "destructive" });
         // Reset state if check fails
         setCsvFileName(null);
         setCsvRecipients([]);
         setNewContactsFromCsv([]);
         setExistingContactIdsFromCsv([]);
         setAddedCustomerIdsFromCsv([]);
         setShowAddContactsPrompt(false);
         setShowCreateSegmentPrompt(false); // Also hide create segment prompt on check error
      }

    } catch (error) {
       // Ensure checkError is set if it wasn't already (e.g., error during file reading)
       if (!checkError && error instanceof Error) {
         checkError = error;
       } else if (!checkError) {
         checkError = new Error("An unknown error occurred during CSV processing.");
       }
      const message = error instanceof Error ? error.message : "Failed to process CSV file.";
      console.error("Error processing CSV:", error);
      toast({ title: "Import Error", description: message, variant: "destructive" });
      setCsvFileName(null); // Reset file name on error
      setCsvRecipients([]); // Clear recipients on error
    } finally {
      setIsProcessingCsv(false);
      // Show create segment option only if CSV processing was successful (no checkError) and there are recipients
      if (uniquePhoneNumbers.length > 0 && checkError === null) {
        setShowCreateSegmentPrompt(true);
      } else {
        setShowCreateSegmentPrompt(false); // Hide if processing failed or no recipients
      }
    }
  };

  const handleAddNewContacts = async () => {
    if (newContactsFromCsv.length === 0) return;

    setIsAddingContacts(true);
    try {
      // Prepare data for the backend function
      const contactsToAdd = newContactsFromCsv.map(phone => ({ phone_number: phone }));

      // Assume the function returns { addedCount: number, newCustomerIds: string[] }
      const { data, error } = await supabase.functions.invoke<{ addedCount: number, newCustomerIds: string[] }>('add-new-customers', {
        body: { newContacts: contactsToAdd },
      });

      if (error) throw error;

      const addedIds = data?.newCustomerIds || [];
      setAddedCustomerIdsFromCsv(addedIds); // Store the IDs of newly added customers

      toast({
        title: "Success",
        description: `${data?.addedCount || 0} new customers added successfully.`,
      });
      setShowAddContactsPrompt(false); // Hide prompt after adding
      // No need to refetch customers here, we have the IDs

    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add new customers.";
      console.error("Error adding new contacts:", error);
      toast({ title: "Error Adding Contacts", description: message, variant: "destructive" });
    } finally {
      setIsAddingContacts(false);
      // Keep create segment prompt visible after adding contacts
      setShowCreateSegmentPrompt(true);
    }
  };

  // Renamed and adapted function to handle segment creation from either CSV or selected customers
  const handleCreateSegment = async () => {
    if (!newSegmentName.trim()) {
      toast({ title: "Error", description: "Please enter a name for the new segment.", variant: "destructive" });
      return;
    }
    // Access user ID via userData
    if (!userData?.id) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }

    let customerIdsForSegment: string[] = [];
    const initialMode = targetMode; // Store the mode when the button was clicked

    if (initialMode === 'csv') { // Check initial mode here
      // Combine existing customer IDs and newly added customer IDs from CSV
      customerIdsForSegment = [...new Set([...existingContactIdsFromCsv, ...addedCustomerIdsFromCsv])];
      if (customerIdsForSegment.length === 0) {
        toast({ title: "Error", description: "No customers identified from the CSV to add to the segment.", variant: "destructive" });
        return;
      }
    } else if (initialMode === 'customers') { // Check initial mode here
      customerIdsForSegment = selectedCustomers;
       if (customerIdsForSegment.length === 0) {
        toast({ title: "Error", description: "No customers selected to add to the segment.", variant: "destructive" });
        return;
      }
    } else {
       // Should not happen, but good to handle
       toast({ title: "Error", description: "Invalid mode for segment creation.", variant: "destructive" });
       return;
    }

    setIsCreatingSegment(true);
    try {
      // Call the Supabase function (ensure it exists)
      const { data: newSegment, error } = await supabase.functions.invoke<Segment>('segment-handler', {
        body: {
          segmentName: newSegmentName,
          customerIds: customerIdsForSegment, // Use the determined list of IDs
          userId: userData.id, // Pass the user ID from userData
        },
      });

      if (error) throw error;
      if (!newSegment) throw new Error("Segment creation did not return segment data.");

      toast({
        title: "Segment Created",
        description: `Segment "${newSegment.name}" created with ${customerIdsForSegment.length} contacts.`,
      });

      // Update local state - Always add the new segment to the list
      setAvailableSegments(prev => [...prev, newSegment]);

      // Conditionally switch mode and select ONLY if created from CSV mode
      if (initialMode === 'csv') {
        setTargetMode('segment'); // Switch mode to segment
        setSelectedSegmentId(newSegment.id); // Select the new segment
      }
      // Always clear name and hide prompt regardless of initial mode
      setNewSegmentName(''); // Clear input
      setShowCreateSegmentPrompt(false); // Hide the create segment UI

    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create segment.";
      console.error("Error creating segment:", error); // Changed log context slightly
      toast({ title: "Segment Creation Failed", description: message, variant: "destructive" });
    } finally {
      setIsCreatingSegment(false);
    }
  };


  // --- Helper Functions ---

  // Determine if Next button should be disabled
  const isNextDisabled = () => {
    // Disable if loading, or no selection, or if a prompt/creation is active
    if (targetMode === 'customers') return isLoadingCustomers || selectedCustomers.length === 0 || isCreatingSegment || (showCreateSegmentPrompt && selectedCustomers.length > 0);
    if (targetMode === 'segment') return isLoadingSegments || !selectedSegmentId;
    if (targetMode === 'csv') return isProcessingCsv || csvRecipients.length === 0 || isAddingContacts || isCreatingSegment || showAddContactsPrompt || showCreateSegmentPrompt;
    return true; // Default disabled for safety
  };

  // Get recipient count for display
  const recipientCount = () => {
     if (targetMode === 'customers') return selectedCustomers.length;
     if (targetMode === 'csv') return csvRecipients.length;
     // TODO: Fetch segment contact count if needed for display, or show 'N/A'
     if (targetMode === 'segment') return 'N/A'; // Placeholder for segment count
     return 0;
  }

  // --- Render Logic ---

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>New Broadcast</DialogTitle>
          <DialogDescription>
            {step === 'selectTarget'
              ? 'Choose how to target your broadcast.'
              : 'Compose your broadcast message.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Target */}
        {step === 'selectTarget' && (
          <div className="py-4 space-y-4">
            {/* Targeting Mode Selection */}
            <RadioGroup value={targetMode} onValueChange={(value) => setTargetMode(value as TargetMode)} className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="customers" id="mode-customers" />
                <Label htmlFor="mode-customers">Select Customers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="segment" id="mode-segment" />
                <Label htmlFor="mode-segment">Select Segment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="mode-csv" />
                <Label htmlFor="mode-csv">Upload CSV</Label>
              </div>
            </RadioGroup>

            {/* Conditional UI based on mode */}
            {targetMode === 'customers' && (
              <div className="space-y-2">
                {/* Removed Import CSV button from here */}
                <Label>Select Customers ({selectedCustomers.length} selected)</Label>
                <ScrollArea className="h-[300px] border rounded-md">
                  {isLoadingCustomers ? (
                    <p className="p-4 text-sm text-muted-foreground">Loading customers...</p>
                  ) : customers.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No customers found.</p>
                  ) : (
                    <ul className="p-2">
                      {customers.map((customer) => (
                        <li key={customer.id} className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer" onClick={() => handleSelectCustomer(customer.id)}>
                          <span>{customer.name} ({customer.phone_number})</span>
                          <input type="checkbox" readOnly checked={selectedCustomers.includes(customer.id)} className="pointer-events-none h-4 w-4" />
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
                 {/* Create Segment Prompt for Selected Customers */}
                 {selectedCustomers.length > 0 && !isLoadingCustomers && (
                    <div className="mt-4 p-3 border rounded-md bg-blue-50 border-blue-200 space-y-2">
                      <Label htmlFor="new-segment-name-customer" className="text-sm font-medium text-blue-800">
                        Optionally, create a new segment from these {selectedCustomers.length} selected contacts:
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="new-segment-name-customer"
                          placeholder="New Segment Name"
                          value={newSegmentName}
                          onChange={(e) => setNewSegmentName(e.target.value)}
                          className="flex-grow bg-white"
                          disabled={isCreatingSegment}
                        />
                        <Button
                          size="sm"
                          onClick={handleCreateSegment} // Use the unified handler
                          disabled={isCreatingSegment || !newSegmentName.trim()}
                        >
                          {isCreatingSegment ? 'Creating...' : 'Create Segment'}
                        </Button>
                      </div>
                       <p className="text-xs text-muted-foreground">
                         If created, the target will switch to this new segment. Otherwise, proceed with the selected customers.
                       </p>
                    </div>
                  )}
              </div>
            )}

            {targetMode === 'segment' && (
              <div className="space-y-2">
                 <Label htmlFor="segment-select">Target Segment:</Label>
                 <Select
                   value={selectedSegmentId}
                   onValueChange={setSelectedSegmentId}
                   disabled={isLoadingSegments}
                 >
                   <SelectTrigger id="segment-select" className="w-full">
                     <SelectValue placeholder={isLoadingSegments ? "Loading segments..." : "Select segment..."} />
                   </SelectTrigger>
                   <SelectContent>
                     {availableSegments.length === 0 && !isLoadingSegments && (
                        <p className="p-2 text-sm text-muted-foreground">No segments found.</p>
                     )}
                     {availableSegments.map((segment) => (
                       <SelectItem key={segment.id} value={segment.id}>
                         {segment.name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 {/* Optionally display segment contact count here if fetched */}
              </div>
            )}

            {targetMode === 'csv' && (
              <div className="space-y-3 border p-4 rounded-md bg-muted/20">
                 <Label>Upload CSV File</Label>
                 <div className="flex items-center gap-2">
                   <Button variant="outline" size="sm" onClick={handleImportClick} disabled={isProcessingCsv}>
                     <Upload className="mr-2 h-4 w-4" /> {csvFileName ? 'Change File' : 'Select File'}
                   </Button>
                   <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                   {isProcessingCsv && <p className="text-sm text-muted-foreground">Processing...</p>}
                   {csvFileName && !isProcessingCsv && (
                     <p className="text-sm text-muted-foreground truncate">
                       File: {csvFileName} ({csvRecipients.length} recipients)
                     </p>
                   )}
                 </div>
                 <p className="text-xs text-muted-foreground">
                   CSV must contain a 'phone_number' column header.
                   <a href="/sample_contacts.csv" download="sample_contacts.csv" className="ml-2 underline hover:text-primary">
                     Download Sample
                   </a>
                 </p>
                 {/* Add New Contacts Prompt */}
                 {showAddContactsPrompt && newContactsFromCsv.length > 0 && !isAddingContacts && (
                   <div className="mt-4 p-3 border rounded-md bg-amber-50 border-amber-200 space-y-2">
                     <p className="text-sm font-medium text-amber-800">
                       Found {newContactsFromCsv.length} new phone number(s) not in your customer list:
                     </p>
                     <ScrollArea className="h-[100px] text-xs text-amber-700 border bg-white rounded p-1">
                       {newContactsFromCsv.join(', ')}
                     </ScrollArea>
                     <div className="flex justify-end gap-2 pt-2">
                       <Button size="sm" variant="outline" onClick={() => setShowAddContactsPrompt(false)} disabled={isAddingContacts}>
                         Skip Adding
                       </Button>
                       <Button size="sm" onClick={() => handleAddNewContacts()} disabled={isAddingContacts}>
                         {isAddingContacts ? 'Adding...' : 'Add New Customers'}
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* Create Segment Prompt */}
                  {showCreateSegmentPrompt && !isProcessingCsv && csvRecipients.length > 0 && !showAddContactsPrompt && (
                    <div className="mt-4 p-3 border rounded-md bg-blue-50 border-blue-200 space-y-2">
                      <Label htmlFor="new-segment-name" className="text-sm font-medium text-blue-800">
                        Optionally, create a new segment from these {existingContactIdsFromCsv.length + addedCustomerIdsFromCsv.length} contacts:
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="new-segment-name"
                          placeholder="New Segment Name"
                          value={newSegmentName}
                          onChange={(e) => setNewSegmentName(e.target.value)}
                          className="flex-grow bg-white"
                          disabled={isCreatingSegment}
                        />
                        <Button
                          size="sm"
                          onClick={handleCreateSegment} // Use the unified handler
                          disabled={isCreatingSegment || !newSegmentName.trim()}
                        >
                          {isCreatingSegment ? 'Creating...' : 'Create Segment'}
                        </Button>
                      </div>
                       <p className="text-xs text-muted-foreground">
                         If created, the target will switch to this new segment. Otherwise, proceed to send directly to the CSV list.
                       </p>
                    </div>
                  )}
              </div>
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
                <p className="text-sm text-red-500">No integrations found.</p>
              ) : (
                <Select value={selectedIntegrationId} onValueChange={setSelectedIntegrationId}>
                  <SelectTrigger id="integration-select" className="w-full mt-1">
                    <SelectValue placeholder="Select integration..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIntegrations.map((integrationInfo) => (
                      <SelectItem key={integrationInfo.integrationId} value={integrationInfo.integrationId}>
                        {integrationInfo.name}
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
            {/* Display target description */}
            <p className="text-sm text-muted-foreground mt-2">
              Sending to: {
                targetMode === 'segment' ? `Segment "${availableSegments.find(s => s.id === selectedSegmentId)?.name || '...'}"` :
                targetMode === 'csv' ? `${csvRecipients.length} recipient(s) from ${csvFileName || 'CSV'}` :
                `${selectedCustomers.length} selected customer(s)`
              }
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'selectTarget' && (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleNext} disabled={isNextDisabled()}>
                Next
                {/* Optionally show count: ({recipientCount()}) */}
              </Button>
            </>
          )}
          {step === 'composeMessage' && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isSending}>Back</Button>
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

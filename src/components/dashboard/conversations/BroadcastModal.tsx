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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, ListChecks, Users as UsersIcon, X as Cross2Icon } from 'lucide-react'; // Added Cross2Icon for clearing image
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from '@/hooks/useAuthUser';
import type { Database } from "@/integrations/supabase/types";
import { sendBroadcastService, type SendBroadcastParams } from '@/services/broadcast/sendBroadcastService';

type Customer = Database['public']['Tables']['customers']['Row'];
type Segment = Database['public']['Tables']['segments']['Row'];

interface IntegrationInstanceInfo {
  configId: string;         // PK of integrations_config table
  instanceId: string;       // This is integrations_config.instance_id
  name: string;             // Display name for UI (from integrations_config.instance_display_name or fallback)
}

type TargetMode = 'customers' | 'segment' | 'csv';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export function BroadcastModal({
  isOpen,
  onClose,
  initialMessage
}: BroadcastModalProps) {
  const { toast } = useToast();
  const { userData } = useAuthUser();
  const [step, setStep] = useState<'selectTarget' | 'composeMessage'>('selectTarget');
  const [targetMode, setTargetMode] = useState<TargetMode>('customers');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  const [availableSegments, setAvailableSegments] = useState<Segment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('');
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);

  const [csvRecipients, setCsvRecipients] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [newContactsFromCsv, setNewContactsFromCsv] = useState<string[]>([]);
  const [existingContactIdsFromCsv, setExistingContactIdsFromCsv] = useState<string[]>([]);
  const [addedCustomerIdsFromCsv, setAddedCustomerIdsFromCsv] = useState<string[]>([]);
  const [showAddContactsPrompt, setShowAddContactsPrompt] = useState(false);
  const [isAddingContacts, setIsAddingContacts] = useState(false);
  const [showCreateSegmentPrompt, setShowCreateSegmentPrompt] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [isCreatingSegment, setIsCreatingSegment] = useState(false);

  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [availableIntegrations, setAvailableIntegrations] = useState<IntegrationInstanceInfo[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>(''); // This will now store configId
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null); // For CSV
  const imageFileInputRef = useRef<HTMLInputElement>(null); // For Image

  useEffect(() => {
    if (isOpen) {
      setStep('selectTarget');
      setTargetMode('customers');
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
      setAddedCustomerIdsFromCsv([]);
      setShowAddContactsPrompt(false);
      setIsAddingContacts(false);
      setShowCreateSegmentPrompt(false);
      setNewSegmentName('');
      setIsCreatingSegment(false);
      setBroadcastMessage(initialMessage || '');
      setIsSending(false);
      setSelectedIntegrationId('');
      setAvailableIntegrations([]);
      setIsLoadingIntegrations(false);

      // Reset image states
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      setIsUploadingImage(false);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = '';
      }
    } else {
      setBroadcastMessage('');
    }
  }, [isOpen, initialMessage]);

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

  useEffect(() => {
    if (isOpen && step === 'selectTarget' && targetMode === 'segment') {
      const fetchSegments = async () => {
        setIsLoadingSegments(true);
        try {
          const { data, error } = await supabase.functions.invoke('segment-handler/segments', { method: 'GET' });
          if (error) throw error;
          setAvailableSegments((data as Segment[]) || []);
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

  useEffect(() => {
    if (isOpen && step === 'composeMessage' && availableIntegrations.length === 0) {
       const fetchIntegrations = async () => {
        setIsLoadingIntegrations(true);
        try {
          const { data: integrationsData, error: integrationsError } = await supabase
            .from('integrations')
            .select('id, name');
          if (integrationsError) throw integrationsError;
          if (!integrationsData) throw new Error("No integrations found.");

          const { data: configsDataFull, error: configsError } = await supabase
            .from('integrations_config')
            .select('id, integration_id, instance_id, instance_display_name');
          if (configsError) throw configsError;
          if (!configsDataFull) throw new Error("No integration configurations found.");

          const finalDisplayIntegrations: IntegrationInstanceInfo[] = configsDataFull
            .map(config => {
              const baseIntegration = integrationsData.find(integ => integ.id === config.integration_id);

              if (!baseIntegration || !baseIntegration.name || !config.id || !config.instance_id) {
                console.warn(`Skipping config with id ${config.id} (integration_id: ${config.integration_id}) due to missing base integration, name, instance_id, or its own id.`);
                return null;
              }

              return {
                configId: config.id,
                instanceId: config.instance_id,
                name: config.instance_display_name || baseIntegration.name || `Instance ${config.instance_id}`,
              };
            })
            .filter(item => item !== null) as IntegrationInstanceInfo[];

          if (finalDisplayIntegrations.length === 0) {
             console.warn("No integrations_config entries with valid configurations found to display.");
             toast({
                title: "No Integrations Available",
                description: "No integration configurations found for sending broadcasts. Please check your setup.",
                variant: "default",
             });
          }

          setAvailableIntegrations(finalDisplayIntegrations);
          if (finalDisplayIntegrations.length > 0) {
            setSelectedIntegrationId(finalDisplayIntegrations[0].configId);
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

    const selectedIntegrationInfo = availableIntegrations.find(int => int.configId === selectedIntegrationId);
    if (!selectedIntegrationInfo || !selectedIntegrationInfo.instanceId) {
       toast({ title: "Error", description: "Selected integration is missing configuration.", variant: "destructive" });
       return;
    }

    setIsSending(true);
    // Removed imageUrl pre-definition and Supabase storage upload logic.
    // We will now prepare base64 data if an image is selected.

    try {
      let mediaData: string | undefined = undefined;
      let mediaMimeType: string | undefined = undefined;
      let mediaFileName: string | undefined = undefined;
      const dbImageUrl: string | undefined = undefined; // For storing a URL in DB if needed, separate from sending

      if (selectedImageFile) {
        setIsUploadingImage(true); // Still use this to indicate processing
        try {
          // Convert file to base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]); // Get base64 part
              } else {
                reject(new Error("Failed to read file as base64 string."));
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(selectedImageFile);
          });

          mediaData = await base64Promise;
          mediaMimeType = selectedImageFile.type;
          mediaFileName = selectedImageFile.name;
          
          // If you still want to store a public URL for record-keeping or UI display later,
          // you could upload to Supabase storage here and get `dbImageUrl`.
          // For now, focusing on direct send. If `imageUrl` was previously used for display
          // in the broadcast list, this part might need to be re-added or re-thought.
          // For simplicity of this change, I'm omitting the storage upload.
          // If a URL is still needed for the `broadcasts` table's `image_url` column,
          // that upload logic would go here. Let's assume for now it's optional or handled elsewhere.

        } catch (imageProcessingError) {
          console.error("Error processing image for sending:", imageProcessingError);
          toast({ title: "Image Processing Failed", description: (imageProcessingError as Error).message, variant: "destructive" });
          setIsUploadingImage(false);
          setIsSending(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      let paramsToSend: SendBroadcastParams;

      const commonParams = {
        integrationConfigId: selectedIntegrationId,
        instanceId: selectedIntegrationInfo.instanceId,
        messageText: broadcastMessage, // This will be the caption
        media: mediaData,
        mimetype: mediaMimeType,
        fileName: mediaFileName,
        imageUrl: dbImageUrl, // Pass the URL if you uploaded it for DB record
      };

      if (targetMode === 'segment') {
        paramsToSend = {
          targetMode: 'segment',
          segmentId: selectedSegmentId,
          ...commonParams,
        };
      } else if (targetMode === 'customers') {
        paramsToSend = {
          targetMode: 'customers',
          customerIds: selectedCustomers,
          ...commonParams,
        };
      } else { // CSV
        if (csvRecipients.length === 0) {
          toast({ title: "Error", description: "No recipients found from CSV.", variant: "destructive" });
          setIsSending(false);
          return;
        }
        paramsToSend = {
          targetMode: 'csv',
          phoneNumbers: csvRecipients,
          ...commonParams,
        };
      }

      const result = await sendBroadcastService(paramsToSend);
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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Error", description: "Image size should not exceed 5MB.", variant: "destructive" });
        setSelectedImageFile(null);
        setImagePreviewUrl(null);
        if (imageFileInputRef.current) imageFileInputRef.current.value = '';
        return;
      }
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
    }
  };

  const clearImageSelection = () => {
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || targetMode !== 'csv') return;

    let uniquePhoneNumbers: string[] = [];
    let checkError: Error | null = null;

    setCsvFileName(file.name);
    setIsProcessingCsv(true);
    setCsvRecipients([]);

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
        .slice(1)
        .map(line => line.split(',')[phoneIndex]?.trim())
        .filter(Boolean);

      if (phoneNumbers.length === 0) throw new Error("No valid phone numbers found in CSV.");

      uniquePhoneNumbers = [...new Set(phoneNumbers)];
      setCsvRecipients(uniquePhoneNumbers);
      toast({ title: "CSV Parsed", description: `${uniquePhoneNumbers.length} unique phone numbers found in ${file.name}. Checking database...` });

      try {
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
          if (newNumbers && newNumbers.length > 0) {
            setShowAddContactsPrompt(true);
            toast({ title: "Action Required", description: `${newNumbers.length} new phone numbers found in the CSV. Add them?` });
          } else {
            toast({ title: "Check Complete", description: resultMessage });
            setShowAddContactsPrompt(false);
          }
        } else { 
            toast({ title: "Check Complete", description: resultMessage });
            setShowAddContactsPrompt(false);
        }

      } catch (err) { 
         const message = err instanceof Error ? err.message : "Failed to check contacts against database.";
         console.error("Error checking CSV contacts:", err);
         toast({ title: "Database Check Error", description: message, variant: "destructive" });
         setCsvFileName(null);
         setCsvRecipients([]);
         setNewContactsFromCsv([]);
         setExistingContactIdsFromCsv([]);
         setAddedCustomerIdsFromCsv([]);
         setShowAddContactsPrompt(false);
         setShowCreateSegmentPrompt(false);
         checkError = err instanceof Error ? err : new Error(message); 
      }

    } catch (error) {
       if (!checkError && error instanceof Error) {
         checkError = error;
       } else if (!checkError) {
         checkError = new Error("An unknown error occurred during CSV processing.");
       }
      const message = error instanceof Error ? error.message : "Failed to process CSV file.";
      console.error("Error processing CSV:", error);
      toast({ title: "Import Error", description: message, variant: "destructive" });
      setCsvFileName(null);
      setCsvRecipients([]);
    } finally {
      setIsProcessingCsv(false);
      if (uniquePhoneNumbers.length > 0 && checkError === null) {
        setShowCreateSegmentPrompt(true);
      } else {
        setShowCreateSegmentPrompt(false);
      }
    }
  };

  const handleAddNewContacts = async () => {
    if (newContactsFromCsv.length === 0) return;
    setIsAddingContacts(true);
    try {
      const contactsToAdd = newContactsFromCsv.map(phone => ({ phone_number: phone }));
      const { data, error } = await supabase.functions.invoke<{ addedCount: number, newCustomerIds: string[] }>('add-new-customers', {
        body: { newContacts: contactsToAdd },
      });
      if (error) throw error;
      const addedIds = data?.newCustomerIds || [];
      setAddedCustomerIdsFromCsv(addedIds);
      toast({
        title: "Success",
        description: `${data?.addedCount || 0} new customers added successfully.`,
      });
      setShowAddContactsPrompt(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add new customers.";
      console.error("Error adding new contacts:", error);
      toast({ title: "Error Adding Contacts", description: message, variant: "destructive" });
    } finally {
      setIsAddingContacts(false);
      setShowCreateSegmentPrompt(true);
    }
  };

  const handleCreateSegment = async () => {
    if (!newSegmentName.trim()) {
      toast({ title: "Error", description: "Please enter a name for the new segment.", variant: "destructive" });
      return;
    }
    if (!userData?.id) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }

    let customerIdsForSegment: string[] = [];
    const initialMode = targetMode;

    if (initialMode === 'csv') {
      customerIdsForSegment = [...new Set([...existingContactIdsFromCsv, ...addedCustomerIdsFromCsv])];
      if (customerIdsForSegment.length === 0) {
        toast({ title: "Error", description: "No customers identified from the CSV to add to the segment.", variant: "destructive" });
        return;
      }
    } else if (initialMode === 'customers') {
      customerIdsForSegment = selectedCustomers;
       if (customerIdsForSegment.length === 0) {
        toast({ title: "Error", description: "No customers selected to add to the segment.", variant: "destructive" });
        return;
      }
    } else {
       toast({ title: "Error", description: "Invalid mode for segment creation.", variant: "destructive" });
       return;
    }

    setIsCreatingSegment(true);
    try {
      const { data: newSegment, error } = await supabase.functions.invoke<Segment>('segment-handler', {
        body: {
          segmentName: newSegmentName,
          customerIds: customerIdsForSegment,
          userId: userData.id,
        },
      });
      if (error) throw error;
      if (!newSegment) throw new Error("Segment creation did not return segment data.");
      toast({
        title: "Segment Created",
        description: `Segment "${newSegment.name}" created with ${customerIdsForSegment.length} contacts.`,
      });
      setAvailableSegments(prev => [...prev, newSegment]);
      if (initialMode === 'csv') {
        setTargetMode('segment');
        setSelectedSegmentId(newSegment.id);
      }
      setNewSegmentName('');
      setShowCreateSegmentPrompt(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create segment.";
      console.error("Error creating segment:", error);
      toast({ title: "Segment Creation Failed", description: message, variant: "destructive" });
    } finally {
      setIsCreatingSegment(false);
    }
  };

  const isNextDisabled = () => {
    if (targetMode === 'customers') return isLoadingCustomers || selectedCustomers.length === 0 || isCreatingSegment || (showCreateSegmentPrompt && selectedCustomers.length > 0);
    if (targetMode === 'segment') return isLoadingSegments || !selectedSegmentId;
    if (targetMode === 'csv') return isProcessingCsv || csvRecipients.length === 0 || isAddingContacts || isCreatingSegment || showAddContactsPrompt || showCreateSegmentPrompt;
    return true;
  };

  const recipientCount = () => {
     if (targetMode === 'customers') return selectedCustomers.length;
     if (targetMode === 'csv') return csvRecipients.length;
     if (targetMode === 'segment') return 'N/A';
     return 0;
  }

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

        {step === 'selectTarget' && (
          <div className="py-4 space-y-4">
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

            {targetMode === 'customers' && (
              <div className="space-y-2">
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
                          onClick={handleCreateSegment}
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
                          onClick={handleCreateSegment}
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

        {step === 'composeMessage' && (
          <div className="py-4 space-y-4">
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
                      <SelectItem key={integrationInfo.configId} value={integrationInfo.configId}>
                        {integrationInfo.name} 
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Textarea
              placeholder="Type your broadcast message here..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={6}
            />

            <div className="mt-4">
              <Label htmlFor="broadcast-image">Attach Image (Optional, Max 5MB)</Label>
              <Input
                id="broadcast-image"
                type="file"
                accept="image/png, image/jpeg, image/gif"
                onChange={handleImageChange}
                className="mt-1"
                ref={imageFileInputRef}
                disabled={isSending || isUploadingImage}
              />
              {imagePreviewUrl && (
                <div className="mt-2 relative w-fit"> {/* w-fit to contain button correctly */}
                  <img src={imagePreviewUrl} alt="Preview" className="max-h-40 rounded border" />
                  <Button
                    variant="ghost"
                    size="icon" // Made it an icon button for better fit
                    className="absolute top-1 right-1 bg-white/70 hover:bg-white h-6 w-6 p-1" // Adjusted size and padding
                    onClick={clearImageSelection}
                    disabled={isSending || isUploadingImage}
                  >
                    <Cross2Icon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

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
              </Button>
            </>
          )}
          {step === 'composeMessage' && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isSending}>Back</Button>
              <Button
                onClick={handleSend}
                disabled={!broadcastMessage.trim() || !selectedIntegrationId || isLoadingIntegrations || isSending || isUploadingImage}
              >
                {isSending ? 'Sending...' : isUploadingImage ? 'Uploading...' : 'Send'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, ListChecks, Users as UsersIcon, X as Cross2Icon, FileText, ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from '@/hooks/useAuthUser';
import type { Database } from "@/integrations/supabase/types";
import { sendBroadcastService, type SendBroadcastParams } from '@/services/broadcast/sendBroadcastService';
import { useWhatsAppBlastLimit } from '@/hooks/useWhatsAppBlastLimit';

type Customer = Database['public']['Tables']['customers']['Row'];
type Segment = Database['public']['Tables']['segments']['Row'];

interface SegmentWithMemberCount extends Segment {
  member_count?: number;
}

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
  onBroadcastSent?: () => void; // Callback for when a broadcast is successfully sent
}

export function BroadcastModal({
  isOpen,
  onClose,
  initialMessage,
  onBroadcastSent
}: BroadcastModalProps) {
  const { toast } = useToast();
  const { userData } = useAuthUser();
  const [step, setStep] = useState<'selectTarget' | 'composeMessage'>('selectTarget');
  const [targetMode, setTargetMode] = useState<TargetMode>('customers');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  const [availableSegments, setAvailableSegments] = useState<SegmentWithMemberCount[]>([]);
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

  // File handling states - matching MessageInput.tsx exactly
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [includeOptOutText, setIncludeOptOutText] = useState(false);
  
  // Use the WhatsApp blast limit hook
  const { blastLimitInfo, isLoading: isLoadingBlastLimit, refetchBlastLimit } = useWhatsAppBlastLimit();

  const fileInputRef = useRef<HTMLInputElement>(null); // For CSV
  const fileAttachmentInputRef = useRef<HTMLInputElement>(null); // For file attachments

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

      // Reset file states
      setSelectedFile(null);
      setFilePreviewUrl(null);
      if (fileAttachmentInputRef.current) {
        fileAttachmentInputRef.current.value = '';
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
          // Fetch segments with member count calculated from segment_contacts
          const { data, error } = await supabase
            .from('segments')
            .select(`
              *,
              segment_contacts(count)
            `);
          
          if (error) throw error;
          
          // Transform the data to include member_count
          const segmentsWithCount = (data || []).map(segment => ({
            ...segment,
            member_count: segment.segment_contacts?.[0]?.count || 0
          }));
          
          setAvailableSegments(segmentsWithCount);
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
    if (isOpen && step === 'composeMessage') {
      const fetchIntegrations = async () => {
        setIsLoadingIntegrations(true);
        try {
          const { data, error } = await supabase
            .from('integrations_config')
            .select(`
              id, 
              instance_id, 
              instance_display_name,
              integrations!inner(name)
            `)
            .eq('integrations.name', 'WhatsApp Web');

          if (error) throw error;

          const integrationInfos: IntegrationInstanceInfo[] = (data || []).map(item => ({
            configId: item.id,
            instanceId: item.instance_id,
            name: item.instance_display_name || `Instance ${item.instance_id}`
          }));

          setAvailableIntegrations(integrationInfos);
        } catch (error) {
          console.error("Error fetching integrations:", error);
          toast({ title: "Error", description: "Could not load integrations.", variant: "destructive" });
        } finally {
          setIsLoadingIntegrations(false);
        }
      };
      fetchIntegrations();
    }
  }, [isOpen, step, toast]);

  const handleSendBroadcast = async () => {
    if (!selectedIntegrationId) {
      toast({ title: "Error", description: "Please select an integration.", variant: "destructive" });
      return;
    }

    if (!broadcastMessage.trim() && !selectedFile) {
      toast({ title: "Error", description: "Please enter a message or attach a file.", variant: "destructive" });
      return;
    }

    setIsSending(true);

    try {
      let mediaUrl: string | undefined = undefined;

      // 1. Upload file to Supabase Storage if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        // Use the specified path: assets/whatsapp-attachments/<user-id>/<filename>
        const filePath = `whatsapp-attachments/${userData?.id}/${fileName}`;

        toast({ title: "Uploading file...", description: "Please wait." });

        const { error: uploadError } = await supabase.storage
          .from('assets') // Use the 'assets' bucket
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        // 2. Get the public URL of the uploaded file
        const { data: publicUrlData } = supabase.storage
          .from('assets')
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error("Could not get public URL for the uploaded file.");
        }
        
        mediaUrl = publicUrlData.publicUrl;
        toast({ title: "File uploaded successfully." });
      }

      const selectedIntegrationInfo = availableIntegrations.find(
        integration => integration.configId === selectedIntegrationId
      );

      if (!selectedIntegrationInfo) {
        throw new Error("Selected integration not found");
      }

      let paramsToSend: SendBroadcastParams;

      let finalMessageText: string | null = broadcastMessage;
      if (includeOptOutText) {
        finalMessageText = "If you want to opt out of these marketing messages reply with '0'\n" + finalMessageText;
      }

      if (selectedFile && !finalMessageText.trim()) {
        finalMessageText = null;
      }

      if (!finalMessageText && !selectedFile) {
        toast({ title: "Error", description: "Please enter a message or attach a file.", variant: "destructive" });
        setIsSending(false);
        return;
      }

      // 3. Use the public mediaUrl instead of a blob URL
      const commonParams = {
        targetMode,
        messageText: finalMessageText,
        integrationConfigId: selectedIntegrationId,
        instanceId: selectedIntegrationInfo.instanceId,
        media: mediaUrl, // Use the public URL from storage
        mimetype: selectedFile?.type,
        fileName: selectedFile?.name,
        userId: userData?.id || '',
      };

      if (targetMode === 'customers') {
        if (selectedCustomers.length === 0) throw new Error("Please select at least one customer.");
        paramsToSend = { ...commonParams, customerIds: selectedCustomers };
      } else if (targetMode === 'segment') {
        if (!selectedSegmentId) throw new Error("Please select a segment.");
        paramsToSend = { ...commonParams, segmentId: selectedSegmentId };
      } else if (targetMode === 'csv') {
        if (csvRecipients.length === 0) throw new Error("Please import a CSV file with recipients.");
        const allRecipientIds = [...existingContactIdsFromCsv, ...addedCustomerIdsFromCsv];
        if (allRecipientIds.length === 0) throw new Error("No valid recipients found from CSV.");
        paramsToSend = { ...commonParams, phoneNumbers: csvRecipients };
      } else {
        throw new Error("Invalid target mode");
      }

      console.log("Final paramsToSend:", paramsToSend);

      const result = await sendBroadcastService(paramsToSend);

      if (result.broadcastId) {
        toast({ title: "Success", description: `Broadcast sent successfully to ${result.successfulSends} recipients.` });
        onBroadcastSent?.();
        onClose();
        refetchBlastLimit();
      } else {
        throw new Error('Failed to send broadcast');
      }
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to send broadcast.", 
        variant: "destructive" 
      });
    } finally {
      setIsSending(false);
    }
  };

  // File handling functions - matching MessageInput.tsx exactly
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Generate a preview URL for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviewUrl(null);
      }
    } else {
      setSelectedFile(null);
      setFilePreviewUrl(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileAttachmentInputRef.current) {
      fileAttachmentInputRef.current.value = '';
    }
  };

  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      } catch (error) {
        console.error('Error checking CSV contacts:', error);
        toast({ title: "Error", description: `Failed to check contacts: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
        setExistingContactIdsFromCsv([]);
        setNewContactsFromCsv([]);
        setShowAddContactsPrompt(false);
      }
    } catch (error) {
      console.error('Error processing CSV:', error);
      toast({ title: "Error", description: `Failed to process CSV: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
      setCsvRecipients([]);
      setCsvFileName(null);
      setExistingContactIdsFromCsv([]);
      setNewContactsFromCsv([]);
      setShowAddContactsPrompt(false);
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleAddContacts = async () => {
    if (newContactsFromCsv.length === 0) return;

    setIsAddingContacts(true);
    try {
      const { data: addResult, error: addError } = await supabase.functions.invoke('add-csv-contacts', {
        body: { phoneNumbers: newContactsFromCsv },
      });

      if (addError) throw addError;

      const { addedCustomerIds } = addResult as { addedCustomerIds: string[] };
      setAddedCustomerIdsFromCsv(addedCustomerIds || []);
      setShowAddContactsPrompt(false);
      toast({ title: "Success", description: `${addedCustomerIds?.length || 0} new contacts added successfully.` });
    } catch (error) {
      console.error('Error adding contacts:', error);
      toast({ title: "Error", description: `Failed to add contacts: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    } finally {
      setIsAddingContacts(false);
    }
  };

  const handleCreateSegment = async () => {
    if (!newSegmentName.trim()) {
      toast({ title: "Error", description: "Please enter a segment name.", variant: "destructive" });
      return;
    }

    setIsCreatingSegment(true);
    try {
      const allRecipientIds = [...existingContactIdsFromCsv, ...addedCustomerIdsFromCsv];

      const { data: segmentResult, error: segmentError } = await supabase.functions.invoke('create-segment-from-csv', {
        body: { 
          segmentName: newSegmentName.trim(),
          customerIds: allRecipientIds
        },
      });

      if (segmentError) throw segmentError;

      const { segmentId } = segmentResult as { segmentId: string };
      
      // Refresh segments list
      const { data: segmentsData, error: segmentsError } = await supabase.from('segments').select('*, segment_contacts(count)');
      if (!segmentsError) {
        const segmentsWithCount = (segmentsData || []).map(segment => ({
          ...segment,
          member_count: segment.segment_contacts?.[0]?.count || 0
        }));
        setAvailableSegments(segmentsWithCount);
      }

      setShowCreateSegmentPrompt(false);
      setNewSegmentName('');
      toast({ title: "Success", description: `Segment "${newSegmentName}" created successfully with ${allRecipientIds.length} contacts.` });
    } catch (error) {
      console.error('Error creating segment:', error);
      toast({ title: "Error", description: `Failed to create segment: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    } finally {
      setIsCreatingSegment(false);
    }
  };

  const handleNext = () => {
    if (step === 'selectTarget') {
      if (targetMode === 'customers' && selectedCustomers.length === 0) {
        toast({ title: "Error", description: "Please select at least one customer.", variant: "destructive" });
        return;
      }
      if (targetMode === 'segment' && !selectedSegmentId) {
        toast({ title: "Error", description: "Please select a segment.", variant: "destructive" });
        return;
      }
      if (targetMode === 'csv' && csvRecipients.length === 0) {
        toast({ title: "Error", description: "Please import a CSV file with recipients.", variant: "destructive" });
        return;
      }
      setStep('composeMessage');
    }
  };

  const handleBack = () => {
    if (step === 'composeMessage') {
      setStep('selectTarget');
    }
  };

  const getRecipientCount = () => {
    if (targetMode === 'customers') {
      return selectedCustomers.length;
    } else if (targetMode === 'segment') {
      const segment = availableSegments.find(s => s.id === selectedSegmentId);
      return segment?.member_count || 0;
    } else if (targetMode === 'csv') {
      return existingContactIdsFromCsv.length + addedCustomerIdsFromCsv.length;
    }
    return 0;
  };

  const renderFilePreview = () => {
    if (!selectedFile) return null;

    return (
      <div className="mt-2 p-2 border rounded-lg bg-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {filePreviewUrl ? (
            <img src={filePreviewUrl} alt="Preview" className="w-10 h-10 object-cover rounded" />
          ) : (
            <FileText className="w-10 h-10 text-gray-400" />
          )}
          <div>
            <p className="text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearSelectedFile}
        >
          <Cross2Icon className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Broadcast Message</DialogTitle>
          <DialogDescription>
            {step === 'selectTarget' ? 'Select your target audience' : 'Compose your message'}
          </DialogDescription>
        </DialogHeader>

        {step === 'selectTarget' && (
          <div className="space-y-6">
            <Tabs value={targetMode} onValueChange={(value) => setTargetMode(value as TargetMode)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="customers">
                  <UsersIcon className="w-4 h-4 mr-2" />
                  Select Customers
                </TabsTrigger>
                <TabsTrigger value="segment">
                  <ListChecks className="w-4 h-4 mr-2" />
                  Select Segment
                </TabsTrigger>
                <TabsTrigger value="csv">
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </TabsTrigger>
              </TabsList>
              <TabsContent value="customers" className="pt-4">
                <div>
                  <Label className="text-sm font-medium">Select Customers</Label>
                  {isLoadingCustomers ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    <ScrollArea className="h-96 mt-2 border p-4">
                      <div className="space-y-2">
                        {customers.map((customer) => (
                          <div key={customer.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={customer.id}
                              checked={selectedCustomers.includes(customer.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCustomers([...selectedCustomers, customer.id]);
                                } else {
                                  setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                                }
                              }}
                              className="h-5 w-5 rounded border-gray-300"
                            />
                            <Label htmlFor={customer.id} className="text-sm cursor-pointer">
                              {customer.name} ({customer.phone_number})
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {selectedCustomers.length} customer(s) selected
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="segment" className="pt-4">
                <div>
                  <Label className="text-sm font-medium">Select Segment</Label>
                  {isLoadingSegments ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    <Select value={selectedSegmentId} onValueChange={setSelectedSegmentId}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose a segment" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSegments.map((segment) => (
                          <SelectItem key={segment.id} value={segment.id}>
                            {segment.name} ({segment.member_count || 0} customers)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="csv" className="pt-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Import CSV File</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      CSV must contain a 'phone_number' column header
                    </p>
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleImportClick}
                        disabled={isProcessingCsv}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isProcessingCsv ? 'Processing...' : 'Choose CSV File'}
                      </Button>
                      <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvFileChange} className="hidden" />
                    </div>
                  </div>

                  {csvFileName && (
                    <Alert>
                      <AlertDescription>
                        <strong>File:</strong> {csvFileName}<br />
                        <strong>Recipients:</strong> {csvRecipients.length} phone numbers<br />
                        <strong>Existing Customers:</strong> {existingContactIdsFromCsv.length}<br />
                        <strong>New Numbers:</strong> {newContactsFromCsv.length}
                      </AlertDescription>
                    </Alert>
                  )}

                  {showAddContactsPrompt && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-2">
                          <p>{newContactsFromCsv.length} new phone numbers found. Would you like to add them as customers?</p>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={handleAddContacts}
                              disabled={isAddingContacts}
                            >
                              {isAddingContacts ? 'Adding...' : 'Add Contacts'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowAddContactsPrompt(false)}
                            >
                              Skip
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {(existingContactIdsFromCsv.length > 0 || addedCustomerIdsFromCsv.length > 0) && (
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateSegmentPrompt(true)}
                        className="w-full"
                      >
                        Create Segment from CSV
                      </Button>

                      {showCreateSegmentPrompt && (
                        <div className="space-y-2">
                          <Input
                            placeholder="Enter segment name"
                            value={newSegmentName}
                            onChange={(e) => setNewSegmentName(e.target.value)}
                          />
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={handleCreateSegment}
                              disabled={isCreatingSegment || !newSegmentName.trim()}
                            >
                              {isCreatingSegment ? 'Creating...' : 'Create Segment'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowCreateSegmentPrompt(false);
                                setNewSegmentName('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {step === 'composeMessage' && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Recipients:</strong> {getRecipientCount()} contacts will receive this message
              </AlertDescription>
            </Alert>

            <div>
              <Label className="text-sm font-medium">Select WhatsApp Integration</Label>
              {isLoadingIntegrations ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                <Select value={selectedIntegrationId} onValueChange={setSelectedIntegrationId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose an integration" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIntegrations.map((integration) => (
                      <SelectItem key={integration.configId} value={integration.configId}>
                        {integration.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Message</Label>
              <Textarea
                placeholder="Enter your broadcast message..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="mt-2 min-h-[120px]"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Attach File (Optional)</Label>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileAttachmentInputRef.current?.click()}
                  className="w-full"
                >
                  <ImagePlus className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <Input
                  ref={fileAttachmentInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {renderFilePreview()}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeOptOut"
                checked={includeOptOutText}
                onChange={(e) => setIncludeOptOutText(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="includeOptOut" className="text-sm cursor-pointer">
                Include opt-out text at the beginning of the message
              </Label>
            </div>

            {blastLimitInfo && (
              <Alert>
                <AlertDescription>
                  <strong>Daily Limit:</strong> {blastLimitInfo.current_count}/{blastLimitInfo.limit} messages sent today
                  {blastLimitInfo.remaining < getRecipientCount() && (
                    <span className="text-red-600 block mt-1">
                      Warning: This broadcast ({getRecipientCount()} messages) exceeds your remaining limit ({blastLimitInfo.remaining})
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'selectTarget' ? (
            <Button onClick={handleNext} disabled={
              (targetMode === 'customers' && selectedCustomers.length === 0) ||
              (targetMode === 'segment' && !selectedSegmentId) ||
              (targetMode === 'csv' && csvRecipients.length === 0)
            }>
              Next
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={handleSendBroadcast}
                disabled={(!broadcastMessage.trim() && !selectedFile) || !selectedIntegrationId || isLoadingIntegrations || isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  `Send to ${getRecipientCount()} Recipients`
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

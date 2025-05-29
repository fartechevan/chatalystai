import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label'; // Added Label
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Added RadioGroup
import { Trash2, PlusCircle, Users, Upload } from 'lucide-react'; // Added Upload icon
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client'; // Corrected import path
import { Database } from '@/integrations/supabase/types'; // Import generated types
import { useAuthUser } from '@/hooks/useAuthUser'; // Import auth hook
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';

type Segment = Database['public']['Tables']['segments']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
// Type for the contact info returned by the list contacts endpoint
type SegmentContactInfo = Pick<Customer, "id" | "name" | "phone_number" | "email">;

type PopulationMethod = 'empty' | 'existing' | 'csv';

export function SegmentsView() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState<Segment | null>(null);
  const [segmentToImportTo, setSegmentToImportTo] = useState<Segment | null>(null); // State for import target (existing segments)
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // State for selected file (existing segments)
  const [importMode, setImportMode] = useState<'save_new' | 'existing_only'>('save_new'); // State for import mode (existing segments)

  // State for Create Dialog
  const [populationMethod, setPopulationMethod] = useState<PopulationMethod>('empty');
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [selectedCustomerIdsForNewSegment, setSelectedCustomerIdsForNewSegment] = useState<string[]>([]);
  const [selectedCsvFileForNewSegment, setSelectedCsvFileForNewSegment] = useState<File | null>(null);

  // State for viewing contacts
  const [viewingSegment, setViewingSegment] = useState<Segment | null>(null);
  const [segmentContacts, setSegmentContacts] = useState<SegmentContactInfo[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const { toast } = useToast();
  const { userData, isLoading: isAuthLoading } = useAuthUser(); // Get user data and auth loading state

  // Fetch segments only when authenticated user is loaded
  useEffect(() => {
    // Only fetch if auth is not loading and user data exists
    if (!isAuthLoading && userData) {
      fetchSegments();
    } else if (!isAuthLoading && !userData) {
      // Handle case where user is definitely not logged in (optional)
      setIsLoading(false); // Ensure loading state is turned off
      setSegments([]); // Clear any stale data
    }
    // Add userData and isAuthLoading to dependency array
  }, [userData, isAuthLoading]);

  // Fetch all customers when the create dialog opens and 'existing' is selected
  useEffect(() => {
    if (isCreateDialogOpen && populationMethod === 'existing' && allCustomers.length === 0) {
      fetchAllCustomers();
    }
  }, [isCreateDialogOpen, populationMethod, allCustomers.length]);


  const fetchAllCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      // Select all columns to match the Customer type
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      setAllCustomers(data || []);
    } catch (error) {
      console.error("Error fetching all customers:", error);
      toast({ title: "Error", description: "Could not load customer list.", variant: "destructive" });
      setAllCustomers([]); // Reset on error
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const fetchSegments = async () => {
    setIsLoading(true);
    try {
      // Invoke with the expected path for listing segments
      const { data, error } = await supabase.functions.invoke('segment-handler/segments', { method: 'GET' });
      if (error) throw error;
      if (data) {
        setSegments(data as Segment[]); // Cast response data
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not load segments.';
      console.error('Error fetching segments:', error);
      toast({
        title: 'Error fetching segments',
        description: errorMessage, // Keep the derived errorMessage
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSegment = async () => {
    if (!newSegmentName.trim()) {
      toast({ title: 'Segment name cannot be empty', variant: 'destructive' });
      return;
    }
    try {
      // Correct function path and add POST method, destructure data
      const { data: newSegmentData, error } = await supabase.functions.invoke('segment-handler/segments', {
        method: 'POST',
        body: { name: newSegmentName.trim() },
      });
      if (error) throw error;

      const newSegment = newSegmentData as Segment; // Use destructured data
      if (!newSegment || !newSegment.id) {
        throw new Error("Segment creation did not return a valid segment ID.");
      }

      toast({ title: `Segment "${newSegment.name}" created successfully!` });

      // --- Step 2: Add Contacts (Conditional) ---
      let contactAddError: Error | null = null;
      if (populationMethod === 'existing' && selectedCustomerIdsForNewSegment.length > 0) {
        try {
          // Call the new bulk endpoint
          const { error: bulkAddError } = await supabase.functions.invoke(`segment-handler/segments/${newSegment.id}/contacts/bulk`, {
            method: 'POST',
            body: { contactIds: selectedCustomerIdsForNewSegment } // Pass the array
          });
          if (bulkAddError) throw bulkAddError; // Throw to be caught below
          toast({ title: 'Success', description: `Added ${selectedCustomerIdsForNewSegment.length} customers to the new segment.` });
        } catch (err) {
          contactAddError = err instanceof Error ? err : new Error(String(err));
          console.error(`Error bulk adding customers to segment ${newSegment.id}:`, contactAddError);
        }

      } else if (populationMethod === 'csv' && selectedCsvFileForNewSegment) {
        try {
          const fileContent = await selectedCsvFileForNewSegment.text();
          // Use the existing import endpoint, passing the NEW segment ID
          const { error: importError } = await supabase.functions.invoke('segment-handler/segments/import-csv', {
            method: 'POST',
            body: {
              segmentId: newSegment.id, // Use the newly created segment ID
              csvData: fileContent,
              importMode: 'save_new', // Or make this configurable in the dialog? Defaulting for now.
            },
          });
          if (importError) throw importError;
          toast({ title: 'CSV Import Started', description: `Importing contacts from ${selectedCsvFileForNewSegment.name} to the new segment.` });
        } catch (err) {
           contactAddError = err instanceof Error ? err : new Error(String(err));
           console.error(`Error importing CSV to new segment ${newSegment.id}:`, contactAddError);
        }
      }

      // --- Step 3: Reset State & Refresh ---
      setNewSegmentName('');
      setPopulationMethod('empty');
      setSelectedCustomerIdsForNewSegment([]);
      setSelectedCsvFileForNewSegment(null);
      setIsCreateDialogOpen(false);
      fetchSegments(); // Refresh the list

      // Show secondary error toast if adding contacts failed
      if (contactAddError) {
         toast({
            title: 'Warning: Segment Created, But Adding Contacts Failed',
            description: contactAddError.message,
            variant: 'destructive',
         });
      }

    } catch (error) {
      // Error during segment creation itself or re-thrown from contact adding
      const errorMessage = error instanceof Error ? error.message : 'Could not complete segment creation.';
      console.error('Error creating segment:', error);
      toast({
        title: 'Error creating segment',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
    try {
      // Correct function path for delete
      const { error } = await supabase.functions.invoke(`segment-handler/segments/${segmentId}`, {
        method: 'DELETE',
      });
      if (error) throw error;
      toast({ title: 'Segment deleted successfully!' });
      setSegmentToDelete(null); // Close confirmation dialog
      fetchSegments(); // Refresh the list
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not delete the segment.';
      console.error('Error deleting segment:', error);
      toast({
        title: 'Error deleting segment',
        description: errorMessage,
        variant: 'destructive',
      });
       setSegmentToDelete(null);
    }
  };

  // Fetch and display contacts for a segment
  const handleViewContacts = async (segment: Segment) => {
    setViewingSegment(segment);
    setIsLoadingContacts(true);
    setSegmentContacts([]); // Clear previous contacts
    try {
      // Call the endpoint to list contacts for the specific segment
      const { data, error } = await supabase.functions.invoke(`segment-handler/segments/${segment.id}/contacts`, {
        method: 'GET',
      });

      if (error) throw error;

      // The backend returns an array of CustomerInfo objects
      setSegmentContacts((data as SegmentContactInfo[]) || []);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not load contacts for this segment.';
      console.error(`Error fetching contacts for segment ${segment.id}:`, error);
      toast({
        title: 'Error Fetching Contacts',
        description: errorMessage,
        variant: 'destructive',
      });
      setSegmentContacts([]); // Ensure contacts are cleared on error
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !segmentToImportTo) {
      toast({ title: 'Please select a segment and a CSV file.', variant: 'destructive' });
      return;
    }

    // Basic validation for CSV type (can be improved)
    if (selectedFile.type !== 'text/csv') {
       toast({ title: 'Invalid file type. Please upload a CSV file.', variant: 'destructive' });
       return;
    }

    try {
      // Read file content as text
      const fileContent = await selectedFile.text();

      // Correct function path and add POST method for import
      const { error } = await supabase.functions.invoke('segment-handler/segments/import-csv', {
        method: 'POST',
        body: {
          segmentId: segmentToImportTo.id,
          csvData: fileContent,
          importMode: importMode, // Pass the selected mode
        },
      });

      if (error) throw error;

      toast({ title: 'Import started successfully!', description: 'Contacts are being added to the segment.' });
      setSegmentToImportTo(null); // Close the dialog
      setSelectedFile(null); // Reset file input
      // Optionally refresh segment data or contact list if needed
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not start the import process.';
      console.error('Error importing CSV:', error);
      toast({
        title: 'Error starting import',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <React.Fragment> { /* Explicit Fragment */ }
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Customer Segments</CardTitle>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Segment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Segment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Segment Name Input */}
              <div className="grid gap-2">
                <Label htmlFor="segment-name">Segment Name</Label>
                <Input
                  id="segment-name"
                  placeholder="E.g., Leads Q1, Newsletter Subscribers"
                value={newSegmentName}
                  onChange={(e) => setNewSegmentName(e.target.value)}
                />
              </div>

              {/* Population Method Selection */}
              <div className="grid gap-2">
                 <Label>Initial Population (Optional)</Label>
                 <RadioGroup value={populationMethod} onValueChange={(value: string) => setPopulationMethod(value as PopulationMethod)} className="flex space-x-4 pt-1">
                    <div className="flex items-center space-x-2">
                       <RadioGroupItem value="empty" id="pop-empty" />
                       <Label htmlFor="pop-empty">Create Empty</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                       <RadioGroupItem value="existing" id="pop-existing" />
                       <Label htmlFor="pop-existing">Add Existing Customers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                       <RadioGroupItem value="csv" id="pop-csv" />
                       <Label htmlFor="pop-csv">Upload CSV</Label>
                    </div>
                 </RadioGroup>
              </div>

              {/* Conditional UI for Existing Customers */}
              {populationMethod === 'existing' && (
                <div className="grid gap-2 border p-3 rounded-md">
                  <Label>Select Customers ({selectedCustomerIdsForNewSegment.length} selected)</Label>
                  {isLoadingCustomers ? (
                     <p className="text-sm text-muted-foreground">Loading customers...</p>
                  ) : allCustomers.length === 0 ? (
                     <p className="text-sm text-muted-foreground">No customers found.</p>
                  ) : (
                    <ScrollArea className="h-[150px] border rounded p-2">
                      {allCustomers.map((customer) => (
                        <div key={customer.id} className="flex items-center space-x-2 py-1">
                          <input
                            type="checkbox"
                            id={`cust-${customer.id}`}
                            checked={selectedCustomerIdsForNewSegment.includes(customer.id)}
                            onChange={(e) => {
                              const customerId = customer.id;
                              setSelectedCustomerIdsForNewSegment((prev) =>
                                e.target.checked
                                  ? [...prev, customerId]
                                  : prev.filter((id) => id !== customerId)
                              );
                            }}
                            className="h-4 w-4"
                          />
                          <Label htmlFor={`cust-${customer.id}`} className="text-sm font-normal cursor-pointer">
                            {customer.name} ({customer.phone_number || customer.email || 'No contact info'})
                          </Label>
                        </div>
                      ))}
                    </ScrollArea>
                  )}
                  {/* Removed the placeholder button */}
                </div>
              )}

              {/* Conditional UI for CSV Upload */}
              {populationMethod === 'csv' && (
                 <div className="grid gap-2 border p-3 rounded-md">
                   <Label htmlFor="csv-file-new">Select CSV File</Label>
                   <Input
                     id="csv-file-new"
                     type="file"
                     accept=".csv"
                     onChange={(e) => setSelectedCsvFileForNewSegment(e.target.files ? e.target.files[0] : null)}
                   />
                   {selectedCsvFileForNewSegment && (
                     <p className="text-sm text-muted-foreground truncate">File: {selectedCsvFileForNewSegment.name}</p>
                   )}
                   <p className="text-xs text-muted-foreground">
                     CSV must contain a 'phone_number' column header. New contacts will be created.
                   </p>
                 </div>
              )}

            </div>
            <DialogFooter>
               {/* Move DialogClose inside the Button */}
               <DialogClose asChild>
                 <Button variant="outline">Cancel</Button>
               </DialogClose>
              {/* Disable button based on validation */}
              <Button
                onClick={handleCreateSegment}
                disabled={
                  !newSegmentName.trim() ||
                  (populationMethod === 'existing' && selectedCustomerIdsForNewSegment.length === 0 && !isLoadingCustomers) || // Disable if 'existing' chosen but none selected (and not loading)
                  (populationMethod === 'csv' && !selectedCsvFileForNewSegment) // Disable if 'csv' chosen but no file selected
                }
              >
                Create Segment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading segments...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No segments created yet.
                  </TableCell>
                </TableRow>
              ) : (
                segments.map((segment) => (
                  <TableRow key={segment.id}>
                    <TableCell className="font-medium">{segment.name}</TableCell>
                    <TableCell>{new Date(segment.created_at).toLocaleDateString()}</TableCell>
                     <TableCell className="text-right space-x-2">
                        {/* View Contacts Button - Pass the whole segment object */}
                        <Button variant="outline" size="icon" onClick={() => handleViewContacts(segment)} title="View Contacts">
                          <Users className="h-4 w-4" />
                        </Button>

                        {/* Import CSV Dialog Trigger */}
                        <Dialog open={segmentToImportTo?.id === segment.id} onOpenChange={(isOpen) => !isOpen && setSegmentToImportTo(null)}>
                           <DialogTrigger asChild>
                             <Button variant="outline" size="icon" onClick={() => setSegmentToImportTo(segment)} title="Import CSV to Segment">
                               <Upload className="h-4 w-4" />
                             </Button>
                           </DialogTrigger>
                           <DialogContent>
                             <DialogHeader>
                               <DialogTitle>Import CSV to "{segmentToImportTo?.name}"</DialogTitle>
                             </DialogHeader>
                             <div className="grid gap-4 py-4">
                               <div className="grid gap-2">
                                 <Label htmlFor="csv-file">Select CSV File</Label>
                                 <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                               </div>
                               <RadioGroup value={importMode} onValueChange={(value: 'save_new' | 'existing_only') => setImportMode(value)}>
                                 <Label>Import Options</Label>
                                 <div className="flex items-center space-x-2 mt-2">
                                   <RadioGroupItem value="save_new" id="r1" />
                                   <Label htmlFor="r1">Save new customers and add to segment</Label>
                                 </div>
                                 <div className="flex items-center space-x-2 mt-2">
                                   <RadioGroupItem value="existing_only" id="r2" />
                                   <Label htmlFor="r2">Only add existing customers to segment</Label>
                                 </div>
                               </RadioGroup>
                             </div>
                             <DialogFooter>
                               <Button variant="outline" onClick={() => setSegmentToImportTo(null)}>Cancel</Button>
                               <Button onClick={handleImport} disabled={!selectedFile}>Start Import</Button>
                             </DialogFooter>
                           </DialogContent>
                         </Dialog>

                        {/* Delete Confirmation Dialog Trigger */}
                        <Dialog open={segmentToDelete?.id === segment.id} onOpenChange={(isOpen) => !isOpen && setSegmentToDelete(null)}>
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="icon" onClick={() => setSegmentToDelete(segment)} title="Delete Segment">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                         <DialogContent>
                           <DialogHeader>
                             <DialogTitle>Delete Segment</DialogTitle>
                           </DialogHeader>
                           <p>Are you sure you want to delete the segment "{segmentToDelete?.name}"? This action cannot be undone.</p>
                           <DialogFooter>
                             <Button variant="outline" onClick={() => setSegmentToDelete(null)}>Cancel</Button>
                             <Button variant="destructive" onClick={() => handleDeleteSegment(segmentToDelete!.id)}>Delete</Button>
                           </DialogFooter>
                         </DialogContent>
                       </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

    {/* Dialog to display segment contacts */}
    <Dialog open={!!viewingSegment} onOpenChange={(isOpen) => !isOpen && setViewingSegment(null)}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Contacts in "{viewingSegment?.name}"</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {isLoadingContacts ? (
            <p>Loading contacts...</p>
          ) : segmentContacts.length === 0 ? (
            <p>No contacts found in this segment.</p>
          ) : (
            <ScrollArea className="h-[400px] border rounded p-2">
              <ul className="space-y-1">
                {segmentContacts.map((contact) => (
                  <li key={contact.id} className="text-sm p-1 border-b">
                    {contact.name || 'No Name'} ({contact.phone_number || contact.email || 'No contact info'})
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setViewingSegment(null)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </React.Fragment>
  );
}

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Trash2, PlusCircle, Users, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useAuthUser } from '@/hooks/useAuthUser';
import { ScrollArea } from '@/components/ui/scroll-area';

type Segment = Database['public']['Tables']['segments']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];
type SegmentContactInfo = Pick<Customer, "id" | "name" | "phone_number" | "email">;

type PopulationMethod = 'empty' | 'existing' | 'csv';

export function SegmentsView() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState<Segment | null>(null);
  const [segmentToImportTo, setSegmentToImportTo] = useState<Segment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'save_new' | 'existing_only'>('save_new');

  const [populationMethod, setPopulationMethod] = useState<PopulationMethod>('empty');
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [selectedCustomerIdsForNewSegment, setSelectedCustomerIdsForNewSegment] = useState<string[]>([]);
  const [selectedCsvFileForNewSegment, setSelectedCsvFileForNewSegment] = useState<File | null>(null);

  const [viewingSegment, setViewingSegment] = useState<Segment | null>(null);
  const [segmentContacts, setSegmentContacts] = useState<SegmentContactInfo[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const { toast } = useToast();
  const { userData, isLoading: isAuthLoading } = useAuthUser();

  useEffect(() => {
    if (!isAuthLoading && userData) {
      fetchSegments();
    } else if (!isAuthLoading && !userData) {
      setIsLoading(false);
      setSegments([]);
    }
  }, [userData, isAuthLoading]);

  useEffect(() => {
    if (isCreateDialogOpen && populationMethod === 'existing' && allCustomers.length === 0) {
      fetchAllCustomers();
    }
  }, [isCreateDialogOpen, populationMethod, allCustomers.length]);


  const fetchAllCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      setAllCustomers(data || []);
    } catch (error) {
      console.error("Error fetching all customers:", error);
      toast({ title: "Error", description: "Could not load customer list.", variant: "destructive" });
      setAllCustomers([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const fetchSegments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('segment-handler/segments', { method: 'GET' });
      if (error) throw error;
      if (data) {
        setSegments(data as Segment[]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not load segments.';
      console.error('Error fetching segments:', error);
      toast({
        title: 'Error fetching segments',
        description: errorMessage,
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
      const { data: newSegmentData, error } = await supabase.functions.invoke('segment-handler/segments', {
        method: 'POST',
        body: { name: newSegmentName.trim() },
      });
      if (error) throw error;

      const newSegment = newSegmentData as Segment;
      if (!newSegment || !newSegment.id) {
        throw new Error("Segment creation did not return a valid segment ID.");
      }
      toast({ title: `Segment "${newSegment.name}" created successfully!` });

      let contactAddError: Error | null = null;
      if (populationMethod === 'existing' && selectedCustomerIdsForNewSegment.length > 0) {
        try {
          const { error: bulkAddError } = await supabase.functions.invoke(`segment-handler/segments/${newSegment.id}/contacts/bulk`, {
            method: 'POST',
            body: { contactIds: selectedCustomerIdsForNewSegment }
          });
          if (bulkAddError) throw bulkAddError;
          toast({ title: 'Success', description: `Added ${selectedCustomerIdsForNewSegment.length} customers to the new segment.` });
        } catch (err) {
          contactAddError = err instanceof Error ? err : new Error(String(err));
        }
      } else if (populationMethod === 'csv' && selectedCsvFileForNewSegment) {
        try {
          const fileContent = await selectedCsvFileForNewSegment.text();
          const { error: importError } = await supabase.functions.invoke('segment-handler/segments/import-csv', {
            method: 'POST',
            body: {
              segmentId: newSegment.id,
              csvData: fileContent,
              importMode: 'save_new',
            },
          });
          if (importError) throw importError;
          toast({ title: 'CSV Import Started', description: `Importing contacts from ${selectedCsvFileForNewSegment.name} to the new segment.` });
        } catch (err) {
           contactAddError = err instanceof Error ? err : new Error(String(err));
        }
      }

      setNewSegmentName('');
      setPopulationMethod('empty');
      setSelectedCustomerIdsForNewSegment([]);
      setSelectedCsvFileForNewSegment(null);
      setIsCreateDialogOpen(false);
      fetchSegments();

      if (contactAddError) {
         toast({
            title: 'Warning: Segment Created, But Adding Contacts Failed',
            description: contactAddError.message,
            variant: 'destructive',
         });
      }
    } catch (error) {
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
      const { error } = await supabase.functions.invoke(`segment-handler/segments/${segmentId}`, {
        method: 'DELETE',
      });
      if (error) throw error;
      toast({ title: 'Segment deleted successfully!' });
      setSegmentToDelete(null);
      fetchSegments();
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

  const handleViewContacts = async (segment: Segment) => {
    setViewingSegment(segment);
    setIsLoadingContacts(true);
    setSegmentContacts([]);
    try {
      const { data, error } = await supabase.functions.invoke(`segment-handler/segments/${segment.id}/contacts`, {
        method: 'GET',
      });
      if (error) throw error;
      setSegmentContacts((data as SegmentContactInfo[]) || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not load contacts for this segment.';
      console.error(`Error fetching contacts for segment ${segment.id}:`, error);
      toast({
        title: 'Error Fetching Contacts',
        description: errorMessage,
        variant: 'destructive',
      });
      setSegmentContacts([]);
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
    if (selectedFile.type !== 'text/csv') {
       toast({ title: 'Invalid file type. Please upload a CSV file.', variant: 'destructive' });
       return;
    }
    try {
      const fileContent = await selectedFile.text();
      const { error } = await supabase.functions.invoke('segment-handler/segments/import-csv', {
        method: 'POST',
        body: {
          segmentId: segmentToImportTo.id,
          csvData: fileContent,
          importMode: importMode,
        },
      });
      if (error) throw error;
      toast({ title: 'Import started successfully!', description: 'Contacts are being added to the segment.' });
      setSegmentToImportTo(null);
      setSelectedFile(null);
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
    <React.Fragment>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
          <CardTitle className="text-xl">Customer Segments</CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Segment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Segment</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="segment-name">Segment Name</Label>
                  <Input
                    id="segment-name"
                    placeholder="E.g., Leads Q1, Newsletter Subscribers"
                    value={newSegmentName}
                    onChange={(e) => setNewSegmentName(e.target.value)}
                  />
                </div>
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
                  </div>
                )}
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
                 <DialogClose asChild>
                   <Button variant="outline">Cancel</Button>
                 </DialogClose>
                <Button
                  onClick={handleCreateSegment}
                  disabled={
                    !newSegmentName.trim() ||
                    (populationMethod === 'existing' && selectedCustomerIdsForNewSegment.length === 0 && !isLoadingCustomers) ||
                    (populationMethod === 'csv' && !selectedCsvFileForNewSegment)
                  }
                >
                  Create Segment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading segments...</div>
          ) : (
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/50">
                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</TableHead>
                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Created At</TableHead>
                    <TableHead className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center p-4 align-middle text-muted-foreground">
                        No segments created yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    segments.map((segment) => (
                      <TableRow key={segment.id} className="hover:bg-muted/50">
                        <TableCell className="p-4 align-middle font-medium">{segment.name}</TableCell>
                        <TableCell className="p-4 align-middle text-muted-foreground">{new Date(segment.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="p-4 align-middle text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleViewContacts(segment)} title="View Contacts">
                              <Users className="h-4 w-4" />
                            </Button>
                            <Dialog open={segmentToImportTo?.id === segment.id} onOpenChange={(isOpen) => !isOpen && setSegmentToImportTo(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setSegmentToImportTo(segment)} title="Import CSV to Segment">
                                  <Upload className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
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
                          <Dialog open={segmentToDelete?.id === segment.id} onOpenChange={(isOpen) => !isOpen && setSegmentToDelete(null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setSegmentToDelete(segment)} title="Delete Segment" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                           <DialogContent className="sm:max-w-md">
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
          </ScrollArea>
        )}
      </CardContent>
    </Card>

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

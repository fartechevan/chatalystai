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

type Segment = Database['public']['Tables']['segments']['Row'];

export function SegmentsView() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState<Segment | null>(null);
  const [segmentToImportTo, setSegmentToImportTo] = useState<Segment | null>(null); // State for import target
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // State for selected file
  const [importMode, setImportMode] = useState<'save_new' | 'existing_only'>('save_new'); // State for import mode
  const { toast } = useToast();

  // Fetch segments on component mount
  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    setIsLoading(true);
    try {
      // Explicitly use GET method for list-segments
      const { data, error } = await supabase.functions.invoke('list-segments', { method: 'GET' });
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
      const { error } = await supabase.functions.invoke('create-segment', {
        body: { name: newSegmentName.trim() },
      });
      if (error) throw error;
      toast({ title: 'Segment created successfully!' });
      setNewSegmentName('');
      setIsCreateDialogOpen(false);
      fetchSegments(); // Refresh the list
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not create the segment.';
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
      const { error } = await supabase.functions.invoke(`delete-segment/${segmentId}`, { // Pass ID in path
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

  // TODO: Implement view contacts functionality
  const handleViewContacts = (segmentId: string) => {
    console.log("View contacts for segment:", segmentId);
    // Navigate to a detailed view or open a modal showing contacts
     toast({ title: 'View Contacts (Not Implemented)', description: `Would show contacts for segment ${segmentId}`});
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

    console.log(`Importing ${selectedFile.name} to segment ${segmentToImportTo.name} (ID: ${segmentToImportTo.id}) with mode: ${importMode}`);

    try {
      // Read file content as text
      const fileContent = await selectedFile.text();

      // Invoke the Supabase function
      const { error } = await supabase.functions.invoke('import-csv-to-segment', {
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
              <Input
                placeholder="Segment Name"
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                 <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreateSegment}>Create</Button>
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
                        {/* View Contacts Button */}
                        <Button variant="outline" size="icon" onClick={() => handleViewContacts(segment.id)} title="View Contacts">
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
  );
}
